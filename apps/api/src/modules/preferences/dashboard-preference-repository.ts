import type { ExperienceProfile, SectionOverrides } from '@personalfin/domain';

export interface DashboardPreference {
  profile: ExperienceProfile;
  overrides: SectionOverrides;
}

export interface DashboardPreferenceRepository {
  find(userId: string, financialSpaceId: string): Promise<DashboardPreference | null>;
  save(userId: string, financialSpaceId: string, preference: DashboardPreference): Promise<void>;
}
