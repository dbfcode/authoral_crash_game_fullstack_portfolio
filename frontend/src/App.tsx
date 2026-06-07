import { AuthProvider, useAuth } from './auth/AuthProvider';
import { ToastProvider } from './hooks/useToast';
import { useStackReady } from './hooks/useStackReady';
import { ToastDisplay } from './components/ToastDisplay';
import { StartupScreen } from './components/StartupScreen';
import { LoginPage } from './pages/LoginPage';
import { GamePage } from './pages/GamePage';

function AppRoutes() {
  const { ready, authenticated } = useAuth();

  if (!ready) {
    return <StartupScreen subtitle="Conectando autenticação…" />;
  }

  return authenticated ? <GamePage /> : <LoginPage />;
}

export function App() {
  const stackReady = useStackReady();

  if (!stackReady) {
    return <StartupScreen />;
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
        <ToastDisplay />
      </ToastProvider>
    </AuthProvider>
  );
}
