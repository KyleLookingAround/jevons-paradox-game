// Mock-only entry: the UI on the development stand-in, with no import of the real model or content.
// tools/shot.mjs bundles this when the real game cannot be built (other lanes mid-change).
import { startGame } from './game';

startGame({});
