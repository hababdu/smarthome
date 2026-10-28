# SmartHome repair report — 2026-10-28

## Applied in this revision

- API authentication now rejects missing/invalid bearer tokens; the server refuses to start without an `API_TOKEN` of at least 24 characters.
- Added constant-time token comparison for HTTP requests.
- Added short-lived, single-use WebSocket tickets instead of sending the long-lived token in the WebSocket URL.
- Reduced JSON request body limits and added input checks/rate limits to sensitive endpoints.
- Added validation for device power requests, simulator spike values, tariff values, voice input, schedule times/actions/device IDs/weekdays, and duplicate schedules.
- Device UI state is no longer changed optimistically by the device power endpoint; the backend waits for device telemetry and reports timeout/publish/offline statuses.
- Protected essential devices from routine API power-off commands.
- Embedded MQTT broker remains loopback-only by default; added MQTT username/password support for an external broker client.
- Simulator defaults to disabled unless `SIMULATE=true` is explicitly configured.
- Added firmware MQTT credential placeholders and fail-safe relay-off behavior during MQTT reconnection.
- Energy integration now skips large sampling gaps instead of guessing consumption and correctly integrates at reporting-window boundaries.
- Improved Russian time-of-day parsing and voice-command error handling; ambiguous multi-device commands request clarification.
- Added debounced atomic JSON persistence and shutdown flush.
- Added tests for schedule validation, energy gaps/window boundaries, and Russian time parsing.
- Updated setup/security instructions in README.

## Verification completed

- `node --test backend/test/*.test.js`: 13 tests passed.
- `node --check` on backend source/test/demo JavaScript files: passed.

## Not verified in this environment

- Full React/Vite production build: dependencies were not installed; package installation timed out.
- Flutter analyzer/build: Flutter SDK is not available in this environment.
- Live API/MQTT/WebSocket integration: dependencies and a broker were not available for end-to-end execution.
- ESP32 firmware compilation, sensor calibration, relay polarity and mains-voltage safety: hardware toolchain/lab testing not performed.

## Required before internet/production deployment

1. Replace the shared browser/mobile API token scheme with per-user login, server-side sessions or short-lived user tokens, and role-based authorization. `VITE_API_TOKEN` is bundled into the browser and is not a secret.
2. Configure an authenticated MQTT broker with topic ACLs and TLS. The current ESP32 sample uses plain MQTT and must not be used across untrusted networks.
3. Add end-to-end integration tests and hardware-in-the-loop tests.
4. Have a qualified electrician verify relay ratings, fusing, RCD/MCB protection, sensor calibration and fail-safe behavior.
5. Consider moving JSON persistence to SQLite/PostgreSQL for multi-user/multi-process deployments.
