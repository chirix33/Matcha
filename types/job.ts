import type { CompanySize, RemotePreference, SeniorityLevel } from "./profile";

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  role: string;
  companySize: CompanySize;
  industry: string;
  remotePreference: RemotePreference;
  location?: string;
  salaryRange?: string;
  postedDate?: Date;
}

export interface CompanyInsight {
  companySize: CompanySize;
  industries: string[];
  description: string;
  keyResponsibilities: string[];
}

export interface SkillMatch {
  matched: string[];
  score: number;
  totalPossible: number;
}

export interface ExperienceMatch {
  profileYears: number;
  profileLevel: SeniorityLevel;
  jobLevel: SeniorityLevel | "unknown";
  alignment: "entry" | "junior" | "mid" | "senior" | "lead" | "mismatch";
}

export interface PreferenceMatch {
  role: boolean;
  industry: boolean[];
  companySize: boolean;
  remote: boolean | "partial";
}

export interface ScoreBreakdown {
  skills: number;
  role: number;
  industry: number;
  companySize: number;
  remote: number;
  experience: number;
}

export interface MatchFeatures {
  skillMatch: SkillMatch;
  experienceMatch: ExperienceMatch;
  preferenceMatch: PreferenceMatch;
  scoreBreakdown: ScoreBreakdown;
}

export interface MatchResult {
  job: Job;
  score: number;
  explanation: string;
  matchedSkills: string[];
  isApproximate: boolean;
  insightCard?: CompanyInsight;
  features: MatchFeatures;
}

export interface MatchingStrategy {
  findMatches(profile: import("./profile").AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]>;
  getStrategyName(): string;
}

