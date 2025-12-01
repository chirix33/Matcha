import type { CompanySize, RemotePreference } from "./profile";

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

export interface MatchResult {
  job: Job;
  score: number;
  explanation: string;
  matchedSkills: string[];
  isApproximate: boolean;
  insightCard?: CompanyInsight;
}

export interface MatchingStrategy {
  findMatches(profile: import("./profile").AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]>;
  getStrategyName(): string;
}

