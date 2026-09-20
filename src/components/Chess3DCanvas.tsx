import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import {
  BOARD_THEMES,
  createPieceMesh,
  createBoardMesh,
  createHighlightOverlays,
  createMoveMarker,
  createLastMoveMarker,
  squareToWorld,
  worldToSquare,
  disposeHierarchy,
  clearPieceModelCache,
} from './PieceModels';
import { BoardTheme, CameraPreset } from '../types';
import { soundManager } from '../utils/audio';

interface Chess3DCanvasProps {
  game: Chess;
  themeId: string;
  cameraPreset: CameraPreset;
  selectedSquare: Square | null;
  validMoves: Move[];
  lastMove: { from: Square; to: Square } | null;
  onSquareClick: (square: Square) => void;
  isThinking: boolean;
  flipped: boolean;
}

interface PieceObject {
  id: string;
  square: Square;
  type: PieceSymbol;
  color: Color;
  group: THREE.Group;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  animating: boolean;
  animProgress: number;
  startPos: THREE.Vector3;
  liftHeight: number;
}

export const Chess3DCanvas: React.FC<Chess3DCanvasProps> = ({
  game,
  themeId,
  cameraPreset,
  selectedSquare,
  validMoves,
  lastMove,
  onSquareClick,
  isThinking,
  flipped,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  // 3D Objects
  const piecesMapRef = useRef<Map<string, PieceObject>>(new Map());
  const boardGroupRef = useRef<THREE.Group | null>(null);
  const highlightsRef = useRef<ReturnType<typeof createHighlightOverlays> | null>(null);
  
  // Interaction State
  const isDraggingRef = useRef(false);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const cameraAngleRef = useRef({ theta: 0, phi: 0.65, radius: 24 });
  const targetCameraPosRef = useRef(new THREE.Vector3(0, 16, 20));
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAtRef = useRef(new THREE.Vector3(0, 0, 0));
  const hoveredSquareRef = useRef<Square | null>(null);

  const theme = BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES[0];

  // Helper to get active theme
  const getTheme = useCallback(() => {
    return BOARD_THEMES.find((t) => t.id === themeId) || BOARD_THEMES[0];
  }, [themeId]);

  // Set camera angle based on preset or flipped state
  useEffect(() => {
    const radius = 24;
    let theta = 0;
    let phi = 0.68;
    let lookY = 0;

    switch (cameraPreset) {
      case 'white':
        theta = flipped ? Math.PI : 0;
        phi = 0.72;
        break;
      case 'black':
        theta = flipped ? 0 : Math.PI;
        phi = 0.72;
        break;
      case 'top':
        theta = flipped ? Math.PI : 0;
        phi = 0.04; // nearly directly top-down
        break;
      case 'isometric':
        theta = flipped ? (5 * Math.PI) / 4 : Math.PI / 4;
        phi = 0.85;
        break;
      case 'cinematic':
        theta = (3 * Math.PI) / 4;
        phi = 1.15; // Low dramatic view
        lookY = 1.2;
        break;
    }

    cameraAngleRef.current = { theta, phi, radius };
    
    // Calculate 3D position
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    targetCameraPosRef.current.set(x, y, z);
    targetLookAtRef.current.set(0, lookY, 0);
  }, [cameraPreset, flipped]);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.background);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 150);
    camera.position.set(0, 16, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(theme.ambientLight, 0.9);
    scene.add(ambientLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainDirLight.position.set(12, 22, 14);
    mainDirLight.castShadow = true;
    mainDirLight.shadow.mapSize.width = 2048;
    mainDirLight.shadow.mapSize.height = 2048;
    mainDirLight.shadow.camera.near = 0.5;
    mainDirLight.shadow.camera.far = 60;
    mainDirLight.shadow.camera.left = -14;
    mainDirLight.shadow.camera.right = 14;
    mainDirLight.shadow.camera.top = 14;
    mainDirLight.shadow.camera.bottom = -14;
    mainDirLight.shadow.bias = -0.0003;
    scene.add(mainDirLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.5);
    fillLight.position.set(-14, 15, -12);
    scene.add(fillLight);

    // Rim / contour backlight to highlight sculpted knight mane, bishop mitre, and king cross edges
    const rimLight = new THREE.DirectionalLight(0xfff1d6, 0.65);
    rimLight.position.set(0, 18, -18);
    scene.add(rimLight);

    const softPointLight = new THREE.PointLight(0xffecd2, 0.45, 28);
    softPointLight.position.set(0, 14, 0);
    scene.add(softPointLight);

    // Board
    const { boardGroup } = createBoardMesh(theme);
    boardGroupRef.current = boardGroup;
    scene.add(boardGroup);

    // Highlights
    const highlights = createHighlightOverlays();
    highlightsRef.current = highlights;
    scene.add(highlights.selectedMesh);
    scene.add(highlights.hoverMesh);
    scene.add(highlights.moveDotsGroup);
    scene.add(highlights.checkMesh);
    scene.add(highlights.lastMoveGroup);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera interpolation
      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCameraPosRef.current, 0.08);
        currentLookAtRef.current.lerp(targetLookAtRef.current, 0.08);
        cameraRef.current.lookAt(currentLookAtRef.current);
      }

      // Smooth piece movement animations
      piecesMapRef.current.forEach((pObj) => {
        if (pObj.animating) {
          pObj.animProgress += 0.07;
          if (pObj.animProgress >= 1) {
            pObj.animProgress = 1;
            pObj.animating = false;
            pObj.group.position.copy(pObj.targetPos);
          } else {
            const t = pObj.animProgress;
            // Arc interpolation
            const currentX = THREE.MathUtils.lerp(pObj.startPos.x, pObj.targetPos.x, t);
            const currentZ = THREE.MathUtils.lerp(pObj.startPos.z, pObj.targetPos.z, t);
            const arcY = Math.sin(t * Math.PI) * pObj.liftHeight;
            const currentY = THREE.MathUtils.lerp(pObj.startPos.y, pObj.targetPos.y, t) + arcY;
            pObj.group.position.set(currentX, currentY, currentZ);
          }
        }
      });

      // Subtle pulse on selected ring & check aura
      const time = Date.now() * 0.003;
      if (highlightsRef.current) {
        if (highlightsRef.current.selectedMesh.visible) {
          const s = 1 + Math.sin(time * 3) * 0.05;
          highlightsRef.current.selectedMesh.scale.set(s, s, s);
        }
        if (highlightsRef.current.checkMesh.visible) {
          const s = 1 + Math.sin(time * 4) * 0.08;
          highlightsRef.current.checkMesh.scale.set(s, s, s);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = newW / newH;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newW, newH);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (boardGroupRef.current) {
        disposeHierarchy(boardGroupRef.current);
      }
      piecesMapRef.current.forEach((oldObj) => {
        disposeHierarchy(oldObj.group);
      });
      clearPieceModelCache();
      renderer.dispose();
    };
  }, []);

  // Update theme dynamically
  useEffect(() => {
    if (!sceneRef.current || !boardGroupRef.current) return;
    const currentTheme = getTheme();
    sceneRef.current.background = new THREE.Color(currentTheme.background);

    // Rebuild board and dispose old board geometries
    sceneRef.current.remove(boardGroupRef.current);
    disposeHierarchy(boardGroupRef.current);
    clearPieceModelCache();
    const { boardGroup } = createBoardMesh(currentTheme);
    boardGroupRef.current = boardGroup;
    sceneRef.current.add(boardGroup);

    // Refresh all pieces with new theme materials
    syncPiecesToBoard(true);
  }, [themeId, getTheme]);

  // Synchronize 3D pieces with Chess.js board state
  const syncPiecesToBoard = useCallback(
    (forceRecreate: boolean = false) => {
      const scene = sceneRef.current;
      if (!scene) return;

      const currentTheme = getTheme();
      const board = game.board();
      const newPiecesMap = new Map<string, PieceObject>();

      // Track pieces on board
      const occupiedSquares = new Set<string>();

      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (!piece) continue;

          const square = `${String.fromCharCode(97 + f)}${8 - r}` as Square;
          occupiedSquares.add(square);
          const worldPos = squareToWorld(square);

          // Find existing piece object at or near this square
          let existingKey: string | null = null;
          let existingObj: PieceObject | null = null;

          if (!forceRecreate) {
            for (const [key, obj] of piecesMapRef.current.entries()) {
              if (obj.square === square && obj.type === piece.type && obj.color === piece.color) {
                existingKey = key;
                existingObj = obj;
                break;
              }
            }
          }

          if (existingObj && existingKey) {
            // Keep piece in place
            existingObj.targetPos.copy(worldPos);
            newPiecesMap.set(existingKey, existingObj);
            piecesMapRef.current.delete(existingKey);
          } else {
            // Check if piece moved here from another square (animate move)
            let movedKey: string | null = null;
            let movedObj: PieceObject | null = null;

            if (!forceRecreate) {
              for (const [key, obj] of piecesMapRef.current.entries()) {
                if (obj.type === piece.type && obj.color === piece.color && !obj.animating) {
                  movedKey = key;
                  movedObj = obj;
                  break;
                }
              }
            }

            if (movedObj && movedKey) {
              movedObj.square = square;
              movedObj.startPos.copy(movedObj.group.position);
              movedObj.targetPos.copy(worldPos);
              movedObj.animating = true;
              movedObj.animProgress = 0;
              movedObj.liftHeight = 1.4;
              newPiecesMap.set(movedKey, movedObj);
              piecesMapRef.current.delete(movedKey);
            } else {
              // Create brand new piece mesh
              const pieceGroup = createPieceMesh(piece.type, piece.color, currentTheme);
              pieceGroup.position.copy(worldPos);
              scene.add(pieceGroup);

              const id = `${piece.color}-${piece.type}-${square}-${Math.random().toString(36).substr(2, 6)}`;
              const pObj: PieceObject = {
                id,
                square,
                type: piece.type,
                color: piece.color,
                group: pieceGroup,
                currentPos: worldPos.clone(),
                targetPos: worldPos.clone(),
                startPos: worldPos.clone(),
                animating: false,
                animProgress: 1,
                liftHeight: 1.4,
              };

              newPiecesMap.set(id, pObj);
            }
          }
        }
      }

      // Remove captured pieces left over in piecesMapRef
      piecesMapRef.current.forEach((oldObj) => {
        scene.remove(oldObj.group);
        disposeHierarchy(oldObj.group);
      });

      piecesMapRef.current = newPiecesMap;
    },
    [game, getTheme]
  );

  // Sync board state when game changes
  useEffect(() => {
    syncPiecesToBoard(false);
  }, [game, syncPiecesToBoard]);

  // Update visual highlights (selected, legal moves, check, last move)
  useEffect(() => {
    const highlights = highlightsRef.current;
    if (!highlights) return;

    // Selected Square
    if (selectedSquare) {
      const pos = squareToWorld(selectedSquare);
      highlights.selectedMesh.position.set(pos.x, 0.02, pos.z);
      highlights.selectedMesh.visible = true;
    } else {
      highlights.selectedMesh.visible = false;
    }

    // Move Dots & Capture Rings
    highlights.moveDotsGroup.clear();
    validMoves.forEach((move) => {
      const targetPos = squareToWorld(move.to);
      const isCapture = !!move.captured;
      const marker = createMoveMarker(isCapture);
      marker.position.set(targetPos.x, 0.02, targetPos.z);
      highlights.moveDotsGroup.add(marker);
    });

    // Last Move Highlights
    highlights.lastMoveGroup.clear();
    if (lastMove) {
      const fromPos = squareToWorld(lastMove.from);
      const toPos = squareToWorld(lastMove.to);
      const fromMarker = createLastMoveMarker();
      fromMarker.position.set(fromPos.x, 0.012, fromPos.z);
      const toMarker = createLastMoveMarker();
      toMarker.position.set(toPos.x, 0.012, toPos.z);
      highlights.lastMoveGroup.add(fromMarker);
      highlights.lastMoveGroup.add(toMarker);
    }

    // King in Check Alert
    if (game.inCheck()) {
      const turn = game.turn();
      const board = game.board();
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const piece = board[r][f];
          if (piece && piece.type === 'k' && piece.color === turn) {
            const kingSquare = `${String.fromCharCode(97 + f)}${8 - r}`;
            const pos = squareToWorld(kingSquare);
            highlights.checkMesh.position.set(pos.x, 0.022, pos.z);
            highlights.checkMesh.visible = true;
            break;
          }
        }
      }
    } else {
      highlights.checkMesh.visible = false;
    }
  }, [selectedSquare, validMoves, lastMove, game]);

  // Raycaster for square and piece interactions
  const getSquareFromRaycast = useCallback(
    (clientX: number, clientY: number): Square | null => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), cameraRef.current);

      // Plane intersection with board ground (y = 0)
      const boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectionPoint = new THREE.Vector3();
      const hit = raycaster.ray.intersectPlane(boardPlane, intersectionPoint);

      if (hit) {
        return worldToSquare(intersectionPoint) as Square | null;
      }
      return null;
    },
    []
  );

  // Mouse & Touch Controls for Camera Orbit + Click Picking
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Check if dragging orbit
    if (e.buttons === 1 || e.buttons === 2) {
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDraggingRef.current = true;
        dragStartPosRef.current = { x: e.clientX, y: e.clientY };

        const { theta, phi, radius } = cameraAngleRef.current;
        const newTheta = theta - dx * 0.007;
        const newPhi = Math.max(0.12, Math.min(1.45, phi - dy * 0.007));
        cameraAngleRef.current = { theta: newTheta, phi: newPhi, radius };

        const x = radius * Math.sin(newPhi) * Math.sin(newTheta);
        const y = radius * Math.cos(newPhi);
        const z = radius * Math.sin(newPhi) * Math.cos(newTheta);
        targetCameraPosRef.current.set(x, y, z);
      }
    } else {
      // Hover detection on hover mesh
      const square = getSquareFromRaycast(e.clientX, e.clientY);
      if (square !== hoveredSquareRef.current) {
        hoveredSquareRef.current = square;
        if (highlightsRef.current) {
          if (square) {
            const pos = squareToWorld(square);
            highlightsRef.current.hoverMesh.position.set(pos.x, 0.015, pos.z);
            highlightsRef.current.hoverMesh.visible = true;
          } else {
            highlightsRef.current.hoverMesh.visible = false;
          }
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) {
      // Clean click on a square!
      const square = getSquareFromRaycast(e.clientX, e.clientY);
      if (square && !isThinking) {
        onSquareClick(square);
      }
    }
    isDraggingRef.current = false;
  };

  // Zoom / Pinch Scroll
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const { theta, phi, radius } = cameraAngleRef.current;
    const newRadius = Math.max(12, Math.min(42, radius + e.deltaY * 0.02));
    cameraAngleRef.current.radius = newRadius;

    const x = newRadius * Math.sin(phi) * Math.sin(theta);
    const y = newRadius * Math.cos(phi);
    const z = newRadius * Math.sin(phi) * Math.cos(theta);
    targetCameraPosRef.current.set(x, y, z);
  };

  return (
    <div
      id="chess-3d-viewport"
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing touch-none select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
    />
  );
};
