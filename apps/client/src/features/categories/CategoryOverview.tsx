import type { CategoryKind, CategoryTreeItem } from '@personalfin/api-contract';
import { StyleSheet, Text, View } from 'react-native';

import { useCategories } from '../../api/categories';
import { messages } from '../../i18n/messages';
import { FormError } from '../../ui/FormError';
import { SectionTitle } from '../../ui/SectionTitle';
import { fontSize, radius, spacing, usePalette } from '../../ui/theme';

interface CategoryOverviewProps {
  spaceId: string;
}

const SECTIONS: { kind: CategoryKind; title: string }[] = [
  { kind: 'expense', title: messages.categories.expenseSection },
  { kind: 'income', title: messages.categories.incomeSection },
];

function CategoryRow({ category }: { category: CategoryTreeItem }) {
  const palette = usePalette();
  const subcategoryNames = category.subcategories
    .map((subcategory) => subcategory.name)
    .join(' · ');
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <Text style={[styles.name, { color: palette.text }]}>{category.name}</Text>
      {subcategoryNames !== '' && (
        <Text style={[styles.subcategories, { color: palette.textMuted }]}>{subcategoryNames}</Text>
      )}
    </View>
  );
}

export function CategoryOverview({ spaceId }: CategoryOverviewProps) {
  const categories = useCategories(spaceId);

  if (categories.isPending) {
    return null;
  }
  if (categories.isError) {
    return <FormError message={messages.categories.loadError} />;
  }

  return (
    <View style={styles.container}>
      <SectionTitle>{messages.categories.title}</SectionTitle>
      {SECTIONS.map((section) => (
        <View key={section.kind} style={styles.section} accessibilityRole="list">
          <SectionTitle>{section.title}</SectionTitle>
          {categories.data
            .filter((category) => category.kind === section.kind)
            .map((category) => (
              <CategoryRow key={category.id} category={category} />
            ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  section: { gap: spacing.sm },
  row: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm + 4, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '600' },
  subcategories: { fontSize: fontSize.caption },
});
