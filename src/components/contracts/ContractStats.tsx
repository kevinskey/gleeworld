// Contract statistics component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContractStats as StatsType } from "@/types/contracts";

interface ContractStatsProps {
  stats: StatsType;
}

export const ContractStats: React.FC<ContractStatsProps> = ({ stats }) => {
  const statItems = [
    {
      label: 'Total',
      value: stats.total,
      color: 'bg-blue-100 text-blue-800'
    },
    {
      label: 'Draft',
      value: stats.draft,
      color: 'bg-gray-100 text-gray-800'
    },
    {
      label: 'Sent',
      value: stats.sent,
      color: 'bg-orange-100 text-orange-800'
    },
    {
      label: 'Signed',
      value: stats.signed,
      color: 'bg-green-100 text-green-800'
    },
    {
      label: 'Completed',
      value: stats.completed,
      color: 'bg-emerald-100 text-emerald-800'
    },
    {
      label: 'Cancelled',
      value: stats.cancelled,
      color: 'bg-red-100 text-red-800'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statItems.map((item) => (
        <Card key={item.label} className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{item.value}</div>
            <Badge className={`mt-2 ${item.color}`}>
              {item.label}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};