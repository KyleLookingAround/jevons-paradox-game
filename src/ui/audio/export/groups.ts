// Stem groups for the DAW export: each Industry's layers (defs.ts) gathered into the handful of stems a producer would
// want, plus the sources every Industry shares (the world's crisis moment, lever signatures, heritage traces from
// earlier Industries, the proprietor's watch). Every source the engine can sound in a world belongs to exactly one
// group (a test checks it), so the stems of a passage always sum to its full mix. Pure data.
import { SOUNDSCAPES } from '../defs';

export interface StemGroup { id: string; label: string; layers: string[]; about: string }

/** The engine's source ids (see the engine's `tap.gate`): a layer id of the Industry's def, 'crisis', 'lever:<kind>',
 *  'watch', 'trace:<sector>:<layer>', 'credits', 'ui'. */
const SHARED: StemGroup[] = [
  { id: 'crisis', label: 'weather and crisis', layers: ['crisis'], about: "the world's crisis moment when a crisis fires (a low fog swell and the Age's alarm); silent in a held state without a crisis" },
  { id: 'levers', label: 'lever signatures', layers: ['lever:*'], about: 'the small signature of each lever in force, now and then (souring as it bites back)' },
  { id: 'heritage', label: 'heritage', layers: ['trace:*'], about: 'faint, distant traces of earlier Industries under this one' },
  { id: 'watch', label: "the proprietor's watch", layers: ['watch'], about: 'a faint watch tick, after the Proprietor\'s Day' },
  { id: 'ministry', label: 'the Ministry room', layers: ['room:*'], about: 'M5, in office only: the clock on the Ministry mantelpiece (tick and tock at 60 bpm, its own time, not the Industry\'s) and the traffic outside, through the glass (lower and quieter with the curtains drawn in Opposition)' },
];

export const STEM_GROUPS: Record<string, StemGroup[]> = {
  steam: [
    { id: 'air', label: 'air and birds', layers: ['wind', 'birds'], about: 'valley wind (pink noise, slow filter drift) and birdsong' },
    { id: 'engine', label: 'the engine', layers: ['eng0', 'eng1', 'eng2', 'eng3'], about: 'the beam engine, one voice per machine stage: Newcomen thump every 4 beats, Watt stroke every 2, high-pressure chuffs on the half-beat, turbine tones' },
    { id: 'mill', label: 'looms and mill', layers: ['millRumble', 'looms'], about: 'the mill rumble pulsing on the beat and the looms on the pulse' },
    { id: 'pithead', label: 'pithead and winding', layers: ['winder', 'pumpHeave'], about: 'the pithead bell and winding drum; the pumps heaving on every other beat when seams are deep' },
    { id: 'trains', label: 'trains', layers: ['train'], about: 'a train across the viaduct, left to right, whistle in key' },
    { id: 'harbour', label: 'harbour', layers: ['horn'], about: "a ship's horn from the harbour" },
    { id: 'fields', label: 'fields', layers: ['plough'], about: 'a distant steam ploughing engine' },
    { id: 'town', label: 'town and bell', layers: ['town', 'church'], about: 'the town murmur and the church bell across the valley' },
  ],
  light: [
    { id: 'dusk', label: 'dusk and night air', layers: ['dusk', 'evening', 'crickets'], about: 'dusk air, evening birds, crickets in a quiet small hours' },
    { id: 'gas', label: 'gas and lamps', layers: ['gas', 'lamps'], about: 'gas hiss and lamps lit one by one, each a small pop on a scale degree' },
    { id: 'works', label: 'hum and mills', layers: ['nightHum', 'loadHum', 'nightMill', 'dayMill'], about: 'the night-shift and load hum (tones in key) and muffled mill machinery by night and day' },
    { id: 'trams', label: 'trams', layers: ['tram'], about: 'trams passing with bell, motor and sparks' },
    { id: 'parlour', label: 'parlour piano', layers: ['piano'], about: 'a parlour piano through a window, phrases in key' },
    { id: 'signs', label: 'sign buzz', layers: ['signs'], about: 'the buzz of shop signs (100 Hz and harmonics)' },
    { id: 'streets', label: 'cabs and town', layers: ['cabs', 'town'], about: 'hansom cabs on cobbles and the town murmur' },
    { id: 'harbour', label: 'harbour edge', layers: ['buoy'], about: "a bell buoy far off at the harbour's edge (Fishing's, heard faintly here)" },
  ],
  iron: [
    { id: 'air', label: 'night air', layers: ['night', 'nightjar'], about: 'the night air over the works and a nightjar churring at Steady State' },
    { id: 'furnaces', label: 'furnaces', layers: ['furnace', 'blast', 'tap'], about: 'the furnace roar breathing with the blast every other beat, and a furnace tapped now and then (a rising hiss and a shower of sparks)' },
    { id: 'hammer', label: 'the drop hammer', layers: ['hammer'], about: 'the drop hammer on the beat: a deep blow and the anvil ringing on A' },
    { id: 'mills', label: 'mills and riveters', layers: ['rolling', 'rivets', 'cans', 'lathes'], about: 'a bar through the rolls (rumble and a squeal in key), riveters\' trains of blows, tin cans down a chute, machine-tool tones' },
    { id: 'steel', label: 'converter and hearth', layers: ['converter', 'hearth'], about: 'the Bessemer converter blowing (stage 2) and the open hearth humming (stage 3)' },
    { id: 'town', label: 'town', layers: ['town'], about: 'the town murmur' },
  ],
  fishing: [
    { id: 'sea', label: 'the sea', layers: ['swell', 'surf', 'buoy'], about: 'the swell on a slow cycle, the surf with it, a bell buoy in key' },
    { id: 'life', label: 'sea life', layers: ['gulls', 'porpoise', 'shoals'], about: 'gulls, porpoises breathing and shoals breaking the surface: they follow the TRUE stock, and thin long before the catch does' },
    { id: 'fleet', label: 'the fleet', layers: ['trawlers', 'winch', 'foreign'], about: "the trawlers' engines across the water, their steam winches, foreign boats further out" },
    { id: 'quay', label: 'quay and market', layers: ['market', 'fishTrain', 'quay'], about: 'the fish market bell, the fish train leaving, the quay murmur' },
    { id: 'harbour', label: 'tied up', layers: ['halyards'], about: 'halyards slapping the masts when the fleet is tied up' },
  ],
  motion: [
    { id: 'air', label: 'breeze and birds', layers: ['breeze', 'birds'], about: 'breeze and birds of the open road' },
    { id: 'road', label: 'the road', layers: ['wash', 'cars', 'vans', 'hum'], about: 'the road wash, cars and vans passing with Doppler and stereo travel, traffic hum' },
    { id: 'jam', label: 'the jam', layers: ['queue', 'jamHorn'], about: 'an idling queue and the odd horn when journeys lengthen' },
    { id: 'jet', label: 'jets', layers: ['jet'], about: 'a jet climbing out' },
    { id: 'mall', label: 'the mall', layers: ['mall', 'doors'], about: 'the shopping-centre chime and car doors' },
    { id: 'suburbs', label: 'suburbs', layers: ['sprawlHum', 'mower', 'radio'], about: 'distant sprawl, a lawnmower, a transistor radio playing a tune in key over the fence' },
  ],
  compute: [
    { id: 'air', label: 'air and birds', layers: ['air', 'birds'], about: 'air and birds outside the machine hall' },
    { id: 'machines', label: 'fans and cooling', layers: ['fans', 'fanNoise', 'cooling'], about: 'fan tones in beating pairs, fan noise, cooling plant' },
    { id: 'packets', label: 'packets', layers: ['ticks', 'beeps', 'stream'], about: 'relay and packet ticks on a 16th grid, vector-display beeps in key, streaming whooshes' },
    { id: 'power', label: 'mains and grid', layers: ['mains', 'grid', 'dam'], about: 'mains hum at 50 Hz with harmonics that sag under load, the grid and a dam far off' },
    { id: 'training', label: 'training', layers: ['train'], about: 'the model-training throb on the beat' },
    { id: 'till', label: 'the till', layers: ['till', 'tillMute'], about: 'a small till for paid uses; the key and drawer without a bell for free ones' },
  ],
  plenty: [
    { id: 'air', label: 'wind and larks', layers: ['wind', 'wheat', 'larks'], about: 'wind over the fields, the wheat rustling in gusts, skylarks while the air is clear' },
    { id: 'machines', label: 'the machines', layers: ['team', 'tractor'], about: 'a team at the plough (hooves and harness) at first, then the tractor\'s putter on the half-beat' },
    { id: 'water', label: 'irrigation', layers: ['pivot', 'drips'], about: 'the centre pivot\'s hiss, which thins as the return share falls, and the drip lines\' drops' },
    { id: 'pump', label: 'the pump', layers: ['pump', 'borehole'], about: 'the pump\'s stroke and gulp, slowing in whole doublings (every 2, 4, 8 beats) and dropping in pitch as the water table falls; a second, quicker, unmetered borehole while the loophole is in use' },
    { id: 'trade', label: 'grain trains and freight', layers: ['grain', 'freight', 'town'], about: 'the grain train, air freight climbing out, the town murmur' },
    { id: 'dust', label: 'dust', layers: ['dust'], about: 'the wind lifting the topsoil at high pressure' },
  ],
  code: [
    { id: 'rain', label: 'rain', layers: ['rain', 'drips'], about: 'rain and drips' },
    { id: 'pad', label: 'pad', layers: ['pad'], about: 'the low pad (a minor-ninth colour in key) that brightens as the haze clears' },
    { id: 'neon', label: 'neon', layers: ['neon', 'flicker'], about: 'neon buzz (120 Hz) and flicker' },
    { id: 'street', label: 'the street', layers: ['traffic', 'elevated', 'drones'], about: 'traffic, the elevated line, drones passing' },
    { id: 'rooms', label: 'the rooms', layers: ['room0', 'room1', 'room2', 'room3', 'room4', 'room5'], about: 'six warm rooms in the old block: typing, a page turned, cups, a guitar chord, a kettle, a pencil' },
    { id: 'emergency', label: 'emergency tone', layers: ['emergency'], about: 'the emergency tone alternating under strain' },
    { id: 'owl', label: 'owl', layers: ['night'], about: 'an owl at Steady State' },
  ],
};

/** The stems of an Industry: its own groups (one per layer for a def without groups), then the shared ones, then
 *  'other' for anything unmatched (empty in practice; a test keeps it so). */
export function stemGroups(sector: string): StemGroup[] {
  const def = SOUNDSCAPES[sector] ?? SOUNDSCAPES.generic;
  const own = STEM_GROUPS[def.id] ?? def.layers.map((l) => ({ id: l.id.toLowerCase(), label: l.id, layers: [l.id], about: `the '${l.id}' layer` }));
  return [...own, ...SHARED, { id: 'other', label: 'other', layers: ['*'], about: 'anything not in another stem (normally silent)' }];
}

const match = (pat: string, src: string) => pat === src || pat === '*' || (pat.endsWith('*') && src.startsWith(pat.slice(0, -1)));

/** Which stem a source belongs to (first match wins; 'other' catches the rest). */
export function groupOf(sector: string, source: string): string {
  const gs = stemGroups(sector);
  for (const g of gs) if (g.id !== 'other' && g.layers.some((p) => p !== '*' && match(p, source))) return g.id;
  return 'other';
}
