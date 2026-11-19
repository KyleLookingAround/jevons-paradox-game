// M3 finish: the temptation's trade in one plain line, where the player decides (a card, a staked-out use, the next
// seam). The figure is the core's (UpgradeView / AppDerived / SeamsView .wantedChange: the use the Industry would burn
// with the thing taken now, against without, both free of any cap); the page only words it. Each Industry's mechanic
// pays the player who burns and tests the one who restrains: this is the restrainer's half of the bargain.
import { pct } from './fmt';

export function tradeText(res: string, ch: number, what: 'found' | 'buy' | 'sink'): string {
  const doing = what === 'found' ? 'founding it' : what === 'sink' ? 'sinking it' : 'buying it';
  if (ch > 0.0005) return `Under the line: ${doing} adds ${pct(ch, false)} to the ${res} wanted here, which the line must hold back.`;
  if (ch < -0.0005) return `Under the line: the ${res} wanted falls ${pct(-ch, false)}${what === 'sink' ? '; the seam lengthens the run, not the burn' : ''}.`;
  return `Under the line: no more ${res} wanted, for now.`;
}
