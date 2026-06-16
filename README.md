# @makfly/beacon-protocol

Beacon wire-protocol — shared TypeScript **types + constants** for errors / traces / logs
telemetry. The single source of truth for the contract between the Beacon SDKs and the
ingester. Zero runtime dependencies, OTel-*aligned* flat JSON.

```bash
bun add @makfly/beacon-protocol
```

## Usage

```ts
import {
  BEACON_PROTOCOL_VERSION, // "v0"
  type StackFrame,
  HANDLER_TYPE,
  SpanStatusCode,
} from "@makfly/beacon-protocol";
```

Everything from `./types` and `./constants` is re-exported from the package root.

## What it is (and isn't)

- ✅ The wire contract: attribute keys, enums, payload shapes, protocol version.
- ❌ No transport, no buffering, no I/O — that lives in the SDKs
  (`@makfly/beacon-sdk-js`, `makfly/beacon-sdk-php`).

A **breaking change here is a MAJOR bump** and forces a republish of every downstream SDK.

## Versioning & release

SemVer. Tags are immutable. See [`CLAUDE.md`](./CLAUDE.md) for the full release workflow.

## License

MIT. Part of the [Beacon](https://github.com/MakFly) telemetry suite (developed in the
private `iautos-telemetry` monorepo, vendored here as a public package).
