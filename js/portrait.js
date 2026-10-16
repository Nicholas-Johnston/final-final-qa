/* ------------------------------------------------------------------
   Nick Johnston — Portfolio 2026
   Info avatar easter egg: eye tracking, blink, click "ooh" expression
------------------------------------------------------------------- */

/* Tuned values, do not change. */
const MAX_TRAVEL = 3; // SVG user units, max pupil displacement
const EASE = 0.4; // lerp factor per frame toward target
const DISTANCE_FACTOR = 0.1; // how fast travel ramps up with cursor distance
const OOH_MS = 290; // how long the open-mouth state holds
const BLINK_MS = 110; // duration of a single blink

const [svg, exprDefault, exprOoh, ...pupilEls] = [
  'profile', 'expr-default', 'expr-ooh', 'pupil-left', 'pupil-right',
].map((id) => document.getElementById(id));

const skipMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
  window.matchMedia('(hover: none)').matches;
let rafId = 0, blinkTimer = 0, oohTimer = 0, blinkScale = 1;
const listeners = [];
const on = (target, type, fn, opts) => {
  target.addEventListener(type, fn, opts);
  listeners.push([target, type, fn, opts]);
};

/* Bail quietly on a bad re-export; the portrait just sits still. */
if (svg && exprDefault && exprOoh && pupilEls.every(Boolean)) {
  /* Resting centres via getBBox(): works for <circle> and <path> alike. */
  const pupils = pupilEls.map((el) => {
    const b = el.getBBox();
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    return { el, cx, cy, x: 0, y: 0, tx: 0, ty: 0 };
  });

  /* The "ooh" reacts to the page's controls (accordion rows + office
     button), not the portrait. Both expression groups crossfade
     together, opacity only: the wider smile would poke out around it. */
  const ooh = () => {
    exprDefault.style.opacity = '0';
    exprOoh.style.opacity = '1';
    clearTimeout(oohTimer);
    oohTimer = setTimeout(
      () => (exprDefault.style.opacity = exprOoh.style.opacity = ''), OOH_MS);
  };
  document.querySelectorAll('.acc-head button, .office-btn')
    .forEach((el) => on(el, 'click', ooh));
  /* Reduced motion / touch: pupils rest; the ooh above still works. */
  if (!skipMotion) {
    let rect = svg.getBoundingClientRect();
    const refresh = () => { rect = svg.getBoundingClientRect(); };
    on(window, 'resize', refresh);
    on(window, 'scroll', refresh, { capture: true });
    /* Cursor to SVG units via the viewBox scale; the travel clamp makes
       this read as looking, not sliding: barely a stir up close. */
    on(window, 'mousemove', (e) => {
      const scale = svg.viewBox.baseVal.width / rect.width;
      const mx = (e.clientX - rect.left) * scale;
      const my = (e.clientY - rect.top) * scale;
      for (const p of pupils) {
        const dx = mx - p.cx, dy = my - p.cy;
        const dist = Math.hypot(dx, dy) || 1;
        const travel = Math.min(MAX_TRAVEL, dist * DISTANCE_FACTOR);
        p.tx = (dx / dist) * travel;
        p.ty = (dy / dist) * travel;
      }
    });
    /* One rAF loop; travel + blink share a single transform (scale
       pivots on the pupil's centre) so nothing fights or resets. */
    const r = (n) => n.toFixed(2);
    const frame = () => {
      for (const p of pupils) {
        p.x += (p.tx - p.x) * EASE;
        p.y += (p.ty - p.y) * EASE;
        p.el.setAttribute('transform',
          `translate(${r(p.x)} ${r(p.y)}) translate(${r(p.cx)} ${r(p.cy)}) ` +
            `scale(1 ${blinkScale}) translate(${r(-p.cx)} ${r(-p.cy)})`);
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    /* Blink every 4-7s: a quick vertical squash, restored after BLINK_MS. */
    const queueBlink = () => (blinkTimer = setTimeout(blink, 4000 + Math.random() * 3000));
    const blink = () => {
      blinkScale = 0.15;
      blinkTimer = setTimeout(() => { blinkScale = 1; queueBlink(); }, BLINK_MS);
    };
    queueBlink();
  }
}

export const destroy = () => {
  cancelAnimationFrame(rafId);
  clearTimeout(blinkTimer);
  clearTimeout(oohTimer);
  listeners.forEach(([t, type, fn, o]) => t.removeEventListener(type, fn, o));
  listeners.length = 0;
};
