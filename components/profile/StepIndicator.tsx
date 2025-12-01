"use client";

import type { FormStep } from "@/types/profile";

interface StepIndicatorProps {
  currentStep: FormStep;
  onStepClick?: (step: FormStep) => void;
}

const steps = [
  { number: 1, label: "Basic Info" },
  { number: 2, label: "Skills" },
  { number: 3, label: "Experience" },
  { number: 4, label: "Preferences" },
  { number: 5, label: "Review" },
] as const;

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = step.number as FormStep;
          const isActive = currentStep === stepNumber;
          const isCompleted = currentStep > stepNumber;
          const isClickable = onStepClick && (isCompleted || isActive);

          return (
            <div key={step.number} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(stepNumber)}
                  disabled={!isClickable}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    isActive
                      ? "bg-matcha-primary text-white ring-4 ring-matcha-light"
                      : isCompleted
                      ? "bg-matcha-secondary text-white"
                      : "bg-gray-200 text-gray-600"
                  } ${isClickable ? "cursor-pointer hover:scale-110" : "cursor-default"}`}
                  aria-label={`Step ${step.number}: ${step.label}`}
                >
                  {isCompleted ? "✓" : step.number}
                </button>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive ? "text-matcha-primary" : "text-gray-500"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    isCompleted ? "bg-matcha-secondary" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

