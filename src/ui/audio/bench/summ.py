# Summarise an industry batch JSON: python3 summ.py file.json
import json, sys
d = json.load(open(sys.argv[1]))
print('preset     peak   rms  crest  cent  sub200  low   mid   >6k   clickDb clicks clip  windows')
for k, r in d['presets'].items():
    a = r['a']; b = a['bands']
    print(f"{k:9} {a['peakDb']:6} {a['rmsDb']:6} {a['crestDb']:5} {a['centroidHz']:5} {b['sub200']:6} {b['low']:5} {b['mid']:5} {b['high6k']:6} {a['clickMaxDb']:6} {a['clicks']:4} {a['clipped']:4}  {min(a['windowsDb'])}..{max(a['windowsDb'])}  render {r['ms']:.0f}ms")
print('\nsolo layer (at level 1)   rms   peak  centroid  >6k  sub200')
for k, a in d['solos'].items():
    print(f"  {k:12} {a['rms']:7} {a['peak']:6} {a['centroid']:6} {a['hi']:6} {a['sub']}")
for k, r in d['runs'].items():
    a = r['a']
    print(f"\nrun {k}: peak {a['peakDb']} rms {a['rmsDb']} clicks {a['clicks']} clickMax {a['clickMaxDb']} clip {a['clipped']} >6k {a['bands']['high6k']}\n  windows: {a['windowsDb']}")
