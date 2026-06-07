import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ToastProvider } from './hooks/useToast';
import { ToastDisplay } from './components/ToastDisplay';
import { LoginPage } from './pages/LoginPage';
import { GamePage } from './pages/GamePage';

function AppRoutes() {
  const { ready, authenticated } = useAuth();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Carregando…
      </div>
    );
  }

  return authenticated ? <GamePage /> : <LoginPage />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
        <ToastDisplay />
      </ToastProvider>
    </AuthProvider>
  );
}
