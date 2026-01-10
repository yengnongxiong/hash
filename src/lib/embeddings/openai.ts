/**
 * OpenAI Embedding Service
 * Generates text embeddings using OpenAI's text-embedding-3-small model
 */

const OPENAI_API_URL = "https://api.openai.com/v1/embeddings";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
}

export interface BatchEmbeddingResult {
  success: boolean;
  embeddings?: number[][];
  error?: string;
}

/**
 * Generate an embedding for a single text input
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  if (!text || text.trim().length === 0) {
    return { success: false, error: "Empty text provided" };
  }

  // Truncate text if too long (max ~8000 tokens for text-embedding-3-small)
  const truncatedText = text.slice(0, 30000);

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedText,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorData?.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.data?.[0]?.embedding) {
      return { success: false, error: "No embedding returned from API" };
    }

    return {
      success: true,
      embedding: data.data[0].embedding,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error generating embedding",
    };
  }
}

/**
 * Generate embeddings for multiple text inputs (batch)
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return { success: false, error: "OPENAI_API_KEY not configured" };
  }

  if (!texts || texts.length === 0) {
    return { success: false, error: "No texts provided" };
  }

  // Truncate each text if too long
  const truncatedTexts = texts.map(t => (t || "").slice(0, 30000));

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncatedTexts,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorData?.error?.message || response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
      return { success: false, error: "No embeddings returned from API" };
    }

    // Sort by index to maintain order
    const sortedData = data.data.sort((a: { index: number }, b: { index: number }) => a.index - b.index);
    const embeddings = sortedData.map((item: { embedding: number[] }) => item.embedding);

    return {
      success: true,
      embeddings,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error generating embeddings",
    };
  }
}

/**
 * Calculate cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same dimensions");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Create a hash of content for change detection
 */
export function createContentHash(content: string): string {
  // Simple hash function for content change detection
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(16);
}

export { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS };
