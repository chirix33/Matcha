import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import type { MatchingStrategy, Job, MatchResult } from "@/types/job";
import type { AnonymizedProfile } from "@/types/profile";

export class SemanticMatchingStrategy implements MatchingStrategy {
  private hfService: HuggingFaceService;

  constructor() {
    this.hfService = new HuggingFaceService();
  }

  getStrategyName(): string {
    return "semantic";
  }

  /**
   * Find matches using semantic similarity (using new HF sentence-similarity API)
   * More efficient: one API call compares profile to all jobs
   */
  async findMatches(profile: AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]> {
    try {
      // Convert profile to text
      const profileText = this.profileToText(profile);

      // Convert all jobs to text
      const jobTexts = jobs.map((job) => this.jobToText(job));

      // Use sentence-similarity API to compare profile to all jobs in one call
      const similarities = await this.hfService.calculateSimilarities(profileText, jobTexts);

      // Map similarities to jobs and create match results
      const matches: MatchResult[] = jobs
        .map((job, index) => {
          const similarity = similarities[index];
          if (typeof similarity !== "number" || isNaN(similarity)) {
            return null;
          }

          return {
            job,
            score: Math.round(similarity * 100), // Convert 0-1 range to 0-100 scale
            explanation: this.generateExplanation(profile, job, similarity),
            matchedSkills: this.getMatchedSkills(profile, job),
            isApproximate: false, // Semantic matching is not approximate
          };
        })
        .filter((match): match is MatchResult => match !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10 matches

      return matches;
    } catch (error) {
      console.error("[SemanticMatching] Failed to generate matches:", error);
      throw error; // Let orchestrator handle fallback
    }
  }

  /**
   * Convert profile to text for embedding
   */
  private profileToText(profile: AnonymizedProfile): string {
    const parts: string[] = [];

    if (profile.skills.length > 0) {
      parts.push(`Skills: ${profile.skills.join(", ")}`);
    }

    if (profile.desiredRoles.length > 0) {
      parts.push(`Desired roles: ${profile.desiredRoles.join(", ")}`);
    }

    if (profile.industries.length > 0) {
      parts.push(`Industries: ${profile.industries.join(", ")}`);
    }

    parts.push(`Experience: ${profile.yearsExperience} years, ${profile.seniority} level`);
    parts.push(`Company size preference: ${profile.preferredCompanySize}`);
    parts.push(`Remote preference: ${profile.remotePreference}`);

    return parts.join(". ");
  }

  /**
   * Convert job to text for embedding
   */
  private jobToText(job: Job): string {
    const parts: string[] = [];

    parts.push(`Job title: ${job.title}`);
    parts.push(`Company: ${job.company}`);
    parts.push(`Role: ${job.role}`);

    if (job.requiredSkills.length > 0) {
      parts.push(`Required skills: ${job.requiredSkills.join(", ")}`);
    }

    parts.push(`Company size: ${job.companySize}`);
    parts.push(`Industry: ${job.industry}`);
    parts.push(`Remote preference: ${job.remotePreference}`);

    // Include first part of description
    if (job.description) {
      const descriptionPreview = job.description.substring(0, 200);
      parts.push(`Description: ${descriptionPreview}`);
    }

    return parts.join(". ");
  }

  // Note: calculateCosineSimilarity removed - now using HF sentence-similarity API directly
  // which returns similarity scores, so we don't need to calculate cosine similarity manually

  /**
   * Generate explanation based on semantic match
   */
  private generateExplanation(profile: AnonymizedProfile, job: Job, similarity: number): string {
    const parts: string[] = [];

    // High similarity
    if (similarity > 0.7) {
      parts.push("Strong semantic match");
    } else if (similarity > 0.5) {
      parts.push("Good semantic alignment");
    } else {
      parts.push("Some semantic alignment");
    }

    // Add specific matches
    const matchedSkills = this.getMatchedSkills(profile, job);
    if (matchedSkills.length > 0) {
      parts.push(`Skills match: ${matchedSkills.join(", ")}`);
    }

    if (profile.desiredRoles.some((role) => role.toLowerCase() === job.role.toLowerCase())) {
      parts.push(`Role matches: ${job.role}`);
    }

    return parts.join(". ");
  }

  /**
   * Get matched skills
   */
  private getMatchedSkills(profile: AnonymizedProfile, job: Job): string[] {
    return profile.skills.filter((skill) =>
      job.requiredSkills.some(
        (requiredSkill) => requiredSkill.toLowerCase() === skill.toLowerCase()
      )
    );
  }
}

