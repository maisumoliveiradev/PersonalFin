import type { ForeignCurrencyCode } from '@personalfin/api-contract';
import {
  CURRENCY_CODES,
  DEFAULT_CURRENCY,
  financialDateFromLocalClock,
  formatDisplayDate,
  formatRate,
  parseDisplayDate,
  parseRateInput,
} from '@personalfin/domain';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';

import { useExchangeRates, useRecordExchangeRate } from '../../../../api/exchange-rates';
import { useFinancialSpace } from '../../../../api/financial-spaces';
import { can } from '../../../../features/financial-spaces/permissions';
import { messages } from '../../../../i18n/messages';
import { BodyText } from '../../../../ui/BodyText';
import { Button } from '../../../../ui/Button';
import { FormError } from '../../../../ui/FormError';
import { OptionGroup } from '../../../../ui/OptionGroup';
import { Screen } from '../../../../ui/Screen';
import { SectionTitle } from '../../../../ui/SectionTitle';
import { StatusMessage } from '../../../../ui/StatusMessage';
import { TextField } from '../../../../ui/TextField';
import { Title } from '../../../../ui/Title';

const FOREIGN = CURRENCY_CODES.filter((code) => code !== DEFAULT_CURRENCY) as ForeignCurrencyCode[];

export default function ExchangeRatesScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const space = useFinancialSpace(spaceId);
  const rates = useExchangeRates(spaceId);
  const record = useRecordExchangeRate(spaceId);
  const [currency, setCurrency] = useState<ForeignCurrencyCode>('USD');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState(() =>
    formatDisplayDate(financialDateFromLocalClock(new Date()), 'pt-BR'),
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleRecord(): Promise<void> {
    const parsedRate = parseRateInput(rate, ',');
    if (!parsedRate.ok) {
      setError(messages.currencies.errors.rateInvalid);
      return;
    }
    const rateDate = parseDisplayDate(date, 'pt-BR');
    if (rateDate === null) {
      setError(messages.transactions.errors.dateInvalid);
      return;
    }
    setError(null);
    setSaved(false);
    try {
      await record.mutateAsync({ currency, rateDate, rate: parsedRate.rate });
      setRate('');
      setSaved(true);
    } catch {
      setError(messages.currencies.errors.failed);
    }
  }

  return (
    <Screen>
      <Title>{messages.currencies.ratesTitle}</Title>
      <BodyText muted>{messages.currencies.ratesHint}</BodyText>
      {(rates.data ?? []).length === 0 && rates.isSuccess && (
        <BodyText muted>{messages.currencies.ratesEmpty}</BodyText>
      )}
      {(rates.data ?? []).map((item) => (
        <BodyText key={item.id}>
          {messages.currencies.rateItem(
            item.currency,
            formatRate(item.rate, ','),
            formatDisplayDate(item.rateDate, 'pt-BR'),
          )}
        </BodyText>
      ))}
      {space.data !== undefined && can(space.data, 'record') && (
        <>
          <SectionTitle>{messages.currencies.recordTitle}</SectionTitle>
          {saved && <StatusMessage>{messages.currencies.recorded}</StatusMessage>}
          <OptionGroup
            label={messages.currencies.label}
            options={FOREIGN.map((code) => ({
              value: code,
              label: messages.currencies.names[code] ?? code,
            }))}
            selected={currency}
            onSelect={setCurrency}
          />
          <TextField
            label={messages.currencies.rateValueLabel}
            value={rate}
            onChangeText={setRate}
            inputMode="decimal"
          />
          <TextField
            label={messages.currencies.rateDateLabel}
            hint={messages.transactions.dateHint}
            value={date}
            onChangeText={setDate}
            inputMode="numeric"
            maxLength={10}
          />
          <FormError message={error} />
          <Button
            label={messages.currencies.recordAction}
            loading={record.isPending}
            onPress={handleRecord}
          />
        </>
      )}
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}
