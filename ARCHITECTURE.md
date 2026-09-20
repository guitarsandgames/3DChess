# Architecture Blueprint & Agent Comprehension Guide

This document is specifically tailored for **AI Coding Agents**, LLMs, and human systems engineers to rapidly understand the technical architecture, data contracts, and control flow of the **3D Chess** application.

---

## 1. System Architecture & Flow Diagram

The application adheres to a strict unidirectional data architecture decoupled across Three.js canvas rendering, state orchestration, chess rules evaluation, and peer-to-peer WebRTC signaling.

```
       +-------------------------------------------------------+
       |                  User Interactions                    |
       |  (3D Canvas Click / Drag, UI Buttons, Invite URL)     |
       +-------------------------------------------------------+
                                  |
                                  v
       +-------------------------------------------------------+
       |                       App.tsx                         |
       |        (Root Orchestrator & Turn Enforcement)         |
       +-------------------------------------------------------+
             /                     |                     \
            v                      v                      v
+-----------------------+ +---------------------+ +----------------------+
|    useChessGame.ts    | |   useChessClock.ts  | |   useMultiplayer.ts  |
|  (chess.js engine,    | |  (Active timers,    | | (PeerJS WebRTC,      |
|   move stack, FEN)    | |   timeout handlers) | |  packet dispatch)    |
+-----------------------+ +---------------------+ +----------------------+
            |                                                |
            v                                                v
+-----------------------+                         +----------------------+
|   Chess3DCanvas.tsx   |                         | multiplayerPeer.ts   |
| (Three.js WebGL Scene,|                         | (STUN P2P Channel,   |
|  Raycaster, Geometry) |                         |  Heartbeat Latency)  |
+-----------------------+                         +----------------------+
```

---

## 2. Core Modules Breakdown

### 2.1 State Orchestration (`src/App.tsx`)
- Coordinates the 3 primary custom hooks: `useChessGame`, `useChessClock`, and `useMultiplayer`.
- **Turn Enforcement**:
  - In `'ai'` mode: restricts user interactions when `turn !== playerColor`. Dispatches minimax evaluation in an asynchronous timeout block.
  - In `'multiplayer'` mode: enforces strict color locking (`turn === multiplayer.roomState.myColor`) and only permits piece selection of the player's assigned color.
  - In `'pass-and-play'` mode: allows alternating local inputs on the same device.
- **Deep Link Ingestion**: Scans `window.location.search` on mount for `?room=CODE` and automatically triggers the Multiplayer Join Modal.

### 2.2 Rules Engine (`src/hooks/useChessGame.ts`)
- Wraps the immutable rules engine from `chess.js`.
- Maintains FEN, history stack, captured pieces tally, check/checkmate flags, and legal move highlights.
- Handles pawn promotion via a deferred state (`pendingPromotion: { from, to, color }`), pausing board execution until the user selects their desired promotion piece.

### 2.3 3D Rendering Pipeline (`src/components/Chess3DCanvas.tsx` & `PieceModels.ts`)
- **Procedural Geometry Generation**:
  - `PieceModels.ts` uses `THREE.LatheGeometry` for symmetric bodies (Pawns, Rooks, Bishops, Kings, Queens) with spline path cross-sections.
  - Knights are formed with custom extruded polygons (`THREE.ExtrudeGeometry`) paired with lathe-turned pedestals.
  - Zero external GLTF/OBJ assets are required, ensuring instant rendering and zero CDN network failure points.
- **Raycasting**:
  - `THREE.Raycaster` identifies intersecting 3D squares and pieces on user pointer click.
  - Calculates Board-to-Algebraic coordinates (e.g. `[x, z] -> "e4"`).
- **GPU Memory Management**:
  - Reusable materials and geometries cached in module memory.
  - Recursive disposal (`disposeHierarchy`) invoked upon unmount to eliminate WebGL memory leaks.

### 2.4 Peer-to-Peer Networking (`src/utils/multiplayerPeer.ts` & `src/hooks/useMultiplayer.ts`)
- Leverages WebRTC DataChannels using `peerjs` over public Google and Twilio STUN servers (`stun:stun.l.google.com:19302`).
- **Room Code Scheme**: 6-character uppercase alphanumeric strings prefixed with `chess-3d-live-`.
- **Heartbeat & Latency**: Automatically fires `PING` packets every 4 seconds and measures delta timestamp on `PONG` to display live latency in milliseconds.

---

## 3. Data Contracts & Message Schemas

### 3.1 WebRTC Message Envelope (`src/types.ts`)

```typescript
export type MultiplayerMessageType =
  | 'INIT_GAME'       // Sent by Host when Guest connects
  | 'MOVE'            // Transmitted immediately upon legal move completion
  | 'SYNC_CLOCK'      // Clock state synchronization
  | 'RESIGN'          // Surrender notification
  | 'OFFER_DRAW'      // Draw proposal
  | 'ACCEPT_DRAW'     // Draw accepted
  | 'DECLINE_DRAW'    // Draw declined
  | 'RESTART_REQUEST' // Rematch request
  | 'RESTART_ACCEPT'  // Rematch accepted
  | 'PING'            // Heartbeat check
  | 'PONG';           // Heartbeat response

export interface MultiplayerMessage {
  type: MultiplayerMessageType;
  payload?: any;
  timestamp: number; // Unix epoch ms
}
```

### 3.2 Key Payloads

```typescript
export interface InitGamePayload {
  fen: string;
  timeControl: number; // In seconds (0 = untimed)
  hostColor: PlayerColor; // 'w' | 'b'
  guestColor: PlayerColor; // 'w' | 'b'
}

export interface MovePayload {
  from: Square; // e.g. "e2"
  to: Square;   // e.g. "e4"
  promotion?: PieceSymbol; // 'q' | 'r' | 'b' | 'n'
  san: string;  // e.g. "e4", "Nf3", "O-O"
}
```

---

## 4. AI Engine Evaluation Heuristics (`src/utils/aiBot.ts`)

The AI engine uses an optimized Minimax search with Alpha-Beta pruning:
1. **Material Weights**:
   - Pawn: 100, Knight: 320, Bishop: 330, Rook: 500, Queen: 900, King: 20000.
2. **Piece-Square Tables (PST)**:
   - Position-dependent scores encouraging center control for pawns/knights, early castling, and king safety in the opening/middlegame.
3. **Mobility & Checks**:
   - Scores total legal moves available to prevent cramped pieces.
   - Applies checks and checkmate bonuses.
4. **Transposition Table**:
   - Caches evaluated FEN subtrees with associated depths and scores to avoid redundant branch evaluations.

---

## 5. Audio Synthesizer (`src/utils/audio.ts`)

Audio is synthesized client-side via the Web Audio API without requiring `.mp3` or `.wav` network downloads:
- **Move Sound**: 120Hz sine pop decaying over 60ms.
- **Capture Sound**: 90Hz low triangle burst paired with white noise envelope.
- **Check Alarm**: 440Hz and 880Hz alternating dual-tone chime.
- **Victory Chime**: Major triad arpeggio (C5 -> E5 -> G5 -> C6).

---

## 6. Critical Agent Rules for Modification

1. **No External Asset Dependencies**: Do NOT introduce `.obj`, `.gltf`, or audio file URLs. All models and sounds must remain procedurally generated to avoid loading failures in sandbox iframe environments.
2. **Turn Safety**: When extending `App.tsx`, always verify that pieces cannot be manipulated out of turn or by the opponent in multiplayer mode.
3. **Three.js Memory Guard**: Always call `.dispose()` on any dynamically created geometries or materials when removing objects from the scene.
4. **Dependency Caution**: Never add server-side socket dependencies (e.g. Socket.io server); the application is designed to run statically or in serverless environments via peer-to-peer WebRTC.
