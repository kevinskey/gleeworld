
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Download, Eye, User } from "lucide-react";
import { useAdminUserRecords } from "@/hooks/useAdminUserRecords";

export const UserFinancialRecords = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const { userRecords, loading, error } = useAdminUserRecords();

  const filteredRecords = userRecords?.filter(record => {
    const matchesSearch = !searchTerm || 
      record.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || record.hasRecords === (typeFilter === "has_records");
    
    return matchesSearch && matchesType;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2">Loading user financial records...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              User Financial Records
            </CardTitle>
            <CardDescription>
              Overview of all user financial activities and balances
            </CardDescription>
          </div>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="has_records">Has Records</SelectItem>
              <SelectItem value="no_records">No Records</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">No records found</h3>
              <p className="text-sm">
                {searchTerm ? "Try adjusting your search terms" : "No financial records available"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRecords.map((record) => (
                <div key={record.user_id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{record.user_name || 'No name'}</p>
                      <p className="text-sm text-gray-600">{record.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-medium">{formatCurrency(record.currentBalance)}</p>
                      <p className="text-sm text-gray-500">Current Balance</p>
                    </div>
                    <div>
                      <p className="font-medium">{record.totalRecords}</p>
                      <p className="text-sm text-gray-500">Records</p>
                    </div>
                    <div>
                      <Badge variant={record.hasRecords ? "default" : "secondary"}>
                        {record.hasRecords ? "Active" : "No Records"}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
