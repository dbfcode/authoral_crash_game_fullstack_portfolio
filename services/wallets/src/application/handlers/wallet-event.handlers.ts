import {
  BetPlacedRequestedPayload,
  BetRejectedPayload,
  BetReservedPayload,
  CashoutPaidPayload,
  CashoutRejectedPayload,
  CashoutRequestedPayload,
  EventTypes,
  parseCents,
  toCentsString,
} from '@crash/shared';
import { InsufficientBalanceError, WalletNotFoundError } from '../../domain/errors';
import { WalletService } from '../wallet.service';

export type WalletHandlerResult =
  | { type: typeof EventTypes.BET_RESERVED; payload: BetReservedPayload }
  | { type: typeof EventTypes.BET_REJECTED; payload: BetRejectedPayload }
  | { type: typeof EventTypes.CASHOUT_PAID; payload: CashoutPaidPayload }
  | { type: typeof EventTypes.CASHOUT_REJECTED; payload: CashoutRejectedPayload };

export class WalletEventHandlers {
  constructor(private readonly walletService: WalletService) {}

  async handleBetPlacedRequested(
    payload: BetPlacedRequestedPayload,
  ): Promise<WalletHandlerResult> {
    try {
      const amount = parseCents(payload.amountCents);
      await this.walletService.debit(
        payload.playerId,
        amount,
        `reserve:${payload.betId}`,
      );

      return {
        type: EventTypes.BET_RESERVED,
        payload: {
          playerId: payload.playerId,
          amountCents: payload.amountCents,
          betId: payload.betId,
          roundId: payload.roundId,
        },
      };
    } catch (error) {
      const reason =
        error instanceof InsufficientBalanceError
          ? 'INSUFFICIENT_BALANCE'
          : error instanceof WalletNotFoundError
            ? 'WALLET_NOT_FOUND'
            : 'DEBIT_FAILED';

      return {
        type: EventTypes.BET_REJECTED,
        payload: {
          playerId: payload.playerId,
          amountCents: payload.amountCents,
          betId: payload.betId,
          roundId: payload.roundId,
          reason,
        },
      };
    }
  }

  async handleCashoutRequested(
    payload: CashoutRequestedPayload,
  ): Promise<WalletHandlerResult> {
    try {
      const amount = parseCents(payload.amountCents);
      await this.walletService.credit(
        payload.playerId,
        amount,
        `cashout:${payload.betId}`,
      );

      return {
        type: EventTypes.CASHOUT_PAID,
        payload: {
          playerId: payload.playerId,
          amountCents: payload.amountCents,
          betId: payload.betId,
          roundId: payload.roundId,
          multiplier: payload.multiplier,
        },
      };
    } catch (error) {
      const reason =
        error instanceof WalletNotFoundError ? 'WALLET_NOT_FOUND' : 'CREDIT_FAILED';

      return {
        type: EventTypes.CASHOUT_REJECTED,
        payload: {
          playerId: payload.playerId,
          amountCents: payload.amountCents,
          betId: payload.betId,
          roundId: payload.roundId,
          reason,
        },
      };
    }
  }

  /** Refund after a prior reserve (manual/compensation path). */
  async handleBetRejectedRefund(payload: BetRejectedPayload): Promise<void> {
    await this.walletService.credit(
      payload.playerId,
      parseCents(payload.amountCents),
      `refund:${payload.betId}`,
    );
  }

  static toPayloadAmount(amount: bigint): string {
    return toCentsString(amount);
  }
}
