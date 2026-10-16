# nickjohnston.ca

Personal portfolio site for Nick Johnston, brand identity designer (Diver Studio).
Static HTML/CSS/JS. No framework, no build step. Open index.html in a browser to view.

## Structure

- Pages are single HTML files at the root. index.html (Work), info.html,
  and contact.html are complete. archive.html's Design view and Logos
  view (4-up card grid) are both built; the views swap via
  body[data-view]. Design itself has TWO layouts, vertical (an
  editorial scroll, the default) and horizontal (the infinite
  carousel), which swap via html[data-layout].
- There is no logos.html: the old Logos and Archive pages are one archive.html
  with two filtered views, Design (default) and Logos (?view=logos). The nav's
  Archive item carries a [ Design / Logos ] sub-nav (.nav-sub) that reveals on
  hover/focus and is pinned open on the archive page (li.is-current). Switching
  views swaps the intro copy in place (no reload, history.replaceState) and
  replays the intro char sweep; see the archive block in main.js.
- 404.html (reference/404.png) is the not-found page, which Vercel serves
  for ANY missing URL at any depth; it carries <base href="/"> so its
  relative URLs resolve from the site root wherever the visitor landed.
  One centred screen with the shared footer but no nav (the footer is not
  in the mock; added per Nick 2026-10-13): three pills (View my
  work / Learn more about me / Say hello) are the navigation. The 404 is
  ABC Otto 193px with font-variant-numeric: lining-nums (Otto's default
  figures are old-style, the 4s hang below the baseline), giving the
  mock's 140px-tall figures; copy is Otto 22/27; pills are .nf-pill (37px
  tall, 17px padding, 11px gaps, Otto 14px, --surface, --surface-hover on
  hover, shared .roll at --roll-h 20px, tick + press sounds). The group
  (top of the figures to the foot of the pills) is centred on the
  VIEWPORT, not on the space above the footer, per Nick 2026-10-13; the
  mock had it ~40px low, with the numerals near the middle. .nf-main's
  87px top padding does it: bottom 40 + 73 footer - 26 of empty line box
  above the figures. Re-derive it if any of those three change. Load reveal: the 404 takes the intro's
  char sweep, but SCALED, because three chars at the intro's 14ms/0.8s
  land as one ~0.3s fade that reads as no animation at all (Nick's first
  reaction): splitReveal's optional stagger/duration args give each digit
  its own 160ms beat from 250ms over 1.4s, and .nf-code .reveal-char
  starts from a 24px blur and 0.22em rise. Then the copy (1.05s), pills
  (1.25s + 0.13s each) and footer (1.7s) rise in. A sad face is then
  drawn into the 0 LAST (per Nick 2026-10-13), like a marker: left eye
  2.9s, right eye 3.35s (0.32s each, top to bottom), frown 3.95s (0.5s,
  left to right). images/404/eye.svg and mouth.svg are textured filled
  outlines, not strokes, so there is no dash offset to animate: each
  mark is a --fg block masked by its SVG (so it follows the theme) and
  the pen is a clip-path wipe. .nf-face sits OUTSIDE the h1, in the
  .nf-figure wrapper, because the sweep rewrites the h1's contents when
  it settles; it is sized in em off --nf-size (set on .nf-figure, read
  by the numerals too) so it scales with them. These strokes ease
  in-out, the one exception to --ease-graceful. The Browser pane does
  not advance CSS animations; verify this one with real-time headless
  captures. On phones the 404 (and its face) scales at 46vw, the copy's designed
  line break is dropped for text-wrap: balance, and the pills wrap.
- css/styles.css is the one shared stylesheet for all pages.
- js/main.js is the one shared script (carousels, nav reveal, credits, grid overlay).
- js/sounds.js is an ES module layered on top for interaction sounds (cuelume
  0.2.1, Web Audio synthesis, vendored in js/vendor/cuelume/ since there is no
  build step). Per Nick, sounds are deliberately sparse: "tick" on hovering
  nav links, contact links (Connect list + email address), the footer email,
  the footer Settings button and its two toggles, pill CTA buttons, the
  archive layout switch (its ellipsis circle and both pills), and
  accordion rows (info page + home
  Project Info/Credits); "whisper" on hovering the info office-camera button; "press" on clicking nav items, the Settings button,
  the home page CTA pills (info's pill is hover-only), the archive layout
  switch, and accordion rows
  (no "release" half anywhere: page unloads clip it on navigating elements,
  so it made same-page clicks sound different from nav clicks); and "success"
  when an email copy lands (contact page + footer). Nothing else makes
  sound (TICK_VOLUME in sounds.js holds the tick at half loudness). Declarative
  wiring is data-cuelume-* attributes stamped in sounds.js; the two success
  cues play from main.js through the guarded sfx() helper (window.cuelume),
  so the site works with the module missing or blocked. Sound can be turned
  off in the footer settings menu: localStorage "sound" ("off" is the only
  stored deviation), read in sounds.js before bind() and flipped live via
  cuelume setEnabled. The sound toggle's click sound plays from main.js, not
  data-cuelume-press: switching Off must be silent from that very click, and
  switching On only sounds after setEnabled(true). Modules do not load
  over file://, so sounds need the http.server preview. Base volume 0.5.
- fonts/ is ALL LICENSED webfonts as of 2026-10-10; both trials and their
  .otf files are gone. ABC Otto (the serif accent): ABCOtto-*.woff2,
  format('woff2'), four cuts (Light, Light Italic, Regular, Regular
  Italic). Scto Grotesk A (the site sans): SctoGroteskA-*.woff,
  format('woff'), only TWO cuts, Light and Regular, because every italic
  on the site is Otto and an italic sans face would never be asked for.
  Note Scto is .woff, not .woff2, and its files arrived named with spaces
  ("Scto Grotesk A Light.woff"), renamed to the folder's no-space
  convention so the URLs need no escaping. Both licensed families are
  metrically IDENTICAL to the trials they replaced (widths,
  ascent/descent and x-height matched exactly), so every value measured
  off a trial still holds: the Kind Words rule line's 17px, the ellipsis
  pills' 20px roll clip, and --email-italic-trim (still 39.20px dark /
  30.63px light). SuisseIntl-Regular-WebM.woff2 is still in the folder
  but is NO LONGER USED: nothing references it and no page requests it.
  FT Polar Mono stays, for the info camera clock.
- images/ holds project photography, one subfolder per project.
- reference/ holds design exports from Figma. Measure against these, don't eyeball.

## Design system

- Scto Grotesk A (licensed webfonts) is the site sans: everything not set in Otto or
  the mono clock. Like Otto it has a THEME PAIR, --sans-weight /
  --sans-tracking: 300 / -0.01em dark (Light), 400 / -0.02em light
  (Regular), read by body plus the few rules that restate it (buttons,
  settings panel, quote figcaption, .acc-head button, .contact-label). Any
  hardcoded font-weight: 400 on sans text would pin dark mode to Regular,
  so new rules must use the token. body sets font-synthesis: none because
  Scto has no bold.
  The licensed files cover every character the site renders (checked: all
  77 unique characters across the four pages, including the @, ©, [ ], :,
  &, en dash and + that the old trial subset lacked), so the Suisse Intl
  fallback that used to patch those gaps has been dropped from --sans and
  its @font-face removed. --otto now falls back to Scto rather than Suisse.
  Tracking caveat: em letter-spacing computes to px where declared, so
  sans text that only INHERITS body's value gets the 16px figure (-0.16px
  dark / -0.32px light) at every size, not a true -1%/-2% of its own
  size. Rules that restate var(--sans-tracking) are exact.
- ABC Otto (licensed webfonts) is the typographic accent, on: the intro,
  project titles, project taglines (italic), the info page's accordion
  labels (.acc-title, matching the project titles at 22px and rolling to
  the italic on hover like the contact links; the 01-05 numerals beside
  them stay in the sans and hold their right edge, pinned there by the row's
  space-between), the Kind Words testimonials and the why-me paragraph
  at 26/30 with BOTH section headings (Kind Words, Why work with me?) in
  the italic cut at that size, and the contact page's big links (roman at
  rest, italic on the hover roll). The quote figcaption restates
  the sans family, weight AND letter-spacing (it sits inside .quote and
  would otherwise inherit the quote's tracking computed at 26px, far too
  tight at 14px); within it the author NAME alone is Otto per Nick
  (2026-09-30, the usual --otto trio declared on .quote .name so tracking
  computes at 14px), while the role stays Scto. Otto runs lighter and looser on black, so its weight and tracking
  are THEME TOKENS, not per-rule values: --otto-weight / --otto-tracking are
  300 / -0.01em in dark and 400 / -0.02em in light, alongside the --otto
  family stack. Every Otto rule reads that trio (plus font-synthesis: none),
  so the dark/light pair is the only place to retune it. Sizes do not change
  with theme: intro 24/26px, titles and taglines 22px, Kind Words + why-me
  26/30px, contact links 44px. The family/weight/tracking trio is shared by
  one grouped rule near .intro; the SIZES are set per group beside it.
- --surface-hover is the hover/open state for the surface pills
  (the archive layout switch). #2E2E2E dark / #DBDADA light, the
  latter sampled from reference/archive-update.
- Two themes, all colors are tokens on :root in styles.css. The default follows
  the visitor's system setting (prefers-color-scheme), live while they have no
  saved choice; light is [data-theme='light'] on <html>, set pre-paint by an
  inline head script and flipped from the footer settings menu. localStorage
  "theme" holds only a choice that DIFFERS from the system; switching back to
  match it removes the key and hands control back to the system.
- Dark: bg #000, text #fff, muted rgba(255,255,255,0.5),
  surface #1F1F1F (buttons, arrow circles, the Settings pill and its
  toggle tracks, matching the Copy Email pill and secondary CTA),
  placeholder #D9D9D9, toggle knob #3A3A3A (--settings-knob, no shadow;
  no dark mock exists, so it is a judgement call).
- Light (sampled from reference/Layout_Light_02.png): bg #FFF, headline/title/name
  text #000, body copy + credits #222222 (--body), taglines #AEAEAE (--muted),
  Kind Words label, why-me heading and its rule line #BBBBBB (--label; the rule line reads var(--label) directly so it always matches the text; the old --rule token is retired),
  quote roles #808080 (--role), surface #EAEAEA (Settings pill and its
  toggle tracks included), toggle knob #FFF with a soft 0.5/1.5px shadow
  (--settings-knob-shadow), per the 2026-10-15 bubble refs. Placeholder
  stays #D9D9D9 in both themes.
- Nav is theme-independent: literal white + mix-blend-mode difference self-adapts
  over the light bg (white -> black, 50% white -> mid grey). Do not tokenize it.
- ::selection is also theme-independent per Nick: #FFFC38 highlight, black text,
  both modes.
- Easing token: cubic-bezier(0.22, 1, 0.36, 1) (--ease-graceful). Use it for all motion.
  Exceptions: the 404 face's in-out marker strokes, and the footer
  settings toggles' opening spring (the site's only bounce).
- Image surfaces (slides, archive tiles, logo cards, info photo) share
  --radius (6px). Circles (avatars, arrows) are exempt.

## Layout: 12-column grid

- .grid-12 = display grid, repeat(12, 1fr), 20px margins and 20px gutters.
- Press "g" in the browser to toggle the column overlay (dev aid, remove before launch).
- Known placements: Kind Words label col 3; quotes cols 6-10; why-me text cols 6-11;
  CTA buttons start col 6; arrows end on col 12; intro starts col 1. The project
  header is the exception: its columns mirror the carousel (slide-w / slide-w / 1fr)
  so the accordion and its open panel align with slides 1 and 2.
- The carousel deliberately breaks the grid: 450px square slides at 1440 produce a 10px
  peek of the fourth slide. Do not snap slides to exact column spans or the peek disappears.
  At 1920px and up --slides-visible goes 3 -> 4 (peek of the 5th); the 4-up math lands
  slides back at ~452px at 1920 so big screens keep the designed image weight. The
  first-project reveal gains a 4th stagger slot inside that media query.
- Footer (per Footer_Light/Dark refs): one 15px row, email left, Settings
  button page-centered (not grid-placed), copyright right. Social links were
  removed with this layout.
- Footer settings (bubble interaction, Nick's refs 2026-10-15, replacing
  the labelled panel above the pill): the Settings pill (33px tall,
  --surface, 999px ends, label rolls on hover) reads "Done" while open,
  and the Theme and Sound toggles bubble out from BEHIND it, Theme 7px
  to its left, Sound 7px to its right. No visible labels, per Nick (he
  accepted it being slightly less accessible); each input keeps an
  aria-label and the group is role="group" aria-label="Site settings".
  Markup is theme toggle, button, sound toggle as siblings in
  .footer-settings, so Tab runs left to right. Settings and Done are two
  .roll spans in one grid cell (.settings-label), so the pill keeps the
  longer word's width (88px at 1440, as the ref) and the swap rises like
  the roll. Parked toggles sit translated in under the pill (the pill is
  z-index 1), scaled 0.85 and faded; open, they slide out to full size
  (both at once, per Nick: slide + slight scale) on a faint spring,
  cubic-bezier(0.3, 1.4, 0.5, 1) over 0.55s (per Nick 2026-10-16:
  "snappy but fluid", then set to a 3px overshoot): ~3.1px past the slot at 1440,
  settled by ~0.5s. Closing stays 0.6s --ease-graceful.
  Visibility flips after the fade so closed inputs leave the tab order.
  Toggle anatomy (measured off the refs): 55x33 track, 999px ends, on
  --surface; 29px knob inset 2px (--settings-knob #3A3A3A dark / #FFF
  light, light adds --settings-knob-shadow) sliding 22px; checked = knob
  right = dark mode / sound on. The knob holds both state icons as
  inline stroke="currentColor" SVGs (sources in images/settings-icons/):
  sun/moon for Theme, speaker muted/speaker with waves for Sound
  (Speaker-off/-on.svg, drawn by Claude to match the sun/moon stroke,
  then scaled up 17% to ~10.5px tall, the mock's speaker:sun ratio;
  swap for Figma exports if wanted), colored by --fg, showing the
  CURRENT state. On change the knob slides (0.5s --ease-graceful) while
  the outgoing icon shrinks + rotates away and the incoming one lands
  ~0.1s behind. Theme persists to localStorage "theme", sound to "sound".
  Done, outside pointerdown and Escape close it; no auto-close. On
  phones the row has no room for all five, so the email and copyright
  fade out while it is open, via .settings-open on .site-footer set by
  main.js (640px block). NOT :has(): iOS Safari faded the email but left
  the copyright, which follows the pill in the DOM (2026-10-16).

## Type scale (at 1440)

- Intro: ABC Otto 24px / 26px, max-width 465px (holds the designed rag)
- Project titles: ABC Otto 22px, tagline italic in muted on the same line,
  10px after it. That 10px is the WHOLE gap: there is no word space before
  the tagline span in index.html (a space is a glyph, and Otto Light's is
  ~0.4px wider than Regular's, so the gap used to drift between themes).
  A .sr-only ", " stands in for it so the heading still announces
  "Virro, Where waste is never wasted.". On desktop the tagline is inline
  beside the title. On phones the h2 is a wrapping flex row (column-gap
  10px replaces the tagline's margin), so a tagline that will not fit
  beside its title drops WHOLE to its own line rather than wrapping
  mid-phrase, per Nick 2026-10-12 (Jointly and We Who Wander at 393).
  A 4px row-gap opens the stacked pair up; one-line titles have no
  second row, so it does not touch them.
- Body: 16px / 1.36; accordion panel content (Project Info text + credits) 14px
- Info accordion panel leads (.acc-body h3): ABC Otto 20px / 1.3, both
  desktop and phones (22px until Nick dropped it 2026-10-15; the phone
  block's 20px override went with it, having become a no-op)
- Quotes: ABC Otto 26px / 30px; the figcaption is the sans at 14px
  On phones (640px block, per Nick 2026-10-12) the quote text and the
  why-me paragraph are 24/28, the author row sits 26px under its quote
  (36px desktop) and the author name is 16px; the role stays 14px, and
  the two italic headings (Kind Words, Why work with me?) keep 26/30.
- Why-me heading: ABC Otto italic 26px muted; paragraph 26px / 30px
  (the old 22px mobile step is gone, it matches the testimonials now)
- Kind Words label: ABC Otto italic 26px / 30px. Its 80px rule line is
  aligned to the label's x-height CENTRE (17px from the line box top),
  which is what the ::after margin-top measures. It was 0.72em under
  Suisse; re-measure it if that type ever changes again.
- Home CTA pills on phones (per Nick 2026-10-12): side by side, not
  stacked. The pair spans the margins on one nowrap row, 8px gap, 52px
  tall (62px desktop), equal flex-grow giving both the same side padding
  (~21px at 393, 12px floor). At 360px and under they stack full width,
  since both labels need 357px.
- Buttons: 16px; Nav: 14px at a 22px line rhythm (--nav-rhythm on
  .site-nav; it drives both the li line box and the roll clip, which must
  match, so change the token rather than either value). On phones the
  Menu pill label, the menu links and the [ Design / Logos ] sub-nav are
  16px on a 24px --nav-rhythm (overridden in the 640px block), per Nick
  2026-10-12; the pill stays 30px tall with 12px side padding (64px wide).
- Captions: 14px; footer: 15px
  On phones the footer row (email, Settings pill label, copyright) is
  13px so all three fit one line. Its columns are minmax(0, 1fr) auto
  minmax(0, 1fr) there, with the pill's padding trimmed to 14px: plain
  1fr sides let the 128px address push its half wider, so the pill (and
  the toggles hung off it) sat off-centre and MOVED on theme switches,
  since the sans changes weight with the theme. Under 370px equal halves
  cannot hold the address, so a max-width: 369px block goes back to
  1fr auto 1fr (fit beats centring; ~0.6px nudge at 360).
  The footer's "Copied to clipboard" pill sits beside the address on
  desktop; on phones it rises 12px ABOVE it, left-aligned, because
  beside it ran under the centred Settings pill.
- Above 1440px: descriptions cap at 500px; quotes and why-me text cap at 760px,
  left-anchored to their grid columns.

## Interactions

- Carousels: native scroll + snap; arrows page one slide with easeOutQuint ~850ms and
  always land on slide boundaries; mouse drag with momentum settles on nearest slide;
  arrows fade to 30% and disable at the ends. On mobile the arrows are hidden:
  swiping is the navigation, and centred pagination dots below each carousel
  (reference/mobile-project-pagination.png: 8px dots, 18px pitch, in a 24px
  --dots-pill pill, active dot --fg, injected by main.js as .carousel-dots, one
  button per slide) track the position via scrollLeft; tapping a dot glides to
  that image with the arrows' easing (goTo), and each button's ::after pads the
  8px dot out to the full 18px pitch as a tap target. Mobile also widens
  the slide peek to 32px (--peek override) so the next card clearly shows.
- Nav: fixed top-right; hides on scroll down, reveals on scroll up; always visible in
  the top 80px; mix-blend-mode: difference keeps it legible over images.
- Nav links: active page gets full opacity + solid dot; hover shows a 50% dot.
- Text roll hover: shared .roll component (two stacked copies of the label, clipped to
  one line, rolls up on hover/focus). --roll-h sets clip height: 22px nav (via --nav-rhythm), 22px buttons,
  22px the footer Settings button, 22px Credits, 20px the ellipsis switch pills
  (14px Otto; measured, not guessed: Single Column's g descends to 17.3 of the
  20, so there is 2.7px of headroom and nothing clips). Duplicate label is
  aria-hidden. Used on nav links, pill CTAs, the Credits label (the + stays
  outside the roll), the footer Settings button, and the ellipsis switch pills
  (the check stays outside the roll, like Credits' +). Nothing extra is needed to
  wire a new one up: the shared rule keys off button:hover / a:hover, so .vs-pill
  being a <button> is enough. Both copies are identical so the roll adds no width
  (unlike the contact page's roman-to-italic roll, which needs --email-italic-trim).
- Project accordion (work-accordion refs): each project header holds Project Info /
  Credits rows under the title. The header grid is keyed to the carousel geometry
  (columns: slide-w, slide-w, 1fr): accordion in col 1 (50px rows, labels+signs
  --acc-label #D1D1D1, separators --acc-rule #252525; light values provisional),
  open panel content revealed in col 2 above slide 2 (absolute, 0.6s --ease-soft
  fade + 8px rise, no layout shift), arrows col 3. One panel open at a time via
  [data-open] on .project-header; the inactive row's label+sign fade to 0.4
  (separator lines never change state; they are the buttons' borders, so fades
  target .roll and .project-acc-sign, not the button); the plus morphs to minus
  (vertical bar rotates away). Labels use the shared .roll.
  Classes are namespaced .project-acc-* (bare .acc-* belongs to the INFO page
  accordion; the two must not collide). Entries format: "Label:" in muted,
  value in white (e.g. Agency: Diver). The desktop panels are FIXED-HEIGHT
  scroll boxes (max-height 112px, fitting the 131px band above slide 2 at any
  desktop width): long copy scrolls behind a 3px persistent scrollbar instead
  of pushing into the carousel (--acc-scroll thumb; 4px track margin insets
  the bar from the box's ends). The ::-webkit-scrollbar rules are the PRIMARY
  styling because only custom WebKit bars pin visible on macOS; declaring
  standard scrollbar-width/color alongside suppresses them and hands the bar
  back to the auto-hiding overlay, so those live in a Firefox-only @supports
  not selector(::-webkit-scrollbar) block. Panels carry tabindex="0" so
  keyboards can scroll them. On mobile the panels flow below the accordion (grid-rows
  animation) with the height cap and inner scroll reset. A single
  combined disclosure for phones (reference/mobile-new-project-info +
  -open: a plus circle, then a "Details +" pill, opening description and
  credits together) was built and REVERTED the same day, 2026-10-13: it
  felt off to Nick, so the stacked rows stand.
- Lightbox, DESKTOP ONLY (reference/carousel-lightbox.png; per Nick
  2026-10-12 it is off for tablets and phones, where it did not look
  clean; an earlier pass that day removed it everywhere by mistake).
  main.js injects a .slide-zoom loupe (30px white circle, bottom-right,
  images/carousel/loupe.svg) into every project slide and vertical
  archive tile; it fades in on hover, and clicking anywhere on the
  slide/tile opens the viewer: image FLIPs from its thumbnail to centre
  over a blurred 50% black backdrop (0.65s --ease-graceful), left/right
  halves and arrow keys step with the --cursor-*-dark cursors, NN/NN
  counter below, Escape or the top-right close exits and flies it home.
  Carousel slides show square; archive entries carry their own aspect
  (--lb-ar, .lb-fit) and videos play in .lb-video. "Desktop" is ONE
  query, (min-width: 1025px) and (hover: hover) and (pointer: fine):
  lightboxMQ in main.js makes open() decline (and closes an open viewer
  if the window drops below it), and the inverse block at the end of
  the Lightbox section in styles.css hides the loupe and resets the
  pointer cursor. Change both together. The carousel drag defers
  setPointerCapture until movement passes 3px so a tap's click still
  reaches the loupe. The close button is focused on open so the dialog
  owns the keyboard, and Chrome matches :focus-visible on a PROGRAMMATIC
  focus even when the viewer was opened with a mouse, which drew a 1px
  ring around the close circle for everyone (per Nick 2026-10-15). open()
  now takes a viaPointer flag and sets .lb-no-ring on the lightbox, which
  kills the outline; the callers read it off the click's `detail` (0 means
  the click came from the keyboard, Enter/Space on the loupe). Pressing
  Tab removes the class, so a keyboard user still gets the ring, which is
  the dialog's one focus indicator. Do not just delete the
  :focus-visible rule.
- Load reveal choreography (thayon.com-style, home page): (1) intro chars sweep
  in from 150ms (14ms/char stagger, 0.8s each: blur 10px + 10px rise + fade,
  --ease-graceful); (2) nav labels get the same char treatment top to bottom
  from 1.15s (70ms/item), dots fade in at ~1.5s via html.nav-in; (3) the first
  project only rises in via the rise-in keyframes: info block 2.3s (24px, 0.9s,
  --ease-graceful), slides left to right 2.43s + 0.1s/slide (80px, 2s,
  --ease-soft, matched to the Framer build of nickjohnston.ca), arrows 2.95s.
  Kind Words and Why are scroll reveals: IntersectionObserver adds .in-view at
  20% visibility (once), rising each child 24px/0.9s on 0.15s stagger steps
  (label -> quote 1 -> quote 2; heading -> paragraph -> button 1 -> button 2);
  1.5s later main.js adds .is-done and every reveal rule releases (all reveal
  selectors carry :not(.is-done)) — pinned transform/delay overrides would
  otherwise beat .btn:hover's scale(1.03) on specificity and kill it. The inline head script sets
  .anim-intro pre-paint so nothing flashes; reduced motion skips everything
  there (stagger delays would survive the global duration override). Screen
  readers get intact .sr-only copies; split copies are aria-hidden. After each
  element settles, main.js restores its plain text (lingering filtered char
  spans stay composited as layers and can render artifacts). Per-char
  inline-blocks lose the font's kerning, so the restore used to visibly
  shift the text (up to ~3px along a line); kernSplit in main.js measures
  the real plain-text layout once the font loads and gives each char a
  margin that matches it. Measured, not pair-computed: Chrome kerns across
  spaces inconsistently. This is not a trial-font issue. The measurement
  must never DETACH the split (it lifts it with position: absolute): a
  detached node loses its running transitions, so a font landing
  mid-sweep (first visits) would kill the animation outright.
- Testimonial focus (reference/testimonial-interaction.png): each quote
  settles to --muted EXCEPT its key phrase, which holds --fg. .is-focused
  is per-QUOTE, not on the section, and main.js staggers it by
  FOCUS_STEP (3s): quote 1 at 3s after the section lands, quote 2 at 6s,
  so each changes while the reader is on it rather than both at once. The phrases are marked up as .quote-key spans in index.html (one
  per quote; Ginny's includes the closing quote mark). Colors were
  sampled from the reference, not guessed: the dimmed text is #808080 =
  --muted on black and the phrase is #ffffff = --fg, so the pair is
  already tokenised and follows the theme (light dims to #AEAEAE, which
  has no reference yet). The 3s timer hangs off the same .in-view moment
  as the reveal, inside the existing IntersectionObserver, and is ONE-WAY:
  scrolling away and back does not replay it. A quote with no .quote-key
  is skipped rather than dimmed flat, so an HTML/JS mismatch degrades to
  no effect instead of a uniformly grey paragraph. NOTE: the stagger is
  measured from the SECTION entering, so on phones (one quote per screen)
  quote 2 can dim before the reader has scrolled to it; timing each quote
  off its own visibility is the fix if that becomes a problem.
- Info headshot hover: the "random" effect from Codrops' WebGL mouseover
  demo (akella/webgl-mouseover-effects step3, MIT), ported from its
  three.js post pass to a raw WebGL canvas (.info-photo-fx, injected by
  main.js) over the img. Shader math is kept in the demo's VIEWPORT units
  (disc reach 0.1 viewport widths, velocity capped 0.05, fixed per-pixel
  hash scatter + brightening) so it reads at the demo's scale; the
  per-frame easing is dt-scaled for 120Hz. The canvas shows (.is-fx) only
  while the cursor is moving near the photo; at rest the plain img is
  visible and the rAF loop stops. Off-photo samples draw --bg. It arms
  only after the photo's rise + blur-focus animations finish. Skipped on
  touch and under reduced motion.
- Info office pill ("Visit me in the office"): fixed bottom-centre on
  desktop, opening the live window 18px above it. On phones it is NOT
  sticky (per Nick 2026-10-12, floating over the accordion titles was
  distracting): pill and window share a .office-dock wrapper, which is
  display: contents on desktop and a positioned flex row on phones, so
  the pill sits in the flow 32px under the headshot and the window is
  absolutely anchored above it, overlaying the foot of the photo. The
  after-hours "Check back" note is hidden on phones.
- Respect prefers-reduced-motion (global override already in the stylesheet).
- Design archive media: 26 files, images/archive/design/01-26, MIXED
  ASPECT RATIOS and MIXED FORMATS (.png .jpg .gif .mp4; four videos at
  06, 09, 15, 22 and two gifs at 01, 20). Anything assuming one shared
  ratio, or an NN.png filename, is stale. They appear in filename order
  in both layouts. DESIGN_BANDS in main.js is the single source of
  truth for both layouts: each entry carries its FILENAME (f, extension
  and all) and natural pixel size, which size it everywhere, plus its
  col / span / off placement for the vertical grid. Add or reorder
  media there, then re-run tools/generate-placeholders.py (it covers
  .gif but skips video, which has no blur-up preview) and
  tools/check-deploy.py, which reads the same f values and so verifies
  every filename, extension and case against the folder.
  Videos are built by designMedia() as GIF-style players, muted + loop
  + playsinline + autoplay, with NO src: the six come to ~25MB
  together, so autoplayNearby() hands over the src only once the
  element is within 50% of the viewport, and pauses it on the way out
  so off-screen copies stop decoding (the band parks hidden items at
  their last slot). One observer serves the vertical grid, the desktop
  band and the phone carousel. The first start is left to the autoplay
  ATTRIBUTE, not a play() call: calling play() in the same tick as the
  src assignment races the load it just kicked off, the play is
  aborted, and the video sits on frame zero. play() is only for
  resuming after the observer's pause. `once: true` on an entry drops
  the loop so the clip holds its last frame instead of cycling, for a
  clip that resolves rather than cycles (added 2026-10-11 for the then
  01.mp4; NOTHING uses it since the 2026-10-14 batch replaced that
  file, so it is capability, not current behaviour). Because play()
  rewinds a finished video, a once clip replays each time it is
  scrolled back to rather than staying dead on its last frame.
- Archive layout switch (reference/archive-update/*-default, -click,
  -hover): an ellipsis circle under the intro reveals two pills,
  Vertical and Horizontal, the live one carrying a check. Geometry
  from the mock at 1512: 36px circle, 36px pills, 8px gaps, 17px pill
  padding, ABC Otto 14px labels, 16px check 8px ahead of its label;
  --surface at rest, --surface-hover on hover and while the menu is
  open, and the label rolls on hover/focus via the shared .roll. The pills slide out from behind the circle with a 60ms stagger
  and leave the tab order (visibility) when down; outside pointerdown
  and Escape close it. The open/select behaviour is shared: bindViewSwitch
  in main.js takes a .view-switch and the data attribute its pills carry
  (data-layout here, data-cols on the Logos column switch) and returns
  the selector, so both controls behave identically and only the apply
  step differs. .view-switch is the component; .layout-switch and
  .cols-switch pick one out, and the horizontal layout's screen-lock
  rules all carry :not([data-view='logos']) because the Logos view
  scrolls whichever Design layout is stored. A SELECTION also closes them on its own 3s
  later, so a choice feels finished without having to click away;
  picking again restarts the countdown, and merely opening the switch
  does not start it. If focus is still inside the switch when that
  fires it is handed back to the circle, since the pills go
  visibility: hidden and would otherwise drop it to the body. All of
  the open/select/dismiss behaviour lives in bindViewSwitch in main.js,
  shared by both ellipsis switches (archive layout, Logos columns).
  The layout lands on <html data-layout> PRE-PAINT
  from the inline head script, because the two layouts lay out
  completely differently (one scrolls, one is a locked single screen).
  Vertical is the default; localStorage "layout" stores only the
  deviation ("horizontal"), the same convention as theme and sound.
  Design view only: the switch hides under Logos.
- Archive horizontal layout (reference/archive-update/
  archive-design-new-horizontal-*.png): an infinite looping strip, not
  a scroll container. One continuous position value drives everything.
  Because the images no longer share an aspect ratio the slots are keyed
  to HEIGHT, not width, and main.js packs the constant 30px gaps from
  the real widths at render time (the only way one gap survives mixed
  aspects). The height ratios are the old width ratios, so the band
  still reads at the size it did when every image was 1195x1500: main
  552 tall at 1440, then 31.8/26.4/20/15.7/12.4% of it, opacity
  100/50/40/30/20%, slot 5 = off-screen exit. In this layout the page
  is a single 100svh screen (no scroll), main image centred on the
  viewport; on mobile the band drops back into the flow below the
  intro. Navigation: click left/right of centre (directional
  circle-arrow cursors on the band), drag with momentum, trackpad
  swipe, arrow keys; counter below reads NN/30. Images load lazily as
  they approach the visible range. ON PHONES the band is replaced by
  the home page's carousel instead of shrinking the slot table: one
  image per screen (.arc-item becomes a 100%-wide scroll-snap cell),
  native scroll + snap, and the project carousels' pagination dots
  below in place of the counter. main.js skips the slot engine there
  entirely and clears its inline transforms on the breakpoint flip,
  tracking the position in dotIndex so the two modes can hand it back
  and forth (scrollLeft is already zeroed by the time the flip is
  observable, so it cannot be read then). Every image shares one
  height, so only the side margin varies from slide to slide; a wide
  image that would run off the screen caps at a 16px margin and sits
  shorter, which the .arc-tile min() expresses as the height that
  produces that width, never breaking the aspect. The shared height is
  a trade: the taller it is, the MORE images hit the width cap and end
  up shorter than it, which defeats the matching (88vw puts roughly half of the 30 on
  the shared height). It is also bounded by the space the header and
  footer actually leave rather than a guessed svh, so the dots can
  never ride into the footer; that squeezes hard on short phones (322
  at 375x812, but 177 at 375x667 and far less below that, where the
  363px mobile header leaves almost nothing). 30 dots is a lot, so they run 6px
  and DERIVE their gap from the count (--dots-n, set by main.js) rather
  than a hand-tuned figure needing revisiting every time the set grows:
  it opens to the project carousels' 10px when there are few and closes
  to a 3px floor when there are many (4.7px at 30 on a 375, landing
  exactly on the 20px margins; the floor gives 17px margins at 320).
  Load reveal: tiles fade + rise
  (shared rise-in keyframes) in a centre-out ripple, 100ms per ring
  from 1.2s; the ripple animation lives on the inner .arc-tile so it
  composes with the carousel's own opacity/transform on .arc-item. The
  band measures nothing while display:none, so anything that un-hides
  it (the layout switch, coming back from Logos) re-renders it.
- Archive vertical layout
  (reference/archive-design-layout-vertical-Oct14.png), the DEFAULT
  Design view: an
  editorial scroll of the same 30 items on the 12-column grid,
  measured off that mock at a 1512 frame (content 1472, column 104.33,
  gutter 20). NOTE the mock puts the first image at y260,
  which predates the extra 80px Nick asked for under the ellipsis
  (2026-09-23); the build keeps the gap at 143px, so every band sits
  80px below its mock position. The items are grouped into 22 bands; each band is ONE
  grid row (.va-item is pinned to grid-row 1, or auto-placement would
  push an image starting on an earlier column onto a row of its own and
  the band would stack instead of overlap). Everything vertical is a
  PERCENTAGE so the composition scales with the columns exactly as the
  aspect-driven image heights do: --off (an image's drop below its
  band's top) is padding-top resolved against its own grid area, --gap
  (the space above a band) is a margin resolved against the content
  width. --pull narrows an image inside its grid area and pins it right
  with a margin (only 04, which the Oct14 mock sets 528 wide inside a
  5-column area): NOT justify-self, which Chrome now honours on block-level boxes too and
  which would follow the items into the mobile layout.
  Reveal: NO BLUR, at any width (per Nick 2026-10-12: removed from
  phones first, where it could stick on iOS Safari and leave images
  soft, then everywhere the same day). Every tile gets .va-rise and
  fades up 20px (opacity 0.7s, transform 0.9s --ease-graceful) when an
  IntersectionObserver (12% visible) adds .is-in, one-way; both classes
  are dropped once it lands. The start state carries NO transition (it
  would animate the tile down into hiding as the class lands); the
  transition lives on .va-rise.is-in. Images on screen at LOAD take the
  same rise on the entrance beat, --va-d = 1.9s + 0.4s per image, which
  picks up as the ellipsis lands (its rise-in is 1.4s + 0.9s, and
  --ease-graceful has it 97% there by 1.89s). Which tiles those are is
  measured synchronously in main.js before the first paint, NOT in the
  observer (its first callback lands a frame late and would flash the
  images at full opacity), and they are RELEASED THERE TOO, never
  observed: the two tests disagree about what "on screen" means (any
  sliver versus 12% inside a root shrunk 8%) and a font load can reflow
  the header in between. The invariant: a tile must never hold an
  entrance delay it has no way to spend. A forced recalc sits between
  adding .va-rise and .is-in so the start state lands first.
  The whole reveal is REPLAYABLE (playVerticalReveal, per Nick
  2026-10-13): switching INTO the vertical view re-arms every tile and
  plays it again rather than showing content that is already sitting
  there, which is how the horizontal band has always behaved (its
  ripple is a CSS animation and display toggling restarts those). A
  switch passes REVEAL_ON_SWITCH (0.12s) instead of the 1.9s load
  beat, since there is no intro sweep to wait out; the 0.4s per-image
  step is the same. Both paths that un-hide the grid replay it, the
  layout switch and Logos -> Design, and BOTH only on a real change:
  re-picking the view you are already on would otherwise throw the
  content away and rebuild it for nothing. The load reveal is SKIPPED
  when the grid is hidden (a page that opens in horizontal), because a
  display:none grid measures every tile at top 0, so all 26 would be
  read as on screen and handed an entrance delay they can never spend
  (a hidden element runs no transitions). Re-arming parks the
  transitionend listener on the tile so it can be removed by hand: a
  replay can cancel a transition mid-flight, and a cancelled one fires
  transitioncancel, so the listener would never clear itself. .va-tile
  MUST stay overflow:hidden: the blur-up load placeholder (separate
  from the retired reveal, and still in use) paints a ::before preview
  blurred 12px and scaled 1.06, and unclipped that oversized copy
  haloes every image permanently. Tiles open the lightbox on desktop only. On mobile the bands collapse to one column that keeps a simplified
  stagger: 100% / 78% / 62% widths by span, alternating sides.
- Archive Logos view (reference/archive-logos.png): a 4-up grid of
  335x400 cards (3 grid columns each, 20px gaps; 2-up on mobile, 5-up
  above 1680px so cards never pass ~400px wide),
  --logo-card bg (#0D0D0D dark / #F6F6F6 light). The 32 cards are
  explicit HTML in archive.html, one per file in images/archive/logos/
  (NN-name.svg, all white-fill vectors; light theme inverts them via
  filter). Marks vary in proportion, so each scales inside a fixed 52%
  x 40% content box (174x160 at 1440) with object-fit: contain; main.js
  only assigns the --lg-d reveal stagger in DOM order. Unlike the
  Design view the page scrolls: the single-screen lock (html:has
  overflow hidden) lifts when body[data-view='logos'].
  Load reveal: cards rise in one at a time with the home slides' exact
  entrance (rise-in, 2s, --ease-soft, 80px rise; 65ms stagger from 1.2s
  via --lg-d); a view switch restarts the animations both ways.
  Mobile column switch: phones only (the desktop 4-up has nothing to
  switch). It is a SECOND .view-switch, .cols-switch, sitting in the
  header right after .layout-switch, so the ellipsis holds the same
  slot under the intro across both views; the pills read Single Column
  / Two Column and the live one carries the check. Two up on every
  visit: unlike layout, theme and sound it stores nothing, so it needs
  no pre-paint head script. body[data-cols] drives the grid. The two
  labels are long enough that under ~342px the open pills would clear
  the right margin, so a max-width: 360px block tightens THIS switch's
  padding and gaps to 12/6 (375 and up keep the designed 17/8).
- Contact page (reference/contact.png + the two hover refs): a single
  100svh screen like the archive, the label row pinned at 39.5svh so the
  intro's wrap can't move it. Email Me cols 1-6, Connect cols 7-12; 44px
  links on a 73px rhythm, intro max-width 490px (holds the designed
  5-line rag). Hovering the email row reveals a Copy Email pill (surface
  bg, stays visible while the pointer travels to it); clicking the
  address or the pill copies the email to the clipboard, flips the pill
  label to "Copied to clipboard", then the pill fades away on its own
  3s later (.is-dismissed, which also drops the click's focus pin;
  leaving/re-entering the row re-arms the hover; contact block in
  main.js). The address rolls to the narrower italic under that pill
  while the link box still sizes to the roman copy, so the 24px flex gap
  would visibly open up: main.js measures that slack off the two .roll
  copies into --email-italic-trim on .email-row, and the pill closes it
  with a negative margin-left on the roll's own curve. That roll is keyed
  to :hover/:focus-within on the ROW, not on the link (the one place on
  the site where it is): keyed to the link, walking from the address onto
  the pill would unhover it, rolling the text back to the wider roman
  while the pill stayed trimmed in, and the two would overlap. Measured, not
  hardcoded: it differs per theme (~31px light, ~39px dark) and BOTH cuts
  have to finish downloading first (document.fonts.load by name) or the
  two copies share fallback metrics and it reads 0. Re-measured on theme
  flip and on resize.
  Both the email address and the Connect links roll from the roman cut
  of ABC Otto to the italic on hover: the .roll's second (aria-hidden)
  copy just carries font-style: italic, so the existing roll doubles as
  the style change. Otto's italic is 10-30px NARROWER than the roman at
  44px, so the roll box keeps sizing to the roman copy and the arrow
  stays anchored through the swap; no width compensation is needed (and
  none should be added if the cut ever changes without re-measuring).
  Connect links also fade in a 24px up-right arrow; they open in new tabs. On mobile the page flows normally and the address
  stands alone (per Nick 2026-10-12): there is no resting Copy Email
  pill. Tapping the address copies it and the pill appears 16px below
  as the "Copied to clipboard" confirmation only, then fades on the
  usual dismiss. It is absolutely positioned off .email-row so it never
  shifts the page, and the row's :hover/:focus-within reveal is
  overridden there because a tap leaves both stuck on touch.

## Images

- Each carousel slide has a data-slot attribute (e.g. virro-03) marking where images go.
- Slides are square (aspect-ratio 1/1, object-fit cover).
- Slides can hold <video> (autoplay muted loop playsinline, GIF-style; e.g.
  clear-falls-01). Videos get no blur-up
  placeholder (generator is raster-only); the slide bg covers the load.
- Put source files in images/<project>/ and reference them from the slides.
- images/og/nj-og.jpg (1200x630) is the shared OpenGraph/Twitter card image;
  all four pages carry og:/twitter: metas with ABSOLUTE https://nickjohnston.ca
  URLs (og:image and og:url), so link previews only resolve once the site is
  live on that domain. Per-page og:title/og:description mirror each page's
  <title> and meta description; keep them in sync when those change.
- Carousels self-sync from the folders: the dev server runs
  tools/sync-carousels.py in the background when anything under images/
  changes (also runnable manually). It rebuilds each section's slide block
  from the -NN numbering (gaps = placeholder slides, video extensions =
  video slides, first project's slides 1-4 eager), regenerates
  js/placeholders.json, and carries descriptions across renames by file
  content via tools/carousel-descriptions.json (md5 -> text). NEW images
  get generic labels and are reported as "needs descriptions" — write
  those into the manifest (then re-run) whenever they appear. Do NOT
  hand-edit slide blocks anymore; the next sync would overwrite them.
  Adding a whole new PROJECT (section, title, tagline) is still manual.
- EDGE LINES FROM EXPORTS (found 2026-10-14, 9 of the 30 archive stills):
  a frame rendered at a fractional size leaves its last row/column only
  half covered, and that half pixel gets blended with the white artboard
  behind it. The result is a 1px hairline on the RIGHT and/or BOTTOM
  (never top/left, which start on a whole pixel) that is invisible
  against the light theme and reads as a white border against the dark
  one, so it survives eyeballing. It is in the FILE, not the CSS: the
  tiles render edge-to-black cleanly, verified at 1:1. Run
  `python3 tools/check-image-edges.py images/archive/design` over any new
  batch (it takes any folder; needs Pillow, which is why it is separate
  from check-deploy.py, the stdlib-only pre-deploy gate). The fix is a
  re-export at a whole-pixel size; failing that, trim the flagged
  row/column and update that entry's w/h in DESIGN_BANDS, since the
  recorded size drives the tile's aspect ratio. The 2026-10-14 batch was
  trimmed that way (01, 02, 04, 21, 25, 26, 27, 28, 29), reusing each
  JPEG's own quantization tables so there was no requantization.
  images/backland/bl-04.jpg (left) and images/jointly/j-09.jpg (bottom)
  still carry one and have NOT been trimmed.
- Blur-up placeholders: js/placeholders.json maps every raster image to a
  20px base64 preview. Regenerate manually after adding images:
  `python3 tools/generate-placeholders.py` (zero-dep, sips, JPEG URIs) or
  `node tools/generate-placeholders.mjs` (canonical, sharp, WebP; Node is
  NOT installed on the studio Mac). main.js applies the preview to every
  img[loading="lazy"] (and the archive band's lazy tiles) via .ph on the
  container: blurred ::before layer, real image fades in on load, cached
  images are never veiled. Eager/above-fold images are untouched.
  phApply SKIPS a host whose computed position is fixed, absolute or
  sticky: .ph carries position: relative, which would clobber it. That
  bit the info page's office window (per Nick 2026-10-15), whose offline
  poster is a direct child, so .ph landed on .office-cam itself, dropped
  it from fixed back into the flow and pushed it below the fold. Only on
  a COLD cache, since a cached image bails out one line earlier, which is
  what made it intermittent and why it survived testing. Every real
  blur-up host (.slide, .va-tile, .arc-tile) is static or already
  relative, so the guard excludes nothing that wants a preview.

## Copy rules

- No em dashes in copy. Use commas, periods, or parentheses instead.
  That includes page <title> and og:title tags, which use a plain hyphen
  (e.g. "Info - Nick Johnston").
- Copy should sound human, not formal.
- No runts in the intros (per Nick 2026-10-12): the last words of each
  page's intro are joined with &nbsp; so the paragraph can never end on
  a single word, at any width, theme or browser (info glues three,
  "site or app.", since "or app." alone is still a stub). The home
  why-me paragraph carries the same glue ("shows up."). Keep the glue
  when editing intro copy, including the archive's INTRO_COPY strings in
  main.js (\u00a0 there). splitReveal collapses ordinary whitespace
  only, so the glue survives the load sweep as one .reveal-word.
  The info accordion's panel leads (.acc-body h3) are the exception to
  the glue: they use text-wrap: pretty instead, because Nick wants that
  copy to stay plain text (2026-10-15). Background's lead was dropping
  "possible." alone on a third line; pretty only nudges the break that
  causes the orphan, where balance would even every line and restructure
  the rag. It is a PROGRESSIVE fix, not a guarantee like the glue: where
  text-wrap: pretty is unsupported the text wraps normally and the runt
  comes back, so reach for the &nbsp; if a lead ever has to hold
  everywhere. At the 20px the leads settled on, Background fits two
  lines and does not runt even without it, but the rule stays so an
  edit to any lead cannot quietly reintroduce one.
- Project descriptions and credits are REAL COPY as of 2026-09-29 (all seven
  projects; Virro's original paragraph stands). Treat them as final content.

## Working conventions

- Measure from the exports in reference/ before implementing layout. Verify positions
  with the grid overlay ("g").
- Iterate on existing code rather than rewriting wholesale.
- Verify changes in the browser before considering them done.
- Keep everything in the single shared stylesheet; no per-page CSS files.
- Deploys go to Vercel as plain static files (no build step, no
  vercel.json needed). Before pushing, run `python3 tools/check-deploy.py`:
  it stands in for a build, confirming every referenced file exists with
  EXACT case (macOS ignores filename case, Vercel's Linux servers do not).
  .vercelignore keeps reference/, tools/, .claude/ and CLAUDE.md in Git
  but off the live site.
