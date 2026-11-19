// Rebound entry point: the real model and content, handed to the game loop (src/ui/game.ts).
// `#mock` in the URL (or content not yet in the M1 shape) runs the development stand-in instead.
import { model } from './core';
import { content } from './content';
import { startGame } from './ui/game';

startGame({ realModel: model, realContent: content });
