import { expect, test, describe } from "bun:test";
import { severityName, nowUnixNano, hrToUnixNano, SEVERITY } from "./constants";
import { SpanStatusCode, type ErrorPayload, type TracePayload } from "./types";

describe("severityName", () => {
  test("maps numbers to bands", () => {
    expect(severityName(SEVERITY.INFO)).toBe("INFO");
    expect(severityName(17)).toBe("ERROR");
    expect(severityName(23)).toBe("FATAL");
    expect(severityName(1)).toBe("TRACE");
    expect(severityName(0)).toBe("TRACE");
    expect(severityName(14)).toBe("WARN");
  });
});

describe("unix-nano helpers", () => {
  test("nowUnixNano scales ms→ns and stays a precise string", () => {
    expect(nowUnixNano(1710252000000)).toBe("1710252000000000000");
  });
  test("hrToUnixNano composes seconds + nanos without float loss", () => {
    expect(hrToUnixNano(1710252000, 150000000)).toBe("1710252000150000000");
  });
});

describe("type shapes compile and accept valid payloads", () => {
  test("ErrorPayload", () => {
    const e: ErrorPayload = {
      resource: { "service.name": "iautos-api", "service.stage": "production" },
      seenAtUnixNano: nowUnixNano(1710252000000),
      exceptionClass: "App\\Exception\\PaymentFailed",
      message: "Card declined",
      handled: false,
      attributes: { "beacon.entry_point.type": "web", "http.request.method": "POST" },
      events: [],
      stacktrace: [
        { file: "src/Pay.php", lineNumber: 42, method: "charge", isApplicationFrame: true },
      ],
    };
    expect(e.stacktrace[0]!.lineNumber).toBe(42);
  });

  test("TracePayload with a root span", () => {
    const t: TracePayload = {
      resource: { "service.name": "iautos-api" },
      scopes: [
        {
          name: "beacon-sdk-php",
          version: "0.1.0",
          spans: [
            {
              traceId: "a".repeat(32),
              spanId: "b".repeat(16),
              parentSpanId: null,
              name: "POST /checkout",
              startTimeUnixNano: "1710252000000000000",
              endTimeUnixNano: "1710252000150000000",
              status: { code: SpanStatusCode.Ok },
              attributes: { "beacon.span_type": "http_request" },
              events: [],
            },
          ],
        },
      ],
    };
    expect(t.scopes[0]!.spans[0]!.status.code).toBe(SpanStatusCode.Ok);
  });
});
