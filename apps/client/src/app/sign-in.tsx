import { useRouter } from 'expo-router';
import { useState } from 'react';

import { authClient } from '../auth/auth-client';
import { describeAuthError } from '../auth/auth-errors';
import { messages } from '../i18n/messages';
import { Button } from '../ui/Button';
import { FormError } from '../ui/FormError';
import { Screen } from '../ui/Screen';
import { TextField } from '../ui/TextField';
import { Title } from '../ui/Title';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (email.trim() === '' || password === '') {
      setError(messages.auth.errors.required);
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await authClient.signIn.email({ email: email.trim(), password });
    setSubmitting(false);
    if (result.error !== null) {
      setError(describeAuthError(result.error));
    }
  }

  return (
    <Screen>
      <Title>{messages.auth.signInTitle}</Title>
      <TextField
        label={messages.auth.email}
        value={email}
        onChangeText={setEmail}
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label={messages.auth.password}
        value={password}
        onChangeText={setPassword}
        autoComplete="current-password"
        secureTextEntry
        textContentType="password"
        onSubmitEditing={handleSubmit}
      />
      <FormError message={error} />
      <Button label={messages.auth.signInAction} onPress={handleSubmit} loading={submitting} />
      <Button
        label={messages.auth.goToSignUp}
        variant="link"
        onPress={() => router.replace('/sign-up')}
      />
    </Screen>
  );
}
