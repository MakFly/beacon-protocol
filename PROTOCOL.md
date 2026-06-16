# Beacon Wire Protocol — v0

The contract between Beacon SDKs (PHP, JS) and the Beacon ingester. **OTel-aligned but
Beacon-native**: span/trace envelope mirrors OpenTelemetry (`traceId`, `spanId`,
`parentSpanId`, `*UnixNano`), while attributes are plain flat JSON objects (not OTel
typed-value arrays) to keep the home-grown SDKs lean. An OTLP-compatibility adapter on
the ingester is a deferred, additive concern — it never changes this format.

## Endpoints

| Endpoint | Purpose | Auth key |
|---|---|---|
| `POST /v1/errors` | Exceptions: stacktrace + context + breadcrumbs | public or private |
| `POST /v1/traces` | Performance spans + span events | private only |
| `POST /v1/logs` | Structured log records, trace-correlated | private only |
| `POST /v1/sourcemaps` | JS sourcemaps for stacktrace resolution | private only |

### Headers

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-Beacon-Token` | project API token |
| `X-Beacon-Sdk` | `{language}/{version}` e.g. `php/0.1.0`, `js/0.1.0` |

### Responses

`202 Accepted` (queued) · `401` missing token · `403` invalid token · `422` validation
error `{ "message": ..., "errors": {...} }` · `429` rate-limit / spike-protection.

## Common concepts

### Attributes
A flat `Record<string, string | number | boolean | null | array | object>`. Resource and
scope attributes are merged into the same object on the consumer side. Send as much
context as is useful; the ingester censors sensitive keys server-side as a safety net.

### Resource
Identifies the emitting service. Standard keys:
`service.name` (`iautos-api` | `iautos-web`), `service.version`, `service.stage`
(`production`|`staging`|`dev`), `telemetry.sdk.name`, `telemetry.sdk.language`,
`telemetry.sdk.version`, `host.name`, `process.pid`, `git.revision`.

### Entry point
Every error / root span / correlated log describes the unit of work that started it.

| Attribute | Description |
|---|---|
| `beacon.entry_point.type` | `web` \| `cli` \| `queue` (default `web`) |
| `beacon.entry_point.value` | full URL (web), command line (cli), message class (queue) |
| `beacon.entry_point.handler.identifier` | groupable id: `GET /users/{id}`, command name, message class |
| `beacon.entry_point.handler.name` | controller / command / handler class, or null |
| `beacon.entry_point.handler.type` | framework-prefixed: `symfony_controller`, `symfony_command`, `messenger_handler`, `next_route`, `next_rsc`, `next_action` |

Two-pass resolution: set `type`+`value` when work starts, fill `handler.*` once routing
resolves it.

### Span types (`beacon.span_type`) and span-event types (`beacon.span_event_type`)
Set as an attribute on the span / event; stripped before display. Catalog (extensible):

| Type | Meaning |
|---|---|
| `http_request` | incoming request (root, web) |
| `http_client` | outgoing HTTP call |
| `db_query` | single SQL query (Doctrine) |
| `db_transaction` | transaction wrapping queries |
| `cache` | cache op (span event) |
| `messenger_message` | queued message handling (root, queue) |
| `console_command` | CLI command (root, cli) |
| `render` | template / RSC render |
| `middleware` | middleware execution |

## `/v1/errors` payload

```jsonc
{
  "resource": { "service.name": "iautos-api", "service.stage": "production", "...": "..." },
  "trackingUuid": "uuid-v4",            // optional, dedupe of a single occurrence
  "seenAtUnixNano": 1710252000000000000,
  "exceptionClass": "App\\Exception\\PaymentFailed",
  "message": "Card declined",
  "code": "402",                         // nullable, max 64
  "handled": false,                      // was it caught?
  "applicationPath": "/var/www",         // app root, for frame relativization
  "openFrameIndex": 0,                   // frame to focus in the UI
  "sourcemapVersionId": null,            // JS only
  "overriddenGrouping": null,            // see "grouping" below
  "attributes": { "beacon.entry_point.type": "web", "http.request.method": "POST", "...": "..." },
  "events": [                            // breadcrumbs: spans + span events leading to the error
    { "type": "db_query", "startTimeUnixNano": 1, "endTimeUnixNano": 2,
      "attributes": { "db.statement": "select ...", "db.system": "postgresql" } }
  ],
  "stacktrace": [
    { "file": "src/Payment/Pay.php", "lineNumber": 42, "method": "charge", "class": "App\\Pay",
      "isApplicationFrame": true,
      "codeSnippet": { "40": "...", "41": "...", "42": "throw ...", "43": "..." },
      "arguments": [ { "name": "amount", "value": 99.0, "original_type": "float",
                       "truncated": false } ] }
  ]
}
```

### Grouping / fingerprinting
The ingester computes a `fingerprint` to group identical errors. Defaults (from Flare's
proven approach):
- **PHP**: `stage + exceptionClass + first application frame (file:line)`
- **JS**: `stage + exceptionClass + message`

Message-based grouping is avoided by default (UUIDs/ids fragment one error into many).
`overriddenGrouping` lets the client force a strategy:
`exception_class` | `exception_message` | `exception_message_and_class` |
`full_stacktrace_and_exception_class_and_code`.

## `/v1/traces` payload (OTel-shaped envelope, flat attributes)

```jsonc
{
  "resource": { "service.name": "iautos-api", "...": "..." },
  "scopes": [
    {
      "name": "beacon-sdk-php", "version": "0.1.0",
      "spans": [
        {
          "traceId": "32-hex", "spanId": "16-hex", "parentSpanId": null,
          "name": "POST /checkout",
          "startTimeUnixNano": 1710252000000000000,
          "endTimeUnixNano":   1710252000150000000,
          "status": { "code": 0, "message": null },     // 0 Unset · 1 Ok · 2 Error
          "attributes": { "beacon.span_type": "http_request", "http.route": "/checkout",
                          "http.response.status_code": 200 },
          "events": [
            { "name": "cache hit", "timeUnixNano": 1710252000050000000,
              "attributes": { "beacon.span_event_type": "cache", "cache.result": "hit" } }
          ]
        }
      ]
    }
  ]
}
```

The root container span carries the `beacon.entry_point.*` attributes.

## `/v1/logs` payload (OTel-aligned log records)

```jsonc
{
  "resource": { "service.name": "iautos-api", "...": "..." },
  "records": [
    {
      "timeUnixNano": 1710252000000000000,
      "severityNumber": 9,            // OTel severity 1..24 (9 = INFO, 17 = ERROR)
      "severityText": "INFO",
      "body": "Order 123 paid",
      "traceId": "32-hex",            // optional correlation
      "spanId": "16-hex",             // optional correlation
      "attributes": { "order.id": 123, "beacon.entry_point.type": "web" }
    }
  ]
}
```

## `/v1/sourcemaps`
Multipart upload keyed by `sourcemapVersionId`; the ingester stores maps and resolves JS
frames at error-ingest time. (Spec detailed when sdk-js build reaches bundling.)

## Versioning
`v0` = pre-1.0, breaking changes allowed. The `X-Beacon-Sdk` header lets the ingester
branch on SDK version during migrations.
