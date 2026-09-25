import Constants from 'expo-constants';

const HTTP_URL_PATTERN = /^https?:\/\/[^\s/]+/;

function readApiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL;
  if (value === undefined || !HTTP_URL_PATTERN.test(value)) {
    throw new Error('EXPO_PUBLIC_API_URL must be set to the API base URL (see .env.example)');
  }
  return value.replace(/\/+$/, '');
}

export const apiUrl = readApiUrl();
export const APP_SCHEME = 'personalfin';
export const clientVersion = Constants.expoConfig?.version ?? '0.0.0';
