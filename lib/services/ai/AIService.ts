/**
 * Base AI Service with common utilities for timeout, retry, and error handling
 */

export class AIError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = "AIError";
  }
}

export interface AIServiceConfig {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export abstract class AIService {
  protected config: AIServiceConfig;

  constructor(config: Partial<AIServiceConfig> = {}) {
    this.config = {
      timeoutMs: config.timeoutMs || 5000,
      maxRetries: config.maxRetries || 2,
      retryDelayMs: config.retryDelayMs || 1000,
    };
  }

  /**
   * Wrap a promise with a timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = this.config.timeoutMs
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener("abort", () => {
            reject(new AIError(`Request timed out after ${timeoutMs}ms`, this.getProviderName(), "TIMEOUT", true));
          });
        }),
      ]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof AIError && error.code === "TIMEOUT") {
        throw error;
      }
      throw this.handleAIError(error);
    }
  }

  /**
   * Retry a function with exponential backoff
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-retryable errors
        if (error instanceof AIError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff: delay = baseDelay * 2^attempt
        const delay = this.config.retryDelayMs * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error("Retry failed");
  }

  /**
   * Handle AI errors and convert to AIError
   */
  protected handleAIError(error: unknown): AIError {
    if (error instanceof AIError) {
      return error;
    }

    if (error instanceof Error) {
      // Check for common error patterns
      if (error.name === "AbortError") {
        return new AIError("Request was aborted", this.getProviderName(), "ABORTED", true);
      }

      if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
        return new AIError(error.message, this.getProviderName(), "TIMEOUT", true);
      }

      if (error.message.includes("503") || error.message.includes("loading")) {
        return new AIError("Service temporarily unavailable", this.getProviderName(), "SERVICE_UNAVAILABLE", true);
      }

      return new AIError(error.message, this.getProviderName(), "UNKNOWN", false);
    }

    return new AIError("Unknown error occurred", this.getProviderName(), "UNKNOWN", false);
  }

  /**
   * Sleep utility for retry delays
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get provider name for error messages
   */
  protected abstract getProviderName(): string;
}

