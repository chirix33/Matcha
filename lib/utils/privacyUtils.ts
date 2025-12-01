/**
 * Privacy Utility Functions
 * 
 * Helper functions for privacy-related operations including sanitization
 * and validation of data before sending to external services.
 */

import type { AnonymizedProfile } from "@/types/profile";
import { containsPIIPatterns, validateAnonymizedProfile, validateTranscriptForOpenAI } from "./privacyValidator";

/**
 * Sanitize transcript text by removing potential PII patterns
 * Returns sanitized text and list of redactions made
 */
export function sanitizeTranscript(transcript: string): {
  sanitized: string;
  redactions: string[];
} {
  const redactions: string[] = [];
  let sanitized = transcript;

  // Check and remove email patterns
  const emailMatches = transcript.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
  if (emailMatches) {
    redactions.push(`Removed ${emailMatches.length} email address(es)`);
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_REDACTED]");
  }

  // Check and remove phone patterns
  const phoneMatches = transcript.match(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g);
  if (phoneMatches) {
    redactions.push(`Removed ${phoneMatches.length} phone number(s)`);
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\(\d{3}\)\s?\d{3}[-.]?\d{4}\b/g, "[PHONE_REDACTED]");
  }

  // Check and remove SSN patterns
  const ssnMatches = transcript.match(/\b\d{3}-\d{2}-\d{4}\b/g);
  if (ssnMatches) {
    redactions.push(`Removed ${ssnMatches.length} SSN(s)`);
    sanitized = sanitized.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN_REDACTED]");
  }

  return { sanitized, redactions };
}

/**
 * Validate AnonymizedProfile structure and content
 * Returns validation result with detailed errors if invalid
 */
export function validateAnonymizedProfileStructure(profile: unknown): {
  isValid: boolean;
  errors: string[];
  profile?: AnonymizedProfile;
} {
  const validation = validateAnonymizedProfile(profile);
  
  if (validation.valid) {
    return {
      isValid: true,
      errors: [],
      profile: profile as AnonymizedProfile,
    };
  }

  return {
    isValid: false,
    errors: validation.errors,
  };
}

/**
 * Prepare transcript for OpenAI API
 * Validates and sanitizes transcript before sending
 */
export function prepareTranscriptForOpenAI(transcript: string): {
  transcript: string;
  wasSanitized: boolean;
  warnings: string[];
} {
  const validation = validateTranscriptForOpenAI(transcript);
  
  return {
    transcript: validation.sanitized,
    wasSanitized: validation.sanitized !== transcript,
    warnings: validation.warnings,
  };
}

/**
 * Get size estimate of anonymized profile (for logging)
 */
export function estimateAnonymizedProfileSize(profile: AnonymizedProfile): number {
  // Estimate size in bytes (rough approximation)
  const skillsSize = JSON.stringify(profile.skills).length;
  const rolesSize = JSON.stringify(profile.desiredRoles).length;
  const industriesSize = JSON.stringify(profile.industries).length;
  const otherFieldsSize = JSON.stringify({
    yearsExperience: profile.yearsExperience,
    seniority: profile.seniority,
    preferredCompanySize: profile.preferredCompanySize,
    remotePreference: profile.remotePreference,
  }).length;

  return skillsSize + rolesSize + industriesSize + otherFieldsSize;
}

/**
 * Check if data contains any PII indicators
 */
export function hasPIIIndicators(data: unknown): boolean {
  if (typeof data === "string") {
    return containsPIIPatterns(data);
  }

  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    const piiFields = ["name", "email", "phone", "address", "ssn", "userId"];
    
    return piiFields.some((field) => field in obj && obj[field] !== undefined && obj[field] !== null);
  }

  return false;
}

