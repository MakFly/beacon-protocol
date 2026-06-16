/** Beacon protocol constants & small pure helpers shared across SDKs. */

export const BEACON_ATTR = {
  entryPointType: "beacon.entry_point.type",
  entryPointValue: "beacon.entry_point.value",
  handlerIdentifier: "beacon.entry_point.handler.identifier",
  handlerName: "beacon.entry_point.handler.name",
  handlerType: "beacon.entry_point.handler.type",
  spanType: "beacon.span_type",
  spanEventType: "beacon.span_event_type",
} as const;

export const SPAN_TYPE = {
  httpRequest: "http_request",
  httpClient: "http_client",
  dbQuery: "db_query",
  dbTransaction: "db_transaction",
  cache: "cache",
  messengerMessage: "messenger_message",
  consoleCommand: "console_command",
  render: "render",
  middleware: "middleware",
} as const;

/** Handler-type prefixes, per framework (PROTOCOL.md "Entry point"). */
export const HANDLER_TYPE = {
  symfonyController: "symfony_controller",
  symfonyCommand: "symfony_command",
  messengerHandler: "messenger_handler",
  nextRoute: "next_route",
  nextRsc: "next_rsc",
  nextAction: "next_action",
} as const;

/** OTel severity numbers (subset Beacon emits). */
export const SEVERITY = {
  TRACE: 1,
  DEBUG: 5,
  INFO: 9,
  WARN: 13,
  ERROR: 17,
  FATAL: 21,
} as const;

export type SeverityName = keyof typeof SEVERITY;

const SEVERITY_BANDS: Array<[number, SeverityName]> = [
  [21, "FATAL"],
  [17, "ERROR"],
  [13, "WARN"],
  [9, "INFO"],
  [5, "DEBUG"],
  [1, "TRACE"],
];

/** Map an OTel severityNumber back to its band name. */
export function severityName(n: number): SeverityName {
  for (const [floor, name] of SEVERITY_BANDS) if (n >= floor) return name;
  return "TRACE";
}

/** Current wall-clock time as a Unix-nanosecond string (ms precision, ns scale). */
export function nowUnixNano(nowMs: number = Date.now()): string {
  return (BigInt(Math.trunc(nowMs)) * 1_000_000n).toString();
}

/** Convert a hr-time-ish [seconds, nanos] pair to a UnixNano string. */
export function hrToUnixNano(seconds: number, nanos: number): string {
  return (BigInt(Math.trunc(seconds)) * 1_000_000_000n + BigInt(Math.trunc(nanos))).toString();
}
