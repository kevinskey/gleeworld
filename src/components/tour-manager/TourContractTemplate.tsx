import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, MapPin, Calendar, DollarSign, Users, Building, 
  Clock, Phone, Mail, Loader2, Eye, Download, Copy, Check,
  Music, Utensils, Speaker
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TourContractVariables {
  // Host Information
  HOST_NAME: string;
  HOST_LOCATION: string;
  HOST_CONTACT_NAME: string;
  HOST_CONTACT_EMAIL: string;
  HOST_CONTACT_PHONE: string;
  HOST_SIGNATORY_NAME: string;
  HOST_SIGNATORY_TITLE: string;
  HOST_DEPARTMENT: string;
  
  // Performance Details
  PERFORMANCE_DATE: string;
  START_TIME: string;
  END_TIME: string;
  VENUE_NAME: string;
  VENUE_ADDRESS: string;
  
  // Financial Terms
  HONORARIUM_AMOUNT: string;
  DEPOSIT_AMOUNT: string;
  DEPOSIT_DUE_DATE: string;
  
  // Group Details
  PERFORMER_COUNT: string;
  SOUND_CHECK_HOURS: string;
  
  // Equipment
  EQUIPMENT_REQUIREMENTS: string;
  
  // Meal Requirements
  MEAL_REQUIREMENTS: string;
  
  // Special Notes
  SPECIAL_NOTES: string;
}

const DEFAULT_VARIABLES: TourContractVariables = {
  HOST_NAME: '',
  HOST_LOCATION: '',
  HOST_CONTACT_NAME: '',
  HOST_CONTACT_EMAIL: '',
  HOST_CONTACT_PHONE: '',
  HOST_SIGNATORY_NAME: '',
  HOST_SIGNATORY_TITLE: '',
  HOST_DEPARTMENT: '',
  PERFORMANCE_DATE: '',
  START_TIME: '',
  END_TIME: '',
  VENUE_NAME: '',
  VENUE_ADDRESS: '',
  HONORARIUM_AMOUNT: '5000.00',
  DEPOSIT_AMOUNT: '2500.00',
  DEPOSIT_DUE_DATE: '',
  PERFORMER_COUNT: '22',
  SOUND_CHECK_HOURS: '2',
  EQUIPMENT_REQUIREMENTS: `• Standing risers to accommodate performers
• Well-tuned grand piano
• NORD Stage 3, Korg Kronos, Roland RD2000, or comparable stage synthesizer
• Four handheld dynamic microphones
• Five condenser mics: Three for risers, two for African drums
• Mic'd drum set on a rug`,
  MEAL_REQUIREMENTS: `Hot meal options including:
• Protein options (chicken/extra lean beef, fish, beans/tofu)
• Fresh vegetables/salad
• Whole grain, pasta, or potato
• Vegan option available`,
  SPECIAL_NOTES: ''
};

const TOUR_CONTRACT_TEMPLATE = [
  "THE SPELMAN COLLEGE GLEE CLUB",
  "TOUR PERFORMANCE AGREEMENT",
  "",
  "This Agreement (the \"Agreement\") is entered into by and between Spelman College, with its principal offices in Atlanta, Georgia (herein and after referred to as \"the College\") and {{HOST_NAME}}, which is located in {{HOST_LOCATION}} (herein and after referred to as \"the Host\").",
  "",
  "CONTACT INFORMATION",
  "Host Contact: {{HOST_CONTACT_NAME}}",
  "Email: {{HOST_CONTACT_EMAIL}}",
  "Phone: {{HOST_CONTACT_PHONE}}",
  "",
  "ARTICLE 1. PERFORMANCE DETAILS",
  "The Spelman College Glee Club shall perform on {{PERFORMANCE_DATE}}, beginning at {{START_TIME}} and ending at {{END_TIME}}.",
  "",
  "Venue: {{VENUE_NAME}}",
  "Address: {{VENUE_ADDRESS}}",
  "",
  "Number of Performers: {{PERFORMER_COUNT}}",
  "",
  "ARTICLE 2. FINANCIAL TERMS",
  "The Spelman College Glee Club will receive an honorarium of ${{HONORARIUM_AMOUNT}}.",
  "",
  "A deposit of ${{DEPOSIT_AMOUNT}} (50% of honorarium) is due by {{DEPOSIT_DUE_DATE}}.",
  "The remaining balance is due on the day of performance.",
  "",
  "All payments should be made payable to \"Spelman College Glee Club\" via check, cashier's check, money order, or electronic transfer.",
  "",
  "ARTICLE 3. TECHNICAL REQUIREMENTS",
  "Sound Check: {{SOUND_CHECK_HOURS}} hours prior to performance",
  "",
  "Equipment to be provided by Host:",
  "{{EQUIPMENT_REQUIREMENTS}}",
  "",
  "ARTICLE 4. HOSPITALITY",
  "The Host shall provide:",
  "• Dressing room accommodating {{PERFORMER_COUNT}} performers",
  "• Separate dressing rooms for Director and Accompanist",
  "• Bottled water (room temperature) in warm-up area",
  "• Post-performance meal for all performers",
  "",
  "Meal Requirements:",
  "{{MEAL_REQUIREMENTS}}",
  "",
  "ARTICLE 5. PUBLICITY",
  "All advertising containing reference to Spelman College Name and/or Logo shall be approved by the College prior to public release.",
  "",
  "ARTICLE 6. INSURANCE",
  "The Host must provide Commercial General Liability Insurance with combined single limits of not less than $1,000,000 per occurrence/$2,000,000 aggregate. Spelman College shall be named as additional insured. Certificate of Insurance must be received at least 30 days prior to performance.",
  "",
  "ARTICLE 7. CANCELLATION",
  "Either party may terminate this agreement with 30 days written notice. Cancellation by Host requires reimbursement of unrecoverable deposits incurred by the College.",
  "",
  "SPECIAL NOTES:",
  "{{SPECIAL_NOTES}}",
  "",
  "SIGNATURES",
  "",
  "SPELMAN COLLEGE",
  "_________________________",
  "Dawn Alston",
  "Vice President, Business & Financial Affairs",
  "",
  "_________________________",
  "Dr. Kevin Johnson, D.M.A.",
  "Director, Spelman College Glee Club",
  "",
  "HOST: {{HOST_NAME}}",
  "_________________________",
  "{{HOST_SIGNATORY_NAME}}",
  "{{HOST_SIGNATORY_TITLE}}",
  "{{HOST_DEPARTMENT}}",
  "",
  "Date: _______________"
].join("\n");

export const TourContractTemplate = () => {
  const [variables, setVariables] = useState<TourContractVariables>(DEFAULT_VARIABLES);
  const [activeTab, setActiveTab] = useState('form');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleVariableChange = (key: keyof TourContractVariables, value: string) => {
    setVariables(prev => {
      const updated = { ...prev, [key]: value };
      
      // Auto-calculate deposit when honorarium changes
      if (key === 'HONORARIUM_AMOUNT') {
        const honorarium = parseFloat(value) || 0;
        updated.DEPOSIT_AMOUNT = (honorarium / 2).toFixed(2);
      }
      
      return updated;
    });
  };

  const generateContract = () => {
    let content = TOUR_CONTRACT_TEMPLATE;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value || `[${key}]`);
    });
    
    return content;
  };

  const handleSaveContract = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to save contracts",
          variant: "destructive",
        });
        return;
      }

      const contractContent = generateContract();
      const contractTitle = `Tour Contract - ${variables.HOST_NAME || 'New Host'} - ${variables.PERFORMANCE_DATE || 'TBD'}`;

      const { error } = await supabase
        .from('contracts_v2')
        .insert({
          title: contractTitle,
          content: contractContent,
          status: 'draft',
          created_by: user.id,
          is_template: false
        });

      if (error) throw error;

      toast({
        title: "Contract Saved",
        description: "Tour contract has been saved as a draft",
      });
    } catch (error) {
      console.error('Error saving contract:', error);
      toast({
        title: "Error",
        description: "Failed to save contract",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyContract = () => {
    navigator.clipboard.writeText(generateContract());
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Contract copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadContract = () => {
    const content = generateContract();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tour-contract-${variables.HOST_NAME || 'draft'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Tour Contract Template
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Fill in the changeable elements to generate a customized tour contract
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyContract}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadContract}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleSaveContract} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Save Contract
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="form" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Edit Fields
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview Contract
          </TabsTrigger>
        </TabsList>

        <TabsContent value="form" className="space-y-6 mt-6">
          {/* Host Information */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-500" />
                Host Information
              </CardTitle>
              <CardDescription>Organization hosting the performance</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host-name">Host Organization Name *</Label>
                <Input
                  id="host-name"
                  value={variables.HOST_NAME}
                  onChange={(e) => handleVariableChange('HOST_NAME', e.target.value)}
                  placeholder="e.g., Art Farm at Serenbe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-location">Location *</Label>
                <Input
                  id="host-location"
                  value={variables.HOST_LOCATION}
                  onChange={(e) => handleVariableChange('HOST_LOCATION', e.target.value)}
                  placeholder="e.g., Palmetto, GA"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input
                  id="contact-name"
                  value={variables.HOST_CONTACT_NAME}
                  onChange={(e) => handleVariableChange('HOST_CONTACT_NAME', e.target.value)}
                  placeholder="Primary contact person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={variables.HOST_CONTACT_EMAIL}
                  onChange={(e) => handleVariableChange('HOST_CONTACT_EMAIL', e.target.value)}
                  placeholder="contact@organization.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={variables.HOST_CONTACT_PHONE}
                  onChange={(e) => handleVariableChange('HOST_CONTACT_PHONE', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatory-name">Signatory Name</Label>
                <Input
                  id="signatory-name"
                  value={variables.HOST_SIGNATORY_NAME}
                  onChange={(e) => handleVariableChange('HOST_SIGNATORY_NAME', e.target.value)}
                  placeholder="Person who will sign"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatory-title">Signatory Title</Label>
                <Input
                  id="signatory-title"
                  value={variables.HOST_SIGNATORY_TITLE}
                  onChange={(e) => handleVariableChange('HOST_SIGNATORY_TITLE', e.target.value)}
                  placeholder="e.g., Event Director"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={variables.HOST_DEPARTMENT}
                  onChange={(e) => handleVariableChange('HOST_DEPARTMENT', e.target.value)}
                  placeholder="e.g., Special Events"
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Music className="h-5 w-5 text-purple-500" />
                Performance Details
              </CardTitle>
              <CardDescription>Date, time, and venue information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="performance-date">Performance Date *</Label>
                <Input
                  id="performance-date"
                  type="date"
                  value={variables.PERFORMANCE_DATE}
                  onChange={(e) => handleVariableChange('PERFORMANCE_DATE', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time *</Label>
                <Input
                  id="start-time"
                  value={variables.START_TIME}
                  onChange={(e) => handleVariableChange('START_TIME', e.target.value)}
                  placeholder="e.g., 7:30 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time *</Label>
                <Input
                  id="end-time"
                  value={variables.END_TIME}
                  onChange={(e) => handleVariableChange('END_TIME', e.target.value)}
                  placeholder="e.g., 9:30 PM"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="venue-name">Venue Name *</Label>
                <Input
                  id="venue-name"
                  value={variables.VENUE_NAME}
                  onChange={(e) => handleVariableChange('VENUE_NAME', e.target.value)}
                  placeholder="e.g., Concert Hall"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="performer-count">Number of Performers</Label>
                <Input
                  id="performer-count"
                  type="number"
                  value={variables.PERFORMER_COUNT}
                  onChange={(e) => handleVariableChange('PERFORMER_COUNT', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="venue-address">Venue Address *</Label>
                <Textarea
                  id="venue-address"
                  value={variables.VENUE_ADDRESS}
                  onChange={(e) => handleVariableChange('VENUE_ADDRESS', e.target.value)}
                  placeholder="Full venue address"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Financial Terms
              </CardTitle>
              <CardDescription>Honorarium and payment details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="honorarium">Honorarium Amount ($) *</Label>
                <Input
                  id="honorarium"
                  type="number"
                  step="0.01"
                  value={variables.HONORARIUM_AMOUNT}
                  onChange={(e) => handleVariableChange('HONORARIUM_AMOUNT', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">Deposit Amount (50%)</Label>
                <Input
                  id="deposit"
                  value={`$${variables.DEPOSIT_AMOUNT}`}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-due">Deposit Due Date</Label>
                <Input
                  id="deposit-due"
                  type="date"
                  value={variables.DEPOSIT_DUE_DATE}
                  onChange={(e) => handleVariableChange('DEPOSIT_DUE_DATE', e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Technical Requirements */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Speaker className="h-5 w-5 text-orange-500" />
                Technical Requirements
              </CardTitle>
              <CardDescription>Equipment and sound check details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sound-check">Sound Check (hours before performance)</Label>
                <Input
                  id="sound-check"
                  type="number"
                  value={variables.SOUND_CHECK_HOURS}
                  onChange={(e) => handleVariableChange('SOUND_CHECK_HOURS', e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="equipment">Equipment Requirements</Label>
                <Textarea
                  id="equipment"
                  value={variables.EQUIPMENT_REQUIREMENTS}
                  onChange={(e) => handleVariableChange('EQUIPMENT_REQUIREMENTS', e.target.value)}
                  rows={6}
                />
              </div>
            </CardContent>
          </Card>

          {/* Hospitality */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Utensils className="h-5 w-5 text-red-500" />
                Hospitality & Meals
              </CardTitle>
              <CardDescription>Meal and accommodation requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meals">Meal Requirements</Label>
                <Textarea
                  id="meals"
                  value={variables.MEAL_REQUIREMENTS}
                  onChange={(e) => handleVariableChange('MEAL_REQUIREMENTS', e.target.value)}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>

          {/* Special Notes */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Special Notes
              </CardTitle>
              <CardDescription>Any additional terms or conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={variables.SPECIAL_NOTES}
                onChange={(e) => handleVariableChange('SPECIAL_NOTES', e.target.value)}
                placeholder="Add any special requirements, conditions, or notes..."
                rows={4}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Contract Preview
              </CardTitle>
              <CardDescription>
                Review the generated contract with your filled-in values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] border rounded-lg p-6 bg-card">
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                  {generateContract()}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
