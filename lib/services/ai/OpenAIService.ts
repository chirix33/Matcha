import { AIService, AIError } from "./AIService";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const SKILLS_EXTRACTION_TIMEOUT_MS = 10000; // 10 seconds

export class OpenAIService extends AIService {
  private apiKey: string;

  constructor() {
    super({
      timeoutMs: SKILLS_EXTRACTION_TIMEOUT_MS,
      maxRetries: 1, // Only 1 retry for OpenAI
      retryDelayMs: 1000,
    });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    this.apiKey = apiKey;
  }

  protected getProviderName(): string {
    return "OpenAI";
  }

  /**
   * Extract skills from transcript using OpenAI API with JSON mode
   */
  async extractSkills(transcript: string): Promise<string[]> {
    return this.withRetry(async () => {
      return this.withTimeout(
        this.performSkillsExtraction(transcript),
        SKILLS_EXTRACTION_TIMEOUT_MS
      );
    });
  }

  private async performSkillsExtraction(transcript: string): Promise<string[]> {
    console.log(`[OpenAI] Extracting skills from transcript (length: ${transcript.length})`);

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract professional and technical skills from the user transcript. " +
              "Return only a JSON object with a 'skills' array containing normalized skill names. " +
              "Normalize skill names (e.g., 'JavaScript' not 'javascript' or 'JS'). " +
              "Remove duplicates and filter out filler words or non-skill terms. " +
              "Return format: { \"skills\": [\"skill1\", \"skill2\", ...] }",
          },
          {
            role: "user",
            content: transcript,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[OpenAI] API error: ${response.status} - ${errorText}`);
      throw new AIError(`API error: ${response.status}`, this.getProviderName(), String(response.status), response.status >= 500);
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      throw new AIError("No content in OpenAI response", this.getProviderName(), "NO_CONTENT", false);
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("[OpenAI] Failed to parse JSON response:", parseError);
      throw new AIError("Invalid JSON response from OpenAI", this.getProviderName(), "INVALID_JSON", false);
    }

    // Validate response structure
    if (!parsed.skills || !Array.isArray(parsed.skills)) {
      throw new AIError("Invalid response format: missing skills array", this.getProviderName(), "INVALID_FORMAT", false);
    }

    // Filter and normalize skills
    const skills = parsed.skills
      .filter((skill: unknown) => typeof skill === "string" && skill.trim().length > 0)
      .map((skill: string) => skill.trim())
      .filter((skill: string, index: number, arr: string[]) => arr.indexOf(skill) === index); // Remove duplicates

    console.log(`[OpenAI] Success - extracted ${skills.length} skills`);
    return skills;
  }
}

