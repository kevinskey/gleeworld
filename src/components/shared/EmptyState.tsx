
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = ""
}: EmptyStateProps) => {
  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="mx-auto mb-4 text-gray-400">
            {icon}
          </div>
          <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
          <p className="text-gray-600 mb-4">{description}</p>
          {actionLabel && onAction && (
            <Button onClick={onAction} className="bg-brand-600 hover:bg-brand-700">
              {actionLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
