import { AIService, AIError } from "./AIService";
import type { CompanyInsight } from "@/types/job";

const HUGGING_FACE_API_URL = "https://qhcp162snl1rmh0q.us-east-1.aws.endpoints.huggingface.cloud";
const TRANSCRIPTION_TIMEOUT_MS = 60000; // 60 seconds for audio
const EMBEDDING_TIMEOUT_MS = 5000; // 5 seconds for embeddings
const SUMMARIZATION_TIMEOUT_MS = 5000; // 5 seconds for summarization

// Embedding model for semantic matching
const EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2";

export class HuggingFaceService extends AIService {
  private apiKey: string;

  constructor() {
    super({
      timeoutMs: EMBEDDING_TIMEOUT_MS,
      maxRetries: 2,
      retryDelayMs: 1000,
    });

    const apiKey = process.env.HUGGING_FACE_API_KEY;
    if (!apiKey) {
      throw new Error("HUGGING_FACE_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
  }

  protected getProviderName(): string {
    return "HuggingFace";
  }

  /**
   * Transcribe audio to text using Whisper model
   */
  async transcribeAudio(audio: string): Promise<string> {
    return this.withRetry(async () => {
      return this.withTimeout(
        this.performTranscription(audio),
        TRANSCRIPTION_TIMEOUT_MS
      );
    });
  }

  private async performTranscription(audio: string): Promise<string> {
    console.log(`[HuggingFace] Transcribing audio (length: ${audio.length} chars)`);

    const response = await fetch(HUGGING_FACE_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: audio, // base64 encoded audio string
        parameters: {},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HuggingFace] API error: ${response.status} - ${errorText}`);

      if (response.status === 503) {
        throw new AIError("Model is loading. Please try again in a few seconds.", this.getProviderName(), "SERVICE_UNAVAILABLE", true);
      }

      if (response.status === 504 || response.status === 408) {
        throw new AIError("Request timed out. The audio might be too long.", this.getProviderName(), "TIMEOUT", true);
      }

      throw new AIError(`API error: ${response.status}`, this.getProviderName(), String(response.status), false);
    }

    const result = await response.json();
    const transcript = result.text || "";

    console.log(`[HuggingFace] Transcription success (length: ${transcript.length})`);
    return transcript;
  }

  /**
   * Generate embedding vector for text using sentence transformers
   * Uses the new HF Inference API router format
   */
  async generateEmbedding(text: string): Promise<number[]> {
    return this.withRetry(async () => {
      return this.withTimeout(
        this.performEmbedding(text),
        EMBEDDING_TIMEOUT_MS
      );
    });
  }

  private async performEmbedding(text: string): Promise<number[]> {
    console.log(`[HuggingFace] Generating embedding for text (length: ${text.length})`);

    // Use new HF Inference API router for feature extraction
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/feature-extraction`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: text,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HuggingFace] Embedding API error: ${response.status} - ${errorText}`);

      if (response.status === 503) {
        throw new AIError("Model is loading. Please try again.", this.getProviderName(), "SERVICE_UNAVAILABLE", true);
      }

      throw new AIError(`Embedding API error: ${response.status}`, this.getProviderName(), String(response.status), false);
    }

    const result = await response.json();
    
    // Hugging Face returns embedding as array of numbers
    if (!Array.isArray(result)) {
      // Sometimes it returns nested array
      const embedding = Array.isArray(result[0]) ? result[0] : result;
      if (Array.isArray(embedding) && embedding.every((x) => typeof x === "number")) {
        return embedding;
      }
    } else if (result.every((x: unknown) => typeof x === "number")) {
      return result;
    }

    throw new AIError("Invalid embedding response format", this.getProviderName(), "INVALID_RESPONSE", false);
  }

  /**
   * Calculate sentence similarity scores using the new HF Inference API router
   * More efficient for batch comparisons - compares one source sentence to multiple sentences
   */
  async calculateSimilarities(sourceSentence: string, sentences: string[]): Promise<number[]> {
    return this.withRetry(async () => {
      return this.withTimeout(
        this.performSimilarityCalculation(sourceSentence, sentences),
        EMBEDDING_TIMEOUT_MS
      );
    });
  }

  private async performSimilarityCalculation(sourceSentence: string, sentences: string[]): Promise<number[]> {
    console.log(`[HuggingFace] Calculating similarities (source length: ${sourceSentence.length}, comparing to ${sentences.length} sentences)`);

    // Use new HF Inference API router for sentence similarity
    const response = await fetch(
      `https://router.huggingface.co/hf-inference/models/${EMBEDDING_MODEL}/pipeline/sentence-similarity`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: sourceSentence,
            sentences: sentences,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[HuggingFace] Similarity API error: ${response.status} - ${errorText}`);

      if (response.status === 503) {
        throw new AIError("Model is loading. Please try again.", this.getProviderName(), "SERVICE_UNAVAILABLE", true);
      }

      throw new AIError(`Similarity API error: ${response.status}`, this.getProviderName(), String(response.status), false);
    }

    const result = await response.json();
    
    // HF sentence-similarity returns array of similarity scores (0-1 range)
    if (Array.isArray(result) && result.every((x: unknown) => typeof x === "number")) {
      return result;
    }

    throw new AIError("Invalid similarity response format", this.getProviderName(), "INVALID_RESPONSE", false);
  }

  /**
   * Summarize company information from job description
   */
  async summarizeCompany(
    jobDescription: string,
    companyInfo?: string
  ): Promise<CompanyInsight> {
    // Use request deduplication to avoid redundant AI calls
    const { requestDeduplicationCache } = await import("@/lib/services/cache/RequestDeduplicationCache");
    
    return requestDeduplicationCache.getOrExecute(
      {
        type: "summarizeCompany",
        jobDescription,
        companyInfo,
      },
      () => this.withRetry(async () => {
        return this.withTimeout(
          this.performSummarization(jobDescription, companyInfo),
          SUMMARIZATION_TIMEOUT_MS
        );
      }),
      7 * 24 * 60 * 60 * 1000 // 7 days TTL (same as company insights cache)
    );
  }

  private async performSummarization(
    jobDescription: string,
    companyInfo?: string
  ): Promise<CompanyInsight> {
    console.log(`[HuggingFace] Summarizing company info (description length: ${jobDescription.length})`);

    // Use a text generation model for summarization
    // For now, we'll use a simple extraction approach since HF summarization models
    // may require more setup. This can be enhanced later.
    
    // Fallback: Extract key information from text
    // In a production system, you'd use a proper summarization model
    const combinedText = companyInfo ? `${companyInfo}\n\n${jobDescription}` : jobDescription;
    
    // Simple extraction - in production, use a proper LLM or summarization model
    // For now, return structured data extracted from text
    // This is a placeholder that will be enhanced with actual AI summarization
    
    // Extract first few sentences as description
    const sentences = combinedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const description = sentences.slice(0, 2).join(". ").trim() + ".";
    
    // Extract responsibilities (look for bullet points or numbered lists)
    const responsibilityPatterns = [
      /[-•]\s*(.+?)(?:\n|$)/g,
      /\d+\.\s*(.+?)(?:\n|$)/g,
    ];
    
    const responsibilities: string[] = [];
    for (const pattern of responsibilityPatterns) {
      const matches = combinedText.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && responsibilities.length < 3) {
          responsibilities.push(match[1].trim());
        }
      }
    }
    
    // If no responsibilities found, extract key phrases
    if (responsibilities.length === 0) {
      const keyPhrases = combinedText
        .split(/[.!?,\n]+/)
        .filter(s => s.trim().length > 20 && s.trim().length < 100)
        .slice(0, 3)
        .map(s => s.trim());
      responsibilities.push(...keyPhrases);
    }

    return {
      companySize: "medium", // Would be extracted from text
      industries: [], // Would be extracted from text
      description: description || combinedText.substring(0, 200),
      keyResponsibilities: responsibilities.length > 0 ? responsibilities : ["See job description for details"],
    };
  }
}

