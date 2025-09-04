// Contract utility functions
import type { Contract, ContractTemplate } from '@/types/contracts';

export const contractUtils = {
  // Status helpers
  isEditable: (contract: Contract): boolean => {
    return ['draft'].includes(contract.status);
  },

  isSendable: (contract: Contract): boolean => {
    return ['draft'].includes(contract.status);
  },

  isDeletable: (contract: Contract): boolean => {
    return ['draft', 'cancelled'].includes(contract.status);
  },

  isOverdue: (contract: Contract): boolean => {
    if (!contract.due_date) return false;
    return new Date(contract.due_date) < new Date() && !['completed', 'cancelled'].includes(contract.status);
  },

  // Formatting helpers
  formatStatus: (status: Contract['status']): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  },

  formatType: (type?: Contract['contract_type']): string => {
    if (!type) return 'General';
    return type.charAt(0).toUpperCase() + type.slice(1);
  },

  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  },

  formatDateTime: (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  },

  // Color helpers
  getStatusColor: (status: Contract['status']): string => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-orange-100 text-orange-800',
      signed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.draft;
  },

  getTypeColor: (type?: Contract['contract_type']): string => {
    const colors = {
      performance: 'bg-purple-100 text-purple-800',
      service: 'bg-blue-100 text-blue-800',
      wardrobe: 'bg-pink-100 text-pink-800',
      general: 'bg-gray-100 text-gray-800'
    };
    return colors[type || 'general'];
  },

  // Template helpers
  processTemplate: (template: ContractTemplate, variables: Record<string, any>): string => {
    let content = template.content;
    
    // Replace template variables
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      content = content.replace(regex, String(value));
    });

    // Replace common placeholders
    const currentDate = new Date().toLocaleDateString();
    content = content.replace(/{{current_date}}/g, currentDate);
    content = content.replace(/{{current_year}}/g, new Date().getFullYear().toString());

    return content;
  },

  extractTemplateVariables: (content: string): string[] => {
    const regex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables.filter(v => !['current_date', 'current_year'].includes(v));
  },

  // Validation helpers
  validateContract: (contract: Partial<Contract>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!contract.title?.trim()) {
      errors.push('Title is required');
    }

    if (!contract.content?.trim()) {
      errors.push('Content is required');
    }

    if (contract.due_date && new Date(contract.due_date) < new Date()) {
      errors.push('Due date cannot be in the past');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Search helpers
  searchContracts: (contracts: Contract[], query: string): Contract[] => {
    if (!query.trim()) return contracts;

    const searchTerm = query.toLowerCase();
    return contracts.filter(contract =>
      contract.title.toLowerCase().includes(searchTerm) ||
      contract.content.toLowerCase().includes(searchTerm) ||
      contract.contract_type?.toLowerCase().includes(searchTerm) ||
      contract.status.toLowerCase().includes(searchTerm)
    );
  },

  // Sorting helpers
  sortContracts: (contracts: Contract[], sortBy: 'title' | 'status' | 'created_at' | 'due_date', ascending = true): Contract[] => {
    return [...contracts].sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];

      // Handle dates
      if (sortBy === 'created_at' || sortBy === 'due_date') {
        aVal = new Date(aVal || 0);
        bVal = new Date(bVal || 0);
      }

      // Handle strings
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      let comparison = 0;
      if (aVal > bVal) comparison = 1;
      if (aVal < bVal) comparison = -1;

      return ascending ? comparison : -comparison;
    });
  },

  // Export helpers
  exportToCSV: (contracts: Contract[]): string => {
    const headers = ['Title', 'Status', 'Type', 'Created', 'Due Date'];
    const rows = contracts.map(contract => [
      contract.title,
      contract.status,
      contract.contract_type || 'general',
      contractUtils.formatDate(contract.created_at),
      contract.due_date ? contractUtils.formatDate(contract.due_date) : ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    return csvContent;
  }
};