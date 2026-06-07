import { useAuth } from '../auth/AuthProvider';

export function LoginPage() {
  const { login, ready } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-black text-casino-accent">Crash Game</h1>
        <p className="mt-2 text-gray-400">
          Entre com Keycloak para jogar. Usuário de teste: <code>player</code> /{' '}
          <code>player123</code>
        </p>
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => void login()}
        className="rounded-xl bg-casino-accent px-8 py-3 text-lg font-bold text-black disabled:opacity-50"
      >
        Entrar
      </button>
    </div>
  );
}
