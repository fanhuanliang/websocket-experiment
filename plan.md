# Echo Server — Plan

Five stages. Each stage is small enough to finish in one sitting and each teaches one concept. Don't skip ahead — stage 3's ping/pong won't feel meaningful unless stage 2's disconnect logs made me ask "how does the server know?"

## Stage 0 — Scaffold (~10 min)

- `npm init -y`
- `npm i ws`
- `.gitignore` for `node_modules/`
- Layout:
  ```
  websocket/
  ├── spec.md
  ├── plan.md
  ├── server.js
  └── public/
      └── index.html
  ```

**Teaches:** nothing yet — just a clean starting point.

## Stage 1 — Minimum echo (~30 min)

- `server.js`: an `http.createServer` that serves `public/index.html`, wrapped by `new WebSocketServer({ server })`. Same port for HTTP and WS.
- On `connection`, attach a `message` handler that does `ws.send('echo: ' + data)`.
- `public/index.html`: opens `new WebSocket('ws://localhost:8080')`, wires a textarea + button + log div.

**Checkpoint:** open DevTools → Network → WS tab. See the `101 Switching Protocols` response and the `Sec-WebSocket-Key`/`Sec-WebSocket-Accept` header pair. That's the handshake — read those two headers on MDN before moving on.

**Teaches:** the HTTP → WS upgrade; that a WebSocket is a persistent duplex channel, not request/response.

## Stage 2 — Multi-client + lifecycle logging (~30 min)

- Give each connection an id: `ws.id = 'c-' + crypto.randomBytes(2).toString('hex')`.
- Keep a `Set<WebSocket>` of live connections.
- On connect: send `{"type":"welcome","id":ws.id}` and log `connect c-xxxx`.
- On close: remove from set, log `close c-xxxx <code> <reason>`.
- Add `/all <text>` broadcast: iterate the set, `send` to each `ws.readyState === OPEN`.
- Add `GET /clients` returning `[...set].map(w => w.id)` as JSON.

**Checkpoint:** open two tabs. Close one via the browser's close button vs. by killing the tab process (Task Manager). Look at the close codes in your log — one is `1000` (normal), the other is `1006` (abnormal, no close frame received). That difference matters.

**Teaches:** many concurrent connections on one server; close codes; that graceful close is a frame the peer must actually send.

## Stage 3 — Heartbeat (~45 min)

The core lesson of this whole project. TCP will happily hold a connection open for hours after the peer's laptop lid closed. You need application-level liveness.

- On each new connection: `ws.isAlive = true; ws.on('pong', () => { ws.isAlive = true })`.
- `setInterval(30_000)`: for each `ws` in the set, if `!ws.isAlive` → `ws.terminate()` (skips the close handshake — the peer is gone anyway). Else set `ws.isAlive = false` and `ws.ping()`.
- Clear the interval on server shutdown so the process exits cleanly.

**Checkpoint:** connect a client. Toggle your Wi-Fi off (not close the tab — pull the network). Within ~60s the server should log a `1006` close. Toggle Wi-Fi back on and confirm the server did not see any packets in between.

**Teaches:** why apps need their own heartbeat; the difference between `close()` (sends close frame, waits) and `terminate()` (destroys socket now); why the `pong` handler is what proves liveness, not the last `message`.

## Stage 4 — Robust client (~30 min)

- Track state in one variable, render it as a pill: `connecting | open | closing | closed`.
- On unexpected close (not user-initiated), reconnect with backoff: `[1s, 2s, 4s, 8s, 16s, 30s, 30s, ...]`. Reset the counter on a successful `open`.
- Disable the input unless `state === 'open'`.
- Guard `send()`: if `readyState !== OPEN`, drop the message and log to the UI (don't crash, don't queue silently).

**Checkpoint:** with a client connected, `Ctrl-C` the server. Watch the client flip to `closed`, then `connecting`, then reconnect once you start the server again.

**Teaches:** the client's own state machine; that WebSocket is not "always connected" — real code always plans for reconnect.

## Stage 5 — Stretch (pick one, skip the rest)

- **Backpressure:** send 10,000 messages in a loop. Watch `ws.bufferedAmount` climb. Read what that means. Add a check that refuses new sends when it exceeds ~1 MB.
- **Binary frames:** add a "send file" button on the client that reads a small file as `ArrayBuffer` and sends it. Server logs the byte length. Reminds you that WS carries binary natively — no base64 needed.
- **Subprotocol negotiation:** on the client, pass a second arg: `new WebSocket(url, ['echo.v1'])`. On the server, accept it via `handleProtocols`. Send a v2 message from the client and have the server reject if the subprotocol doesn't match.

Stop when I can answer every question in `spec.md#Goal` without looking. That's the exit condition, not "all stages done."

## Cross-cutting notes

- Every stage ends by writing 2–3 sentences into `wiki/sources/websocket-echo-project.md` about what surprised me. That page becomes the primary source for `wiki/concepts/websocket.md` once I'm done.
- Don't reach for Socket.IO, even at stage 5. Once raw `ws` is boring, then Socket.IO's value (fallbacks, rooms, acks) becomes obvious. Right now it would just hide the protocol.
