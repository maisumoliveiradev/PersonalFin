import type { Breakdown } from '@personalfin/api-contract';
import {
  formatMoney,
  formatMonthLabel,
  formatPercentTenths,
  type Month,
  shiftMonth,
} from '@personalfin/domain';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useBreakdown } from '../../api/analytics';
import { messages } from '../../i18n/messages';
import { BodyText } from '../../ui/BodyText';
import { FormError } from '../../ui/FormError';
import { type Option, OptionGroup } from '../../ui/OptionGroup';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

type Period = '1' | '3' | '6' | '12';

const PERIOD_OPTIONS: readonly Option<Period>[] = (['1', '3', '6', '12'] as const).map((value) => ({
  value,
  label: messages.analytics.months(Number(value)),
}));

function money(amountMinor: number): string {
  return formatMoney({ amountMinor, currency: 'BRL' }, 'pt-BR');
}

type Item = Breakdown['tags'][number];

function itemSummary(item: Item): string {
  const share =
    item.shareTenths === null
      ? null
      : formatPercentTenths(item.shareTenths, 'pt-BR').replace('+', '');
  return messages.analytics.breakdownRow(
    money(item.amountMinor),
    share,
    money(item.previousAmountMinor),
  );
}

function ItemRow({ item, largest }: { item: Item; largest: number }) {
  const palette = usePalette();
  const summary = itemSummary(item);
  return (
    <View style={styles.item} aria-label={`${item.name}: ${summary}`}>
      <Text style={[styles.name, { color: palette.text }]}>{item.name}</Text>
      <Text style={[styles.summary, { color: palette.textMuted }]}>{summary}</Text>
      <View style={[styles.track, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.bar,
            {
              backgroundColor: palette.primary,
              width: `${(item.amountMinor / Math.max(largest, 1)) * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

export function BreakdownCard({ spaceId, throughMonth }: { spaceId: string; throughMonth: Month }) {
  const palette = usePalette();
  const [period, setPeriod] = useState<Period>('1');
  const months = Number(period) as 1 | 3 | 6 | 12;
  const breakdown = useBreakdown(spaceId, shiftMonth(throughMonth, -(months - 1)), months);

  if (breakdown.isError) {
    return <FormError message={messages.analytics.loadError} />;
  }
  const data = breakdown.data;
  const largest = Math.max(0, ...(data?.categories ?? []).map((item) => item.amountMinor));
  const largestTag = Math.max(0, ...(data?.tags ?? []).map((item) => item.amountMinor));

  return (
    <View
      role="region"
      aria-label={messages.analytics.breakdownTitle}
      style={[styles.card, { borderColor: palette.border }]}
    >
      <SectionTitle>{messages.analytics.breakdownTitle}</SectionTitle>
      <OptionGroup
        label={messages.analytics.periodLabel}
        options={PERIOD_OPTIONS}
        selected={period}
        onSelect={setPeriod}
      />
      {data !== undefined && (
        <>
          <BodyText muted>
            {messages.analytics.breakdownTotal(
              formatMonthLabel(data.fromMonth, 'pt-BR'),
              formatMonthLabel(data.throughMonth, 'pt-BR'),
              money(data.totalMinor),
              money(data.previousTotalMinor),
            )}
          </BodyText>
          {data.categories.length === 0 && (
            <BodyText muted>{messages.analytics.noExpenses}</BodyText>
          )}
          {data.categories.map((category) => (
            <View key={category.id} style={styles.group}>
              <ItemRow item={category} largest={largest} />
              {category.subcategories.length > 1 &&
                category.subcategories.map((subcategory) => (
                  <Text
                    key={subcategory.id ?? 'none'}
                    style={[styles.subcategory, { color: palette.textMuted }]}
                  >
                    {`${subcategory.name ?? messages.analytics.noSubcategory}: ${money(subcategory.amountMinor)}`}
                  </Text>
                ))}
            </View>
          ))}
          {data.tags.length > 0 && (
            <>
              <SectionTitle>{messages.analytics.tagsTitle}</SectionTitle>
              <BodyText muted>{messages.analytics.tagsHint}</BodyText>
              {data.tags.map((tag) => (
                <ItemRow key={tag.id} item={tag} largest={largestTag} />
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
  group: { gap: 2 },
  item: { gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '600' },
  summary: { fontSize: fontSize.caption, fontVariant: ['tabular-nums'] },
  subcategory: { fontSize: fontSize.caption, paddingLeft: spacing.md },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6 },
});
