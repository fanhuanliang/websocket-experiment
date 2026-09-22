# Echo Server — Spec

A minimal WebSocket echo server built to learn the protocol end-to-end. Every feature is chosen because it exposes a WebSocket concept that a plain HTTP tutorial would hide.

## Goal

By the end I should be able to answer, without looking:

- What a WebSocket handshake is and how it upgrades from HTTP
- The difference between a message frame and a TCP packet
- Why `ping`/`pong` exists and who sends them
- What close codes mean and how graceful vs abrupt disconnect differs
- How to detect a dead peer that never sent `close`
- How backpressure shows up on a WebSocket (`bufferedAmount`)

## Stack

- **Server:** Node.js + [`ws`](https://github.com/websockets/ws). Raw `ws`, not Socket.IO — Socket.IO hides the protocol behind fallbacks and its own frame format.
- **Client:** vanilla HTML + browser-native `WebSocket` API. No React. The learning surface is the protocol, not framework state.
- **No DB.** In-memory client set is enough.
- **No auth.** Localhost only.

## Functional requirements

1. Server listens on `ws://localhost:8080`.
2. Any text message a client sends is echoed back to that same client, prefixed with `echo: `.
3. Server assigns each connection a short id (e.g. `c-4a2f`) and sends `{"type":"welcome","id":"c-4a2f"}` on connect.
4. Server logs to stdout: `connect <id>`, `msg <id> <bytes>`, `close <id> <code> <reason>`.
5. Server sends a WebSocket `ping` every 30s. If a client misses two `pong`s in a row, server terminates the socket (not a graceful close — that's the point).
6. `/clients` HTTP endpoint on the same port returns a JSON list of connected client ids. This tests that HTTP and WS coexist on one port.
7. Broadcast mode: any message starting with `/all ` is echoed to *every* connected client instead of just the sender. This forces me to keep a client set and think about the fan-out.
8. Client page shows: a message log, an input, a connection state pill (`connecting | open | closing | closed`), and a "Send" button. Input is disabled unless state is `open`.
9. Client auto-reconnects with exponential backoff (1s, 2s, 4s, capped at 30s) after an unexpected close.

## Non-goals

- TLS (`wss://`). Skip until this all works over `ws://`.
- Framework client (React/Vue). Don't dilute the protocol.
- Persistence. Nothing survives a restart.
- Rooms, presence, typing indicators. Those are chat-app features, not protocol features.
- Deployment. Runs on my machine.

## Success criteria

I can open two browser tabs, send `/all hello` from tab A, and see it echoed in both tabs. I can kill Wi-Fi on the client, watch the server detect the dead peer within ~60s via the ping timeout, and reconnect cleanly when Wi-Fi returns.
