export type FormStep = 1 | 2 | 3 | 4 | 5;

export interface ProfileData {
  // Step 1: Basic Info
  name: string;
  email: string;
  phone: string;

  // Step 2: Skills
  skills: string[];

  // Step 3: Experience Summary
  yearsExperience: number;
  seniority: SeniorityLevel;
  keyAchievements: string;

  // Step 4: Job Preferences
  desiredRoles: string[];
  preferredCompanySize: CompanySize;
  industries: string[];
  remotePreference: RemotePreference;

  // Step 5: Review & Consent
  privacyConsent: boolean;
}

export type SeniorityLevel = "entry" | "junior" | "mid" | "senior" | "lead";

export type CompanySize = "small" | "medium" | "large";

export type RemotePreference = "remote" | "hybrid" | "onsite" | "flexible";

export interface AnonymizedProfile {
  skills: string[];
  yearsExperience: number;
  seniority: SeniorityLevel;
  desiredRoles: string[];
  preferredCompanySize: CompanySize;
  industries: string[];
  remotePreference: RemotePreference;
  // NO name, email, phone, or other PII
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export interface TranscriptResponse {
  transcript: string;
  confidence?: number;
  error?: string;
}

