
import { useState, useMemo } from "react";

interface AccountingEntry {
  id: string;
  name: string;
  contractTitle: string;
  dateSigned: string;
  stipend: number;
  status: string;
}

export const useAccountingFiltering = (data: AccountingEntry[]) => {
  const [sortBy, setSortBy] = useState<string>('dateSigned');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByStatus, setFilterByStatus] = useState<string>('');
  const [filterByDateRange, setFilterByDateRange] = useState<string>('');
  const [filterByTemplate, setFilterByTemplate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract unique statuses
  const availableStatuses = useMemo(() => {
    const statuses = data
      .map(entry => entry.status)
      .filter((status, index, arr) => arr.indexOf(status) === index)
      .sort();
    return statuses;
  }, [data]);

  // Extract unique templates from contract titles
  const availableTemplates = useMemo(() => {
    const templates = data
      .map(entry => {
        // Extract template name from contract title patterns
        const title = entry.contractTitle;
        // Common patterns: "Template Name - Artist", "Artist - Template Name", "Template Name Contract"
        let templateName = title;
        
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          // If first part looks like a template (contains "Contract", "Agreement", etc.)
          if (parts[0].toLowerCase().includes('contract') || 
              parts[0].toLowerCase().includes('agreement') ||
              parts[0].toLowerCase().includes('performance')) {
            templateName = parts[0];
          } else if (parts[1] && (parts[1].toLowerCase().includes('contract') || 
                     parts[1].toLowerCase().includes('agreement') ||
                     parts[1].toLowerCase().includes('performance'))) {
            templateName = parts[1];
          }
        } else if (title.toLowerCase().includes('contract')) {
          // Extract everything before artist name if possible
          const contractIndex = title.toLowerCase().indexOf('contract');
          templateName = title.substring(0, contractIndex + 8).trim();
        }
        
        return templateName;
      })
      .filter((template, index, arr) => arr.indexOf(template) === index)
      .sort();
    return templates;
  }, [data]);

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

    // Apply template filter
    if (filterByTemplate) {
      filtered = filtered.filter(entry => {
        const title = entry.contractTitle;
        let templateName = title;
        
        if (title.includes(' - ')) {
          const parts = title.split(' - ');
          if (parts[0].toLowerCase().includes('contract') || 
              parts[0].toLowerCase().includes('agreement') ||
              parts[0].toLowerCase().includes('performance')) {
            templateName = parts[0];
          } else if (parts[1] && (parts[1].toLowerCase().includes('contract') || 
                     parts[1].toLowerCase().includes('agreement') ||
                     parts[1].toLowerCase().includes('performance'))) {
            templateName = parts[1];
          }
        } else if (title.toLowerCase().includes('contract')) {
          const contractIndex = title.toLowerCase().indexOf('contract');
          templateName = title.substring(0, contractIndex + 8).trim();
        }
        
        return templateName === filterByTemplate;
      });
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
