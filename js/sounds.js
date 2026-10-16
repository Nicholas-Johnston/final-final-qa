/* Interaction sounds — cuelume 0.2.1 (npm), vendored under js/vendor/
   cuelume/ because the site has no build step and no Node. Sounds are
   synthesized live with Web Audio; no audio files.

   Per Nick, sounds are deliberately sparse:
     - nav + contact Connect-list links: tick on hover
     - nav items: press on click-through
     - footer email: tick on hover
     - footer Settings button: tick on hover, press on click; the menu's
       Theme/Sound toggles tick on hover (their click sounds live in
       main.js: switching sound off must stay silent from the very
       click that does it)
     - contact page email address: tick on hover
     - pill CTA buttons (home + info): tick on hover; the home pair
       also press on click-through
     - info page + home project accordion rows: tick on hover,
       press on click
     - info page office-camera button: whisper on hover
     - email copied (contact page + footer): success (played from
       main.js via window.cuelume once the clipboard write lands)
   Nothing else makes sound. Declarative wiring is stamped here so the
   HTML stays clean; main.js guards its calls, so the site works with
   this module missing or blocked.

   ES modules do not load over file:// — serve the site
   (python3 -m http.server 8080) to hear anything. */
import { bind, play, setEnabled, setVolume } from './vendor/cuelume/index.js';
import { RECIPES } from './vendor/cuelume/sounds/recipes.js';

/* Volume tuning. BASE_VOLUME scales every sound (0..1). The per-sound
   knobs scale one sound relative to that (1 = unchanged, 0.5 = half as
   loud, up to ~2 before the limiter flattens it): declarative sounds
   cannot carry a per-play volume, so loudness is adjusted at the
   source, on the vendored recipes. */
const BASE_VOLUME = 0.5;
const TICK_VOLUME = 0.3;
const PRESS_VOLUME = 0.6;
const SUCCESS_VOLUME = 0.4;
const WHISPER_VOLUME = 0.3;

setVolume(BASE_VOLUME);
RECIPES.tick.masterGain *= TICK_VOLUME;
RECIPES.press.masterGain *= PRESS_VOLUME;
RECIPES.success.masterGain *= SUCCESS_VOLUME;
RECIPES.whisper.masterGain *= WHISPER_VOLUME;

/* Sound preference (footer settings menu). On by default; "off" is the
   only stored deviation. Applied here, before bind(), so a muted visit
   never plays a note; the menu's radios flip it live via
   window.cuelume.setEnabled (see the settings block in main.js). */
try {
  if (localStorage.getItem('sound') === 'off') setEnabled(false);
} catch (e) {}

/* main.js is a classic script and runs before this module; it guards
   every call, so exposing the API here is enough. */
window.cuelume = { play, setEnabled, setVolume };

const stamp = (selector, attr, sound) => {
  document
    .querySelectorAll(selector)
    .forEach((el) => el.setAttribute(attr, sound));
};

/* Hovers are mouse-only and throttled by cuelume itself. */
stamp('.site-nav a', 'data-cuelume-hover', 'tick');
stamp('.contact-link', 'data-cuelume-hover', 'tick');
stamp('.footer-email', 'data-cuelume-hover', 'tick');
stamp('.settings-btn', 'data-cuelume-hover', 'tick');
stamp('.settings-toggle', 'data-cuelume-hover', 'tick');
stamp('.btn, .nf-pill', 'data-cuelume-hover', 'tick');
stamp('.vs-toggle, .vs-pill', 'data-cuelume-hover', 'tick');
stamp('.office-btn', 'data-cuelume-hover', 'whisper');

/* Accordion rows (info page sections + the home page Project Info /
   Credits rows): tick on hover, press on click. The buttons are the
   rows' full-width hit areas. */
stamp('.acc-head button, .project-acc-item', 'data-cuelume-hover', 'tick');
stamp('.acc-head button, .project-acc-item', 'data-cuelume-press', 'press');

/* Clicks are a single press, no release half: on navigating elements
   the page unloads mid-release and clips it, so a press/release pair
   sounds different on the nav than on same-page controls like the
   Settings button. One press everywhere keeps every click identical.
   The CTA pills only click-sound on the home page (its <body> is the
   one without a data-page; the info page's pill stays hover-only). */
stamp('.site-nav a', 'data-cuelume-press', 'press');
stamp('.settings-btn', 'data-cuelume-press', 'press');
stamp('.vs-toggle, .vs-pill', 'data-cuelume-press', 'press');
stamp('.nf-pill', 'data-cuelume-press', 'press');
if (!document.body.dataset.page) {
  stamp('.btn', 'data-cuelume-press', 'press');
}

bind();
