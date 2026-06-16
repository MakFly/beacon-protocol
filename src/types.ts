/**
 * Beacon wire-protocol — shared TypeScript contract (v0).
 *
 * OTel-aligned envelope (traceId/spanId/parentSpanId, *UnixNano) with Beacon-native
 * flat attribute maps. Mirrors PROTOCOL.md. The PHP SDK implements the same shapes.
 */

/** A flat attribute value. Nested arrays/objects are allowed but kept shallow. */
export type AttributeValue =
  | string
  | number
  | boolean
  | null
  | AttributeValue[]
  | { [key: string]: AttributeValue };

export type Attributes = Record<string, AttributeValue>;

/** Unix timestamp in nanoseconds, carried as a string to survive >2^53 in JSON. */
export type UnixNano = string;

export type EntryPointType = "web" | "cli" | "queue";

export type ServiceStage = "production" | "staging" | "dev";

/** Identifies the emitting service. Merged into the flat attribute space downstream. */
export interface Resource {
  "service.name": string;
  "service.version"?: string;
  "service.stage"?: ServiceStage;
  "telemetry.sdk.name"?: string;
  "telemetry.sdk.language"?: string;
  "telemetry.sdk.version"?: string;
  [key: string]: AttributeValue | undefined;
}

/* ─────────────────────────── Errors ─────────────────────────── */

export type GroupingStrategy =
  | "exception_class"
  | "exception_message"
  | "exception_message_and_class"
  | "full_stacktrace_and_exception_class_and_code";

export interface StackFrameArgument {
  name: string;
  value: AttributeValue;
  original_type?: string;
  passed_by_reference?: boolean;
  is_variadic?: boolean;
  truncated?: boolean;
}

export interface StackFrame {
  file: string;
  lineNumber: number;
  columnNumber?: number;
  method?: string | null;
  class?: string | null;
  /** Source lines keyed by their line number, for the focused frame context. */
  codeSnippet?: Record<string, string> | null;
  arguments?: StackFrameArgument[] | null;
  isApplicationFrame?: boolean;
}

/** A breadcrumb entry on an error: a finished span or a point-in-time span event. */
export interface ErrorEvent {
  type: string;
  startTimeUnixNano: UnixNano;
  /** null for point-in-time span events. */
  endTimeUnixNano?: UnixNano | null;
  attributes: Attributes;
}

export interface ErrorPayload {
  resource: Resource;
  trackingUuid?: string | null;
  seenAtUnixNano: UnixNano;
  exceptionClass?: string | null;
  message?: string | null;
  code?: string | null;
  handled?: boolean | null;
  applicationPath?: string | null;
  openFrameIndex?: number | null;
  sourcemapVersionId?: string | null;
  overriddenGrouping?: GroupingStrategy | null;
  attributes: Attributes;
  events: ErrorEvent[];
  stacktrace: StackFrame[];
}

/* ─────────────────────────── Traces ─────────────────────────── */

export enum SpanStatusCode {
  Unset = 0,
  Ok = 1,
  Error = 2,
}

export interface SpanStatus {
  code: SpanStatusCode;
  message?: string | null;
}

export interface SpanEvent {
  name: string;
  timeUnixNano: UnixNano;
  attributes: Attributes;
}

export interface Span {
  traceId: string; // 32 lowercase hex
  spanId: string; // 16 lowercase hex
  parentSpanId: string | null;
  name: string;
  startTimeUnixNano: UnixNano;
  endTimeUnixNano: UnixNano;
  status: SpanStatus;
  attributes: Attributes;
  events: SpanEvent[];
}

export interface InstrumentationScope {
  name: string;
  version: string;
  spans: Span[];
}

export interface TracePayload {
  resource: Resource;
  scopes: InstrumentationScope[];
}

/* ─────────────────────────── Logs ─────────────────────────── */

/** OTel severity number ranges: 1-4 TRACE, 5-8 DEBUG, 9-12 INFO, 13-16 WARN, 17-20 ERROR, 21-24 FATAL. */
export type SeverityNumber = number;

export interface LogRecord {
  timeUnixNano: UnixNano;
  severityNumber: SeverityNumber;
  severityText: string;
  body: string;
  traceId?: string | null;
  spanId?: string | null;
  attributes: Attributes;
}

export interface LogPayload {
  resource: Resource;
  records: LogRecord[];
}

/* ─────────────────────────── Envelope union ─────────────────────────── */

export type BeaconEndpoint = "errors" | "traces" | "logs" | "sourcemaps";

export interface BeaconPayloadMap {
  errors: ErrorPayload;
  traces: TracePayload;
  logs: LogPayload;
}
