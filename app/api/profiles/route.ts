import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/lib/services/ProfileService";
import type { ProfileData } from "@/types/profile";

const profileService = new ProfileService();

/**
 * POST /api/profiles - Create or update profile
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, ...profileData } = body;

    // Validate email is provided
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate profile data structure
    const validatedProfileData: ProfileData = {
      name: profileData.name || "",
      email: email,
      phone: profileData.phone || "",
      skills: Array.isArray(profileData.skills) ? profileData.skills : [],
      yearsExperience: Number(profileData.yearsExperience) || 0,
      seniority: profileData.seniority || "entry",
      keyAchievements: profileData.keyAchievements || "",
      desiredRoles: Array.isArray(profileData.desiredRoles) ? profileData.desiredRoles : [],
      preferredCompanySize: profileData.preferredCompanySize || "medium",
      industries: Array.isArray(profileData.industries) ? profileData.industries : [],
      remotePreference: profileData.remotePreference || "flexible",
      privacyConsent: Boolean(profileData.privacyConsent),
    };

    // Ensure industries are included in updates for profile_features table
    const updateData = {
      ...validatedProfileData,
      industries: validatedProfileData.industries,
    };

    // Create or update profile
    const profile = await profileService.createOrUpdateProfile(
      email,
      updateData
    );

    // Get industries from profile_features
    const anonymized = await profileService.getAnonymizedProfileByEmail(email);

    // Return profile (without sensitive data if needed)
    return NextResponse.json(
      {
        id: profile.id,
        email: email,
        skills: profile.skills,
        yearsExperience: profile.years_experience,
        seniority: profile.seniority,
        keyAchievements: profile.key_achievements,
        desiredRoles: profile.desired_roles,
        preferredCompanySize: profile.preferred_company_size,
        industries: anonymized?.industries || [],
        remotePreference: profile.remote_preference,
        privacyConsent: profile.privacy_consent,
        createdAt: profile.created_at,
        updatedAt: profile.updated_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile creation/update error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create or update profile",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/profiles?email=... - Get profile by email
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email query parameter is required" },
        { status: 400 }
      );
    }

    const profile = await profileService.getProfileByEmail(email);

    if (!profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Get industries from profile_features
    const anonymized = await profileService.getAnonymizedProfileByEmail(email);

    return NextResponse.json({
      id: profile.id,
      email: email,
      skills: profile.skills,
      yearsExperience: profile.years_experience,
      seniority: profile.seniority,
      keyAchievements: profile.key_achievements,
      desiredRoles: profile.desired_roles,
      preferredCompanySize: profile.preferred_company_size,
      industries: anonymized?.industries || [],
      remotePreference: profile.remote_preference,
      privacyConsent: profile.privacy_consent,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    });
  } catch (error) {
    console.error("Profile retrieval error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to retrieve profile",
      },
      { status: 500 }
    );
  }
}

