import type {
  CreateGoalRequest,
  GoalDetail,
  GoalProgressRequest,
  UpdateGoalRequest,
} from '@personalfin/api-contract';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient, expectData } from './api-client';

export type GoalSpace = string | null;

export const goalKeys = {
  list: (spaceId: GoalSpace) =>
    spaceId === null ? (['goals'] as const) : (['financial-spaces', spaceId, 'goals'] as const),
  detail: (spaceId: GoalSpace, goalId: string) => [...goalKeys.list(spaceId), goalId] as const,
};

export function useGoals(spaceId: GoalSpace) {
  return useQuery({
    queryKey: goalKeys.list(spaceId),
    queryFn: async () =>
      spaceId === null
        ? expectData(await apiClient.GET('/goals')).items
        : expectData(
            await apiClient.GET('/financial-spaces/{spaceId}/goals', {
              params: { path: { spaceId } },
            }),
          ).items,
  });
}

export function useGoal(spaceId: GoalSpace, goalId: string) {
  return useQuery({
    queryKey: goalKeys.detail(spaceId, goalId),
    queryFn: async (): Promise<GoalDetail> =>
      spaceId === null
        ? expectData(await apiClient.GET('/goals/{goalId}', { params: { path: { goalId } } }))
        : expectData(
            await apiClient.GET('/financial-spaces/{spaceId}/goals/{goalId}', {
              params: { path: { spaceId, goalId } },
            }),
          ),
  });
}

function useInvalidateGoals(spaceId: GoalSpace) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: goalKeys.list(spaceId) });
}

export function useCreateGoal(spaceId: GoalSpace) {
  const invalidate = useInvalidateGoals(spaceId);
  return useMutation({
    mutationFn: async (body: CreateGoalRequest): Promise<GoalDetail> =>
      spaceId === null
        ? expectData(await apiClient.POST('/goals', { body }))
        : expectData(
            await apiClient.POST('/financial-spaces/{spaceId}/goals', {
              params: { path: { spaceId } },
              body,
            }),
          ),
    onSettled: invalidate,
  });
}

export function useUpdateGoal(spaceId: GoalSpace, goalId: string) {
  const invalidate = useInvalidateGoals(spaceId);
  return useMutation({
    mutationFn: async (body: UpdateGoalRequest): Promise<GoalDetail> =>
      spaceId === null
        ? expectData(
            await apiClient.PATCH('/goals/{goalId}', { params: { path: { goalId } }, body }),
          )
        : expectData(
            await apiClient.PATCH('/financial-spaces/{spaceId}/goals/{goalId}', {
              params: { path: { spaceId, goalId } },
              body,
            }),
          ),
    onSettled: invalidate,
  });
}

export function useRecordGoalProgress(spaceId: GoalSpace, goalId: string) {
  const invalidate = useInvalidateGoals(spaceId);
  return useMutation({
    mutationFn: async (body: GoalProgressRequest): Promise<GoalDetail> =>
      spaceId === null
        ? expectData(
            await apiClient.POST('/goals/{goalId}/progress', {
              params: { path: { goalId } },
              body,
            }),
          )
        : expectData(
            await apiClient.POST('/financial-spaces/{spaceId}/goals/{goalId}/progress', {
              params: { path: { spaceId, goalId } },
              body,
            }),
          ),
    onSettled: invalidate,
  });
}
