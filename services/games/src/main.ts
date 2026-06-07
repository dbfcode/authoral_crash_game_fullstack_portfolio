import { NestFactory } from '@nestjs/core';
import { GamesIoAdapter } from './infrastructure/websocket/games-io.adapter';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register());
  app.setGlobalPrefix('games');
  app.useGlobalFilters(new DomainExceptionFilter());

  if (process.env.GAMES_DISABLE_WS !== '1') {
    app.useWebSocketAdapter(new GamesIoAdapter(app));
  }

  await app.listen(process.env.GAMES_PORT ?? 4001);
}
bootstrap();
