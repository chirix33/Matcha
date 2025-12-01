/**
 * Audit Logger Service
 * 
 * Logs all data flows that cross privacy boundaries, particularly when
 * data is sent to external AI services. This helps track and audit
 * privacy compliance.
 */

export type AuditEventType =
  | "ANONYMIZED_PROFILE_RETRIEVED"
  | "OPENAI_API_CALL"
  | "HUGGINGFACE_API_CALL"
  | "MATCHING_SERVICE_CALL"
  | "PII_STRIPPED"
  | "DATA_VALIDATION_PASSED"
  | "DATA_VALIDATION_FAILED";

export interface AuditLogEntry {
  timestamp: string;
  eventType: AuditEventType;
  serviceName: string;
  operation: string;
  dataType: string;
  dataSize?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private static instance: AuditLogger;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditLogEntry, "timestamp">): void {
    const logEntry: AuditLogEntry = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Log to console (can be extended to database/file later)
    const logLevel = event.success ? "INFO" : "ERROR";
    const prefix = `[AUDIT:${logLevel}]`;
    
    console.log(`${prefix} [${logEntry.timestamp}] ${logEntry.eventType}`, {
      service: logEntry.serviceName,
      operation: logEntry.operation,
      dataType: logEntry.dataType,
      dataSize: logEntry.dataSize,
      success: logEntry.success,
      error: logEntry.error,
      metadata: logEntry.metadata,
    });

    // In production, this could also write to:
    // - Database audit table
    // - File-based audit log
    // - External logging service (e.g., CloudWatch, Datadog)
  }

  /**
   * Log when anonymized profile is retrieved
   */
  logAnonymizedProfileRetrieved(email: string, profileSize: number): void {
    this.log({
      eventType: "ANONYMIZED_PROFILE_RETRIEVED",
      serviceName: "ProfileService",
      operation: "getAnonymizedProfileByEmail",
      dataType: "AnonymizedProfile",
      dataSize: profileSize,
      success: true,
      metadata: {
        // Log email hash for traceability without exposing PII
        emailHash: this.hashEmail(email),
      },
    });
  }

  /**
   * Log OpenAI API call
   */
  logOpenAICall(operation: string, transcriptLength: number, success: boolean, error?: string): void {
    this.log({
      eventType: "OPENAI_API_CALL",
      serviceName: "OpenAI",
      operation,
      dataType: "transcript_text",
      dataSize: transcriptLength,
      success,
      error,
      metadata: {
        // Only log length, never content
        transcriptLength,
        note: "Only transcript text sent, no PII",
      },
    });
  }

  /**
   * Log Hugging Face API call
   */
  logHuggingFaceCall(operation: string, dataType: string, dataSize: number, success: boolean, error?: string): void {
    this.log({
      eventType: "HUGGINGFACE_API_CALL",
      serviceName: "HuggingFace",
      operation,
      dataType,
      dataSize,
      success,
      error,
    });
  }

  /**
   * Log matching service call
   */
  logMatchingServiceCall(operation: string, profileSize: number, success: boolean, error?: string): void {
    this.log({
      eventType: "MATCHING_SERVICE_CALL",
      serviceName: "MatchingOrchestrator",
      operation,
      dataType: "AnonymizedProfile",
      dataSize: profileSize,
      success,
      error,
      metadata: {
        note: "Only anonymized profile features used, no PII",
      },
    });
  }

  /**
   * Log when PII is stripped
   */
  logPIIStripped(operation: string, originalSize: number, anonymizedSize: number): void {
    this.log({
      eventType: "PII_STRIPPED",
      serviceName: "ProfileService",
      operation,
      dataType: "ProfileData -> AnonymizedProfile",
      dataSize: anonymizedSize,
      success: true,
      metadata: {
        originalSize,
        anonymizedSize,
        reduction: originalSize - anonymizedSize,
      },
    });
  }

  /**
   * Log data validation result
   */
  logDataValidation(operation: string, passed: boolean, details?: string): void {
    this.log({
      eventType: passed ? "DATA_VALIDATION_PASSED" : "DATA_VALIDATION_FAILED",
      serviceName: "PrivacyValidator",
      operation,
      dataType: "validation_check",
      success: passed,
      error: passed ? undefined : details,
    });
  }

  /**
   * Hash email for logging (one-way hash, not reversible)
   * Simple hash for audit trail - in production, use proper crypto hash
   */
  private hashEmail(email: string): string {
    // Simple hash for demonstration - in production use crypto.createHash('sha256')
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `hash_${Math.abs(hash).toString(16)}`;
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

