import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';

import { queryClient } from '../api/query-client';
import { useUpgradeRequired } from '../api/upgrade-required';
import { authClient } from '../auth/auth-client';
import { UpgradeRequiredScreen } from '../features/upgrade/UpgradeRequiredScreen';
import { LocalPersistenceGate } from '../local/LocalPersistenceGate';
import { OfflineBanner } from '../local/OfflineBanner';
import { LoadingScreen } from '../ui/LoadingScreen';

export default function RootLayout() {
  const { data: session, isPending } = authClient.useSession();
  const upgradeRequired = useUpgradeRequired();

  if (isPending) {
    return <LoadingScreen />;
  }

  const isSignedIn = session !== null;
  const navigation = upgradeRequired ? (
    <UpgradeRequiredScreen />
  ) : (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack.Protected>
    </Stack>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <View style={styles.root}>
        <OfflineBanner />
        {session === null ? (
          navigation
        ) : (
          <LocalPersistenceGate userId={session.user.id}>{navigation}</LocalPersistenceGate>
        )}
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
