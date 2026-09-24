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

const MIN_PASSWORD_LENGTH = 8;

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    if (name.trim() === '' || email.trim() === '' || password === '') {
      setError(messages.auth.errors.required);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(messages.auth.errors.passwordTooShort);
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (result.error !== null) {
      setError(describeAuthError(result.error));
    }
  }

  return (
    <Screen>
      <Title>{messages.auth.signUpTitle}</Title>
      <TextField
        label={messages.auth.name}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
      />
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
        hint={messages.auth.passwordHint}
        autoComplete="new-password"
        secureTextEntry
        textContentType="newPassword"
        onSubmitEditing={handleSubmit}
      />
      <FormError message={error} />
      <Button label={messages.auth.signUpAction} onPress={handleSubmit} loading={submitting} />
      <Button
        label={messages.auth.goToSignIn}
        variant="link"
        onPress={() => router.replace('/sign-in')}
      />
    </Screen>
  );
}
