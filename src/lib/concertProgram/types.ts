// Block model for concert programs. `blocks` (gw_concert_programs.blocks)
// stores STRUCTURE + ORDER only; pieces and roster rows stay relational
// and are referenced by id. Spec: 2026-08-17-concert-program-rebuild-design.md.

export type PrintDesign = 'classic-1943' | 'modern-clean' | 'formal';
export type ProgramFormat = 'letter-portrait' | 'half-fold';

export interface TitleBlock { id: string; kind: 'title'; showLogo: boolean; showOrgName: boolean }
export interface PieceGroupBlock {
  id: string;
  kind: 'piece-group';
  sectionHeading: string | null;
  pieceIds: string[];            // ordered refs into gw_concert_program_pieces
  creditLine: string | null;     // centered under the group (1943 pattern)
}
export interface DividerBlock { id: string; kind: 'divider' }
export interface TextBlock { id: string; kind: 'text'; text: string; align: 'center' | 'left' }
export interface RosterBlock { id: string; kind: 'roster' }
export interface FooterBlock { id: string; kind: 'footer'; showQr?: boolean }

export type ProgramBlock =
  | TitleBlock | PieceGroupBlock | DividerBlock | TextBlock | RosterBlock | FooterBlock;

export const PRINT_DESIGNS: Array<{ value: PrintDesign; label: string; sub: string }> = [
  { value: 'classic-1943', label: 'Classic 1943', sub: 'Baskerville, dot leaders, centered' },
  { value: 'modern-clean', label: 'Modern Clean', sub: 'Montserrat, left-aligned, thin rules' },
  { value: 'formal',       label: 'Formal',       sub: 'Cormorant & Cinzel, generous leading' },
];

export function newBlockId(): string {
  return crypto.randomUUID();
}
