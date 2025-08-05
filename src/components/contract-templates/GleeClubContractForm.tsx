import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, MapPin, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GleeClubVariables, replaceTemplateVariables, getDefaultGleeClubVariables, calculateDepositAmount } from '@/utils/contractTemplateVariables';

interface GleeClubContractFormProps {
  template: {
    id: string;
    name: string;
    template_content: string;
    contract_type?: string;
    header_image_url?: string;
  };
  onContractCreated: (contractContent: string, templateName: string, headerImageUrl?: string, contractType?: string) => void;
  onCancel: () => void;
}

export const GleeClubContractForm = ({ template, onContractCreated, onCancel }: GleeClubContractFormProps) => {
  const { toast } = useToast();
  const defaultVariables = getDefaultGleeClubVariables();
  
  const [variables, setVariables] = useState<Partial<GleeClubVariables>>({
    ...defaultVariables,
    HOST_NAME: '',
    HOST_LOCATION: '',
    PERFORMANCE_DATE: '',
    START_TIME: '',
    END_TIME: '',
    VENUE_NAME: '',
    VENUE_ADDRESS: '',
    HOST_SIGNATORY_NAME: '',
    HOST_SIGNATORY_TITLE: '',
    HOST_DEPARTMENT: '',
    HOST_CONTACT_NAME: '',
    HOST_CONTACT_TITLE: '',
    HOST_CONTACT_DEPARTMENT: '',
  });

  const [isCreating, setIsCreating] = useState(false);

  const handleVariableChange = (key: keyof GleeClubVariables, value: string) => {
    setVariables(prev => {
      const updated = { ...prev, [key]: value };
      
      // Auto-calculate deposit amount when honorarium changes
      if (key === 'HONORARIUM_AMOUNT') {
        updated.DEPOSIT_AMOUNT = calculateDepositAmount(value);
      }
      
      return updated;
    });
  };

  const handleCreateContract = async () => {
    // Validate required fields
    const requiredFields = ['HOST_NAME', 'HOST_LOCATION', 'PERFORMANCE_DATE', 'START_TIME', 'END_TIME', 'VENUE_NAME', 'VENUE_ADDRESS'];
    const missingFields = requiredFields.filter(field => !variables[field as keyof GleeClubVariables]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const contractContent = replaceTemplateVariables(template.template_content, variables);
      onContractCreated(contractContent, template.name, template.header_image_url, template.contract_type);
      
      toast({
        title: "Contract Created",
        description: "Glee Club performance agreement has been generated successfully",
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CalendarIcon className="h-5 w-5 mr-2" />
            Glee Club Performance Agreement
          </CardTitle>
          <CardDescription>
            Fill in the details to generate a customized performance agreement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Host Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="h-4 w-4 mr-2" />
              Host Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host-name">Host Organization Name *</Label>
                <Input
                  id="host-name"
                  value={variables.HOST_NAME || ''}
                  onChange={(e) => handleVariableChange('HOST_NAME', e.target.value)}
                  placeholder="e.g., Art Farm at Serenbe"
                />
              </div>
              <div>
                <Label htmlFor="host-location">Host Location *</Label>
                <Input
                  id="host-location"
                  value={variables.HOST_LOCATION || ''}
                  onChange={(e) => handleVariableChange('HOST_LOCATION', e.target.value)}
                  placeholder="e.g., Palmetto, GA"
                />
              </div>
            </div>
          </div>

          {/* Performance Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Performance Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="performance-date">Performance Date *</Label>
                <Input
                  id="performance-date"
                  type="date"
                  value={variables.PERFORMANCE_DATE || ''}
                  onChange={(e) => handleVariableChange('PERFORMANCE_DATE', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="start-time">Start Time *</Label>
                <Input
                  id="start-time"
                  value={variables.START_TIME || ''}
                  onChange={(e) => handleVariableChange('START_TIME', e.target.value)}
                  placeholder="e.g., 7:30 PM"
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time *</Label>
                <Input
                  id="end-time"
                  value={variables.END_TIME || ''}
                  onChange={(e) => handleVariableChange('END_TIME', e.target.value)}
                  placeholder="e.g., 9:30 PM"
                />
              </div>
            </div>
          </div>

          {/* Venue Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Venue Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="venue-name">Venue Name *</Label>
                <Input
                  id="venue-name"
                  value={variables.VENUE_NAME || ''}
                  onChange={(e) => handleVariableChange('VENUE_NAME', e.target.value)}
                  placeholder="e.g., Art Farm at Serenbe"
                />
              </div>
              <div>
                <Label htmlFor="performer-count">Number of Performers</Label>
                <Input
                  id="performer-count"
                  value={variables.PERFORMER_COUNT || ''}
                  onChange={(e) => handleVariableChange('PERFORMER_COUNT', e.target.value)}
                  placeholder="22"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="venue-address">Venue Address *</Label>
              <Textarea
                id="venue-address"
                value={variables.VENUE_ADDRESS || ''}
                onChange={(e) => handleVariableChange('VENUE_ADDRESS', e.target.value)}
                placeholder="e.g., 10455 Atlanta Newnan Rd. Palmetto, GA"
                rows={2}
              />
            </div>
          </div>

          {/* Financial Terms */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Terms
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="honorarium">Honorarium Amount</Label>
                <Input
                  id="honorarium"
                  value={variables.HONORARIUM_AMOUNT || ''}
                  onChange={(e) => handleVariableChange('HONORARIUM_AMOUNT', e.target.value)}
                  placeholder="5000.00"
                />
              </div>
              <div>
                <Label htmlFor="deposit">Deposit Amount (50%)</Label>
                <Input
                  id="deposit"
                  value={variables.DEPOSIT_AMOUNT || ''}
                  onChange={(e) => handleVariableChange('DEPOSIT_AMOUNT', e.target.value)}
                  placeholder="2500.00"
                />
              </div>
            </div>
          </div>

          {/* Host Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Host Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host-signatory">Host Signatory Name</Label>
                <Input
                  id="host-signatory"
                  value={variables.HOST_SIGNATORY_NAME || ''}
                  onChange={(e) => handleVariableChange('HOST_SIGNATORY_NAME', e.target.value)}
                  placeholder="Name of person signing for host"
                />
              </div>
              <div>
                <Label htmlFor="host-title">Host Signatory Title</Label>
                <Input
                  id="host-title"
                  value={variables.HOST_SIGNATORY_TITLE || ''}
                  onChange={(e) => handleVariableChange('HOST_SIGNATORY_TITLE', e.target.value)}
                  placeholder="Title/Position"
                />
              </div>
              <div>
                <Label htmlFor="host-department">Host Department</Label>
                <Input
                  id="host-department"
                  value={variables.HOST_DEPARTMENT || ''}
                  onChange={(e) => handleVariableChange('HOST_DEPARTMENT', e.target.value)}
                  placeholder="Department/Organization"
                />
              </div>
            </div>
          </div>

          {/* Equipment Requirements */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Equipment Requirements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sound-check-hours">Sound Check Hours Before</Label>
                <Input
                  id="sound-check-hours"
                  value={variables.SOUND_CHECK_HOURS || ''}
                  onChange={(e) => handleVariableChange('SOUND_CHECK_HOURS', e.target.value)}
                  placeholder="2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="equipment-requirements">Additional Equipment Requirements</Label>
              <Textarea
                id="equipment-requirements"
                value={variables.EQUIPMENT_REQUIREMENTS || ''}
                onChange={(e) => handleVariableChange('EQUIPMENT_REQUIREMENTS', e.target.value)}
                rows={4}
                placeholder="Specify any additional equipment needs..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleCreateContract} disabled={isCreating}>
              {isCreating ? "Creating Contract..." : "Create Contract"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};