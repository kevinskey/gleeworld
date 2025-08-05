
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTemplateImageUpload } from "./templates/useTemplateImageUpload";

export interface ContractTemplate {
  id: string;
  name: string;
  template_content: string;
  header_image_url?: string;
  contract_type?: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  is_active: boolean;
}

export const useContractTemplates = () => {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { uploadHeaderImage } = useTemplateImageUpload();

  const createGleeClubTemplate = async () => {
    const gleeClubTemplate = {
      name: "Glee Club Performance Agreement",
      contract_type: "performance",
      template_content: `THE SPELMAN COLLEGE GLEE CLUB
PERFORMANCE AGREEMENT

This Agreement (the "Agreement") is entered into by and between Spelman College, with its principal offices in Atlanta, Georgia (herein and after referred to as "the College") and {{HOST_NAME}}, which is located in {{HOST_LOCATION}} (herein and after referred to as "the Host"). Each of Spelman College and {{HOST_NAME}} shall be individually referenced herein as a "Party", and together, the "Parties". The understanding of the Parties is set forth in the following paragraphs.

Whereas the College has agreed to perform musical presentations and whereas the Host is ready, willing and able to support the efforts that are herein set forth.

Article 1. Statement of Performance
The Spelman College Glee Club shall perform for a period of time as established by the Host and referenced herein. The date of the performance shall be on {{PERFORMANCE_DATE}}, beginning at {{START_TIME}} and ending at {{END_TIME}}. The performance shall be held at {{VENUE_NAME}}, located at {{VENUE_ADDRESS}}.

Article 2. Honorarium and Accommodations
This agreement is to be signed and returned within fifteen (15) business days of receipt.

The Spelman College Glee Club will receive an honorarium of $\{{HONORARIUM_AMOUNT}} in the form of check, cashier's check, money order, or electronic transfer. All payments should be made payable to Spelman College Glee Club in the form of a check, cashier's check, or money order.

The deposit of 50% of the honorarium, $\{{DEPOSIT_AMOUNT}}, is due at contract signing. The remaining 50% is due the day of the performance and should be given to the Director of the Glee Club immediately following the performance.

Venue
The Host is responsible for identifying and securing the venue and covering any associated expenses. Spelman College reserves the right to recommend or decline a given performance venue and should be notified of the venue being considered prior to any costs being incurred. A floor plan of the performance space should be sent to the College at least 30 days prior to the scheduled performance. Note additional details in Exhibit A (Rider).

Post-Performance Meal
Following the concert, the Host shall provide a well-balanced meal for the Glee Club {{PERFORMER_COUNT}} members, the Director, Accompanist, and the Manager. The menu should be developed based on the guidelines in Exhibit B, or as agreed upon with the Glee Club Director. If the Host chooses not to provide a meal, the Host must pay for a meal for the Glee Club's {{PERFORMER_COUNT}} members, Director, Accompanist, and Manager. The amount given for dinner should be based upon the College's per diem policy and rate for the region shown in Exhibit B.

Article 3. Equipment and Staging
The Host shall provide standing risers to accommodate {{PERFORMER_COUNT}} performers, a well-tuned piano, amplifier, and keyboard. Additional information, regarding sound needs, will be shared by the Glee Club Stage Manager at least fourteen (14) days prior to the performance. Reference Exhibit B

Article 4. Publicity
The Host agrees that all advertising and publicity related to the event and containing any reference or mention of the Spelman College Name and/or Logo shall be approved by the College prior to public release.

Article 5. Insurance
The Host must ensure that the Venue provides proof of adequate insurance to cover the cost of any incident, injury or any related concern of this matter. The Hosting Venue must have, or procure and maintain, Commercial General Liability Insurance covering the Facilities and all of the activities of the Host (and its agents, contractors, employees, invitees, or subcontractors) with combined single limits of not less than One Million Dollars ($1,000,000) per occurrence/Two Million Dollars ($2,000,000) in the aggregate for death, bodily injury, or property damage. Such policy shall be on an occurrence basis with an A.M. Best's rating of at least A/IX and that is otherwise approved by the College. Each such policy shall provide that it is primary to all insurance available to the College. The College shall be named as an additional insured on such policy. The insurance company shall not cancel or refuse to renew the policy, or change in any material way the nature or extent of the coverage provided by such policy without first giving the College at least thirty (30) days prior written notice. Insurance must be evidenced by a Certificate of Insurance that shows that the applicable insurance policy complies with all of the terms of the College. All Certificates of Insurance must be received at the College at least thirty (30) days prior to the concert date.

Article 6. Termination and Force Majeure
The College or the Host, by written notice, may terminate this contract no less than thirty (30) days prior to the event described herein. Failure of any party to cancel this Agreement in less time than the thirty (30) day period specified herein shall result in both parties having responsibility to carry out the duties delineated herein.

This Agreement constitutes the sole of the entire agreement between the Parties, in respect to the subject matter contained herein. This Agreement supersedes any prior agreement, offer or proposal between the Parties with respect hereto and may only be amended with the consent of each Party in advance in writing.

If an event occurs beyond the control of the Host and the College, which prevents either party from complying with any of its obligations under this Agreement, neither the Host nor the College shall be considered in breach of this Contract to the extent that performance of their respective obligations (excluding payment obligations) is prevented by an Event of Force Majeure that arises after the effective date of this Agreement. If the concert is prevented by an Event of Force Majeure (acts of nature, war, rebellion, contamination, riot, acts or threats of terrorism) the event will be rescheduled at a mutually convenient time for both the Host and the College.

Article 7. State of the Law
This agreement shall be construed, and performance and ownership shall be determined in accordance with the laws of the State of Georgia.

Article 8. Assignment
This contract shall adhere to the benefit of and shall be binding upon the respective successors and assigns of the parties hereto. The contract may not be voluntarily assigned in whole or in part by either party without the prior written consent of the other.

Article 9. Confidentiality
This Agreement and the contents hereof constitute a confidential business relationship between the Parties. Both Parties agree that they will not reveal the terms of this Agreement to any third party (excluding employees, agents, attorneys, accountants and other professionals, and others to whom they have legal obligation to disclose) without the prior written consent of the other Party and that they will exercise reasonable precautions to ensure that neither they nor any of the foregoing persons shall allow the terms of this Agreement to become public knowledge.

Article 10. Cancellation Reimbursement
In the event that the event is cancelled by the host, {{HOST_NAME}}, the school shall be reimbursed by the {{HOST_NAME}}, for the school's loss of unrecoverable monetary deposits, including but not limited to, pre-paid reservations or pre-paid travel tickets. The school shall be required to present documentation supporting such a claim.

Whereas The Parties Have Caused This Agreement To Be Executed As Follows:

SPELMAN COLLEGE                    HOST
_________________________         ____________________________
{{COLLEGE_SIGNATORY_NAME}}        Print: {{HOST_SIGNATORY_NAME}}
{{COLLEGE_SIGNATORY_TITLE}}       Title: {{HOST_SIGNATORY_TITLE}}
{{COLLEGE_DEPARTMENT}}            Department: {{HOST_DEPARTMENT}}

_________________________         ____________________________
{{DIRECTOR_NAME}}                 Print: {{HOST_CONTACT_NAME}}
Director                          Title: {{HOST_CONTACT_TITLE}}
Spelman College Glee Club         Department: {{HOST_CONTACT_DEPARTMENT}}

Exhibit A
Venue, Green Room, and Stage Equipment

On the day of the performance, the Host will provide the following for the Spelman College Glee Club:

• A dressing room that can accommodate {{PERFORMER_COUNT}} performers and safe keeping for their belongings.
• A separate dressing room for the Director of the Glee Club and a separate dressing room for the Accompanist.
• Bottled water at room-temperature and in the warm-up area. The host may also choose to provide tea, if so, please ensure that the tea is decaffeinated.
• Sound Check in the actual performance space is required approximately {{SOUND_CHECK_HOURS}} hours prior to the concert start time.
• Equipment of stage risers for {{PERFORMER_COUNT}}, well-tuned grand piano.

{{EQUIPMENT_REQUIREMENTS}}

Exhibit B
Dinner

Dinner (hot) options should include: protein options, (chicken/extra lean beef, fish, beans/tofu), fresh vegetables/salad, a whole grain, pasta, or potato, and vegan option. The Host will be notified of specific food allergies, restrictions, or requests within thirty (30) days prior to the performance.

Note: All documentation and deposits can be mailed to Spelman College, Dr. Kevin Johnson Director, Spelman College Glee Club 350 Spelman Lane, SW, Campus Box 312, Atlanta, Georgia, 30314-4399. All payments should be given in the form of a check, cashier's check, or money order, or electronic transfer made payable to the Spelman College Glee Club.`,
      is_active: true
    };

    try {
      // Check if template already exists
      const { data: existingTemplate } = await supabase
        .from('contract_templates')
        .select('id')
        .eq('name', 'Glee Club Performance Agreement')
        .eq('is_active', true)
        .single();

      if (existingTemplate) {
        console.log('Glee Club template already exists');
        return existingTemplate;
      }

      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        return null;
      }

      const { data, error } = await supabase
        .from('contract_templates')
        .insert([{
          ...gleeClubTemplate,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating Glee Club template:', error);
        return null;
      }

      console.log('Glee Club template created successfully');
      return data;
    } catch (error) {
      console.error('Error creating Glee Club template:', error);
      return null;
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      console.log('Fetching templates...');
      
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching templates:', error);
        throw error;
      }
      
      console.log('Templates fetched successfully:', data?.length || 0);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (template: {
    name: string;
    template_content: string;
    header_image?: File | null;
    contract_type: string;
  }) => {
    try {
      console.log('Starting template creation process...');
      
      // Check authentication first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('User not authenticated');
        toast({
          title: "Error",
          description: "You must be logged in to create templates",
          variant: "destructive",
        });
        return null;
      }
      
      console.log('User authenticated:', user.id);
      console.log('Template data:', {
        name: template.name,
        contract_type: template.contract_type,
        content_length: template.template_content.length,
        has_image: !!template.header_image
      });

      // Create the template with the authenticated user's ID
      const { data, error } = await supabase
        .from('contract_templates')
        .insert([{
          name: template.name,
          template_content: template.template_content,
          contract_type: template.contract_type || 'other',
          created_by: user.id,
          is_active: true,
        }])
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        throw error;
      }

      console.log('Template created in database:', data);
      let updatedTemplate = { ...data };
      
      // Upload header image if provided
      if (template.header_image) {
        try {
          console.log('Starting image upload...');
          const header_image_url = await uploadHeaderImage(template.header_image, data.id);
          
          // Update the template with the image URL
          const { error: updateError } = await supabase
            .from('contract_templates')
            .update({ header_image_url })
            .eq('id', data.id);

          if (updateError) {
            console.error('Error updating template with image URL:', updateError);
            throw updateError;
          }
          
          console.log('Template updated with image URL');
          updatedTemplate = { ...updatedTemplate, header_image_url };
        } catch (imageError) {
          console.error('Error uploading header image:', imageError);
          toast({
            title: "Warning",
            description: "Template created but header image upload failed",
            variant: "destructive",
          });
        }
      }

      setTemplates(prev => [updatedTemplate, ...prev]);
      
      console.log('Template creation completed successfully');
      toast({
        title: "Success",
        description: "Template created successfully",
      });
      
      return updatedTemplate;
    } catch (error) {
      console.error('Error creating template:', error);
      
      // Provide more specific error messages
      let errorMessage = "Failed to create template";
      if (error instanceof Error) {
        if (error.message.includes('auth')) {
          errorMessage = "Authentication error. Please try logging out and back in.";
        } else if (error.message.includes('permission')) {
          errorMessage = "Permission denied. Please check your account permissions.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your connection.";
        } else {
          errorMessage = `Failed to create template: ${error.message}`;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      console.log('Deleting template:', id);
      
      const { error } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        console.error('Error deleting template:', error);
        throw error;
      }

      setTemplates(prev => prev.filter(template => template.id !== id));
      console.log('Template deleted successfully');
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    deleteTemplate,
    refetch: fetchTemplates,
    createGleeClubTemplate,
  };
};
