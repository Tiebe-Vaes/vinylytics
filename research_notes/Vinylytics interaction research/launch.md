# Launch page interactions

## What earns the first click?

### Takeaway

Show a finished sleeve while the visitor decides whether to continue. Make the control that changes the sleeve and the link that begins setup recognizable at a glance. These are testable choices for Vinylytics.

### Cited Findings

- The local hero offers two GitHub exits. The primary Get started link goes directly to the README recap setup anchor. The secondary button goes to the repository root, also linked from the header. The first screen in the tour is Shelf. Cards appears fifth. [Launch page](C:/Users/tiebe/dev/vinylytics-site/app/page.tsx) · [Tour](C:/Users/tiebe/dev/vinylytics-site/app/screen-tour.tsx)
- In a randomized desktop eyetracking experiment, 71 participants located a target on nine interfaces. Weaker cues for what was clickable increased average search time by 22% and fixations by 25%. The task ended when the participant identified where they would click. This measures findability, not conversion. [Nielsen Norman Group, 2017](https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/)
- Another eyetracking study examined more than 130,000 fixations from 120 people on a 1920×1080 display. The first screen accounted for 57% of viewing time and the first two accounted for 74%. These were desktop attention measures across varied tasks. [Nielsen Norman Group, 2018](https://www.nngroup.com/articles/scrolling-and-attention/)
- A campaign randomized 310,382 visitors across 24 combinations of hero media and button copy. The winning image/button combination yielded an 11.6% signup rate against 8.26% for the original, a difference of 3.34 percentage points. It is a 2007 political campaign measuring email signup, with two design variables. It supports testing a concrete page outcome and cannot establish the best wording, media, or lift for Vinylytics. [Experiment owner's account](https://www.optimizely.com/field-notes/articles/how-obama-raised-60-million-by-running-a-simple-experiment)

### Inferences

- Show a readable finished synthetic sleeve in the first mobile viewport instead of relying on the visitor to infer the result from a full desktop screenshot. Leave a visibly actionable three-ink selector beside it. Name the setup destination “Set up on your computer” or “Open the setup guide”. Existing GitHub header link can serve source-code seekers.
- Compare the baseline and variant with a first-click task: “A friend posted this. Show me what your card could look like. Now find how to make your own.” Record successful tasks, wrong first tap and elapsed time per version. For a traffic test use setup-guide exits per landing session, counting visitors who never use the sample too. Monitor sample interaction separately. An exit can establish intent only.

### Gaps

- No Vinylytics traffic or completion dataset was available in this review. A website experiment cannot demonstrate successful installation from a GitHub exit. Use an observed local install task or voluntary completion feedback to measure actual setup.

## Should the tour auto-advance?

### Takeaway

The first frame needs to tell a complete story. Keeping richer examples selectable can serve visitors who want detail.

### Cited Findings

- Across a period from October 2012 to January 2013, approximately 1% of Notre Dame homepage visitors clicked a featured story, and the first position attracted 84% of 28,928 story clicks. On a different Notre Dame property with automatic advance, 8.8% of homepage visitors clicked a feature and the first position received 40% of feature clicks. Audiences, content and designs differed. Both examples suggest placement matters. They cannot isolate autoplay's effect. Manually rotating a slide was tracked separately from following a story. [Author's instrumentation and results](https://erikrunyon.com/2013/01/carousel-interaction-stats/)
- W3C's carousel pattern calls for a visible stop/start button for a rotating carousel, pausing when focus enters and restarting only upon explicit request. It also describes slide selection and handling announcements while moving. This is accessibility guidance. [W3C ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)
- The local tour advances every five seconds, pauses on focus or hover, respects reduced motion, and resumes after blur or pointer exit. Its buttons choose a screen. There is no dedicated rotation button. It mounts five screenshots that crossfade. The Cards screenshot appears after roughly twenty seconds of uninterrupted autoplay from initial mount. A visitor can select it immediately. [Tour implementation](C:/Users/tiebe/dev/vinylytics-site/app/screen-tour.tsx)

### Inferences

- Show the share card directly in the opening composition. If keeping the secondary tour, test a manual strip of named goals such as “Explore an era”, “See your year” and “Make a card”, with the label above the preview on phones. Selecting a tab changes the screenshot and caption together. Keep the current selected state obvious until the next deliberate action.
- Mobile preview could use a cropped portrait frame for the selected detail. A full desktop screen inside browser chrome is valuable on desktop, harder to read on a phone. Compare on-device legibility with an actual tap task. Distinguish user-selected panels from timer transitions in any observation or counting.

### Gaps

- Notre Dame's figures concern linked editorial carousel items, not screenshot views or clicks on tabs. Clicks understate information obtained simply by looking. Product-page visitors from personal Instagram may behave differently.

## Which hands-on demo is worth trying?

### Takeaway

A small, accurate piece of the product can demonstrate the value immediately: let someone recolor and save a sample sleeve before handling Spotify data.

### Cited Findings

- Navattic's 2026 report sampled roughly 5,000 B2B SaaS sites and found 18% with an interactive-demo CTA. For its own qualifying demos, each had at least 100 unique engaged users and its top cohorts were selected by outbound click-through rate. For the top quartile, 55% of demo viewers got past the first step, 43% of demo viewers finished the first flow, and 29% of already-engaged users clicked an external CTA. That final denominator excludes people who never started. Vendor, B2B, selection and survivorship biases apply. Demos built that year exceeded 40,000, which is not the count of qualified demos in the analysis. [Methodology and figures](https://www.navattic.com/report/state-of-the-interactive-product-demo-2026/)
- Plausible provides side-by-side routes to its live sample dashboard and its trial directly from the hero. Raycast's ray.so opens a code-image utility with export. They show the pattern in use. Neither linked example publishes incremental conversion from the pattern. [Plausible hero](https://plausible.io/) · [Raycast image tool](https://ray.so/) · [Raycast project](https://github.com/raycast/ray-so)

### Inferences

- Adapt ray.so's immediate output and Plausible's separate explore/setup paths: show one finished era card from the existing synthetic history, three pre-rendered ink choices and “Save sample card”. Keep the primary setup link independent. A static first image can demonstrate the product even before any JavaScript is ready. Check image transfer and mobile readability against the existing export.
- To test, count explicit sample interactions / eligible landing sessions, successful sample saves / sample starts, and setup-guide exits / eligible sessions. For low traffic use small moderated tasks first. A rise in recoloring alone could simply mean the demo became an enjoyable distraction.

### Gaps

- Public sources reviewed do not establish incremental installs for giving a sample card to visitors from Instagram. Establish whether mobile visitors want a sample, want setup later on a computer, or simply want to see their friend's listening era through short observed sessions.
