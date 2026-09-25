export const EXPERIENCE_PROFILES = ['basic', 'intermediate', 'advanced'] as const;

export type ExperienceProfile = (typeof EXPERIENCE_PROFILES)[number];

export const DASHBOARD_SECTIONS = [
  'observedBalance',
  'realized',
  'forecast',
  'projection',
  'projectionSeries',
  'commitments',
  'analytics',
] as const;

export type DashboardSection = (typeof DASHBOARD_SECTIONS)[number];

export const DEFAULT_EXPERIENCE_PROFILE: ExperienceProfile = 'advanced';

const PROFILE_SECTIONS: Record<ExperienceProfile, readonly DashboardSection[]> = {
  basic: ['observedBalance', 'realized'],
  intermediate: ['observedBalance', 'realized', 'forecast', 'projection', 'commitments'],
  advanced: DASHBOARD_SECTIONS,
};

export type SectionOverrides = Partial<Record<DashboardSection, boolean>>;

export function isDashboardSection(value: string): value is DashboardSection {
  return (DASHBOARD_SECTIONS as readonly string[]).includes(value);
}

export function profileShows(profile: ExperienceProfile, section: DashboardSection): boolean {
  return PROFILE_SECTIONS[profile].includes(section);
}

export function resolveDashboardSections(
  profile: ExperienceProfile,
  overrides: SectionOverrides,
): Record<DashboardSection, boolean> {
  const resolved = {} as Record<DashboardSection, boolean>;
  for (const section of DASHBOARD_SECTIONS) {
    resolved[section] = overrides[section] ?? profileShows(profile, section);
  }
  return resolved;
}

export function normalizeOverrides(
  profile: ExperienceProfile,
  overrides: SectionOverrides,
): SectionOverrides {
  const normalized: SectionOverrides = {};
  for (const section of DASHBOARD_SECTIONS) {
    const value = overrides[section];
    if (value !== undefined && value !== profileShows(profile, section)) {
      normalized[section] = value;
    }
  }
  return normalized;
}
