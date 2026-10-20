import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { Response } from 'supertest';
import type { App } from 'supertest/types';
import { httpSpans } from 'src/telemetry/http-spans';

export const testConfig = (values: Record<string, string>) => ({
  provide: ConfigService,
  useValue: new ConfigService(values),
});

// Mirrors the request spans and cookie handling main.ts sets up for the real
// app, and with { validation: true } its global ValidationPipe too.
export const startApp = async (
  moduleRef: TestingModule,
  { validation = false } = {},
): Promise<INestApplication<App>> => {
  const app = moduleRef.createNestApplication();
  app.use(httpSpans());
  app.use(cookieParser());
  if (validation) {
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
  }
  await app.init();
  return app;
};

export const setCookies = (res: Response) =>
  ([] as string[]).concat(res.headers['set-cookie'] ?? []);

// name=value pairs from Set-Cookie, ready to send back as a Cookie header.
export const cookiePairs = (res: Response) =>
  setCookies(res).map((c) => c.split(';')[0]);
