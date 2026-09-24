export const messages = {
  common: {
    appName: 'PersonalFin',
    loading: 'Carregando…',
    retry: 'Tentar novamente',
  },
  auth: {
    signInTitle: 'Entrar',
    signUpTitle: 'Criar conta',
    name: 'Nome',
    email: 'E-mail',
    password: 'Senha',
    passwordHint: 'Mínimo de 8 caracteres.',
    signInAction: 'Entrar',
    signUpAction: 'Criar conta',
    signOutAction: 'Sair',
    goToSignUp: 'Ainda não tem conta? Criar conta',
    goToSignIn: 'Já tem conta? Entrar',
    errors: {
      required: 'Preencha todos os campos.',
      invalidCredentials: 'E-mail ou senha incorretos.',
      emailInUse: 'Já existe uma conta com este e-mail.',
      passwordTooShort: 'A senha precisa ter pelo menos 8 caracteres.',
      passwordTooLong: 'A senha é longa demais.',
      invalidEmail: 'Informe um e-mail válido.',
      unexpected: 'Não foi possível concluir agora. Tente novamente.',
    },
  },
  home: {
    greeting: (name: string) => `Olá, ${name}!`,
    loadError: 'Não foi possível carregar seus dados.',
  },
} as const;
