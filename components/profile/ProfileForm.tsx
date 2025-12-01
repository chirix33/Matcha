"use client";

import { useState } from "react";
import { ProfileFormProvider, useProfileFormContext } from "@/lib/contexts/ProfileFormContext";
import StepIndicator from "./StepIndicator";
import Step1BasicInfo from "./Step1BasicInfo";
import Step2Skills from "./Step2Skills";
import Step3Experience from "./Step3Experience";
import Step4Preferences from "./Step4Preferences";
import Step5Review from "./Step5Review";

function ProfileFormContent() {
  const {
    currentStep,
    formData,
    nextStep,
    previousStep,
    goToStep,
    validateStep,
    resetForm,
  } = useProfileFormContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!validateStep(5)) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // TODO: Replace with actual API call in Task 2
      // For now, just log and show success
      console.log("Submitting profile:", formData);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitSuccess(true);
      
      // Clear localStorage after successful submission
      if (typeof window !== "undefined") {
        localStorage.removeItem("matcha_profile_draft");
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit profile. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicInfo />;
      case 2:
        return <Step2Skills />;
      case 3:
        return <Step3Experience />;
      case 4:
        return <Step4Preferences />;
      case 5:
        return <Step5Review />;
      default:
        return null;
    }
  };

  if (submitSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-green-900 mb-2">Profile Created Successfully!</h2>
          <p className="text-green-800 mb-6">
            Your profile has been saved. You can now discover job matches.
          </p>
          <button
            onClick={resetForm}
            className="px-6 py-3 bg-matcha-primary text-white rounded-md hover:bg-matcha-secondary"
          >
            Create Another Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Profile</h1>
        <p className="text-gray-600">
          Tell us about yourself to discover job matches. No resume required!
        </p>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} onStepClick={goToStep} />

      {/* Form Content */}
      <div className="bg-white rounded-lg shadow-md p-8 mb-6">{renderStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={previousStep}
          disabled={currentStep === 1}
          className={`px-6 py-2 rounded-md font-medium transition-colors ${
            currentStep === 1
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Previous
        </button>

        <div className="text-sm text-gray-500">
          Step {currentStep} of 5
        </div>

        {currentStep < 5 ? (
          <button
            type="button"
            onClick={nextStep}
            className="px-6 py-2 bg-matcha-primary text-white rounded-md font-medium hover:bg-matcha-secondary transition-colors"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`px-6 py-2 rounded-md font-medium transition-colors ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-matcha-primary hover:bg-matcha-secondary text-white"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit Profile"}
          </button>
        )}
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{submitError}</p>
        </div>
      )}
    </div>
  );
}

export default function ProfileForm() {
  return (
    <ProfileFormProvider>
      <ProfileFormContent />
    </ProfileFormProvider>
  );
}

