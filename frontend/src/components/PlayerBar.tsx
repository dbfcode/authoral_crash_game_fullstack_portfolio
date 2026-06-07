import { formatCents } from '../utils/money';
import { useAuth } from '../auth/AuthProvider';

export function PlayerBar() {
  const { username, balanceCents, walletLoading, logout } = useAuth();

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-casino-panel px-4 py-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">Jogador</p>
        <p className="text-lg font-semibold text-white">{username ?? '—'}</p>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-wide text-gray-400">Saldo</p>
        <p className="text-xl font-bold text-casino-accent">
          {walletLoading || balanceCents === null
            ? '…'
            : formatCents(balanceCents)}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-gray-300 hover:bg-white/5"
      >
        Sair
      </button>
    </header>
  );
}
