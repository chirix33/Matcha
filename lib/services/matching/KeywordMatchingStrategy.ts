import type { MatchingStrategy, Job, MatchResult } from "@/types/job";
import type { AnonymizedProfile } from "@/types/profile";
import { MatchFeatureExtractor } from "./MatchFeatureExtractor";

export class KeywordMatchingStrategy implements MatchingStrategy {
  private featureExtractor: MatchFeatureExtractor;

  constructor() {
    this.featureExtractor = new MatchFeatureExtractor();
  }

  getStrategyName(): string {
    return "keyword";
  }

  /**
   * Find matches using keyword-based scoring
   */
  async findMatches(profile: AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]> {
    const matches: MatchResult[] = jobs
      .map((job) => {
        const features = this.featureExtractor.buildMatchFeatures(profile, job);
        const score = this.calculateScoreFromBreakdown(features.scoreBreakdown);
        
        if (score > 0) {
          return {
            job,
            score,
            explanation: this.generateExplanation(profile, job, features),
            matchedSkills: features.skillMatch.matched,
            isApproximate: true, // Always approximate for keyword matching
            features,
          };
        }
        return null;
      })
      .filter((match): match is MatchResult => match !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10 matches

    return matches;
  }

  /**
   * Calculate total score from breakdown
   */
  private calculateScoreFromBreakdown(breakdown: import("@/types/job").ScoreBreakdown): number {
    return (
      breakdown.skills +
      breakdown.role +
      breakdown.industry +
      breakdown.companySize +
      breakdown.remote +
      breakdown.experience
    );
  }

  /**
   * Generate human-readable explanation with at least 3 elements
   */
  private generateExplanation(
    profile: AnonymizedProfile,
    job: Job,
    features: import("@/types/job").MatchFeatures
  ): string {
    const parts: string[] = [];

    // 1. Matched skills (always include if matched)
    if (features.skillMatch.matched.length > 0) {
      parts.push(`Matched on skills: ${features.skillMatch.matched.join(", ")}`);
    }

    // 2. Role match
    if (features.preferenceMatch.role) {
      parts.push(`Role matches your preferences: ${job.role}`);
    }

    // 3. Industry match
    const matchedIndustries = profile.industries.filter(
      (_, index) => features.preferenceMatch.industry[index]
    );
    if (matchedIndustries.length > 0) {
      parts.push(`Industry matches: ${matchedIndustries.join(", ")}`);
    }

    // 4. Experience alignment
    if (features.experienceMatch.alignment !== "mismatch") {
      const alignmentText = {
        entry: "suitable for entry-level",
        junior: "aligned with junior-level",
        mid: "aligned with mid-level",
        senior: "aligned with senior-level",
        lead: "aligned with lead-level",
      }[features.experienceMatch.alignment];
      parts.push(`Experience level ${alignmentText} position`);
    }

    // 5. Company size
    if (features.preferenceMatch.companySize) {
      parts.push(`Company size matches your preference: ${job.companySize}`);
    }

    // 6. Remote preference
    if (features.preferenceMatch.remote === true) {
      parts.push(`Remote work preference matches: ${job.remotePreference}`);
    } else if (features.preferenceMatch.remote === "partial") {
      parts.push(`Remote work preference partially matches`);
    }

    // Ensure at least 3 elements are referenced
    // If we don't have enough, add generic alignment statements
    if (parts.length < 3) {
      if (features.skillMatch.matched.length === 0) {
        parts.push("Some skill overlap with job requirements");
      }
      if (!features.preferenceMatch.role && parts.length < 3) {
        parts.push("Role may align with your career goals");
      }
      if (matchedIndustries.length === 0 && parts.length < 3) {
        parts.push("Industry may offer growth opportunities");
      }
    }

    if (parts.length === 0) {
      return "Some alignment with your profile";
    }

    return parts.join(". ");
  }
}

