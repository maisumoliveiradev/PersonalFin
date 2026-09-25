import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { authClient } from '../../auth/auth-client';
import { messages } from '../../i18n/messages';
import { clearQueryCache } from '../../local/query-persistence';
import { discardAllEntries, useSyncSnapshot } from '../../sync/sync-engine';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';

export function SignOutButton() {
  const queryClient = useQueryClient();
  const sync = useSyncSnapshot();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [failed, setFailed] = useState(false);
  const unsynced = sync.entries.length;

  async function signOut(): Promise<void> {
    const userId = sync.userId;
    setSigningOut(true);
    setFailed(false);
    const result = await authClient.signOut().catch(() => null);
    if (result === null || result.error) {
      setSigningOut(false);
      setFailed(true);
      return;
    }
    if (userId === null) {
      queryClient.clear();
      return;
    }
    await Promise.all([discardAllEntries(userId), clearQueryCache(queryClient, userId)]);
  }

  if (confirming && unsynced > 0) {
    return (
      <>
        <BodyText>{messages.sync.signOutWarning(unsynced)}</BodyText>
        <FormError message={failed ? messages.auth.errors.unexpected : null} />
        <Button
          label={messages.sync.confirmSignOutAction}
          variant="danger"
          loading={signingOut}
          onPress={() => void signOut()}
        />
        <Button
          label={messages.sync.cancelSignOutAction}
          variant="link"
          onPress={() => setConfirming(false)}
        />
      </>
    );
  }

  return (
    <>
      <FormError message={failed ? messages.auth.errors.unexpected : null} />
      <Button
        label={messages.auth.signOutAction}
        variant="link"
        loading={signingOut}
        onPress={() => (unsynced > 0 ? setConfirming(true) : void signOut())}
      />
    </>
  );
}
