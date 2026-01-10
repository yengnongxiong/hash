"use server";

import { createClient } from "@/lib/supabase/server";
import { generateEmbedding, cosineSimilarity, EMBEDDING_MODEL } from "./openai";

/**
 * Entity Service
 * Manages known entities (vendors, customers, banks, employers)
 * and provides matching/validation capabilities
 */

export type EntityType = "vendor" | "customer" | "bank" | "employer" | "other";

export interface KnownEntityInput {
  canonicalName: string;
  entityType: EntityType;
  aliases?: string[];
  metadata?: Record<string, unknown>;
}

export interface EntityMatchResult {
  entityId: string;
  canonicalName: string;
  entityType: string;
  similarity: number;
  matchType: "exact" | "alias" | "fuzzy" | "semantic";
  aliases: string[];
}

/**
 * Create or update a known entity with embedding
 */
export async function upsertKnownEntity(
  input: KnownEntityInput
): Promise<{ success: boolean; entityId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: userData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user?.id || "")
    .single();

  if (!userData?.organization_id) {
    return { success: false, error: "User organization not found" };
  }

  // Generate embedding for the entity name
  const embeddingResult = await generateEmbedding(input.canonicalName);
  const embeddingString = embeddingResult.success && embeddingResult.embedding
    ? `[${embeddingResult.embedding.join(",")}]`
    : null;

  // Check if entity already exists
  const { data: existing } = await supabase
    .from("known_entities")
    .select("id")
    .eq("organization_id", userData.organization_id)
    .eq("entity_type", input.entityType)
    .eq("canonical_name", input.canonicalName)
    .single();

  if (existing) {
    // Update existing entity
    const { error } = await supabase
      .from("known_entities")
      .update({
        aliases: input.aliases || [],
        metadata: (input.metadata || {}) as Record<string, never>,
        embedding: embeddingString,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, entityId: existing.id };
  } else {
    // Create new entity
    const { data, error } = await supabase
      .from("known_entities")
      .insert({
        organization_id: userData.organization_id,
        entity_type: input.entityType,
        canonical_name: input.canonicalName,
        aliases: input.aliases || [],
        metadata: (input.metadata || {}) as Record<string, never>,
        embedding: embeddingString,
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, entityId: data.id };
  }
}

/**
 * Find matching entities for a given name
 */
export async function findMatchingEntities(
  name: string,
  entityType?: EntityType,
  limit: number = 5
): Promise<{ success: boolean; matches?: EntityMatchResult[]; error?: string }> {
  const supabase = await createClient();
  const matches: EntityMatchResult[] = [];

  // Normalize the input name
  const normalizedName = name.trim().toLowerCase();

  // 1. Check for exact match
  let query = supabase
    .from("known_entities")
    .select("id, canonical_name, entity_type, aliases")
    .ilike("canonical_name", normalizedName);

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data: exactMatches } = await query.limit(1);

  if (exactMatches && exactMatches.length > 0) {
    matches.push({
      entityId: exactMatches[0].id,
      canonicalName: exactMatches[0].canonical_name,
      entityType: exactMatches[0].entity_type,
      similarity: 1.0,
      matchType: "exact",
      aliases: exactMatches[0].aliases || [],
    });
  }

  // 2. Check for alias match
  let aliasQuery = supabase
    .from("known_entities")
    .select("id, canonical_name, entity_type, aliases")
    .contains("aliases", [normalizedName]);

  if (entityType) {
    aliasQuery = aliasQuery.eq("entity_type", entityType);
  }

  const { data: aliasMatches } = await aliasQuery.limit(3);

  if (aliasMatches) {
    for (const match of aliasMatches) {
      if (!matches.some(m => m.entityId === match.id)) {
        matches.push({
          entityId: match.id,
          canonicalName: match.canonical_name,
          entityType: match.entity_type,
          similarity: 0.95,
          matchType: "alias",
          aliases: match.aliases || [],
        });
      }
    }
  }

  // 3. Semantic search if we don't have enough matches
  if (matches.length < limit) {
    const embeddingResult = await generateEmbedding(name);

    if (embeddingResult.success && embeddingResult.embedding) {
      const embeddingString = `[${embeddingResult.embedding.join(",")}]`;

      const { data: semanticMatches } = await supabase.rpc("match_entities", {
        query_embedding: embeddingString,
        entity_type_filter: entityType,
        match_threshold: 0.7,
        match_count: limit,
      });

      if (semanticMatches) {
        for (const match of semanticMatches) {
          if (!matches.some(m => m.entityId === match.entity_id)) {
            matches.push({
              entityId: match.entity_id,
              canonicalName: match.canonical_name,
              entityType: match.entity_type,
              similarity: match.similarity,
              matchType: "semantic",
              aliases: match.aliases || [],
            });
          }
        }
      }
    }
  }

  // Sort by similarity and limit
  matches.sort((a, b) => b.similarity - a.similarity);

  return {
    success: true,
    matches: matches.slice(0, limit),
  };
}

/**
 * Validate and match entities from extracted document data
 */
export async function validateDocumentEntities(
  documentId: string,
  extractedData: Record<string, unknown>
): Promise<{
  success: boolean;
  matches?: Array<{
    fieldName: string;
    extractedValue: string;
    matchedEntity?: EntityMatchResult;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  // Define which fields map to which entity types
  const fieldEntityMap: Record<string, EntityType> = {
    vendorName: "vendor",
    merchantName: "vendor",
    bankName: "bank",
    employerName: "employer",
    payerName: "vendor",
    payee: "customer",
    partyA: "customer",
    partyB: "customer",
  };

  const results: Array<{
    fieldName: string;
    extractedValue: string;
    matchedEntity?: EntityMatchResult;
  }> = [];

  for (const [fieldName, entityType] of Object.entries(fieldEntityMap)) {
    const value = extractedData[fieldName];
    if (typeof value === "string" && value.trim()) {
      const matchResult = await findMatchingEntities(value, entityType, 1);

      const result = {
        fieldName,
        extractedValue: value,
        matchedEntity: matchResult.matches?.[0],
      };

      results.push(result);

      // Save the match if found
      if (result.matchedEntity && result.matchedEntity.similarity >= 0.8) {
        await supabase.from("entity_matches").upsert({
          document_id: documentId,
          entity_id: result.matchedEntity.entityId,
          field_name: fieldName,
          extracted_value: value,
          similarity_score: result.matchedEntity.similarity,
          match_type: result.matchedEntity.matchType,
        }, {
          onConflict: "document_id,entity_id,field_name",
        });
      }
    }
  }

  return { success: true, matches: results };
}

/**
 * Auto-learn entities from approved documents
 * Creates new known entities from high-confidence extractions
 */
export async function learnEntitiesFromDocument(
  documentId: string,
  extractedData: Record<string, unknown>
): Promise<{ success: boolean; learnedCount: number; error?: string }> {
  const fieldEntityMap: Record<string, EntityType> = {
    vendorName: "vendor",
    merchantName: "vendor",
    bankName: "bank",
    employerName: "employer",
  };

  let learnedCount = 0;

  for (const [fieldName, entityType] of Object.entries(fieldEntityMap)) {
    const value = extractedData[fieldName];
    if (typeof value === "string" && value.trim()) {
      // Check if entity already exists
      const matchResult = await findMatchingEntities(value, entityType, 1);

      // If no good match found, create a new entity
      if (!matchResult.matches || matchResult.matches.length === 0 || matchResult.matches[0].similarity < 0.9) {
        const result = await upsertKnownEntity({
          canonicalName: value.trim(),
          entityType,
          metadata: {
            learnedFrom: documentId,
            field: fieldName,
          },
        });

        if (result.success) {
          learnedCount++;
        }
      }
    }
  }

  return { success: true, learnedCount };
}

/**
 * Get all known entities for the current organization
 */
export async function getKnownEntities(
  entityType?: EntityType
): Promise<{
  success: boolean;
  entities?: Array<{
    id: string;
    canonicalName: string;
    entityType: string;
    aliases: string[];
    verified: boolean;
  }>;
  error?: string;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("known_entities")
    .select("id, canonical_name, entity_type, aliases, verified")
    .order("canonical_name");

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    entities: data?.map(e => ({
      id: e.id,
      canonicalName: e.canonical_name,
      entityType: e.entity_type,
      aliases: e.aliases || [],
      verified: e.verified || false,
    })),
  };
}

/**
 * Verify an entity (mark as confirmed correct)
 */
export async function verifyEntity(
  entityId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("known_entities")
    .update({ verified: true, updated_at: new Date().toISOString() })
    .eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Add an alias to an entity
 */
export async function addEntityAlias(
  entityId: string,
  alias: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current aliases
  const { data: entity, error: fetchError } = await supabase
    .from("known_entities")
    .select("aliases")
    .eq("id", entityId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const currentAliases = entity?.aliases || [];
  const normalizedAlias = alias.trim().toLowerCase();

  if (currentAliases.includes(normalizedAlias)) {
    return { success: true }; // Already exists
  }

  const { error } = await supabase
    .from("known_entities")
    .update({
      aliases: [...currentAliases, normalizedAlias],
      updated_at: new Date().toISOString(),
    })
    .eq("id", entityId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
