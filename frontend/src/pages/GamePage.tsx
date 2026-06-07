import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import { cashOut, placeBet } from '../api/games';
import { useGameSocket } from '../hooks/useGameSocket';
import { useRoundVerification } from '../hooks/useRoundVerification';
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
  const verification = useRoundVerification({
    roundId: game.roundId,
    status: game.status,
    revealedRoundSeed: game.revealedRoundSeed,
  });
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
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-4 pb-8">
      <PlayerBar />
      <div className="flex items-center justify-between gap-2">
        <BettingCountdown bettingStartedAt={game.bettingStartedAt} status={game.status} />
        <span
          className={`text-xs ${game.connected ? 'text-casino-accent' : 'text-casino-danger'}`}
        >
          {game.connected ? 'WS conectado' : 'WS desconectado'}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
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
          <FairnessPanel
            status={game.status}
            roundId={game.roundId}
            committedRoundHash={game.committedRoundHash}
            nextRoundHash={game.nextRoundHash}
            revealedRoundSeed={game.revealedRoundSeed}
            crashPoint={game.crashPoint}
            verification={verification}
          />
          <RoundHistory items={game.history} />
        </div>
      </div>
    </div>
  );
}
