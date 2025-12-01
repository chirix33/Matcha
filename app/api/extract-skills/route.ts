import { NextRequest, NextResponse } from "next/server";
import { OpenAIService } from "@/lib/services/ai/OpenAIService";
import { AIError } from "@/lib/services/ai/AIService";
import { auditLogger } from "@/lib/services/AuditLogger";
import { prepareTranscriptForOpenAI } from "@/lib/utils/privacyUtils";

// Simple parsing fallback function
function parseSkillsFallback(transcript: string): string[] {
  return transcript
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * POST /api/extract-skills
 * 
 * Privacy Boundary: This endpoint receives ONLY transcript text (no PII).
 * The transcript is validated and sanitized before being sent to OpenAI API.
 * Only the transcript text is sent to OpenAI - no personal identifiers.
 */
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

    // Privacy Boundary: Validate and sanitize transcript before sending to OpenAI
    const { transcript: sanitizedTranscript, wasSanitized, warnings } = prepareTranscriptForOpenAI(transcript);
    
    if (wasSanitized) {
      console.warn("[ExtractSkills] Transcript sanitized - PII patterns removed:", warnings);
    }

    // Try OpenAI API first
    try {
      const openAIService = new OpenAIService();
      // Privacy: Only sanitized transcript text is sent to OpenAI (no PII)
      const skills = await openAIService.extractSkills(sanitizedTranscript);

      // Audit log: Success (privacy boundary crossing logged after successful call)
      auditLogger.logOpenAICall("extractSkills", sanitizedTranscript.length, true);

      if (skills.length > 0) {
        return NextResponse.json({ skills });
      }
    } catch (error) {
      // Audit log: Failure
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      auditLogger.logOpenAICall("extractSkills", sanitizedTranscript.length, false, errorMessage);
      
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

    // Audit log: General error
    auditLogger.log({
      eventType: "OPENAI_API_CALL",
      serviceName: "OpenAI",
      operation: "extractSkills",
      dataType: "transcript_text",
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Skills extraction failed",
        skills: [],
      },
      { status: 500 }
    );
  }
}
