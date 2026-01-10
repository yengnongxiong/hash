/**
 * Embeddings Module
 * Provides vector search and entity matching capabilities
 */

// OpenAI embedding generation
export {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  createContentHash,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from "./openai";

// Document embeddings and semantic search
export {
  generateDocumentEmbedding,
  searchDocumentsByContent,
  findSimilarDocuments,
} from "./document-embeddings";

// Entity registry and matching
export {
  upsertKnownEntity,
  findMatchingEntities,
  validateDocumentEntities,
  learnEntitiesFromDocument,
  getKnownEntities,
  verifyEntity,
  addEntityAlias,
  type EntityType,
  type KnownEntityInput,
  type EntityMatchResult,
} from "./entity-service";

// Duplicate detection
export {
  checkForDuplicates,
  getDuplicateWarning,
  type DuplicateCandidate,
  type DuplicateCheckResult,
} from "./duplicate-detection";
