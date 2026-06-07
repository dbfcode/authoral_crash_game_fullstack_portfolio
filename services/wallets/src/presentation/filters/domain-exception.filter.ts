import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  DomainError,
  InsufficientBalanceError,
  InvalidAmountError,
  WalletAlreadyExistsError,
  WalletNotFoundError,
} from '../../domain/errors';

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<{
      status(code: number): { json(body: unknown): void };
    }>();

    if (exception instanceof WalletAlreadyExistsError) {
      const error = new ConflictException(exception.message);
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }

    if (exception instanceof WalletNotFoundError) {
      const error = new NotFoundException(exception.message);
      response.status(error.getStatus()).json(error.getResponse());
      return;
    }

    const status =
      exception instanceof InvalidAmountError ||
      exception instanceof InsufficientBalanceError
        ? HttpStatus.BAD_REQUEST
        : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      error: exception.name,
      message: exception.message,
    });
  }
}
