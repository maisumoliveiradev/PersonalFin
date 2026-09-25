import { useState } from 'react';

import { ApiRequestError } from '../../api/api-client';
import { useCreateSupportGrant, useRevokeSupportGrant, useSupportGrants } from '../../api/support';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { Button } from '../../ui/Button';
import { FormError } from '../../ui/FormError';
import { OptionGroup } from '../../ui/OptionGroup';
import { SectionTitle } from '../../ui/SectionTitle';
import { StatusMessage } from '../../ui/StatusMessage';
import { TextField } from '../../ui/TextField';

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export function SupportAccessSection({ spaceId }: { spaceId: string }) {
  const grants = useSupportGrants(spaceId, true);
  const create = useCreateSupportGrant(spaceId);
  const revoke = useRevokeSupportGrant(spaceId);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('1');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGrant(): Promise<void> {
    setStatus(null);
    setError(null);
    try {
      await create.mutateAsync({ adminEmail: email, reason, days: Number(days) });
      setEmail('');
      setReason('');
      setStatus(messages.support.granted);
    } catch (failure) {
      setError(
        (failure instanceof ApiRequestError && messages.support.errors[failure.code]) ||
          messages.support.failed,
      );
    }
  }

  async function handleRevoke(grantId: string): Promise<void> {
    setStatus(null);
    setError(null);
    try {
      await revoke.mutateAsync(grantId);
      setStatus(messages.support.revoked);
    } catch {
      setError(messages.support.failed);
    }
  }

  const items = grants.data ?? [];
  return (
    <>
      <SectionTitle>{messages.support.title}</SectionTitle>
      <BodyText muted>{messages.support.hint}</BodyText>
      {status !== null && <StatusMessage>{status}</StatusMessage>}
      <FormError message={error} />
      {grants.isSuccess && items.length === 0 && (
        <BodyText muted>{messages.support.empty}</BodyText>
      )}
      {items.map((grant) => (
        <BodyText key={grant.id}>
          {`${messages.support.item(
            grant.adminEmail,
            messages.support.statuses[grant.status] ?? grant.status,
            DATE_TIME.format(new Date(grant.revokedAt ?? grant.expiresAt)),
            grant.accessCount,
          )} — ${messages.support.reason(grant.reason)}`}
        </BodyText>
      ))}
      {items
        .filter((grant) => grant.status === 'active')
        .map((grant) => (
          <Button
            key={`revoke-${grant.id}`}
            label={messages.support.revokeLabel}
            accessibilityLabel={messages.support.revokeAction(grant.adminEmail)}
            variant="link"
            onPress={() => void handleRevoke(grant.id)}
          />
        ))}
      <TextField
        label={messages.support.emailLabel}
        value={email}
        onChangeText={setEmail}
        inputMode="email"
        autoComplete="email"
      />
      <TextField
        label={messages.support.reasonLabel}
        value={reason}
        onChangeText={setReason}
        maxLength={500}
      />
      <OptionGroup
        label={messages.support.daysLabel}
        options={['1', '3', '7'].map((value) => ({
          value,
          label: messages.support.days[value] ?? value,
        }))}
        selected={days}
        onSelect={setDays}
      />
      <Button
        label={messages.support.grantAction}
        loading={create.isPending}
        onPress={handleGrant}
      />
    </>
  );
}
