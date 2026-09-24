import type { CategoryKind } from '@personalfin/api-contract';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useCategories } from '../../../../../api/categories';
import { messages } from '../../../../../i18n/messages';
import { BodyText } from '../../../../../ui/BodyText';
import { Button } from '../../../../../ui/Button';
import { FormError } from '../../../../../ui/FormError';
import { ListItem } from '../../../../../ui/ListItem';
import { LoadingScreen } from '../../../../../ui/LoadingScreen';
import { Screen } from '../../../../../ui/Screen';
import { SectionTitle } from '../../../../../ui/SectionTitle';
import { Title } from '../../../../../ui/Title';

const SECTIONS: { kind: CategoryKind; title: string }[] = [
  { kind: 'expense', title: messages.categories.expenseSection },
  { kind: 'income', title: messages.categories.incomeSection },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const { spaceId } = useLocalSearchParams<{ spaceId: string }>();
  const categories = useCategories(spaceId);

  if (categories.isPending) {
    return <LoadingScreen />;
  }

  return (
    <Screen>
      <Title>{messages.categories.title}</Title>
      <BodyText muted>{messages.categories.archivedHint}</BodyText>
      {categories.isError && <FormError message={messages.categories.loadError} />}
      {categories.isSuccess &&
        SECTIONS.map((section) => (
          <SectionBlock key={section.kind} title={section.title}>
            {categories.data
              .filter((category) => category.kind === section.kind)
              .map((category) => {
                const subcategories = category.subcategories.map((item) => item.name).join(' · ');
                const details = [
                  category.archived ? messages.categories.archivedTag : null,
                  subcategories === '' ? null : subcategories,
                ].filter((part): part is string => part !== null);
                return (
                  <ListItem
                    key={category.id}
                    title={category.name}
                    {...(details.length > 0 ? { subtitle: details.join(' — ') } : {})}
                    accessibilityHint={messages.categories.openHint}
                    onPress={() =>
                      router.push({
                        pathname: '/spaces/[spaceId]/categories/[categoryId]',
                        params: { spaceId, categoryId: category.id },
                      })
                    }
                  />
                );
              })}
          </SectionBlock>
        ))}
      <Button
        label={messages.categories.newCategoryAction}
        onPress={() =>
          router.push({ pathname: '/spaces/[spaceId]/categories/new', params: { spaceId } })
        }
      />
      <Button
        label={messages.spaces.backToSpace}
        variant="link"
        onPress={() => router.dismissTo({ pathname: '/spaces/[spaceId]', params: { spaceId } })}
      />
    </Screen>
  );
}

function SectionBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <SectionTitle>{title}</SectionTitle>
      {children}
    </>
  );
}
