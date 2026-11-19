# Fast landing interactions and satisfying feedback

## Which landing effects deserve the initial download?

### Takeaway

Give a first-time visitor a usable, finished card to look at immediately. A useful trial could use three existing card images and a native selector. The static site already has the assets.

### Cited findings

- Vodafone split paid traffic evenly across two visually and functionally identical landing pages, about 34,000 visits per variant per day. The optimized version improved field LCP from 8.3 s to 5.7 s, generated 8% more sales and increased leads per visit 15%. It changed server rendering, image delivery and JavaScript together. The effect belongs to that package and telecom audience. [Vodafone's experiment and test design](https://web.dev/case-studies/vodafone)
- The five tour images in the latest local working tree total 241,626 bytes (236 KiB) on disk. Shelf is 45,134 bytes. The three separate, existing finished-card assets total 34,570 bytes, including the 10,616-byte era card. Static export uses unoptimized images. Five tour images share a positioned rectangle with opacity switching. These are file measurements and source observations, not field bytes or load times. [Tour](../../../vinylytics-site/app/screen-tour.tsx) · [Media](../../../vinylytics-site/public/media) · [Site config](../../../vinylytics-site/next.config.ts)
- The Chrome team recommends placing initial carousel imagery in HTML, keeping multimedia and script weight modest and using composited transitions. Motion documents transform and opacity as the safest broadly accelerated animation properties. [Carousel performance](https://web.dev/articles/carousel-best-practices) · [Motion performance](https://motion.dev/docs/performance)

### Inferences

- Put the existing era postcard alongside the hero promise. Let a visitor switch between Era, Top artists and Year cards with a direct tap and a quiet fade. Use the three real finished images for this prototype, and leave the full screen tour as deeper evidence. A Base UI tabs demo is a visual reference. No fresh dependency is necessary to run a static trial. [Tabs reference](https://base-ui.com/react/components/tabs)
- Use a mobile crop sized to be readable at arm’s length. Look at the waterfall before deferring the inactive tour images. Keep the first chosen image discoverable in the original HTML, reserve its aspect ratio and compare first cold view, a subsequent selection and bytes received before the first action. 

### Gaps

- The repo files cannot tell us which images were actually downloaded before a particular visitor’s first interaction, which is the LCP element, where a visitor tapped or whether the page converts.

## What makes a card customization feel fast?

### Takeaway

Measure time to first visible response separately from time to a shareable PNG. Those are different waits with different fixes.

### Cited findings

- redBus describes an expensive date-filter interaction and competition for the main thread from background rendering. Local input state, smaller batches and less frequent work improved responsiveness. The team reports 7% overall sales growth after its changes. This is an operator case study and does not document a randomized test. INP covers responsiveness through the next paint and excludes the wait for a subsequent network payload. [redBus research](https://web.dev/case-studies/redbus-inp)
- Current app dynamically loads the composer on click. The composer requests a PNG when options change, aborts obsolete fetches, dims the last image, waits for the new one to decode and guards Save against stale output. Its first-render loader is already a pure-CSS record and tonearm with reduced-motion handling. [Share button](../../src/components/sleeve/share-button.tsx) · [Composer](../../src/components/sleeve/card-composer.tsx) · [Vinyl loader](../../src/components/vinyl-loader.tsx)
- Standard web quality targets at the 75th percentile of real visits, split mobile/desktop, are LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1. [Web Vitals](https://web.dev/articles/vitals)

### Inferences

- Test the first Share tap on a cold phone, then a rapid series of ink changes on a warm dialog. Record tap → first visual acknowledgment, last choice → final decoded file, render-request count and successful file saves. If the initial JS import is the wait, show a lightweight dialog shell immediately. If changes trigger costly unused PNGs, paint the control on selection and coalesce multiple rapid changes into the final render. Keep the stale-file gate.
- Link each shortened wait to completed share handoffs or downloads. For privacy, a moderated synthetic task can supply timings without collecting private listening histories.

### Gaps

- We have a code-level candidate, not proof of a cold-open delay. A library can satisfy INP while waiting seconds for a PNG. No on-device field timings or control-group result was available.

## What evidence supports a satisfying import?

### Takeaway

Use a genuine work unit when available and tell people when they can leave. The existing import already has both ideas. The worthwhile next test is the transition into the first useful result.

### Cited findings

- In Harrison et al.’s 2007 lab study, 22 participants compared equal 5.5-second waits. Late pauses felt slower. The follow-up 2010 study found a specific backward-moving, decelerating ribbed progress treatment reduced perceived duration by about 11% in its comparison. This measures perceived time on short watched bars. [First experiment](https://chrisharrison.net/projects/progressbars/ProgBarHarrison.pdf) · [Follow-up experiment](https://chrisharrison.net/projects/progressbars2/ProgressBarsHarrison.pdf)
- Current import uses reading/unpacking/preparing states without a known fraction, then saved/total based on acknowledged work. The dock resumes on reload once the queue is staged. Completion already announces saved plays, states that art fills in later, and refreshes the app. [Progress model](../../src/lib/spotify/import-runner.ts) · [Persistent dock](../../src/components/music/import-dock.tsx)

### Inferences

- Try a compact completion receipt with the actual new-play count and one action such as “See my shelf.” For a replay with zero new plays, acknowledge that the library was up to date. Keep unknown work indeterminate and the existing truthful fraction. Count first-import → first opened era or recap, plus time to see it. Distinguish duplicates or an empty result from first activation. A label, numeric amount and a stable track are sufficient. [Base UI progress demo](https://base-ui.com/react/components/progress)

### Gaps

- The lab research does not measure archive-import completion or clicks, or establish that a ribbed bar would help this app. A completion link is a product hypothesis, not a measured uplift.
