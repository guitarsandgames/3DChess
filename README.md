# 3D Chess Live — Interactive WebGL Chess & Real-Time Multiplayer

A production-grade, full-featured 3D Chess application built with **React 18**, **TypeScript**, **Three.js**, **chess.js**, and **WebRTC (PeerJS)**. Features realistic 3D board rendering with procedural models, 6 AI difficulty tiers powered by minimax with alpha-beta pruning, and direct computer-to-computer multiplayer without requiring private server infrastructure.

---

## Features

### 🎮 3D WebGL Chessboard & Camera Engine
- **Procedural 3D Piece Models**: Mathematically modeled Staunton-style chess pieces generated using Three.js `LatheGeometry`, `ExtrudeGeometry`, and custom curves (zero external `.obj`/`.gltf` asset loading delays).
- **Custom Lighting & Dynamic Shadows**: Directional lighting with soft PCF shadow maps, ambient fills, and specular highlights.
- **Multiple Visual Themes**:
  - Classic Wood (Warm Oak & Dark Walnut)
  - Marble & Obsidian (Lustrous Stone with Reflections)
  - Midnight Glass (Frosted Translucent Acrylic)
  - Cyber Neon (High-Contrast Glowing Edge Aesthetic)
- **Fluid Camera Presets**:
  - White Perspective, Black Perspective, Top-Down Orthogonal, Side Cinematic, and Free-Orbit Controls.
  - Automatic board rotation based on assigned player color.

### 🌐 Peer-to-Peer Online Multiplayer (Computer-to-Computer)
- **Direct WebRTC DataChannels**: Play in real-time with friends on separate computers across the globe using `peerjs` with public STUN signaling.
- **Instant Room Generation**: 6-character room codes (e.g. `7X2M9K`) and one-click shareable join URLs (`?room=ROOM_CODE`).
- **Game State Synchronization**:
  - Live move transmission with chess notation (`SAN`).
  - Automatic perspective alignment (White or Black).
  - Strict turn locking: players can only touch and move pieces belonging to their assigned color.
  - Interactive In-Game Draw Offers, Resignations, Rematch Requests, and real-time Ping/Latency monitoring.

### 🤖 Intelligent Chess AI Engine (6 Tiers)
- Built-in heuristic engine utilizing **Alpha-Beta Minimax Search**, **Piece-Square Tables (PST)**, mobility bonuses, and a **Transposition Table** for caching evaluated positions:
  1. **Novice (Rating ~600)**: Casual random moves with basic capture awareness.
  2. **Casual (Rating ~1000)**: 1-ply search focusing on immediate material gains.
  3. **Intermediate (Rating ~1350)**: 2-ply search with piece-square positional tables.
  4. **Advanced (Rating ~1650)**: 3-ply minimax evaluating center control and king safety.
  5. **Expert (Rating ~1950)**: 4-ply minimax with aggressive alpha-beta cutoffs.
  6. **Master (Rating ~2250)**: Deep search with opening principles and quiescence heuristics.

### ⏱️ Clocks, Move Log, & Audio Engine
- **Chess Timers**: Blitz (3 min, 5 min), Rapid (10 min), or Untimed mode with delta time compensation.
- **Algebraic Move History**: Complete record of all moves with captured piece counters and material advantage calculations.
- **Zero-Asset Procedural Audio**: Built-in Web Audio API sound synthesizer generating authentic wooden clicks, capture thuds, check chimes, and victory fanfares.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React 18 with Vite |
| **Language** | TypeScript (Strict Mode) |
| **3D Rendering** | Three.js (WebGL Renderer, OrbitControls, PCF Soft Shadows) |
| **Rules Engine** | chess.js (Validation, FEN serialization, legal moves) |
| **Networking** | WebRTC via PeerJS (DataChannels, heartbeat latency check) |
| **Styling** | Tailwind CSS (Dark theme, accessible contrast) |
| **Icons** | Lucide React |
| **Audio** | Web Audio API (Procedural Oscillators & Gain Nodes) |

---

## Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Installation

```bash
# 1. Clone or extract repository
git clone <repo-url>
cd chess-3d

# 2. Install dependencies
npm install

# 3. Launch Vite development server (Port 3000)
npm run dev
```

The application will be running at `http://localhost:3000`.

---

## Available Scripts

- `npm run dev`: Starts the Vite development server with local proxy on port 3000.
- `npm run build`: Compiles TypeScript and produces production static assets in `dist/`.
- `npm run lint`: Validates the codebase using TypeScript compiler (`tsc --noEmit`).
- `npm run preview`: Previews the compiled production build locally.

---

## Architecture Overview

```
src/
├── components/             # UI and 3D Viewport Components
│   ├── Chess3DCanvas.tsx   # Three.js scene, raycaster, piece mesh cache, and lighting
│   ├── PieceModels.ts      # Procedural 3D geometry definitions for Staunton pieces
│   ├── GameHeader.tsx      # Top bar with multiplayer status, room ping, and modal triggers
│   ├── GameControls.tsx    # Floating camera presets toolbar
│   ├── MoveHistory.tsx     # Move logs, captured pieces, clock displays, and AI/P2P controls
│   ├── MultiplayerModal.tsx# Room creator, join code input, and shareable link generator
│   ├── PromotionModal.tsx  # Interactive pawn promotion dialog
│   ├── GameOverModal.tsx   # Victory / Draw announcements with rematch controls
│   ├── SettingsModal.tsx   # Theme selector, time controls, and game modes
│   └── RulesModal.tsx      # Chess rules and move guide
├── hooks/                  # Modular React Hooks
│   ├── useChessGame.ts     # Core chess rules, move history, validation, and state
│   ├── useChessClock.ts    # Dual chess clock with delta compensation
│   └── useMultiplayer.ts   # WebRTC room lifecycle, packet handlers, and state
├── utils/                  # Domain Utilities
│   ├── aiBot.ts            # Minimax engine, evaluation tables, and search algorithms
│   ├── audio.ts            # Web Audio API sound effects synthesizer
│   └── multiplayerPeer.ts  # PeerJS client service, room code generator, and ping tracking
├── types.ts                # Shared TypeScript types, data contracts, and schemas
└── App.tsx                 # Root application coordinator and turn-lock orchestrator
```

---

## Multiplayer Usage Guide

1. **Host a Match**:
   - Click **Play Online** in the top navigation bar.
   - Choose your side (White, Black, or Random) and preferred Time Control.
   - Click **Generate Room Code**.
   - Copy the 6-character room code or click **Copy Share Link**.
2. **Join a Match**:
   - Send the link to a friend on another computer.
   - When opened, the friend will connect directly to your session via WebRTC.
   - The game will automatically synchronize board positions, clocks, and turns.

---

## License
Apache-2.0
