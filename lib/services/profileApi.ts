import type { ProfileData } from "@/types/profile";

export interface ProfileResponse {
  id: string;
  email: string;
  skills: string[];
  yearsExperience: number;
  seniority: "entry" | "junior" | "mid" | "senior" | "lead";
  keyAchievements: string | null;
  desiredRoles: string[];
  preferredCompanySize: "small" | "medium" | "large";
  industries: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "flexible";
  privacyConsent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create or update profile
 */
export async function createProfile(
  profileData: ProfileData
): Promise<ProfileResponse> {
  const response = await fetch("/api/profiles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: profileData.email,
      ...profileData,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create profile");
  }

  return await response.json();
}

/**
 * Get profile by email
 */
export async function getProfileByEmail(
  email: string
): Promise<ProfileResponse | null> {
  const response = await fetch(`/api/profiles?email=${encodeURIComponent(email)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to retrieve profile");
  }

  return await response.json();
}

/**
 * Update profile (uses POST with email in body)
 */
export async function updateProfile(
  email: string,
  updates: Partial<ProfileData>
): Promise<ProfileResponse> {
  // First get existing profile
  const existing = await getProfileByEmail(email);
  if (!existing) {
    throw new Error("Profile not found");
  }

  // Merge updates with existing data
  const updatedData: ProfileData = {
    name: updates.name || existing.email, // Use email as fallback for name
    email: email,
    phone: updates.phone || "",
    skills: updates.skills || existing.skills,
    yearsExperience: updates.yearsExperience ?? existing.yearsExperience,
    seniority: updates.seniority || existing.seniority,
    keyAchievements: updates.keyAchievements || existing.keyAchievements || "",
    desiredRoles: updates.desiredRoles || existing.desiredRoles,
    preferredCompanySize: updates.preferredCompanySize || existing.preferredCompanySize,
    industries: updates.industries || existing.industries,
    remotePreference: updates.remotePreference || existing.remotePreference,
    privacyConsent: updates.privacyConsent ?? existing.privacyConsent,
  };

  return await createProfile(updatedData);
}

