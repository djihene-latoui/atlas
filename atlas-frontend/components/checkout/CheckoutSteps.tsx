import React, { Fragment } from "react";
import { Check, MapPin, Truck, CreditCard, CheckCircle2 } from "lucide-react";
import { CheckoutStep } from "@/lib/checkout";

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
  completedSteps: CheckoutStep[];
}

const STEPS: { id: CheckoutStep; label: string; icon: React.ElementType }[] = [
  { id: "address", label: "Adresse", icon: MapPin },
  { id: "shipping", label: "Livraison", icon: Truck },
  { id: "payment", label: "Paiement", icon: CreditCard },
  { id: "confirmation", label: "Confirmation", icon: CheckCircle2 },
];

export function CheckoutSteps({ currentStep, completedSteps }: CheckoutStepsProps) {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = completedSteps.includes(step.id);
          const isActive = currentStep === step.id;

          return (
            <Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center mb-2 transition-all duration-300 ${isCompleted
                      ? "bg-blue-600 text-white"
                      : isActive
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={`text-xs font-semibold tracking-wide ${isActive
                      ? "text-slate-900"
                      : isCompleted
                        ? "text-blue-600"
                        : "text-slate-400"
                    }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`h-px flex-1 mx-3 mb-5 transition-all duration-500 ${isCompleted ? "bg-blue-600" : "bg-slate-200"
                    }`}
                />
              )}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
