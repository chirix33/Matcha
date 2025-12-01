import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const TIMEOUT_MS = 10000; // 10 seconds as per ASR1

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transcript } = body;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    // Call OpenAI API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      console.log(`[ExtractSkills] Sending request to OpenAI API (transcript length: ${transcript.length})`);

      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ExtractSkills] OpenAI API error: ${response.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("No content in OpenAI response");
      }

      // Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error("[ExtractSkills] Failed to parse JSON response:", parseError);
        throw new Error("Invalid JSON response from OpenAI");
      }

      // Validate response structure
      if (!parsed.skills || !Array.isArray(parsed.skills)) {
        throw new Error("Invalid response format: missing skills array");
      }

      // Filter and normalize skills
      const skills = parsed.skills
        .filter((skill: unknown) => typeof skill === "string" && skill.trim().length > 0)
        .map((skill: string) => skill.trim())
        .filter((skill: string, index: number, arr: string[]) => arr.indexOf(skill) === index); // Remove duplicates

      console.log(`[ExtractSkills] Success - extracted ${skills.length} skills`);

      return NextResponse.json({
        skills,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.error("[ExtractSkills] Request timeout after", TIMEOUT_MS, "ms");
        throw new Error("Skills extraction request timed out");
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Skills extraction error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Skills extraction failed",
        skills: [],
      },
      { status: 500 }
    );
  }
}

