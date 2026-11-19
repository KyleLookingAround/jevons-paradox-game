// Hand-made SceneViews for the tests, the offline analysis and the demo (no model or content imported: they may be
// mid-rewrite). The Industries mirror the scene demo's; `runView` scrubs a whole run from an empty valley to collapse
// or to Steady State as t goes 0 → 1.
import type { SceneView, SceneApp } from '../scene/types';

interface Ind { id: string; name: string; look: string; flow?: boolean; apps: [string, string][] }

export const DEMO_INDUSTRIES: Ind[] = [
  { id: 'steam', name: 'Steam', look: 'ledger', apps: [['pump', 'Mine pumping'], ['mill', 'Cotton mills'], ['winder', 'Winding engines'], ['train', 'Railways'], ['ship', 'Steamships'], ['plough', 'Steam ploughing']] },
  { id: 'light', name: 'Light', look: 'gaslight', apps: [['lamp', 'Street lamps'], ['factory-night', 'Night shifts'], ['tram', 'Electric trams'], ['house', 'Lit homes'], ['sign', 'Shop signs']] },
  { id: 'motion', name: 'Motion', look: 'chrome', apps: [['van', 'Delivery vans'], ['car', 'Commuting'], ['mall', 'Out-of-town shopping'], ['suburb', 'Suburbs'], ['plane', 'Package holidays']] },
  { id: 'compute', name: 'Compute', look: 'terminal', apps: [['sheet', 'Spreadsheets'], ['globe', 'The web'], ['cloud', 'Cloud storage'], ['play', 'Streaming'], ['brain', 'Model training']] },
  { id: 'code', name: 'Code', look: 'agentic', flow: true, apps: [['wrench', 'Internal tools'], ['phone-app', 'Throwaway personal apps'], ['scroll', 'Legacy rewrites'], ['chatbot', 'Chatbots on everything'], ['robots', 'Agents writing for agents']] },
  { id: 'iron', name: 'Iron (no soundscape)', look: 'ledger', apps: [['furnace', 'Blast furnaces'], ['rolling-mill', 'Rolling mills'], ['bridge', 'Iron bridges']] },
];

export interface DemoParams {
  status: SceneApp['status'][]; adoption: number[]; stage: number; pressure: number; reserve: number; pop: number; pace: number;
  levers: string[]; crises: number; reckoning: '' | 'exhausted' | 'collapse' | 'chosen'; decoupling: boolean; steadyProgress: number; steady: boolean;
  heritage?: Record<string, number>;
}

export const PRESET_NAMES = ['empty', 'early', 'mid', 'late', 'crisis', 'collapse', 'steady'] as const;
export type PresetName = (typeof PRESET_NAMES)[number];

function indOf(id: string): Ind { return DEMO_INDUSTRIES.find((x) => x.id === id) ?? DEMO_INDUSTRIES[0]; }

export function preset(sector: string, name: PresetName): DemoParams {
  const n = indOf(sector).apps.length;
  const blank: DemoParams = { status: Array.from({ length: n }, (_, i) => (i === 0 ? 'available' : 'hidden')), adoption: Array(n).fill(0), stage: 0, pressure: 0, reserve: 1,
    pop: 0, pace: 0, levers: [], crises: 0, reckoning: '', decoupling: false, steadyProgress: 0, steady: false };
  const fill = (a: number[]) => Array.from({ length: n }, (_, k) => a[k] ?? a[a.length - 1]);
  switch (name) {
    case 'empty': return blank;
    case 'early': return { ...blank, status: fill([0, 1, 2]).map((k) => (k === 0 ? 'founded' : k === 1 ? 'available' : 'hidden')), adoption: fill([0.3, 0]), pressure: 0.05, reserve: 0.97, pop: 0.12, pace: 0.12 };
    case 'mid': return { ...blank, status: Array.from({ length: n }, (_, k) => (k < 3 ? 'founded' : k === 3 ? 'available' : 'hidden')), adoption: fill([0.75, 0.5, 0.2, 0]), stage: 1, pressure: 0.3, reserve: 0.78, pop: 0.45, pace: 0.45 };
    case 'late': return { ...blank, status: Array(n).fill('founded'), adoption: fill([0.97, 0.9, 0.8, 0.65, 0.5, 0.35]), stage: 2, pressure: 0.6, reserve: 0.45, pop: 0.8, pace: 0.8, crises: 1 };
    case 'crisis': return { ...preset(sector, 'late'), stage: 3, adoption: fill([1, 0.97, 0.9, 0.8, 0.7, 0.55]), pressure: 0.9, reserve: 0.12, pop: 0.95, pace: 1, crises: 2 };
    case 'collapse': return { ...preset(sector, 'crisis'), pressure: 1.05, reserve: 0.05, crises: 3, reckoning: 'collapse' };
    case 'steady': return { ...blank, status: Array(n).fill('founded'), adoption: fill([0.85, 0.75, 0.62, 0.5, 0.42, 0.3]), stage: 3, pressure: 0.14, reserve: 0.55, pop: 0.7, pace: 0.35,
      levers: ['duty', 'cap', 'substitution', 'sufficiency'], decoupling: true, steadyProgress: 1, steady: true, crises: 2 };
  }
}

export function viewOf(sector: string, p: DemoParams): SceneView {
  const ind = indOf(sector);
  return {
    sectorId: ind.id, sectorName: ind.name, look: ind.look, serviceName: 'Service', serviceUnit: '', resourceName: 'Resource', pressureName: 'Pressure',
    crisisName: 'A crisis', resourceKind: ind.flow ? 'flow' : 'stock',
    apps: ind.apps.map(([icon, name], k) => ({
      id: `${ind.id}.${icon}`, name, icon, blurb: '', status: p.status[k] ?? 'hidden', adoption: (p.status[k] === 'founded' ? p.adoption[k] : 0) ?? 0,
      demand: 0, foundCost: 0, canFound: false, affordFraction: 0, visibleBelow: null,
    })),
    stage: p.stage, etaFold: Math.pow(2, p.stage * 1.5), rFold: Math.pow(16, p.pace), pace: p.pace, reserveFraction: p.reserve, pressureFraction: p.pressure,
    nextCrisisFraction: null, population: Math.exp(p.pop * Math.log(12)), popFraction: p.pop, crises: p.crises,
    levers: p.levers.map((kind) => ({ id: `${ind.id}.${kind}`, kind, level: 1, name: kind })),
    decoupling: p.decoupling, steadyProgress: p.steadyProgress, steady: p.steady,
    reckoning: p.reckoning ? { cause: p.reckoning, here: true } : null, year: null, heritage: p.heritage,
  };
}

export const demoView = (sector: string, name: PresetName) => viewOf(sector, preset(sector, name));

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

/** A whole run as t goes 0 → 1: applications founded in turn and adopted, machines evolving, pace and pressure rising;
 *  'collapse' ends in a Reckoning at t ≈ 0.93, 'steady' turns at t ≈ 0.55 (levers, decoupling) into Steady State. */
export function runParams(sector: string, t: number, ending: 'collapse' | 'steady'): DemoParams {
  const n = indOf(sector).apps.length;
  const grow = ending === 'steady' ? Math.min(t, 0.55) / 0.55 * 0.75 + Math.max(0, t - 0.55) * 0.3 : t / 0.9;
  const status: SceneApp['status'][] = [], adoption: number[] = [];
  for (let k = 0; k < n; k++) {
    const at = (k / n) * 0.85;
    if (grow >= at + 0.04) { status.push('founded'); adoption.push(Math.min(1, (grow - at) / 0.45)); }
    else if (grow >= at - 0.08) { status.push('available'); adoption.push(0); }
    else { status.push('hidden'); adoption.push(0); }
  }
  const p: DemoParams = {
    status, adoption, stage: Math.min(3, Math.floor(grow * 3.6)), pressure: lerp(0, 1.05, grow * grow * 1.05), reserve: lerp(1, 0.04, grow), pop: lerp(0, 0.95, grow),
    pace: lerp(0, 1, grow), levers: [], crises: grow > 0.62 ? (grow > 0.8 ? 2 : 1) : 0, reckoning: '', decoupling: false, steadyProgress: 0, steady: false,
  };
  if (ending === 'collapse' && t >= 0.93) p.reckoning = 'collapse';
  if (ending === 'steady' && t > 0.55) {
    const u = (t - 0.55) / 0.45;
    p.levers = u > 0.05 ? (u > 0.3 ? ['duty', 'cap', 'substitution'] : ['duty']) : [];
    p.decoupling = u > 0.2;
    p.pressure = lerp(p.pressure, 0.15, u * 1.3);
    p.pace = lerp(p.pace, 0.35, u * 1.3);
    p.reserve = Math.max(p.reserve, 0.5);
    p.steadyProgress = Math.max(0, Math.min(1, (u - 0.2) / 0.6));
    p.steady = u >= 0.8;
  }
  return p;
}

export const runView = (sector: string, t: number, ending: 'collapse' | 'steady') => viewOf(sector, runParams(sector, t, ending));
