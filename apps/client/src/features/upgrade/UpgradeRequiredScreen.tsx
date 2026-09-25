import { useQueryClient } from '@tanstack/react-query';

import { clearUpgradeRequired } from '../../api/upgrade-required';
import { clientVersion } from '../../config';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { Title } from '../../ui/Title';

export function UpgradeRequiredScreen() {
  const queryClient = useQueryClient();
  return (
    <Screen>
      <Title>{messages.upgrade.title}</Title>
      <BodyText>{messages.upgrade.body}</BodyText>
      <BodyText muted>{messages.upgrade.version(clientVersion)}</BodyText>
      <Button
        label={messages.common.retry}
        onPress={() => {
          clearUpgradeRequired();
          void queryClient.invalidateQueries();
        }}
      />
    </Screen>
  );
}
