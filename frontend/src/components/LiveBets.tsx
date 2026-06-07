import { formatCents } from '../utils/money';
import type { BetItem } from '../api/games';

type Props = {
  bets: BetItem[];
  playerId: string | null;
  username: string | null;
};

function displayName(bet: BetItem, playerId: string | null, username: string | null): string {
  if (playerId && bet.playerId === playerId) {
    return username ?? 'Você';
  }
  if (!bet.playerId) {
    return '—';
  }
  return `${bet.playerId.slice(0, 8)}…`;
}

export function LiveBets({ bets, playerId, username }: Props) {
  return (
    <section className="rounded-xl border border-white/10 bg-casino-panel p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300">
        Apostas da rodada
      </h2>
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="pb-2">Jogador</th>
              <th className="pb-2">Valor</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {bets.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-2 text-gray-500">
                  Nenhuma aposta nesta rodada.
                </td>
              </tr>
            ) : (
              bets.map((bet) => {
                const cashedOut = bet.status === 'cashed_out';
                const lost = bet.status === 'lost';
                const rowClass = cashedOut
                  ? 'text-casino-accent'
                  : lost
                    ? 'text-casino-danger'
                    : 'text-gray-200';
                const statusLabel =
                  cashedOut && bet.cashoutMultiplier
                    ? `Ganhou @ ${bet.cashoutMultiplier}x`
                    : lost
                      ? 'Perdeu'
                      : bet.status === 'cashed_out'
                        ? 'Ganhou'
                        : bet.status;
                return (
                  <tr key={bet.betId} className={rowClass}>
                    <td className="py-1 pr-2">{displayName(bet, playerId, username)}</td>
                    <td className="py-1 pr-2 tabular-nums">
                      {formatCents(BigInt(bet.amountCents))}
                    </td>
                    <td className="py-1">{statusLabel}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
