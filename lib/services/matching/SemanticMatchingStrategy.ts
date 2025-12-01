import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import { MatchFeatureExtractor } from "./MatchFeatureExtractor";
import type { MatchingStrategy, Job, MatchResult } from "@/types/job";
import type { AnonymizedProfile } from "@/types/profile";

export class SemanticMatchingStrategy implements MatchingStrategy {
  private hfService: HuggingFaceService;
  private featureExtractor: MatchFeatureExtractor;

  constructor() {
    this.hfService = new HuggingFaceService();
    this.featureExtractor = new MatchFeatureExtractor();
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

          // Extract features for explanation and breakdown
          const features = this.featureExtractor.buildMatchFeatures(profile, job);
          
          // Adjust score breakdown to reflect semantic similarity
          // Scale semantic similarity (0-1) to 0-100, then adjust breakdown proportionally
          const semanticScore = Math.round(similarity * 100);
          const baseBreakdown = features.scoreBreakdown;
          const baseTotal = Object.values(baseBreakdown).reduce((sum, val) => sum + val, 0);
          
          // If we have a base breakdown, scale it proportionally to semantic score
          // Otherwise, use semantic score directly
          const adjustedBreakdown = baseTotal > 0
            ? {
                skills: Math.round((baseBreakdown.skills / baseTotal) * semanticScore),
                role: Math.round((baseBreakdown.role / baseTotal) * semanticScore),
                industry: Math.round((baseBreakdown.industry / baseTotal) * semanticScore),
                companySize: Math.round((baseBreakdown.companySize / baseTotal) * semanticScore),
                remote: Math.round((baseBreakdown.remote / baseTotal) * semanticScore),
                experience: Math.round((baseBreakdown.experience / baseTotal) * semanticScore),
              }
            : {
                skills: Math.round(semanticScore * 0.4), // Default distribution
                role: Math.round(semanticScore * 0.2),
                industry: Math.round(semanticScore * 0.15),
                companySize: Math.round(semanticScore * 0.1),
                remote: Math.round(semanticScore * 0.1),
                experience: Math.round(semanticScore * 0.05),
              };

          return {
            job,
            score: semanticScore,
            explanation: this.generateExplanation(profile, job, similarity, {
              ...features,
              scoreBreakdown: adjustedBreakdown,
            }),
            matchedSkills: features.skillMatch.matched,
            isApproximate: false, // Semantic matching is not approximate
            features: {
              ...features,
              scoreBreakdown: adjustedBreakdown,
            },
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
   * Generate explanation based on semantic match with at least 3 elements
   */
  private generateExplanation(
    profile: AnonymizedProfile,
    job: Job,
    similarity: number,
    features: import("@/types/job").MatchFeatures
  ): string {
    const parts: string[] = [];

    // 1. Semantic similarity level
    if (similarity > 0.7) {
      parts.push("Strong semantic match");
    } else if (similarity > 0.5) {
      parts.push("Good semantic alignment");
    } else {
      parts.push("Some semantic alignment");
    }

    // 2. Matched skills (always include if matched)
    if (features.skillMatch.matched.length > 0) {
      parts.push(`Skills match: ${features.skillMatch.matched.join(", ")}`);
    }

    // 3. Role match
    if (features.preferenceMatch.role) {
      parts.push(`Role matches your preferences: ${job.role}`);
    }

    // 4. Industry match
    const matchedIndustries = profile.industries.filter(
      (_, index) => features.preferenceMatch.industry[index]
    );
    if (matchedIndustries.length > 0) {
      parts.push(`Industry matches: ${matchedIndustries.join(", ")}`);
    }

    // 5. Experience alignment
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

    // 6. Company size preference
    if (features.preferenceMatch.companySize) {
      parts.push(`Company size matches your preference: ${job.companySize}`);
    }

    // 7. Remote preference
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
      if (features.experienceMatch.alignment === "mismatch" && parts.length < 3) {
        parts.push("Experience level may be suitable for growth");
      }
    }

    return parts.join(". ");
  }
}

