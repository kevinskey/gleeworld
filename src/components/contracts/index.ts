// Barrel export for all contract components
export { ContractCard } from './ContractCard';
export { ContractList } from './ContractList';
export { ContractStats } from './ContractStats';
export { ContractFilters } from './ContractFilters';
export { ElectronicSignature } from './ElectronicSignature';
export type { SignatureData } from './ElectronicSignature';

// Re-export types for convenience
export type {
  Contract,
  ContractTemplate,
  ContractSignature,
  ContractRecipient,
  ContractFormData,
  ContractFilters as ContractFiltersType,
  ContractStats as ContractStatsType,
  ContractAction,
  ContractApiResponse
} from '@/types/contracts';