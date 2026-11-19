// Mock-only entry: the UI on the development stand-in, with no import of the real model or content.
// tools/shot.mjs bundles this for its mock modes (and when the real game cannot be built: other lanes mid-change).
// The stand-in is passed in here so that the production entry (src/main.ts) does not carry it.
import { startGame } from './game';
import * as devmock from './devmock';

startGame({ devmock });
