// Enhanced Contract Manager with Testing Suite
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Plus, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  Play, 
  Settings,
  Users,
  Heart,
  PenTool,
  Activity,
  Zap,
  FileCheck
} from 'lucide-react';

// Import existing components
import { ContractList } from '@/components/contracts/ContractList';
import { useContracts } from '@/hooks/contracts/useContracts';
import { useContractTemplates } from '@/hooks/contracts/useContractTemplates';
import { useBucketsOfLove } from '@/hooks/useBucketsOfLove';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

interface EnhancedContractManagerProps {
  user?: {
    id: string;
    email?: string;
    full_name?: string;
    role?: string;
    is_admin?: boolean;
    is_super_admin?: boolean;
  };
}

export const EnhancedContractManager = ({ user }: EnhancedContractManagerProps) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTestingAll, setIsTestingAll] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  // Hooks for all systems
  const { contracts, loading: contractsLoading, error: contractsError, create: createContract } = useContracts();
  const { templates, loading: templatesLoading, error: templatesError, create: createTemplate } = useContractTemplates();
  const { buckets, loading: bucketsLoading, sendBucketOfLove } = useBucketsOfLove();

  // System status
  const systemStatus = {
    contracts: {
      total: contracts.length,
      status: contractsError ? 'error' : contractsLoading ? 'loading' : 'ready',
      health: contracts.length > 0 ? 'healthy' : 'warning'
    },
    templates: {
      total: templates.length,
      status: templatesError ? 'error' : templatesLoading ? 'loading' : 'ready',
      health: templates.length > 0 ? 'healthy' : 'warning'
    },
    buckets: {
      total: buckets.length,
      status: bucketsLoading ? 'loading' : 'ready',
      health: buckets.length > 0 ? 'healthy' : 'good'
    }
  };

  // Test functions
  const testTemplateSystem = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      // Test template creation
      const testTemplate = await createTemplate({
        name: `Test Template ${Date.now()}`,
        content: 'This is a test template created during system testing.',
        template_content: 'This is a test template created during system testing.',
        category: 'general',
        contract_type: 'general',
        is_active: true
      });

      if (testTemplate) {
        return {
          name: 'Template System',
          status: 'passed',
          message: `Template created successfully (ID: ${testTemplate.id})`,
          duration: Date.now() - startTime
        };
      } else {
        throw new Error('Template creation returned null');
      }
    } catch (error) {
      return {
        name: 'Template System',
        status: 'failed',
        message: `Template test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testSignatureSystem = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      // Test contract creation with signature fields
      const testContract = await createContract({
        title: `Test Contract for Signatures ${Date.now()}`,
        content: 'This contract is created to test the signature system functionality.',
        contract_type: 'general',
        recipients: [{
          email: user?.email || 'test@example.com',
          name: user?.full_name || 'Test User',
          role: 'signer'
        }],
        signature_fields: [
          {
            type: 'signature',
            x: 100,
            y: 200,
            width: 200,
            height: 50,
            page: 1,
            required: true,
            label: 'Artist Signature'
          }
        ]
      });

      if (testContract) {
        return {
          name: 'Signature System',
          status: 'passed',
          message: `Contract with signature fields created (ID: ${testContract.id})`,
          duration: Date.now() - startTime
        };
      } else {
        throw new Error('Contract creation returned null');
      }
    } catch (error) {
      return {
        name: 'Signature System',
        status: 'failed',
        message: `Signature test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  };

  const testBucketSystem = async (): Promise<TestResult> => {
    const startTime = Date.now();
    try {
      // Test bucket of love sending - checking if function exists
      if (typeof sendBucketOfLove === 'function') {
        await sendBucketOfLove('This is a test bucket of love sent during system testing.', 'blue', false);
      } else {
        throw new Error('sendBucketOfLove function not available');
      }

      return {
        name: 'Bucket System',
        status: 'passed',
        message: 'Bucket of love sent successfully',
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name: 'Bucket System',
        status: 'failed',
        message: `Bucket test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: Date.now() - startTime
      };
    }
  };

  const runSingleTest = async (testName: string) => {
    const updateTestResult = (result: TestResult) => {
      setTestResults(prev => prev.map(test => 
        test.name === result.name ? result : test
      ));
    };

    // Set test to running
    updateTestResult({ name: testName, status: 'running' });

    let result: TestResult;
    switch (testName) {
      case 'Template System':
        result = await testTemplateSystem();
        break;
      case 'Signature System':
        result = await testSignatureSystem();
        break;
      case 'Bucket System':
        result = await testBucketSystem();
        break;
      default:
        result = { name: testName, status: 'failed', message: 'Unknown test' };
    }

    updateTestResult(result);
  };

  const runAllTests = async () => {
    setIsTestingAll(true);
    setTestProgress(0);
    
    // Initialize test results
    const initialTests: TestResult[] = [
      { name: 'Template System', status: 'pending' },
      { name: 'Signature System', status: 'pending' },
      { name: 'Bucket System', status: 'pending' }
    ];
    setTestResults(initialTests);

    const tests = ['Template System', 'Signature System', 'Bucket System'];
    
    for (let i = 0; i < tests.length; i++) {
      setTestProgress(((i + 1) / tests.length) * 100);
      await runSingleTest(tests[i]);
      
      // Add delay between tests
      if (i < tests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    setIsTestingAll(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running': return <Activity className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <TestTube className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy': return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
      case 'error': return <Badge variant="destructive">Error</Badge>;
      default: return <Badge variant="outline">Good</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-primary/10 via-background to-secondary/10 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              Enhanced Contract Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive contract management with integrated testing suite
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={runAllTests} 
              disabled={isTestingAll}
              className="flex items-center gap-2"
            >
              {isTestingAll ? (
                <Activity className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run All Tests
            </Button>
          </div>
        </div>

        {/* Progress bar for testing */}
        {isTestingAll && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Running system tests...</span>
              <span>{Math.round(testProgress)}%</span>
            </div>
            <Progress value={testProgress} className="h-2" />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Contracts
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="signatures" className="flex items-center gap-2">
            <PenTool className="h-4 w-4" />
            Signatures
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testing
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* System Status Cards */}
            <Card className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Contract System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{systemStatus.contracts.total}</div>
                    <div className="text-sm text-muted-foreground">Total Contracts</div>
                  </div>
                  {getHealthBadge(systemStatus.contracts.health)}
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileCheck className="h-4 w-4 text-green-600" />
                  Template System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{systemStatus.templates.total}</div>
                    <div className="text-sm text-muted-foreground">Templates</div>
                  </div>
                  {getHealthBadge(systemStatus.templates.health)}
                </div>
              </CardContent>
            </Card>

            <Card className="hover-scale">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Heart className="h-4 w-4 text-pink-600" />
                  Bucket System
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{systemStatus.buckets.total}</div>
                    <div className="text-sm text-muted-foreground">Buckets of Love</div>
                  </div>
                  {getHealthBadge(systemStatus.buckets.health)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button variant="outline" className="h-20 flex-col">
                  <Plus className="h-6 w-6 mb-2" />
                  New Contract
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <FileCheck className="h-6 w-6 mb-2" />
                  Create Template
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <PenTool className="h-6 w-6 mb-2" />
                  Sign Document
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Heart className="h-6 w-6 mb-2" />
                  Send Love
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-6">
          <ContractList
            contracts={contracts}
            loading={contractsLoading}
            error={contractsError}
            showStats={true}
            showFilters={true}
            showCreateButton={true}
            title="All Contracts"
            emptyMessage="No contracts found. Create your first contract to get started."
          />
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contract Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Template Management</h3>
                <p className="text-muted-foreground mb-4">
                  Create and manage reusable contract templates
                </p>
                <Button>Create New Template</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Digital Signatures</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Signature Management</h3>
                <p className="text-muted-foreground mb-4">
                  Manage digital signatures and signing workflows
                </p>
                <Button>View Pending Signatures</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                System Testing Suite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {testResults.length === 0 ? (
                <Alert>
                  <TestTube className="h-4 w-4" />
                  <AlertDescription>
                    Run tests to validate system functionality. This will test all three core systems.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {testResults.map((test) => (
                    <div key={test.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(test.status)}
                        <div>
                          <div className="font-medium">{test.name}</div>
                          {test.message && (
                            <div className="text-sm text-muted-foreground">{test.message}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {test.duration && (
                          <span className="text-xs text-muted-foreground">{test.duration}ms</span>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => runSingleTest(test.name)}
                          disabled={test.status === 'running' || isTestingAll}
                        >
                          Test
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};