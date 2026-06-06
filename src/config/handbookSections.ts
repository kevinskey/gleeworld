// Handbook sections — tenant-neutral placeholders. Tenants can replace these
// with their own content via the handbook editor in HandbookModule.

export interface HandbookSection {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  orderIndex: number;
  icon: string;
  isVisible: boolean;
  content: string;
}

export const HANDBOOK_SECTIONS: HandbookSection[] = [
  {
    id: 'welcome',
    slug: 'welcome',
    title: 'Welcome',
    shortTitle: 'Welcome',
    orderIndex: 1,
    icon: 'BookOpen',
    isVisible: true,
    content: `Welcome to the program. This handbook is a placeholder — your director can replace it with your own welcome message, mission statement, and program overview from the Handbook editor.`,
  },
  {
    id: 'code-of-conduct',
    slug: 'code-of-conduct',
    title: 'Code of Conduct',
    shortTitle: 'Conduct',
    orderIndex: 2,
    icon: 'Shield',
    isVisible: true,
    content: `Members are expected to act with respect, professionalism, and integrity at all times. Specific expectations (attendance, dress, communication, etc.) can be customized by your program's leadership.`,
  },
];

export function getVisibleHandbookSections(): HandbookSection[] {
  return HANDBOOK_SECTIONS.filter((s) => s.isVisible).sort((a, b) => a.orderIndex - b.orderIndex);
}
