/**
 * Privacy Validator
 * 
 * Validates that data structures don't contain PII before sending to AI services.
 * Provides runtime checks to ensure privacy boundaries are maintained.
 */

import type { AnonymizedProfile } from "@/types/profile";

// PII patterns to detect
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const PHONE_PATTERN = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;

/**
 * Check if text contains potential PII patterns
 */
export function containsPIIPatterns(text: string): boolean {
  if (!text || typeof text !== "string") {
    return false;
  }

  const hasEmail = EMAIL_PATTERN.test(text);
  const hasPhone = PHONE_PATTERN.test(text);
  const hasSSN = SSN_PATTERN.test(text);

  return hasEmail || hasPhone || hasSSN;
}

/**
 * Validate that an AnonymizedProfile doesn't contain PII fields
 */
export function validateAnonymizedProfile(profile: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile || typeof profile !== "object") {
    return { valid: false, errors: ["Profile is not an object"] };
  }

  const p = profile as Record<string, unknown>;

  // Check for PII fields that should NOT be present
  const piiFields = ["name", "email", "phone", "address", "ssn", "userId"];
  for (const field of piiFields) {
    if (field in p && p[field] !== undefined && p[field] !== null) {
      errors.push(`PII field '${field}' found in anonymized profile`);
    }
  }

  // Validate required anonymized fields
  const requiredFields: (keyof AnonymizedProfile)[] = [
    "skills",
    "yearsExperience",
    "seniority",
    "desiredRoles",
    "preferredCompanySize",
    "industries",
    "remotePreference",
  ];

  for (const field of requiredFields) {
    if (!(field in p)) {
      errors.push(`Required field '${field}' missing from anonymized profile`);
    }
  }

  // Validate field types
  if (p.skills && !Array.isArray(p.skills)) {
    errors.push("Field 'skills' must be an array");
  }
  if (p.desiredRoles && !Array.isArray(p.desiredRoles)) {
    errors.push("Field 'desiredRoles' must be an array");
  }
  if (p.industries && !Array.isArray(p.industries)) {
    errors.push("Field 'industries' must be an array");
  }
  if (p.yearsExperience !== undefined && typeof p.yearsExperience !== "number") {
    errors.push("Field 'yearsExperience' must be a number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Type guard to check if object is a valid AnonymizedProfile
 */
export function isAnonymizedProfile(obj: unknown): obj is AnonymizedProfile {
  const validation = validateAnonymizedProfile(obj);
  return validation.valid;
}

/**
 * Validate transcript text doesn't contain PII before sending to OpenAI
 */
export function validateTranscriptForOpenAI(transcript: string): {
  valid: boolean;
  sanitized: string;
  warnings: string[];
} {
  const warnings: string[] = [];
  let sanitized = transcript;

  // Check for PII patterns
  if (containsPIIPatterns(transcript)) {
    warnings.push("Transcript contains potential PII patterns (email, phone, SSN)");
    
    // Remove email patterns
    sanitized = sanitized.replace(EMAIL_PATTERN, "[EMAIL_REDACTED]");
    
    // Remove phone patterns
    sanitized = sanitized.replace(PHONE_PATTERN, "[PHONE_REDACTED]");
    
    // Remove SSN patterns
    sanitized = sanitized.replace(SSN_PATTERN, "[SSN_REDACTED]");
  }

  return {
    valid: true, // Always valid, but may have warnings
    sanitized,
    warnings,
  };
}

/**
 * Assert that data doesn't contain PII (throws if it does)
 */
export function assertNoPII(data: unknown, context: string): void {
  if (typeof data === "string" && containsPIIPatterns(data)) {
    throw new Error(`PII detected in ${context}: data contains email, phone, or SSN patterns`);
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const piiFields = ["name", "email", "phone", "address", "ssn"];
    
    for (const field of piiFields) {
      if (field in obj) {
        throw new Error(`PII field '${field}' detected in ${context}`);
      }
    }
  }
}

