import { OCRProvider } from "./types";
import { MistralOCRProvider } from "./mistral";

export type OCRProviderType = "mistral" | "google" | "openai";

/**
 * Get an OCR provider instance
 * Easy to swap providers by changing OCR_PROVIDER env var
 */
export function getOCRProvider(providerType?: OCRProviderType): OCRProvider {
  const provider = providerType || (process.env.OCR_PROVIDER as OCRProviderType) || "mistral";

  switch (provider) {
    case "mistral":
      return new MistralOCRProvider();
    case "google":
      // Placeholder for Google Document AI
      throw new Error("Google Document AI provider not implemented yet");
    case "openai":
      // Placeholder for OpenAI Vision
      throw new Error("OpenAI Vision provider not implemented yet");
    default:
      return new MistralOCRProvider();
  }
}

// Re-export types for convenience
export * from "./types";
