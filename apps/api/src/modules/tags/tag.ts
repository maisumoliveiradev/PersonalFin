export const TAG_NAME_MAX_LENGTH = 40;
export const MAX_TAGS_PER_TRANSACTION = 10;

export interface Tag {
  id: string;
  financialSpaceId: string;
  name: string;
  archivedAt: Date | null;
  version: number;
}

export type NewTag = Omit<Tag, 'archivedAt' | 'version'> & { createdByUserId: string };

export function normalizeTagName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}
