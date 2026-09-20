# AI Assistant Context & Repository Guidelines (GEMINI.md)

This file provides system instructions, conventions, and operational context for Gemini models and Google AI Studio Coding Agents working on this project.

---

## 1. Project Identity & Architecture

- **App Name**: 3D Chess Live
- **Runtime**: Client-Side Single Page Application (SPA) built with React 18, TypeScript, and Vite.
- **Port**: Strictly binds to port `3000` on host `0.0.0.0` (as required by container ingress).
- **Core Stacks**:
  - Three.js (WebGL rendering without external asset loads).
  - chess.js (Rules enforcement & FEN serialization).
  - PeerJS (Client-to-client WebRTC data channels).
  - Tailwind CSS (Utility-first styling with dark mode aesthetics).

---

## 2. Agent Operational Directives

### 2.1 Preserving Procedural Assets
- **Do not introduce external 3D asset files** (e.g. `.gltf`, `.glb`, `.obj`). All 3D chess pieces are mathematically formed in `src/components/PieceModels.ts` using `LatheGeometry` and `ExtrudeGeometry`.
- **Do not add external audio sound files** (`.wav`, `.mp3`). All sound effects are generated at runtime via the Web Audio API synthesizer in `src/utils/audio.ts`.

### 2.2 Peer-to-Peer Multiplayer Protocol
- The application connects players across computers using **PeerJS WebRTC DataChannels**.
- Room IDs are formatted as `chess-3d-live-[CODE]`.
- If modifying message schemas in `src/types.ts`:
  - Always keep `MultiplayerMessage` backward-compatible.
  - Maintain the heartbeat ping mechanism in `src/utils/multiplayerPeer.ts`.
  - Maintain turn enforcement in `src/App.tsx` (`clickedPiece.color === multiplayer.roomState.myColor`).

### 2.3 Visual Design & Contrast Standards
- **Dark Canvas**: The application employs a refined, eye-safe neutral palette (`bg-neutral-950`, `bg-neutral-900`, `border-neutral-800`).
- **Typography**: Uses `Cinzel` for classical display headings and `Plus Jakarta Sans` / `JetBrains Mono` for body and notation.
- **No AI Slop**: Avoid neon glowing drop-shadows, arbitrary gradients, or nested card borders. Maintain strict WCAG AA contrast for text elements.

---

## 3. Extension Cookbooks

### How to Add a New 3D Board Theme
1. Open `src/types.ts` and add the theme identifier to `ThemeConfig`.
2. Update the themes definition in `src/components/Chess3DCanvas.tsx`:
   - Specify `lightSquareColor`, `darkSquareColor`, `boardBorderColor`, and piece material properties (`roughness`, `metalness`, `clearcoat`).
3. Add the theme option to `src/components/SettingsModal.tsx` for user selection.

### How to Add a New AI Difficulty Tier
1. Open `src/types.ts` and add the tier to `AIDifficulty`.
2. In `src/utils/aiBot.ts`:
   - Add the difficulty configuration to `AI_OPPONENTS` with search depth, evaluation heuristics, and randomness factors.
   - Adjust the minimax search depth in `getBestMove()`.

---

## 4. Verification Workflow
Always run the following commands before completing any code changes:
- `npm run lint` (runs `tsc --noEmit`)
- `npm run build` (verifies Vite static compilation)
