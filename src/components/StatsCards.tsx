
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useW9Forms } from "@/hooks/useW9Forms";

interface StatsCardsProps {
  totalContracts: number;
  completedCount: number;
  pendingCount: number;
}

export const StatsCards = ({ totalContracts, completedCount, pendingCount }: StatsCardsProps) => {
  const [w9Count, setW9Count] = useState(0);
  const { getTotalW9Count } = useW9Forms();

  useEffect(() => {
    let isMounted = true;
    
    const fetchW9Count = async () => {
      try {
        const count = await getTotalW9Count();
        if (isMounted) {
          setW9Count(count);
        }
      } catch (error) {
        console.error('Error fetching W9 count:', error);
        if (isMounted) {
          setW9Count(0);
        }
      }
    };

    fetchW9Count();

    return () => {
      isMounted = false;
    };
  }, [getTotalW9Count]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">{totalContracts}</CardTitle>
          <CardDescription className="text-blue-100">Total Contracts</CardDescription>
        </CardHeader>
      </Card>
      <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">{completedCount}</CardTitle>
          <CardDescription className="text-green-100">Completed</CardDescription>
        </CardHeader>
      </Card>
      <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">{pendingCount}</CardTitle>
          <CardDescription className="text-yellow-100">Pending</CardDescription>
        </CardHeader>
      </Card>
      <Card className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">{w9Count}</CardTitle>
          <CardDescription className="text-yellow-100">W9 Forms</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
