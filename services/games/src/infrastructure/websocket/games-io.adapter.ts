import { INestApplication } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server as HttpServer } from 'node:http';

/**
 * Bun can load duplicate @nestjs/core copies, breaking `instanceof NestApplication`
 * inside IoAdapter and passing the app object instead of the HTTP server.
 */
export class GamesIoAdapter extends IoAdapter {
  constructor(app: INestApplication) {
    super(app.getHttpServer() as HttpServer);
  }
}
