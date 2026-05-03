export interface AmbientSoundDef {
  id: string;
  label: string;
  icon: string;
  // Local asset or remote URL. null = not yet sourced, option is shown but disabled.
  // Replace with: require('../assets/sounds/rain.mp3') or { uri: 'https://...' }
  uri: string | null;
}

export const AMBIENT_SOUNDS: AmbientSoundDef[] = [
  { id: 'none',       label: 'None',        icon: '🔇', uri: null },
  { id: 'rain',       label: 'Rain',        icon: '🌧️', uri: null },
  { id: 'coffee',     label: 'Coffee',      icon: '☕', uri: null },
  { id: 'whitenoise', label: 'White Noise', icon: '📻', uri: null },
  { id: 'forest',     label: 'Forest',      icon: '🌲', uri: null },
  { id: 'brownnoise', label: 'Brown Noise', icon: '🎵', uri: null },
];

export type AmbientSoundId = 'none' | 'rain' | 'coffee' | 'whitenoise' | 'forest' | 'brownnoise';

export const VOLUME_STEPS = [
  { label: '25%',  value: 0.25 },
  { label: '50%',  value: 0.5  },
  { label: '75%',  value: 0.75 },
  { label: '100%', value: 1.0  },
];
