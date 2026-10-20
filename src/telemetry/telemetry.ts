import { context, metrics, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  MeterProvider,
  MetricReader,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import {
  BasicTracerProvider,
  BatchSpanProcessor,
  ParentBasedSampler,
  SimpleSpanProcessor,
  SpanExporter,
  TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';

export interface TelemetryConfig {
  enabled: boolean;
  endpoint: string;
  serviceName: string;
  sampleRatio: number;
}

// Off unless TELEMETRY_ENABLED=true, so local runs and tests never need the
// stack. Every trace is kept unless TELEMETRY_SAMPLE_RATIO says otherwise.
export const telemetryConfig = (env = process.env): TelemetryConfig => {
  const ratio = Number(env.TELEMETRY_SAMPLE_RATIO);
  return {
    enabled: env.TELEMETRY_ENABLED === 'true',
    endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://otelcol:4318',
    serviceName: env.OTEL_SERVICE_NAME ?? 'envocc-card-api',
    sampleRatio:
      env.TELEMETRY_SAMPLE_RATIO && ratio >= 0 && ratio <= 1 ? ratio : 1,
  };
};

// Tests hand these in place of OTLP; spans are then exported as they end.
export interface TelemetryExporters {
  spanExporter: SpanExporter;
  metricReader: MetricReader;
}

export interface Telemetry {
  shutdown(): Promise<void>;
}

const off: Telemetry = { shutdown: () => Promise.resolve() };

// Registers the global trace and metric providers. Must run before the Nest
// app is created. With telemetry off nothing is registered and the API's
// no-op providers stay in place. An unreachable Collector only loses
// telemetry: exports fail quietly and the app carries on.
export const startTelemetry = (
  config: TelemetryConfig = telemetryConfig(),
  exporters?: TelemetryExporters,
): Telemetry => {
  if (!config.enabled && !exporters) return off;

  const resource = resourceFromAttributes({
    'service.name': config.serviceName,
  });

  const contextManager = new AsyncLocalStorageContextManager().enable();
  context.setGlobalContextManager(contextManager);

  const tracerProvider = new BasicTracerProvider({
    resource,
    sampler: new ParentBasedSampler({
      root: new TraceIdRatioBasedSampler(config.sampleRatio),
    }),
    spanProcessors: [
      exporters
        ? new SimpleSpanProcessor(exporters.spanExporter)
        : new BatchSpanProcessor(
            new OTLPTraceExporter({ url: `${config.endpoint}/v1/traces` }),
          ),
    ],
  });
  trace.setGlobalTracerProvider(tracerProvider);

  const meterProvider = new MeterProvider({
    resource,
    readers: [
      exporters?.metricReader ??
        new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            url: `${config.endpoint}/v1/metrics`,
          }),
        }),
    ],
  });
  metrics.setGlobalMeterProvider(meterProvider);

  return {
    // Flushes, then unregisters, so a test can start telemetry again.
    shutdown: async () => {
      await Promise.all([tracerProvider.shutdown(), meterProvider.shutdown()]);
      trace.disable();
      metrics.disable();
      context.disable();
    },
  };
};
