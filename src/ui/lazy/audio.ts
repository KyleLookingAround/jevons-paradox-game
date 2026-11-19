// Lazy part 'audio' (see ../chunks.ts): the sound engine, fetched only when sound is on or about to be turned on.
import { createSoundscape } from '../audio';

export const audioRt = { createSoundscape };
export type AudioRt = typeof audioRt;

const G = self as unknown as { __rb?: Record<string, unknown>; __rbOn?: (n: string) => void };
(G.__rb = G.__rb || {}).audio = audioRt;
G.__rbOn?.('audio');
