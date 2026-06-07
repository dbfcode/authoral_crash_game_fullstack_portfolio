import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BetLostSettledPayload } from '@crash/shared';
import {
  computeCrashPoint,
  PROVABLY_FAIR_ALGORITHM_VERSION,
} from '../domain/provably-fair';
import { Multiplier } from '../domain/multiplier';
import {
  hasReachedCrashPoint,
  nextMultiplier,
} from '../domain/multiplier-growth';
import { Round } from '../domain/round';
import { RoundStatus } from '../domain/round-status';
import { BetStatus } from '../domain/bet-status';
import { GAME_EVENT_PUBLISHER } from '../infrastructure/messaging/messaging.constants';
import { ROUND_REPOSITORY } from '../infrastructure/persistence/persistence.constants';
import type { GameEventPublisher } from './ports/game-event.publisher';
import type { RoundRepository } from './ports/round.repository';
import { RoundRecord } from './models/round-record';
import { GameStateService } from './game-state.service';
import { RoundLockService } from './round-lock.service';

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBigInt(name: string, fallback: bigint): bigint {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  try {
    return BigInt(raw);
  } catch {
    return fallback;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class RoundEngineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RoundEngineService.name);
  private running = false;
  private stopped = false;

  private readonly bettingDurationMs = envInt('GAMES_BETTING_DURATION_MS', 5000);
  private readonly tickMs = envInt('GAMES_MULTIPLIER_TICK_MS', 100);
  private readonly stepHundredths = envBigInt('GAMES_MULTIPLIER_STEP_HUNDREDTHS', 5n);

  constructor(
    @Inject(ROUND_REPOSITORY)
    private readonly roundRepository: RoundRepository,
    @Inject(GAME_EVENT_PUBLISHER)
    private readonly eventPublisher: GameEventPublisher,
    private readonly gameState: GameStateService,
    private readonly roundLock: RoundLockService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.GAMES_DISABLE_ROUND_ENGINE === '1') {
      return;
    }

    if (!this.gameState.isInitialized()) {
      await this.gameState.initialize();
    }

    this.running = true;
    void this.runLoop();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    this.running = false;
  }

  getPrecomputedCrashPoint(record: RoundRecord): Multiplier | null {
    if (!record.fairness.crashPoint) {
      return null;
    }
    return Multiplier.fromDecimalString(record.fairness.crashPoint);
  }

  private async runLoop(): Promise<void> {
    while (this.running && !this.stopped) {
      try {
        const current = await this.roundRepository.findCurrent();
        if (!current) {
          await sleep(200);
          continue;
        }

        if (current.round.status === RoundStatus.BETTING) {
          await this.runBettingPhase(current);
        } else if (current.round.status === RoundStatus.RUNNING) {
          await this.runRunningPhase(current);
        } else {
          await sleep(200);
        }
      } catch (error) {
        this.logger.error('Round engine loop error', error);
        await sleep(500);
      }
    }
  }

  private async runBettingPhase(record: RoundRecord): Promise<void> {
    const elapsed = Date.now() - record.createdAt.getTime();
    const remaining = this.bettingDurationMs - elapsed;
    if (remaining > 0) {
      await sleep(remaining);
    }

    await this.roundLock.runExclusive(async () => {
      const fresh = await this.roundRepository.findById(record.round.id);
      if (!fresh || fresh.round.status !== RoundStatus.BETTING) {
        return;
      }

      await sleep(250);
      const latest = await this.roundRepository.findById(record.round.id);
      if (!latest || latest.round.status !== RoundStatus.BETTING) {
        return;
      }

      latest.round.removePendingBets();

      const chain = this.gameState.getChain();
      const commit = chain.commit(latest.fairness.chainIndex);
      const crashPoint = computeCrashPoint({
        roundSeed: commit.roundSeed,
        nonce: latest.fairness.nonce,
        clientSeed: latest.fairness.clientSeed ?? undefined,
      });

      latest.fairness.roundSeed = commit.roundSeed;
      latest.fairness.crashPoint = crashPoint.toDecimalString();
      latest.fairness.currentMultiplierHundredths = 100n;
      latest.round.startRunning();

      await this.roundRepository.save(latest);
    });
  }

  private async runRunningPhase(record: RoundRecord): Promise<void> {
    let crashPoint = this.getPrecomputedCrashPoint(record);
    if (!crashPoint) {
      await this.recoverCrashPoint(record);
      const refreshed = await this.roundRepository.findById(record.round.id);
      if (!refreshed) {
        return;
      }
      crashPoint = this.getPrecomputedCrashPoint(refreshed);
      if (!crashPoint) {
        return;
      }
      record = refreshed;
    }

    let current =
      record.fairness.currentMultiplierHundredths != null
        ? Multiplier.ofHundredths(record.fairness.currentMultiplierHundredths)
        : Multiplier.ofHundredths(100n);

    while (!hasReachedCrashPoint(current, crashPoint)) {
      if (this.stopped) {
        return;
      }

      await sleep(this.tickMs);
      current = nextMultiplier(current, this.stepHundredths);

      await this.roundLock.runExclusive(async () => {
        const fresh = await this.roundRepository.findById(record.round.id);
        if (!fresh || fresh.round.status !== RoundStatus.RUNNING) {
          return;
        }

        fresh.fairness.currentMultiplierHundredths = current.hundredths;
        await this.roundRepository.save(fresh);
      });
    }

    await this.roundLock.runExclusive(async () => {
      const fresh = await this.roundRepository.findById(record.round.id);
      if (!fresh || fresh.round.status !== RoundStatus.RUNNING) {
        return;
      }

      fresh.round.crash({ crashMultiplier: crashPoint! });
      await this.roundRepository.save(fresh);
      await this.revealAndPrepareNextRound(fresh);
    });
  }

  private async recoverCrashPoint(record: RoundRecord): Promise<void> {
    if (!record.fairness.roundSeed) {
      return;
    }

    const crashPoint = computeCrashPoint({
      roundSeed: record.fairness.roundSeed,
      nonce: record.fairness.nonce,
      clientSeed: record.fairness.clientSeed ?? undefined,
    });

    record.fairness.crashPoint = crashPoint.toDecimalString();
    await this.roundRepository.save(record);
  }

  private async revealAndPrepareNextRound(record: RoundRecord): Promise<void> {
    record.round.settle();
    await this.roundRepository.save(record);

    for (const bet of record.round.bets) {
      if (bet.status === BetStatus.LOST) {
        const payload: BetLostSettledPayload = {
          betId: bet.id,
          playerId: bet.playerId,
          roundId: record.round.id,
          amountCents: bet.amountCents.toString(),
        };
        try {
          await this.eventPublisher.publishBetLostSettled(payload, bet.id);
        } catch {
          // Broker may be unavailable during shutdown
        }
      }
    }

    await this.gameState.advanceChain();
    const chain = this.gameState.getChain();
    const nextCommit = chain.commit();

    const nextRoundId = randomUUID();
    const nextRecord: RoundRecord = {
      round: Round.create({ roundId: nextRoundId }),
      fairness: {
        committedRoundHash: nextCommit.roundHash,
        nextRoundHash: nextCommit.nextRoundHash,
        previousRoundHash: record.fairness.committedRoundHash,
        roundSeed: null,
        crashPoint: null,
        nonce: nextCommit.index,
        clientSeed: null,
        algorithmVersion: PROVABLY_FAIR_ALGORITHM_VERSION,
        currentMultiplierHundredths: null,
        chainIndex: nextCommit.index,
      },
      createdAt: new Date(),
    };

    await this.roundRepository.save(nextRecord);
  }
}
