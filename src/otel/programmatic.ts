// SPIKE (ticket #21): imported first in main.ts, before @nestjs/core.
import { startTracing } from './tracing';

if (process.env.OTEL_SPIKE_MODE === 'programmatic') {
  startTracing('programmatic');
}
