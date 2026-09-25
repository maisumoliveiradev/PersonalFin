import {
  DASHBOARD_SECTIONS,
  type DashboardSection,
  EXPERIENCE_PROFILES,
  type ExperienceProfile,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useDashboardPreferences, useSaveDashboardPreferences } from '../../../../api/preferences';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { CheckboxGroup } from '../../../../ui/CheckboxGroup';
import { FormError } from '../../../../ui/FormError';
import { LoadingScreen } from '../../../../ui/LoadingScreen';
import { OptionGroup } from '../../../../ui/OptionGroup';
import { Screen } from '../../../../ui/Screen';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { Title } from '../../../../ui/Title';

const PROFILE_OPTIONS = EXPERIENCE_PROFILES.map((profile) => ({
  value: profile,
  label: messages.preferences.profiles[profile],
}));

const SECTION_OPTIONS = DASHBOARD_SECTIONS.map((section) => ({
  value: section,
  label: messages.preferences.sections[section],
}));

export default function DashboardPreferencesScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const preferences = useDashboardPreferences(spaceId);
  const save = useSaveDashboardPreferences(spaceId);

  if (preferences.isPending) {
    return <LoadingScreen />;
  }

  const current = preferences.data;
  const visible =
    current === undefined ? [] : DASHBOARD_SECTIONS.filter((section) => current.sections[section]);

  function selectProfile(profile: ExperienceProfile): void {
    save.mutate({ profile, overrides: {} });
  }

  function toggleSection(section: DashboardSection): void {
    if (current === undefined) {
      return;
    }
    save.mutate({
      profile: current.profile,
      overrides: { ...current.overrides, [section]: !current.sections[section] },
    });
  }

  return (
    <Screen>
      <Title>{messages.preferences.title}</Title>
      <BodyText muted>{messages.preferences.hint}</BodyText>
      {preferences.isError && <FormError message={messages.preferences.loadError} />}
      {current !== undefined && (
        <>
          <OptionGroup
            label={messages.preferences.profileLabel}
            options={PROFILE_OPTIONS}
            selected={current.profile}
            onSelect={selectProfile}
          />
          <BodyText muted>{messages.preferences.profileHints[current.profile]}</BodyText>
          <CheckboxGroup
            label={messages.preferences.sectionsLabel}
            options={SECTION_OPTIONS}
            selected={visible}
            onToggle={toggleSection}
          />
        </>
      )}
      {save.isSuccess && <StatusMessage>{messages.preferences.saved}</StatusMessage>}
      <FormError message={save.isError ? messages.preferences.saveFailed : null} />
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
