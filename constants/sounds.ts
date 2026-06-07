export type AmbientSoundId = 'none' | 'rain' | 'coffee' | 'whitenoise' | 'forest' | 'brownnoise';
export type BreakSoundId = 'none' | 'piano';

export interface AmbientSoundDef {
  id: AmbientSoundId;
  label: string;
  icon: string;
  uri: number | null;
}

export const AMBIENT_SOUNDS: AmbientSoundDef[] = [
  { id: 'none',       label: 'None',        icon: '🔇', uri: null },
  { id: 'rain',       label: 'Rain',        icon: '🌧️', uri: require('../assets/sounds/dragon-studio-gentle-rain-07-437321.mp3') },
  { id: 'coffee',     label: 'Coffee',      icon: '☕', uri: require('../assets/sounds/freesound_community-coffee-shop-ambience-278291.mp3') },
  { id: 'whitenoise', label: 'White Noise', icon: '📻', uri: require('../assets/sounds/freesound_community-whitenoise-75254.ogg') },
  { id: 'forest',     label: 'Forest',      icon: '🌲', uri: require('../assets/sounds/audiopapkin-forest-ambience-296528.mp3') },
  { id: 'brownnoise', label: 'Brown Noise', icon: '🎵', uri: require('../assets/sounds/dreamingrelaxation-brown-noise-by-digitalspa-170337.mp3') },
];

export interface BreakSoundDef {
  id: BreakSoundId;
  label: string;
  icon: string;
  uri: number | null;
}

export const BREAK_SOUNDS: BreakSoundDef[] = [
  { id: 'none',  label: 'None',  icon: '🔇', uri: null },
  { id: 'piano', label: 'Piano', icon: '🎹', uri: require('../assets/sounds/minimal-piano-underscore-456148.mp3') },
];

export const VOLUME_STEPS = [
  { label: '25%',  value: 0.25 },
  { label: '50%',  value: 0.5  },
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1.0  },
];
