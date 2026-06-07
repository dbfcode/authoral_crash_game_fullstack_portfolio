import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('games');
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.listen(process.env.GAMES_PORT ?? 4001);
}
bootstrap();
