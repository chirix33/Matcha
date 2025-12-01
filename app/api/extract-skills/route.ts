import { NextRequest, NextResponse } from "next/server";
import { OpenAIService } from "@/lib/services/ai/OpenAIService";
import { AIError } from "@/lib/services/ai/AIService";

// Simple parsing fallback function
function parseSkillsFallback(transcript: string): string[] {
  return transcript
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = body.transcript;

    if (!transcript || typeof transcript !== "string") {
      return NextResponse.json(
        { error: "Transcript text is required" },
        { status: 400 }
      );
    }

    // Try OpenAI API first
    try {
      const openAIService = new OpenAIService();
      const skills = await openAIService.extractSkills(transcript);

      if (skills.length > 0) {
        return NextResponse.json({ skills });
      }
    } catch (error) {
      // Log error but continue to fallback
      console.warn("[ExtractSkills] OpenAI extraction failed, using fallback:", error);
    }

    // Fallback to simple parsing
    const fallbackSkills = parseSkillsFallback(transcript);
    return NextResponse.json({
      skills: fallbackSkills,
      fallback: true, // Indicate fallback was used
    });
  } catch (error) {
    console.error("Skills extraction error:", error);

    // Try to extract transcript from error context if possible
    // Note: Request body can only be read once, so we can't re-read it here
    // If we reach here, it's likely a parsing error or service error
    
    // If it's an AIError, return appropriate status with empty skills
    if (error instanceof AIError) {
      const statusCode = error.code === "TIMEOUT" ? 408 : error.code === "SERVICE_UNAVAILABLE" ? 503 : 500;
      return NextResponse.json(
        {
          error: error.message,
          skills: [],
          fallback: true,
        },
        { status: statusCode }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Skills extraction failed",
        skills: [],
      },
      { status: 500 }
    );
  }
}
