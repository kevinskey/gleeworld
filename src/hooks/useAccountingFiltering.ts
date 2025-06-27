
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

  // Available templates are all active templates from database
  const availableTemplates = useMemo(() => {
    return templates.map(template => ({
      id: template.id,
      name: template.name
    }));
  }, [templates]);

  // Apply filters and sorting
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...data];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(entry => 
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.contractTitle.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filterByStatus) {
      filtered = filtered.filter(entry => entry.status === filterByStatus);
    }

    // Apply template filter - filter by template ID
    if (filterByTemplate) {
      filtered = filtered.filter(entry => entry.templateId === filterByTemplate);
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
