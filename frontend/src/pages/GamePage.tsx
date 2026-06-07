import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import { cashOut, placeBet } from '../api/games';
import { useGameSocket } from '../hooks/useGameSocket';
import { useFairnessVerifications } from '../hooks/useFairnessVerifications';
import { useToast } from '../hooks/useToast';
import { PlayerBar } from '../components/PlayerBar';
import { MultiplierChart } from '../components/MultiplierChart';
import { BettingCountdown } from '../components/BettingCountdown';
import { BetControls } from '../components/BetControls';
import { FairnessPanel } from '../components/FairnessPanel';
import { RoundHistory } from '../components/RoundHistory';
import { LiveBets } from '../components/LiveBets';

export function GamePage() {
  const { playerId, username, getToken, refreshWallet } = useAuth();
  const { game } = useGameSocket(true);
  const fairness = useFairnessVerifications(game.history, game.lastSettled?.roundId ?? null);
  const { showToast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);

  const myBet = useMemo(() => {
    if (!playerId) {
      return null;
    }
    return game.bets.find((b) => b.playerId === playerId) ?? null;
  }, [game.bets, playerId]);

  const handleBet = async (amountCents: string) => {
    setPlacing(true);
    try {
      const token = await getToken();
      if (!token) {
        return;
      }
      await placeBet(token, amountCents);
      showToast('Aposta enviada — aguardando confirmação', 'info');
      await refreshWallet();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Falha ao apostar');
    } finally {
      setPlacing(false);
    }
  };

  const handleCashOut = async () => {
    setCashingOut(true);
    try {
      const token = await getToken();
      if (!token) {
        return;
      }
      const result = await cashOut(token);
      showToast(`Cash out! Payout ${result.payoutCents} centavos`, 'success');
      await refreshWallet();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Falha no cash out');
    } finally {
      setCashingOut(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 pb-8">
      <PlayerBar />
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div>
          <BettingCountdown bettingStartedAt={game.bettingStartedAt} status={game.status} />
          <p className="text-[11px] text-gray-500">
            Crash com teto de 100x por padrão (
            <code className="text-gray-400">GAMES_MAX_CRASH_MULTIPLIER</code> nas .env). Alterou?
            Derrube e suba de novo com <code className="text-gray-400">bun run docker:up</code>.
          </p>
        </div>
        <span
          className={`text-xs ${game.connected ? 'text-casino-accent' : 'text-casino-danger'}`}
        >
          {game.connected ? 'WS conectado' : 'WS desconectado'}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <MultiplierChart
            multiplier={game.currentMultiplier}
            crashedFlash={game.crashedFlash}
            loading={!game.connected && !game.roundId}
          />
          <BetControls
            status={game.status}
            currentMultiplier={game.currentMultiplier}
            myBetStatus={myBet?.status ?? null}
            hasBetThisRound={!!myBet}
            placing={placing}
            cashingOut={cashingOut}
            onBet={handleBet}
            onCashOut={handleCashOut}
            myBetAmountCents={myBet ? BigInt(myBet.amountCents) : null}
          />
          <LiveBets bets={game.bets} playerId={playerId} username={username} />
        </div>
        <div className="space-y-4">
          <RoundHistory items={game.history} />
        </div>
        <div className="space-y-4">
          <FairnessPanel
            status={game.status}
            roundId={game.roundId}
            committedRoundHash={game.committedRoundHash}
            nextRoundHash={game.nextRoundHash}
            fairness={fairness}
          />
        </div>
      </div>
    </div>
  );
}
