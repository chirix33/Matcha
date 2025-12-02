import { SemanticMatchingStrategy } from "./SemanticMatchingStrategy";
import { KeywordMatchingStrategy } from "./KeywordMatchingStrategy";
import { HuggingFaceService } from "@/lib/services/ai/HuggingFaceService";
import { companyInsightsCache } from "@/lib/services/cache/CompanyInsightsCache";
import { performanceMonitor } from "@/lib/services/PerformanceMonitor";
import type { Job, MatchResult, CompanyInsight } from "@/types/job";
import type { AnonymizedProfile } from "@/types/profile";

const SEMANTIC_MATCHING_TIMEOUT_MS = 5000; // 5 seconds
const MAX_MATCHES_TO_PROCESS = 10; // Limit to top 10 matches for performance

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
   * Optimized to limit processing to top matches early for performance
   */
  async findMatches(profile: AnonymizedProfile, jobs: Job[]): Promise<MatchResult[]> {
    return performanceMonitor.measureAsync("matching.findMatches", async () => {
      // Limit jobs to process for performance (we only need top 10)
      // Process slightly more than needed to account for filtering, but not all jobs
      const jobsToProcess = jobs.slice(0, Math.min(jobs.length, MAX_MATCHES_TO_PROCESS * 2));

      // Try semantic matching first with timeout
      try {
        const matches = await Promise.race([
          this.semanticStrategy.findMatches(profile, jobsToProcess),
          this.timeoutPromise(SEMANTIC_MATCHING_TIMEOUT_MS),
        ]);

        // Sort by score and limit to top 10
        const topMatches = matches
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MATCHES_TO_PROCESS);

        console.log(`[MatchingOrchestrator] Semantic matching succeeded (${topMatches.length} matches)`);
        return topMatches;
      } catch (error) {
        // Fallback to keyword matching
        console.warn("[MatchingOrchestrator] Semantic matching failed, falling back to keyword matching:", error);
        const matches = await this.keywordStrategy.findMatches(profile, jobsToProcess);
        
        // Sort by score and limit to top 10
        const topMatches = matches
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_MATCHES_TO_PROCESS);

        console.log(`[MatchingOrchestrator] Keyword matching completed (${topMatches.length} matches)`);
        return topMatches;
      }
    });
  }

  /**
   * Generate company insight cards for jobs
   * Uses caching to avoid redundant AI calls and improve performance
   */
  async generateCompanyInsights(jobs: Job[]): Promise<Map<string, CompanyInsight>> {
    return performanceMonitor.measureAsync("matching.generateCompanyInsights", async () => {
      const insights = new Map<string, CompanyInsight>();

      // Generate insights in parallel with timeout protection and caching
      const insightPromises = jobs.map(async (job) => {
        // Check cache first
        const cachedInsight = companyInsightsCache.get(job.id, job.description);
        if (cachedInsight) {
          insights.set(job.id, cachedInsight);
          return;
        }

        try {
          const insight = await Promise.race([
            this.hfService.summarizeCompany(job.description, `${job.company} - ${job.industry}`),
            this.timeoutPromise(5000), // 5 second timeout
          ]);

          // Enhance insight with job data
          insight.companySize = job.companySize;
          insight.industries = [job.industry];

          // Cache the insight for future use
          companyInsightsCache.set(job.id, job.description, insight);
          insights.set(job.id, insight);
        } catch (error) {
          // Fallback: Create simple insight from job data
          console.warn(`[MatchingOrchestrator] Failed to generate insight for job ${job.id}, using fallback:`, error);
          const fallbackInsight = this.createFallbackInsight(job);
          // Cache fallback insight too (shorter TTL could be considered, but 7 days is fine)
          companyInsightsCache.set(job.id, job.description, fallbackInsight);
          insights.set(job.id, fallbackInsight);
        }
      });

      await Promise.all(insightPromises);
      return insights;
    });
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

