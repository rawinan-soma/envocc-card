// SPIKE (ticket #21): load with `bun --preload ./dist/src/otel/preload.js`.
import { startTracing } from './tracing';

startTracing('preload');
