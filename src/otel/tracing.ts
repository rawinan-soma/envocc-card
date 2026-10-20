// SPIKE (ticket #21) — throwaway. Not for main.
import { appendFileSync } from 'fs';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { ExportResultCode, type ExportResult } from '@opentelemetry/core';
import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  SimpleSpanProcessor,
  type ReadableSpan,
  type SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrismaInstrumentation } from '@prisma/instrumentation';

// One JSON line per span, so runs can be diffed and grepped.
class JsonLinesExporter implements SpanExporter {
  constructor(private readonly path: string) {}

  export(spans: ReadableSpan[], done: (r: ExportResult) => void) {
    for (const s of spans) {
      appendFileSync(
        this.path,
        JSON.stringify({
          name: s.name,
          scope: s.instrumentationScope.name,
          kind: s.kind,
          traceId: s.spanContext().traceId,
          spanId: s.spanContext().spanId,
          parentSpanId: s.parentSpanContext?.spanId,
          // Keys only — values may hold personal data (ADR 0002).
          attributeKeys: Object.keys(s.attributes),
        }) + '\n',
      );
    }
    done({ code: ExportResultCode.SUCCESS });
  }

  shutdown() {
    return Promise.resolve();
  }
}

export function startTracing(mode: string) {
  if (process.env.OTEL_SPIKE_DIAG) {
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
  }
  const out = process.env.OTEL_SPIKE_OUT ?? 'spans.jsonl';
  const sdk = new NodeSDK({
    serviceName: 'envocc-card-api',
    spanProcessors: [new SimpleSpanProcessor(new JsonLinesExporter(out))],
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
      }),
      ...(process.env.OTEL_SPIKE_PRISMA ? [new PrismaInstrumentation()] : []),
    ],
  });
  sdk.start();
  console.log(`[otel-spike] SDK started via ${mode}, writing ${out}`);
}
