import {
  Attributes,
  context,
  SpanKind,
  SpanStatusCode,
  trace,
} from '@opentelemetry/api';
import { NextFunction, Request, Response } from 'express';

// What a signed-in request's passport user looks like to us: an admin's role
// is anything but 'user'.
interface SignedIn {
  id?: number;
  role?: string;
}

// One server span per request, named by method and route template, and made
// the active span for everything the request does. Ours rather than the http
// and Express auto-instrumentations, so the span carries only the allowlist
// (ADR 0002): method, route template, status code and the internal user or
// admin id. Never the URL, query values, headers, cookies or bodies.
// Install it before any other middleware so the span covers them, and guard
// rejections too.
export const httpSpans =
  () => (req: Request, res: Response, next: NextFunction) => {
    const span = trace.getTracer('envocc-card-api').startSpan(req.method, {
      kind: SpanKind.SERVER,
      attributes: { 'http.request.method': req.method },
    });

    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;

      // Set once a route matches; an unmatched request keeps just the method.
      const route = (req.route as { path?: unknown } | undefined)?.path;
      const user = req.user as SignedIn | undefined;
      const attributes: Attributes = {};
      // A request the client aborted has no status code to report.
      if (res.writableFinished) {
        attributes['http.response.status_code'] = res.statusCode;
      }
      if (typeof route === 'string') {
        attributes['http.route'] = route;
        span.updateName(`${req.method} ${route}`);
      }
      if (typeof user?.id === 'number') {
        attributes[user.role === 'user' ? 'user.id' : 'admin.id'] = user.id;
      }
      span.setAttributes(attributes);
      if (res.statusCode >= 500) span.setStatus({ code: SpanStatusCode.ERROR });
      span.end();
    };
    res.once('finish', end);
    res.once('close', end);

    context.with(trace.setSpan(context.active(), span), next);
  };
