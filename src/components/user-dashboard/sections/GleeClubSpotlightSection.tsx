import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Award, TrendingUp, Users } from "lucide-react";

export const GleeClubSpotlightSection = () => {
  const spotlightItems = [
    {
      icon: Award,
      title: "Member of the Month",
      description: "Congratulations to Sarah Johnson for outstanding dedication!",
      gradient: "from-yellow-50 to-orange-50",
      border: "border-yellow-200",
      iconColor: "text-yellow-600"
    },
    {
      icon: TrendingUp,
      title: "Latest Achievement",
      description: "First place at the Regional Choir Competition!",
      gradient: "from-blue-50 to-purple-50",
      border: "border-blue-200",
      iconColor: "text-blue-600"
    },
    {
      icon: Users,
      title: "Community Impact",
      description: "Raised $5,000 for local music education programs!",
      gradient: "from-green-50 to-teal-50",
      border: "border-green-200",
      iconColor: "text-green-600"
    }
  ];

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Star className="h-5 w-5 mr-2 text-yellow-500" />
          Glee Club Spotlight
        </CardTitle>
        <CardDescription>Member recognition and community updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {spotlightItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div
                key={index}
                className={`p-4 bg-gradient-to-r ${item.gradient} rounded-lg border ${item.border}`}
              >
                <div className="flex items-center space-x-3">
                  <IconComponent className={`h-8 w-8 ${item.iconColor} flex-shrink-0`} />
                  <div>
                    <h4 className="font-semibold">{item.title}</h4>
                    <p className="text-sm text-gray-600">{item.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};