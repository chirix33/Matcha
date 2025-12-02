/**
 * ASR Failure Tracker Service
 * 
 * Tracks transcription failures, calculates failure rates, and determines
 * when speech-to-text should be disabled based on failure thresholds.
 * Implements Task 9 requirements for monitoring ASR failure rates and misrecognitions.
 */

export enum ASRErrorType {
  TIMEOUT = "TIMEOUT",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  MICROPHONE_DENIED = "MICROPHONE_DENIED",
  NETWORK_ERROR = "NETWORK_ERROR",
  EMPTY_RESULT = "EMPTY_RESULT",
  POOR_QUALITY = "POOR_QUALITY",
  UNKNOWN = "UNKNOWN",
}

interface ErrorEntry {
  timestamp: number;
  success: boolean;
  errorType?: ASRErrorType;
  transcriptLength?: number;
}

interface FailureTrackerConfig {
  failureRateThreshold: number; // Percentage (0-100)
  failureRateWindowMinutes: number; // Time window for failure rate calculation
  consecutiveFailureThreshold: number; // Number of consecutive failures before disable
  minTranscriptLength: number; // Minimum transcript length for quality check
  maxEntries: number; // Maximum entries to keep in memory
  minAttemptsForRateCheck: number; // Minimum attempts before applying failure rate threshold
}

export class ASRFailureTracker {
  private attempts: ErrorEntry[] = [];
  private consecutiveFailures: number = 0;
  private readonly config: FailureTrackerConfig;

  constructor(config: Partial<FailureTrackerConfig> = {}) {
    this.config = {
      failureRateThreshold: config.failureRateThreshold ?? 50, // 50% failure rate
      failureRateWindowMinutes: config.failureRateWindowMinutes ?? 5, // Last 5 minutes
      consecutiveFailureThreshold: config.consecutiveFailureThreshold ?? 3, // 3 consecutive failures
      minTranscriptLength: config.minTranscriptLength ?? 10, // 10 characters minimum
      maxEntries: config.maxEntries ?? 1000, // Keep last 1000 attempts
      minAttemptsForRateCheck: config.minAttemptsForRateCheck ?? 5, // Require at least 5 attempts before applying rate threshold
    };
  }

  /**
   * Track a transcription attempt
   */
  trackAttempt(
    success: boolean,
    errorType?: ASRErrorType,
    transcriptLength?: number
  ): void {
    const entry: ErrorEntry = {
      timestamp: Date.now(),
      success,
      errorType,
      transcriptLength,
    };

    this.attempts.push(entry);

    // Update consecutive failures counter
    if (success) {
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
    }

    // Prune old entries to limit memory usage
    this.pruneOldEntries();

    // Log for debugging
    if (!success) {
      console.log(
        `[ASRFailureTracker] Failure tracked: ${errorType || "UNKNOWN"} (consecutive: ${this.consecutiveFailures})`
      );
    }
  }

  /**
   * Get failure rate over a time window
   */
  getFailureRate(windowMinutes: number = this.config.failureRateWindowMinutes): number {
    const now = Date.now();
    const windowStart = now - windowMinutes * 60 * 1000;

    const recentAttempts = this.attempts.filter(
      (entry) => entry.timestamp >= windowStart
    );

    if (recentAttempts.length === 0) {
      return 0; // No attempts in window, consider as 0% failure rate
    }

    const failures = recentAttempts.filter((entry) => !entry.success).length;
    return (failures / recentAttempts.length) * 100;
  }

  /**
   * Get number of consecutive failures
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Determine if speech-to-text should be disabled
   */
  shouldDisableSpeechToText(): boolean {
    // Check consecutive failures threshold (always applies, even for first attempts)
    if (this.consecutiveFailures >= this.config.consecutiveFailureThreshold) {
      return true;
    }

    // Check failure rate threshold (only applies if we have enough attempts for statistical significance)
    const now = Date.now();
    const windowStart = now - this.config.failureRateWindowMinutes * 60 * 1000;
    const recentAttempts = this.attempts.filter(
      (entry) => entry.timestamp >= windowStart
    );

    // Only apply failure rate threshold if we have minimum attempts
    if (recentAttempts.length >= this.config.minAttemptsForRateCheck) {
      const failureRate = this.getFailureRate();
      if (failureRate >= this.config.failureRateThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get failure rate warning threshold (30% for warning, 50% for disable)
   * Only shows warning if we have enough attempts for statistical significance
   */
  getFailureRateWarning(): boolean {
    const now = Date.now();
    const windowStart = now - this.config.failureRateWindowMinutes * 60 * 1000;
    const recentAttempts = this.attempts.filter(
      (entry) => entry.timestamp >= windowStart
    );

    // Only show warning if we have minimum attempts
    if (recentAttempts.length >= this.config.minAttemptsForRateCheck) {
      const failureRate = this.getFailureRate();
      return failureRate >= 30 && failureRate < this.config.failureRateThreshold;
    }

    return false;
  }

  /**
   * Reset failure tracking (useful for manual re-enable)
   */
  resetFailureTracking(): void {
    this.consecutiveFailures = 0;
    // Optionally clear recent failures, but keep success entries for rate calculation
    // For now, we'll keep all entries but reset consecutive counter
    console.log("[ASRFailureTracker] Failure tracking reset");
  }

  /**
   * Get recent error entries
   */
  getRecentErrors(count: number = 10): ErrorEntry[] {
    return this.attempts
      .filter((entry) => !entry.success)
      .slice(-count)
      .reverse(); // Most recent first
  }

  /**
   * Get statistics about recent attempts
   */
  getStats(windowMinutes: number = this.config.failureRateWindowMinutes): {
    totalAttempts: number;
    failures: number;
    successes: number;
    failureRate: number;
    consecutiveFailures: number;
    shouldDisable: boolean;
    hasWarning: boolean;
  } {
    const now = Date.now();
    const windowStart = now - windowMinutes * 60 * 1000;

    const recentAttempts = this.attempts.filter(
      (entry) => entry.timestamp >= windowStart
    );

    const failures = recentAttempts.filter((entry) => !entry.success).length;
    const successes = recentAttempts.filter((entry) => entry.success).length;
    const failureRate = recentAttempts.length > 0 
      ? (failures / recentAttempts.length) * 100 
      : 0;

    return {
      totalAttempts: recentAttempts.length,
      failures,
      successes,
      failureRate,
      consecutiveFailures: this.consecutiveFailures,
      shouldDisable: this.shouldDisableSpeechToText(),
      hasWarning: this.getFailureRateWarning(),
    };
  }

  /**
   * Prune old entries to limit memory usage
   */
  private pruneOldEntries(): void {
    if (this.attempts.length > this.config.maxEntries) {
      // Keep only the most recent entries
      const toRemove = this.attempts.length - this.config.maxEntries;
      this.attempts = this.attempts.slice(toRemove);
    }
  }

  /**
   * Categorize an error message into ASRErrorType
   */
  static categorizeError(error: string | Error | undefined): ASRErrorType {
    if (!error) {
      return ASRErrorType.UNKNOWN;
    }

    const errorMessage = error instanceof Error ? error.message : String(error).toLowerCase();

    if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
      return ASRErrorType.TIMEOUT;
    }

    if (
      errorMessage.includes("503") ||
      errorMessage.includes("service unavailable") ||
      errorMessage.includes("loading") ||
      errorMessage.includes("unavailable")
    ) {
      return ASRErrorType.SERVICE_UNAVAILABLE;
    }

    if (
      errorMessage.includes("microphone") ||
      errorMessage.includes("permission denied") ||
      errorMessage.includes("access denied") ||
      errorMessage.includes("getusermedia")
    ) {
      return ASRErrorType.MICROPHONE_DENIED;
    }

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("connection") ||
      errorMessage.includes("failed to fetch")
    ) {
      return ASRErrorType.NETWORK_ERROR;
    }

    if (errorMessage.includes("empty") || errorMessage.includes("no transcript")) {
      return ASRErrorType.EMPTY_RESULT;
    }

    return ASRErrorType.UNKNOWN;
  }
}

// Singleton instance for client-side usage
export const asrFailureTracker = new ASRFailureTracker();

