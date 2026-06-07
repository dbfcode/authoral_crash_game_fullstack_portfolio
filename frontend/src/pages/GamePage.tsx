import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { ApiError } from '../api/client';
import { cashOut, placeBet, verifyRound } from '../api/games';
import { useGameSocket } from '../hooks/useGameSocket';
import { useToast } from '../hooks/useToast';
import { PlayerBar } from '../components/PlayerBar';
import { MultiplierChart } from '../components/MultiplierChart';
import { BettingCountdown } from '../components/BettingCountdown';
import { BetControls } from '../components/BetControls';
import { FairnessPanel } from '../components/FairnessPanel';
import { RoundHistory } from '../components/RoundHistory';
import { LiveBets } from '../components/LiveBets';
import { VerifyModal } from '../components/VerifyModal';

export function GamePage() {
  const { playerId, username, getToken, refreshWallet } = useAuth();
  const { game } = useGameSocket(true);
  const { showToast } = useToast();
  const [placing, setPlacing] = useState(false);
  const [cashingOut, setCashingOut] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyData, setVerifyData] = useState<Awaited<ReturnType<typeof verifyRound>> | null>(
    null,
  );
  const [verifyError, setVerifyError] = useState<string | null>(null);

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

  const handleVerify = async () => {
    if (!game.roundId) {
      return;
    }
    setVerifyOpen(true);
    setVerifyLoading(true);
    setVerifyError(null);
    setVerifyData(null);
    try {
      const data = await verifyRound(game.roundId);
      setVerifyData(data);
    } catch (error) {
      setVerifyError(error instanceof ApiError ? error.message : 'Falha ao verificar');
    } finally {
      setVerifyLoading(false);
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
            committedRoundHash={game.committedRoundHash}
            revealedRoundSeed={game.revealedRoundSeed}
            crashPoint={game.crashPoint}
            roundId={game.roundId}
            onVerify={() => void handleVerify()}
          />
          <RoundHistory items={game.history} />
        </div>
      </div>
      <VerifyModal
        open={verifyOpen}
        loading={verifyLoading}
        data={verifyData}
        error={verifyError}
        onClose={() => setVerifyOpen(false)}
      />
    </div>
  );
}
