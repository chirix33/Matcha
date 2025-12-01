import { SemanticMatchingStrategy } from "./SemanticMatchingStrategy";
import { KeywordMatchingStrategy } from "./KeywordMatchingStrategy";
import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import type { Job, MatchResult, CompanyInsight } from "@/types/job";
import type { AnonymizedProfile } from "@/types/profile";

const SEMANTIC_MATCHING_TIMEOUT_MS = 5000; // 5 seconds

export class MatchingOrchestrator {
  private semanticStrategy: SemanticMatchingStrategy;
  private keywordStrategy: KeywordMatchingStrategy;
  private hfService: HuggingFaceService;

  constructor() {
    this.semanticStrategy = new SemanticMatchingStrategy();
    this.keywordStrategy = new KeywordMatchingStrategy();
    this.hfService = new HuggingFaceService();
  }

  /**
   * Find job matches for a profile using strategy pattern with fallback
   */
  async findMatches(profile: AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]> {
    // Try semantic matching first with timeout
    try {
      const matches = await Promise.race([
        this.semanticStrategy.findMatches(profile, jobs),
        this.timeoutPromise(SEMANTIC_MATCHING_TIMEOUT_MS),
      ]);

      console.log(`[MatchingOrchestrator] Semantic matching succeeded (${matches.length} matches)`);
      return matches;
    } catch (error) {
      // Fallback to keyword matching
      console.warn("[MatchingOrchestrator] Semantic matching failed, falling back to keyword matching:", error);
      const matches = await this.keywordStrategy.findMatches(profile, jobs);
      console.log(`[MatchingOrchestrator] Keyword matching completed (${matches.length} matches)`);
      return matches;
    }
  }

  /**
   * Generate company insight cards for jobs
   */
  async generateCompanyInsights(jobs: Job[]): Promise<Map<string, CompanyInsight>> {
    const insights = new Map<string, CompanyInsight>();

    // Generate insights in parallel with timeout protection
    const insightPromises = jobs.map(async (job) => {
      try {
        const insight = await Promise.race([
          this.hfService.summarizeCompany(job.description, `${job.company} - ${job.industry}`),
          this.timeoutPromise(5000), // 5 second timeout
        ]);

        // Enhance insight with job data
        insight.companySize = job.companySize;
        insight.industries = [job.industry];

        insights.set(job.id, insight);
      } catch (error) {
        // Fallback: Create simple insight from job data
        console.warn(`[MatchingOrchestrator] Failed to generate insight for job ${job.id}, using fallback:`, error);
        insights.set(job.id, this.createFallbackInsight(job));
      }
    });

    await Promise.all(insightPromises);
    return insights;
  }

  /**
   * Create fallback insight when AI summarization fails
   */
  private createFallbackInsight(job: Job): CompanyInsight {
    // Extract first 2-3 sentences from description
    const sentences = job.description.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const description = sentences.slice(0, 2).join(". ").trim() + ".";

    // Extract key responsibilities (look for bullet points)
    const responsibilityPatterns = [/[-•]\s*(.+?)(?:\n|$)/g, /\d+\.\s*(.+?)(?:\n|$)/g];
    const responsibilities: string[] = [];

    for (const pattern of responsibilityPatterns) {
      const matches = job.description.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && responsibilities.length < 3) {
          responsibilities.push(match[1].trim());
        }
      }
    }

    // If no responsibilities found, use key phrases
    if (responsibilities.length === 0) {
      const keyPhrases = job.description
        .split(/[.!?,\n]+/)
        .filter((s) => s.trim().length > 20 && s.trim().length < 100)
        .slice(0, 3)
        .map((s) => s.trim());
      responsibilities.push(...keyPhrases);
    }

    return {
      companySize: job.companySize,
      industries: [job.industry],
      description: description || job.description.substring(0, 200),
      keyResponsibilities:
        responsibilities.length > 0
          ? responsibilities
          : ["See job description for details"],
    };
  }

  /**
   * Timeout promise helper
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Operation timed out")), ms)
    );
  }
}

