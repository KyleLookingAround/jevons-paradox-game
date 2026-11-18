# The digital and information record, c. 1840–2026

Source material for *Rebound*. Every figure here has a bracketed source tag `[S#]` keyed to the list at the end.
**Unverified** means the claim is widely repeated but no primary or reliable source was found during this research;
do not put it in the game as fact without checking. "Approx." means sources disagree and the number is a fair middle.
Figures from 2024–2026 are cited individually; these move fast, so re-check before shipping.

How to read each topic:
**Efficiency path** (upgrade tree) → **Consumption** (the rebound evidence) → **Applications** (new uses unlocked by
falling price) → **Pressures** → **Restraints tried** (levers, including ones that backfired) → **Voices** (quotes,
headlines, cast) → **Ironies**.

---

## 0. The whole domain in five sentences

1. Between 2010 and 2018 global data-centre compute instances rose 550% while data-centre electricity rose 6%,
   194 → 205 TWh [S1]: the one clear, decade-long case in this record where efficiency outran demand.
2. That plateau then broke. Data centres used ~415 TWh in 2024 [S2] and ~485 TWh in 2025, +17% in a year, with AI-focused
   sites up ~50% [S3]; the IEA's central case is ~950 TWh by 2030 [S3].
3. The price of a fixed level of AI capability fell ~280× in two years (GPT-3.5-level: ~$20 → $0.07 per million
   tokens, Nov 2022 – Oct 2024) [S27], and Google's monthly token throughput rose from 9.7 trillion (Apr 2024) to over
   1.3 quadrillion (Oct 2025) [S28][S29].
4. Bitcoin is the purest backfire on record: miner efficiency improved by roughly two orders of magnitude, from ~1,000–2,000
   J/TH for early ASICs to ~10–17 J/TH [S22], and total electricity rose to an annualised ~190 TWh (Dec 2025, preliminary)
   [S21], because the protocol re-sets difficulty so that efficiency can never reduce total work.
5. In software the resource is attention: AI-adopting teams merge 98% more pull requests but spend 91% longer in review
   [S74], and experienced developers in a randomised trial were 19% *slower* with AI while believing they were 20% faster [S31].

---

## 1. Messages: penny post, telegraph, telephone, email, chat

The cleanest long series of "price per message falls, message count explodes". Sets up the Era 5 point that the
binding resource becomes the reader's attention, not the wire.

### Efficiency / price path (upgrade tree)

| Date | Step | Who | Price / capacity |
|---|---|---|---|
| 10 Jan 1840 | Uniform Penny Post (UK): one penny per half-ounce, prepaid, any distance | Rowland Hill | Replaced distance-based rates that commonly ran to several pence; a uniform 4d rate ran briefly from Dec 1839 [S11] |
| 1866 | First durable transatlantic telegraph cable (Great Eastern) | Atlantic Telegraph Co., Cyrus Field | London–New York: £20 minimum for up to 20 words (≈ £1 a word); US quotes of $10 a word with a 10-word minimum [S16] |
| 28 Jan / 5 Feb 1870 | Inland telegraph nationalised, merged into the Post Office (sources give both dates) | Telegraph Act 1868/1869 | Uniform shilling for 20 words; ~30 companies absorbed [S15][S14] |
| 1 Oct 1885 | Sixpenny telegram: ½d a word, 6d minimum | GPO | Halved the minimum [S14] |
| 1 Mar 1915 | First commercial US transcontinental call (NY–San Francisco) | AT&T | $20.70 for three minutes, $6.75 each extra minute [S78] |
| 7 Jan 1927 | First commercial transatlantic telephone (radio, not cable) | AT&T and GPO | $75 for three minutes, $25 a minute after (≈ £15 at the time; the sterling figure itself is unverified) [S58] |
| late 1971 | First networked email, between two PDP-10s side by side, user@host addressing | Ray Tomlinson, BBN | Marginal cost ~zero [S60] |
| 3 May 1978 | First unsolicited commercial email, to ~393 ARPANET addresses (sources say 393–400) | Gary Thuerk, DEC | — [S61] |
| 1 Apr 2004 | Gmail launches with 1 GB of free storage, ~500× Hotmail's 2 MB | Google (Paul Buchheit) | Storage cost to user → 0 [S66] |

### Consumption (rebound evidence)

- **Letters (UK)**: ~76 million chargeable letters in 1839 → ~169 million in 1840 (some sources say 168m) → 322 million
  by 1847 [S11]. Weekly counts published by Hill at the Statistical Society: 1,585,973 letters in the week ending
  24 Nov 1839, 3,199,637 in the week ending 23 Feb 1840 [S12]. **Revenue** did not recover to pre-reform levels for
  decades (widely reported; exact year **unverified**), a useful Mandate-versus-income tension.
- **Telegrams (UK)**: 6,830,812 in 1869, the last private year [S13]. In the first months of the sixpenny rate:
  17,369,161 messages against 11,125,794 a year earlier, **+56%** (Hansard, 22 Sept 1886) [S13]. The Central Telegraph
  Office went from ~50,000 to ~70,000 telegrams a day, and ~100,000 a day by 1890 (contemporary newspaper report,
  secondary) [S13].
- **Email**: ~361.6 billion emails sent and received per day worldwide in 2024, forecast to reach 424.2 billion by 2028, about
  4% a year (Radicati) [S17].
- **Workplace pings (2025)**: Microsoft telemetry says the typical Microsoft 365 user is interrupted every 2 minutes
  by a meeting, email or notification, about 275 times a day; ~150 Teams messages per weekday (sources say 150–153) [S51].

### Applications unlocked (each a price threshold)

Penny post: personal letters among the working classes, circulars, the valentine card trade, seed catalogues and mail-order
(Victorian mail order is real, but specific dates were not checked). Telegraph: news wire services, commodity price
arbitrage, the Seward telegram (see Ironies). Sixpenny telegram: social telegrams ("arriving 4.15"). Telephone: the
switchboard, the office as a place of constant interruption. Email: mailing lists, newsletters, spam, the reply-all.
Free storage (Gmail): never deleting anything, "search, don't sort" (the slogan is widely attributed to Gmail but the
exact phrase was **unverified**).

### Pressures and crises

- **Spam**: invented in 1978 within seven years of email [S61]. The receiver pays in attention; the sender pays nothing.
  This is the decisive structural feature for a game mechanic (see Candidates, §13).
- **The infinite workday**: 48% of employees and 52% of leaders say work feels "chaotic and fragmented"; meetings after
  8 pm up 16% year on year; meetings spanning time zones up 35% since 2021 [S51].
- **Attention fragmentation**: Gloria Mark's measurements of time on one screen before switching: ~2.5 minutes (2003–04
  study, stopwatch shadowing), ~75 seconds (2012), ~47 seconds (pooled 2016–2020 studies, median ~40) [S52]. Mark
  herself warns this is a pooled figure, not a clinical "attention span".

### Restraints tried (levers)

- **Prepayment by the sender (1840)**: Hill's quiet masterstroke. Before 1840 the *recipient* often paid; making the
  sender pay was the original anti-spam measure. A lever that worked. Email reversed it.
- **E-postage for email**: proposed repeatedly as a spam remedy; Bill Gates told Davos in January 2004 that spam would be
  "solved" within two years (widely reported; exact wording **unverified** here). Never adopted at scale. The penny post
  in reverse, and a good lever that fails.
- **Right to disconnect laws**: France (effective 1 Jan 2017), Portugal (2021), Australia (Aug 2024). Dates are from
  general knowledge and were not re-verified this session; check before use.
- **Inbox Zero** (Merlin Mann, mid-2000s): a personal discipline that became a productivity genre and its own content
  industry. A lever that rebounds into more email *about* email. The rebound framing is our interpretation.
- **Phone-side "digital wellbeing"**: Apple Screen Time and Google Digital Wellbeing (both 2018; general knowledge).

### Voices

- Hill's pamphlet *Post Office Reform: Its Importance and Practicability* (1837): the founding text of "make it cheap and
  volume will pay for it". Title verified; quotations from it were not.
- Ray Tomlinson on the first email: "The test messages were entirely forgettable and I have, therefore, forgotten them." [S60]
- Gary Thuerk, the first spammer, later said recipients complained and nobody could unsubscribe; DEC credited the mailing
  with roughly $12–14 million in sales (sources disagree) [S61].

### Ironies

- In 1866 Secretary of State William Seward's diplomatic cable cost $19,540.40, reported as more than three times his
  salary [S16]. The first message-cost scandal.
- Gmail launched on April Fools' Day and was widely taken for a joke [S66].
- Western Union sent its last telegram in January 2006, and the UK inland telegram ended in 1982 (rate table runs
  1870–1982) [S14]. The service that kicked off cheap messaging was killed by cheaper messaging.

---

## 2. Paper: Gutenberg to the paperless office

### Efficiency path

| Date | Step | Who | Figure |
|---|---|---|---|
| c. 1455 | 42-line Bible, movable type | Johannes Gutenberg | ~180 copies (LoC: 145 paper, 35 vellum; other splits quoted; modern estimates 160–185) [S71] |
| 29 Nov 1814 | *The Times* printed on a steam-driven cylinder press | Friedrich Koenig and Andreas Bauer; John Walter II | 1,100 sheets an hour, against ~200–250 for a Stanhope hand press (sources disagree on baseline) [S20] |
| 1959 | Xerox 914, the first plain-paper office copier | Haloid Xerox (Chester Carlson's xerography) | Rated to 100,000 copies a month at 7 a minute; rented in 1965 for $25 a month plus 10¢ a copy [S19] |
| 1984 | HP LaserJet (desktop laser printer) | HP (laser printing invented at Xerox PARC by Gary Starkweather, early 1970s, general knowledge) | 300 dpi, 8 ppm, $3,495, cut to $2,995 Sept 1985 [S79] |

### Consumption

- **Book output** in Western Europe rose sharply after the mid-15th century as book prices fell (Buringh & van Zanden
  2009 build the long series; their totals are in their tables and were not extracted here) [S71].
- **Copiers**: Xerox planned for ~2,000 copies a month per customer; many made 10,000, some 100,000 [S19]. One
  widely repeated claim says US copying rose from ~20 million copies a year before the 914 to ~14 billion by 1966
  (attributed to the Smithsonian, **unverified**).
- **The paperless office**: the phrase is generally traced to *Business Week* in 1975 ("The Office of the Future"; title
  and wording **unverified**) [S18]. Worldwide office paper consumption then **more than doubled between 1980 and
  1997** [S18], the period of the PC, the laser printer and email. Sellen & Harper, *The Myth of the Paperless Office*
  (MIT Press, 2002), is the standard study [S18]. A common claim that "introducing email increases paper use by 40%" is
  **unverified**; no primary source was found.
- The perennial "10,000 sheets per office worker per year" traces back to a mid-1990s US fact sheet citing 1993 data and is
  repeated without fresh sourcing; treat as **approx./dated** [—].

### Applications unlocked

Daily newspapers at scale (steam press) · the memo and the carbon copy · the photocopied handout, the samizdat, the
office party bottom (folk history; **unverified**, though a writer may enjoy it as a rumour) · desktop publishing ·
printing every email to read it.

### Restraints and what happened

- "Think before you print" email footers: no evidence found of any effect.
- Duplex-by-default printer settings: plausible, but no data found.
- Real decline came from **substitution of use** (screens good enough to read on, smartphones), not exhortation.
  US/European office paper demand fell in the 2010s (direction general knowledge; magnitude not verified here).

### Ironies

- Xerox PARC invented the laser printer *and* the graphical desktop, the two inventions most responsible for the
  paperless office using more paper.
- The Times, the first steam-printed paper, printed its first steam edition in secret, to stop its hand-pressmen
  smashing the machine (secondary account, consistent across sources) [S20].

---

## 3. Computing hardware: Moore, Dennard, Koomey

### Efficiency path (the auto-halving engine of Era 4)

| Date | Step | Figure |
|---|---|---|
| 19 Apr 1965 | Gordon Moore, "Cramming more components onto integrated circuits", *Electronics* | Component count doubling yearly; revised to every two years in 1975 (the revision date is from general knowledge) [S59] |
| 1974 | Dennard et al.: shrink a transistor and power density stays constant | Enabled 30 years of "free" clock speed rises |
| 1946–2009 | Koomey's law: computations per kWh double every **1.57 years**; PCs 1.52 years from 1975 | Koomey, Berard, Sanchez, Wong, *IEEE Annals* 2011 [S7] |
| c. 2005–07 | End of Dennard scaling: leakage, the "power wall" | Clock speeds stall near 4 GHz; Intel abandons a 4 GHz Pentium 4 and tops out at 3.8 GHz [S59] |
| after 2000 | Koomey's doubling slows to ~2.6 years (secondary sources; Koomey's own later work not checked) | **approx.** |
| since 2010 | Electricity per computation of a typical volume server fell by a factor of **4** (2010–2018) [S1] | |
| 2010→2018 | Watts per terabyte of installed storage fell by a factor of ~**9** [S1] | |

**Long run**: Nordhaus (2007) puts the improvement in computer performance since manual computation at between
**1.7 trillion and 76 trillion times**, with a trend break around the Second World War [S57]. Coyle & Hampton (2023)
estimate computation was ~100× (conservative) to ~300× (GPU-weighted) cheaper by the early 2020s than in 2000 [S57].

### Consumption

The rebound shows up in software and data centres (§4, §5), not in chip energy alone.

### Applications unlocked by falling cost of compute

Payroll and airline booking (mainframe) · spreadsheets (VisiCalc, 1979; general knowledge) · desktop publishing ·
the web · smartphones · video streaming · crypto mining · model training · agentic inference. Each one was
uneconomic a doubling or two earlier.

### Voices and laws (a recurring cast of "laws")

- **Moore's law** (1965/1975). Gordon Moore, the patron saint of the auto-halving.
- **Koomey's law** (2011). Jonathan Koomey also co-wrote the Masanet paper [S1]: the same man supplies the
  efficiency law and the evidence that efficiency briefly won. A natural recurring "statistician" character.
- **Dennard scaling**: the law that quietly expired in about 2006 while the industry kept the marketing.

---

## 4. Software bloat: what Andy giveth, Bill taketh away

### The laws

- **Wirth's law** (Niklaus Wirth, "A Plea for Lean Software", *IEEE Computer* 28(2), Feb 1995, pp. 64–68): "Software is
  getting slower more rapidly than hardware becomes faster." Wirth attributes it to Martin Reiser [S9]. The abstract
  says software's "girth has surpassed its functionality" [S9].
- **Andy and Bill's law**: "What Andy giveth, Bill taketh away." Andy Grove (Intel) and Bill Gates (Microsoft);
  a 1990s conference one-liner of unknown authorship. Variant: "What Intel giveth, Microsoft taketh away" [S10].
- **Gates's law** ("the speed of software halves every 18 months") and **May's law** (David May: software efficiency halves
  every 18 months, compensating Moore's law) are both attributions of uncertain provenance: **unverified**.

### Bloat in numbers

| Measure | Then | Now | Source |
|---|---|---|---|
| Median web page, desktop | 1,208 KB (Oct 2014) | 2,652 KB (Oct 2024), +120% | [S8] |
| Median web page, mobile | 505 KB (Oct 2014) | 2,311 KB (Oct 2024), **+357%** | [S8] |
| Median JavaScript per page | — | 620 KB desktop, 570 KB mobile (2024) | [S8] |
| 90th-percentile page | — | 8,375 KB desktop, 7,680 KB mobile (2024) | [S8] |
| Requests per median page | — | 71 desktop, 66 mobile (2024) | [S8] |
| Top-10 US iPhone apps, total install size | 164 MB (May 2013) | 1.8 GB (May 2017), **11×**; Snapchat 51×, Facebook 12× (32 → 388 MB), Spotify "only" 6× | [S72] |
| Windows minimum RAM | Windows 95: 4 MB | Windows 11: 4 GB, 64 GB storage. A 1,000× increase in the floor (Microsoft published specs; not re-fetched this session) | general knowledge |

Sensor Tower linked the app growth partly to Apple raising the maximum app size to 4 GB in 2015, and noted the base
iPhone's storage had doubled from 16 GB to 32 GB over the same period [S72]: the storage was the efficiency, the bloat
the rebound. Year on year, median page weight rose 8.6% (desktop) and 6.4% (mobile) from Oct 2023 to Oct 2024 [S8].

Electron/desktop app sizes: frequently cited "a chat app that needs 1 GB of RAM" figures were **not verified** and are
omitted.

### Pressures

Slow pages on cheap phones (the global poor pay the bloat tax), battery drain, forced hardware upgrades (feeds e-waste, §6),
security surface (§11).

### Restraints tried

- **Performance budgets** and Google's Core Web Vitals (2020–21, general knowledge): a ranking incentive. Medians kept
  rising regardless [S8].
- **AMP** (Accelerated Mobile Pages, Google, 2015–16; general knowledge): a lean subset that became its own
  dependency. A lever that rebounded into lock-in.
- **Wirth's Oberon** (a whole OS and compiler small enough for one book) was his demonstration that lean was possible [S9].
  Nobody followed.

### Ironies

- The page-weight median for mobile grew faster than desktop: the "lite" device got the heavier diet [S8].
- Wirth wrote the plea in 1995, the year Windows 95 shipped.

---

## 5. Data centres: the plateau, the break, the grid

### Efficiency path

| Date | Step | Figure |
|---|---|---|
| 2007 | Uptime Institute begins tracking industry average PUE (total facility energy / IT energy) | ~2.5 [S46] |
| 2011 | | 1.98 [S46] |
| 2014 | | 1.65 [S46] |
| 2018 | | 1.58 [S46] |
| 2019 | (a rise) | 1.67 [S46] |
| 2020–2024 | Flat band | 1.55–1.59; 2024 survey 1.56 (n=526) [S46] |
| 2010–2018 | Virtualisation: ~5× more compute instances per server; shift from traditional (79% of instances in 2010) to cloud/hyperscale (89% in 2018) | [S1] |
| 2010s | Hyperscale sites "with PUEs of 1.1 or lower, which is close to the practical minimum" | [S1] |

Uptime's Andy Lawrence: "Average PUE levels remain mostly flat for the fifth consecutive year, but this obscures the
advances in newer, larger facilities." [S46]

### Consumption: the plateau and the break

**Global (Masanet, Shehabi, Lei, Smith, Koomey, *Science* 367:984, 28 Feb 2020)** [S1]:
- 2010: ~194 TWh. 2018: ~205 TWh, **+6%**, about 1% of world electricity.
- Over the same period: compute instances **+550%** (6.5×), data-centre IP traffic **+11×**, installed storage **+26×**.
- Energy per compute instance fell ~20% a year. IT device energy 92 → 130 TWh, offset by falling infrastructure
  (cooling, power) energy.
- The authors warned the remaining efficiency could absorb "the next doubling" of compute but not much more, and that
  "the next doubling of global data center compute instances may occur within the next 3 to 4 years."

**US (LBNL)** [S4]: roughly flat at ~60 TWh from 2014–2016 (some sources say 58 TWh for 2014), rising from 2017; **176 TWh
in 2023 (4.4% of US electricity)**; projected 325–580 TWh by 2028 (6.7–12%). Report released 20 Dec 2024.

**Global (IEA)**:
- ~415 TWh in 2024 (~1.5% of world electricity), growing ~12% a year since 2017; base case ~945 TWh by 2030 and ~1,200
  TWh by 2035, range 700–1,700 TWh [S2].
- 2026 update: **+17% in 2025 to ~485 TWh**; AI-focused data centres **+50%**; outlook ~950 TWh by 2030 (~3% of world
  demand). Capex of five large tech firms passed **$400 billion** in 2025 and is set to rise a further ~75% in 2026 [S3].
- IEA's own counterweight: if all conventional web searches were replaced by simple AI text queries, the total would be
  under 4 TWh a year [S3]. The per-query cost is small; the new uses are what count.

**Ireland (CSO)** [S41]: data centres took 5% of metered electricity in 2015, 18% in 2022, 21% in 2023, 22% in 2024
(6,969 GWh, +10% while all other users rose 3%), **23% in 2025 (7,663 GWh)**. An IEA projection quoted in coverage puts
it near 30% by 2028.

**Corporate**:
- Google: 2023 emissions ~14.3 MtCO₂e, **+48% on 2019** [S42]; data-centre water 6.1 billion US gallons in 2023, +17%
  on 2022 [S42]; next report: 8.1 billion gallons in 2024 (+28%) and data-centre electricity +27% (secondary coverage)
  [S42].
- Microsoft (2024 report, FY2023): "across all Scopes 1–3, Microsoft's emissions are up 29.1% from the 2020
  baseline"; Scope 3 +30.9%, "primarily" from "the construction of more datacenters" [S44]. Water use +87% since
  2020 to nearly 2.1 billion gallons (GeekWire, secondary) [S44].

### Applications (what filled the plateau and broke it)

Cloud migration (2010s) · streaming (§7) · social video · enterprise SaaS · crypto (co-located, §8) · model training ·
inference at consumer scale · agents (§9).

### Pressures and crises

- **Grid capacity prices (PJM, eastern US)**: capacity auction cleared at **$269.92/MW-day** for 2025/26, then
  **$329.17** for 2026/27 (at the regulator-approved cap; ~$389 uncapped by PJM's estimate), then **$333.44** for
  2027/28, again at the cap. PJM attributes nearly 5,100 MW of a 5,250 MW forecast load increase to data centres [S76].
  Earlier coverage called it the first PJM auction to fail to procure its reliability target (NRDC) [S76].
- **Water**: Google's proposed data centre at Cerrillos, Santiago (Chile). The residents' group MOSACAT opposed it from 2019;
  permitted extraction is variously reported at 169 l/s (**unverified**), 228 l/s, or 7.6 million litres a day.
  An environmental court partially reversed the permit in early 2024, and Google said it would switch to air cooling,
  which uses more electricity [S48].
- **On-site gas**: xAI's Colossus (Memphis) ran up to 35 gas turbines (>420 MW) before permits, per SELC aerial
  surveys. 15 were permitted after an NAACP notice of intent to sue. At Colossus 2 (Southaven, Mississippi), 27
  turbines drew a lawsuit, and in March 2026 Mississippi regulators permitted 41 turbines, ~1.2 GW [S68].
- **Nuclear revival**: Constellation and Microsoft signed a 20-year PPA (Sept 2024) to restart **Three Mile Island
  Unit 1** (≈837 MWe), renamed the Crane Clean Energy Center, targeting 2028 [S43]. Unit 1 shut in 2019 for economic
  reasons; Unit 2 was the one that partially melted down in 1979 (general knowledge).

### Restraints tried (levers) and outcomes

- **Moratoria**: Singapore paused new data centres 2019–2022 and reopened with a capped quota and efficiency
  conditions (PUE < 1.3, Green Mark Platinum, as reported) [S47]. Amsterdam and Haarlemmermeer paused in 2019 (exact
  date and ending **unverified**) [S47]. Dublin grid connections: EirGrid effectively froze new Dublin-area connections
  (widely reported; the "until 2028" terms are **unverified**) [S41]. Mechanism: **leakage**, since capacity moved to
  Johor (Malaysia), the Nordics and elsewhere (the direction is general knowledge; magnitudes not checked).
- **Efficiency standards**: the PUE plateau suggests this lever is spent [S46]. Masanet et al. recommended Energy Star
  for servers, PUE incentives and better reporting [S1].
- **Disclosure**: the EU Energy Efficiency Directive (2023) requires data-centre energy reporting (from general
  knowledge; check the dates). Amsterdam moved to fine operators that fail to switch off idle servers (April 2022, secondary) [S47].
- **Clean-power procurement**: corporate PPAs and 24/7 matching. Google's emissions still rose 48% [S42]; Brad Smith:
  the moon is now "more than five times as far away as it was in 2020" [S45].
- **Water-free cooling**: trades water for electricity (Chile) [S48]. A lever that converts one pressure into another.

### Voices (cast candidates)

- **Brad Smith**, Microsoft president, May 2024, on the 2020 "carbon moonshot": the moon is "more than five times as far
  away as it was in 2020" (Bloomberg *Zero*) [S45].
- **Eric Masanet and Jonathan Koomey**: the plateau's authors, who warned in 2020 that it would end [S1].
- **Andy Lawrence** (Uptime): the PUE has been "mostly flat for the fifth consecutive year" [S46].
- MOSACAT residents (Tania Rodríguez features in TIME and *Down to Earth* coverage) [S48].

### Ironies

- The paper that proved efficiency could hold data-centre energy flat was published in February 2020; ChatGPT launched
  in November 2022.
- Three Mile Island is being reopened to power AI [S43].
- Ireland's data centres grew their share of national electricity from 5% to 23% in ten years [S41], while the
  country ran public campaigns to cut household use (campaigns are general knowledge, not checked).

---

## 6. Storage, data and e-waste

### Efficiency path

| Date | Medium | Price |
|---|---|---|
| 1956 | IBM 350 RAMAC (~5 MB) | Rented at ~$3,200 a month; Backblaze frames it as $640 per MB per month. Purchase-equivalent quotes run ~$10,000/MB (sources conflict) [S37] |
| 1980 | IBM 3380, first GB-class drive | — [S37] |
| 1981 | | ~$500,000 per GB (Backblaze, secondary copy) [S37] |
| 1956–2010s | | Average HDD cost fell ~41% a year; "$2 million per gigabyte" to "2 cents" (Computerworld) [S37] |
| 2009 | Backblaze's own purchases | $0.11/GB [S37] |
| 2017 | | $0.033/GB [S37] |
| Nov 2022 | | **$0.0144/GB** [S37] |

### Consumption

- Data "created, captured, copied and consumed" (IDC): ~2 ZB (2010) → 64.2 ZB (2020) → forecast 181 ZB for 2025
  (2021 vintage) [S38]. IDC's November 2026 post: **>274.4 ZB in 2026**, forecast **718.5 ZB in 2030** [S38].
  Only a small fraction is stored (a 2018-era IDC summary: ~9 ZB stored by 2025) [S38].
- Data-centre storage capacity grew ~26× from 2010 to 2018 while storage energy roughly tripled [S1].
- "Dark data" (share stored and never used): commonly quoted figures are **unverified**.

### Applications unlocked

Keeping all email (Gmail 1 GB, 2004; 2 GB a year later) [S66] · photo libraries in the tens of thousands per person
(magnitude **unverified**) · CCTV retention · log everything, decide later · training corpora.

### Pressures: e-waste

- **62 million tonnes** of e-waste in 2022, +82% since 2010; forecast **82 Mt by 2030**. Only **22.3%** documented as
  collected and recycled, forecast to fall to 20% by 2030. Generation is rising five times faster than documented recycling
  [S39].

### Restraints

- **Mailbox quotas** (Hotmail's 2 MB forced constant clear-outs) [S66]: abolished by competition, not regulation. A
  lever destroyed by the efficiency itself.
- **Retention limits** (GDPR storage limitation, 2018; general knowledge) and auto-delete defaults.
- **Right to repair / common charger**: the EU's USB-C common charger rule and the 2024 right-to-repair directive, plus
  France's repairability index (2021). All from general knowledge; check the dates.

### Ironies

- The same paper shows storage capacity up 26× and storage energy up only 3× [S1]: a genuine efficiency win, which
  existed so that nobody ever had to delete anything.

---

## 7. Bandwidth and video: the quality ratchet

### Efficiency path

Dial-up (56 kbit/s, late 1990s) → ADSL → fibre; codec generations MPEG-2 → H.264/AVC (2003) → HEVC (2013) →
AV1 (2018). Each codec roughly halves bits for the same quality (rule of thumb, general knowledge; not re-verified).
Nielsen's law (Jakob Nielsen, 1998: high-end users' bandwidth grows ~50% a year) is a quotable companion to Moore
(general knowledge).

**Mobile data (India)**: before Reliance Jio launched (Sept 2016) users paid ~Rs 228–250 per GB. TRAI-based figures:
~Rs 160/GB in Oct–Dec 2016 → **Rs 10.77/GB** in Jan–Mar 2021 [S69].

### Consumption

- **India**: data per user per month rose from **878.63 MB** (Oct–Dec 2016) to **12.33 GB** (Jan–Mar 2021), ~14× in four
  years, while price fell ~15× [S69]. A near-textbook elastic adoption curve.
- **Video's share of traffic** (Sandvine): ~58% of downstream (2018; Netflix alone 15%) → over 60% (2019) → **65% of all
  internet traffic in 2022**, video volume +24% that year, total traffic +23% [S40]. 2024 edition: Google, Facebook and
  Netflix drive nearly 70% of fixed and mobile data [S40].

### The resolution ladder (an upgrade tree that eats itself)

Netflix data per hour of viewing: Low ~0.3 GB, Medium ~0.7 GB, SD up to 1 GB, HD up to 3 GB, Ultra HD up to 7 GB (the SD
figure is confirmed on Netflix's page; HD and UHD figures come from multiple third parties citing Netflix) [S77].
Every codec saving was spent on more pixels, higher frame rates and HDR.

### Pressures and restraints

- **March 2020**: at the EU's request (Thierry Breton) Netflix and YouTube cut default streaming quality in Europe
  during lockdown (general knowledge; check before use). A rare, real **quality cap** lever, applied for weeks.
- **Data caps and zero-rating**: caps restrain use; zero-rating (exempting favoured apps) undoes them.

### Ironies

- The codec that halves bandwidth arrives in the same product cycle as the television that quadruples pixels.

---

## 8. Cryptocurrency: the near-perfect backfire

### The mechanism (write this into the game exactly)

Bitcoin adjusts mining **difficulty** every 2,016 blocks (~two weeks) to hold block time near ten minutes (protocol fact).
So total hashing work is set by how much miners can profitably spend, i.e. by **coin price × block reward + fees**, divided
by electricity cost. More efficient machines do not reduce total energy: they raise difficulty until the marginal miner
is again just profitable. Efficiency changes *who* mines, not *how much power is burned*. Rebound ≈ 100%, by design.

### Efficiency path (J per terahash; vendor-adjacent sources, approximate)

| Era | Hardware | J/TH |
|---|---|---|
| 2009–10 | CPU | ~10,000,000 (order of magnitude) [S22] |
| 2010–12 | GPU (Laszlo Hanyecz is widely credited with the first GPU miner, **unverified** here), FPGA | no reliable figure found |
| 2013 | First ASICs; Antminer S1 | ~1,000–2,000 [S22] |
| 2015 | Antminer S7 | ~250 [S22] |
| 2016 | Antminer S9 (16 nm BM1387) | ~98 (also quoted ~80) [S22] |
| 2020 | S19 Pro | ~29.5 [S22] |
| 2023–24 | S21 / S21 XP | ~17.5 / ~13.5; hydro ~11 [S22] |
| 2025 | S23 Hydro | ~9.5 [S22] |

### Consumption

- Cambridge (CCAF) Digital Mining Industry Report 2025: ~138 TWh/yr, ~39.8 MtCO₂e (survey covering ~48% of hashrate) [S21].
- Preliminary update: annualised demand **~190 TWh in Dec 2025, +38% on June 2024's 138**, even as the mix shifted to
  hydro and gas; emissions ~40 → ~48 MtCO₂e (location-based model: 69.6 Mt) [S21].

### Applications

Payments (the pizza: 10,000 BTC for two pizzas, 22 May 2010, worth ~$41 at the time) [S24] · speculation · ICOs (2017) ·
NFTs (2021, on Ethereum) · stranded-gas mining · grid "demand response".

### Pressures and restraints (levers)

- **China's 2021 crackdown** (State Council, May 2021, general knowledge): hashrate migrated to the US, Kazakhstan
  and Russia rather than disappearing. CCAF's China share fell from roughly three-quarters (2019) to near zero (mid-2021)
  and re-emerged at ~20% by early 2022 (**approx.**, CCAF data not re-fetched). A **leakage** lever.
- **New York moratorium**, signed by Gov. Kathy Hochul on 22 Nov 2022: a two-year pause on new or renewed air permits for
  fossil-fuel power plants doing proof-of-work mining; existing operators and renewables exempt [S75]. Narrow, real,
  "first in the nation".
- **The Merge** (Ethereum, 15 Sept 2022): proof-of-work replaced by proof-of-stake. CCRI (commissioned by ConsenSys)
  found electricity fell **>99.988%, from ~23 million MWh/yr to ~2,600 MWh**; CCAF estimated ~7.87 GWh/yr afterwards,
  −99.96%. The Ethereum Foundation's pre-Merge estimate was −99.95% [S23]. **The only lever in this whole record that cut a
  digital system's energy by orders of magnitude, and it worked by changing the mechanism, not the efficiency.**
- **Demand response that pays miners**: in August 2023 ERCOT (Texas) heat-wave conditions earned Riot Platforms
  ~**$31.7 million** in power and demand-response credits ($24.2m curtailment, $7.4m demand response), against roughly
  $8.9 million of bitcoin mined that month [S65]. A lever that rebounds: the grid pays the load to exist so it can pay it
  to stop.

### Voices

- Jason Les (Riot CEO) argued the credits lower mining costs; Greenpeace called it a bad deal for Texans [S65].
- Laszlo Hanyecz, the pizza buyer, as a recurring figure: every 22 May the pizzas are revalued [S24].

### Ironies

- Riot made about three and a half times as much for *not* mining in August 2023 as for mining [S65].
- The pizza is the most expensive meal in the record and also its most efficient transaction.

---

## 9. AI: the cost per token collapses, use explodes

### Efficiency path

| Date | Step | Figure |
|---|---|---|
| 2020 | GPT-3 training (estimate) | 1,287 MWh, 552 tCO₂e (Patterson et al. 2021; uses OpenAI inputs, PUE 1.1, US-average grid) [S64] |
| Nov 2021 → late 2024 | GPT-3-class output price | $60 → ~$0.06 per million tokens, "LLMflation", ~10× cheaper per year at constant capability (a16z, Guido Appenzeller, 12 Nov 2024; the 2021 and $0.06 endpoints are secondary) [S25] |
| Nov 2022 → Oct 2024 | GPT-3.5-level (64.8% MMLU) | ~$20 → $0.07 per million tokens, **~280×** (Stanford AI Index 2025) [S27] |
| Mar 2025 | Epoch AI: price to reach a fixed benchmark score | falls **9× to 900× a year** depending on task, median ~50× [S26] |
| Dec 2024 / Jan 2025 | DeepSeek-V3 / R1 | Final training run reported as ~2.788 M H800 GPU-hours, ~$5.6 M at $2/hr (DeepSeek V3 technical report; excludes prior research; general knowledge) |
| May 2024 → May 2025 | Google: median Gemini Apps text prompt | **0.24 Wh, 0.26 ml water, 0.03 gCO₂e**; energy per prompt **−33×** in a year (narrower accelerator-only method: 0.10 Wh). Not third-party verified [S62] |
| Jun 2025 | Sam Altman, "The Gentle Singularity" | average ChatGPT query ~0.34 Wh, ~0.000085 gallons of water ("roughly one fifteenth of a teaspoon"); no method published [S63] |

Note for the writers: the frontier price does **not** fall. a16z: OpenAI's o1 launched at the same $60 per million output
tokens as GPT-3 had at launch [S25]. The cheapness is at constant capability; users buy the new frontier.

### Consumption (rebound evidence)

- **Google tokens processed per month** across products and APIs: **9.7 trillion** (Apr 2024) → **480 trillion**
  (I/O, May 2025, "50 times more") [S28] → **980 trillion** (Jul 2025) → **>1.3 quadrillion** (Q3 2025, ">20× growth in a
  year") [S29].
- Google first-party model APIs: **7 billion tokens per minute** (Q3 2025) [S29] → **nearly 32 billion tokens per minute**
  (Q3 2026, +40% quarter on quarter, >4× year on year); Gemini app at **1 billion** users [S30].
- Q3 2026 Alphabet capex $51.4bn; FY2026 guidance raised to $195–205bn (secondary coverage of the 28 Oct 2026 call) [S30].
- Data-centre electricity: AI-focused data centres +50% in 2025 [S3].
- Stargate (21 Jan 2025, White House): OpenAI, SoftBank, Oracle and MGX; "intends to invest $500 billion over the next four
  years… We will begin deploying $100 billion immediately" [S73].

### The Jevons moment (a set piece)

- **Mon 27 Jan 2025**: DeepSeek's cheap R1 model triggers a sell-off. Nvidia closes down ~17% at ~$118.58 and loses
  ~**$589 billion** of market value, reported as the largest one-day loss for any company [S6]. Nasdaq −3.7% [S6].
- The same day **Satya Nadella** posts (LinkedIn per Fortune; also reported on X): "**Jevons paradox strikes again!** As AI
  gets more efficient and accessible, we will see its use skyrocket, turning it into a commodity we just can't get
  enough of," with a link to the Wikipedia article [S5]. The second sentence's exact wording varies slightly between outlets.
- Within a year Google's monthly tokens were up >20× [S29]. Jevons, a Victorian coal economist, became a share-price
  defence.

### Applications unlocked (threshold order is roughly the historical order)

Autocomplete → chat → search answers (AI Overviews) → coding assistants → reasoning models (many hidden "thinking" tokens
per answer) → agents running for hours → agents calling agents. Each step multiplies tokens per task, so price per
token falls while price per *task* need not (Epoch and commentators make this point) [S26].

### Pressures

- Grid (§5), water (§5), gas turbines (§5), GPU scarcity ("capacity constraints", Pichai, Q3 2026) [S30].
- The human-side pressure is §10: review load, slop.

### Restraints tried

- **Rate limits and usage caps** on consumer and coding plans (widespread 2024–26; specific vendor dates not verified this
  session). The AI-era quota: like Hotmail's 2 MB, under competitive pressure to be lifted.
- **Smaller models / distillation**: the efficiency lever, and the cause of the 280× fall [S27].
- **Disclosure**: Google's per-prompt figures [S62] and Altman's [S63] are both self-reported with no independent audit.

### Voices (cast)

- **Satya Nadella**, "Jevons paradox strikes again!" [S5]: the game's natural antagonist-cum-narrator.
- **Sundar Pichai**: the quarterly token count as a weather report [S28][S29][S30].
- **Sam Altman**: per-query numbers as reassurance, "one fifteenth of a teaspoon" [S63].
- **Guido Appenzeller** (a16z): coined "LLMflation" [S25].
- **Jensen Huang**: the share price that fell 17% on an efficiency announcement [S6].

### Ironies

- An efficiency breakthrough wiped $589bn off the company that sells the efficiency [S6]; the CEO buying the most chips
  cited Jevons to say it would mean buying more.
- Google cut energy per prompt 33× in a year [S62], and its monthly tokens rose >20× in a year [S29]. Run the arithmetic
  in a headline.

---

## 10. Software engineering: the stock of code and the review bottleneck (Era 5 core)

### Efficiency path (an upgrade tree for "working features per hour of attention")

Assembler → FORTRAN (1957) → structured programming → C/Unix (1970s) → open source and shared libraries (GNU 1983,
Linux 1991) → package managers (CPAN 1995, npm 2010) → frameworks → cloud (AWS 2006) → CI/CD → low-code → **AI
autocomplete** (GitHub Copilot preview 2021) → chat assistants (2022–23) → **coding agents** (2024–26). Dates in this
line are general knowledge except where cited below.

Adoption markers:
- Sundar Pichai, 29 Oct 2024: "more than a quarter of all new code at Google is generated by AI, then reviewed and
  accepted by engineers." [S54]
- Dario Amodei (Anthropic), Council on Foreign Relations, 10 Mar 2025: "I think we will be there in three to six months,
  where AI is writing 90% of the code," and in twelve months "essentially all" (secondary transcripts) [S70].
- GitHub Octoverse 2025: nearly **1 billion commits** pushed in 2025 (+25%); **36.2 million** new developers, "one every
  second"; 180M+ developers; ~80% of new developers use Copilot in their first week; TypeScript overtook Python and
  JavaScript as the most-used language in Aug 2025 (2.64M monthly contributors, +66%), a shift GitHub links to AI
  tooling [S53].

### Consumption: more code, more maintenance, more review

- **Review bottleneck (Faros AI, ~10,000 developers, 1,255 teams, mid-2025)**: high-AI-adoption teams complete 21% more
  tasks and **merge 98% more PRs**, but **PR review time rises 91%**; PR size +154%; bugs per developer +9% [S74].
  Vendor telemetry; Faros's 2026 follow-up claims median review time +441% and PRs merged with no review +31.3%
  (vendor blog) [S74].
- **DORA 2024 (Google Cloud)**: a 25% rise in AI adoption is associated with an estimated **−1.5% delivery throughput**
  and **−7.2% delivery stability**, plus −2.6% time on valuable work, alongside +3.4% code quality and +3.1% review speed
  [S32]. Large AI-generated changes are "slower and more prone to instability".
- **METR RCT (July 2025)**: 16 experienced open-source maintainers, 246 tasks on repos averaging >1M lines; with AI
  allowed, tasks took **19% longer**. They forecast a 24% speed-up beforehand and still believed in a 20% speed-up afterwards
  [S31]. Authors caution against generalising.
- **GitClear 2025** (211M changed lines, 2020–24): blocks with ≥5 duplicated lines up **8×** in 2024; "copy/paste"
  exceeded "moved" (refactored) code for the first time; churn rose from 3.3% (2021) to 5.7% (2024) [S33]. Shows
  correlation, not attribution.
- **Maintenance share (pre-AI)**: Stripe's *Developer Coefficient* (2018): developers spend **17.3 hours a week** on
  maintenance (13.5 on technical debt, 3.8 on bad code), extrapolated to ~$85bn a year (a vendor survey; Sonar found
  ~12 hours) [S55]. CISQ estimates US accumulated technical debt at ~$1.52 trillion (secondary; the $2.41tn "cost of poor
  quality" headline is **unverified** here) [S55].
- **Dependency sprawl (npm)**: no official count; ~3.1M (Wikipedia), ~4.3M installable names (Socket, Oct 2026), ~6.0M
  (ecosyste.ms) [S80]. Secondary summaries of Sonatype claim ~8 trillion npm downloads in 2025 (+65%) and >454,600 new
  malicious packages in 2025, >99% of them on npm (**secondary, verify against Sonatype**) [S80].
- **The commons empties**: Stack Overflow questions peaked around 2014 (~200,000 a month). By May 2025 they were "as low as
  when Stack Overflow launched in 2009" (Pragmatic Engineer), and the decline began around 2020, before ChatGPT [S56]. Later
  monthly counts in the low thousands are reported by secondary sources and disagree.

### Applications (what cheaper code produced)

Internal tools nobody would have funded · personal throwaway apps · legacy rewrites · "vibe-coded" prototypes ·
bots filing bug reports · agents writing code for agents. These match the current Era 5 applications in `src/content.ts`.

### Pressures and crises

- **left-pad (22 Mar 2016)**: Azer Koçulu unpublished all 273 of his npm modules after a naming dispute with the messaging
  company Kik; an **11-line** left-padding function vanished and broke React, Babel and thousands of builds. npm restored
  it, the "unprecedented" step taken by CTO Laurie Voss, and changed its unpublish policy [S34].
- **xz-utils backdoor (disclosed 29 Mar 2024)**: a persona "Jia Tan", active since 2021 and co-maintainer by 2022/23,
  planted a backdoor in xz 5.6.0/5.6.1 targeting sshd. It was caught by **Andres Freund** (Microsoft, PostgreSQL developer)
  because SSH logins were ~**500 ms** slower than they should have been (one source says ~100 ms) [S35]. The defence against a
  two-year state-level operation was one engineer annoyed by half a second.
- **CrowdStrike (19 Jul 2024)**: a faulty Falcon content update crashed ~**8.5 million** Windows machines, "less than 1%"
  of the total (Microsoft). Parametrix estimated ~$5.4bn in direct losses to US Fortune 500 firms excluding Microsoft;
  Delta ~$500m [S36]. CrowdStrike later blamed a bug in its own update-validation tool [S36].
- **AI slop in security reports**: curl's Daniel Stenberg ended the project's HackerOne bug bounty at the end of
  **January 2026** (commit "BUG-BOUNTY.md: we stop the bug-bounty end of Jan 2026"), citing floods of AI-generated
  reports. ~$86–90k was paid over six years for 78–87 confirmed bugs (sources disagree) [S67]. Secondary reports say
  HackerOne's Internet Bug Bounty paused submissions in March 2026 (**verify**) [S67].
- Heartbleed (April 2014; OpenSSL then reportedly lived on ~$2,000 a year in donations, per its foundation's Steve
  Marquess) and Log4Shell (Dec 2021): general knowledge; figures not re-verified this session.

### Laws (a recurring "statute book" cast)

- **Brooks's law** (Fred Brooks, *The Mythical Man-Month*, 1975): "Adding manpower to a late software project makes it
  later." Agents as manpower is the obvious gag. Also *No Silver Bullet* (1986).
- **Lehman's laws of software evolution** (Meir Lehman, from 1974; "Programs, Life Cycles, and Laws of Software
  Evolution", *Proc. IEEE* 1980). Continuing change: a used program must be continually adapted or it becomes
  progressively less satisfactory. Increasing complexity: as a program evolves its complexity increases unless work is
  done to maintain or reduce it. **This is exactly the Era 5 pressure rule** (code stock, no natural absorption, deletion
  costs attention).
- **Conway's law** (Melvin Conway, "How Do Committees Invent?", *Datamation*, 1968): systems mirror the communication
  structure of the organisations that build them. With agent fleets, the org chart is a prompt.
- **Parkinson's law** (C. Northcote Parkinson, *The Economist*, 19 Nov 1955): "Work expands so as to fill the time
  available for its completion" [S50].
- xkcd 2347 "Dependency" (2020): all modern digital infrastructure resting on "a project some random person in Nebraska
  has been thanklessly maintaining since 2003" (general knowledge; quote from memory, check before use).

Quotation wording for Brooks, Lehman and Conway is the standard form; check against the originals before printing.

### Restraints tried (levers) and what happened

- **Code review gates**: the bottleneck *moves* to review (+91% review time [S74]), and Faros's 2026 claim of more PRs
  merged unreviewed suggests the gate leaks under load [S74]. This matches the Era 5 lever "Review gates".
- **Deletion and refactoring**: GitClear shows "moved" (refactored) code at a record low [S33]. This is the lever
  nobody pulls, and it matches "Deletion".
- **Shared libraries**: reduce duplication, but import dependency risk (left-pad, xz) [S34][S35]. A lever that
  rebounds into supply-chain pressure.
- **Bounties and incentives**: curl's bounty attracted slop once the cost of producing reports fell to zero, so the lever
  was withdrawn [S67]. The penny post dynamic: when sending is free, the receiver drowns.
- **npm's unpublish policy** after left-pad: you may no longer delete freely [S34]. A rule *against* deletion, which is
  an irony against Era 5's Deletion lever.

### Ironies

- The METR developers were slower and felt faster [S31]: the Jevons paradox's subjective cousin.
- An eleven-line function took down the build of much of the JavaScript world [S34].
- The xz backdoor was caught by a benchmark-minded engineer irritated by half a second of latency [S35]: a case where
  noticing inefficiency saved the world.
- Stack Overflow's questions fell to 2009 levels in the same months that AI models trained on its answers boomed [S56].

---

## 11. Attention and time: labour-saving that saves no labour

### The record

- **Ruth Schwartz Cowan, *More Work for Mother: The Ironies of Household Technology from the Open Hearth to the
  Microwave* (1983)**: household technology raised standards (laundry frequency, cleanliness, cooking variety) and
  shifted work onto the housewife. Economists call the finding the "Cowan paradox" (Mokyr) [S49].
- **Joann Vanek, "Time Spent in Housework", *Scientific American*, Nov 1974**: from USDA time diaries of 1924–32 and later
  studies, she concluded that full-time homemakers' housework time had not fallen over half a century. Gershuny & Harms
  dispute the method (selection effects: who stayed a full-time homemaker changed) [S49]. The often-quoted "~52 hours (1924)
  vs ~55 hours (1960s)" figures are **unverified**.
- **Staffan Burenstam Linder, *The Harried Leisure Class* (1970)**: as productivity raises the value of time, leisure
  becomes goods-intensive and hurried (general knowledge; title and date standard).
- **Parkinson's law** (1955): work expands to fill the time available [S50].
- **Microsoft 2025**: interruptions every 2 minutes, ~275 pings a day; in the ten minutes before a meeting, PowerPoint
  edits spike 122% [S51].
- **Gloria Mark**: on-screen attention fell from ~150 s (2004) to ~47 s (2016–20) [S52].

### Mechanism for the game

Efficiency raises the **saturation level itself**: cleaner shirts, more email, more meetings because scheduling is free.
In model terms S_i grows with η, rather than adoption climbing a fixed logistic. That is a distinct rebound type, the
"standards ratchet" (see §13).

### Levers

Right-to-disconnect laws (§1), meeting-free days (corporate practice; no data checked), Screen Time (2018),
calendar "focus time" blocks. None has strong evidence of reducing totals in this research.

---

## 12. Quick-reference timeline (dated hooks for headlines)

| Date | Event | Source |
|---|---|---|
| c. 1455 | ~180 Gutenberg Bibles | [S71] |
| 29 Nov 1814 | *The Times* printed by steam, 1,100 sheets/hr | [S20] |
| 10 Jan 1840 | Uniform Penny Post | [S11] |
| 1866 | Atlantic cable; £20 for 20 words; Seward's $19,540 cable | [S16] |
| 1870 | Telegraphs nationalised | [S15] |
| 1 Oct 1885 | Sixpenny telegram; traffic +56% within months | [S13][S14] |
| 1 Mar 1915 | NY–SF call $20.70 for 3 minutes | [S78] |
| 7 Jan 1927 | London–NY call $75 for 3 minutes | [S58] |
| 19 Nov 1955 | Parkinson's law, *The Economist* | [S50] |
| 1959 | Xerox 914 | [S19] |
| 19 Apr 1965 | Moore's paper | [S59] |
| 1971 | First networked email | [S60] |
| Nov 1974 | Vanek, "Time Spent in Housework" | [S49] |
| 1975 | Brooks, *The Mythical Man-Month*; *Business Week* "paperless office" (**unverified** title) | [S18] |
| 3 May 1978 | First spam, ~393 recipients | [S61] |
| 1983 | Cowan, *More Work for Mother* | [S49] |
| 1984 | HP LaserJet, $3,495 | [S79] |
| Feb 1995 | Wirth, "A Plea for Lean Software" | [S9] |
| 1 Apr 2004 | Gmail, 1 GB | [S66] |
| c. 2005–07 | End of Dennard scaling | [S59] |
| 22 May 2010 | 10,000 BTC for two pizzas | [S24] |
| 2011 | Koomey's law published | [S7] |
| 22 Mar 2016 | left-pad | [S34] |
| Sept 2016 | Jio launch; Indian data price falls ~15×, use ~14× | [S69] |
| 2019 | Singapore and Amsterdam data-centre pauses | [S47] |
| 28 Feb 2020 | Masanet et al.: +550% compute, +6% energy | [S1] |
| 15 Sept 2022 | Ethereum Merge, −99.99% electricity | [S23] |
| 22 Nov 2022 | New York PoW moratorium | [S75] |
| Aug 2023 | Riot paid $31.7m to switch off | [S65] |
| 29 Mar 2024 | xz backdoor found via 500 ms | [S35] |
| May 2024 | Brad Smith: the moon "more than five times as far away" | [S45] |
| 19 Jul 2024 | CrowdStrike, 8.5M machines | [S36] |
| Sept 2024 | Three Mile Island Unit 1 restart deal | [S43] |
| 29 Oct 2024 | Pichai: >25% of new Google code AI-generated | [S54] |
| 20 Dec 2024 | LBNL: US data centres 176 TWh, 4.4% | [S4] |
| 21 Jan 2025 | Stargate, $500bn | [S73] |
| 27 Jan 2025 | DeepSeek rout, Nvidia −$589bn; Nadella's "Jevons paradox strikes again!" | [S5][S6] |
| 10 Mar 2025 | Amodei: 90% of code in 3–6 months | [S70] |
| May 2025 | Google: 480T tokens/month, 50× in a year | [S28] |
| Jul 2025 | METR: 19% slower | [S31] |
| Aug 2025 | Google: 0.24 Wh per prompt, −33× | [S62] |
| Oct 2025 | Google: 1.3 quadrillion tokens/month | [S29] |
| Jan 2026 | curl ends bug bounty over AI slop | [S67] |
| Mar 2026 | Mississippi permits 41 turbines (~1.2 GW) for xAI | [S68] |
| Apr 2026 | IEA: data-centre electricity +17% in 2025, to ~485 TWh | [S3] |
| 28 Oct 2026 | Google: ~32B API tokens/minute; Gemini app 1bn users | [S30] |
| Nov 2026 | IDC: 274.4 ZB of data in 2026, 718.5 ZB forecast for 2030 | [S38] |

---

## 13. Candidates for new eras/sectors within this domain

Ranked by how **distinct a rebound mechanism** each offers relative to the current five eras (where the core engine is
logistic adoption plus frontier applications, with Era 4's auto-halving and Era 5's code stock). Skins are cheap;
mechanisms are not.

1. **Proof-of-Work: "The Difficulty"** (Bitcoin 2009–). *Mechanism: protocol-enforced 100% rebound.* Resource use is
   set by reward value ÷ power price, and efficiency upgrades only redistribute share between miners (difficulty retargets).
   The player discovers that the efficiency tree is literally inert for totals. The only lever that works is changing the
   mechanism (the Merge, −99.99%) [S23]; others leak (China ban) or rebound (Texas paying miners to stop, $31.7m) [S65].
   Distinct because it is the one sector where Jevons is a design constant, not an outcome. Halvings (fixed reward
   schedule) give natural era beats.
2. **The Inbox: "Postage Due"** (penny post → telegraph → email → chat → agent-generated reports). *Mechanism: cost
   shifting from sender to receiver.* The service price falls for the sender while the burden (attention) lands on someone
   else; spam appears as an application that is pure externality. Levers: sender-pays (1840, worked), e-postage (never
   adopted), bounty withdrawal (curl) [S67]. Distinct: the player controls the sender's efficiency but the pressure
   accrues on a population of receivers.
3. **The Household: "More Work for Mother"** (appliances, 1900–1970; meetings and calendars, 1990–2026). *Mechanism: the
   standards ratchet.* Efficiency raises the saturation ceiling S_i itself (cleanliness, responsiveness), so time spent
   stays flat [S49]. Distinct from logistic adoption, which saturates; here saturation moves with η.
4. **The Grid Map: "Moratorium"** (Ireland, Singapore, Amsterdam, PJM, Memphis). *Mechanism: geographic leakage and
   local caps.* A cap in one jurisdiction pushes load to the next; capacity prices spike at the cap ($329 then $333/MW-day)
   [S76]; water-free cooling converts a water pressure into a power pressure [S48]. Distinct: a spatial lever puzzle in which
   the hard cap is real and still loses.
5. **Paper: "The Paperless Office"** (1975–2000). *Mechanism: a complement disguised as a substitute.* A technology sold as
   replacing a resource (screens for paper) raises its use, because it cheapens producing documents faster than it
   replaces reading them; office paper more than doubled 1980–97 [S18]. Use as a short side-era or a "hidden card" that
   claims −80% paper and delivers +100%.
6. **Bloat: "Andy and Bill"** (1985–2026). *Mechanism: a second actor spends your efficiency.* Hardware gains are
   captured by software convenience (pages +357% on mobile in a decade [S8], apps 11× in four years [S72]). Could be an
   AI rival in the economy that consumes a share of every η upgrade. Distinct as a two-player rebound; close to direct
   rebound otherwise.
7. **Streaming: "The Resolution Ladder"** (1995–2026). *Mechanism: unit inflation.* The service unit itself is redefined
   upward (SD 1 GB/hr → UHD 7 GB/hr) [S77], so efficiency is consumed as quality, not quantity. Cheap to implement as an
   application whose per-unit resource coefficient rises with each codec upgrade. The EU's 2020 quality cap is the
   lever (verify before use).
8. **The Review Queue: "Throughput"** (2021–2026). *Mechanism: bottleneck migration.* Speeding one stage (writing) moves the
   constraint to the next (review +91%, stability −7.2%) [S74][S32]. This largely deepens Era 5 rather than founding a new
   era, but it could become a pipeline mini-game where upgrades to one stage push pressure downstream.
9. **Inference: "Thinking Tokens"** (2022–2026). *Mechanism: per-unit vs per-task divergence.* Price per token collapses
   (280×, up to 900×/yr) [S27][S26] while tokens per task rise with reasoning and agents; the frontier price stays flat
   ($60 → $60) [S25]. Mostly overlaps with Era 4/5; best used as a twist on the Compute–Code link (`drawsOn`).
10. **The Archive: "Never Delete"** (1956–2026). *Mechanism: stock accumulation because keeping is cheaper than deciding.*
    Storage at $0.014/GB [S37], data 274 ZB/yr [S38], e-waste 62 Mt [S39]. Too close to Era 5's code-stock mechanic to be its
    own era; better as a Compute-era pressure (data stock) mirroring code stock.

---

## 14. Things that could not be verified (keep out of the game unless checked)

- *Business Week*'s 1975 article title and exact wording on the "paperless office".
- "Email increases office paper use by 40%."
- US copies per year before and after the Xerox 914 (20 million → 14 billion).
- Vanek's exact hour figures (52 h vs 55 h).
- Gates's law and May's law wording and origin.
- Google Cerrillos 169 l/s figure; Dublin moratorium "until 2028" terms; Amsterdam moratorium dates.
- Laszlo Hanyecz as first GPU miner.
- CISQ $2.41 trillion; Sonatype 2025 download and malware totals (secondary only).
- Bill Gates's exact 2004 Davos spam quote.
- Penny-post revenue recovery date.
- Right-to-disconnect, EU common-charger, right-to-repair, Core Web Vitals, AMP, 2020 EU streaming-quality cap dates: from
  general knowledge, not re-fetched.
- Electron app memory and size figures; photo-library sizes; "dark data" share.

---

## Sources

- [S1] Masanet, Shehabi, Lei, Smith, Koomey, "Recalibrating global data center energy-use estimates", *Science* 367 (2020) 984–986, doi:10.1126/science.aba3758. PDF: https://www.gwern.net/doc/cs/hardware/2020-masanet.pdf ; LBNL record https://eta.lbl.gov/publications/recalibrating-global-data-center
- [S2] IEA, *Energy and AI* (Apr 2025), executive summary: https://www.iea.org/reports/energy-and-ai/executive-summary
- [S3] IEA news (2026), "Data centre electricity use surged in 2025…": https://www.iea.org/news/data-centre-electricity-use-surged-in-2025-even-with-tightening-bottlenecks-driving-a-scramble-for-solutions
- [S4] US DOE / LBNL, 2024 United States Data Center Energy Usage Report: https://www.energy.gov/articles/doe-releases-new-report-evaluating-increase-electricity-demand-data-centers ; https://newscenter.lbl.gov/2025/01/15/berkeley-lab-report-evaluates-increase-in-electricity-demand-from-data-centers/
- [S5] Fortune, 27 Jan 2025, Nadella and Jevons: https://fortune.com/2025/01/27/microsoft-ceo-satya-nadella-deepseek-optimism-jevons-paradox/ ; GeekWire: https://www.geekwire.com/2025/microsoft-ceo-says-ai-use-will-skyrocket-with-more-efficiency-amid-craze-over-deepseek/
- [S6] Bloomberg, "Nvidia's $589 Billion DeepSeek Rout Is Largest in Market History": https://www.bloomberg.com/news/articles/2025-01-27/asml-sinks-as-china-ai-startup-triggers-panic-in-tech-stocks ; Tom's Hardware: https://www.tomshardware.com/tech-industry/artificial-intelligence/nvidia-loses-usd589-billion-in-market-cap-broad-stock-plunge-triggered-by-deepseek-ai-release
- [S7] Koomey, Berard, Sanchez, Wong, "Implications of historical trends in the electrical efficiency of computing", *IEEE Annals of the History of Computing* 33(3), 2011: https://www.gwern.net/doc/cs/hardware/2011-koomey.pdf
- [S8] HTTP Archive, Web Almanac 2024, Page Weight: https://almanac.httparchive.org/en/2024/page-weight
- [S9] Wirth, "A Plea for Lean Software", *IEEE Computer* 28(2), 1995, 64–68; summary: https://en.wikipedia.org/wiki/Niklaus_Wirth ; text: https://markbernstein.org/Feb24/APleaForLeanSoftware.html
- [S10] "Andy and Bill's law": https://en.wikipedia.org/wiki/Andy_and_Bill%27s_law
- [S11] London Museum, "The Penny Post sparked a letter-writing revolution": https://www.londonmuseum.org.uk/collections/london-stories/penny-post-sparked-letter-writing-revolution/ ; EBSCO Research Starter: https://ebsco.com/research-starters/history/penny-postage ; GBPS rates 1839–40: https://gbps.org.uk/rates/inland/letters-1839-1840.php
- [S12] *The Spectator*, 21 March 1840, p. 6 (Hill at the Statistical Society): https://archive.spectator.co.uk/article/21st-march-1840/6/at-the-statistical-society-on-monday-evening-a-com
- [S13] Hansard, HC Deb 22 Sept 1886, "Post Office: Sixpenny Telegrams": https://api.parliament.uk/historic-hansard/commons/1886/sep/22/post-office-sixpenny-telegrams-financial ; Papers Past 1910: https://paperspast.natlib.govt.nz/newspapers/DOM19100329.2.99
- [S14] GBPS, Inland Telegram Rates 1870–1982: https://gbps.org.uk/rates/inland/telegrams.php
- [S15] History of Information, telegraph nationalisation: https://historyofinformation.com/detail.php?id=497
- [S16] PBS American Experience, "How early cable was used": https://www.pbs.org/wgbh/americanexperience/features/cable-how-early-cable-was-used ; Atlantic-cable.com services: https://atlantic-cable.com/CableCos/Services/index.htm
- [S17] Radicati Group, Email Statistics Report 2024–2028, Executive Summary: https://radicati.com/wp/wp-content/uploads/2024/10/Email-Statistics-Report-2024-2028-Executive-Summary.pdf
- [S18] Sellen & Harper, *The Myth of the Paperless Office* (MIT Press 2002): https://www.microsoft.com/en-us/research/publication/myth-paperless-office/ ; Times Higher Education review: https://www.timeshighereducation.com/node/86121 ; Information Research review: https://www.informationr.net/ir/reviews/revs051.html
- [S19] Xerox 914: https://en.wikipedia.org/wiki/Xerox_914
- [S20] History of Information, Koenig press and *The Times*: https://historyofinformation.com/detail.php?id=4613 ; Library of Congress blog: https://blogs.loc.gov/headlinesandheroes/2022/04/printing-newspapers-1400-1900/ ; News UK Archives: https://medium.com/@NewsUKArchives/the-koenig-bauer-printing-press-222a42e959e0
- [S21] Cambridge Judge Business School / CCAF, 2025 mining study: https://www.jbs.cam.ac.uk/2025/cambridge-study-sustainable-energy-rising-in-bitcoin-mining/ ; preliminary update coverage: https://crypto.news/hydropower-overtakes-gas-as-bitcoin-mining-power-use-jumps-38/
- [S22] Hashrate Index, J/TH explained: https://hashrateindex.com/blog/firmware-fundamentals-measuring-bitcoin-mining-efficiency-j-th-explained/ ; D-Central ASIC timeline: https://d-central.tech/asic-release-timeline/ (vendor-adjacent; approximate)
- [S23] ConsenSys / CCRI on the Merge: https://consensys.io/blog/ethereum-blockchain-eliminates-99-99-of-its-carbon-footprint-overnight-after-a-successful-merge-according-to-new-report ; Decrypt: https://decrypt.co/109848/ethereum-energy-carbon-footprint-down-99-percent-merge
- [S24] CoinDesk, Bitcoin Pizza Day: https://www.coindesk.com/learn/what-is-bitcoin-pizza-day/
- [S25] a16z (Guido Appenzeller), "Welcome to LLMflation", 12 Nov 2024: https://a16z.com/llmflation-llm-inference-cost/
- [S26] Epoch AI, LLM inference price trends (Mar 2025): https://epoch.ai/data-insights/llm-inference-price-trends
- [S27] Stanford HAI, AI Index 2025: https://hai.stanford.edu/ai-index/2025-ai-index-report ; Tom's Hardware summary: https://www.tomshardware.com/tech-industry/artificial-intelligence/ai-costs-drop-280-fold-but-harmful-incidents-rise-56-percent-in-last-year-stanford-2025-ai-report-highlights-china-us-competition
- [S28] Google, I/O 2025 keynote transcript: https://blog.google/technology/ai/io-2025-keynote/
- [S29] Alphabet Q3 2025 CEO remarks: https://blog.google/inside-google/message-ceo/alphabet-earnings-q3-2025/
- [S30] Alphabet Q3 2026 CEO remarks (28 Oct 2026): https://blog.google/company-news/inside-google/message-ceo/alphabet-earnings-q3-2026/ ; 9to5Google: https://9to5google.com/2026/10/28/alphabet-q3-2
- [S31] METR, "Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity" (Jul 2025); coverage: https://www.theregister.com/2025/07/11/ai_code_tools_slow_down/
- [S32] Google Cloud, 2024 DORA report announcement: https://cloud.google.com/blog/products/devops-sre/announcing-the-2024-dora-report ; PDF: https://services.google.com/fh/files/misc/2024_final_dora_report.pdf
- [S33] GitClear, AI Copilot Code Quality 2025: https://www.gitclear.com/ai_assistant_code_quality_2025_research ; DevClass: https://www.devclass.com/ai-ml/2025/02/20/ai-is-eroding-code-quality-states-new-in-depth-report/1626250
- [S34] The Register on left-pad: https://www.theregister.com/2016/03/23/npm_left_pad_chaos ; follow-up: https://www.theregister.com/2016/03/29/npmgate_followup/
- [S35] InfoQ on the xz backdoor: https://www.infoq.com/news/2024/04/xz-backdoor/
- [S36] Fortune, CrowdStrike "less than 1%": https://fortune.com/2024/07/20/crowdstrike-global-outage-less-than-1-percent-all-microsoft-windows-devices/ ; Computer Weekly on Parametrix: https://www.computerweekly.com/news/366598426/Fortune-500-stands-to-lost-5bn-plus-from-CrowdStrike-incident
- [S37] Backblaze, "Hard Drive Cost Per Gigabyte": https://www.backblaze.com/blog/hard-drive-cost-per-gigabyte/ ; "A History of Hard Drives": https://www.backblaze.com/blog/history-hard-drives/ ; Computerworld storage trends: https://images.techhive.com/assets/2017/04/10/cw-50th-anniversary-storage-trends.pdf
- [S38] IDC Global DataSphere: https://www.businesswire.com/news/home/20200508005025/en/ ; Datanami 175 ZB: https://www.datanami.com/news/global-datasphere-to-hit-175-zettabytes-by-2025-idc-says ; IDC Nov 2026 post: https://www.idc.com/?p=123020
- [S39] UNITAR / ITU, Global E-waste Monitor 2024: https://unitar.org/about/news-stories/press/global-e-waste-monitor-2024-electronic-waste-rising-five-times-faster-documented-e-waste-recycling
- [S40] Sandvine 2023 Global Internet Phenomena: https://www.applogicnetworks.com/press-releases/sandvines-2023-global-internet-phenomena-report-shows-24-jump-in-video-traffic-with-netflix-volume-overtaking-youtube ; 2018: https://digitaltveurope.com/2018/10/03/sandvine-netflix-leads-as-video-accounts-for-58-of-web-traffic ; 2024 coverage: https://csimagazine.com/csi/sandvine-2024-internet-report.php
- [S41] CSO Ireland, Data Centres Metered Electricity Consumption 2024: https://www.cso.ie/en/releasesandpublications/ep/p-dcmec/datacentresmeteredelectricityconsumption2024/keyfindings ; Irish Examiner (2025 data, 23%): https://www.irishexaminer.com/business/companies/arid-41875214.html
- [S42] Google 2024 Environmental Report: https://blog.google/company-news/outreach-and-initiatives/sustainability/2024-environmental-report/ ; Trellis: https://trellis.net/article/google-reports-13-emissions-increase-fueled-ai/ ; Engadget: https://www.engadget.com/googles-greenhouse-gas-emissions-climbed-nearly-50-percent-in-five-years-due-to-ai-002646115.html
- [S43] World Nuclear News, TMI restart: https://world-nuclear-news.org/articles/constellation-to-restart-three-mile-island-unit-powering-microsoft
- [S44] Microsoft 2024 Environmental Sustainability Report: https://blogs.microsoft.com/on-the-issues/2024/05/15/microsoft-environmental-sustainability-report-2024/ ; GeekWire: https://www.geekwire.com/2024/microsofts-carbon-footprint-keeps-growing-as-ai-drives-data-center-expansions/
- [S45] Bloomberg, "A Big Bet on AI Is Putting Microsoft's Climate Targets at Risk" (23 May 2024): https://www.bloomberg.com/news/articles/2024-05-23/a-big-bet-on-ai-is-putting-microsoft-s-climate-targets-at-risk
- [S46] Uptime Institute 2024 survey, regional view: https://intelligence.uptimeinstitute.com/sites/default/files/2024-09/UI%20Field%20report%20154_Annual%20survey%20-%20regional%20view.pdf ; Upsite summary of PUE history: https://www.upsite.com/blog/data-center-trends-rack-density-rises-while-pue-and-outage-frequency-remain-flat/ ; Data Center Knowledge: https://datacenterknowledge.com/energy-power-supply/data-center-industry-survey-highlights-cost-ai-and-sustainability-challenges
- [S47] DCD, Singapore applications: https://www.datacenterdynamics.com/en/news/singapore-authorities-invite-applications-for-new-data-centers/ ; Baxtel: https://baxtel.com/news/singapore-s-moratorium-on-new-data-center-builds-lifts-but-what-s-next
- [S48] DCD, Chile partially reverses Google permit: https://datacenterdynamics.com/en/news/chile-partially-reverses-google-data-center-permit-over-water-use-concerns ; AlgorithmWatch: https://algorithmwatch.org/en/protests-against-data-centers/ ; Down to Earth interview: https://www.downtoearth.org.in/science-technology/we-saw-a-state-apparatus-completely-subordinated-to-corporate-interests
- [S49] Vanek, Scientific American author page: https://www.scientificamerican.com/author/joann-vanek/ ; Gershuny & Harms critique: https://discovery-pp.ucl.ac.uk/10072385/1/Harms_sow073.pdf
- [S50] Parkinson's law: https://en.wikipedia.org/wiki/Parkinson%27s_law
- [S51] Microsoft WorkLab, "Breaking down the infinite workday" (2025): https://microsoft.com/en-us/worklab/work-trend-index/breaking-down-infinite-workday
- [S52] University of California, Gloria Mark on attention: https://universityofcalifornia.edu/news/how-sharpen-your-attention-and-meet-your-goals-2024
- [S53] GitHub Octoverse 2025: https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/
- [S54] Engadget on Pichai, Oct 2024: https://www.engadget.com/ai/google-ceo-says-a-quarter-of-the-companys-new-code-is-already-ai-generated-180038896.html
- [S55] Dice Insights on Stripe's Developer Coefficient: https://insights.dice.com/2018/12/06/technical-debt-bad-code-bigger-impact-think/ ; Sonar: https://www.sonarsource.com/de/blog/developers-spend-30-of-their-time-on-code-maintenance-our-latest-survey-results-part-3/
- [S56] The Pragmatic Engineer, "Stack Overflow is almost dead": https://blog.pragmaticengineer.com/stack-overflow-is-almost-dead
- [S57] Nordhaus, "Two Centuries of Productivity Growth in Computing", *J. Econ. Hist.* 67(1), 2007: https://econpapers.repec.org/RePEc:cup:jechis:v:67:y:2007:i:01:p:128-159_00 ; Coyle & Hampton, Bennett Institute: https://bennettschool.cam.ac.uk/wp-content/uploads/2023/07/Progress-of-computing-WP.pdf
- [S58] Papers Past, Jan 1927 report of first transatlantic call: https://paperspast.natlib.govt.nz/newspapers/TS19270108.2.84
- [S59] Dennard scaling: https://en.wikipedia.org/wiki/Dennard_scaling ; InfoWorld 2005: https://www.infoworld.com/article/2669732/with-chips--moore-s-law-is-not-the-problem.html
- [S60] Ray Tomlinson: https://en.wikipedia.org/wiki/Ray_Tomlinson
- [S61] Abusix, Thuerk's 1978 message: https://abusix.com/blog/the-birth-of-email-spam-gary-thuerks-1978-green-card-incident/ ; Brad Templeton: https://templetons.com/brad/spamreact.html
- [S62] Google Cloud, "Measuring the environmental impact of AI inference": https://cloud.google.com/blog/products/infrastructure/measuring-the-environmental-impact-of-ai-inference ; paper: https://arxiv.org/abs/2508.15734
- [S63] Simon Willison on Altman's figures: https://simonwillison.net/2025/Jun/10/sam-altman/
- [S64] Patterson et al., "Carbon Emissions and Large Neural Network Training" (2021): https://arxiv.org/abs/2104.10350
- [S65] CNBC, Texas paid Riot $31.7m: https://www.cnbc.com/2023/09/06/texas-paid-bitcoin-miner-riot-31point7-million-to-shut-down-in-august.html ; Texas Public Radio: https://www.tpr.org/technology-entrepreneurship/2023-09-06/texas-paid-a-bitcoin-miner-more-than-30-million-to-power-down-during-heat-wave
- [S66] History of Gmail: https://en.wikipedia.org/wiki/History_of_Gmail ; TIME: https://time.com/43263
- [S67] The Register, curl ends bug bounty: https://www.theregister.com/2026/01/21/curl_ends_bug_bounty/ ; The New Stack: https://thenewstack.io/drowning-in-ai-slop-reports-curl-ends-bug-bounties/
- [S68] TechCrunch, xAI turbines lawsuit: https://techcrunch.com/2025/06/18/xai-is-facing-a-lawsuit-for-operating-over-400-mw-of-gas-turbines-without-permits ; Inside Climate News: https://insideclimatenews.org/news/17072025/elon-musk-xai-data-center-gas-turbines-memphis/ ; SELC press releases: https://www.selc.org/press-releases/mississippi-regulators-rubber-stamp-air-permit-for-xai-power-plant-ignoring-overwhelming-public-pushback/
- [S69] TheNextWeb on Jio launch: https://thenextweb.com/news/reliance-jio-brings-free-voice-calls-and-the-worlds-lowest-4g-data-plans-to-india ; TelecomTalk (TRAI figures): https://telecomtalk.info/reliance-jio-completes-5-years-here-how/464561/ ; Quartz: https://qz.com/india/2055771/reliance-jios-cheap-data-turned-indias-internet-dreams-into-reality
- [S70] Business Insider on Amodei at CFR: https://www.businessinsider.nl/anthropics-ceo-says-that-in-3-to-6-months-ai-will-be-writing-90-of-the-code-software-developers-were-in-charge-of/
- [S71] Library of Congress, Gutenberg Bible: https://www.loc.gov/exhibits/bibles/interactives/gutenberg/index.html ; Buringh & van Zanden 2009: https://econpapers.repec.org/RePEc:cup:jechis:v:69:y:2009:i:02:p:409-445_00
- [S72] Sensor Tower, iOS app size growth (2017): https://sensortower.com/blog/ios-app-size-growth
- [S73] OpenAI, "Announcing The Stargate Project": https://openai.com/index/announcing-the-stargate-project/ ; Semafor: https://www.semafor.com/article/01/21/2025/trump-set-to-announce-openai-softbank-oracle-ai-infrastructure-plan
- [S74] Faros AI, AI Productivity Paradox Report 2025: https://www.faros.ai/blog/ai-productivity-paradox-report-2025
- [S75] NBC News on the New York moratorium: https://www.nbcnews.com/tech/crypto/new-york-governor-signs-novel-law-limits-cryptomining-now-rcna58514
- [S76] PJM Inside Lines, 2027/28 auction: https://insidelines.pjm.com/pjm-auction-procures-134479-mw-of-generation-resources/ ; Utility Dive: https://www.utilitydive.com/news/pjm-interconnection-capacity-auction-prices/753798/ ; NRDC: https://www.nrdc.org/press-releases/first-time-history-pjm-auction-fails-procure-necessary-power-supply
- [S77] Netflix Help Centre, data usage: https://help.netflix.com/en/node/87
- [S78] Computerworld, 1915 transcontinental call: https://www.computerworld.com/article/2874390/this-1915-conference-call-made-history.html
- [S79] HP LaserJet: https://en.wikipedia.org/wiki/LaserJet
- [S80] npm: https://en.wikipedia.org/wiki/Npm ; Socket npm registry glossary: https://socket.dev/glossary/npm-registry.md ; ecosyste.ms / libraries.io: https://libraries.io/npm (Sonatype figures via secondary summaries only)
