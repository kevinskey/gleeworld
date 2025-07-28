import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, ExternalLink, Users } from "lucide-react";
import { Scholarship } from "@/hooks/useScholarships";

interface ScholarshipCardProps {
  scholarship: Scholarship;
}

export const ScholarshipCard = ({ scholarship }: ScholarshipCardProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No deadline specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isDeadlineClose = (dateString?: string) => {
    if (!dateString) return false;
    const deadline = new Date(dateString);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays > 0;
  };

  return (
    <Card className="h-full border-brand-200 hover:border-brand-300 transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight text-brand-800 line-clamp-2">
              {scholarship.title}
            </CardTitle>
            {scholarship.description && (
              <CardDescription className="mt-2 text-sm text-brand-600 line-clamp-2">
                {scholarship.description}
              </CardDescription>
            )}
          </div>
          {scholarship.is_featured && (
            <Badge variant="default" className="bg-gradient-to-r from-brand-500 to-brand-600 text-white shrink-0">
              Featured
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Amount */}
        {scholarship.amount && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-brand-500" />
            <span className="font-medium text-brand-700">{scholarship.amount}</span>
          </div>
        )}

        {/* Deadline */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-brand-500" />
          <span className={`${isDeadlineClose(scholarship.deadline) ? 'text-red-600 font-medium' : 'text-brand-600'}`}>
            Deadline: {formatDate(scholarship.deadline)}
          </span>
        </div>

        {/* Eligibility */}
        {scholarship.eligibility && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="h-4 w-4 text-brand-500 mt-0.5 shrink-0" />
            <span className="text-brand-600 line-clamp-2">{scholarship.eligibility}</span>
          </div>
        )}

        {/* Tags */}
        {scholarship.tags && scholarship.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {scholarship.tags.slice(0, 3).map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs bg-brand-50 text-brand-700 border-brand-200"
              >
                {tag}
              </Badge>
            ))}
            {scholarship.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs bg-brand-50 text-brand-700 border-brand-200">
                +{scholarship.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Apply Button */}
        {scholarship.link && (
          <Button
            asChild
            className="w-full bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white"
          >
            <a
              href={scholarship.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              Apply Now
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};