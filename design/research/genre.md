# What makes a good incremental game, especially a long one

Research for *Rebound*, 18 Nov 2026. Organised by topic. Each topic gives the principle, the evidence (who said it or
which game shows it, with a link), numbers where they exist, and the counter-view where designers or players disagree.

**How to read the evidence.**

- **[S]** I read the source in this session and the claim is in it.
- **[R]** Reported second-hand (a search summary, a fan wiki, a review). Treat as likely, not certain.
- **[U]** Unverified: my own knowledge of the games or the genre's practitioner lore. Correct to my knowledge, but I did
  not find a primary source this session. Every **[U]** number should be checked before it becomes a test.

Several primary sources could not be read: Pecorella's GDC slides (SlideShare would not render), the GDC Vault videos,
the CMU close reading of Kittens Game (host blocked), the Eludamos paper on idle games (host blocked), and Reddit
itself (blocked; community threads were read through the Arctic Shift archive, which only returned 2026 threads).
The source list at the end says which.

---

## 1. Why the genre works at all

**Principle.** An incremental is a machine for the feeling of progress. Everything goes up, the game plays itself, and
the player's job is to make it go up faster by choosing well. The hook is consensual: the player knows it is a hook.

**Evidence.**

- Pecorella (Kongregate, GDC 2015): "You don't have to be constantly playing; there's constant positive growth and
  feedback"; "Everything is 'going up' so it feels like you're always progressing"; a "natural energy system without the
  need for an energy currency"; and the longer you are away, the bigger the return, which is a "celebratory moment".
  [S] ([Game Developer report](https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play))
- Orteil (Cookie Clicker): "We just tapped into the core psychological appeal behind a lot of games: getting something
  done." Repetition "only becomes abusive when the repetition is devoid of substance and sincerity." [S]
  ([Vice](https://www.vice.com/en/article/cookie-clicker-wasnt-meant-to-be-fun-why-is-it-so-popular-8-years-later))
- Frank Lantz (Universal Paperclips): "I want you to fall into it, and I also want you to kind of lean back from it …
  I want it to be consensual. I want you to want its hooks in you." [S]
  ([Y Combinator podcast transcript](https://ycombinator.com/blog/frank-lantz-director-of-nyus-game-center-and-creator-of-universal-paperclips))
- Pecorella also notes the genre's shame: many idle games are satirical *because* players are embarrassed to enjoy them.
  [R] (search summary of the 2015 talk; [GDC Vault](https://gdcvault.com/play/1022066/Idle-Games-The-Mechanics-and))

**For us.** A game about runaway growth sits inside the genre that is *made of* runaway growth. That is the strongest
thing about the premise. Lantz's "fall in, then lean back" is exactly the Jevons reveal.

---

## 2. The core loop: always something to buy, always something to wait for

**Principle.** At every moment the player should have (a) something affordable or nearly affordable, (b) a visible next
goal slightly out of reach, and (c) a reason to come back. The loop is *earn → spend → earn faster*, nested inside
*reset → spend the reset currency → earn faster still*.

**Evidence.**

- Pecorella's model: resources rise at a set rate, actions raise the rate. [S]
  ([Game Developer](https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play))
- Players praise games that keep "the next milestone slightly ahead". [R] (Unnamed Space Idle Steam discussion, via
  search: [Steam](https://steamcommunity.com/app/2471100/discussions/0/4352239720874146657))
- A 2026 r/incremental_games thread: "I like when the upgrade menus light up or otherwise indicate that you can afford an
  upgrade from the main page rather than having to manually check." [S]
  ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/))
- Tino van der Kraan on Cookie Clicker: "Obtaining each reward takes just a little bit more effort than the last one."
  [S] ([Game Developer](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker))
- Paperclips deliberately breaks the smooth curve: dead ends, bottlenecks, shortages that cut income. Reviewers read the
  unevenness as part of the argument. [S] ([Vice](https://www.vice.com/en/article/universal-paperclips-depth-desire))

**Numbers.** No designer I could read publishes a purchase cadence. Practitioner rule of thumb [U]: a purchase or
decision every 10–30 s in the first five minutes, every 30 s–2 min to the end of the first hour, and never more than
about 5 minutes of *active* play without a new purchase, decision or reveal. Longer gaps are acceptable only when the
player can leave and come back (idle), and then the return must pay.

**Counter-view.** Not every gap is bad. Paperclips' bottlenecks are deliberate; Kittens Game's winters are a planning
problem, not a gap. The test is whether the player is *deciding* during the gap or merely waiting.

---

## 3. The mathematics of pacing

**Principle.** Costs grow exponentially; production grows linearly or polynomially; so every generator eventually stalls,
and the designer controls how long each stall takes. Multipliers at milestones and new generators restart the climb.
Prestige exists to let the player "get farther through the cost curve before falling behind".

**Evidence and numbers.**

- Pecorella, *The Math of Idle Games* I: cost_next = base × rate^owned; production = base × owned × multipliers. AdVenture
  Capitalist lemonade stands use rate **1.07**. "Costs grow exponentially while production grows at a linear or polynomial
  rate", and exponential growth "will eventually catch and far exceed any polynomial growth". AdCap doubles production at
  25, 50 and 100 owned. [S] ([Part I](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i))
- Buy-max: max = floor(log_r(c(r − 1)/(b·r^k) + 1)). Bulk cost = b·r^k(r^n − 1)/(r − 1). [S] (Part I)
- With default multipliers the newest generator dominates; Pecorella retuned milestone multipliers so that "different
  generators take priority". [S] (Part I)
- Derivative cascades (generators that make generators) give polynomial growth t^n/n!, which still always loses to
  exponential cost. Derivative Clicker's cost rate is **1.1**. Antimatter Dimensions took this model from Derivative
  Clicker (Hevipelle). [S] ([Part II](https://www.gamedeveloper.com/disciplines/the-math-of-idle-games-part-ii);
  [Hevipelle interview](https://www.incrementaldb.com/community/interview/31))
- Cookie Clicker buildings cost **1.15×** the previous one. [U] (well known; not re-checked this session.) The genre range
  is therefore roughly 1.07–1.15: lower means long, steady buying of one thing; higher means you move on to the next
  generator sooner.
- Late-game "bursts": milestone multipliers at 300/400/500 owned (×16 at 500 in AdCap) produce bursts of rapid buying.
  Pecorella recommends making resets "bumpy" with varied timing. [S]
  ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii))
- **Soft caps.** Evolve's plasmids have diminishing returns above 250 and soft-cap around 400–500, raised by a later
  currency. [R] ([community FAQ via search](https://pmotschmann.github.io/Evolve/wiki.html)) Players dislike soft caps
  when they are invisible: "I like the automation things and i hate the softcaps" [S]
  ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/)).
- **Timewalls.** Recurring complaint: progress that "hits a wall that can only be overcome through leaving the game idle
  for hours offline" after about an hour of play [S]
  ([thread 1vbkhtp](https://www.reddit.com/r/incremental_games/comments/1vbkhtp/)); "everything turned out to be a
  timewall"; "20-second bursts separated by much longer stretches of idle time" [R] (itch.io jam comments via search).
  A suggested fix: parallel progression tracks with walls at different times, so the player switches rather than waits.
  [R] (itch.io, same search)

**Counter-view.** Some players want walls ("I actually enjoy constructing a viable strategy … Don't really like games you
can beat with your left foot") [S] ([thread 1w8la69](https://www.reddit.com/r/incremental_games/comments/1w8la69/)).
Hevipelle praises "really slow phased" Fundamental against the fast trend. [S]

**For us.** Our efficiency cards are one-off purchases, not N-of-a-generator. That removes the 1.07–1.15 buying rhythm,
which is the genre's main source of constant small purchases. See the audit.

---

## 4. The first five minutes and the first session

**Principle.** The first action must be obvious, the first purchase almost immediate, and the first *surprise* inside
the first few minutes. Players decide very early whether the game is worth their attention.

**Evidence and numbers.**

- Cookie Clicker: the name and the giant cookie make the first action obvious without instruction. [S]
  ([Game Developer](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker))
- A Dark Room: Amir Rajan says some players quit "before the fire lights the room"; he playtested heavily and cut lulls
  because "a mobile audience will delete an app if pacing slips", and placed small "carrots" to keep curiosity. [S]
  ([PocketGamer.biz](https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/))
- A jam reviewer: the genre's promise is quick payoff, and a slow first purchase undercuts it. [R] (itch.io via search)
- GameAnalytics: idle games' median D1 retention was about **35–36%**, top quartile **42%** (Q3 2018–Q2 2019); idle
  sessions "up to 8 minutes"; idle stickiness (DAU/MAU) 18% against hyper-casual's 10.5%. All-genre 2025 benchmark: if
  value is not clear in the first **5–15 minutes**, players churn. [R]
  ([Game World Observer](https://gameworldobserver.com/2020/12/22/gameanalytics-names-benchmark-engagement-metrics-idle-games);
  [GameAnalytics blog](https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game))
- Hevipelle's regret about Antimatter Dimensions' opening: "it's just 'click the green button' -simulator." [S]
  ([interview](https://www.incrementaldb.com/community/interview/31))

**Numbers [U].** Benchmarks I know from playing: Cookie Clicker's first Cursor at about 15 clicks (under 10 s); A Dark
Room's first new verb (gather wood, then the builder) inside 1–2 minutes; Paperclips' first autoclipper inside about a
minute and its first project inside 3–5. A target of **first purchase ≤ 30 s, first new mechanic ≤ 3 min, first
surprise ≤ 5 min** is consistent with all of them.

**Counter-view.** A Dark Room proves a slow, mysterious start can work, *if* the mystery is the hook. It also proves the
cost: some players leave before it lands.

---

## 5. Unfolding, reveal, surprise

**Principle.** The best incrementals hide their size. New panels, verbs and resources appear as the player earns them;
the game is larger than it first looked, and the player learns this repeatedly. Each reveal should change what the player
*does*, not only what they see.

**Evidence.**

- Candy Box (aniwey): "'Nothing at first, then it grows,' is my favorite part of the game"; an unexplained option exists
  "because of surprise", which "is what I'm trying to achieve in this game". [R]
  ([Kotaku](https://kotaku.com/candy-box-a-game-thats-simple-sweet-and-strangely-c-492318079);
  [PC Gamer](https://www.pcgamer.com/candy-box-1/))
- A Dark Room: just as the player feels they understand it, it introduces a twist (Rajan). [S]
  ([PocketGamer.biz](https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/))
- Universal Paperclips: the screen starts nearly empty and grows panel by panel through stages (business, computation,
  trust, global, cosmic), each with a new main verb; the interface itself changes. [S]
  ([IF50](https://if50.substack.com/p/2017-universal-paperclips))
- Pecorella (GDC 2016): "prestige variation", where the rules change on each prestige, keeps the game "fresher [and]
  more engaging" rather than "the same thing just faster". [R] (search summary of the Idle Chatter talk;
  [GDC Vault](https://gdcvault.com/play/1023208/Idle-Chatter-What-We-Can))
- The genre's own name dispute: some players say "incremental" means number growth; others say it means *unfolding*
  games that reveal mechanics over time, with A Dark Room the canonical example. [R] (itch.io via search)

**Counter-view.** Unfolding can overwhelm: "I hate when there's suddenly a billion things to keep track of, all at once,
without any clear guidance." [S] ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/))
One new thing at a time.

---

## 6. Prestige

**Principle.** A reset must feel like a promotion, not a punishment: the next run visibly faster, and ideally different.
The genre's commonest failure is a reset that only adds a multiplier.

**Evidence and numbers.**

- Pecorella, *The Math of Idle Games* III. Prestige formulas are fractional powers of earnings, so doubling the reset
  currency needs a growing multiple of earnings [S]
  ([Part III](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii)):

  | Game | Formula | Earnings needed to double prestige |
  |---|---|---|
  | AdVenture Capitalist | 150·√(lifetime/10¹⁵) | about 3–4× |
  | Realm Grinder | quadratic in √(max) | about 4× |
  | Cookie Clicker | ∛(lifetime/10¹²) | about 8× |
  | Egg, Inc. | (run/10⁶)^0.14 | about 128× |

  Lifetime-based formulas reward pushing further; since-reset formulas pay equal runs equally. Egg, Inc. caps offline at
  2 h. Prestige also "reins growth back" so the designer has a steady number to tune against. [S]
- When the first reset should come: Pecorella gives **no general rule**; his only worked example has a first run of
  120 minutes. Players who have just hit a milestone keep playing (a fast section), which simple models miss. [S]
- Cookie Clicker's first heavenly chip comes at 1 trillion cookies baked; each further chip needs cubically more. [R]
  ([wiki](https://cookieclicker.wiki.gg/wiki/Prestige))
- Hevipelle took "the multiple layers of prestige" from Realm Grinder, automation from Transport Defender, and challenges
  from Idle Wizard, then took each "further than in their original games". [S]
  ([interview](https://www.incrementaldb.com/community/interview/31))
- Community, 2026: "I like when each new layer changes a familiar decision instead of just adding another currency. The
  frustrating version is a prestige reset that only makes numbers bigger, without giving you a different strategy or a
  clearer short-term goal." "The only kind of prestige that I actually [like] are 'tiers' that unlock new mechanics every
  tier." "Bad prestige that you need to undergo ten times … almost nothing [is] an awful waste of time." [S]
  ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/))
- On choosing prestige effects: a proposal to switch prestige boosts at will was rejected because the optimal play
  becomes cycling the switch; the top fix was to make the choice *at the reset*, as a decision about the next run. [S]
  ([thread 1utmy54](https://www.reddit.com/r/incremental_games/comments/1utmy54/))
- One player disliked a New Game+ that was slower than the first run. [S] (same thread 1uytrlm)

**First-reset timing [U].** From play: Realm Grinder's first abdication inside the first hour; Antimatter Dimensions'
first dimension boost and galaxy in minutes and first Infinity after roughly 1–3 hours; Cookie Clicker's first sensible
ascension after many hours to days; Kittens Game's first reset after many hours. Short-arc games with a reset loop
(Increlution, Magic Research) reset within the first 10–30 minutes, because their reset *is* the core loop. A long game
can put the first reset at 30–60 minutes **if the first run has its own arc and ending**; otherwise 1–2 hours.

**What each layer must change (synthesis).** A new layer earns its place when it brings at least one of: a new verb, a
new resource with its own constraint, automation of the previous layer, a new kind of choice (a build, a loadout, a
challenge), or a change of scale. Antimatter Dimensions' Infinity (challenges, autobuyers), Eternity (time studies, a
respec-able tree) and Reality (glyphs, an automator script) each add a new *kind* of decision. [R]
([AD wiki history](https://antimatter-dimensions.fandom.com/wiki/User_blog:Bubby3/The_History_of_Antimatter_Dimensions))

**Counter-view.** Some players dislike prestige altogether ("Prestige in anything almost makes me not play") [S]. A
minority of acclaimed games avoid resets entirely (Mining and Dwarves advertises "no prestige resets" [S], thread list).

---

## 7. Meaningful choices in a genre that tends to one optimal path

**Principle.** Incrementals converge on a single optimal order unless choices are designed to stay open: exclusive
branches whose value depends on context, respec, run modifiers, and loadouts chosen at the reset. A choice with one right
answer and a large penalty is worse than no choice: it sends players to a guide.

**Evidence.**

- The 2026 "guide-slop" thread (166 points, 169 comments): games "balanced around players completing the game in one
  specific way that is not made clear anywhere within the game"; "The moment I start having to follow an exact guide …
  I tend to drop these games." Diagnosis from the thread: "multiplicative hyperspecialization ('builds') … If you stack
  all of them progress takes seconds. If you don't, progress takes years." "A multiple choice test with one right answer
  and a punishment of 'your game sucks for a month' for getting it wrong." Praised as playable without a guide: NGU Idle,
  Antimatter Dimensions, Trimps, Magic Research 1 and 2, Kittens Game ("very forgiving; follow a dead end path and you
  just reset with your gains, try again"). [S]
  ([thread 1w8la69](https://www.reddit.com/r/incremental_games/comments/1w8la69/))
- Same thread: a skill tree "where you must pick the exact correct upgrades or else make no progress, especially when so
  many of the upgrades are complicated math formulas that no one gives a crap about" is the worst case. [S]
- Realm Grinder's factions are run-level strategic identities (Elves for coin, Undead for offline). [R]
  ([PC Gamer guide](https://www.pcgamer.com/au/realm-grinder-guide))
- Frostpunk's laws are irreversible and the player cannot see later branches when choosing; 11 bit built the law system
  "to force players to weigh the choice between survival or humanity". [R]
  ([PC Gamer](https://www.pcgamer.com/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws);
  [Wikipedia](https://en.wikipedia.org/wiki/Frostpunk))
- A plain multiplicative choice "is the worst, and what you should avoid. Remember that numbers are not funny". [S]
  ([thread 1utmy54](https://www.reddit.com/r/incremental_games/comments/1utmy54/))

**Counter-view.** A real share of players do not want choices: "just lemme have all the upgrades I want number to go up
if I wanted to think I'd open up a textbook" (27 points) [S] (thread 1utmy54). Hevipelle admits AD's opening has no
choice at all. Designs that make choices optional for progress but valuable for speed serve both groups.

---

## 8. Active against idle, and offline progress

**Principle.** Let both styles progress. Active play should be *better per minute*, idle play *better per hour of the
player's life*, and neither mandatory. Offline progress should be computed faithfully, capped generously, and summarised.

**Evidence and numbers.**

- AdVenture Capitalist made offline progress "a standard on most games of this type" (Pecorella). [S]
  ([Game Developer](https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play))
- Pecorella (2016) asked "why punish offline play?" and suggested computing offline the same as online, or letting
  exponential cost act as the soft limit. [R] (search summary of Idle Chatter)
- Egg, Inc. caps offline at **2 h**, deliberately nudging active play. [S] (Part III)
- Community, 2026: "I love the option to turn off offline gains … I like games like Rev Idle where you can simulate gains
  at your own pace" (banked time). Complaints about progress that *requires* overnight waits after an hour. A developer
  describes offline upgradeable to **52 h**, "calculated as if the game had been running the whole time", plus a bonus
  that applies only when the player is *not* doing manual actions. [S/R]
  ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/);
  [thread 1vbkhtp](https://www.reddit.com/r/incremental_games/comments/1vbkhtp/); itch.io devlog via search)
- Caps seen in practice: 2 h (Egg, Inc.) [S]; 12 h in an early Melvor Idle version [R]
  ([Melvor wiki v0.16.2](https://wiki.melvoridle.com/w/V0.16.2)); 24 h is the commonest cap in community discussion [R].
- CIFI: "After 2-3 days you're not really making new decisions … you're literally just waiting for that battery to fill
  up." [S] ([thread 1w8la69](https://www.reddit.com/r/incremental_games/comments/1w8la69/))

**Counter-view.** Some designers reject idle altogether and note the genre's drift towards active incrementals [R]
(itch.io devlog "Active or idle?"). Mandatory clicking is the oldest complaint: "I don't want to click a million times on
the same button" [S].

---

## 9. Automation as the reward

**Principle.** The best reward for mastering a layer is never having to do it by hand again. Automation should arrive
just as the manual task stops being interesting, and should be earned, not bought.

**Evidence.**

- Antimatter Dimensions: completing challenges awards autobuyers for dimensions, boosts, galaxies, tickspeed, Big Crunch
  and Sacrifice; Reality adds a scriptable automator. [R]
  ([AD wiki](https://antimatter-dimensions.fandom.com/wiki/User_blog:Bubby3/The_History_of_Antimatter_Dimensions))
- Hevipelle took automation from Transport Defender and pushed it further. [S]
  ([interview](https://www.incrementaldb.com/community/interview/31))
- Players: "The thing i hate the most is locking quality of life and automation stuff behind challenges that have to be
  repeated on higher reset layers." [S] ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/))
- AD reviewers: "excessive waiting times and lacks proper automation" is a common complaint. [R]
  ([Vaporlens summary](https://vaporlens.app/app/1399720/antimatter_dimensions))

**Counter-view.** Automation that removes all decisions empties the game; the decisions must move up a level, not
disappear.

---

## 10. Quality of life veterans expect

**Principle.** Long-game players judge a game in its first hour by its QoL. Missing basics read as "this developer has
not played the genre".

**The list** (sources: Pecorella's buy-max maths [S]; community threads above [S]; the rest **[U]**, from the genre's
conventions in Antimatter Dimensions, Kittens Game, Cookie Clicker, Trimps, NGU Idle, Melvor Idle):

- Buy 1 / 10 / 100 / max, and "buy max" on everything repeatable; hold-to-buy on touch.
- An "affordable" indicator visible from the main screen, including on collapsed panels and other tabs.
- Hotkeys on desktop; thumb-reach controls on phone.
- Number notation choice (standard suffixes, scientific, engineering); AD's notation library exists precisely because
  players asked for many [R] ([Eternal Notations](https://mathcookie17.github.io/Eternal-Notations)).
- Confirmations on irreversible acts (reset, fork, hard reset), with an option to turn routine ones off.
- Save export/import as text (and file), autosave, a visible "saved" marker, multiple save slots or a backup on reset.
- No account, no server, works offline.
- Statistics: lifetime and per-run, best runs, time played.
- An offline summary ("while you were away"), and a run summary at each reset.
- Settings for animation and update rate; performance that holds over a session of many hours.
- Correct behaviour in a background tab (catch up from wall-clock time, not timers).
- A hard reset that takes two deliberate steps.
- An in-game glossary or help that explains every number (Kittens Game, Trimps and AD all have in-game help; players hate
  having to go to Discord: "the only way to access the guide is to join the devs discord server" [S]).

---

## 11. Number feel and feedback

**Principle.** Big numbers are not funny on their own any more (Pecorella: "the appeal of big numbers alone has faded";
find the core fun, such as unlocking features or optimising the loop [S], Part III). Feedback should mark *changes of
state*, not every tick.

**Evidence.**

- Cookie Clicker's humour escalates through absurd generator tiers and a news ticker that comments on the player's world.
  [S] ([Game Developer](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker))
- Paperclips is silent for hours ("there's no sound at all, it's just you clicking"), so its one piece of music, late,
  lands hard; Lantz even rewrote the displayed count near the end "so the final slowdown looks right". [S]
  ([YC transcript](https://ycombinator.com/blog/frank-lantz-director-of-nyus-game-center-and-creator-of-universal-paperclips);
  [IF50](https://if50.substack.com/p/2017-universal-paperclips);
  [Medium: silent until about 5 hours in](https://medium.com/the-strange-games-review/universal-paperclips-is-a-silent-game-until-about-5-hours-in-67412299de26))
- A Dark Room: the screen dims as the fire dies, which doubles as a reminder to tend (and save). [S]
  ([PocketGamer.biz](https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/))

**Counter-view.** Players are split on minimal against busy presentation ("minimalistic graphics" and "cluttered,
confusing UI" both appear as hates in one thread [S]). Restraint in juice suits a dry tone.

---

## 12. Achievements, challenges, run modifiers

**Principle.** Achievements steer experimentation and give completionists a log; challenges and modifiers make known
content new; both work best when they reward with *new options* rather than bigger multipliers, and when they do not
require a guide.

**Evidence.**

- Cookie Clicker's achievements include very hard ones for dedicated players, and a "cheated" achievement that brands the
  player a fraud, which makes the honest ones worth more. [S]
  ([Game Developer](https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker))
- Evolve's challenge genes: optional debuffs (no manual trade, no manual craft) chosen at the reset, up to four, each
  completed achievement under them earning "mastery", a permanent income bonus. [R]
  ([Evolve FAQ via search](https://pmotschmann.github.io/Evolve/wiki.html))
- Realm Grinder: challenges from the second reincarnation, with faction-specific perks. [R]
  ([PC Gamer guide](https://www.pcgamer.com/au/realm-grinder-guide))
- Against: "everytime I see a 'Challenges unlocked' … I know I will just go to a guide … Problem comes up if after
  challenges just come infinity challenges, and eternity challenges, and ultra challenges … Thats when the game then
  permanently loses me." [S] ([thread 1uytrlm](https://www.reddit.com/r/incremental_games/comments/1uytrlm/))
- Players like "achievements or games with completionist logs". [S] (same thread)

---

## 13. Finite or endless, and how good incrementals end

**Principle.** The most admired incrementals end. An ending gives the run a shape, lets the theme land, and frees the
designer from inventing filler. Endless games need a post-game that is honest about being optional.

**Evidence.**

- Spaceplan runs five to six hours; its maker "hates clicker games with endless play" and refused to extend it. [R]
  ([Goodreads blog repost](https://www.goodreads.com/author_blog_posts/13771465-spaceplan-gives-you-a-delicate-view-of-the-universe?tab=book))
  Reviewers praised the ending and criticised the length. [R]
- Universal Paperclips has "a very definitive conclusion" [S] ([IF50](https://if50.substack.com/p/2017-universal-paperclips));
  450,000 people played in the first 11 days, "most to completion" [R]
  ([Wikipedia](https://en.wikipedia.org/wiki/Universal_Paperclips)). Its ending turns the game's own system on itself: you
  dismantle your infrastructure until only the first button remains. [S]
  ([Vice](https://www.vice.com/en/article/universal-paperclips-depth-desire))
- Hevipelle chose a definitive end for Antimatter Dimensions so as not to "force content that would end up being like
  time dilation". [S] ([interview](https://www.incrementaldb.com/community/interview/31))
- Orteil: "I don't think I'm very good with endings"; an "endless design space" is convenient. [S]
  ([Vice](https://www.vice.com/en/article/cookie-clicker-wasnt-meant-to-be-fun-why-is-it-so-popular-8-years-later))
- Synergism: "I played that game for 4+ years because [the developer] promised an ending, often doing nothing but daily
  in-game chores for months … Then … 'no ending'". [S]
  ([thread 1w8la69](https://www.reddit.com/r/incremental_games/comments/1w8la69/))
- Pedercini on the McDonald's Videogame's lack of a goal: "in the reality of capitalism, there are no final goals" —
  and players were disappointed. [S]
  ([Game Developer](https://www.gamedeveloper.com/design/hot-off-the-grill-la-molleindustria-s-paolo-pedercini-on-i-the-mcdonald-s-video-game-i-))

**Lengths [U].** Paperclips about 6–12 h depending on idling (Lantz: "You play this game for like six hours" [S]);
A Dark Room 2–5 h; Candy Box 2 5–10 h; Spaceplan 5–6 h [R]; Antimatter Dimensions several hundred hours to the end of
Reality; Kittens Game effectively endless.

---

## 14. Narrative and tone

**Principle.** Incrementals tell stories through interface and numbers: what appears, what the counters are called, what
the news says. Text should be short, sparse and earned.

**Evidence.**

- Paperclips: narrative is minimal; meaning emerges from numbers, interface changes and pacing. The destruction of
  civilisations is never shown, only counted, which keeps the player's complicity abstract and easy to overlook. [S]
  ([Vice](https://www.vice.com/en/article/universal-paperclips-depth-desire))
- A Dark Room: text-only is "a wonderful constraint" (Rajan); darker moments hit harder because the player supplies the
  imagery; a story reason for death made retries meaningful. [S]
  ([PocketGamer.biz](https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/))
- Cookie Clicker's news ticker is the template for "the world reacts to your numbers". [S] (Game Developer)
- Lantz built mechanics first and found the theme second: "As soon as I thought of it, it was like, 'Oh yeah, this is a
  perfect fit.'" [S] (YC transcript)

---

## 15. Content cadence and filler over 100+ hours

**Principle.** Long games die of repetition without new decisions: chores, focused runs for weeks, waiting for a
battery, a layer that repeats the previous one faster.

**Evidence.**

- Hevipelle's regret about Time Dilation, "especially just prior to first reality"; he reworked the last Celestial three
  times. [S] ([interview](https://www.incrementaldb.com/community/interview/31))
- "I personally just don't like when I have to make some 'focused' runs. It's just something that starts fun, but do it
  for weeks and now you just ask 'when the fuck does that end???'" [S]
  ([thread 1utmy54](https://www.reddit.com/r/incremental_games/comments/1utmy54/))
- Synergism's daily chores between updates; CIFI's multi-week waits; Ouro's "3 weeks of literally not playing is
  strictly better … than 3 months of actively playing". [S]
  ([thread 1w8la69](https://www.reddit.com/r/incremental_games/comments/1w8la69/))
- Kittens Game's community rule: design things to be difficult at first and fix them with later upgrades; "never, ever
  nerf anything". [R] (search summary of the community developer guidelines)
- Kittens Game: "I started playing 10 years ago and never got bored." [S] (thread 1w8la69)

---

## 16. Phone and browser

**Principle.** A browser incremental on a phone lives in short sessions, in a tab the OS will freeze, with storage the
browser may delete. All three must be designed for.

**Evidence and numbers.**

- **Timers in background tabs.** Chrome (from M87) throttles timer wake-ups in pages hidden for 5 minutes to **once per
  minute**; earlier background timers ran about once a second; Safari aligns timers to about 40 s. [R]
  ([Chromium blog](https://blog.chromium.org/2020/11/tab-throttling-and-more-performance.html)) Games must compute
  progress from wall-clock time on `visibilitychange`, never from accumulated timer ticks.
- **Storage eviction on Safari.** Since Safari 13.1 (2020), script-writable storage (localStorage, IndexedDB) is deleted
  after **7 days of Safari use without interaction with the site**; web apps added to the Home Screen have their own
  day counter that resets on use. [R]
  ([WebKit blog](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/);
  [Ionic summary](https://ionic.io/blog/is-apple-trying-to-kill-pwas)) Since Safari 17, `navigator.storage.persist()`
  exists and WebKit grants it by heuristics such as Home Screen installation; persistent origins are exempt from
  eviction. Bug reports say it often returns false in a browser tab. [R]
  ([WebKit storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/);
  [bug 271401](https://bugs.webkit.org/show_bug.cgi?id=271401))
  **Consequence:** an iPhone player who stops for a week can lose a long save. Export, a Home Screen nudge, and
  `persist()` are the defences.
- **Session length.** Idle sessions "up to 8 minutes" (GameAnalytics). [R]
- **Battery.** Chrome's throttling exists because background JavaScript costs battery; a game that ticks at 10 Hz with
  canvas redraws while visible should drop to a low rate when nothing on screen changes. [U]
- **One-handed play.** Thumb-zone controls at the bottom; nothing important behind hover. [U]

---

## 17. Accessibility

**Principle.** Text-heavy incrementals are naturally accessible if built from real text and buttons, and easily made
inaccessible by colour-only signalling and constant motion.

**Evidence.**

- Game Accessibility Guidelines (basic tier): no essential information by colour alone (add a symbol or offer colours);
  an easily readable default font size; high contrast; avoid flicker and repetitive patterns; intermediate adds choice of
  text colour and contrast. [R] ([GAG basic](https://gameaccessibilityguidelines.com/basic/))
- A Dark Room's text-only design made it accessible to blind players, which Rajan says mattered to him. [S]
  ([PocketGamer.biz](https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/))

**For a game whose central signal is red against green** (the projection line, backfire), colour-only is a real risk:
roughly 8% of men have a red–green colour vision deficiency [U].

---

## 18. Why players quit, by hour

Synthesis of the evidence above, plus [U] lore.

| When | Commonest reasons |
|---|---|
| Minutes 0–5 | Nothing to do or nothing happens; first purchase slow; unclear what the numbers mean (A Dark Room's fire; GameAnalytics' 5–15 min). |
| Hour 1 | First timewall ("after an hour or so … a wall that can only be overcome through leaving the game idle"); no new mechanic since the opening; mandatory clicking. |
| Hour 1–3 | The first reset feels like loss or is too small; the second run is the first run again. |
| Hour 10 | Choices revealed as fake (one right answer); a new layer that is the old one faster; QoL or automation withheld; "a billion things at once". |
| Hour 50 | Guide-slop (one correct build); challenges stacked on challenges; chores and focused runs for weeks; waiting with no decisions; broken promises about an ending. |
| Any | Lost save; performance decay in long sessions; offline progress that punishes. |

---

## 19. Games that make an argument: what worked, what preached

**Principle.** A game argues best through its rules (procedural rhetoric), by letting the player act on a model and see
the consequences, ideally after committing to a guess. It preaches when the verdict arrives as text that ignores how the
player actually played, or when the "right" play is so punishing that only the lesson remains.

**Evidence.**

- Ian Bogost, *Persuasive Games* (2007): procedural rhetoric is "the art of persuasion through rule-based representations
  and interactions"; games invite players to test a model and judge it. He also analyses persuasive games that failed,
  including his own. [R] ([MIT Press / PRH](https://www.penguinrandomhouse.com/books/654753/persuasive-games-by-ian-bogost/);
  [review](https://rhizomes.net/issue19/reviews/zhang.html))
- Paolo Pedercini (Molleindustria), McDonald's Videogame: corruption is balanced in so that "Playing fair is not
  sufficient to satisfy the board of directors"; "A procedural critique can only show an interpretation of how some
  processes are linked to some others." [S]
  ([Game Developer](https://www.gamedeveloper.com/design/hot-off-the-grill-la-molleindustria-s-paolo-pedercini-on-i-the-mcdonald-s-video-game-i-))
- Universal Paperclips is the genre's own proof: the player *is* the maximiser, the hook is the argument, and Lantz wants
  you to "fall into it" and then "lean back from it". The game never tells you what to think. [S]
- Nicky Case's explorable patterns: **"Place your bets"** — make the reader commit to a guess, then show the result, "but
  only after they've wrestled with the *question*"; **sandbox at the end**, a "kiddy pool" first; lectures are "the
  pedagogical equivalent of bloodletting" (quoting Carl Wieman). [S]
  ([Nicky Case](https://blog.ncase.me/explorable-explanations-4-more-design-patterns/))
- Frostpunk: the laws make the player weigh survival against humanity; many players who never meant to end up
  authoritarian. The ending's "was it worth it?" verdict split players: some took it as a fair mirror, others as a
  reductive judgement that flattened how they played ("for the ending result to boil down to just a couple of choices
  while disregarding the rest is kinda lame"). [R]
  ([Medium essay](https://medium.com/@dan_nailed/the-morality-of-frostpunk-8b810af8f1fb);
  [Steam discussion](https://steamcommunity.com/app/323190/discussions/0/1696045708654961998))
- Fate of the World (Red Redemption, 2011; climate model by Myles Allen's Oxford group): praised for credible science,
  scored 61/100 by PC Gamer as "well-intentioned and beautiful, but … small, hard and depressing"; its expansion "an
  opaque and cruel game". [R] ([PC Gamer](https://www.pcgamer.com/fate-of-the-world-review);
  [Wikipedia](https://en.wikipedia.org/wiki/Fate_of_the_World)) The lesson: honest difficulty without readable feedback
  reads as despair.
- Daybreak (Leacock and Menapace, 2023): fun first, informative second, "kind of like two competing positive feedback
  loops"; hopeful framing, criticised by some as over-optimistic. [R]
  ([Wikipedia](https://en.wikipedia.org/wiki/Daybreak_(board_game)); [WBUR](https://www.wbur.org/hereandnow/2024/05/02/daybreak-board-game-climate-change))
- Terra Nil (Free Lives): a reverse city-builder that critiques "numbers go up" builders; the team wanted "to avoid
  pushing [players] further into apathy or resignation". [R]
  ([Science Friday](https://www.sciencefriday.com/articles/terra-nil-video-game-climate-change/))
- Half-Earth Socialism (2022): Very Positive on Steam; praised because "most decisions have both positive and negative
  outcomes"; criticised by some players for political bias and repetition. [R]
  ([Steam](https://store.steampowered.com/app/2071530); [Vaporlens](https://vaporlens.app/app/2071530/half_earth_socialism))
- Factorio: pollution drives biter attacks; efficiency modules shrink the cloud, but players report it can be "simpler to
  pay the biter tax" with cheap turrets. When suppressing the consequence is cheaper than reducing the cause, players
  suppress. [R] ([Factorio forums, FFF #286](https://forums.factorio.com/viewtopic.php?p=415242);
  [wiki](https://wiki.factorio.com/pollution))

**Lessons for a message incremental (synthesis).**

1. **Let the system speak; keep the narrator dry.** Paperclips and Pedercini argue through balance; Frostpunk's one
   textual verdict is its most criticised moment.
2. **Let the player be wrong first, and make the wrongness fun.** Case's "place your bets" is the reveal: the player
   *predicts* the efficiency card will cut use, then watches it rise.
3. **Make restraint an optimisation problem, not a tax.** The genre's instinct is to maximise; point it at a different
   quantity (wellbeing per ton, years within a budget) rather than asking the player to stop maximising.
4. **Never let suppression be cheaper than cause** (Factorio). If a crisis can be bought off, players will buy it off.
5. **Hope needs a mechanical path.** Fate of the World shows that a correct but near-unwinnable model reads as despair;
   Daybreak and Terra Nil show that a reachable good state keeps players in.
6. **Never moralise about the player's own play in an ending.** Reflect it back as data (a ledger), not a verdict.

---

## Sources

Read in this session ([S] above):

- Pecorella, *The Math of Idle Games* I–III: https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i ·
  https://www.gamedeveloper.com/disciplines/the-math-of-idle-games-part-ii ·
  https://www.gamedeveloper.com/design/the-math-of-idle-games-part-iii
- Parkin, report of Pecorella's GDC 2015 talk: https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play
- GDC Vault abstracts: https://gdcvault.com/play/1023208/Idle-Chatter-What-We-Can · https://www.gdcvault.com/play/1023863
- Frank Lantz on the Y Combinator podcast: https://ycombinator.com/blog/frank-lantz-director-of-nyus-game-center-and-creator-of-universal-paperclips
- IF50 on Universal Paperclips: https://if50.substack.com/p/2017-universal-paperclips
- Vice on Universal Paperclips: https://www.vice.com/en/article/universal-paperclips-depth-desire
- Vice on Cookie Clicker (Orteil): https://www.vice.com/en/article/cookie-clicker-wasnt-meant-to-be-fun-why-is-it-so-popular-8-years-later
- Van der Kraan, *The Recipe Behind Cookie Clicker*: https://www.gamedeveloper.com/design/the-recipe-behind-cookie-clicker
- Hevipelle interview: https://www.incrementaldb.com/community/interview/31
- A Dark Room (Rajan), PocketGamer.biz: https://www.pocketgamer.biz/shedding-light-the-making-of-a-dark-room/
- Pedercini interview: https://www.gamedeveloper.com/design/hot-off-the-grill-la-molleindustria-s-paolo-pedercini-on-i-the-mcdonald-s-video-game-i-
- Nicky Case, design patterns: https://blog.ncase.me/explorable-explanations-4-more-design-patterns/
- r/incremental_games threads (2026, via Arctic Shift): https://www.reddit.com/r/incremental_games/comments/1w8la69/ ·
  https://www.reddit.com/r/incremental_games/comments/1uytrlm/ · https://www.reddit.com/r/incremental_games/comments/1utmy54/ ·
  https://www.reddit.com/r/incremental_games/comments/1vbkhtp/

Reported second-hand ([R] above):

- Candy Box: https://kotaku.com/candy-box-a-game-thats-simple-sweet-and-strangely-c-492318079 · https://www.pcgamer.com/candy-box-1/
- Cookie Clicker prestige wiki: https://cookieclicker.wiki.gg/wiki/Prestige
- Antimatter Dimensions history: https://antimatter-dimensions.fandom.com/wiki/User_blog:Bubby3/The_History_of_Antimatter_Dimensions ·
  reviews summary https://vaporlens.app/app/1399720/antimatter_dimensions
- Evolve wiki: https://pmotschmann.github.io/Evolve/wiki.html
- Realm Grinder guide: https://www.pcgamer.com/au/realm-grinder-guide
- Spaceplan: https://www.goodreads.com/author_blog_posts/13771465-spaceplan-gives-you-a-delicate-view-of-the-universe?tab=book ·
  https://en.wikipedia.org/wiki/Spaceplan
- Universal Paperclips: https://en.wikipedia.org/wiki/Universal_Paperclips ·
  https://medium.com/the-strange-games-review/universal-paperclips-is-a-silent-game-until-about-5-hours-in-67412299de26
- Melvor Idle v0.16.2 notes: https://wiki.melvoridle.com/w/V0.16.2
- Eternal Notations: https://mathcookie17.github.io/Eternal-Notations
- GameAnalytics idle benchmarks: https://gameworldobserver.com/2020/12/22/gameanalytics-names-benchmark-engagement-metrics-idle-games ·
  https://www.gameanalytics.com/blog/how-to-keep-players-engaged-and-coming-back-to-your-idle-game
- Chromium tab throttling: https://blog.chromium.org/2020/11/tab-throttling-and-more-performance.html
- WebKit storage: https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ ·
  https://webkit.org/blog/14403/updates-to-storage-policy/ · https://bugs.webkit.org/show_bug.cgi?id=271401 ·
  https://ionic.io/blog/is-apple-trying-to-kill-pwas
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/basic/
- Bogost: https://www.penguinrandomhouse.com/books/654753/persuasive-games-by-ian-bogost/ · https://rhizomes.net/issue19/reviews/zhang.html
- Frostpunk: https://www.pcgamer.com/frostpunk-developers-on-hope-misery-and-the-ultimately-terrifying-book-of-laws ·
  https://en.wikipedia.org/wiki/Frostpunk · https://medium.com/@dan_nailed/the-morality-of-frostpunk-8b810af8f1fb ·
  https://steamcommunity.com/app/323190/discussions/0/1696045708654961998
- Fate of the World: https://www.pcgamer.com/fate-of-the-world-review · https://en.wikipedia.org/wiki/Fate_of_the_World
- Daybreak: https://en.wikipedia.org/wiki/Daybreak_(board_game) · https://www.wbur.org/hereandnow/2024/05/02/daybreak-board-game-climate-change
- Terra Nil: https://www.sciencefriday.com/articles/terra-nil-video-game-climate-change/
- Half-Earth Socialism: https://store.steampowered.com/app/2071530 · https://vaporlens.app/app/2071530/half_earth_socialism
- Factorio: https://forums.factorio.com/viewtopic.php?p=415242 · https://wiki.factorio.com/pollution
- Unnamed Space Idle discussion: https://steamcommunity.com/app/2471100/discussions/0/4352239720874146657

Could not be read this session (blocked or not rendered): Pecorella's slides
(https://www.slideshare.net/slideshow/quest-for-progress-gdc-europe-2016/65405507 and the Idle Chatter deck), the GDC
Vault videos, Alexander King's *Numbers Getting Bigger* series on Tuts+
(https://code.tutsplus.com/numbers-getting-bigger-the-design-and-math-of-incremental-games--cms-24023a; only search
snippets), the CMU close reading of Kittens Game, the Eludamos paper on idle games, Reddit directly, and the
r/incremental_games wiki. No primary source was found for bloodrizer (Kittens Game), the Trimps, NGU Idle, Synergism,
Melvor, Orb of Creation, Increlution or Magic Research developers; claims about those games are marked [R] or [U].
