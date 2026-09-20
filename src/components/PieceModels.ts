import * as THREE from 'three';
import { PieceSymbol, Color } from 'chess.js';
import { BoardTheme } from '../types';

export const BOARD_SIZE = 8;
export const SQUARE_SIZE = 2.0;
export const HALF_BOARD = (BOARD_SIZE * SQUARE_SIZE) / 2;

// Convert algebraic chess square (e.g. 'e4') to 3D world coordinates
export function squareToWorld(square: string): THREE.Vector3 {
  const file = square.charCodeAt(0) - 97; // 0..7 (a..h) -> x
  const rank = parseInt(square[1], 10) - 1; // 0..7 (1..8) -> z (rank 1 is bottom/white side)

  const x = (file - 3.5) * SQUARE_SIZE;
  const z = (3.5 - rank) * SQUARE_SIZE; // White (rank 1) at positive Z, Black (rank 8) at negative Z
  return new THREE.Vector3(x, 0, z);
}

// Convert 3D world coordinates back to algebraic square
export function worldToSquare(position: THREE.Vector3): string | null {
  const file = Math.round(position.x / SQUARE_SIZE + 3.5);
  const rank = Math.round(3.5 - position.z / SQUARE_SIZE);

  if (file >= 0 && file < 8 && rank >= 0 && rank < 8) {
    return `${String.fromCharCode(97 + file)}${rank + 1}`;
  }
  return null;
}

// Board & Piece Themes
export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'classic-wood',
    name: 'Classic Walnut & Oak',
    lightSquare: 0xd7b889,
    darkSquare: 0x6e4726,
    lightPiece: 0xf5ebd7,
    darkPiece: 0x2b1d0c,
    boardBorder: 0x3d2314,
    feltColor: 0x1e3a1e,
    pieceRoughness: 0.32,
    pieceMetalness: 0.08,
    boardRoughness: 0.42,
    ambientLight: 0xffffff,
    background: '#121110',
  },
  {
    id: 'marble-obsidian',
    name: 'Carrara Marble & Obsidian',
    lightSquare: 0xe8e8e8,
    darkSquare: 0x222629,
    lightPiece: 0xf8f9fa,
    darkPiece: 0x141517,
    boardBorder: 0x111315,
    feltColor: 0x0f172a,
    pieceRoughness: 0.16,
    pieceMetalness: 0.22,
    boardRoughness: 0.2,
    ambientLight: 0xf0f4ff,
    background: '#0a0d12',
  },
  {
    id: 'emerald-luxury',
    name: 'Imperial Jade & Gold',
    lightSquare: 0xe6dfcc,
    darkSquare: 0x24513b,
    lightPiece: 0xf6f0e4,
    darkPiece: 0x153225,
    boardBorder: 0x14281f,
    feltColor: 0x064e3b,
    pieceRoughness: 0.22,
    pieceMetalness: 0.32,
    boardRoughness: 0.28,
    ambientLight: 0xfdfaf2,
    background: '#091510',
  },
  {
    id: 'cyber-neon',
    name: 'Midnight & Titanium',
    lightSquare: 0x3b4252,
    darkSquare: 0x1f232a,
    lightPiece: 0x88c0d0,
    darkPiece: 0x434c5e,
    boardBorder: 0x16181d,
    feltColor: 0x2e3440,
    pieceRoughness: 0.18,
    pieceMetalness: 0.65,
    boardRoughness: 0.22,
    ambientLight: 0xd8dee9,
    background: '#0b0e14',
  },
];

// Global geometry & material pools for maximum performance & WebGL memory efficiency
const materialCache = new Map<string, THREE.Material>();
const geometryCache = new Map<string, THREE.BufferGeometry>();

export function clearPieceModelCache(): void {
  materialCache.forEach((mat) => mat.dispose());
  materialCache.clear();
  geometryCache.forEach((geo) => geo.dispose());
  geometryCache.clear();
}

// Deep hierarchy disposal utility to prevent WebGL VRAM leaks
export function disposeHierarchy(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      if (child.geometry) {
        let isShared = false;
        for (const sharedGeo of geometryCache.values()) {
          if (sharedGeo === child.geometry) {
            isShared = true;
            break;
          }
        }
        if (!isShared) {
          child.geometry.dispose();
        }
      }
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          let isShared = false;
          for (const sharedMat of materialCache.values()) {
            if (sharedMat === m) {
              isShared = true;
              break;
            }
          }
          if (!isShared) {
            m.dispose();
          }
        });
      }
    }
  });
}

function getOrCreateGeometry<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
  if (!geometryCache.has(key)) {
    geometryCache.set(key, factory());
  }
  return geometryCache.get(key) as T;
}

function getOrCreateLatheGeometry(
  key: string,
  points: [number, number][],
  segments = 36
): THREE.LatheGeometry {
  if (!geometryCache.has(key)) {
    const v2Points = points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
    const geo = new THREE.LatheGeometry(v2Points, segments);
    geo.computeVertexNormals();
    geometryCache.set(key, geo);
  }
  return geometryCache.get(key) as THREE.LatheGeometry;
}

function createLatheMesh(
  key: string,
  points: [number, number][],
  material: THREE.Material,
  segments = 36
): THREE.Mesh {
  const geo = getOrCreateLatheGeometry(key, points, segments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Get luxury accent color based on theme
function getThemeAccentColor(theme: BoardTheme): number {
  switch (theme.id) {
    case 'classic-wood':
      return 0xd4af37; // Warm polished brass / gold
    case 'marble-obsidian':
      return 0xdbeafe; // Platinum / ice chrome
    case 'emerald-luxury':
      return 0xf59e0b; // Imperial gold
    case 'cyber-neon':
      return 0x38bdf8; // Cyan titanium
    default:
      return 0xd4af37;
  }
}

function getMainMaterial(theme: BoardTheme, color: Color): THREE.MeshStandardMaterial {
  const key = `main_${theme.id}_${color}`;
  if (!materialCache.has(key)) {
    const pieceColor = color === 'w' ? theme.lightPiece : theme.darkPiece;
    const mat = new THREE.MeshStandardMaterial({
      color: pieceColor,
      roughness: theme.pieceRoughness,
      metalness: theme.pieceMetalness,
    });
    materialCache.set(key, mat);
  }
  return materialCache.get(key) as THREE.MeshStandardMaterial;
}

function getAccentMaterial(theme: BoardTheme): THREE.MeshStandardMaterial {
  const key = `accent_${theme.id}`;
  if (!materialCache.has(key)) {
    const mat = new THREE.MeshStandardMaterial({
      color: getThemeAccentColor(theme),
      roughness: 0.2,
      metalness: 0.85,
    });
    materialCache.set(key, mat);
  }
  return materialCache.get(key) as THREE.MeshStandardMaterial;
}

function getFeltMaterial(theme: BoardTheme): THREE.MeshBasicMaterial {
  const key = `felt_${theme.id}`;
  if (!materialCache.has(key)) {
    const mat = new THREE.MeshBasicMaterial({ color: theme.feltColor });
    materialCache.set(key, mat);
  }
  return materialCache.get(key) as THREE.MeshBasicMaterial;
}

// Factory for high-detail tournament Staunton pieces
export function createPieceMesh(
  type: PieceSymbol,
  color: Color,
  theme: BoardTheme
): THREE.Group {
  const group = new THREE.Group();

  const mainMaterial = getMainMaterial(theme, color);
  const accentMaterial = getAccentMaterial(theme);
  const feltMat = getFeltMaterial(theme);

  // Base felt bottom
  const baseFeltRadius = type === 'k' ? 0.7 : type === 'q' ? 0.66 : 0.62;
  const feltGeo = getOrCreateGeometry(`felt_geo_${baseFeltRadius}`, () =>
    new THREE.CircleGeometry(baseFeltRadius, 32)
  );
  const felt = new THREE.Mesh(feltGeo, feltMat);
  felt.rotation.x = -Math.PI / 2;
  felt.position.y = 0.005;
  group.add(felt);

  switch (type) {
    case 'p': {
      // PAWN (Full Staunton lathe profile: multi-tier pedestal, waisted stem, astragal collar, dome head, pip)
      const pawnProfile: [number, number][] = [
        [0, 0],
        [0.64, 0],
        [0.64, 0.07],
        [0.61, 0.08],
        [0.55, 0.13],
        [0.58, 0.19],
        [0.50, 0.25],
        [0.42, 0.32],
        [0.35, 0.42],
        [0.27, 0.58],
        [0.22, 0.74],
        [0.20, 0.88],
        [0.22, 0.98],
        [0.26, 1.04],
        [0.34, 1.07],
        [0.36, 1.11],
        [0.31, 1.14],
        [0.22, 1.16],
        [0.24, 1.22],
        [0.27, 1.32],
        [0.28, 1.42],
        [0.26, 1.52],
        [0.19, 1.61],
        [0.10, 1.67],
        [0.05, 1.69],
        [0.07, 1.71],
        [0.08, 1.74],
        [0.05, 1.77],
        [0, 1.78],
      ];

      const pawnMesh = createLatheMesh('pawn_profile', pawnProfile, mainMaterial, 36);
      group.add(pawnMesh);

      // Subtle gold accent ring on the collar
      const collarRingGeo = getOrCreateGeometry('pawn_collar_ring', () =>
        new THREE.TorusGeometry(0.33, 0.02, 16, 32)
      );
      const collarRing = new THREE.Mesh(collarRingGeo, accentMaterial);
      collarRing.rotation.x = Math.PI / 2;
      collarRing.position.y = 1.09;
      collarRing.castShadow = true;
      group.add(collarRing);
      break;
    }

    case 'r': {
      // ROOK (Staunton Castle: sculpted fortress column, capital corbels, 4-crenellation merlons, inner parapet)
      const rookProfile: [number, number][] = [
        [0, 0],
        [0.68, 0],
        [0.68, 0.08],
        [0.64, 0.09],
        [0.58, 0.15],
        [0.62, 0.21],
        [0.53, 0.27],
        [0.46, 0.34],
        [0.44, 0.44],
        [0.40, 0.68],
        [0.37, 0.92],
        [0.36, 1.12],
        [0.41, 1.20],
        [0.46, 1.27],
        [0.53, 1.34],
        [0.57, 1.42],
        [0.56, 1.48],
        [0.43, 1.48],
        [0.43, 1.40],
        [0, 1.40],
      ];

      const rookBody = createLatheMesh('rook_profile', rookProfile, mainMaterial, 36);
      group.add(rookBody);

      // 4 Castle Crenellations (Merlons) with beveled chamfers
      const merlonCount = 4;
      const merlonRadius = 0.49;
      const merlonHeight = 0.36;
      const merlonGeo = getOrCreateGeometry('rook_merlon', () =>
        new THREE.BoxGeometry(0.24, merlonHeight, 0.14)
      );

      for (let i = 0; i < merlonCount; i++) {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const merlon = new THREE.Mesh(merlonGeo, mainMaterial);
        merlon.position.set(
          Math.cos(angle) * merlonRadius,
          1.48 + merlonHeight / 2,
          Math.sin(angle) * merlonRadius
        );
        merlon.rotation.y = -angle;
        merlon.castShadow = true;
        merlon.receiveShadow = true;
        group.add(merlon);
      }

      // Parapet rim band
      const rimBandGeo = getOrCreateGeometry('rook_rim_band', () =>
        new THREE.TorusGeometry(0.55, 0.025, 16, 36)
      );
      const rimBand = new THREE.Mesh(rimBandGeo, accentMaterial);
      rimBand.rotation.x = Math.PI / 2;
      rimBand.position.y = 1.42;
      group.add(rimBand);

      // Lookout turret center dome
      const innerCoreGeo = getOrCreateGeometry('rook_inner_core', () =>
        new THREE.SphereGeometry(0.16, 16, 16)
      );
      const innerCore = new THREE.Mesh(innerCoreGeo, mainMaterial);
      innerCore.position.y = 1.44;
      group.add(innerCore);
      break;
    }

    case 'n': {
      // KNIGHT (Hand-Carved Staunton Steed: sculpted pedestal, arched muscular neck, muzzle, nostrils, jaw, eye sockets, serrated mane, alert ears)
      // 1. Pedestal Base
      const knightBaseProfile: [number, number][] = [
        [0, 0],
        [0.66, 0],
        [0.66, 0.08],
        [0.62, 0.10],
        [0.55, 0.16],
        [0.59, 0.22],
        [0.51, 0.28],
        [0.44, 0.36],
        [0.41, 0.44],
        [0.38, 0.50],
        [0, 0.50],
      ];
      const knightBase = createLatheMesh('knight_base_profile', knightBaseProfile, mainMaterial, 36);
      group.add(knightBase);

      // 2. Muscular Chest / Breast
      const chestGeo = getOrCreateGeometry('knight_chest', () => {
        const geo = new THREE.SphereGeometry(0.44, 24, 24);
        geo.scale(0.85, 1.2, 1.05);
        return geo;
      });
      const chest = new THREE.Mesh(chestGeo, mainMaterial);
      chest.position.set(0, 0.88, 0.06);
      chest.castShadow = true;
      group.add(chest);

      // 3. Arched Neck
      const neckGeo = getOrCreateGeometry('knight_neck', () => {
        const geo = new THREE.CylinderGeometry(0.3, 0.42, 0.8, 20);
        geo.scale(0.8, 1.0, 1.15);
        return geo;
      });
      const neck = new THREE.Mesh(neckGeo, mainMaterial);
      neck.position.set(0, 1.15, -0.06);
      neck.rotation.x = 0.35;
      neck.castShadow = true;
      group.add(neck);

      // 4. Head & Brow Structure
      const headGeo = getOrCreateGeometry('knight_head', () =>
        new THREE.BoxGeometry(0.36, 0.44, 0.52)
      );
      const head = new THREE.Mesh(headGeo, mainMaterial);
      head.position.set(0, 1.50, 0.12);
      head.rotation.x = -0.36;
      head.castShadow = true;
      group.add(head);

      // 5. Tapered Muzzle / Snout
      const snoutGeo = getOrCreateGeometry('knight_snout', () => {
        const geo = new THREE.CylinderGeometry(0.18, 0.26, 0.42, 16);
        geo.scale(0.85, 1.0, 1.1);
        return geo;
      });
      const snout = new THREE.Mesh(snoutGeo, mainMaterial);
      snout.position.set(0, 1.34, 0.40);
      snout.rotation.x = 0.95;
      snout.castShadow = true;
      group.add(snout);

      // 6. Sculpted Nostrils
      const nostrilGeo = getOrCreateGeometry('knight_nostril', () =>
        new THREE.SphereGeometry(0.045, 12, 12)
      );
      const nostrilL = new THREE.Mesh(nostrilGeo, accentMaterial);
      nostrilL.position.set(-0.09, 1.26, 0.56);
      group.add(nostrilL);

      const nostrilR = new THREE.Mesh(nostrilGeo, accentMaterial);
      nostrilR.position.set(0.09, 1.26, 0.56);
      group.add(nostrilR);

      // 7. Defined Jaw Mandibles
      const jawGeo = getOrCreateGeometry('knight_jaw', () => {
        const geo = new THREE.SphereGeometry(0.16, 16, 16);
        geo.scale(0.6, 1.0, 1.2);
        return geo;
      });
      const jawL = new THREE.Mesh(jawGeo, mainMaterial);
      jawL.position.set(-0.16, 1.38, 0.05);
      group.add(jawL);

      const jawR = new THREE.Mesh(jawGeo, mainMaterial);
      jawR.position.set(0.16, 1.38, 0.05);
      group.add(jawR);

      // 8. Eyes & Brow Ridges
      const eyeGeo = getOrCreateGeometry('knight_eye', () =>
        new THREE.SphereGeometry(0.045, 12, 12)
      );
      const eyeL = new THREE.Mesh(eyeGeo, accentMaterial);
      eyeL.position.set(-0.17, 1.54, 0.24);
      group.add(eyeL);

      const eyeR = new THREE.Mesh(eyeGeo, accentMaterial);
      eyeR.position.set(0.17, 1.54, 0.24);
      group.add(eyeR);

      // 9. Pointed Horse Ears with Cavity
      const earGeo = getOrCreateGeometry('knight_ear', () => {
        const geo = new THREE.ConeGeometry(0.075, 0.26, 12);
        geo.scale(0.85, 1.0, 1.15);
        return geo;
      });

      const earL = new THREE.Mesh(earGeo, mainMaterial);
      earL.position.set(-0.11, 1.82, -0.04);
      earL.rotation.set(-0.25, 0, -0.22);
      earL.castShadow = true;
      group.add(earL);

      const earR = new THREE.Mesh(earGeo, mainMaterial);
      earR.position.set(0.11, 1.82, -0.04);
      earR.rotation.set(-0.25, 0, 0.22);
      earR.castShadow = true;
      group.add(earR);

      // 10. Cascading Sculpted Mane Locks (6 Tuft ridges down the spine)
      const maneTuftGeo = getOrCreateGeometry('knight_mane_tuft', () =>
        new THREE.BoxGeometry(0.10, 0.16, 0.16)
      );
      for (let i = 0; i < 6; i++) {
        const maneTuft = new THREE.Mesh(maneTuftGeo, mainMaterial);
        const yPos = 1.72 - i * 0.14;
        const zPos = -0.12 - i * 0.055;
        maneTuft.position.set(0, yPos, zPos);
        maneTuft.rotation.x = 0.45;
        maneTuft.castShadow = true;
        group.add(maneTuft);
      }

      // Orient knight facing opponent (White faces north, Black faces south)
      if (color === 'w') {
        group.rotation.y = Math.PI;
      } else {
        group.rotation.y = 0;
      }
      break;
    }

    case 'b': {
      // BISHOP (Staunton Mitre: flared pedestal, slender column, double astragal, teardrop mitre with 45-deg cleft slot, golden finial ball)
      const bishopProfile: [number, number][] = [
        [0, 0],
        [0.66, 0],
        [0.66, 0.08],
        [0.62, 0.10],
        [0.56, 0.16],
        [0.60, 0.22],
        [0.52, 0.28],
        [0.44, 0.35],
        [0.38, 0.46],
        [0.28, 0.68],
        [0.22, 0.90],
        [0.20, 1.05],
        [0.23, 1.15],
        [0.34, 1.18],
        [0.36, 1.23],
        [0.30, 1.26],
        [0.34, 1.30],
        [0.24, 1.34],
        [0.26, 1.38],
        [0.34, 1.50],
        [0.36, 1.66],
        [0.33, 1.82],
        [0.24, 1.96],
        [0.12, 2.06],
        [0.06, 2.10],
        [0, 2.10],
      ];

      const bishopBody = createLatheMesh('bishop_profile', bishopProfile, mainMaterial, 36);
      group.add(bishopBody);

      // Iconic Mitre Cut / Cleft (Angled geometric slot)
      const cleftGeo = getOrCreateGeometry('bishop_cleft', () =>
        new THREE.BoxGeometry(0.18, 0.36, 0.06)
      );
      const cleftMatKey = `bishop_cleft_mat_${color}`;
      if (!materialCache.has(cleftMatKey)) {
        materialCache.set(
          cleftMatKey,
          new THREE.MeshStandardMaterial({
            color: color === 'w' ? 0x9ca3af : 0x0a0a0a,
            roughness: 0.8,
            metalness: 0.1,
          })
        );
      }
      const cleftMat = materialCache.get(cleftMatKey)!;
      const cleft = new THREE.Mesh(cleftGeo, cleftMat);
      cleft.position.set(0.18, 1.76, 0);
      cleft.rotation.set(0, 0, -0.65);
      group.add(cleft);

      // Gold Accent Collar Band
      const collarBandGeo = getOrCreateGeometry('bishop_collar_band', () =>
        new THREE.TorusGeometry(0.33, 0.02, 16, 32)
      );
      const collarBand = new THREE.Mesh(collarBandGeo, accentMaterial);
      collarBand.rotation.x = Math.PI / 2;
      collarBand.position.y = 1.24;
      group.add(collarBand);

      // Top Apex Finial Bead (Gold/Polished Accent Sphere)
      const finialPedestalGeo = getOrCreateGeometry('bishop_finial_ped', () =>
        new THREE.CylinderGeometry(0.06, 0.08, 0.08, 16)
      );
      const finialPedestal = new THREE.Mesh(finialPedestalGeo, mainMaterial);
      finialPedestal.position.y = 2.14;
      group.add(finialPedestal);

      const finialSphereGeo = getOrCreateGeometry('bishop_finial_sph', () =>
        new THREE.SphereGeometry(0.085, 16, 16)
      );
      const finialSphere = new THREE.Mesh(finialSphereGeo, accentMaterial);
      finialSphere.position.y = 2.22;
      finialSphere.castShadow = true;
      group.add(finialSphere);
      break;
    }

    case 'q': {
      // QUEEN (Majestic Staunton Queen: swept waist, multi-tier astragal, flared coronet with 8 scalloped pearl tips, center dome & royal orb)
      const queenProfile: [number, number][] = [
        [0, 0],
        [0.68, 0],
        [0.68, 0.08],
        [0.64, 0.10],
        [0.58, 0.16],
        [0.62, 0.22],
        [0.54, 0.28],
        [0.46, 0.36],
        [0.40, 0.50],
        [0.30, 0.78],
        [0.24, 1.05],
        [0.23, 1.25],
        [0.26, 1.40],
        [0.36, 1.44],
        [0.39, 1.50],
        [0.32, 1.54],
        [0.36, 1.58],
        [0.28, 1.62],
        [0.30, 1.65],
        [0.40, 1.76],
        [0.50, 1.88],
        [0.54, 1.95],
        [0.48, 1.95],
        [0.38, 1.88],
        [0.28, 1.82],
        [0.20, 1.94],
        [0.10, 2.03],
        [0, 2.05],
      ];

      const queenBody = createLatheMesh('queen_profile', queenProfile, mainMaterial, 36);
      group.add(queenBody);

      // Coronet 8 Pearl Beads on crown tips
      const pearlCount = 8;
      const pearlRadius = 0.53;
      const pearlHeight = 1.98;
      const pearlGeo = getOrCreateGeometry('queen_pearl', () =>
        new THREE.SphereGeometry(0.055, 16, 16)
      );

      for (let i = 0; i < pearlCount; i++) {
        const angle = (i * Math.PI * 2) / pearlCount;
        const pearl = new THREE.Mesh(pearlGeo, accentMaterial);
        pearl.position.set(
          Math.cos(angle) * pearlRadius,
          pearlHeight,
          Math.sin(angle) * pearlRadius
        );
        pearl.castShadow = true;
        group.add(pearl);
      }

      // Waist gold accent band
      const queenBandGeo = getOrCreateGeometry('queen_band', () =>
        new THREE.TorusGeometry(0.36, 0.02, 16, 32)
      );
      const queenBand = new THREE.Mesh(queenBandGeo, accentMaterial);
      queenBand.rotation.x = Math.PI / 2;
      queenBand.position.y = 1.51;
      group.add(queenBand);

      // Central Royal Finial Orb & Crown Pip
      const royalOrbGeo = getOrCreateGeometry('queen_royal_orb', () =>
        new THREE.SphereGeometry(0.12, 16, 16)
      );
      const royalOrb = new THREE.Mesh(royalOrbGeo, accentMaterial);
      royalOrb.position.y = 2.14;
      royalOrb.castShadow = true;
      group.add(royalOrb);

      const royalPipGeo = getOrCreateGeometry('queen_royal_pip', () =>
        new THREE.ConeGeometry(0.04, 0.08, 12)
      );
      const royalPip = new THREE.Mesh(royalPipGeo, accentMaterial);
      royalPip.position.y = 2.27;
      group.add(royalPip);
      break;
    }

    case 'k': {
      // KING (Imperial Staunton Monarch: stately column, triple astragal collar, imperial flared gallery, dome, 3D Latin cross with central gem)
      const kingProfile: [number, number][] = [
        [0, 0],
        [0.72, 0],
        [0.72, 0.09],
        [0.68, 0.11],
        [0.60, 0.18],
        [0.65, 0.25],
        [0.56, 0.32],
        [0.48, 0.40],
        [0.42, 0.54],
        [0.33, 0.84],
        [0.28, 1.15],
        [0.27, 1.38],
        [0.30, 1.52],
        [0.40, 1.56],
        [0.44, 1.63],
        [0.36, 1.67],
        [0.42, 1.72],
        [0.32, 1.77],
        [0.34, 1.80],
        [0.46, 1.92],
        [0.56, 2.05],
        [0.50, 2.06],
        [0.40, 1.98],
        [0.30, 1.92],
        [0.24, 2.06],
        [0.14, 2.18],
        [0.08, 2.22],
        [0, 2.23],
      ];

      const kingBody = createLatheMesh('king_profile', kingProfile, mainMaterial, 36);
      group.add(kingBody);

      // Gold Collar Astragal Ring
      const kingBandGeo = getOrCreateGeometry('king_band', () =>
        new THREE.TorusGeometry(0.41, 0.022, 16, 32)
      );
      const kingBand = new THREE.Mesh(kingBandGeo, accentMaterial);
      kingBand.rotation.x = Math.PI / 2;
      kingBand.position.y = 1.64;
      group.add(kingBand);

      // Cross Mount Orb Base
      const crossOrbGeo = getOrCreateGeometry('king_cross_orb', () =>
        new THREE.SphereGeometry(0.10, 16, 16)
      );
      const crossOrb = new THREE.Mesh(crossOrbGeo, accentMaterial);
      crossOrb.position.y = 2.29;
      crossOrb.castShadow = true;
      group.add(crossOrb);

      // 3D Imperial Latin Cross
      const crossVGeo = getOrCreateGeometry('king_cross_v', () =>
        new THREE.BoxGeometry(0.08, 0.40, 0.08)
      );
      const crossV = new THREE.Mesh(crossVGeo, mainMaterial);
      crossV.position.y = 2.54;
      crossV.castShadow = true;
      group.add(crossV);

      const crossHGeo = getOrCreateGeometry('king_cross_h', () =>
        new THREE.BoxGeometry(0.28, 0.08, 0.08)
      );
      const crossH = new THREE.Mesh(crossHGeo, mainMaterial);
      crossH.position.y = 2.58;
      crossH.castShadow = true;
      group.add(crossH);

      // Cross Center Gem / Gold Rosette
      const crossGemGeo = getOrCreateGeometry('king_cross_gem', () =>
        new THREE.SphereGeometry(0.055, 12, 12)
      );
      const crossGem = new THREE.Mesh(crossGemGeo, accentMaterial);
      crossGem.position.set(0, 2.58, 0);
      group.add(crossGem);
      break;
    }
  }

  // Tag metadata for raycasting & piece identification
  group.userData = {
    pieceType: type,
    pieceColor: color,
    isPiece: true,
  };

  return group;
}

// Generate the 3D chess board structure with bordered wood frame and coordinate notations
export function createBoardMesh(theme: BoardTheme): {
  boardGroup: THREE.Group;
  squareMeshes: Map<string, THREE.Mesh>;
} {
  const boardGroup = new THREE.Group();
  const squareMeshes = new Map<string, THREE.Mesh>();

  const lightMat = new THREE.MeshStandardMaterial({
    color: theme.lightSquare,
    roughness: theme.boardRoughness,
    metalness: 0.05,
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: theme.darkSquare,
    roughness: theme.boardRoughness,
    metalness: 0.05,
  });

  // Individual square tiles with slight gaps and bevel
  const squareGeo = new THREE.BoxGeometry(
    SQUARE_SIZE * 0.985,
    0.28,
    SQUARE_SIZE * 0.985
  );

  for (let file = 0; file < 8; file++) {
    for (let rank = 0; rank < 8; rank++) {
      const isLight = (file + rank) % 2 !== 0;
      const squareName = `${String.fromCharCode(97 + file)}${rank + 1}`;

      const tileMesh = new THREE.Mesh(squareGeo, isLight ? lightMat : darkMat);
      const x = (file - 3.5) * SQUARE_SIZE;
      const z = (3.5 - rank) * SQUARE_SIZE;

      tileMesh.position.set(x, -0.14, z);
      tileMesh.receiveShadow = true;
      tileMesh.userData = {
        square: squareName,
        isSquare: true,
        originalColor: isLight ? theme.lightSquare : theme.darkSquare,
      };

      boardGroup.add(tileMesh);
      squareMeshes.set(squareName, tileMesh);
    }
  }

  // Heavy solid border frame
  const borderWidth = 1.4;
  const totalWidth = BOARD_SIZE * SQUARE_SIZE + borderWidth * 2;
  const borderHeight = 0.55;

  const borderMat = new THREE.MeshStandardMaterial({
    color: theme.boardBorder,
    roughness: theme.boardRoughness + 0.1,
    metalness: 0.08,
  });

  // Outer frame base
  const frameBaseGeo = new THREE.BoxGeometry(totalWidth, borderHeight, totalWidth);
  const frameBase = new THREE.Mesh(frameBaseGeo, borderMat);
  frameBase.position.y = -borderHeight / 2 - 0.02;
  frameBase.receiveShadow = true;
  frameBase.castShadow = true;
  boardGroup.add(frameBase);

  // Raised edge bevel
  const trimGeo = new THREE.BoxGeometry(totalWidth + 0.2, 0.12, totalWidth + 0.2);
  const trim = new THREE.Mesh(trimGeo, borderMat);
  trim.position.y = -borderHeight - 0.04;
  trim.receiveShadow = true;
  boardGroup.add(trim);

  // Table felt under base
  const tableUnderGeo = new THREE.BoxGeometry(totalWidth + 0.3, 0.05, totalWidth + 0.3);
  const tableUnderMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
  const tableUnder = new THREE.Mesh(tableUnderGeo, tableUnderMat);
  tableUnder.position.y = -borderHeight - 0.08;
  boardGroup.add(tableUnder);

  // Canvas texture for letter & number notations around the border
  const notationCanvas = document.createElement('canvas');
  notationCanvas.width = 1024;
  notationCanvas.height = 1024;
  const ctx = notationCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#b89b72';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const step = 1024 / 8;
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    // Top and bottom file letters
    for (let i = 0; i < 8; i++) {
      const pos = (i + 0.5) * step;
      ctx.fillText(files[i].toUpperCase(), pos, 28);
      ctx.fillText(files[i].toUpperCase(), pos, 1024 - 28);
    }
    // Left and right rank numbers
    for (let i = 0; i < 8; i++) {
      const pos = (i + 0.5) * step;
      ctx.fillText(ranks[i], 28, pos);
      ctx.fillText(ranks[i], 1024 - 28, pos);
    }
  }

  const notationTexture = new THREE.CanvasTexture(notationCanvas);
  notationTexture.anisotropy = 8;
  const notationMat = new THREE.MeshBasicMaterial({
    map: notationTexture,
    transparent: true,
    opacity: 0.75,
  });

  const notationGeo = new THREE.PlaneGeometry(totalWidth - 0.4, totalWidth - 0.4);
  const notationPlane = new THREE.Mesh(notationGeo, notationMat);
  notationPlane.rotation.x = -Math.PI / 2;
  notationPlane.position.y = 0.01;
  boardGroup.add(notationPlane);

  return { boardGroup, squareMeshes };
}

// Visual indicators for selection, legal moves, and check
export function createHighlightOverlays(): {
  selectedMesh: THREE.Mesh;
  hoverMesh: THREE.Mesh;
  moveDotsGroup: THREE.Group;
  checkMesh: THREE.Mesh;
  lastMoveGroup: THREE.Group;
} {
  // Selected square gold halo
  const selectGeo = new THREE.RingGeometry(0.55, 0.88, 32);
  const selectMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const selectedMesh = new THREE.Mesh(selectGeo, selectMat);
  selectedMesh.rotation.x = -Math.PI / 2;
  selectedMesh.position.y = 0.02;
  selectedMesh.visible = false;

  // Hover indicator
  const hoverGeo = new THREE.PlaneGeometry(SQUARE_SIZE * 0.95, SQUARE_SIZE * 0.95);
  const hoverMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
  });
  const hoverMesh = new THREE.Mesh(hoverGeo, hoverMat);
  hoverMesh.rotation.x = -Math.PI / 2;
  hoverMesh.position.y = 0.015;
  hoverMesh.visible = false;

  // Check king red warning aura
  const checkGeo = new THREE.RingGeometry(0.4, 0.95, 32);
  const checkMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const checkMesh = new THREE.Mesh(checkGeo, checkMat);
  checkMesh.rotation.x = -Math.PI / 2;
  checkMesh.position.y = 0.022;
  checkMesh.visible = false;

  // Container for dynamic legal move markers
  const moveDotsGroup = new THREE.Group();
  const lastMoveGroup = new THREE.Group();

  return {
    selectedMesh,
    hoverMesh,
    moveDotsGroup,
    checkMesh,
    lastMoveGroup,
  };
}

// Single legal move dot / capture ring
export function createMoveMarker(isCapture: boolean): THREE.Mesh {
  if (isCapture) {
    // Red / Gold target capture ring
    const geo = new THREE.RingGeometry(0.65, 0.88, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    return mesh;
  } else {
    // Emerald / Cyan gentle landing dot
    const geo = new THREE.CircleGeometry(0.28, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.02;
    return mesh;
  }
}

// Last move indicator tile highlights
export function createLastMoveMarker(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(SQUARE_SIZE * 0.95, SQUARE_SIZE * 0.95);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xeab308,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}
