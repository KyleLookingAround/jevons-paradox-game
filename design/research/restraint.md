# What has actually worked: the restraint record

Source material for *Rebound*'s counter-levers and Institutions. For each attempt: **what it was**, **dates**,
**measured effect**, **how it leaked, rebounded or was repealed**, and **the political price**. Game mapping is noted
in *italics* against the lever names in `src/content.ts` / `DESIGN.md` (fuel duty escalator, hard cap, sufficiency,
substitution, circularity, green spending, deletion, review gates...).

Conventions as in `sectors.md`: **[approx.]** figures differ between sources; **[disputed]** literature disagrees;
**[unverified]** not confirmed in this pass and not for use in game text without a check. Source tags [R1]... refer to
the list at the end.

---

## 1. Taxes on fuel and carbon (*Fuel duty escalator*)

### 1.1 The UK fuel duty escalator, 1993–1999, and the fuel protests of 2000

- **March 1993**: Norman Lamont introduced an automatic annual rise in road fuel duty of **3% above inflation** [R1].
- **November 1993**: Kenneth Clarke raised it to **5%** above inflation [R1].
- **July 1997**: Gordon Brown raised it to **6%** above inflation [R1].
- **November 1999** (Pre-Budget Report): the automatic escalator was ended, with future rises decided "on a
  Budget-by-Budget basis" (IFS) [R1]. Sources differ on whether to date the end to November 1999 or early 2000 [R1].
- **8 September 2000**: farmers and hauliers blockaded fuel depots and refineries; by **12 September about 3,000 petrol
  stations were closed** [R1].
- **Aftermath (the repeal half)**: duty has been frozen in cash terms since 2011, and cut by 5p a litre in March 2022,
  the cut then extended repeatedly [standard UK fiscal history; exact extension dates not re-checked in this pass].
  The real-terms value of fuel duty has fallen for well over a decade.
- **Political price**: the September 2000 protests are the main reason no UK government has since restored an
  automatic escalator. Labour briefly fell behind the Conservatives in national polls during the protests [unverified
  in this pass].
- *Game note: the escalator is exactly the lever in DESIGN.md ("holds p_s up as η rises"). Its real catch is a
  Mandate cost that rises with each year it runs, and a crisis event (blockade) that can repeal it outright.*

### 1.2 Sweden's carbon tax, 1991–

- Introduced **1991** at **SEK 250 per tonne CO2** (c.US$30; €27–29 depending on source) [R2].
- Raised steadily to well over **SEK 1,000 per tonne** by the late 2010s (c.US$130; c.€120–137 in 2016–19 sources)
  [R2]. Check Skatteverket for the current rate.
- **Measured effect**: Andersson, *American Economic Journal: Economic Policy* (2019), synthetic control: the carbon tax
  plus VAT on fuel cut Swedish **transport CO2 by almost 11%** relative to a synthetic control; **c.6.3% from the
  carbon tax alone** (the working-paper figure was 12.5%) [R2].
- **Leak**: industry and agriculture paid lower rates from 1993 onwards [R2] — the classic carve-out for trade-exposed
  sectors.
- **Political price**: low; it was introduced alongside a tax reform that cut income taxes [standard].

### 1.3 British Columbia, 2008–2025

- Announced February 2008; started **1 July 2008** at **C$10 per tonne CO2e** (2.41 cents per litre of petrol); the
  first such tax in North America [R3].
- **Revenue neutral by law**: offset by cuts in personal and corporate income tax. Neutrality was gradually abandoned
  and the legal requirement was **removed in 2017** [R3].
- **Measured effect**: Elgie & McClay (2013): per capita fuel use covered by the tax fell **c.19%** relative to the rest
  of Canada in the first four years, with no evident harm to growth [R3]. (A "16%" figure I had seen could not be
  sourced; a 17.4% figure circulates with an unclear basis.)
- Reached **C$80 per tonne** by April 2024 [R3].
- **Repealed 1 April 2025**, after the federal government under Mark Carney dropped the federal consumer carbon price;
  BC followed within days [R3]. A c.C$1.5 billion hole in the provincial budget was reported [R3].
- *Game note: a revenue-neutral tax is popular until neutrality lapses; then it is a tax. The 17-year life is a good
  Institution lifespan.*

### 1.4 France: the *gilets jaunes*, 2018

- The planned trajectory of rising carbon tax (the *contribution climat-énergie*) included a diesel rise due **1 January
  2019** [R4].
- Protests began **17 November 2018**, nearly 300,000 people on the first day; diesel had already risen about 20% in a
  year to an average €1.49 a litre [R4].
- **4 December 2018**: Prime Minister Édouard Philippe suspended the rise (and planned electricity and gas price rises);
  the next day it was dropped from the 2019 budget [R4]. Reporting called it the worst unrest since 1968 [R4].
- Protest slogan: *"Fin du monde, fin du mois"* ("end of the world, end of the month") — circulated widely as the
  movement's framing of climate versus cost of living. [Exact first use and Macron's own use of the phrase unverified.]
- **Political price**: maximal. The French carbon tax rate has been frozen at its 2018 level since [standard; not
  re-checked].

### 1.5 Australia, 2012–2014

- Carbon price from **1 July 2012** at A$23 per tonne; **repealed 17 July 2014** by the Abbott government after an
  election fought on "axe the tax" [standard Australian political history; not re-checked in this pass].

### 1.6 The pattern

Carbon taxes that survived (Sweden) started low, rose slowly, exempted trade-exposed industry and cut other taxes.
Those that died (France, Australia, BC, the UK escalator) were visible at the pump in a period of rising prices, or lost
their revenue-recycling story. **Visibility is the Mandate cost.**

---

## 2. Caps and trading (*Hard cap*, permit price, leakage)

### 2.1 US Acid Rain Program (SO2), 1990–

- Created by the **Clean Air Act Amendments of 1990**; Phase I began **1995**, Phase II 2000 [R5].
- **Effect**: SO2 from programme sources was **1.2 Mt in 2018 (92% below 1990), 954 kt in 2019 (94% below), 778 kt in
  2020 (95% below)** (EPA progress reports) [R5]. That implies a 1990 baseline of roughly 15.6–15.7 Mt (my arithmetic).
- **Cheaper than feared**: allowance prices were far lower than predicted — at first read as market failure, later as
  evidence that trading cut costs (switching to low-sulphur Powder River Basin coal, cheaper scrubbers, rail
  deregulation all helped) [R5]. Prices spiked to around **$1,600 per ton in December 2005** on expected CAIR rules, then
  collapsed when the courts and later rules made the cap non-binding [R5]. A widely quoted "industry predicted $1,000+
  per ton" ex-ante estimate is [unverified]; check Schmalensee & Stavins (2013).
- **Caveat**: Chan et al. note the market "never reached a steady state" [R5].
- *Game note: the ideal cap — the permit price falls as the player's substitution comes in, and eventually the cap is
  slack. The joke for a broadsheet is that the market succeeded so well its price went to nearly nothing.*

### 2.2 EU Emissions Trading System, 2005–

- **Phase 1 (2005–07)**: caps set on estimates; total allowances exceeded emissions; price peaked above €30 in 2006 and
  **fell to zero in 2007** (Commission's own account; some series show c.€1) [R6]. Phase 1 allowances could not be banked
  into Phase 2, which is why the price could go to zero.
- Over-issue was above 5% for the EU-15 and above 20% for the ten 2004 accession states (Cooper, Harvard) [R6].
- **Phase 2 (2008–12)**: surplus "weighed heavily on the carbon price throughout" (Commission) [R6]; the recession cut
  emissions further. A surplus of c.2 billion allowances by the early 2010s is commonly cited [approx.; check Commission
  data]. 
- **Fixes**: back-loading of 900 million allowances (2014–16) and the **Market Stability Reserve (from 2019)**, which
  absorbs surplus allowances automatically [standard; dates not re-checked]. Price passed €100 briefly in early 2023
  [standard; not re-checked].
- **Leak**: free allocation for trade-exposed industry on grounds of "carbon leakage"; and the "waterbed effect" —
  national measures (e.g. coal phase-outs, renewables subsidies) inside a fixed cap free allowances for use elsewhere
  until the MSR began cancelling them [standard concept; not re-checked]. CBAM (Carbon Border Adjustment Mechanism)
  is the EU's answer to leakage [standard].
- *Game note: "leaks if far below demand" in DESIGN.md is real. Add an over-allocation trap: a cap set from industry's
  own projections starts slack.*

### 2.3 RGGI (Regional Greenhouse Gas Initiative), 2009–

- Power-sector cap-and-trade among north-eastern US states from 2009. Emissions fell **18.4% in one year, 2008–09** [R7]
  (largely recession and gas switching). Cumulative reductions since 2005 of about half are commonly cited [approx.;
  check RGGI's 2023 monitoring report].
- **Leakage watched explicitly**: the monitoring reports track imports (e.g. from PJM) and conclude that falling
  emissions from non-RGGI in-region generation offset the slight rise in emissions attributable to imports — while
  warning the monitoring "does not establish causes" [R7].
- **Membership churn** [standard; not re-checked]: New Jersey left under Chris Christie (2011–12) and rejoined (2020);
  Virginia joined (2021), the Youngkin administration withdrew (2023), and a state court later ruled the withdrawal
  unlawful. *A lever that a new government can switch off.*

---

## 3. Rationing and emergency sufficiency (*Sufficiency*, *Hard cap* at the consumer)

### 3.1 UK wartime and post-war rationing, 1940–1954

- **8 January 1940**: bacon, butter and sugar; all meat by **11 March 1940** [R8].
- Bread, never rationed in the war, was rationed from **July 1946** [R8] (end date 1948 standard; not re-checked).
- Sugar and sweets freed 1953; **meat and bacon, the last, on 4 July 1954** [R8].
- **Effect**: infant mortality reached the lowest rates on record; children grew taller and heavier; tooth decay and
  anaemia fell (secondary sources; causation not established) [R8].
- **Political price**: in war, low; after the war, rationing was a major grievance against the Attlee government
  [standard; not re-checked].

### 3.2 US: wartime and the 1970s

- WWII "Victory Speed" of 35 mph and petrol rationing (1942) [standard; not re-checked].
- **1974 petrol ration coupons**: the Bureau of Engraving and Printing briefly paused currency printing in early 1974
  to print coupons expected to be needed from 1 March; **they were never used**, stored at Pueblo Army Depot,
  Colorado, and largely destroyed in the mid-1980s [R9]. A dealer's figure of 4.8 billion coupons, with George
  Washington's portrait borrowed from the $1 bill, is [unverified]. *Superb Institution flavour: "the ration book that
  was never issued".*
- Odd–even purchase days (1973–74, 1979) in several states [standard; not re-checked].
- **Jimmy Carter**: televised address of 18 April 1977 called the energy effort "the moral equivalent of war"; the
  cardigan fireside chat was 2 February 1977 [standard; not re-checked in this pass].

### 3.3 The 55 mph national speed limit, 1974–1995

- Emergency Highway Energy Conservation Act, signed by Nixon **2 January 1974** [R10].
- **Effect on fuel**: designed to cut petrol use by 2.2%; actual savings estimated at **0.5–1.0%** (a 1998 TRB estimate
  gives 0.2–1.0%) [R10].
- **Effect on lives** [disputed]: a 1984 National Research Council figure credits it with up to c.5,000 lives a year
  saved; a 1980 NHTSA estimate claimed 41,951 lives saved 1974–79 [R10]. Widely ignored on the road.
- **Repealed** by the National Highway System Designation Act, **28 November 1995** [R10].
- *Game note: a sufficiency lever whose real effect was mostly safety, not fuel; its Mandate drained away as
  compliance fell.*

### 3.4 Car-free Sundays, the Netherlands, 1973–74

- After the Arab oil embargo singled out the Netherlands (Rotterdam), the Den Uyl cabinet banned private driving on
  Sundays: **ten car-free Sundays, 4 November 1973 to 6 January 1974** (Dutch National Archives, via secondary source),
  dropped because fuel savings disappointed [R11]. Brief petrol rationing followed ("three weeks", per Hellema, Wiebes &
  Witte; dates unverified) [R11]. Photographs of horses and roller-skaters on empty motorways are the enduring image.
- The UK's **Three-Day Week** (1 January – 7 March 1974), with television closing at 10.30 pm, is the British analogue
  [standard; not re-checked].

### 3.5 Japan: Cool Biz (2005–) and *setsuden* (2011)

- **Cool Biz**, proposed by Environment Minister **Yuriko Koike** under Prime Minister Koizumi, 2005: offices set
  air conditioning to **28°C** and dropped jackets and ties [R12]. TEPCO estimated it saved c.**150,000 kW** in summer
  2005, about 3.6% of its reserve margin [R12] — a small effect with large cultural reach.
- **Setsuden ("power saving") after Fukushima, 2011**: large consumers in the TEPCO area were required to cut peak
  demand by **15%**; "Super Cool Biz" ran 1 May – 31 October 2011 [R12]. **Peak demand in summer 2011 fell c.18% from the
  2010 peak; average summer peak fell c.9.2%** (one author's analysis of TEPCO data) [R12]. Rolling blackouts were
  avoided.
- *Game note: a crisis-triggered sufficiency lever that works fast and fades. Real evidence that a Mandate spike after a
  crisis buys large, short demand cuts.*

### 3.6 The four-day week (UK pilot, 2022)

- June–December 2022; 61 companies; run by 4 Day Week Global, the 4 Day Week Campaign and Autonomy [R13].
- **56 of 61** continued after the trial; **18** made it permanent; revenue broadly steady; staff departures down 57%
  [R13]. A year on: at least **54 (89%)** still operating it, **31 (51%)** permanent [R13]. Self-selected firms.
- *Rebound angle*: whether freed time raises or lowers consumption (more leisure travel?) is unmeasured in these pilots.

---

## 4. Bans and phase-outs (*Substitution*, *Hard cap* at zero)

### 4.1 The Montreal Protocol (1987) and the Kigali Amendment (2016)

- Signed **16 September 1987**; the first UN treaty to achieve universal ratification (2009) [standard; not re-checked
  in this pass]. Controls nearly 100 ozone-depleting substances [R14].
- **Recovery**: total column ozone expected to return to 1980 values around **2066 over the Antarctic**, 2045 over the
  Arctic, 2040 near-global (Scientific Assessment Panel 2022) [R14].
- **The substitution rebound**: CFCs were replaced by HFCs, which do not deplete ozone but are potent greenhouse gases.
  The **Kigali Amendment (2016)** added 18 HFCs and commits parties to cut them by more than 80% (CO2e) over 30 years;
  in force **1 January 2019**; ratified by over 160 parties [R14]. Estimated avoided warming: up to c.0.5°C by 2100
  (0.3–0.5°C per the SAP, excluding HFC-23) [R14].
- **The leak**: an unexpected rise in CFC-11 emissions detected in 2018 (Montzka et al., *Nature*) was traced to eastern
  China, largely foam manufacture, and then fell after enforcement [standard; not re-checked in this pass].
- Kofi Annan's description of Montreal as "perhaps the single most successful international agreement to date" is
  widely quoted [attribution standard; exact source not re-checked].
- *Why it worked*: few producers (DuPont and a handful of others), substitutes available, a vivid crisis (the ozone
  hole, reported 1985), and a Multilateral Fund paying developing countries' costs. All four are rare.

### 4.2 Leaded petrol, 1921–2021

- **Thomas Midgley** (General Motors) found tetraethyl lead's anti-knock effect in late 1921. He reportedly smeared it
  on his hands at a press event to show it was safe, and later suffered lead poisoning [R15].
- In **2002**, leaded petrol was still sold in **117 countries**, including every country in Africa [R15].
- **Algeria**, the last, stopped selling it in **July 2021**; UNEP announced the end in August 2021 — "99 years and seven
  months" after its invention [R15].
- (US on-road ban 1 January 1996; UK sale ended 1 January 2000 — standard dates, not re-checked in this pass.)
- **Midgley also developed CFC refrigerants** (Freon, c.1930) [standard]. One man supplied two of the century's great
  phase-outs.

### 4.3 Incandescent lamps

- EU phase-out from 1 September 2009 (Regulation 244/2009) to 2012; UK halogen ban 2021; US EISA 2007, with the full
  general-service rule enforced from 1 August 2023 [standard; dates not re-checked in this pass].
- **The rebound**: LEDs made light so cheap that outdoor lighting spread. Kyba et al. (*Science Advances*, 2017):
  artificially lit outdoor area grew c.2.2% a year 2012–16; Kyba et al. (*Science*, 2023), citizen observations: sky
  brightness rising c.9.6% a year [standard citations; figures not re-checked in this pass]. Light is the game's Era 2;
  this is Jevons on its home ground, 150 years on.

### 4.4 The London Clean Air Act 1956, after the Great Smog of 1952

- **5–9 December 1952**: smog over London. Deaths: c.4,000 in the immediate week (the contemporary estimate) to c.12,000
  including the following months (later estimates, e.g. Bell & Davis 2001; London Museum gives 12,000) [R16].
- **Committee on Air Pollution**, chaired by **Sir Hugh Beaver**, appointed 1953; final report published late November
  1954 [R16]. It said clean air was as important as clean water had been in the mid-19th century [R16].
- **Clean Air Act 1956**: royal assent **5 July 1956**; created **smoke control areas** where only smokeless fuels could
  be burned [R16]. Pushed in Parliament by **Gerald Nabarro** (Conservative, Kidderminster), whose private member's
  bill prompted the government to legislate; Duncan Sandys was the responsible minister [R16].
- **Leak**: the Act took years to bite; London had a further serious smog in December 1962 [R16]. Tall-chimney
  policies under this and the 1968 Act dispersed pollution — some of it towards Scandinavia as acid rain [standard;
  not re-checked].
- **Irony**: Sir Hugh Beaver, managing director of Guinness, is also the man who conceived the *Guinness Book of
  Records* (first edition 1955) [R16].

---

## 5. Standards (*Review gates*; efficiency forced, with loopholes)

### 5.1 CAFE and the light-truck loophole

- **Energy Policy and Conservation Act 1975**: passenger cars to double to **27.5 mpg** within ten years (reached in
  1985). Light trucks — then about a fifth of new sales — got a separate, lower standard [R17].
- Light trucks were defined to include vehicles up to 6,000 lb GVW, extended to 8,500 lb in 1980 [R17]. Truck standards
  were held around **20.5–20.7 mpg** for years [R17].
- **SUVs were classed as light trucks** and escaped the car standard [R17]. Light trucks rose from under 10% of light
  vehicles (1979) to nearly 45% (2000) (EIA); by 2002 they outsold cars (Pew) [R17]. "The steady increase in
  light-truck sales... actually drove down fleetwide efficiency during the 1990s" (Pew) [R17].
- (Later: EISA 2007 set 35 mpg by 2020; footprint-based standards from 2011 gave larger vehicles easier targets
  [standard; not re-checked].)
- *Game note: a standard with a category boundary. Demand migrates across the boundary. The cleanest real example of
  a review gate that the regulated route around.*

### 5.2 Appliance standards (US fridges)

- See `sectors.md` §6.2: average new fridge from **1,941 kWh/yr (1972)** to **587 kWh/yr (2002)** and under 500 after
  2014, while volume rose and real price fell by two-thirds [R18]. California standards 1978/1980/1987; federal NAECA
  (1987) with standards in 1990, 1993, 2001, 2014 [R18]. **A standard that worked, in a saturated application.**

### 5.3 Japan's Top Runner programme, 1998–

- METI; began 1998 with 9 products, now c.23 product groups [R19]. The most efficient product on the market sets the
  standard that all must meet by a target year.
- **Results** (METI): refrigerators improved **55.2% (FY1998–2004)** against an expected 30.5%; air conditioners
  **67.8% (FY1997–2004)** against 66.1% expected [R19]. Refrigerator consumption fell from 647.3 to 290.3 kWh/yr [R19].
  By 2009, efficiency of covered groups up 19% (27.1 TWh) (bigee.net) [R19].
- *Game note: a natural ratchet Institution — the best performer this run sets next run's floor.*

### 5.4 Building codes

- Not researched in depth in this pass. Mechanism to note: codes lower energy per m² while floor area per person rises
  (`sectors.md` §6.1).

---

## 6. Commons management and quotas (*new: Commons/Quota Institutions*)

### 6.1 Elinor Ostrom's design principles

- *Governing the Commons* (1990); Nobel Memorial Prize in Economic Sciences **2009** (with Oliver Williamson) [R20].
- Eight principles (labels vary): **clearly defined boundaries; congruence of rules with local conditions;
  collective-choice arrangements; monitoring; graduated sanctions; conflict-resolution mechanisms; minimal recognition
  of the right to organise; nested enterprises** (for larger systems) [R20].
- Cox, Arnold & Villamayor-Tomás (2010) reviewed 112 studies and found the principles "robust to empirical testing";
  not all are needed in every case [R20].
- Her cases include Swiss alpine meadows (Törbel), Japanese village commons, and the irrigation *huertas* of Valencia,
  whose **Tribunal de las Aguas** meets on Thursdays at the door of the cathedral [cases standard; not re-checked here].
- *Game note: a superb Institution tree — each principle a purchasable node; a commons with all eight is stable;
  missing "monitoring" or "graduated sanctions" makes it collapse under pressure.*
- **Garrett Hardin, "The Tragedy of the Commons"**, *Science* (1968): "Freedom in a commons brings ruin to all"
  [standard quotation]. Ostrom is the reply.

### 6.2 Individual transferable quotas (ITQs): Iceland

- Quota powers from an amendment of **22 December 1983**; demersal vessel quotas from **1984**, allocated on catches in
  the three preceding years; capelin quotas transferable **1986**; comprehensive ITQs under the **Fisheries Management
  Act 1990** [R21].
- Holding limits: no entity may hold more than c.**12%** of total quota value [R21].
- **The catch** (the politics): quota went to incumbents for free, then concentrated geographically and corporately;
  geographic consolidation is "one of the most contested aspects" of Icelandic fisheries debate [R21].
- **UN Human Rights Committee, 14 December 2007** (Communication 1306/2004, *Haraldsson and Sveinsson v Iceland*): two
  fishermen convicted for fishing without quota; the Committee found the system breached Article 26 (equality) because
  it advantaged the original recipients of permanent quota, and asked Iceland to compensate them and review the system.
  The Views are not binding [R22].
- Evidence of ITQ effectiveness generally: Costello, Gaines & Lynham, *Science* (2008), found catch-share fisheries
  much less likely to collapse [standard; magnitude not re-checked].
- *Game note: quotas stop the race to fish and save the stock, at the price of concentrating the commons into private
  hands. A lever with a wellbeing/inequality side-effect.*

### 6.3 The International Whaling Commission moratorium

- 1946 International Convention for the Regulation of Whaling; quotas set in **Blue Whale Units** (see `sectors.md`
  §4.1).
- Commercial moratorium adopted **1982**, zero catch limits from the 1985/86–1986 seasons [R23].
- **Leaks**: Norway and Japan lodged objections; Japan ran "special permit" (scientific) programmes from 1987 to 2019
  [R23]. The ICJ (*Australia v Japan*, 2014) found JARPA II was "not for purposes of scientific research"; Japan paused,
  then relaunched in 2015 [R23]. In September 2018 the IWC rejected Japan's proposal to resume commercial whaling (41
  against, 27 for, 2 abstentions); Japan left the IWC on **30 June 2019** and resumed commercial whaling in its own
  waters [R23].
- Soviet fleets falsified catch reports for decades (revealed after 1991) [standard; scale not re-checked].
- *Game note: the treaty that works on paper while a member keeps hunting under a "research" label. A Review gate with
  a loophole category.*

---

## 7. Congestion charging (*a price on the service itself*)

### 7.1 London, 2003–

- Began **17 February 2003** at **£5** a day under Mayor Ken Livingstone [R24].
- First year (TfL): traffic entering the zone in charging hours **down 18%**; **cars down 30%**; bus delays due to traffic
  down up to 60% [R24].
- 2008 (TfL): traffic in zone down 21% since 2003; congestion down 8% [R24].
- **The rebound**: by 2006 TfL found congestion "close to levels before the congestion charge" — because road space was
  reallocated to buses, cyclists, pedestrians and street works — while arguing it would be worse without the charge
  [R24]. Later analysis: speeds back to 2003 levels, though volumes are much lower [R24]. Private-hire vehicles (app
  minicabs) later filled road space [standard; not re-checked].
- **Repeal of part**: the Western Extension (2007) was removed in 2010–11 under Mayor Boris Johnson after a consultation
  [standard; not re-checked].

### 7.2 Stockholm, 2006–

- Trial **3 January – 31 July 2006**; traffic fell about **21%**, and was still c.**20%** lower five years on despite
  population growth [R25].
- Public support was c.**36%** before the trial; a referendum after it gave a majority for keeping the charge in the City
  of Stockholm, though a majority of voters across the county as a whole were against [R25]. Support exceeded **70%** by
  2013 [R25]. (Referendum held alongside the 2006 general election in September [date standard; one source says July;
  not settled here].)
- Jonas Eliasson calls it the "Stockholm congestion pricing syndrome": opposition before, support after [R25].
- *Game note: a lever whose Mandate cost is front-loaded and becomes a Mandate generator once in place. Distinctive.*

### 7.3 Singapore, 1975–

- Area Licensing Scheme from 2 June 1975; Electronic Road Pricing from 1998 [standard; not re-checked]. The longest-running
  case.

### 7.4 New York, 2025–

- Congestion pricing in Manhattan began 5 January 2025 at $9 a day for cars; the federal administration moved to revoke
  approval in February 2025 and litigation followed [standard; status after early 2025 not re-checked].

---

## 8. Circularity (*Circularity*)

- **Deposit return**: Oregon's Bottle Bill (1971) was the first in the US [standard]. Germany introduced a deposit on
  one-way containers in **2003**, the first large European country to do so [R26]. European deposit systems now have a
  median collection rate of **90%** (Reloop, 2025) [R26]. (Country rates of 98% Germany / 97% Norway circulate but were
  unverified in this pass.) Scotland's scheme collapsed in 2023 over UK internal-market rules [standard; not re-checked].
- **Right to repair**: **EU Directive 2024/1799**, transposition due **31 July 2026**; reports of patchy national
  compliance at the deadline [R26]. France's mandatory **repairability index** from **2021** [R26].
- **Plastic bag charges — the restraint rebound in miniature**: Ireland's levy (2002) and a 70c minimum price cut sales
  c.90% [R27]. England's 5p charge (October 2015, 10p from 2021) cut single-use bags sharply (56% fall 2017–19 alone),
  but **UK supermarkets sold 1.58 billion "bags for life" in 2019** — about 57 per household — and total plastic
  increased; Greenpeace and EIA urged a higher price [R27]. **A thicker substitute bought as often as the thin one it
  replaced.**
- **Landfill tax (UK, 1996)** with a later escalator, now over £100 a tonne [approx.; not re-checked]: one of the most
  effective British environmental taxes — landfilled municipal waste fell steeply [qualitative; not re-checked].

---

## 9. Protected areas and land-use restraint

- Yellowstone (1872) as the first national park [standard].
- **Kunming–Montreal Global Biodiversity Framework (December 2022)**, Target 3: protect 30% of land and sea by 2030
  ("30×30") [standard; not re-checked].
- **Leaks**: "paper parks" (designated but unenforced); displacement of clearing to unprotected land; evictions under
  "fortress conservation" [standard concepts; no figures checked].
- **The Amazon Soy Moratorium (2006)** cut soy-driven deforestation in the Amazon biome, while expansion moved to the
  Cerrado; Brazil's deforestation fell steeply 2004–2012 under the PPCDAm action plan, rose again from 2019, and fell
  again from 2023 [qualitative arc standard; figures not re-checked in this pass].

---

## 10. Framings: IPAT, Kaya and the decoupling evidence

### 10.1 Identities

- **IPAT**: Impact = Population × Affluence × Technology (Ehrlich & Holdren, *Science*, 1971; in debate with Barry
  Commoner's *The Closing Circle*, 1971) [standard].
- **Kaya identity**: CO2 = Population × (GDP / person) × (energy / GDP) × (CO2 / energy), due to Yoichi Kaya, around
  1990 [standard]. Jevons lives inside it: a fall in energy/GDP (efficiency) can raise GDP/person.

### 10.2 Decoupling: relative is common, absolute is rare and slow

- **Haberl et al., *Environmental Research Letters* (2020)**, systematic review: screened over 11,500 papers and analysed
  835 empirical studies. "Examples of absolute long-term decoupling are rare, but recently some industrialized countries
  have decoupled GDP from both production- and, weaklier, consumption-based CO2 emissions." Relative decoupling is
  frequent for materials and GHGs but not for useful exergy. Observed rates cannot deliver large rapid absolute cuts, so
  "decoupling needs to be complemented by sufficiency-oriented strategies" [R28].
- **Vogel & Hickel, *Lancet Planetary Health* (2023)**, "Is green growth happening?": identified **11 high-income
  countries that achieved absolute decoupling (consumption-based CO2) between 2013 and 2019**. At achieved rates they
  would "on average take more than 220 years to reduce their emissions by 95%, emitting 27 times their remaining 1·5°C
  fair-shares in the process"; decoupling rates would need to rise "by a factor of ten by 2025" [R29; quoted from the
  paper's summary].
- **Countries that have decoupled** (with consumption-based accounting): UK 1990–2023, trade-adjusted CO2 −38.6% while
  GDP +53.3%; Sweden GDP +56.0%, production CO2 −48.5%, trade-adjusted −34.8% (OWID chart as reproduced) [R30].
  Hubacek et al. (2021): 23 countries absolutely decoupled consumption-based emissions from GDP in 2015–2018 [R30].
- **Caveat**: consumption-based accounting narrows the gains (Sweden's −48% becomes −35%), because some reductions were
  imports of carbon-intensive goods. *This is a leakage mechanic for the game.*

---

## 11. Institutional design (*Institutions*)

### 11.1 Sovereign wealth: Norway vs the resource curse

- **Government Petroleum Fund** created by law in **1990**; first transfer **1996** (just under NOK 2 billion, c.US$300
  million); renamed **Government Pension Fund Global** in 2006 [R31].
- Fiscal rule: annual spending limited to the expected real return — introduced in 2001 at 4%, lowered to **3%** in 2017
  [3% confirmed; 4%/2001 and 2017 dates standard, not re-checked] [R31].
- Value: **NOK 21.27 trillion** at end-2025; c.NOK 22.7 trillion (c.US$2.3 trillion) mid-2026 [R31].
- **"Dutch disease"**: term coined by *The Economist* in 1977 for the decline of Dutch manufacturing after the Groningen
  gas find [standard; date not re-checked].
- **Nauru** [standard story; details not re-checked]: phosphate mined out over the 20th century; the Nauru Phosphate
  Royalties Trust lost much of its wealth on investments, among them financing a 1993 London musical about Leonardo da
  Vinci that closed within weeks. *A sovereign wealth fund as a cautionary tale.*
- Others: Alaska Permanent Fund (1976; dividends from 1982) [standard].
- *Game note: an Institution that converts a stock resource into a permanent flow — and whose spending rule is the
  real Institution.*

### 11.2 Statistics, budgets and independent bodies

- An honest statistics office is DESIGN.md's first Institution ("reveals the rebound line"). Real analogues: the UK
  Office for Budget Responsibility (2010), independent central banks (Bank of England 1997), the **Climate Change Act
  2008** with its independent **Climate Change Committee** and five-yearly **carbon budgets** (net zero by 2050 legislated
  in 2019) [standard UK facts; not re-checked in this pass].
- Fisheries: the need for an independent stock survey (CPUE hyperstability, `sectors.md` §3.5).

### 11.3 Sunset clauses and ratchets

- **Ratchet**: the Paris Agreement's five-yearly NDC cycle, each meant to be more ambitious than the last [standard].
  Japan's Top Runner is a ratchet in miniature (§5.3).
- **Sunset clause**: a measure that expires unless renewed. Many emergency measures (55 mph, ration coupons) were sunset
  in practice; the fuel duty escalator was ended by a single Pre-Budget Report.

---

## 12. Candidate levers and Institutions, each with its real-world catch

| Lever / Institution | Real model | What it did | The catch (to model) |
|---|---|---|---|
| **Fuel duty escalator** | UK 1993–99 | Automatic real rises in fuel duty | Visible at the pump; a blockade event can repeal it; once ended, frozen for a decade or more |
| **Revenue-neutral carbon tax** | BC 2008–2025, Sweden 1991– | −19% per capita fuel (BC); −11% transport CO2 (Sweden) | Neutrality decays; repeal when a neighbour drops its own; trade-exposed carve-outs |
| **Carbon tax with no dividend** | France 2018 | Planned rises | Gilets-jaunes crisis: Mandate collapse, rate frozen |
| **Cap and trade** | ARP 1990, EU ETS 2005, RGGI 2009 | −95% SO2 (ARP) | Over-allocation from industry projections → price to zero; waterbed; leakage via imports; members leave |
| **Market Stability Reserve** (Institution) | EU 2019 | Absorbs surplus permits | Only after a decade of near-worthless permits |
| **Rationing** | UK 1940–54 | Fair shares; health gains | Popular in war, resented after; black market (not covered here) |
| **Ration coupons in reserve** (Institution) | US 1974 | Printed, never used | Cheap insurance; destroyed unused — a pure Mandate-free threat |
| **Speed limit** (sufficiency) | US 55 mph 1974–95 | 0.5–1% fuel | Compliance decays; repealed |
| **Car-free days** (sufficiency) | NL 1973–74 | Ten Sundays | Savings disappointed; dropped |
| **Crisis conservation** (sufficiency) | Japan setsuden 2011 | −18% peak | Fades without the crisis |
| **Dress-code norm** (sufficiency) | Cool Biz 2005 | c.150 MW | Small effect; persistent culture |
| **Working-time cut** (sufficiency) | UK 4-day week 2022 | 89% kept it a year on | Self-selected; consumption effect of leisure unknown |
| **Ban with substitute** | Montreal 1987 | Ozone recovering | Substitute (HFCs) was a greenhouse gas → needs Kigali; rogue producers (CFC-11, 2018) |
| **Ban with no substitute fight** | Leaded petrol 1921–2021 | Ended worldwide | Took 80 years from first warnings; the last holdouts take longest |
| **Efficiency mandate on lamps** | EU 2009, US 2023 | Incandescents gone | LEDs so cheap that lit area and sky glow rise — Jevons |
| **Smoke control areas** | Clean Air Act 1956 | Smokeless fuels only | Slow to bite (1962 smog); tall chimneys export the problem |
| **Fleet efficiency standard** | CAFE 1975 | Cars to 27.5 mpg | Category boundary: demand migrates to "light trucks" |
| **Appliance standard** | US fridges | −70% energy | Works only once the application saturates |
| **Top Runner ratchet** (Institution) | Japan 1998 | +55% fridges, +68% ACs | Needs a market leader to set the pace |
| **Ostrom commons** (Institution tree) | Törbel, Valencia | Centuries of stable use | Each missing principle is a failure mode; does not scale without nesting |
| **ITQs** | Iceland 1984/1990 | Stops the race to fish | Free allocation to incumbents; concentration; UN rights ruling |
| **Moratorium** | IWC 1982 | Commercial whaling stopped | "Scientific" loophole; objectors; members exit |
| **EEZ / nationalisation** | Canada 1977 | Foreign fleets out | Home fleet overfishes instead (Grand Banks) |
| **Congestion charge** | London 2003, Stockholm 2006 | −18–21% traffic | Road space reallocated → congestion returns; extensions repealed; but Stockholm's support rises after |
| **Deposit return** | Germany 2003 | c.90% median return in Europe | Collapses if markets fragment (Scotland 2023) |
| **Bag charge** | England 2015 | Single-use bags down sharply | Bags for life: 1.58 bn sold in 2019 |
| **Right to repair** | EU 2024 | Longer product life | Transposition lags; manufacturers resist |
| **Protected areas** | 30×30 (2022) | Area protected | Paper parks; displacement |
| **Sovereign wealth fund** (Institution) | Norway 1990 | Stock → permanent flow | The spending rule is the real institution; Nauru shows the failure |
| **Independent statistics / survey** (Institution) | ONS, stock surveys | Reveals the true trend | Only if trusted and independent; CPUE without survey lies |
| **Carbon budgets + committee** (Institution) | UK CCA 2008 | Statutory ceilings | A law a later Parliament can amend |

## 13. How restraint itself rebounds (mechanisms)

1. **Leakage**: activity moves outside the boundary — imports into RGGI, carbon-intensive goods into Sweden's
   consumption accounts, Swedish share trading to London (Sweden's 1984–91 financial transaction tax drove much trading
   abroad [standard; not re-checked]), clearing from the Amazon to the Cerrado.
2. **Boundary migration**: demand crosses the line of a standard — cars → light trucks under CAFE.
3. **Substitution rebound**: the replacement has its own harm — CFCs → HFCs; thin bags → bags for life.
4. **Cheap-service rebound from a mandate**: an efficiency ban makes the service cheaper — incandescent → LED → more
   lighting.
5. **Over-allocation collapse**: a cap drafted from the regulated parties' forecasts starts slack and the price goes to
   zero (EU ETS 2007).
6. **Waterbed**: a national measure inside a fixed cap frees permits to be used elsewhere.
7. **Reallocated slack**: freed capacity is given to other uses and the original problem returns (London road space).
8. **Moral licence**: the recycling bin raises paper use (`sectors.md` §5.5).
9. **Behavioural offset**: safety and efficiency gains are spent on risk or use (Peltzman).
10. **Green paradox**: owners of a resource extract faster in anticipation of future restraint (Hans-Werner Sinn, 2008)
    [standard concept; not re-checked].
11. **Decay and repeal**: compliance falls (55 mph), governments change (BC 2025, Australia 2014, Virginia 2023), a
    single blockade ends an escalator (UK 2000), a single protest wave freezes a carbon tax (France 2018).
12. **Capture and concentration**: quota rights pool with incumbents (Iceland); a "scientific" exemption becomes the
    industry (IWC).
13. **Respending**: money saved by sufficiency is spent elsewhere (the economy-wide rebound DESIGN.md already models).

The ones that worked best combined: a **visible crisis**, **few actors**, a **ready substitute**, **compensation** for
losers (Montreal's Multilateral Fund, revenue recycling), and a **ratchet or automatic stabiliser** (Kigali, MSR, Top
Runner) so restraint did not depend on annual courage.

---

## Sources

- [R1] UK fuel duty escalator and 2000 protests: IFS, https://www.ifs.org.uk/publications/3374 ; IFS BN8, https://www.ifs.org.uk/sites/default/files/output_url_files/bn8.pdf ; Fuel protests in the United Kingdom, https://en.wikipedia.org/wiki/Fuel_protests_in_the_United_Kingdom ; Hydrocarbon Oil Duty, https://en.wikipedia.org/wiki/Hydrocarbon_Oil_Duty ; Westminster Research, https://westminsterresearch.westminster.ac.uk/item/902vw/two-unannounced-environmental-tax-reforms-in-the-uk-the-fuel-duty-escalator-and-income-tax-in-the-1990s
- [R2] Sweden: Andersson, CCCEP working paper, https://www.cccep.ac.uk/wp-content/uploads/2017/03/Working-paper-212-Andersson_update_March2017.pdf ; AEJ appendix, https://aeaweb.org/doi/10.1257/pol.20170144.appx ; World Bank, https://www.worldbank.org/en/news/feature/2016/05/16/when-it-comes-to-emissions-sweden-has-its-cake-and-eats-it-too ; Åkerfeldt & Hammar, https://financing.desa.un.org/sites/default/files/2020-04/13STM_Article_CO2-tax_AkerfeldtHammar.pdf
- [R3] British Columbia: British Columbia carbon tax, https://en.wikipedia.org/wiki/British_Columbia_carbon_tax ; CBC, https://www.cbc.ca/lite/story/1.7493181 ; CBC, https://amp.cbc.ca/lite/story/1.7487731 ; CBC, https://amp.cbc.ca/lite/story/1.7484316
- [R4] France 2018: Al Jazeera, https://www.aljazeera.com/news/2018/12/4/france-suspends-fuel-tax-hikes-amid-yellow-vest-protests ; Al Jazeera, https://www.aljazeera.com/news/2018/12/4/the-yellow-vest-movement-explained ; Climate Home News, https://climatechangenews.com/?p=38272 ; Euronews, https://www.euronews.com/2018/12/03/gilets-jaunes-who-are-they-and-what-do-they-want-euronews-answers
- [R5] Acid Rain Program: EPA 2020 progress report, https://www3.epa.gov/airmarkets/progress/reports_2020-2021/pdfs/2020_report.pdf ; EPA 2019 report, https://www.epa.gov/sites/default/files/2021-05/documents/2019_full_report.pdf ; EPA programs, https://epa.gov/power-sector/programs-progress ; Chan et al., https://econ.umd.edu/sites/www.econ.umd.edu/files/pubs/1-s2.0-s0095069617301973-main.pdf ; MIT CEEPR 98-011, https://ceepr.mit.edu/wp-content/uploads/2023/02/98011.pdf
- [R6] EU ETS: European Commission, https://climate.ec.europa.eu/areas-action/carbon-markets/eu-emissions-trading-system-eu-ets/development-eu-ets-2005-2020_en ; Cooper, Harvard, https://heep.hks.harvard.edu/sites/projects.iq.harvard.edu/files/heep/files/dp19_cooper.pdf ; EDF lessons, https://www.edf.org/sites/default/files/EU_ETS_Lessons_Learned_Executive_Summary_EDF.pdf
- [R7] RGGI monitoring reports: 2009, https://www.rggi.org/sites/default/files/Uploads/Electricity-Monitoring-Reports/2009_Elec_Monitoring_Report.pdf ; 2011, https://rggi.org/sites/default/files/Uploads/Electricity-Monitoring-Reports/2011_Elec_Monitoring_Report.pdf ; 2012, https://rggi.org/sites/default/files/Uploads/Electricity-Monitoring-Reports/2012_Elec_Monitoring_Report.pdf ; 2023, https://www.rggi.org/sites/default/files/Uploads/Electricity-Monitoring-Reports/2023_Elec_Monitoring_Report.pdf
- [R8] UK rationing: Imperial War Museums, https://www.iwm.org.uk/history/what-you-need-to-know-about-rationing-in-the-second-world-war ; Who Do You Think You Are?, https://www.whodoyouthinkyouaremagazine.com/feature/rationing-second-world-war ; National Geographic, https://www.nationalgeographic.com/history/article/wartime-diet-britain-world-war-jack-drummond
- [R9] 1974 ration coupons: Library of Congress, https://www.loc.gov/item/2003673995/ ; GAO FOD-76-22, https://www.gao.gov/assets/fod-76-22.pdf ; Heritage Auctions, https://currency.ha.com/itm/miscellaneous/other/federal-gasoline-ration-coupons-printed-in-1974-an-uncut-sh/a/30022-2275.s ; Reason (1983), https://reason.com/1983/09/01/coupon-caper/printer/
- [R10] 55 mph: History.com, https://www.history.com/this-day-in-history/nixon-signs-national-speed-limit-into-law ; National Maximum Speed Law, https://www.Wikipedia.com/wiki/National_Maximum_Speed_Law ; Mises Wire, https://mises.org/wire/what-failed-55-mph-speed-limit-law-tells-us-about-covid-lockdowns ; SlashGear, https://www.slashgear.com/2193768/why-america-speed-limit-capped-1970s-history/
- [R11] Dutch car-free Sundays: IET, https://engx.theiet.org/b/blogs/posts/car-free-sunday-navigating-the-1973-oil-crisis ; CVCE, https://webintra.cvce.eu/obj/oil_crisis_in_the_netherlands-en-e5719367-1c20-4aa2-865e-8d2e93211fde.html ; Hellema, Wiebes & Witte (via CORE), https://core.ac.uk/download/334589565.pdf ; Jalopnik, https://www.jalopnik.com/2265941/bans-1973-sunday-driving-europe-dutch-horses-highway/
- [R12] Cool Biz and setsuden: Japan Times 2005, https://www.japantimes.co.jp/news/2005/09/10/business/cool-biz-saved-power-tepco ; Cool Biz campaign, https://en.wikipedia.com/wiki/Cool_Biz ; JEF article, https://www.jef.or.jp/journal/pdf/187th_special_article03.pdf ; Japan for Sustainability, https://www.japanfs.org/en/news/archives/news_id031181.html
- [R13] Four-day week: NPR, https://www.npr.org/2023/02/21/1158507132/uk-study-companies-four-day-workweek ; Autonomy, https://autonomy.work/2024/02/21/make-it-stick/ ; WEF, https://www.weforum.org/stories/2023/03/four-day-work-week-uk-trial/
- [R14] Montreal and Kigali: UNEP Ozone Secretariat, https://ozone.unep.org/node/4056 ; https://ozone.unep.org/node/13932 ; MOP-35 document, https://www.ozone.unep.org/sites/default/files/2023-08/MOP-35-8E.pdf ; Meteorological Technology International, https://meteorologicaltechnologyinternational.com/news/data/ozone-layer-on-course-to-recover-in-40-years.html
- [R15] Leaded petrol: UNEP, https://www.unep.org/news-and-stories/story/inside-20-year-campaign-rid-world-leaded-fuel ; Al Jazeera, https://www.aljazeera.com/news/2021/8/30/un-hails-milestone-as-use-of-leaded-petrol-ended-globally ; Dawn, https://www.dawn.com/news/1643658/leaded-petrol-runs-out-of-gas-century-after-first-warnings
- [R16] Great Smog and Clean Air Act: London Museum, https://londonmuseum.org.uk/collections/london-stories/the-great-smog-of-1952 ; Britannica, https://www.britannica.com/event/Great-Smog-of-London ; Hansard 24 Nov 1954, https://api.parliament.uk/historic-hansard/written_answers/1954/nov/24/air-pollution-committee-report ; Hansard 21 Jul 1953, https://api.parliament.uk/historic-hansard/commons/1953/jul/21/air-pollution-committee-of-inquiry ; National Archives blog, https://blog.nationalarchives.gov.uk/the-great-smog-of-1952/ ; Hugh Beaver, https://en.Wikipedia.com/wiki/Hugh_Beaver ; Clean Air Act 1956, https://ipfs.ssi.eecc.de/ipns/en.wikipedia-on-ipfs.org/wiki/Clean_Air_Act_1956 ; Gresham College (Mudway), https://www.gresham.ac.uk/sites/default/files/transcript/2022-12-05-1800_MUDWAY-T.pdf
- [R17] CAFE: Pew, https://www.pewtrusts.org/en/research-and-analysis/fact-sheets/2011/04/20/driving-to-545-mpg-the-history-of-fuel-economy ; EIA, https://www.eia.gov/todayinEnergy/detail.php?id=7390 ; UCS, https://www.ucs.org/clean-vehicles/fuel-efficiency/fuel-economy-basics.html ; Encyclopedia.com, https://encyclopedia.com/environment/encyclopedias-almanacs-transcripts-and-maps/corporate-average-fuel-economy-standards ; CRS IB90122, https://www.everycrsreport.com/files/20050607_IB90122_bdfa13545f66ce4e992f2eade6fa7b5649727d5e.html
- [R18] Fridges: ACEEE (McMahon), https://aceee.org/files/proceedings/2004/data/papers/SS04_Panel11_Paper02.pdf ; National Geographic/ASAP, https://www.nationalgeographic.com/environment/article/new-fridge-standards-take-effect-monday-how-refrigerators-have-kept-cool-over-40-years-of-improvements
- [R19] Top Runner: METI presentation (Kodaka), https://www.eceee.org/static/media/uploads/site-2/events/eceee_events/product_efficiency_08/programme_presentations/Kodaka_TopRunnerProgram.pdf ; bigee.net, https://bigee.net/en/policy/guide/appliances/policy_examples/22/ ; IEA, https://www.iea.org/policies/1945-top-runner-programme
- [R20] Ostrom: Agrarian Trust, https://www.agrariantrust.org/ostroms-eight-design-principles-for-a-successfully-managed-commons/ ; SESMAD, https://sesmad.dartmouth.edu/theories/54 ; Lincoln Institute (Cox et al.), https://www.lincolninst.edu/publications/working-papers/design-principles-are-not-blue-prints-are-they-robust/
- [R21] Iceland ITQs: FAO, https://www.fao.org/3/y2684e/y2684e05.htm ; EDF, https://blogs.edf.org/edfish/2010/06/03/icelands-itq-fisheries-management-demonstrates-the-benefits-of-well-designed-catch-shares/ ; Edvardsson et al. (Opin vísindi), https://opinvisindi.is/bitstream/20.500.11815/970/4/post-print%2c%20manuscript1.pdf
- [R22] UN HRC 1306/2004: Icelandic government copy, https://www.stjornarradid.is/library/02-Rit--skyrslur-og-skrar/Mannrettindaskyrslur/Álit Mannréttindanefndarinnar í máli nr. 1306-2004.pdf ; ICSF, https://www.icsf.net/wp-content/uploads/2021/06/3150_art10.pdf ; IPS, https://www.ipsnews.net/?p=27800
- [R23] IWC: Nereus Program, https://nereusprogram.org/works/legal-considerations-around-japans-announcement-that-it-will-leave-the-international-whaling-commission-iwc/ ; Legal Planet, https://legal-planet.org/?p=28620 ; Skadden, https://www.skadden.com/-/media/files/publications/2019/05/japans_whaling_plans_risk_intl_trade_pushback.pdf
- [R24] London congestion charge: TfL 2004, https://tfl.gov.uk/info-for/media/press-releases/2004/february/ccharge-celebrates-successful-first-year ; TfL 2008, https://nile.tfl.gov.uk/info-for/media/press-releases/2008/february/fifth-anniversary-of-congestion-charge-that-changed-transport-policy-across-the-world ; Streetsblog, https://nyc.streetsblog.org/2013/02/15/lessons-from-london-after-10-years-of-the-congestion-charge ; Santos & Shaffer, https://orca.cardiff.ac.uk/53331/1/Santos%20and%20Shaffer%202004%20%283%29.pdf
- [R25] Stockholm: Eliasson, "The Stockholm congestion charges – five years on", https://www.transportportal.se/SWoPEc/CTS2012-3.pdf ; "The Stockholm congestion pricing syndrome", https://www.transportportal.se/swopec/CTS2014-1.pdf ; IBTTA, https://www.ibtta.org/blog/congestion-pricing-trial-shows-seeing-believing
- [R26] Deposits and repair: Sensoneo, https://old.sensoneo.com/waste-library/deposit-return-schemes-overview-europe/ ; Reloop fact sheet, https://www.reloopplatform.org/wp-content/uploads/2025/11/20251124_Key-factors-impacting-DRS-performance_FactSheet_vFinal.pdf ; Euronews 2026, https://www.euronews.com/my-europe/2026/09/08/can-the-eu-save-consumers-12bn-on-appliance-repairs ; Circle Economy, https://circle-economy.prod.circularity-gap.world/knowledge-hub/article/25882
- [R27] Bags for life: EIA International, https://eia-international.org/news/supermarkets-churn-out-more-than-900000-tonnes-of-plastic-a-year-despite-pledges-to-cut-back/ ; Retail Gazette, https://www.retailgazette.co.uk/blog/2021/04/government-urged-to-raise-prices-on-bags-for-life-to-curb-plastic-use/ ; Reason, https://reason.com/2019/12/02/britains-plastic-bag-fee-is-producing-a-huge-spike-in-the-consumption-of-thicker-reusable-plastic-bags
- [R28] Haberl et al. 2020: https://eprints.whiterose.ac.uk/159384/1/Haberl%2Bet%2Bal_%202020%20_Environ._Res._Lett._10.1088_1748-9326_ab842a.pdf ; https://research.wu.ac.at/de/publications/a-systematic-review-of-the-evidence-on-decoupling-of-gdp-resource-6/
- [R29] Vogel & Hickel 2023, Lancet Planetary Health, DOI 10.1016/S2542-5196(23)00174-2; author copy https://www.jasonhickel.org/s/Vogel-and-Hickel.pdf
- [R30] Decoupling by country: Our World in Data, https://ourworldindata.org/co2-gdp-decoupling ; blog reproduction of OWID trade-adjusted chart, https://volewica.blogspot.com/2024/10/decoupling-emissions-from-growth.html ; Hubacek et al. 2021, https://research.birmingham.ac.uk/en/publications/evidence-of-decoupling-consumption-based-cosub2sub-emissions-from/
- [R31] Norway: NBIM history, https://www.nbim.no/en/about-us/about-the-fund/the-history/ ; Norsk Petroleum, https://www.norskpetroleum.no/en/economy/management-of-revenues/ ; Life in Norway, https://www.lifeinnorway.net/oil-fund-posts-one-of-its-biggest-ever-annual-gains/
