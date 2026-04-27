import { LEVEL_XP_THRESHOLDS, EVOLUTION_THRESHOLDS } from '../constants/game';

export function getLevelForXP(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return level;
}

export function getXPForCurrentLevel(xp: number): number {
  const level = getLevelForXP(xp);
  return LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
}

export function getXPForNextLevel(xp: number): number {
  const level = getLevelForXP(xp);
  const nextIndex = level; // level 1 is index 0, so next level is index 1
  if (nextIndex >= LEVEL_XP_THRESHOLDS.length) {
    // Max level — return current threshold so bar shows full
    return LEVEL_XP_THRESHOLDS[level - 1] ?? 0;
  }
  return LEVEL_XP_THRESHOLDS[nextIndex];
}

export function getEvolutionStage(level: number): 1 | 2 | 3 | 4 | 5 {
  let stage: 1 | 2 | 3 | 4 | 5 = 1;
  for (const [stageStr, minLevel] of Object.entries(EVOLUTION_THRESHOLDS)) {
    if (level >= minLevel) {
      stage = Number(stageStr) as 1 | 2 | 3 | 4 | 5;
    }
  }
  return stage;
}

export function isMaxLevel(xp: number): boolean {
  return getLevelForXP(xp) >= LEVEL_XP_THRESHOLDS.length;
}
