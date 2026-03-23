import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { statusCode: status, message: 'Internal server error' };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      new Logger('ExceptionFilter').error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception
      );
    }

    response
      .status(status)
      .send(typeof message === 'string' ? { statusCode: status, message } : message);
  }
}
