import { useState } from 'react';
import {
  computePayoutCents,
  formatCents,
  parseMoneyInputToCents,
} from '../utils/money';

type RoundResult = {
  status: 'lost' | 'cashed_out';
  amountCents: string;
  payoutCents: string | null;
  cashoutMultiplier: string | null;
};

type Props = {
  status: string;
  currentMultiplier: string | null;
  myBetStatus: string | null;
  hasBetThisRound: boolean;
  placing: boolean;
  cashingOut: boolean;
  lastRoundResult: RoundResult | null;
  onBet: (amountCents: string) => Promise<void>;
  onCashOut: () => Promise<void>;
  myBetAmountCents: bigint | null;
};

export function BetControls({
  status,
  currentMultiplier,
  myBetStatus,
  hasBetThisRound,
  placing,
  cashingOut,
  lastRoundResult,
  onBet,
  onCashOut,
  myBetAmountCents,
}: Props) {
  const [amountInput, setAmountInput] = useState('10.00');

  const canBet = status === 'betting' && !hasBetThisRound && !placing;
  const canCashOut =
    status === 'running' && myBetStatus === 'active' && !cashingOut;

  const potentialPayout =
    myBetAmountCents && currentMultiplier
      ? computePayoutCents(myBetAmountCents, currentMultiplier)
      : null;

  const handleBet = async () => {
    const cents = parseMoneyInputToCents(amountInput);
    if (cents === null) {
      return;
    }
    await onBet(cents.toString());
  };

  return (
    <section className="rounded-xl border border-white/10 bg-casino-panel p-4 space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Apostas</h2>
      <label className="block text-sm text-gray-400">
        Valor (R$ 1,00 – R$ 1.000,00)
        <input
          type="text"
          inputMode="decimal"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          disabled={!canBet}
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-casino-accent disabled:opacity-50"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canBet}
          onClick={() => void handleBet()}
          className="flex-1 rounded-lg bg-casino-accent px-4 py-2 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {placing ? 'Apostando…' : 'Apostar'}
        </button>
        <button
          type="button"
          disabled={!canCashOut}
          onClick={() => void onCashOut()}
          className="flex-1 rounded-lg bg-casino-purple px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cashingOut ? 'Sacando…' : 'Cash Out'}
        </button>
      </div>
      {myBetStatus === 'pending' ? (
        <p className="text-sm text-yellow-400">Aposta pendente — aguardando confirmação…</p>
      ) : null}
      {potentialPayout !== null && myBetStatus === 'active' ? (
        <p className="text-sm text-gray-300">
          Pagamento potencial:{' '}
          <span className="font-semibold text-casino-accent">
            {formatCents(potentialPayout)}
          </span>
        </p>
      ) : null}
      {lastRoundResult?.status === 'cashed_out' ? (
        <p className="rounded-lg border border-casino-accent/40 bg-casino-accent/10 px-3 py-2 text-sm text-casino-accent">
          Você ganhou{' '}
          {lastRoundResult.payoutCents
            ? formatCents(BigInt(lastRoundResult.payoutCents))
            : '—'}
          {lastRoundResult.cashoutMultiplier
            ? ` @ ${lastRoundResult.cashoutMultiplier}x`
            : ''}
        </p>
      ) : null}
      {lastRoundResult?.status === 'lost' ? (
        <p className="rounded-lg border border-casino-danger/40 bg-casino-danger/10 px-3 py-2 text-sm text-casino-danger">
          Você perdeu {formatCents(BigInt(lastRoundResult.amountCents))} nesta rodada.
        </p>
      ) : null}
    </section>
  );
}
