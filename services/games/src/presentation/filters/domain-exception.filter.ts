import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import {
  BetAlreadyCashedOutError,
  BetLimitError,
  BetNotFoundError,
  DomainError,
  DuplicateBetError,
  InvalidAmountError,
  InvalidRoundStateError,
  NoActiveRoundError,
  RoundNotFoundError,
} from '../../domain/errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status(code: number): { json(body: unknown): void };
    }>();
    const status = this.resolveStatus(exception);

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }

  private resolveStatus(exception: DomainError): number {
    if (
      exception instanceof InvalidAmountError ||
      exception instanceof BetLimitError
    ) {
      return HttpStatus.BAD_REQUEST;
    }

    if (
      exception instanceof DuplicateBetError ||
      exception instanceof InvalidRoundStateError ||
      exception instanceof BetAlreadyCashedOutError
    ) {
      return HttpStatus.CONFLICT;
    }

    if (
      exception instanceof BetNotFoundError ||
      exception instanceof RoundNotFoundError ||
      exception instanceof NoActiveRoundError
    ) {
      return HttpStatus.NOT_FOUND;
    }

    return HttpStatus.BAD_REQUEST;
  }
}
