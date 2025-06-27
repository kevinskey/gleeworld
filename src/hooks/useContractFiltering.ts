
import { useState, useMemo } from "react";
import type { Contract } from "@/hooks/useContracts";

export const useContractFiltering = (contracts: Contract[]) => {
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterByTemplate, setFilterByTemplate] = useState<string>('');
  const [filterByType, setFilterByType] = useState<string>('');
  const [filterByDate, setFilterByDate] = useState<string>('');

  // Extract unique templates and types from contracts
  const availableTemplates = useMemo(() => {
    const templates = contracts
      .map(contract => contract.title)
      .filter((title, index, arr) => arr.indexOf(title) === index)
      .sort();
    return templates;
  }, [contracts]);

  const availableTypes = useMemo(() => {
    const types = contracts
      .map(contract => contract.status)
      .filter((status, index, arr) => arr.indexOf(status) === index)
      .sort();
    return types;
  }, [contracts]);

  // Apply filters and sorting
  const filteredAndSortedContracts = useMemo(() => {
    let filtered = [...contracts];

    // Apply filters
    if (filterByTemplate) {
      filtered = filtered.filter(contract => 
        contract.title.toLowerCase().includes(filterByTemplate.toLowerCase())
      );
    }

    if (filterByType) {
      filtered = filtered.filter(contract => contract.status === filterByType);
    }

    if (filterByDate) {
      const filterDate = new Date(filterByDate);
      filtered = filtered.filter(contract => {
        const contractDate = new Date(contract.created_at);
        return contractDate.toDateString() === filterDate.toDateString();
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [contracts, sortBy, sortOrder, filterByTemplate, filterByType, filterByDate]);

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
  };

  const handleFilterChange = (filters: {
    template: string;
    type: string;
    date: string;
  }) => {
    setFilterByTemplate(filters.template);
    setFilterByType(filters.type);
    setFilterByDate(filters.date);
  };

  return {
    filteredAndSortedContracts,
    sortBy,
    sortOrder,
    filterByTemplate,
    filterByType,
    filterByDate,
    availableTemplates,
    availableTypes,
    handleSortChange,
    handleFilterChange
  };
};
