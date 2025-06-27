
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, Clock, User, Mail, Shield, Star } from "lucide-react";
import { useContracts } from "@/hooks/useContracts";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/contexts/AuthContext";

export const System = () => {
  const { contracts, loading } = useContracts();
  const { user } = useAuth();
  const { userProfile, displayName } = useUserProfile(user);

  // Calculate stats
  const totalContracts = contracts.length;
  const completedCount = contracts.filter(contract => contract.status === 'completed').length;
  const pendingCount = contracts.filter(contract => contract.status === 'pending' || contract.status === 'draft').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">System Overview</h1>
            <p className="text-brand-100">Manage your contracts and view system information</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center bg-brand-50 rounded-lg p-4">
                  <FileText className="h-8 w-8 text-brand-500 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-brand-600/80">Total Contracts</p>
                    <p className="text-2xl font-bold text-brand-700">{loading ? "..." : totalContracts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center bg-green-50 rounded-lg p-4">
                  <CheckCircle className="h-8 w-8 text-green-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-green-700/80">Completed</p>
                    <p className="text-2xl font-bold text-green-800">{loading ? "..." : completedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center bg-orange-50 rounded-lg p-4">
                  <Clock className="h-8 w-8 text-orange-600 mr-4" />
                  <div>
                    <p className="text-sm font-medium text-orange-700/80">Pending</p>
                    <p className="text-2xl font-bold text-orange-800">{loading ? "..." : pendingCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Profile Information */}
            <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-brand-800">
                  <User className="h-5 w-5 text-brand-500" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-brand-600">
                  Your account details and settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-3 bg-brand-50 rounded-lg">
                  <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-brand-800">{displayName}</p>
                    <div className="flex items-center text-sm text-brand-600">
                      <Mail className="h-4 w-4 mr-1" />
                      {user?.email}
                    </div>
                  </div>
                </div>
                
                {userProfile?.role && (
                  <div className="flex items-center space-x-2 p-3 bg-purple-50 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm font-medium text-purple-700">Role</p>
                      <p className="text-purple-800 capitalize">{userProfile.role}</p>
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button variant="outline" className="w-full border-brand-300 text-brand-600 hover:bg-brand-50">
                    Edit Profile
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Advertisement Card */}
            <Card className="bg-gradient-to-br from-brand-500 to-brand-600 border-white/20 shadow-xl text-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-300" />
                  Upgrade Your Experience
                </CardTitle>
                <CardDescription className="text-brand-100">
                  Unlock premium features and boost your productivity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <span className="text-sm">Advanced contract templates</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <span className="text-sm">Priority customer support</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <span className="text-sm">Enhanced analytics & reporting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-300" />
                    <span className="text-sm">Unlimited storage</span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button className="w-full bg-white text-brand-600 hover:bg-gray-100 font-semibold">
                    Upgrade Now - $29/month
                  </Button>
                  <p className="text-xs text-brand-100 text-center mt-2">
                    30-day money-back guarantee
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Information */}
          <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-brand-800">System Information</CardTitle>
              <CardDescription className="text-brand-600">
                Application status and version details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">Online</div>
                  <p className="text-sm text-green-700">System Status</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">v2.1.0</div>
                  <p className="text-sm text-blue-700">Current Version</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">99.9%</div>
                  <p className="text-sm text-purple-700">Uptime</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default System;
