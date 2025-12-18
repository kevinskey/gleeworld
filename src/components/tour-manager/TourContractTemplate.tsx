import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, Calendar, DollarSign, Building, 
  Clock, Phone, Mail, Loader2, Eye, Download, Copy, Check,
  Music, Utensils, Hotel
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TourContractVariables {
  HOST_NAME: string;
  HOST_LOCATION: string;
  HOST_CONTACT_NAME: string;
  HOST_CONTACT_EMAIL: string;
  HOST_CONTACT_PHONE: string;
  HOST_SIGNATORY_NAME: string;
  HOST_SIGNATORY_TITLE: string;
  HOST_DEPARTMENT: string;
  PERFORMANCE_DATE: string;
  START_TIME: string;
  END_TIME: string;
  VENUE_NAME: string;
  VENUE_ADDRESS: string;
  HONORARIUM_AMOUNT: string;
  DEPOSIT_AMOUNT: string;
  PERFORMER_COUNT: string;
  ROOM_COUNT: string;
  DIRECTOR_ROOMS: string;
  SOUND_CHECK_HOURS: string;
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
  START_TIME: '4:00 PM',
  END_TIME: '5:30 PM',
  VENUE_NAME: '',
  VENUE_ADDRESS: '',
  HONORARIUM_AMOUNT: '5000.00',
  DEPOSIT_AMOUNT: '2500.00',
  PERFORMER_COUNT: '44',
  ROOM_COUNT: '11',
  DIRECTOR_ROOMS: '3',
  SOUND_CHECK_HOURS: '3',
  SPECIAL_NOTES: ''
};

interface TourContractTemplateProps {
  initialData?: {
    host_name?: string;
    host_location?: string;
    host_signatory_name?: string;
    host_signatory_title?: string;
    host_department?: string;
    venue_name?: string;
    venue_address?: string;
    venue_contact?: string;
    venue_email?: string;
    venue_phone?: string;
    honorarium_amount?: number;
    deposit_amount?: number;
    start_date?: string;
    title?: string;
    location?: string;
  };
}

export const TourContractTemplate = ({ initialData }: TourContractTemplateProps) => {
  const [variables, setVariables] = useState<TourContractVariables>(() => {
    if (initialData) {
      const startDate = initialData.start_date ? new Date(initialData.start_date) : null;
      return {
        ...DEFAULT_VARIABLES,
        HOST_NAME: initialData.host_name || '',
        HOST_LOCATION: initialData.host_location || initialData.location || '',
        HOST_CONTACT_NAME: initialData.venue_contact || '',
        HOST_CONTACT_EMAIL: initialData.venue_email || '',
        HOST_CONTACT_PHONE: initialData.venue_phone || '',
        HOST_SIGNATORY_NAME: initialData.host_signatory_name || '',
        HOST_SIGNATORY_TITLE: initialData.host_signatory_title || '',
        HOST_DEPARTMENT: initialData.host_department || '',
        PERFORMANCE_DATE: startDate ? startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '',
        START_TIME: startDate ? startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '4:00 PM',
        VENUE_NAME: initialData.venue_name || '',
        VENUE_ADDRESS: initialData.venue_address || '',
        HONORARIUM_AMOUNT: initialData.honorarium_amount?.toLocaleString() || '5,000',
        DEPOSIT_AMOUNT: initialData.deposit_amount?.toLocaleString() || '2,500',
      };
    }
    return DEFAULT_VARIABLES;
  });
  const [activeTab, setActiveTab] = useState('form');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleVariableChange = (key: keyof TourContractVariables, value: string) => {
    setVariables(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'HONORARIUM_AMOUNT') {
        const honorarium = parseFloat(value.replace(/,/g, '')) || 0;
        updated.DEPOSIT_AMOUNT = (honorarium / 2).toLocaleString();
      }
      return updated;
    });
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount.replace(/,/g, '')) || 0;
    return num.toLocaleString();
  };

  const generatePlainTextContract = () => {
    const v = variables;
    return `
THE SPELMAN COLLEGE GLEE CLUB PERFORMANCE AGREEMENT

This Agreement (the "Agreement") is entered into by and between Spelman College, with its principal offices in Atlanta, Georgia (herein and after referred to as "the College") and ${v.HOST_NAME || '[HOST NAME]'}, which is located in ${v.HOST_LOCATION || '[HOST LOCATION]'} (herein and after referred to as "the Host").

Whereas the College has agreed to perform musical presentations and whereas the Host is ready, willing and able to support the efforts that are herein set forth.

ARTICLE 1. STATEMENT OF PERFORMANCE

The Spelman College Glee Club shall perform for a period of time as established by the Host and referenced herein. The date of the performance shall be on ${v.PERFORMANCE_DATE || '[DATE]'}, beginning at ${v.START_TIME || '[START TIME]'} and ending at ${v.END_TIME || '[END TIME]'}. The performance shall be held at ${v.VENUE_NAME || '[VENUE NAME]'}, located at ${v.VENUE_ADDRESS || '[VENUE ADDRESS]'}.

ARTICLE 2. HONORARIUM AND ACCOMMODATIONS

This Agreement is to be signed and returned within fifteen (15) business days of receipt. The College will receive an honorarium in the sum of ${v.HONORARIUM_AMOUNT || '[AMOUNT]'} dollars ($${formatCurrency(v.HONORARIUM_AMOUNT)} USD) from the Host for this performance.

A deposit of one half (1/2) of the honorarium, ${v.DEPOSIT_AMOUNT || '[DEPOSIT]'} dollars ($${formatCurrency(v.DEPOSIT_AMOUNT)} USD), is required to execute this Agreement, and is due within fifteen (15) business days of the date that the College stamps this document as received.

The final payment of $${formatCurrency(v.DEPOSIT_AMOUNT)} USD is due the day of the performance and should be given to the Director of the Glee Club immediately following the performance.

VENUE
The Host is responsible for identifying and securing the venue and covering any associated expenses. Spelman College reserves the right to recommend or decline a given performance venue and should be notified of the venue being considered prior to any costs being incurred.

POST-PERFORMANCE MEAL
Following the concert, the Host shall provide a well-balanced meal for the Glee Club's ${v.PERFORMER_COUNT || '44'} members, the Director, and the accompanist.

OVERNIGHT ACCOMMODATIONS
In the event that it is required, the Host shall provide one night of hotel accommodations to include:
• ${v.ROOM_COUNT || '11'} rooms with two queen-sized beds
• ${v.DIRECTOR_ROOMS || '3'} additional rooms for the Director, accompanist, & bus driver

ARTICLE 3. EQUIPMENT AND STAGING

The Host shall provide standing risers to accommodate ${v.PERFORMER_COUNT || '44'} performers and a well-tuned piano. Additional information regarding sound needs will be shared by the Glee Club Stage Manager at least fourteen (14) days prior to the performance.

ARTICLE 4. PUBLICITY

The Host agrees that all advertising and publicity related to the event, and containing any reference or mention of the Spelman College Name and/or Logo, shall be approved by the College prior to public release.

ARTICLE 5. INSURANCE

The Host must ensure that the Venue provides proof of adequate insurance to cover the cost of any incident, injury, or any related concern of this matter. The Hosting Venue must have, or procure and maintain, Commercial General Liability Insurance covering the Facilities and all of the activities of the Host with combined single limits of not less than One Million Dollars ($1,000,000) per occurrence/Two Million Dollars ($2,000,000) in the aggregate for death, bodily injury, or property damage.

ARTICLE 6. TERMINATION AND FORCE MAJEURE

The College or the Host, by written notice, may terminate this contract no less than thirty (30) days prior to the event described herein. If the concert is prevented by an Event of Force Majeure (acts of nature, war, rebellion, contamination, riot, acts or threats of terrorism) the event will be rescheduled at a mutually convenient time for both the Host and the College.

ARTICLE 7. STATE OF THE LAW

This agreement shall be construed, and performance and ownership shall be determined in accordance with the laws of the State of Georgia.

ARTICLE 8. ASSIGNMENT

This contract shall adhere to the benefit of and shall be binding upon the respective successors and assigns of the parties hereto. The contract may not be voluntarily assigned in whole or in part by either party without the prior written consent of the other.

${v.SPECIAL_NOTES ? `SPECIAL NOTES:\n${v.SPECIAL_NOTES}\n\n` : ''}
SIGNATURES

SPELMAN COLLEGE
_________________________
Kevin Johnson, D.M.A.
Director, Spelman College Glee Club

THE HOST: ${v.HOST_NAME || '[HOST NAME]'}
_________________________
${v.HOST_SIGNATORY_NAME || '[SIGNATORY NAME]'}
${v.HOST_SIGNATORY_TITLE || '[TITLE]'}
${v.HOST_DEPARTMENT || '[DEPARTMENT]'}

Date: _______________

---

EXHIBIT A - VENUE REQUIREMENTS

On the day of the performance, the Host will provide the following for the Spelman College Glee Club:
• A dressing room that can accommodate ${v.PERFORMER_COUNT || '44'} performers and safe keeping for their belongings.
• A separate dressing room for the Director of the Glee Club and a separate dressing room for the Accompanist.
• Bottled water at room-temperature and in the warm-up area.
• Sound Check in the actual performance space is required approximately ${v.SOUND_CHECK_HOURS || '3'} hours prior to the concert start time.
• Support in carrying equipment to and from the tour bus.

EXHIBIT B - DINNER REQUIREMENTS

Dinner options should include: protein options (chicken/extra lean beef, fish, beans/tofu), fresh vegetables/salad, a whole grain, pasta, or potato, a vegetarian and vegan option. The Host will be notified of specific food allergies, restrictions, or requests within thirty (30) days prior to the performance.

EXHIBIT C - OVERNIGHT ACCOMMODATIONS

The College must approve all lodging prior to the Host incurring any cost. Lodging provided through the following organizations is preferred by the College: Hilton, Marriott, and Embassy Suites.

Note: All documentation and deposits can be mailed to Spelman College, Department of Music, 350 Spelman Lane, SW, Campus Box 979, Atlanta, Georgia, 30314-4399. All payments should be given in the form of a check, cashier's check, or money order made payable to the Spelman College Glee Club.
    `.trim();
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

      const contractContent = generatePlainTextContract();
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
    navigator.clipboard.writeText(generatePlainTextContract());
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Contract copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadContract = () => {
    const content = generatePlainTextContract();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Spelman-Glee-Club-Contract-${variables.HOST_NAME || 'draft'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const v = variables;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Tour Performance Agreement
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Official Spelman College Glee Club contract format
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
                  value={v.HOST_NAME}
                  onChange={(e) => handleVariableChange('HOST_NAME', e.target.value)}
                  placeholder="e.g., Huntsville Area Chapter of the NAASC"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-location">Location (City, State) *</Label>
                <Input
                  id="host-location"
                  value={v.HOST_LOCATION}
                  onChange={(e) => handleVariableChange('HOST_LOCATION', e.target.value)}
                  placeholder="e.g., Huntsville, Alabama"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatory-name">Signatory Name</Label>
                <Input
                  id="signatory-name"
                  value={v.HOST_SIGNATORY_NAME}
                  onChange={(e) => handleVariableChange('HOST_SIGNATORY_NAME', e.target.value)}
                  placeholder="Person who will sign the contract"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signatory-title">Signatory Title</Label>
                <Input
                  id="signatory-title"
                  value={v.HOST_SIGNATORY_TITLE}
                  onChange={(e) => handleVariableChange('HOST_SIGNATORY_TITLE', e.target.value)}
                  placeholder="e.g., Chapter President"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={v.HOST_DEPARTMENT}
                  onChange={(e) => handleVariableChange('HOST_DEPARTMENT', e.target.value)}
                  placeholder="e.g., Special Events"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Name</Label>
                <Input
                  id="contact-name"
                  value={v.HOST_CONTACT_NAME}
                  onChange={(e) => handleVariableChange('HOST_CONTACT_NAME', e.target.value)}
                  placeholder="Primary contact person"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-email">Contact Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={v.HOST_CONTACT_EMAIL}
                  onChange={(e) => handleVariableChange('HOST_CONTACT_EMAIL', e.target.value)}
                  placeholder="contact@organization.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact-phone">Contact Phone</Label>
                <Input
                  id="contact-phone"
                  value={v.HOST_CONTACT_PHONE}
                  onChange={(e) => handleVariableChange('HOST_CONTACT_PHONE', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </CardContent>
          </Card>

          {/* Performance Details */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Music className="h-5 w-5 text-purple-500" />
                Article 1: Performance Details
              </CardTitle>
              <CardDescription>Date, time, and venue information</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="performance-date">Performance Date *</Label>
                <Input
                  id="performance-date"
                  value={v.PERFORMANCE_DATE}
                  onChange={(e) => handleVariableChange('PERFORMANCE_DATE', e.target.value)}
                  placeholder="e.g., March 7th, 2025"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-time">Start Time *</Label>
                <Input
                  id="start-time"
                  value={v.START_TIME}
                  onChange={(e) => handleVariableChange('START_TIME', e.target.value)}
                  placeholder="e.g., 4:00 PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time">End Time *</Label>
                <Input
                  id="end-time"
                  value={v.END_TIME}
                  onChange={(e) => handleVariableChange('END_TIME', e.target.value)}
                  placeholder="e.g., 5:30 PM"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="venue-name">Venue Name *</Label>
                <Input
                  id="venue-name"
                  value={v.VENUE_NAME}
                  onChange={(e) => handleVariableChange('VENUE_NAME', e.target.value)}
                  placeholder="e.g., Church Street Cumberland Presbyterian Church"
                />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="venue-address">Venue Address *</Label>
                <Input
                  id="venue-address"
                  value={v.VENUE_ADDRESS}
                  onChange={(e) => handleVariableChange('VENUE_ADDRESS', e.target.value)}
                  placeholder="e.g., 228 Church Street NW, Huntsville, AL 35801"
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial Terms */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Article 2: Financial Terms
              </CardTitle>
              <CardDescription>Honorarium and payment details</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="honorarium">Honorarium Amount (USD) *</Label>
                <Input
                  id="honorarium"
                  value={v.HONORARIUM_AMOUNT}
                  onChange={(e) => handleVariableChange('HONORARIUM_AMOUNT', e.target.value)}
                  placeholder="e.g., 5,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit">Deposit Amount (50% - Auto-calculated)</Label>
                <Input
                  id="deposit"
                  value={v.DEPOSIT_AMOUNT}
                  readOnly
                  className="bg-muted"
                />
              </div>
            </CardContent>
          </Card>

          {/* Accommodations */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Hotel className="h-5 w-5 text-orange-500" />
                Accommodations
              </CardTitle>
              <CardDescription>Hotel and meal requirements</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="performer-count">Number of Performers</Label>
                <Input
                  id="performer-count"
                  type="number"
                  value={v.PERFORMER_COUNT}
                  onChange={(e) => handleVariableChange('PERFORMER_COUNT', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room-count">Rooms (2 queen beds)</Label>
                <Input
                  id="room-count"
                  type="number"
                  value={v.ROOM_COUNT}
                  onChange={(e) => handleVariableChange('ROOM_COUNT', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="director-rooms">Director/Staff Rooms</Label>
                <Input
                  id="director-rooms"
                  type="number"
                  value={v.DIRECTOR_ROOMS}
                  onChange={(e) => handleVariableChange('DIRECTOR_ROOMS', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sound-check">Sound Check (hours before)</Label>
                <Input
                  id="sound-check"
                  type="number"
                  value={v.SOUND_CHECK_HOURS}
                  onChange={(e) => handleVariableChange('SOUND_CHECK_HOURS', e.target.value)}
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
                value={v.SPECIAL_NOTES}
                onChange={(e) => handleVariableChange('SPECIAL_NOTES', e.target.value)}
                placeholder="Add any special requirements, conditions, or notes..."
                rows={4}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="mt-6">
          <Card className="bg-white">
            <CardContent className="p-0">
              <ScrollArea className="h-[700px]">
                {/* Contract Document Preview */}
                <div className="p-8 max-w-4xl mx-auto text-black font-serif">
                  {/* Header */}
                  <div className="text-center mb-8 border-b-2 border-blue-900 pb-6">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <div className="text-3xl font-bold text-blue-900 tracking-wide">Spelman</div>
                      <div className="text-xl text-blue-900">College</div>
                    </div>
                    <p className="text-sm italic text-blue-800">A Choice to Change the World</p>
                  </div>

                  <h1 className="text-xl font-bold text-center mb-6 uppercase tracking-wide">
                    The Spelman College Glee Club Performance Agreement
                  </h1>

                  {/* Introduction */}
                  <p className="mb-6 text-justify leading-relaxed">
                    This Agreement (the "Agreement") is entered into by and between Spelman College, with its principal 
                    offices in Atlanta, Georgia (herein and after referred to as "the College") and{' '}
                    <span className="font-semibold">{v.HOST_NAME || '[HOST NAME]'}</span>, which is located in{' '}
                    <span className="font-semibold">{v.HOST_LOCATION || '[HOST LOCATION]'}</span> (herein and after 
                    referred to as "the Host"). Each of Spelman College and [Host] shall be individually referenced 
                    herein as a "Party", and together, the "Parties". The understanding of the Parties is set forth 
                    in the following paragraphs.
                  </p>

                  <p className="mb-6 text-justify leading-relaxed italic">
                    Whereas the College has agreed to perform musical presentations and whereas the Host is ready, 
                    willing and able to support the efforts that are herein set forth.
                  </p>

                  {/* Article 1 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 1. Statement of Performance</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    The Spelman College Glee Club shall perform for a period of time as established by the Host and 
                    referenced herein. The date of the performance shall be on{' '}
                    <span className="font-semibold">{v.PERFORMANCE_DATE || '[DATE]'}</span>, beginning at{' '}
                    <span className="font-semibold">{v.START_TIME || '[START TIME]'}</span> and ending at{' '}
                    <span className="font-semibold">{v.END_TIME || '[END TIME]'}</span>. The performance shall be 
                    held at <span className="font-semibold">{v.VENUE_NAME || '[VENUE NAME]'}</span>, located at{' '}
                    <span className="font-semibold">{v.VENUE_ADDRESS || '[VENUE ADDRESS]'}</span>.
                  </p>

                  {/* Article 2 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 2. Honorarium and Accommodations</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    This Agreement is to be signed and returned within fifteen (15) business days of receipt. The 
                    College will receive an honorarium in the sum of{' '}
                    <span className="font-semibold">{formatCurrency(v.HONORARIUM_AMOUNT)} dollars 
                    (${formatCurrency(v.HONORARIUM_AMOUNT)} USD)</span> from the Host for this performance.
                  </p>
                  <p className="mb-4 text-justify leading-relaxed">
                    A deposit of one half (1/2) of the honorarium,{' '}
                    <span className="font-semibold">{formatCurrency(v.DEPOSIT_AMOUNT)} dollars 
                    (${formatCurrency(v.DEPOSIT_AMOUNT)} USD)</span>, is required to execute this Agreement, 
                    and is due within fifteen (15) business days of the date that the College stamps this document 
                    as received. Each payment should be made payable to Spelman College in the form of a check, 
                    cashier's check or money order.
                  </p>
                  <p className="mb-4 text-justify leading-relaxed">
                    The final payment of <span className="font-semibold">${formatCurrency(v.DEPOSIT_AMOUNT)} USD</span> is 
                    due the day of the performance and should be given to the Director of the Glee Club immediately 
                    following the performance.
                  </p>

                  <h3 className="font-bold mt-6 mb-2">Venue</h3>
                  <p className="mb-4 text-justify leading-relaxed">
                    The Host is responsible for identifying and securing the venue and covering any associated expenses. 
                    Spelman College reserves the right to recommend or decline a given performance venue and should be 
                    notified of the venue being considered prior to any costs being incurred. A floor plan of the 
                    performance space should be sent to the College at least 30 days prior to the scheduled performance. 
                    Note additional details in Exhibit A.
                  </p>

                  <h3 className="font-bold mt-6 mb-2">Post-Performance Meal</h3>
                  <p className="mb-4 text-justify leading-relaxed">
                    Following the concert, the Host shall provide a well-balanced meal for the Glee Club's{' '}
                    <span className="font-semibold">{v.PERFORMER_COUNT || '44'}</span> members, the Director, 
                    and the accompanist. The menu should be developed based on the guidelines in Exhibit B or as 
                    agreed upon with the Glee Club Director. If the Host chooses not to provide a meal, the Host 
                    must pay for a meal for the Glee Club's {v.PERFORMER_COUNT || '44'} members, Director, and accompanist.
                  </p>

                  <h3 className="font-bold mt-6 mb-2">Overnight Accommodations</h3>
                  <p className="mb-2 text-justify leading-relaxed">
                    In the event that it is required, the Host shall provide one night of hotel accommodations to include:
                  </p>
                  <ul className="list-disc ml-8 mb-4">
                    <li>{v.ROOM_COUNT || '11'} rooms with two queen-sized beds</li>
                    <li>{v.DIRECTOR_ROOMS || '3'} additional rooms for the Director, accompanist, & bus driver</li>
                  </ul>
                  <p className="mb-4 text-justify leading-relaxed">
                    Selected hotels should include safe, secure, and clean, with interior entrances and rooms with 
                    private bathrooms. Selected hotels should also provide breakfast, or the Host should arrange for 
                    breakfast during the Glee Club's stay. Note additional details as outlined in Exhibit C.
                  </p>

                  {/* Article 3 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 3. Equipment and Staging</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    The Host shall provide standing risers to accommodate{' '}
                    <span className="font-semibold">{v.PERFORMER_COUNT || '44'}</span> performers and a well-tuned 
                    piano. Additional information regarding sound needs will be shared by the Glee Club Stage Manager 
                    at least fourteen (14) days prior to the performance.
                  </p>

                  {/* Article 4 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 4. Publicity</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    The Host agrees that all advertising and publicity related to the event, and containing any 
                    reference or mention of the Spelman College Name and/or Logo, shall be approved by the College 
                    prior to public release.
                  </p>

                  {/* Article 5 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 5. Insurance</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    The Host must ensure that the Venue provides proof of adequate insurance to cover the cost of 
                    any incident, injury, or any related concern of this matter. The Hosting Venue must have, or 
                    procure and maintain, Commercial General Liability Insurance covering the Facilities and all 
                    of the activities of the Host (and its agents, contractors, employees, invitees, or subcontractors) 
                    with combined single limits of not less than One Million Dollars ($1,000,000) per occurrence/Two 
                    Million Dollars ($2,000,000) in the aggregate for death, bodily injury, or property damage. 
                    Spelman College shall be named as an additional insured on such policy.
                  </p>

                  {/* Article 6 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 6. Termination and Force Majeure</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    The College or the Host, by written notice, may terminate this contract no less than thirty (30) 
                    days prior to the event described herein. Failure of any party to cancel this Agreement in less 
                    time than the thirty (30) day period specified herein shall result in both parties having 
                    responsibility to carry out the duties delineated herein.
                  </p>
                  <p className="mb-4 text-justify leading-relaxed">
                    If an event occurs beyond the control of the Host and the College, which prevents either party 
                    from complying with any of its obligations under this Agreement, neither the Host nor the College 
                    shall be considered in breach of this Contract. If the concert is prevented by an Event of Force 
                    Majeure (acts of nature, war, rebellion, contamination, riot, acts or threats of terrorism) the 
                    event will be rescheduled at a mutually convenient time for both the Host and the College.
                  </p>

                  {/* Article 7 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 7. State of the Law</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    This agreement shall be construed, and performance and ownership shall be determined in accordance 
                    with the laws of the State of Georgia.
                  </p>

                  {/* Article 8 */}
                  <h2 className="text-lg font-bold mt-8 mb-4">Article 8. Assignment</h2>
                  <p className="mb-4 text-justify leading-relaxed">
                    This contract shall adhere to the benefit of and shall be binding upon the respective successors 
                    and assigns of the parties hereto. The contract may not be voluntarily assigned in whole or in 
                    part by either party without the prior written consent of the other.
                  </p>

                  {/* Special Notes */}
                  {v.SPECIAL_NOTES && (
                    <>
                      <h2 className="text-lg font-bold mt-8 mb-4">Special Notes</h2>
                      <p className="mb-4 text-justify leading-relaxed whitespace-pre-wrap">{v.SPECIAL_NOTES}</p>
                    </>
                  )}

                  {/* Signatures */}
                  <h2 className="text-lg font-bold mt-10 mb-6 text-center">
                    Whereas The Parties Have Caused This Agreement To Be Executed As Follows:
                  </h2>

                  <div className="grid grid-cols-2 gap-8 mt-8">
                    <div>
                      <p className="font-bold mb-4">SPELMAN COLLEGE</p>
                      <div className="border-b border-black w-64 mb-1"></div>
                      <p>Kevin Johnson, D.M.A.</p>
                      <p className="text-sm">Director</p>
                      <p className="text-sm">Spelman College Glee Club</p>
                    </div>
                    <div>
                      <p className="font-bold mb-4">THE HOST</p>
                      <div className="border-b border-black w-64 mb-1"></div>
                      <p>Print: {v.HOST_SIGNATORY_NAME || '_______________'}</p>
                      <p className="text-sm">Title: {v.HOST_SIGNATORY_TITLE || '_______________'}</p>
                      <p className="text-sm">Department: {v.HOST_DEPARTMENT || '_______________'}</p>
                    </div>
                  </div>

                  {/* Exhibits */}
                  <div className="mt-16 pt-8 border-t-2 border-blue-900">
                    <h2 className="text-xl font-bold text-center mb-6">Exhibit A - Venue</h2>
                    <p className="mb-4">On the day of the performance, the Host will provide the following for the Spelman College Glee Club:</p>
                    <ul className="list-disc ml-8 mb-6">
                      <li>A dressing room that can accommodate {v.PERFORMER_COUNT || '44'} performers and safe keeping for their belongings.</li>
                      <li>A separate dressing room for the Director of the Glee Club and a separate dressing room for the Accompanist.</li>
                      <li>Bottled water at room-temperature and in the warm-up area.</li>
                      <li>Sound Check in the actual performance space is required approximately {v.SOUND_CHECK_HOURS || '3'} hours prior to the concert start time.</li>
                      <li>Support in carrying equipment to and from the tour bus.</li>
                    </ul>

                    <h2 className="text-xl font-bold text-center mb-6 mt-8">Exhibit B - Dinner</h2>
                    <p className="mb-6">
                      Dinner options should include: protein options (chicken/extra lean beef, fish, beans/tofu), 
                      fresh vegetables/salad, a whole grain, pasta, or potato, a vegetarian and vegan option. 
                      The Host will be notified of specific food allergies, restrictions, or requests within 
                      thirty (30) days prior to the performance.
                    </p>

                    <h2 className="text-xl font-bold text-center mb-6 mt-8">Exhibit C - Overnight Accommodations</h2>
                    <p className="mb-6">
                      The College must approve all lodging prior to the Host incurring any cost. Lodging provided 
                      through the following organizations is preferred by the College: Hilton, Marriott, and Embassy Suites.
                    </p>

                    <p className="mt-8 text-sm italic">
                      Note: All documentation and deposits can be mailed to Spelman College, Department of Music, 
                      350 Spelman Lane, SW, Campus Box 979, Atlanta, Georgia, 30314-4399. All payments should be 
                      given in the form of a check, cashier's check, or money order made payable to the Spelman 
                      College Glee Club.
                    </p>

                    <p className="text-right text-sm mt-8 text-muted-foreground">Revised 11/2023</p>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
