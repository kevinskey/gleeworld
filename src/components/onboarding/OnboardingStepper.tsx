import React from 'react';
import { CheckCircle, Circle, User, Shirt, FileText, Eye } from 'lucide-react';

interface StepperProps {
  currentStep: number;
  completedSteps: number[];
}

const steps = [
  { id: 1, title: 'Account', icon: User, description: 'Sign in or create account' },
  { id: 2, title: 'Profile', icon: User, description: 'Basic information' },
  { id: 3, title: 'Uniform & Media', icon: Shirt, description: 'Measurements & preferences' },
  { id: 4, title: 'Agreements', icon: FileText, description: 'Consent & releases' },
  { id: 5, title: 'Review', icon: Eye, description: 'Review & submit' },
];

export const OnboardingStepper = ({ currentStep, completedSteps }: StepperProps) => {
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isAccessible = step.id <= currentStep || isCompleted;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center space-y-2 min-w-0 flex-1">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                  ${isCompleted 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : isCurrent 
                    ? 'border-primary text-primary' 
                    : isAccessible
                    ? 'border-muted-foreground text-muted-foreground'
                    : 'border-muted text-muted'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                
                <div className="text-center">
                  <div className={`
                    text-sm font-medium
                    ${isCurrent ? 'text-primary' : isAccessible ? 'text-foreground' : 'text-muted-foreground'}
                  `}>
                    {step.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </div>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-2 transition-all
                  ${completedSteps.includes(step.id) ? 'bg-primary' : 'bg-muted'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};