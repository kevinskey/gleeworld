
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AccountingEntry {
  id: string;
  name: string;
  contractTitle: string;
  dateSigned: string;
  stipend: number;
  status: string;
  templateId?: string;
  templateName?: string;
}

interface Template {
  id: string;
  name: string;
}

export const useAccountingFiltering = (data: AccountingEntry[]) => {
  const [sortBy, setSortBy] = useState<string>('dateSigned');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByStatus, setFilterByStatus] = useState<string>('');
  const [filterByDateRange, setFilterByDateRange] = useState<string>('');
  const [filterByTemplate, setFilterByTemplate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [templates, setTemplates] = useState<Template[]>([]);

  // Fetch all active templates for the dropdown
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data: templatesData, error } = await supabase
          .from('contract_templates')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (error) {
          console.error('Error fetching templates:', error);
          return;
        }

        console.log('Fetched templates for filter:', templatesData?.length || 0);
        setTemplates(templatesData || []);
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, []);

  // Extract unique statuses
  const availableStatuses = useMemo(() => {
    const statuses = data
      .map(entry => entry.status)
      .filter((status, index, arr) => arr.indexOf(status) === index)
      .sort();
    return statuses;
  }, [data]);

  // Available templates includes both database templates and contract-derived templates
  const availableTemplates = useMemo(() => {
    // Start with templates from database
    const dbTemplates = templates.map(template => ({
      id: template.id,
      name: template.name
    }));

    // Add a special option for contracts without templates (null template_id)
    const contractsWithoutTemplates = data.filter(entry => !entry.templateId);
    if (contractsWithoutTemplates.length > 0) {
      // Group by common patterns in contract titles to create virtual template categories
      const titlePatterns = new Map<string, number>();
      
      contractsWithoutTemplates.forEach(entry => {
        // Extract potential template name from contract title
        const title = entry.contractTitle.toLowerCase();
        if (title.includes('syracuse') && title.includes('jazz')) {
          titlePatterns.set('Syracuse International Jazz Festival', (titlePatterns.get('Syracuse International Jazz Festival') || 0) + 1);
        } else if (title.includes('festival')) {
          titlePatterns.set('Festival Contracts', (titlePatterns.get('Festival Contracts') || 0) + 1);
        } else {
          titlePatterns.set('Unassigned Contracts', (titlePatterns.get('Unassigned Contracts') || 0) + 1);
        }
      });

      // Add virtual templates for contracts without template associations
      titlePatterns.forEach((count, pattern) => {
        dbTemplates.push({
          id: `virtual_${pattern.toLowerCase().replace(/\s+/g, '_')}`,
          name: `${pattern} (${count} contracts)`
        });
      });
    }

    return dbTemplates;
  }, [templates, data]);

  // Apply filters and sorting
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    console.log('Starting with contracts:', filtered.length);
    console.log('Template filter value:', filterByTemplate);

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contractTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
      console.log('After search filter:', filtered.length);
    }

    // Apply status filter
    if (filterByStatus) {
      filtered = filtered.filter(entry => entry.status === filterByStatus);
      console.log('After status filter:', filtered.length);
    }

    // Apply template filter - handle both real templates and virtual templates
    if (filterByTemplate) {
      console.log('Filtering by template ID:', filterByTemplate);
      
      if (filterByTemplate.startsWith('virtual_')) {
        // Handle virtual template filtering
        const templateType = filterByTemplate.replace('virtual_', '').replace(/_/g, ' ');
        
        filtered = filtered.filter(entry => {
          if (entry.templateId) return false; // Skip contracts that have real templates
          
          const title = entry.contractTitle.toLowerCase();
          if (templateType === 'syracuse international jazz festival') {
            return title.includes('syracuse') && title.includes('jazz');
          } else if (templateType === 'festival contracts') {
            return title.includes('festival') && !(title.includes('syracuse') && title.includes('jazz'));
          } else if (templateType === 'unassigned contracts') {
            return !title.includes('festival');
          }
          return false;
        });
      } else {
        // Handle real template filtering
        filtered = filtered.filter(entry => {
          const matches = entry.templateId === filterByTemplate;
          if (matches) {
            console.log('Contract matches template filter:', entry.contractTitle, 'templateId:', entry.templateId);
          }
          return matches;
        });
      }
      console.log('After template filter:', filtered.length);
    }

    // Apply date range filter
    if (filterByDateRange) {
      const today = new Date();
      const filterDate = new Date(today);
      
      switch (filterByDateRange) {
        case 'last7days':
          filterDate.setDate(today.getDate() - 7);
          break;
        case 'last30days':
          filterDate.setDate(today.getDate() - 30);
          break;
        case 'last90days':
          filterDate.setDate(today.getDate() - 90);
          break;
        default:
          filterDate.setFullYear(1900); // Show all if no valid range
      }
      
      filtered = filtered.filter(entry => {
        const entryDate = new Date(entry.dateSigned);
        return entryDate >= filterDate;
      });
      console.log('After date filter:', filtered.length);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'dateSigned':
          aValue = new Date(a.dateSigned);
          bValue = new Date(b.dateSigned);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'contractTitle':
          aValue = a.contractTitle.toLowerCase();
          bValue = b.contractTitle.toLowerCase();
          break;
        case 'stipend':
          aValue = a.stipend;
          bValue = b.stipend;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = new Date(a.dateSigned);
          bValue = new Date(b.dateSigned);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data, sortBy, sortOrder, filterByStatus, filterByDateRange, filterByTemplate, searchTerm]);

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleFilterChange = (filters: {
    status: string;
    dateRange: string;
    template: string;
    search: string;
  }) => {
    console.log('Filter change - template:', filters.template);
    setFilterByStatus(filters.status);
    setFilterByDateRange(filters.dateRange);
    setFilterByTemplate(filters.template);
    setSearchTerm(filters.search);
  };

  return {
    filteredAndSortedData,
    sortBy,
    sortOrder,
    filterByStatus,
    filterByDateRange,
    filterByTemplate,
    searchTerm,
    availableStatuses,
    availableTemplates,
    handleSortChange,
    handleFilterChange
  };
};
