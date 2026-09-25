import type { DashboardPreferences } from '@personalfin/api-contract';
import {
  DASHBOARD_SECTIONS,
  DEFAULT_EXPERIENCE_PROFILE,
  EXPERIENCE_PROFILES,
  normalizeOverrides,
  resolveDashboardSections,
  type SectionOverrides,
} from '@personalfin/domain';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { DataAccess } from '../../database/data-access.ts';
import { requireAuthenticatedUser } from '../../http/authenticate.ts';
import { parseInput } from '../../http/validation.ts';
import { requireAccessibleSpace } from '../financial-spaces/financial-space-access.ts';
import type { DashboardPreference } from './dashboard-preference-repository.ts';

const spaceParamsSchema = z.object({ spaceId: z.string() });
const preferenceSchema = z.strictObject({
  profile: z.enum(EXPERIENCE_PROFILES),
  overrides: z.partialRecord(z.enum(DASHBOARD_SECTIONS), z.boolean()),
});

function toResponse(preference: DashboardPreference, isDefault: boolean): DashboardPreferences {
  return {
    profile: preference.profile,
    overrides: preference.overrides,
    sections: resolveDashboardSections(preference.profile, preference.overrides),
    isDefault,
  };
}

export function registerDashboardPreferenceRoutes(server: FastifyInstance, data: DataAccess): void {
  server.get(
    '/financial-spaces/:spaceId/dashboard-preferences',
    async (request): Promise<DashboardPreferences> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'view',
      );
      const stored = await data.repositories.dashboardPreferences.find(user.id, space.id);
      return stored === null
        ? toResponse({ profile: DEFAULT_EXPERIENCE_PROFILE, overrides: {} }, true)
        : toResponse(stored, false);
    },
  );

  server.put(
    '/financial-spaces/:spaceId/dashboard-preferences',
    async (request): Promise<DashboardPreferences> => {
      const user = requireAuthenticatedUser(request);
      const { spaceId } = parseInput(spaceParamsSchema, request.params);
      const space = await requireAccessibleSpace(
        data.repositories.financialSpaces,
        user.id,
        spaceId,
        'view',
      );
      const input = parseInput(preferenceSchema, request.body);
      const preference = {
        profile: input.profile,
        overrides: normalizeOverrides(input.profile, input.overrides as SectionOverrides),
      };
      await data.repositories.dashboardPreferences.save(user.id, space.id, preference);
      return toResponse(preference, false);
    },
  );
}
