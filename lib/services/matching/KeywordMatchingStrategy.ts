import type { MatchingStrategy, Job, MatchResult } from "@/types/job";
import type { AnonymizedProfile } from "@/types/profile";

export class KeywordMatchingStrategy implements MatchingStrategy {
  getStrategyName(): string {
    return "keyword";
  }

  /**
   * Find matches using keyword-based scoring
   */
  async findMatches(profile: AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]> {
    const matches: MatchResult[] = jobs
      .map((job) => {
        const score = this.calculateScore(profile, job);
        if (score > 0) {
          return {
            job,
            score,
            explanation: this.generateExplanation(profile, job),
            matchedSkills: this.getMatchedSkills(profile, job),
            isApproximate: true, // Always approximate for keyword matching
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
   * Calculate keyword-based match score
   */
  private calculateScore(profile: AnonymizedProfile, job: Job): number {
    let score = 0;

    // Skill matches: +10 per matched skill
    const skillMatches = profile.skills.filter((skill) =>
      job.requiredSkills.some(
        (requiredSkill) => requiredSkill.toLowerCase() === skill.toLowerCase()
      )
    ).length;
    score += skillMatches * 10;

    // Role match: +20
    if (profile.desiredRoles.some((role) => role.toLowerCase() === job.role.toLowerCase())) {
      score += 20;
    }

    // Industry match: +15 per matched industry
    const industryMatches = profile.industries.filter((industry) =>
      industry.toLowerCase() === job.industry.toLowerCase()
    ).length;
    score += industryMatches * 15;

    // Company size match: +10
    if (profile.preferredCompanySize === job.companySize) {
      score += 10;
    }

    // Remote preference match: +10
    if (profile.remotePreference === job.remotePreference) {
      score += 10;
    } else if (
      (profile.remotePreference === "flexible" || job.remotePreference === "flexible") &&
      profile.remotePreference !== job.remotePreference
    ) {
      // Partial match for flexible preference
      score += 5;
    }

    // Experience level bonus (simplified)
    // Entry/junior roles favor entry/junior profiles
    if (
      (job.role.toLowerCase().includes("entry") || job.role.toLowerCase().includes("junior")) &&
      (profile.seniority === "entry" || profile.seniority === "junior")
    ) {
      score += 5;
    }

    return score;
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(profile: AnonymizedProfile, job: Job): string {
    const parts: string[] = [];

    // Matched skills
    const matchedSkills = this.getMatchedSkills(profile, job);
    if (matchedSkills.length > 0) {
      parts.push(`Matched on skills: ${matchedSkills.join(", ")}`);
    }

    // Role match
    if (profile.desiredRoles.some((role) => role.toLowerCase() === job.role.toLowerCase())) {
      parts.push(`Role matches your preferences: ${job.role}`);
    }

    // Industry match
    const matchedIndustries = profile.industries.filter(
      (industry) => industry.toLowerCase() === job.industry.toLowerCase()
    );
    if (matchedIndustries.length > 0) {
      parts.push(`Industry matches: ${matchedIndustries.join(", ")}`);
    }

    // Company size
    if (profile.preferredCompanySize === job.companySize) {
      parts.push(`Company size matches your preference: ${job.companySize}`);
    }

    // Remote preference
    if (profile.remotePreference === job.remotePreference) {
      parts.push(`Remote work preference matches: ${job.remotePreference}`);
    }

    if (parts.length === 0) {
      return "Some alignment with your profile";
    }

    return parts.join(". ");
  }

  /**
   * Get list of matched skills
   */
  private getMatchedSkills(profile: AnonymizedProfile, job: Job): string[] {
    return profile.skills.filter((skill) =>
      job.requiredSkills.some(
        (requiredSkill) => requiredSkill.toLowerCase() === skill.toLowerCase()
      )
    );
  }
}

