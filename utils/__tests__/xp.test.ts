import {
  getLevelForXP,
  getXPForCurrentLevel,
  getXPForNextLevel,
  getEvolutionStage,
  isMaxLevel,
} from '../xp';
import { LEVEL_XP_THRESHOLDS } from '../../constants/game';

// LEVEL_XP_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2700, 3500, 4400, 5400]
// EVOLUTION_THRESHOLDS = { 1:1, 2:3, 3:6, 4:10, 5:15 }

describe('getLevelForXP', () => {
  it('returns level 1 at 0 XP', () => {
    expect(getLevelForXP(0)).toBe(1);
  });

  it('returns level 1 just below second threshold', () => {
    expect(getLevelForXP(99)).toBe(1);
  });

  it('returns level 2 at exactly the second threshold', () => {
    expect(getLevelForXP(100)).toBe(2);
  });

  it('returns level 3 at 250 XP', () => {
    expect(getLevelForXP(250)).toBe(3);
  });

  it('returns max level at max threshold XP', () => {
    const maxXP = LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
    expect(getLevelForXP(maxXP)).toBe(LEVEL_XP_THRESHOLDS.length);
  });

  it('returns max level for XP beyond the max threshold', () => {
    expect(getLevelForXP(99999)).toBe(LEVEL_XP_THRESHOLDS.length);
  });

  it('correctly resolves each level boundary', () => {
    LEVEL_XP_THRESHOLDS.forEach((threshold, index) => {
      expect(getLevelForXP(threshold)).toBe(index + 1);
    });
  });
});

describe('getXPForCurrentLevel', () => {
  it('returns 0 for level 1 (XP = 0)', () => {
    expect(getXPForCurrentLevel(0)).toBe(0);
  });

  it('returns the level 2 threshold when at level 2', () => {
    expect(getXPForCurrentLevel(100)).toBe(100);
  });

  it('returns level threshold, not the current XP amount', () => {
    expect(getXPForCurrentLevel(150)).toBe(100);
  });
});

describe('getXPForNextLevel', () => {
  it('returns the next threshold from level 1', () => {
    expect(getXPForNextLevel(0)).toBe(100);
  });

  it('returns the threshold after level 2', () => {
    expect(getXPForNextLevel(100)).toBe(250);
  });

  it('returns the current threshold at max level (bar full)', () => {
    const maxXP = LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
    const maxLevel = LEVEL_XP_THRESHOLDS.length;
    expect(getXPForNextLevel(maxXP)).toBe(LEVEL_XP_THRESHOLDS[maxLevel - 1]);
  });
});

describe('getEvolutionStage', () => {
  it('returns stage 1 at level 1 (Egg)', () => {
    expect(getEvolutionStage(1)).toBe(1);
  });

  it('returns stage 1 at level 2 (still Egg)', () => {
    expect(getEvolutionStage(2)).toBe(1);
  });

  it('returns stage 2 at level 3 (Baby)', () => {
    expect(getEvolutionStage(3)).toBe(2);
  });

  it('returns stage 3 at level 6 (Child)', () => {
    expect(getEvolutionStage(6)).toBe(3);
  });

  it('returns stage 4 at level 10 (Teen)', () => {
    expect(getEvolutionStage(10)).toBe(4);
  });

  it('returns stage 5 at level 15 (Adult)', () => {
    expect(getEvolutionStage(15)).toBe(5);
  });

  it('returns stage 5 for levels beyond 15', () => {
    expect(getEvolutionStage(20)).toBe(5);
    expect(getEvolutionStage(100)).toBe(5);
  });

  it('returns stage 2 for levels 3–5', () => {
    expect(getEvolutionStage(4)).toBe(2);
    expect(getEvolutionStage(5)).toBe(2);
  });
});

describe('isMaxLevel', () => {
  it('returns false below max level', () => {
    expect(isMaxLevel(0)).toBe(false);
    expect(isMaxLevel(5399)).toBe(false);
  });

  it('returns true at max level XP', () => {
    const maxXP = LEVEL_XP_THRESHOLDS[LEVEL_XP_THRESHOLDS.length - 1];
    expect(isMaxLevel(maxXP)).toBe(true);
  });

  it('returns true beyond max level XP', () => {
    expect(isMaxLevel(99999)).toBe(true);
  });
});
