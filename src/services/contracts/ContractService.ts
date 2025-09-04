// Centralized contract service for all contract operations
import { supabase } from "@/integrations/supabase/client";
import type { 
  Contract, 
  ContractTemplate, 
  ContractSignature, 
  ContractRecipient,
  ContractFormData,
  ContractFilters,
  ContractStats,
  ContractApiResponse 
} from "@/types/contracts";

export class ContractService {
  // Contract CRUD operations
  static async getContract(id: string): Promise<Contract | null> {
    try {
      // Try contracts_v2 first, fallback to contracts
      let { data, error } = await supabase
        .from('contracts_v2')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Try fallback table
        const fallback = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .single();
        
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      return data as Contract;
    } catch (error) {
      console.error('ContractService.getContract error:', error);
      return null;
    }
  }

  static async getContracts(filters?: ContractFilters): Promise<Contract[]> {
    try {
      let query = supabase.from('contracts_v2').select('*');

      // Apply filters
      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }
      if (filters?.type?.length) {
        query = query.in('contract_type', filters.type);
      }
      if (filters?.created_by) {
        query = query.eq('created_by', filters.created_by);
      }
      if (filters?.date_range) {
        query = query
          .gte('created_at', filters.date_range.start)
          .lte('created_at', filters.date_range.end);
      }
      if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Contract[];
    } catch (error) {
      console.error('ContractService.getContracts error:', error);
      return [];
    }
  }

  static async createContract(contractData: ContractFormData): Promise<Contract | null> {
    try {
      const { data, error } = await supabase
        .from('contracts_v2')
        .insert({
          title: contractData.title,
          content: contractData.content,
          contract_type: contractData.contract_type,
          due_date: contractData.due_date,
          metadata: contractData.metadata,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      // Create recipients if provided
      if (contractData.recipients?.length) {
        await this.addRecipients(data.id, contractData.recipients);
      }

      return data as Contract;
    } catch (error) {
      console.error('ContractService.createContract error:', error);
      return null;
    }
  }

  static async updateContract(id: string, updates: Partial<Contract>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contracts_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('ContractService.updateContract error:', error);
      return false;
    }
  }

  static async deleteContract(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contracts_v2')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('ContractService.deleteContract error:', error);
      return false;
    }
  }

  // Template operations
  static async getTemplates(): Promise<ContractTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      
      // Map DB fields to interface
      return data.map(template => ({
        ...template,
        content: template.template_content,
        category: template.contract_type as any
      })) as ContractTemplate[];
    } catch (error) {
      console.error('ContractService.getTemplates error:', error);
      return [];
    }
  }

  static async createTemplate(templateData: Omit<ContractTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<ContractTemplate | null> {
    try {
      const { data, error } = await supabase
        .from('contract_templates')
        .insert({
          name: templateData.name,
          template_content: templateData.content,
          contract_type: templateData.category,
          header_image_url: templateData.header_image_url,
          is_active: templateData.is_active
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...data,
        content: data.template_content,
        category: data.contract_type as any
      } as ContractTemplate;
    } catch (error) {
      console.error('ContractService.createTemplate error:', error);
      return null;
    }
  }

  // Signature operations
  static async getSignature(contractId: string, signerEmail?: string): Promise<ContractSignature | null> {
    try {
      let query = supabase
        .from('contract_signatures_v2')
        .select('*')
        .eq('contract_id', contractId);

      if (signerEmail) {
        query = query.eq('signer_email', signerEmail);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      return data as ContractSignature;
    } catch (error) {
      console.error('ContractService.getSignature error:', error);
      return null;
    }
  }

  static async createSignature(signatureData: Omit<ContractSignature, 'id' | 'created_at' | 'updated_at'>): Promise<ContractSignature | null> {
    try {
      const { data, error } = await supabase
        .from('contract_signatures_v2')
        .insert(signatureData)
        .select()
        .single();

      if (error) throw error;
      return data as ContractSignature;
    } catch (error) {
      console.error('ContractService.createSignature error:', error);
      return null;
    }
  }

  static async updateSignature(id: string, updates: Partial<ContractSignature>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contract_signatures_v2')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('ContractService.updateSignature error:', error);
      return false;
    }
  }

  // Recipient operations
  static async addRecipients(contractId: string, recipients: Omit<ContractRecipient, 'id' | 'contract_id' | 'status'>[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('contract_recipients_v2')
        .insert(
          recipients.map(recipient => ({
            ...recipient,
            contract_id: contractId,
            status: 'pending'
          }))
        );

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('ContractService.addRecipients error:', error);
      return false;
    }
  }

  static async getRecipients(contractId: string): Promise<ContractRecipient[]> {
    try {
      const { data, error } = await supabase
        .from('contract_recipients_v2')
        .select('*')
        .eq('contract_id', contractId);

      if (error) throw error;
      return data as ContractRecipient[];
    } catch (error) {
      console.error('ContractService.getRecipients error:', error);
      return [];
    }
  }

  // Statistics
  static async getStats(userId?: string): Promise<ContractStats> {
    try {
      let query = supabase.from('contracts_v2').select('status');
      
      if (userId) {
        query = query.eq('created_by', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const stats: ContractStats = {
        total: data.length,
        draft: 0,
        sent: 0,
        signed: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0
      };

      data.forEach(contract => {
        if (contract.status in stats) {
          stats[contract.status as keyof ContractStats]++;
        }
      });

      return stats;
    } catch (error) {
      console.error('ContractService.getStats error:', error);
      return {
        total: 0,
        draft: 0,
        sent: 0,
        signed: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0
      };
    }
  }

  // Communication operations
  static async sendContract(contractId: string, recipientEmails: string[]): Promise<ContractApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('send-contract-email', {
        body: {
          contractId,
          recipientEmails
        }
      });

      if (error) throw error;

      // Update contract status
      await this.updateContract(contractId, { status: 'sent' });

      return { success: true, data };
    } catch (error) {
      console.error('ContractService.sendContract error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send contract' 
      };
    }
  }

  static async sendReminder(contractId: string): Promise<ContractApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('send-contract-reminder', {
        body: { contractId }
      });

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('ContractService.sendReminder error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send reminder' 
      };
    }
  }

  // Utility methods
  static async duplicateContract(id: string): Promise<Contract | null> {
    try {
      const original = await this.getContract(id);
      if (!original) return null;

      const duplicate = await this.createContract({
        title: `Copy of ${original.title}`,
        content: original.content,
        contract_type: original.contract_type || 'general',
        metadata: original.metadata,
        recipients: []
      });

      return duplicate;
    } catch (error) {
      console.error('ContractService.duplicateContract error:', error);
      return null;
    }
  }

  static generateContractFromTemplate(template: ContractTemplate, variables?: Record<string, any>): Partial<Contract> {
    let content = template.content;

    // Replace template variables
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, String(value));
      });
    }

    return {
      title: template.name,
      content,
      contract_type: template.category,
      template_id: template.id,
      status: 'draft'
    };
  }
}