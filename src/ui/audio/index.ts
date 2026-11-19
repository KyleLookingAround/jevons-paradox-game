// Public surface of the soundscape. The page needs only createSoundscape (and the types).
export { createSoundscape } from './engine';
export { mixFrom, sourcesFrom, momentsBetween } from './mix';
export { SOUNDSCAPES, registerSoundscape, soundscapeFor, paletteFor } from './defs';
export type { SoundscapeDef, LayerDef, BedDef, HitsDef, Drive, Src } from './defs';
export { KEYS } from './music';
export { SOUND_EVENT_KINDS, SOUND_EVENT_ALIASES } from './types';
export type { Soundscape, SoundscapeOptions, SoundscapeTap, SoundEventKind, SoundEventDetail, Volumes, SoundscapeStats, Mix, LayerMix } from './types';
