# Listening interactions worth sharing

## What do listeners actually share?

### Takeaway
People have demonstrably shared retrospective results at scale. Content choices matter. No comparable experiment identifies a winning button style, animation or Vinylytics-specific click-through rate.

### Cited Findings
- Spotify reported over 300 million engaged users and over 630 million social shares for its full 2025 Wrapped campaign, across 56 languages. Shares count events, and the reporting supplies no eligible-impression denominator or split by slide. [Spotify Q4 2025](https://newsroom.spotify.com/2026-02-10/spotify-q4-2025-earnings/)
- Duolingo says its top decile of 2020 XP earners produced over half of all Year-in-Review shares. Highlighting XP percentile in 2021 increased overall sharing. A subsequent second share opportunity for a learner-style personality also raised share rates. The company gives direction but omits effect sizes, randomization details and per-user conversion. [Duolingo product team](https://blog.duolingo.com/year-in-review-behind-the-scenes/)
- Spotify's separate 2026 all-time retrospective reached almost 100 million engaged people in its first six days. Its artifacts included the first song streamed, an early listening day and an all-time ranking. The figure pertains to the whole anniversary experience. [Spotify Q2 2026](https://newsroom.spotify.com/2026-08-04/spotify-q2-2026-earnings/) · [Product and sample cards](https://newsroom.spotify.com/2026-05-12/spotify-20-personal-music-retrospective/)
- Valiati, Lupinacci and Soares combined X/Twitter network analysis with 38 interviews with Brazilian Spotify users aged 18–33. Interviewees described saving annual screenshots, comparing across years, managing the image they project and using results to start conversations. These are qualitative mechanisms from one population. [Authors’ paper, pp. 9–14](https://eprints.whiterose.ac.uk/id/eprint/240195/)
- Spotify's weekly Listening Stats pairs one distinctive milestone, discovery or fan moment with sharing to people inside or outside Spotify. This documents the component in use. Its public announcement supplies no feature-level conversion figure. [Spotify weekly stats](https://newsroom.spotify.com/2025-11-06/spotify-new-feature-listening-stats/)

### Inferences
- Offer both an achievement and an identifiable personal pattern. Vinylytics has its own material with artist streaks, a listening-time fingerprint and after-midnight listening. Percentiles against all Spotify listeners would require a population dataset the app does not possess.
- Separate intentional saves, native share handoffs and later visits. A save for personal comparison is a plausible success. A native share promise cannot tell you which network received a post.

### Gaps
- No verified public per-component CTR, experiment allocation or platform split for these Spotify experiences. Annual campaigns, social networks and independent self-hosting differ in audience and distribution.

## Where are the strongest new app opportunities?

### Takeaway
The best first test is to make the existing record fingerprint survive all the way from discovery to the exported image. It has an intrinsic connection to the product's identity, and the current code passes different visual data to the export.

### Cited Findings
- The real fingerprint is an SVG made from seven weekday rings and 24 hour segments. The bento renders the grid. The fullscreen slide carries the generic headline “Yours alone”, and the per-slide card route receives artist artwork and a series of daily minutes rather than the weekday/hour grid. [Bento](../../src/components/recap/bento.tsx) · [SVG](../../src/components/recap/fingerprint.tsx) · [Slides](../../src/lib/spotify/recap-slides.ts) · [Export route](../../src/app/api/card/recap/route.ts)
- The Shelf contains a weekly roast and top-three minute counts. The Recap has separate highlights and a user-paced, individually shareable story. The import dock already refreshes and acknowledges new plays after a successful import. [Shelf](../../src/app/(app)/page.tsx) · [Recap story](../../src/components/recap/story.tsx) · [Import dock](../../src/components/music/import-dock.tsx)
- Two controlled Heer–Robertson experiments found that some carefully staged chart transitions improved graphical perception on specified visual tasks. The paper describes potential distraction and time/accuracy trade-offs. It does not report share or click gains. [Original research](https://sites.stat.columbia.edu/gelman/communication/HeerRobertson2007.pdf)

### Inferences
1. **Press your listening fingerprint.** Put one explicit action under the existing record. The exact groove arrangement should appear in the Story preview and PNG, at the same orientation and with a short human-readable observation such as the actual highest-minute weekday/hour. Spend the visual budget on one optional groove reveal. Server-render the final SVG or image and show the finished print immediately for reduced motion. Success is a matching export and more completed exports per fingerprint seen. Test against the existing recap flow.
2. **Side A / Side B year comparison.** Within Recap, offer a two-year comparison of the same artifact. Show last year's record beside this year's, with a clear sentence on the largest shift. On phones, offer two labeled tabs and a text summary that remains visible across both. Use shared normalization if comparing groove intensities and comparable date windows for a partial current year. Pilot only where two comparable periods exist. Test whether a listener can explain what changed in ten seconds. The interview study directly motivates keeping a comparable keepsake.
3. **Turn the weekly roast into a mini sleeve.** Beside the existing “This week” sentence offer “Share this week” opening a ready-made date-stamped card. Let listeners choose a neutral stat or the roast, since the same joke can be funny in a group chat and unappealing on a public Story. Reuse the existing composer. Test who posts, saves or elects to keep the result private.
4. **Reveal the first track in this archive.** After a nonempty initial import, a small archive ticket can display “First play in this export” plus actual local date and track, with a link to its day in History. A repeat import with no new records should avoid presenting a new discovery. Reuse the toast and one direct link before building a new drawer. Measure time from import completion to an interesting detail being opened. The personal retrospective supplies a precedent but no proof of activation lift.
5. **Open the proof behind a statistic.** From an eligible Recap tile such as “On one day you played this track X times”, give the date an obvious “See that day” link. Use the existing date-specific History path and preserve Back. This adds an entry point from the unusual claim to its evidence, alongside the calendar’s existing day drilldown. Prefer a normal link; a drawer is only a later alternative if people repeatedly lose their place.

### Gaps
- The comparative cards and weekly action are proposals. Local tests would need to establish discoverability, time-to-insight, and share or save completion. The inspected source does not establish public deployment or observed user outcomes.

## Which component references are worth looking at?

### Takeaway
Use reference components to evaluate motion and interaction. The most distinctive proposed component is already in the project.

### Cited Findings
- Motion documents shared-element layout transitions and distortions to watch for while morphing. Lookup for moving the same sleeve or groove graphic into an optional preview. [Motion shared-layout examples](https://motion.dev/docs/react-layout-animations)
- Cult UI's Direction Aware Tabs is a concrete reference for a two-period selector. [Cult UI demo](https://www.cult-ui.com/docs/components/direction-aware-tabs)
- Cult UI's Family Drawer demonstrates an in-place panel that changes view and height, and identifies Vaul and Motion dependencies. Borrow the interaction only if a phone user needs to keep context. [Cult UI Family Drawer](https://www.cult-ui.com/docs/components/family-drawer)
- React Bits Pro's Comparison Slider is a live, explicitly paid-reference before/after image demo. It is useful for seeing a reveal, but obscures part of each image, so persistent labels and a no-drag alternative are important for comparing data. [React Bits comparison slider](https://pro.reactbits.dev/docs/components/comparison-slider)

### Inferences
- For a year comparison, prefer two visible synthetic record examples at desktop widths. On mobile, a tab or explicit button works without dragging and allows persistent numerical annotations. Test against a static side-by-side baseline.
- A suggested subjective taste check is to show Tiebe and listeners two PNGs using the same synthetic history, generic stat and genuine fingerprint, then separately ask which they would save, send in a DM, or put on their public Story. Record the audience size and allow “neither.”

### Gaps
- These demo pages show mechanics. They do not report clicks, mobile frame times, or evidence that adding their dependencies improves a product. No registry install is needed to run a taste test.
