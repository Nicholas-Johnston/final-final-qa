/* ------------------------------------------------------------------
   Nick Johnston — Portfolio 2026
   Carousel: eased arrow paging + drag / swipe
------------------------------------------------------------------- */

(function () {
  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

  /* Interaction sounds: js/sounds.js (a module, so it always runs after
     this script) puts cuelume on window; every call here must guard so
     the site works with the module missing or blocked (e.g. file://). */
  const sfx = (name) => {
    if (window.cuelume) window.cuelume.play(name);
  };

  const CHAR_STAGGER = 14; // ms per char in the reveal sweep

  /* Put the font's kerning back into a split reveal. Each char sits in
     its own inline-block, which breaks the text run, so the browser
     kerns nothing and the sweep plays unkerned; restoring the plain
     text then snapped every glyph to its kerned spot (up to ~3px by the
     end of an intro line). So once the host's cut has loaded, the plain
     text is laid out in the split's place for a moment, each glyph's x
     read off it, and the split put back, all in one task so nothing
     paints between.
     Every gap between two chars on the same line then gets the
     difference as a margin on its left char, and the split lands
     exactly on the plain layout, so the restore is invisible. Measured
     rather than computed from pairs because Chrome kerns across spaces
     inconsistently (space->v yes, space->w no, in Otto), which no pair
     probe predicts. Waits for the font, or it would measure the
     fallback; a split replaced before then is skipped. */
  const kernSplit = (host, anim) => {
    const apply = () => {
      if (!anim.isConnected) return;
      const chars = [...anim.querySelectorAll('.reveal-char')];
      // Transforms only move the chars vertically; x is untouched
      const splitX = chars.map((c) => c.getBoundingClientRect().left);
      // offsetTop, not rect.top: the sweep's translateY would blur the
      // line test for chars mid-flight
      const splitTop = chars.map((c) => c.offsetTop);

      // Lift the split out of the flow rather than detaching it: a
      // detached node loses its running transitions, so a font landing
      // mid-sweep would snap every char straight to its end state
      const plain = document.createTextNode(anim.textContent);
      anim.style.position = 'absolute';
      host.insertBefore(plain, anim);
      const range = document.createRange();
      const glyphs = [];
      for (let i = 0; i < plain.length; i++) {
        if (plain.data[i] === ' ') continue;
        range.setStart(plain, i);
        range.setEnd(plain, i + 1);
        glyphs.push(range.getBoundingClientRect());
      }
      plain.remove();
      anim.style.position = '';
      if (glyphs.length !== chars.length) return;

      for (let i = 1; i < chars.length; i++) {
        // A line break resets the run: nothing to carry across it.
        // Both layouts' breaks count: the unkerned split can wrap a
        // word earlier than the plain text does, and measuring across
        // that split-side break reads a hugely negative gap, which
        // used to land as a giant positive margin that forced the
        // sweep onto wrong lines until the restore (orphaned words).
        if (Math.abs(glyphs[i].top - glyphs[i - 1].top) > 1) continue;
        if (Math.abs(splitTop[i] - splitTop[i - 1]) > 1) continue;
        const d =
          glyphs[i].left - glyphs[i - 1].left - (splitX[i] - splitX[i - 1]);
        if (Math.abs(d) > 0.01) chars[i - 1].style.marginRight = d + 'px';
      }
    };

    if (!document.fonts || !document.fonts.load) {
      apply();
      return;
    }
    const cs = getComputedStyle(host);
    document.fonts
      .load(
        cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' +
          cs.fontFamily,
        host.textContent
      )
      .then(apply, apply);
  };

  /* Split an element's text into word/char spans for the reveal sweep.
     Screen readers get an intact sr-only copy; the split copy is
     decoration. Re-splitting an element cancels its pending restore so
     a quick view switch can't put stale text back. */
  const splitReveal = (host, startDelay, stagger = CHAR_STAGGER, duration = 800) => {
    // Collapse ordinary whitespace only: \s would also flatten the
    // non-breaking spaces that glue an intro's last words together (no
    // runts). A glued pair stays one .reveal-word, so the split wraps
    // exactly where the plain text will.
    const text = host.textContent.trim().replace(/[ \t\r\n]+/g, ' ');

    const srText = document.createElement('span');
    srText.className = 'sr-only';
    srText.textContent = text;

    const anim = document.createElement('span');
    anim.setAttribute('aria-hidden', 'true');

    let charIndex = 0;
    text.split(' ').forEach((word, wordIndex) => {
      if (wordIndex) anim.appendChild(document.createTextNode(' '));
      const wordEl = document.createElement('span');
      wordEl.className = 'reveal-word';
      for (const ch of word) {
        const charEl = document.createElement('span');
        charEl.className = 'reveal-char';
        charEl.textContent = ch;
        charEl.style.transitionDelay =
          startDelay + charIndex * stagger + 'ms';
        wordEl.appendChild(charEl);
        charIndex++;
      }
      anim.appendChild(wordEl);
    });

    host.textContent = '';
    host.appendChild(srText);
    host.appendChild(anim);

    kernSplit(host, anim);

    // Once settled, restore plain text: leaving hundreds of filtered
    // char spans alive keeps them as composited layers (and can render
    // artifacts), and their stale transition-delays would haunt any
    // future styling.
    clearTimeout(host._settleTimer);
    const settle = startDelay + charIndex * stagger + duration + 100;
    host._settleTimer = setTimeout(() => {
      host.textContent = text;
    }, settle);
  };

  /* Blur-up placeholders: js/placeholders.json maps image paths to tiny
     base64 previews (generated manually via tools/generate-placeholders.*).
     The preview shows blurred behind the loading image (see the .ph
     styles); the real image fades in on load. Images already cached at
     wiring time are never veiled. If pinned scroll animations (GSAP
     ScrollTrigger etc.) ever land on the site, refresh them in phDone —
     today nothing depends on image-driven layout: every container has a
     fixed aspect ratio. */
  let phMap = null;

  const phApply = (img) => {
    if (!phMap || !img) return;
    const key = (img.getAttribute('src') || '').replace(/^images\//, '');
    const ph = phMap[key];
    const host = img.parentElement;
    if (!ph || !host) return;
    if (img.complete && img.naturalWidth > 0) return; // cached: show as-is
    /* .ph carries position: relative so the preview can sit under the
       image, and that would CLOBBER a host positioned another way: the
       info page's office window is position: fixed, and picking up .ph
       for its offline poster dropped it back into the flow and pushed it
       below the fold. Only on a cold cache, since a cached image bails
       above, which is what made it intermittent. Every real blur-up host
       (.slide, .va-tile, .arc-tile) is static or already relative, so
       anything else is not a tile and does not want a preview. */
    const pos = getComputedStyle(host).position;
    if (pos === 'fixed' || pos === 'absolute' || pos === 'sticky') return;
    host.classList.add('ph');
    host.style.setProperty('--ph', 'url("' + ph + '")');
    const phDone = () => host.classList.add('ph-loaded');
    img.addEventListener('load', phDone, { once: true });
    img.addEventListener('error', phDone, { once: true }); // fail open
  };

  fetch('js/placeholders.json')
    .then((r) => (r.ok ? r.json() : null))
    .then((map) => {
      if (!map) return;
      phMap = map;
      document.querySelectorAll('img[loading="lazy"]').forEach(phApply);
    })
    .catch(() => {});

  class Carousel {
    constructor(root) {
      this.track = root.querySelector('.carousel');
      this.prevBtn = root.querySelector('[data-dir="prev"]');
      this.nextBtn = root.querySelector('[data-dir="next"]');
      this.animId = null;

      this.prevBtn.addEventListener('click', () => this.page(-1));
      this.nextBtn.addEventListener('click', () => this.page(1));

      // Pagination dots (reference/mobile-project-pagination.png): one
      // button per slide; the active one tracks the scroll and tapping
      // one glides the carousel to that image (the arrows' easing).
      // CSS shows them under 640px, where the arrows hide.
      this.dots = document.createElement('div');
      this.dots.className = 'carousel-dots';
      const slideCount = this.track.querySelectorAll('.slide').length;
      for (let i = 0; i < slideCount; i++) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute(
          'aria-label',
          'Go to image ' + (i + 1) + ' of ' + slideCount
        );
        dot.addEventListener('click', () => this.goTo(i));
        this.dots.appendChild(dot);
      }
      this.dotIndex = -1;
      this.track.after(this.dots);

      this.track.addEventListener('scroll', () => this.updateArrows(), {
        passive: true,
      });
      window.addEventListener('resize', () => this.updateArrows());

      this.initDrag();
      this.updateArrows();
    }

    slideStep() {
      const slide = this.track.querySelector('.slide');
      const gap = parseFloat(getComputedStyle(this.track).gap) || 0;
      return slide.getBoundingClientRect().width + gap;
    }

    maxScroll() {
      return this.track.scrollWidth - this.track.clientWidth;
    }

    page(dir) {
      const step = this.slideStep();
      // Snap the target to a slide boundary so paging stays on-grid
      const current = this.track.scrollLeft;
      const index = Math.round(current / step) + dir;
      const target = Math.max(0, Math.min(index * step, this.maxScroll()));
      this.animateTo(target);
    }

    goTo(index) {
      const target = Math.max(
        0,
        Math.min(index * this.slideStep(), this.maxScroll())
      );
      this.animateTo(target);
    }

    animateTo(target, duration = 850) {
      if (this.animId) cancelAnimationFrame(this.animId);

      if (prefersReducedMotion) {
        this.track.scrollLeft = target;
        this.updateArrows();
        return;
      }

      const start = this.track.scrollLeft;
      const delta = target - start;
      if (Math.abs(delta) < 1) return;

      const t0 = performance.now();
      this.track.classList.add('is-animating');

      const tick = (now) => {
        const t = Math.min((now - t0) / duration, 1);
        this.track.scrollLeft = start + delta * easeOutQuint(t);
        if (t < 1) {
          this.animId = requestAnimationFrame(tick);
        } else {
          this.animId = null;
          this.track.classList.remove('is-animating');
          this.updateArrows();
        }
      };
      this.animId = requestAnimationFrame(tick);
    }

    updateArrows() {
      const max = this.maxScroll();
      const x = this.track.scrollLeft;
      this.prevBtn.disabled = x <= 1;
      this.nextBtn.disabled = x >= max - 1;

      const count = this.dots.children.length;
      if (!count) return;
      const i = Math.min(
        count - 1,
        Math.max(0, Math.round(x / this.slideStep()))
      );
      if (i !== this.dotIndex) {
        this.dotIndex = i;
        Array.from(this.dots.children).forEach((dot, n) => {
          dot.classList.toggle('is-active', n === i);
          if (n === i) dot.setAttribute('aria-current', 'true');
          else dot.removeAttribute('aria-current');
        });
      }
    }

    /* Mouse drag on desktop. Touch swiping is handled natively by the
       scroll container + scroll-snap, so we only intercept mouse. */
    initDrag() {
      let dragging = false;
      let startX = 0;
      let startScroll = 0;
      let lastX = 0;
      let lastT = 0;
      let velocity = 0;
      let moved = false;

      this.track.addEventListener('pointerdown', (e) => {
        if (e.pointerType !== 'mouse') return;
        dragging = true;
        moved = false;
        startX = lastX = e.clientX;
        startScroll = this.track.scrollLeft;
        lastT = performance.now();
        velocity = 0;
        if (this.animId) cancelAnimationFrame(this.animId);
        this.track.classList.add('is-dragging');
        // Capture is deferred until real movement: capturing here would
        // retarget the tap's click event away from child buttons (loupe)
      });

      this.track.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        if (!moved && Math.abs(dx) > 3) {
          moved = true;
          this.track.setPointerCapture(e.pointerId);
        }
        this.track.scrollLeft = startScroll - dx;

        const now = performance.now();
        const dt = now - lastT;
        if (dt > 0) velocity = (e.clientX - lastX) / dt; // px per ms
        lastX = e.clientX;
        lastT = now;
      });

      const endDrag = () => {
        if (!dragging) return;
        dragging = false;
        this.track.classList.remove('is-dragging');

        // Project momentum forward, then settle on the nearest slide
        const step = this.slideStep();
        const projected = this.track.scrollLeft - velocity * 160;
        const index = Math.max(
          0,
          Math.min(
            Math.round(projected / step),
            Math.round(this.maxScroll() / step) + 1
          )
        );
        const target = Math.min(index * step, this.maxScroll());
        this.animateTo(target, 700);
      };

      this.track.addEventListener('pointerup', endDrag);
      this.track.addEventListener('pointercancel', endDrag);

      // Suppress accidental clicks after a drag
      this.track.addEventListener(
        'click',
        (e) => {
          if (moved) {
            e.preventDefault();
            e.stopPropagation();
          }
        },
        true
      );
    }
  }

  document
    .querySelectorAll('[data-carousel]')
    .forEach((root) => new Carousel(root));

  /* Lightbox: focused image view for the project carousels and the
     archive's vertical view. A loupe button appears on tile hover;
     clicking it opens the image centred over the blurred page.
     Left/right halves navigate with the archive band's directional
     cursors; Escape or the close button exits.
     DESKTOP ONLY (per Nick 2026-10-12): tablets and phones get no loupe
     and no click-through, since cards are for swiping and scrolling
     there. "Desktop" is wider than the 1024px tablet breakpoint AND a
     hovering fine pointer, so a large tablet in landscape stays out too.
     The same query hides the loupe in styles.css. */
  const lightboxMQ = window.matchMedia(
    '(min-width: 1025px) and (hover: hover) and (pointer: fine)'
  );
  let openLightbox = null; // set below; the archive grid opens its own set
  (function () {
    const carousels = document.querySelectorAll('[data-carousel]');
    const archive = document.querySelector('.varc');
    if (!carousels.length && !archive) return;

    const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'; /* --ease-graceful */

    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML =
      '<div class="lb-backdrop"></div>' +
      '<div class="lb-zone lb-zone-prev" aria-hidden="true"></div>' +
      '<div class="lb-zone lb-zone-next" aria-hidden="true"></div>' +
      '<button class="lb-close" type="button" aria-label="Close image viewer">' +
      '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">' +
      '<path d="M2 2l14 14M16 2L2 16" stroke="black" stroke-width="1.5" stroke-linecap="round"/>' +
      '</svg></button>' +
      '<figure class="lb-figure">' +
      '<img class="lb-img" alt="">' +
      '<video class="lb-video" muted loop playsinline style="display: none"></video>' +
      '</figure>' +
      '<p class="lb-counter"><span class="lb-current"></span><span class="lb-total"></span></p>';
    document.body.appendChild(lb);

    const figure = lb.querySelector('.lb-figure');
    const img = lb.querySelector('.lb-img');
    const video = lb.querySelector('.lb-video');
    const closeBtn = lb.querySelector('.lb-close');
    const currentEl = lb.querySelector('.lb-current');
    const totalEl = lb.querySelector('.lb-total');
    const zonePrev = lb.querySelector('.lb-zone-prev');
    const zoneNext = lb.querySelector('.lb-zone-next');

    let set = []; // current carousel's images: { src, alt, thumb }
    let index = 0;
    let isOpen = false;
    let lastFocus = null;
    let hideTimer = null;

    const pad = (n) => String(n).padStart(2, '0');

    const render = () => {
      const entry = set[index];
      if (entry.isVideo) {
        img.style.display = 'none';
        img.removeAttribute('src');
        video.style.display = '';
        video.loop = !entry.once;
        video.src = entry.src;
        video.play().catch(() => {});
      } else {
        video.pause();
        video.removeAttribute('src');
        video.style.display = 'none';
        img.style.display = '';
        img.src = entry.src;
        img.alt = entry.alt;
      }
      /* Carousel slides are square and crop to fit; archive entries
         carry their own aspect and are shown whole (.lb-fit sizes the
         figure, and the counter, off --lb-ar). */
      lb.classList.toggle('lb-fit', !!entry.ar);
      if (entry.ar) lb.style.setProperty('--lb-ar', entry.ar.toFixed(4));
      currentEl.textContent = pad(index + 1);
      totalEl.textContent = '/' + pad(set.length);
    };

    /* Directional slide between images: the current one glides out ~32px
       the way the viewer is travelling while fading, the next glides in
       from the opposite side on --ease-soft. The incoming image is
       decoded first so the slide never plays on a blank frame. Inline
       styles only; cleanup restores the stylesheet's own transitions. */
    const SLIDE_TRAVEL = 32; // px
    const rootStyle = getComputedStyle(document.documentElement);
    const EASE_SOFT = (rootStyle.getPropertyValue('--ease-soft') || 'ease').trim();
    let stepTimers = [];
    const stepTimer = (fn, ms) => stepTimers.push(setTimeout(fn, ms));
    const stepReset = (el) => {
      el.style.transition = '';
      el.style.transform = '';
      el.style.opacity = '';
    };

    const step = (dir) => {
      index = (index + dir + set.length) % set.length;
      if (prefersReducedMotion) {
        render();
        return;
      }

      // A fresh step cancels whatever a previous one was mid-way through
      stepTimers.forEach(clearTimeout);
      stepTimers = [];

      const outgoing = img.style.display !== 'none' ? img : video;
      outgoing.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
      outgoing.style.opacity = '0';
      outgoing.style.transform = 'translateX(' + -dir * SLIDE_TRAVEL + 'px)';

      stepTimer(() => {
        render(); // swaps src + which media element shows
        const incoming = set[index].isVideo ? video : img;
        const other = incoming === img ? video : img;
        stepReset(other);
        incoming.style.transition = 'none';
        incoming.style.opacity = '0';
        incoming.style.transform = 'translateX(' + dir * SLIDE_TRAVEL + 'px)';

        const slideIn = () => {
          requestAnimationFrame(() => {
            incoming.style.transition =
              'opacity 0.4s ' + EASE_SOFT + ', transform 0.4s ' + EASE_SOFT;
            incoming.style.opacity = '1';
            incoming.style.transform = 'translateX(0)';
            stepTimer(() => stepReset(incoming), 450);
          });
        };
        // Wait for the pixels before sliding in (images only; a cached
        // image resolves immediately, a slow one holds at most a beat)
        if (!set[index].isVideo && img.decode) {
          Promise.race([
            img.decode().catch(() => {}),
            new Promise((res) => setTimeout(res, 350)),
          ]).then(slideIn);
        } else {
          slideIn();
        }
      }, 210);
    };

    /* Scroll the slide's carousel (instantly, behind the blur) so the
       landing slide is on-screen and the close flight always has a home */
    const ensureThumbVisible = (slide) => {
      const track = slide.closest('.carousel');
      if (!track) {
        // Archive tiles live in the page flow: scroll the window instead
        // so the close flight always has somewhere to land
        if (slide.closest('.varc')) {
          const r = slide.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight) {
            slide.scrollIntoView({ block: 'center', behavior: 'instant' });
          }
        }
        return;
      }
      const tr = track.getBoundingClientRect();
      const sr = slide.getBoundingClientRect();
      if (sr.left >= tr.left - 1 && sr.right <= tr.right + 1) return;
      const target = sr.left - tr.left + track.scrollLeft;
      track.scrollLeft = Math.max(
        0,
        Math.min(target, track.scrollWidth - track.clientWidth)
      );
    };

    /* FLIP the figure from the clicked thumbnail to its centred rest
       position (both are squares, so the scale is uniform) */
    const flyFrom = (rect) => {
      // Settle any interrupted close flight before measuring
      figure.style.transition = 'none';
      figure.style.transform = 'none';
      void figure.offsetWidth;
      const target = figure.getBoundingClientRect();
      const dx = rect.left - target.left;
      const dy = rect.top - target.top;
      const s = rect.width / target.width;
      figure.style.transformOrigin = 'top left';
      figure.style.transition = 'none';
      figure.style.transform =
        'translate(' + dx + 'px, ' + dy + 'px) scale(' + s + ')';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          figure.style.transition = 'transform 0.65s ' + EASE;
          figure.style.transform = 'none';
        });
      });
    };

    const open = (images, startIndex, originThumb, viaPointer) => {
      if (!lightboxMQ.matches) return;
      /* The close button is focused below so the dialog owns the
         keyboard, and Chrome matches :focus-visible on a programmatic
         focus even when the viewer was opened with a mouse, which left
         a ring around the close circle. Suppress it for a pointer open
         only; a keyboard open (click detail 0) and any later Tab keep
         the ring, which is the dialog's one focus indicator. */
      lb.classList.toggle('lb-no-ring', !!viaPointer);
      set = images;
      index = startIndex;
      isOpen = true;
      lastFocus = document.activeElement;
      clearTimeout(hideTimer);
      figure.style.opacity = '';
      render();
      document.documentElement.classList.add('lb-lock');
      // Mount the backdrop first, then open on the next frame so its
      // opacity fade (and the figure FLIP) actually transition
      lb.classList.add('is-mount');
      requestAnimationFrame(() => {
        lb.classList.add('is-open');
        if (!prefersReducedMotion && originThumb) {
          flyFrom(originThumb.getBoundingClientRect());
        }
        closeBtn.focus({ preventScroll: true });
      });
    };

    const close = () => {
      if (!isOpen) return;
      isOpen = false;

      // Reverse of the open flight: snap the carousel (behind the blur)
      // so the landing slide is on-screen, then fly the image home while
      // the backdrop unblurs. Visibility cuts at 0.65s, exactly as the
      // figure lands over the real slide.
      const thumb = set[index].thumb;
      ensureThumbVisible(thumb);
      lb.classList.remove('is-open');

      const r = thumb.getBoundingClientRect();
      const inView =
        r.right > 0 &&
        r.left < window.innerWidth &&
        r.bottom > 0 &&
        r.top < window.innerHeight;
      if (!prefersReducedMotion && inView) {
        // Whichever media element is showing (the other is display: none)
        const target = (set[index].isVideo ? video : img).getBoundingClientRect();
        if (target.width > 0) {
          // Hold the image fully visible for the whole flight; the
          // inline transition (transform only) also stops the base
          // opacity fade from applying
          figure.style.opacity = '1';
          figure.style.transformOrigin = 'top left';
          figure.style.transition = 'transform 0.65s ' + EASE;
          figure.style.transform =
            'translate(' + (r.left - target.left) + 'px, ' +
            (r.top - target.top) + 'px) scale(' + r.width / target.width + ')';
        }
      }

      hideTimer = setTimeout(() => {
        lb.classList.remove('is-mount');
        figure.style.transition = 'none';
        figure.style.transform = 'none';
        figure.style.opacity = '';
        img.removeAttribute('src');
        video.pause();
        video.removeAttribute('src');
      }, 660);

      document.documentElement.classList.remove('lb-lock');
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    };

    openLightbox = open;

    // Dragged below the desktop size while open: there is no viewer there
    lightboxMQ.addEventListener('change', () => {
      if (!lightboxMQ.matches) close();
    });

    zonePrev.addEventListener('click', () => step(-1));
    zoneNext.addEventListener('click', () => step(1));
    closeBtn.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'Tab') {
        // The close button is the dialog's only tab stop
        e.preventDefault();
        lb.classList.remove('lb-no-ring'); // keyboard now: show the ring
        closeBtn.focus();
      }
    });

    // Inject a loupe button into every slide that holds an image or video
    carousels.forEach((root) => {
      const slides = root.querySelectorAll('.slide');
      const images = [];
      slides.forEach((slide) => {
        const media = slide.querySelector('img, video');
        if (!media) return;
        const entry = {
          src: media.getAttribute('src'),
          alt: slide.getAttribute('aria-label') || '',
          isVideo: media.tagName === 'VIDEO',
          thumb: slide,
        };
        const at = images.length;
        images.push(entry);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'slide-zoom';
        btn.setAttribute('aria-label', 'View image larger');
        const icon = document.createElement('img');
        icon.src = 'images/carousel/loupe.svg';
        icon.alt = '';
        btn.appendChild(icon);
        slide.appendChild(btn);
        // The whole slide opens the viewer (the loupe click bubbles here
        // too); post-drag clicks are already suppressed by the carousel.
        // open() itself declines off desktop.
        slide.addEventListener('click', (e) =>
          open(images, at, slide, e.detail > 0)
        );
      });
    });
  })();

  /* Nav: hide on scroll down, reveal on scroll up */
  const nav = document.querySelector('.site-nav');
  if (nav) {
    let lastY = window.scrollY;
    let ticking = false;
    const DELTA = 6; // ignore micro-jitter
    const TOP_ZONE = 80; // always visible near the top

    const onScroll = () => {
      const y = window.scrollY;
      if (y <= TOP_ZONE) {
        nav.classList.remove('is-hidden');
      } else if (y > lastY + DELTA) {
        nav.classList.add('is-hidden');
      } else if (y < lastY - DELTA) {
        nav.classList.remove('is-hidden');
      }
      if (Math.abs(y - lastY) > DELTA) lastY = y;
      ticking = false;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(onScroll);
        }
      },
      { passive: true }
    );
  }

  /* Mobile menu: the nav collapses behind a Menu pill (reference/
     mobile-menu-default.png + mobile-menu-open.png). Opening mounts a
     page-blur backdrop (display-toggled, faded by opacity only) and
     the links drop in one by one; Close reverses the
     stagger back toward the pill, then the blur fades out. Scroll
     locks while open so closing lands exactly where the page was.
     The pill and backdrop only show under the 640px media query. */
  if (nav) {
    const menuList = nav.querySelector('ul');
    if (menuList && !menuList.id) menuList.id = 'site-menu';

    const menuBtn = document.createElement('button');
    menuBtn.type = 'button';
    menuBtn.className = 'menu-btn';
    menuBtn.textContent = 'Menu';
    menuBtn.setAttribute('aria-expanded', 'false');
    if (menuList) menuBtn.setAttribute('aria-controls', menuList.id);
    nav.insertBefore(menuBtn, nav.firstChild);

    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    let menuOpen = false;
    let unmountTimer;

    const openMenu = () => {
      menuOpen = true;
      clearTimeout(unmountTimer);
      menuBtn.textContent = 'Close';
      menuBtn.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('menu-lock');
      // Mount first, open next frame so the opacity fade transitions.
      // Guarded: a same-frame close must not let this strand the menu open.
      backdrop.classList.add('is-mount');
      requestAnimationFrame(() => {
        if (!menuOpen) return;
        backdrop.classList.add('is-open');
        nav.classList.add('is-menu-open');
      });
    };

    const closeMenu = () => {
      if (!menuOpen) return;
      menuOpen = false;
      menuBtn.textContent = 'Menu';
      menuBtn.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-menu-open');
      backdrop.classList.remove('is-open');
      document.documentElement.classList.remove('menu-lock');
      // Links out by 0.76s, blur fade done by 0.75s
      unmountTimer = setTimeout(() => {
        backdrop.classList.remove('is-mount');
      }, 800);
    };

    menuBtn.addEventListener('click', () => {
      if (menuOpen) closeMenu();
      else openMenu();
    });
    backdrop.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => {
      if (menuOpen && e.key === 'Escape') closeMenu();
    });
    // Any link tap closes: page links navigate anyway, but the archive
    // sub-links swap the view in place and would leave the menu up
    if (menuList) {
      menuList.addEventListener('click', (e) => {
        if (e.target.closest('a')) closeMenu();
      });
    }
    // Leaving the mobile breakpoint with the menu up would strand the
    // blur and scroll lock on the desktop layout
    const mobileMq = window.matchMedia('(max-width: 640px)');
    mobileMq.addEventListener('change', (e) => {
      if (!e.matches) closeMenu();
    });
  }

  /* Grid overlay: press "g" to toggle (dev aid) */
  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 12; i++) overlay.appendChild(document.createElement('div'));
  document.body.appendChild(overlay);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'g' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = e.target.tagName;
      if (t !== 'INPUT' && t !== 'TEXTAREA') overlay.classList.toggle('on');
    }
  });

  /* Set by the horizontal archive band further down; the Design/Logos
     switch and the layout switch both re-render it when it comes back
     on screen, since it measures nothing while it is display:none.
     Declared up here so setView below can reach it. */
  let renderArc = null;

  /* Set by the vertical archive grid further down. Switching INTO the
     vertical view replays its reveal rather than revealing the content
     already sitting there, per Nick 2026-10-13: the horizontal band
     already restarts (its ripple is a CSS animation, and display
     toggling restarts those), so the two views now behave alike. */
  let playVerticalReveal = null;
  const REVEAL_ON_SWITCH = 0.12; // seconds; no intro sweep to wait out here

  /* Archive: Design / Logos are filtered views of one page. The view
     swaps the intro copy and the active mark on the nav sub-links.
     Runs before the load reveal below so the sweep splits the right
     copy on a direct ?view=logos visit. */
  if (document.body.dataset.page === 'archive') {
    const intro = document.querySelector('.intro');
    const subLinks = document.querySelectorAll('.site-nav .nav-sub a');
    // \u00a0 glues each intro's last words so it cannot end on a runt
    const INTRO_COPY = {
      design:
        'A collection of past work, personal projects, and visual experiments that were left on the cutting room\u00a0floor.',
      logos: 'Brand symbols and logotypes from projects past and\u00a0present.',
    };

    const setView = (view) => {
      const was = document.body.dataset.view;
      intro.textContent = INTRO_COPY[view];
      document.body.dataset.view = view;
      subLinks.forEach((a) =>
        a.classList.toggle('is-active', a.dataset.view === view)
      );
      try {
        history.replaceState(
          null,
          '',
          location.pathname + (view === 'logos' ? '?view=logos' : '')
        );
      } catch (e) {}
      // Coming BACK to Design un-hides whichever layout is stored. Only
      // on a real change: re-picking the view you are on should not
      // throw the content away and rebuild it.
      if (view === 'design' && was === 'logos') {
        if (document.documentElement.dataset.layout === 'horizontal') {
          requestAnimationFrame(() => renderArc && renderArc());
        } else if (playVerticalReveal) {
          playVerticalReveal(REVEAL_ON_SWITCH);
        }
      }
    };

    const params = new URLSearchParams(location.search);
    setView(params.get('view') === 'logos' ? 'logos' : 'design');

    // Switching views swaps in place (no reload) and replays the sweep
    subLinks.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (a.classList.contains('is-active')) return;
        // A view switch is a "new page": land at the top so the incoming
        // view's entrance animations play in front of the reader instead
        // of off-screen (both scrolling layouts can be deep-scrolled)
        window.scrollTo({ top: 0, behavior: 'instant' });
        setView(a.dataset.view);
        if (prefersReducedMotion) return;
        intro.classList.remove('is-play');
        splitReveal(intro, 0);
        intro.classList.add('is-split');
        // Two frames so the hidden state paints before transitioning
        requestAnimationFrame(() => {
          requestAnimationFrame(() => intro.classList.add('is-play'));
        });
      });
    });
  }

  /* Info page: accordions, the sticky office-camera button, and the
     photo hover effect */
  if (document.body.dataset.page === 'info') {
    /* Accordion: one section open at a time. Opening an item closes the
       previous one; clicking the open item closes it. */
    const accCol = document.querySelector('.acc-col');
    const accItems = document.querySelectorAll('.acc-item');
    accItems.forEach((item) => {
      item.querySelector('.acc-head button').addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        accItems.forEach((other) => {
          const open = other === item && willOpen;
          other.classList.toggle('is-open', open);
          other
            .querySelector('.acc-head button')
            .setAttribute('aria-expanded', String(open));
        });
        // the closed rows dim while something is open
        accCol.classList.toggle('has-open', willOpen);
      });
    });

    /* Office camera (reference/info-update mocks): the centred pill
       toggles the live window that fades + rises in above it; the pill's
       label flips to Close while the window is up. Esc also closes. */
    const officeBtn = document.querySelector('.office-btn');
    const officeCam = document.querySelector('.office-cam');
    if (officeBtn && officeCam) {
      // the TEXT roll only: the home icon is its own .roll (.icon-roll),
      // and writing label text into it would wipe its svgs
      const btnLabels = officeBtn.querySelectorAll(
        '.roll:not(.icon-roll) > span'
      );

      /* Clock: Nick's wall-clock time in Pacific (label reads PST per the
         design), dot green while "online", 9am-5pm Pacific every day */
      const timeEl = officeCam.querySelector('.office-cam-time');
      const statusEl = officeCam.querySelector('.office-cam-status');
      const timeFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Vancouver',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      const hourFmt = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Vancouver',
        hour: 'numeric',
        hourCycle: 'h23',
      });
      const tickClock = () => {
        const now = new Date();
        const hour = parseInt(hourFmt.format(now), 10);
        const online = hour >= 9 && hour < 17;
        // Outside office hours the status and the check-back note ride
        // the clock's brackets: mornings promise "soon" (Nick is in
        // later today), evenings "tomorrow",
        // e.g. "9:12:20 PM PST (OFFLINE - CHECK BACK TOMORROW)"
        timeEl.textContent =
          timeFmt.format(now) +
          ' PST' +
          (online
            ? ''
            : ' (OFFLINE - CHECK BACK ' +
              (hour < 9 ? 'SOON' : 'TOMORROW') +
              ')');
        statusEl.classList.toggle('is-online', online);
        officeCam.classList.toggle('is-offline', !online);
        // The loop only runs while "live": offline shows the empty-desk
        // still over it, so pause the decode. Ticking every second also
        // catches the 9/17h boundary crossing while the window is open.
        if (camVideo && officeCam.classList.contains('is-open')) {
          if (online && camVideo.paused) {
            camVideo.play().catch(() => {});
          } else if (!online && !camVideo.paused) {
            camVideo.pause();
          }
        }
      };

      /* The "live view" is a looping video faking a webcam feed; it only
         plays while the window is open (the still poster covers load) */
      const camVideo = officeCam.querySelector(
        'video.office-cam-media:not(.office-cam-wave)'
      );

      /* "Say Hi": each click plays the next one-shot reply clip (wave,
         then peace sign) layered over the loop, which keeps running
         underneath so the hand-back is seamless. Once the replies run
         out, further clicks get the do-not-disturb note; spam would
         break the live-feed fiction. */
      const hiBtn = officeCam.querySelector('.office-cam-hi');
      const waveClips = [
        ...officeCam.querySelectorAll('video.office-cam-wave'),
      ];
      let waves = 0; // index of the next reply clip
      let dndTimer;
      const stopWave = () => {
        officeCam.classList.remove('is-dnd');
        clearTimeout(dndTimer);
        waveClips.forEach((clip) => {
          clip.pause();
          clip.classList.remove('is-playing');
        });
      };
      if (hiBtn && waveClips.length) {
        waveClips.forEach((clip) => {
          clip.addEventListener('ended', () => {
            clip.classList.remove('is-playing');
          });
        });
        hiBtn.addEventListener('click', () => {
          if (waves >= waveClips.length) {
            officeCam.classList.add('is-dnd');
            clearTimeout(dndTimer);
            dndTimer = setTimeout(() => {
              officeCam.classList.remove('is-dnd');
            }, 2400);
            return;
          }
          const clip = waveClips[waves];
          waves++;
          // a click landing mid-reply cuts to the next clip
          waveClips.forEach((other) => {
            if (other !== clip) {
              other.pause();
              other.classList.remove('is-playing');
            }
          });
          clip.currentTime = 0;
          const started = clip.play();
          if (started) {
            // reveal only once playback actually starts, so the swap
            // never flashes an undecoded frame
            started
              .then(() => clip.classList.add('is-playing'))
              .catch(() => {});
          }
        });
      }

      /* Live weather for the window: real Squamish, BC conditions from
         Open-Meteo (free, keyless, CORS-open). Fetched only when the
         window opens, reused for 10 minutes; if the request fails the
         row simply never appears. */
      const weatherEl = officeCam.querySelector('.office-cam-weather');
      const weatherIconEl = officeCam.querySelector(
        '.office-cam-weather .office-cam-wicon'
      );
      const weatherTempEl = officeCam.querySelector('.office-cam-temp');
      const WEATHER_ICONS = {
        sun:
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<circle cx="9" cy="9" r="3.2" stroke="currentColor" stroke-width="1.3"/>' +
          '<path d="M9 1.8v1.7M9 14.5v1.7M1.8 9h1.7M14.5 9h1.7M3.9 3.9l1.2 1.2M12.9 12.9l1.2 1.2M14.1 3.9l-1.2 1.2M5.1 12.9l-1.2 1.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        suncloud:
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M11.6 1.9v1.3M16.3 6.6h1.3M14.9 3.3l.9-.9M8.3 3.3l-.9-.9M8.8 6.4a3 3 0 1 1 5.3 2.8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
          '<path d="M4.4 15.1h6.4a2.6 2.6 0 0 0 .3-5.2 3.7 3.7 0 0 0-7.2 1 2.2 2.2 0 0 0 .5 4.2Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
        cloud:
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M5 13.8h7.4a2.9 2.9 0 0 0 .3-5.8 4.1 4.1 0 0 0-8 1.1 2.5 2.5 0 0 0 .3 4.7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
        rain:
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M5 11.4h7.4a2.9 2.9 0 0 0 .3-5.8 4.1 4.1 0 0 0-8 1.1 2.5 2.5 0 0 0 .3 4.7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
          '<path d="M6.1 13.4l-.7 1.9M9.4 13.4l-.7 1.9M12.7 13.4l-.7 1.9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>',
        snow:
          '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M5 11.4h7.4a2.9 2.9 0 0 0 .3-5.8 4.1 4.1 0 0 0-8 1.1 2.5 2.5 0 0 0 .3 4.7Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>' +
          '<path d="M5.9 14.3h.01M9 15.3h.01M12.1 14.3h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      };
      /* WMO weather codes -> icon buckets */
      const weatherIconFor = (code) => {
        if (code === 0) return 'sun';
        if (code === 1 || code === 2) return 'suncloud';
        if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
        if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
        return 'cloud';
      };

      let weatherFetchedAt = 0;
      const loadWeather = () => {
        if (Date.now() - weatherFetchedAt < 10 * 60 * 1000) return;
        fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=49.7016&longitude=-123.1558&current=temperature_2m,weather_code'
        )
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            const now = data && data.current;
            if (!now || typeof now.temperature_2m !== 'number') return;
            weatherFetchedAt = Date.now();
            weatherTempEl.textContent = Math.round(now.temperature_2m) + '°C';
            weatherIconEl.innerHTML = WEATHER_ICONS[weatherIconFor(now.weather_code)];
            weatherEl.classList.add('has-data');
          })
          .catch(() => {});
      };

      /* Location <-> weather rotation: the meta column rolls up one
         18px line every 5s (location / weather / location-duplicate);
         landing on the duplicate snaps back to the top without a
         transition, so the loop always rolls the same direction. */
      const metaRoll = officeCam.querySelector('.office-cam-meta-roll');
      const META_SLIDE_H = 18;
      const META_HOLD_MS = 5000;
      let metaTimer = null;
      let metaSnapTimer = null;
      let metaIndex = 0;

      const setMetaIndex = (index, animate) => {
        metaIndex = index;
        if (!animate) metaRoll.style.transition = 'none';
        metaRoll.style.transform =
          'translateY(' + index * -META_SLIDE_H + 'px)';
        if (!animate) {
          metaRoll.getBoundingClientRect(); // commit the jump first
          metaRoll.style.transition = '';
        }
      };

      const rotateMeta = () => {
        // No weather yet: the location line just holds
        if (!weatherEl.classList.contains('has-data')) return;
        setMetaIndex(metaIndex + 1, true);
        if (metaIndex === 2) {
          metaSnapTimer = setTimeout(() => setMetaIndex(0, false), 600);
        }
      };

      let clockTimer = null;
      const setOpen = (open) => {
        officeCam.classList.toggle('is-open', open);
        officeBtn.setAttribute('aria-expanded', String(open));
        // both roll copies flip so the hover roll stays truthful
        btnLabels.forEach((labelCopy) => {
          labelCopy.textContent = open ? 'Close' : 'Visit me in the office';
        });
        if (open) {
          // tickClock also starts/pauses the loop per the online state
          // (is-open is already set above), so no play() call here
          tickClock();
          clockTimer = setInterval(tickClock, 1000); // seconds are shown
          loadWeather();
          setMetaIndex(0, false);
          metaTimer = setInterval(rotateMeta, META_HOLD_MS);
          // fetch the reply clips now so Say Hi answers instantly
          waveClips.forEach((clip) => {
            if (clip.preload === 'none') {
              clip.preload = 'auto';
              clip.load();
            }
          });
        } else {
          clearInterval(clockTimer);
          clearInterval(metaTimer);
          clearTimeout(metaSnapTimer);
          if (camVideo) camVideo.pause();
          stopWave(); // a mid-wave close must not leave the clip running
        }
      };

      officeBtn.addEventListener('click', () => {
        setOpen(!officeCam.classList.contains('is-open'));
      });

      // Clicking anywhere off the window dismisses it, same manners as
      // the settings panel and the archive switches. The pill is
      // excluded or its own click would toggle the window right back.
      document.addEventListener('pointerdown', (e) => {
        if (
          officeCam.classList.contains('is-open') &&
          !officeCam.contains(e.target) &&
          !officeBtn.contains(e.target)
        ) {
          setOpen(false);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && officeCam.classList.contains('is-open')) {
          setOpen(false);
        }
      });
    }

    /* Photo hover: the "random" effect from Codrops' WebGL mouseover
       demo (github.com/akella/webgl-mouseover-effects, step3, MIT).
       There it is a full-screen three.js post pass; here it is a raw
       WebGL canvas over the headshot, same shader math in viewport
       units so it reads at the demo's scale: a soft cursor disc (0.1
       viewport widths) scatters pixels by a fixed per-pixel hash and
       brightens them, scaled by cursor speed. The canvas only shows
       while something is moving; at rest the plain <img> is what you
       see. Samples that land off the photo draw --bg, as the demo's
       scatter would pull in the page around the image. */
    const photoWrap = document.querySelector('.info-photo');
    const photoImg = photoWrap && photoWrap.querySelector('img');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (photoImg && canHover && !prefersReducedMotion) {
      const canvas = document.createElement('canvas');
      canvas.className = 'info-photo-fx';
      canvas.setAttribute('aria-hidden', 'true');
      const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
      const VERT =
        'attribute vec2 p; varying vec2 vUv;' +
        'void main(){ vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }';
      const FRAG = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D tex;',
        'uniform vec2 uSize;',     // photo, CSS px
        'uniform vec2 uView;',     // viewport, CSS px
        'uniform vec2 uMouse;',    // trailing cursor, photo px (y up)
        'uniform float uVelo;',
        'uniform vec3 uBg;',
        'float hash12(vec2 p){ float h = dot(p, vec2(127.1, 311.7)); return fract(sin(h) * 43758.5453123); }',
        'void main(){',
        '  vec2 px = vUv * uSize;',
        // demo: circle(uv, mouse, 0, 0.1 + velo*0.01), distance in viewport widths
        '  float dist = length(px - uMouse) / uView.x;',
        '  float b = 0.1 + uVelo * 0.01;',
        '  float c = smoothstep(b, -b, dist) * 10.0 * uVelo;',
        '  float hash = hash12((px / uView) * 10.0);',
        // demo offset is in screen UV; convert to photo UV
        '  vec2 uv = vUv + vec2(hash - 0.5) * c * uView / uSize;',
        '  vec4 col = vec4(uBg, 1.0);',
        '  if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {',
        '    vec4 t = texture2D(tex, vec2(uv.x, 1.0 - uv.y));',
        '    col = vec4(mix(uBg, t.rgb, t.a), 1.0);',
        '  }',
        '  gl_FragColor = vec4(col.rgb + col.rgb * c, 1.0);',
        '}',
      ].join('\n');

      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
      };
      const vs = gl && compile(gl.VERTEX_SHADER, VERT);
      const fs = gl && compile(gl.FRAGMENT_SHADER, FRAG);
      const prog = vs && fs && gl.createProgram();
      if (prog) {
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
      }

      if (prog && gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const aP = gl.getAttribLocation(prog, 'p');
        gl.enableVertexAttribArray(aP);
        gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);
        const u = {};
        ['tex', 'uSize', 'uView', 'uMouse', 'uVelo', 'uBg'].forEach((n) => {
          u[n] = gl.getUniformLocation(prog, n);
        });
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(u.tex, 0);

        let ready = false;
        let rect = null;
        const mouse = { x: -1e4, y: -1e4 };   // viewport px
        const follow = { x: -1e4, y: -1e4 };
        const prev = { x: -1e4, y: -1e4 };
        let targetSpeed = 0;
        let rafId = 0;
        let last = 0;

        const bgRgb = () => {
          const m = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g) || [0, 0, 0];
          return m.slice(0, 3).map((v) => v / 255);
        };

        const sizeCanvas = () => {
          rect = photoImg.getBoundingClientRect();
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(rect.width * dpr);
          canvas.height = Math.round(rect.height * dpr);
          gl.viewport(0, 0, canvas.width, canvas.height);
        };

        const draw = (velo) => {
          rect = photoImg.getBoundingClientRect();
          gl.uniform2f(u.uSize, rect.width, rect.height);
          gl.uniform2f(u.uView, window.innerWidth, window.innerHeight);
          gl.uniform2f(u.uMouse, follow.x - rect.left, rect.bottom - follow.y);
          gl.uniform1f(u.uVelo, velo);
          gl.uniform3fv(u.uBg, bgRgb());
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        };

        /* The demo steps per frame at 60fps; dt-scale it so 120Hz
           displays feel the same. Speed is in viewport units, as the
           demo measures it (x by width, y by height). */
        const tick = (now) => {
          const dt = Math.min((now - (last || now)) / 1000, 0.05) || 1 / 60;
          last = now;
          const f = dt * 60;
          const speed = Math.hypot(
            (mouse.x - prev.x) / window.innerWidth,
            (mouse.y - prev.y) / window.innerHeight
          ) / f;
          prev.x = mouse.x;
          prev.y = mouse.y;
          const k = 1 - Math.pow(0.9, f);
          targetSpeed += (speed - targetSpeed) * k;
          follow.x += (mouse.x - follow.x) * k;
          follow.y += (mouse.y - follow.y) * k;
          targetSpeed *= Math.pow(0.999, f);
          const velo = Math.min(targetSpeed, 0.05);

          if (velo < 0.0002) {
            targetSpeed = 0;
            photoWrap.classList.remove('is-fx');
            rafId = 0;
            last = 0;
            return;
          }
          draw(velo);
          photoWrap.classList.add('is-fx');
          rafId = requestAnimationFrame(tick);
        };

        window.addEventListener('pointermove', (e) => {
          if (e.pointerType !== 'mouse') return;
          if (prev.x < -1e3) { prev.x = follow.x = e.clientX; prev.y = follow.y = e.clientY; }
          mouse.x = e.clientX;
          mouse.y = e.clientY;
          if (!ready || rafId) return;
          /* Only wake near the photo: the disc's reach is 0.1 of the
             viewport width, so past that nothing on it can change. */
          const r = photoImg.getBoundingClientRect();
          const reach = window.innerWidth * 0.1;
          if (e.clientX < r.left - reach || e.clientX > r.right + reach ||
              e.clientY < r.top - reach || e.clientY > r.bottom + reach) return;
          rafId = requestAnimationFrame(tick);
        }, { passive: true });

        window.addEventListener('resize', () => { if (ready) sizeCanvas(); });

        /* Wait for the image and for its load choreography (rise + the
           blur pull to focus) to finish: the canvas would otherwise
           pop a sharp, settled photo over one still arriving. */
        const start = () => {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photoImg);
          photoWrap.appendChild(canvas);
          sizeCanvas();
          const anims = [photoWrap, photoImg].flatMap((el) =>
            el.getAnimations ? el.getAnimations() : []);
          Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(() => {
            ready = true;
          });
        };
        if (photoImg.complete && photoImg.naturalWidth) start();
        else photoImg.addEventListener('load', start, { once: true });
      }
    }

  }

  /* Clipboard write with a fallback for non-secure contexts (file://). */
  const copyText = (text, onDone) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone, () => {});
      return;
    }
    const scratch = document.createElement('textarea');
    scratch.value = text;
    scratch.setAttribute('readonly', '');
    scratch.style.position = 'absolute';
    scratch.style.left = '-9999px';
    document.body.appendChild(scratch);
    scratch.select();
    try {
      document.execCommand('copy');
      onDone();
    } catch (e) {}
    scratch.remove();
  };

  /* Contact: clicking the email address (or the Copy Email pill that
     appears beside it) copies the address to the clipboard; the pill's
     label flips to "Copied to clipboard", then the pill fades away on
     its own (clicking leaves focus on the row, so without the dismiss
     the :focus-within pin would hold the pill until a click elsewhere). */
  if (document.body.dataset.page === 'contact') {
    const emailRow = document.querySelector('.email-row');
    const emailLink = document.querySelector('.contact-email-link');
    const copyBtn = document.querySelector('.copy-email-btn');
    const status = document.querySelector('.email-row [role="status"]');
    const EMAIL = 'hello@nickjohnston.ca';
    let dismissTimer = null;
    let resetTimer = null;

    const setLabel = (text) => {
      copyBtn.querySelectorAll('.roll > span').forEach((s) => {
        s.textContent = text;
      });
    };

    const rearm = () => {
      if (!emailRow.classList.contains('is-dismissed')) return;
      emailRow.classList.remove('is-dismissed');
      clearTimeout(resetTimer);
      copyBtn.classList.remove('is-copied');
      setLabel('Copy Email');
      status.textContent = '';
    };

    const copied = () => {
      sfx('success');
      emailRow.classList.remove('is-dismissed');
      copyBtn.classList.add('is-copied');
      setLabel('Copied to clipboard');
      status.textContent = 'Email address copied to clipboard';
      clearTimeout(dismissTimer);
      clearTimeout(resetTimer);
      dismissTimer = setTimeout(() => {
        emailRow.classList.add('is-dismissed');
        // Drop the focus pin so the fade isn't held open
        if (
          document.activeElement === emailLink ||
          document.activeElement === copyBtn
        ) {
          document.activeElement.blur();
        }
        // Restore the resting label once the fade has finished
        resetTimer = setTimeout(() => {
          copyBtn.classList.remove('is-copied');
          setLabel('Copy Email');
          status.textContent = '';
        }, 400);
      }, 3000);
    };

    /* The address rolls roman -> italic on hover but the link box keeps
       sizing to the (wider) roman copy, so the pill would sit in a gap
       that grows by whatever the italic gives back. Measure that slack
       from the two .roll copies and hand it to the CSS, which slides the
       pill closed by it. It differs per theme (Otto Light Italic gives
       back more than Regular Italic), so re-measure whenever the theme
       flips, and on resize for the mobile type step. */
    const measureItalicTrim = () => {
      const copies = emailLink.querySelectorAll('.roll > span');
      if (copies.length < 2) return;
      const inkWidth = (el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().width;
      };
      const slack = inkWidth(copies[0]) - inkWidth(copies[1]);
      emailRow.style.setProperty(
        '--email-italic-trim',
        (slack > 0 ? slack : 0).toFixed(2) + 'px'
      );
    };

    /* Both cuts have to be DOWNLOADED before they can be measured, or the
       two copies still share the fallback's metrics and the slack reads 0.
       A theme flip changes the weight, so it needs a fresh pair loaded
       too: ask for them by name and measure once they land. */
    const remeasureItalicTrim = () => {
      if (!document.fonts || !document.fonts.load) {
        measureItalicTrim();
        return;
      }
      const cs = getComputedStyle(emailLink);
      const face = cs.fontWeight + ' ' + cs.fontSize + " 'ABC Otto'";
      Promise.all([
        document.fonts.load(face),
        document.fonts.load('italic ' + face),
      ])
        .then(measureItalicTrim)
        .catch(measureItalicTrim);
    };

    remeasureItalicTrim();
    window.addEventListener('resize', remeasureItalicTrim);
    new MutationObserver(remeasureItalicTrim).observe(
      document.documentElement,
      { attributes: true, attributeFilter: ['data-theme'] }
    );

    // Leaving (or re-entering) the row after a dismiss re-arms the hover
    emailRow.addEventListener('mouseleave', rearm);
    emailRow.addEventListener('mouseenter', rearm);

    const copyEmail = () => copyText(EMAIL, copied);

    emailLink.addEventListener('click', (e) => {
      e.preventDefault(); // keep the mailto as a no-JS fallback only
      copyEmail();
    });
    copyBtn.addEventListener('click', copyEmail);
  }

  /* Footer (all pages): clicking the email address copies it instead of
     opening a mail client (the mailto stays as a no-JS fallback); the
     "Copied to clipboard" pill flashes beside the address, then fades
     away on its own. */
  const footerEmail = document.querySelector('.footer-email');
  if (footerEmail) {
    const cell = footerEmail.closest('.footer-email-cell');
    const footerStatus = cell.querySelector('[role="status"]');
    const footerAddress = footerEmail
      .getAttribute('href')
      .replace('mailto:', '');
    let footerHideTimer = null;

    footerEmail.addEventListener('click', (e) => {
      e.preventDefault();
      copyText(footerAddress, () => {
        sfx('success');
        cell.classList.add('is-copied');
        footerStatus.textContent = 'Email address copied to clipboard';
        clearTimeout(footerHideTimer);
        footerHideTimer = setTimeout(() => {
          cell.classList.remove('is-copied');
          footerStatus.textContent = '';
        }, 2200);
      });
    });
  }

  /* ---------------------------------------------------------------
     Design archive: one table drives BOTH views. The natural pixel
     dimensions size every image (the set no longer shares one aspect
     ratio), and col / span / off place it on the 12-column grid in the
     vertical view.

     Measured from reference/archive-design-layout-vertical-Oct14.png, a
     1512 frame: content width 1472, column 104.33, gutter 20. Files run
     01-30 in order, left to right, top to bottom, and the set is MIXED
     MEDIA (.png .jpg .gif .mp4), so each entry carries its own
     filename rather than a number plus an assumed extension.
     `off` is how far an image drops below the top of its band, as a
     percentage of its own grid area; `gap` is the space above each band,
     as a percentage of the content width. Both are percentages so the
     composition scales with the columns exactly as the aspect-driven
     image heights do. `pull` narrows an image inside its grid area and
     pins it to the area's right edge (04, which the mock sets 528 wide
     inside a 5-column area).
  --------------------------------------------------------------- */
  const DESIGN_BANDS = [
  { gap: 0.00, items: [
    { n: 1, f: '01.jpg', w: 1089, h: 871, col: 1, span: 6 },
    { n: 2, f: '02.jpg', w: 529, h: 609, col: 10, span: 3, off: 77.05 },
  ] },
  { gap: 6.96, items: [
    { n: 3, f: '03.png', w: 528, h: 600, col: 4, span: 3 },
  ] },
  { gap: 5.36, items: [
    { n: 4, f: '04.jpg', w: 793, h: 691, col: 8, span: 5, pull: 87.76 },
    { n: 5, f: '05.png', w: 716, h: 633, col: 1, span: 4, off: 50.28 },
  ] },
  { gap: 12.09, items: [
    { n: 6, f: '06.mp4', w: 1000, h: 1000, col: 5, span: 4 },
    { n: 7, f: '07.jpg', w: 1500, h: 1500, col: 9, span: 4 },
  ] },
  { gap: 12.41, items: [
    { n: 8, f: '08.jpg', w: 903, h: 900, col: 1, span: 5 },
    { n: 9, f: '09.mp4', w: 864, h: 1080, col: 10, span: 3 },
  ] },
  { gap: 16.33, items: [
    { n: 10, f: '10.png', w: 714, h: 630, col: 9, span: 4 },
    { n: 11, f: '11.png', w: 705, h: 615, col: 5, span: 4, off: 43.58 },
  ] },
  { gap: 10.30, items: [
    { n: 12, f: '12.jpg', w: 1000, h: 707, col: 1, span: 5 },
  ] },
  { gap: 8.06, items: [
    { n: 13, f: '13.png', w: 600, h: 480, col: 8, span: 5 },
  ] },
  { gap: 12.14, items: [
    { n: 14, f: '14.png', w: 1276, h: 815, col: 1, span: 7 },
  ] },
  { gap: 12.02, items: [
    { n: 15, f: '15.mp4', w: 1080, h: 1080, col: 8, span: 4 },
    { n: 16, f: '16.png', w: 527, h: 737, col: 4, span: 3, off: 33.99 },
  ] },
  { gap: 15.38, items: [
    { n: 17, f: '17.png', w: 1088, h: 735, col: 4, span: 6 },
  ] },
  { gap: 11.52, items: [
    { n: 18, f: '18.mp4', w: 1600, h: 1800, col: 2, span: 5 },
    { n: 19, f: '19.mp4', w: 724, h: 922, col: 9, span: 4, off: 113.13 },
  ] },
  { gap: 10.33, items: [
    { n: 20, f: '20.jpg', w: 711, h: 732, col: 1, span: 4 },
    { n: 21, f: '21.jpg', w: 714, h: 874, col: 9, span: 4, off: 51.12 },
  ] },
  { gap: 8.90, items: [
    { n: 22, f: '22.jpg', w: 726, h: 581, col: 2, span: 6 },
  ] },
  { gap: 13.52, items: [
    { n: 23, f: '23.png', w: 900, h: 1013, col: 8, span: 5 },
  ] },
  { gap: 2.91, items: [
    { n: 24, f: '24.mp4', w: 1440, h: 1080, col: 1, span: 5 },
  ] },
  { gap: 10.11, items: [
    { n: 25, f: '25.jpg', w: 529, h: 665, col: 10, span: 3 },
  ] },
  { gap: 10.63, items: [
    { n: 26, f: '26.jpg', w: 1275, h: 863, col: 1, span: 7 },
  ] },
  { gap: 9.77, items: [
    { n: 27, f: '27.jpg', w: 715, h: 697, col: 8, span: 4 },
  ] },
  { gap: 9.15, items: [
    { n: 28, f: '28.jpg', w: 901, h: 901, col: 2, span: 5 },
  ] },
  { gap: 8.04, items: [
    { n: 29, f: '29.jpg', w: 526, h: 660, col: 9, span: 3 },
  ] },
  { gap: 2.58, items: [
    { n: 30, f: '30.jpg', w: 900, h: 690, col: 1, span: 5 },
  ] },
];

  const DESIGN_BASE = 'images/archive/design/';
  // Reading order: the files are numbered in the order they appear
  const DESIGN_IMAGES = DESIGN_BANDS.reduce(
    (all, b) => all.concat(b.items), []
  ).sort((a, b) => a.n - b.n);
  const isDesignVideo = (spec) => /\.mp4$/i.test(spec.f);
  const designAlt = (spec) =>
    'Design archive item ' + spec.n + ' of ' + DESIGN_IMAGES.length;

  /* One media element per entry: the set mixes stills with .mp4, and the
     two layouts build the same thing, so it is made in one place.
     Videos are GIF-style, muted and looping, and carry no src yet.
     `once: true` on an entry opts it out of the loop and leaves it
     holding its last frame (01 is a title animation that resolves,
     not a cycle); the observer's play() on the way back in rewinds a
     finished video, so it replays each time it is scrolled to. */
  const designMedia = (spec) => {
    if (isDesignVideo(spec)) {
      const v = document.createElement('video');
      v.muted = true;
      v.loop = !spec.once;
      v.playsInline = true;
      v.autoplay = true;
      // Safari only honours these as attributes for inline autoplay
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('autoplay', '');
      if (v.loop) v.setAttribute('loop', '');
      v.preload = 'none'; // inert until the observer hands over a src
      v.setAttribute('role', 'img');
      v.setAttribute('aria-label', designAlt(spec));
      v.draggable = false;
      return v;
    }
    const img = document.createElement('img');
    img.alt = designAlt(spec);
    img.decoding = 'async';
    img.loading = 'lazy';
    img.draggable = false;
    return img;
  };

  /* The four videos come to ~20MB together, so neither layout hands one
     a src up front: this observer owns the load AND the play/pause, so
     the vertical grid, the desktop band and the phone carousel all get
     the same behaviour from one place. Pausing on the way out keeps
     off-screen copies (the band leaves hidden items parked at their last
     slot) from decoding for nothing. */
  let designVideoIO = null;
  const autoplayNearby = (video, src) => {
    if (!('IntersectionObserver' in window)) {
      video.src = src;
      return;
    }
    if (!designVideoIO) {
      designVideoIO = new IntersectionObserver(
        (rows) => {
          rows.forEach((row) => {
            const v = row.target;
            if (!row.isIntersecting) {
              v.pause();
              return;
            }
            if (!v.getAttribute('src')) {
              /* First approach: handing over the src is enough, autoplay
                 takes it from there. Calling play() in the same tick
                 races the load it just kicked off and the play is
                 aborted, which left videos sitting on frame zero. */
              v.setAttribute('src', v.dataset.src);
              return;
            }
            const playing = v.play(); // coming back after a pause
            if (playing) playing.catch(() => {}); // refused: leave the frame
          });
        },
        // all four sides: the phone carousel scrolls HORIZONTALLY, so a
        // vertical-only margin would never preload the next cell
        { rootMargin: '50%' }
      );
    }
    video.dataset.src = src;
    designVideoIO.observe(video);
  };

  /* Horizontal view: an infinite looping strip. One continuous position
     value (pos, in image indexes) drives everything: each image measures
     its shortest wrapped distance from pos and interpolates between the
     geometry slots below, so paging, dragging, and the loop seam all
     fall out of the same math.

     The slots are keyed to HEIGHT, not width: the images have mixed
     aspect ratios now, so a shared height is what keeps the strip
     reading as one band, and the gaps are packed from the real widths at
     render time (the only way a constant gap survives mixed aspects).
     The height ratios are the old width ratios, so the band sits at
     exactly the size it did when every image was 1195x1500: main 552
     tall at 1440, then 31.8 / 26.4 / 20 / 15.7 / 12.4% of it, opacity
     100/50/40/30/20%, and a constant 30px gap (5.435% of the main
     height). The last slot is the off-screen exit. */
  const band = document.querySelector('.arc-band');
  if (band) {
    const N = DESIGN_IMAGES.length;
    const counterEl = document.querySelector('.arc-current');

    const DESKTOP = {
      h: [1, 0.31818, 0.26364, 0.2, 0.15682, 0.12436],
      o: [1, 0.5, 0.4, 0.3, 0.2, 0],
      gap: 0.05435, // 30px against a 552px main image
    };
    const MOBILE = {
      h: [1, 0.41429, 0.34286, 0.28571, 0.24286, 0.2],
      o: [1, 0.5, 0.4, 0.3, 0.2, 0],
      gap: 0.0608, // 20px against a 329px main image at 375
    };
    const mq = window.matchMedia('(max-width: 640px)');
    const table = () => (mq.matches ? MOBILE : DESKTOP);

    const items = DESIGN_IMAGES.map((spec, i) => {
      const el = document.createElement('div');
      el.className = 'arc-item';
      el.style.setProperty('--ar', (spec.w / spec.h).toFixed(4));
      const tile = document.createElement('div');
      tile.className = 'arc-tile';
      // Load-reveal ripple: ring 0 is the centre image, rings grow
      // outwards, and the further out, the slower the fade
      const ring = Math.min(i, N - i);
      tile.style.setProperty('--ripple', ring * 0.1 + 's');
      tile.style.setProperty('--ripple-dur', 0.9 + ring * 0.15 + 's');
      const media = designMedia(spec);
      tile.appendChild(media);
      el.appendChild(tile);
      band.appendChild(el);
      return {
        el,
        media,
        isVideo: isDesignVideo(spec),
        ar: spec.w / spec.h,
        file: spec.f,
        loaded: false,
      };
    });

    let pos = 0; // continuous index; grows unbounded, wrapped per item
    let target = 0;
    let shownIdx = -1;
    let animId = null;
    let step = 1; // centre-to-neighbour distance from the last render

    // Shortest wrapped distance, in (-N/2, N/2]
    const wrap = (d) => {
      let r = d % N;
      if (r > N / 2) r -= N;
      if (r < -N / 2) r += N;
      return r;
    };

    const lerp = (a, b, f) => a + (b - a) * f;

    const render = () => {
      if (mq.matches) return; // the phone carousel lays itself out
      const t = table();
      const mainH = band.clientHeight;
      if (!mainH) return; // hidden in the vertical view: nothing to measure
      const gapPx = t.gap * mainH;
      const max = t.h.length - 1;

      // Each image's size at its current distance from the centre
      const size = new Array(N).fill(null);
      for (let i = 0; i < N; i++) {
        const ad = Math.abs(wrap(i - pos));
        if (ad >= max) continue;
        const lo = Math.floor(ad);
        const f = ad - lo;
        const s = lerp(t.h[lo], t.h[lo + 1], f);
        size[i] = {
          ad,
          s,
          w: mainH * s * items[i].ar,
          o: lerp(t.o[lo], t.o[lo + 1], f),
        };
      }

      /* Chain the visible images outwards from the pair straddling the
         centre, so neighbours always sit a constant gap apart however
         wide they happen to be. cx holds centres relative to the image
         just left of the centre point; the origin below re-bases them so
         pos lands the right image on the viewport centre. */
      const anchor = ((Math.floor(pos) % N) + N) % N;
      const cx = new Array(N).fill(null);
      if (!size[anchor]) return;
      cx[anchor] = 0;
      for (let dir = 1; dir >= -1; dir -= 2) {
        let prev = anchor;
        for (let k = 1; k < N; k++) {
          const i = (((anchor + dir * k) % N) + N) % N;
          if (!size[i] || cx[i] !== null) break;
          cx[i] = cx[prev] + dir * ((size[prev].w + size[i].w) / 2 + gapPx);
          prev = i;
        }
      }
      const next = (anchor + 1) % N;
      step = cx[next] !== null ? cx[next] : size[anchor].w + gapPx;
      const origin = (pos - Math.floor(pos)) * step;

      for (let i = 0; i < N; i++) {
        const it = items[i];
        const sz = size[i];
        if (!sz || cx[i] === null) {
          it.el.style.visibility = 'hidden';
          continue;
        }
        // Load lazily as media approaches the visible range
        if (!it.loaded) {
          it.loaded = true;
          if (it.isVideo) {
            autoplayNearby(it.media, DESIGN_BASE + it.file);
          } else {
            it.media.src = DESIGN_BASE + it.file;
            phApply(it.media); // blur-up while the tile streams in
          }
        }
        it.el.style.visibility = 'visible';
        it.el.style.opacity = sz.o.toFixed(3);
        it.el.style.zIndex = String(100 - Math.round(sz.ad * 10));
        it.el.style.transform =
          'translate(calc(-50% + ' + (cx[i] - origin).toFixed(2) + 'px), -50%) scale(' +
          sz.s.toFixed(4) + ')';
      }

      const idx = ((Math.round(pos) % N) + N) % N;
      if (idx !== shownIdx) {
        shownIdx = idx;
        counterEl.textContent = String(idx + 1).padStart(2, '0');
      }
    };
    renderArc = render;

    /* Phones swap the infinite band for the home page's carousel: one
       image per screen, native scroll + snap, pagination dots below
       (the arrows and the counter are already hidden there). The slot
       engine is skipped outright, so its inline transforms have to be
       cleared whenever the breakpoint flips into this mode. 22 dots is
       a lot, so they run tighter than the project carousels' 8px/10px;
       see the .arc .carousel-dots rules. */
    const dots = document.createElement('div');
    dots.className = 'carousel-dots';
    dots.style.setProperty('--dots-n', String(N)); // the gap is derived from it
    band.after(dots);

    const cellW = () => band.clientWidth || 1;

    const mobileIndex = () =>
      Math.max(0, Math.min(N - 1, Math.round(band.scrollLeft / cellW())));

    let dotIndex = -1;
    let scrollAnim = null;

    const syncDots = () => {
      const i = mobileIndex();
      if (i === dotIndex) return;
      dotIndex = i;
      Array.from(dots.children).forEach((dot, n) => {
        dot.classList.toggle('is-active', n === i);
        if (n === i) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      });
      counterEl.textContent = String(i + 1).padStart(2, '0');
    };

    /* Tapping a dot glides to that image on the project carousels'
       easing. Snapping is switched off for the flight or it fights the
       animation frame by frame. */
    const scrollToIndex = (i) => {
      const to = Math.max(0, Math.min(N - 1, i)) * cellW();
      if (scrollAnim) cancelAnimationFrame(scrollAnim);
      if (prefersReducedMotion) {
        band.scrollLeft = to;
        return;
      }
      const from = band.scrollLeft;
      const delta = to - from;
      if (!delta) return;
      const t0 = performance.now();
      band.classList.add('is-animating');
      const tick = (now) => {
        const k = Math.min((now - t0) / 850, 1);
        band.scrollLeft = from + delta * easeOutQuint(k);
        if (k < 1) {
          scrollAnim = requestAnimationFrame(tick);
        } else {
          scrollAnim = null;
          band.classList.remove('is-animating');
        }
      };
      scrollAnim = requestAnimationFrame(tick);
    };

    for (let i = 0; i < N; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', 'Go to image ' + (i + 1) + ' of ' + N);
      dot.addEventListener('click', () => scrollToIndex(i));
      dots.appendChild(dot);
    }

    band.addEventListener(
      'scroll',
      () => {
        if (mq.matches) syncDots();
      },
      { passive: true }
    );

    const setMobile = (on) => {
      if (on) {
        const at = ((Math.round(pos) % N) + N) % N;
        items.forEach((it) => {
          // Slot values belong to the engine; the scroll track lays the
          // items out itself
          it.el.style.transform = '';
          it.el.style.opacity = '';
          it.el.style.visibility = '';
          it.el.style.zIndex = '';
          if (!it.loaded) {
            it.loaded = true;
            if (it.isVideo) {
              // the observer still gates these: all four at once is ~20MB
              autoplayNearby(it.media, DESIGN_BASE + it.file);
            } else {
              it.media.src = DESIGN_BASE + it.file;
              phApply(it.media);
            }
          }
        });
        dotIndex = -1;
        // A frame for the flex track to lay out before it can be measured
        requestAnimationFrame(() => {
          band.scrollLeft = at * cellW();
          syncDots();
        });
      } else {
        /* Hand the engine back whichever image the carousel was
           showing. From the tracked index, not from scrollLeft: the
           items turn absolute with the breakpoint, which empties the
           scroller and zeroes scrollLeft before this can read it. */
        const at = dotIndex > 0 ? dotIndex : 0;
        band.scrollLeft = 0;
        pos = at;
        target = at;
        render();
      }
    };

    if (mq.addEventListener) {
      mq.addEventListener('change', (e) => setMobile(e.matches));
    }

    const animate = (duration = 700) => {
      if (animId) cancelAnimationFrame(animId);
      if (prefersReducedMotion) {
        pos = target;
        render();
        return;
      }
      const from = pos;
      const delta = target - from;
      if (!delta) return;
      const t0 = performance.now();
      const tick = (now) => {
        const k = Math.min((now - t0) / duration, 1);
        pos = from + delta * easeOutQuint(k);
        render();
        if (k < 1) animId = requestAnimationFrame(tick);
        else animId = null;
      };
      animId = requestAnimationFrame(tick);
    };

    const go = (dir) => {
      if (mq.matches) {
        scrollToIndex(mobileIndex() + dir); // no wrap: the track has ends
        return;
      }
      target = Math.round(target + dir);
      animate();
    };

    /* Drag / swipe: pixels map to position via the live centre-to-
       neighbour distance the last render worked out */
    const stepPx = () => step || 1;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startPos = 0;
    let lastX = 0;
    let lastT = 0;
    let velocity = 0;

    band.addEventListener('pointerdown', (e) => {
      if (mq.matches) return; // native scrolling owns the gesture here
      dragging = true;
      moved = false;
      startX = lastX = e.clientX;
      startPos = pos;
      lastT = performance.now();
      velocity = 0;
      target = Math.round(pos);
      if (animId) cancelAnimationFrame(animId);
      band.setPointerCapture(e.pointerId);
    });

    band.addEventListener('pointermove', (e) => {
      if (mq.matches) return;
      if (!dragging) {
        // Cursor hints at the click direction (left/right of centre)
        const left = e.clientX < window.innerWidth / 2;
        band.classList.toggle('cur-left', left);
        band.classList.toggle('cur-right', !left);
        return;
      }
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      pos = startPos - dx / stepPx();
      const now = performance.now();
      const dt = now - lastT;
      if (dt > 0) velocity = (e.clientX - lastX) / dt; // px per ms
      lastX = e.clientX;
      lastT = now;
      render();
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      // Project momentum forward, then settle on the nearest image
      target = Math.round(pos - (velocity * 160) / stepPx());
      animate(600);
    };

    band.addEventListener('pointerup', endDrag);
    band.addEventListener('pointercancel', endDrag);
    band.addEventListener('pointerleave', () => {
      band.classList.remove('cur-left', 'cur-right');
    });

    /* Trackpad / horizontal wheel swipes, like the native-scroll home
       carousels. macOS keeps streaming decaying inertia deltas after the
       fingers lift, so settle to the nearest image after a short idle. */
    let wheelTimer = null;
    band.addEventListener(
      'wheel',
      (e) => {
        if (mq.matches) return; // the track scrolls itself
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        if (animId) cancelAnimationFrame(animId);
        pos += e.deltaX / stepPx();
        target = Math.round(pos);
        render();
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => animate(500), 140);
      },
      { passive: false }
    );

    /* Click to navigate: left of centre pages back, right pages forward.
       A real drag suppresses the click. */
    band.addEventListener('click', (e) => {
      if (mq.matches) return; // a tap is not a page turn on a phone
      if (moved) {
        moved = false;
        return;
      }
      go(e.clientX < window.innerWidth / 2 ? -1 : 1);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (document.body.dataset.view === 'logos') return; // carousel hidden
      if (document.documentElement.dataset.layout !== 'horizontal') return;
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      go(e.key === 'ArrowLeft' ? -1 : 1);
    });

    window.addEventListener('resize', render);
    if (mq.matches) setMobile(true);
    else render();
  }

  /* Vertical view (reference/archive-update/archive-design-new-vertical-
     default.png): the same 22 images laid out on the 12-column grid from
     DESIGN_BANDS. Each band is one grid row, so the images inside it can
     overlap vertically; an image's drop inside its band is percentage
     padding (resolved against its own grid area) and the space above a
     band is a percentage margin (resolved against the content width), so
     the whole composition scales with the columns.

     Images fade up as they scroll in. */
  const varc = document.querySelector('.varc');
  if (varc) {
    const entries = DESIGN_IMAGES.map((spec) => ({
      src: DESIGN_BASE + spec.f,
      alt: designAlt(spec),
      isVideo: isDesignVideo(spec),
      once: !!spec.once, // holds its last frame, as in the grid
      ar: spec.w / spec.h,
      thumb: null,
    }));
    const byNumber = {};
    DESIGN_IMAGES.forEach((spec, i) => {
      byNumber[spec.n] = i;
    });
    const tiles = [];
    let order = 0;

    DESIGN_BANDS.forEach((bandSpec) => {
      const row = document.createElement('div');
      row.className = 'va-band';
      if (bandSpec.gap) row.style.setProperty('--gap', bandSpec.gap + '%');

      bandSpec.items.forEach((spec) => {
        const fig = document.createElement('figure');
        fig.className = 'va-item';
        fig.style.setProperty('--col', String(spec.col));
        fig.style.setProperty('--span', String(spec.span));
        if (spec.off) fig.style.setProperty('--off', spec.off + '%');
        if (spec.pull) {
          fig.style.setProperty('--pull', spec.pull + '%');
          fig.classList.add('va-pull');
        }
        /* Mobile keeps a simplified stagger: the wide images fill the
           column, the narrower ones stay narrow and alternate sides */
        fig.style.setProperty(
          '--mw',
          spec.span >= 6 ? '100%' : spec.span >= 4 ? '78%' : '62%'
        );
        if (spec.span < 6 && order % 2) fig.classList.add('va-right');

        const tile = document.createElement('div');
        tile.className = 'va-tile';
        tile.style.setProperty('--ar', (spec.w / spec.h).toFixed(4));

        const media = designMedia(spec);
        media.width = spec.w;
        media.height = spec.h;
        if (isDesignVideo(spec)) autoplayNearby(media, DESIGN_BASE + spec.f);
        else media.src = DESIGN_BASE + spec.f;
        tile.appendChild(media);

        // Same loupe affordance as the project carousels
        const zoom = document.createElement('button');
        zoom.type = 'button';
        zoom.className = 'slide-zoom';
        zoom.setAttribute('aria-label', 'View image larger');
        const icon = document.createElement('img');
        icon.src = 'images/carousel/loupe.svg';
        icon.alt = '';
        zoom.appendChild(icon);
        tile.appendChild(zoom);

        const at = byNumber[spec.n];
        entries[at].thumb = tile;
        tile.addEventListener('click', (e) => {
          if (openLightbox) openLightbox(entries, at, tile, e.detail > 0);
        });

        fig.appendChild(tile);
        row.appendChild(fig);
        tiles.push(tile);
        order += 1;
      });

      varc.appendChild(row);
    });

    /* Fade up on scroll (.va-rise -> .is-in), at every width (per Nick
       2026-10-12: the blur reveal is gone, first from phones, where it
       could stick on iOS Safari, then everywhere). One-way, like the home
       page's scroll reveals, and the classes are dropped once a tile has
       landed. */
    if (!prefersReducedMotion && 'IntersectionObserver' in window) {
      /* Entrance: the tiles already on screen rise one at a time. On
         LOAD the first picks up right as the ellipsis lands (its rise-in
         runs 1.4s-2.3s, and --ease-graceful puts it 97% of the way there
         by 1.89s); on a view switch there is no intro sweep to wait out,
         so it starts almost at once. Everything below the fold is
         re-armed either way and rises as it is scrolled to.
         Which tiles are on screen is measured HERE, synchronously,
         before the first paint: the observer's first callback lands a
         frame late, so hiding them there would flash the images at full
         opacity first. */
      const ENTER_AT = 1.9; // seconds; the ellipsis has landed by here
      const ENTER_STEP = 0.4; // gap between one image and the next

      /* A replay can land mid-flight, and a cancelled transition fires
         transitioncancel rather than transitionend, so the old listener
         would never clear itself. Park it on the tile and drop it by
         hand before re-arming. */
      const settle = (tile) => {
        if (!tile._vaDone) return;
        tile.removeEventListener('transitionend', tile._vaDone);
        tile._vaDone = null;
      };

      const rise = (tile) => {
        tile.classList.add('is-in');
        const done = (e) => {
          if (e.target !== tile || e.propertyName !== 'transform') return;
          settle(tile);
          tile.classList.remove('va-rise', 'is-in');
          tile.style.removeProperty('--va-d');
        };
        settle(tile);
        tile._vaDone = done;
        tile.addEventListener('transitionend', done);
      };

      let io = null;

      playVerticalReveal = (startAt) => {
        // A fresh observer: the old one has unobserved every tile that
        // already landed, and re-arming them is the whole point
        if (io) io.disconnect();
        io = new IntersectionObserver(
          (rows, obs) => {
            rows.forEach((row) => {
              if (!row.isIntersecting) return;
              rise(row.target);
              obs.unobserve(row.target);
            });
          },
          { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
        );

        tiles.forEach((tile) => {
          settle(tile);
          tile.classList.remove('is-in');
          tile.style.removeProperty('--va-d');
          tile.classList.add('va-rise');
        });
        /* Let the start state land as a computed style before anything
           releases it, or the tile would never start hidden. A recalc is
           not a paint, so nothing flashes. It also flushes the layout
           swap on a switch, so the rects below are the visible ones and
           not the zeroes a display:none grid reports. */
        void document.body.offsetHeight;

        let rising = 0;
        tiles.forEach((tile) => {
          if (tile.getBoundingClientRect().top >= window.innerHeight) {
            io.observe(tile);
            return;
          }
          /* The entrance set releases on its OWN schedule (--va-d),
             never via the observer. The two disagree about what "on
             screen" means: any sliver here versus 12% inside a root
             shrunk 8% there, and fonts can reflow the header between
             this measurement and the observer's first callback. A tile
             caught in that gap would carry the entrance delay with
             nothing to release it; releasing it here means a tile can
             never hold a delay it has no way to spend. */
          tile.style.setProperty(
            '--va-d',
            (startAt + rising * ENTER_STEP).toFixed(2) + 's'
          );
          rise(tile);
          rising += 1;
        });
      };

      /* Only on load, and only if this layout is the one showing: a
         display:none grid measures every tile at top 0, so the whole
         set would be treated as on screen and handed an entrance delay
         it can never spend (a hidden element runs no transitions). Every
         path that un-hides the grid replays it anyway. */
      if (getComputedStyle(varc).display !== 'none') playVerticalReveal(ENTER_AT);
    }
  }

  /* The ellipsis switches (reference/archive-update): the circle under
     the intro reveals a pair of pills, the live one carrying the check.
     Two of them share the slot, one per Design/Logos view, so the open
     and select behaviour lives here once. `key` is the data attribute
     each switch's pills carry; `apply` does the actual work. Returns
     the selector, so a caller can set the initial state without
     duplicating the aria-pressed pass. */
  const bindViewSwitch = (sw, key, apply) => {
    const toggle = sw.querySelector('.vs-toggle');
    const pills = sw.querySelectorAll('.vs-pill');

    /* Once a choice is made the pills clear themselves after a beat,
       so a selection feels finished without having to click away.
       Picking again restarts the countdown; an outside pointerdown or
       Escape still closes immediately, and merely OPENING the switch
       does not start it (nothing has been chosen yet). */
    const DISMISS_AFTER = 3000;
    let dismissTimer = null;

    const setOpen = (open) => {
      if (!open) {
        clearTimeout(dismissTimer);
        dismissTimer = null;
      }
      sw.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };

    const armDismiss = () => {
      clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => {
        dismissTimer = null;
        /* The pills go visibility: hidden at the end of the fade, so
           hand focus back to the circle rather than letting it drop to
           the body out from under a keyboard user */
        const held = sw.contains(document.activeElement);
        setOpen(false);
        if (held) toggle.focus();
      }, DISMISS_AFTER);
    };

    const select = (value, persist) => {
      pills.forEach((p) =>
        p.setAttribute('aria-pressed', String(p.dataset[key] === value))
      );
      apply(value, persist);
    };

    toggle.addEventListener('click', () =>
      setOpen(!sw.classList.contains('is-open'))
    );
    pills.forEach((p) =>
      p.addEventListener('click', () => {
        select(p.dataset[key], true);
        armDismiss();
      })
    );
    document.addEventListener('pointerdown', (e) => {
      if (!sw.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    return select;
  };

  /* Design archive layout: vertical is the default; localStorage
     "layout" holds only a deviation from it, the same convention as the
     theme and sound settings. */
  const layoutSwitch = document.querySelector('.layout-switch');
  if (layoutSwitch) {
    const setLayout = bindViewSwitch(layoutSwitch, 'layout', (layout, persist) => {
      const was = document.documentElement.getAttribute('data-layout');
      document.documentElement.setAttribute('data-layout', layout);
      if (persist) {
        try {
          if (layout === 'horizontal') localStorage.setItem('layout', 'horizontal');
          else localStorage.removeItem('layout');
        } catch (e) {}
      }
      if (layout === 'horizontal') {
        // The band is a locked single screen and measures nothing while
        // it is display:none, so re-render once it has been laid out
        window.scrollTo(0, 0);
        if (renderArc) requestAnimationFrame(renderArc);
      } else if (persist && was !== 'vertical' && playVerticalReveal) {
        /* persist is only true for a real selection, so the reveal does
           not run twice on load (its own block already played it), and
           `was` keeps re-picking the live layout from throwing the
           content away and rebuilding it for nothing. */
        playVerticalReveal(REVEAL_ON_SWITCH);
      }
    });

    setLayout(
      document.documentElement.getAttribute('data-layout') === 'horizontal'
        ? 'horizontal'
        : 'vertical',
      false
    );
  }

  /* Logos grid columns (phones only, where the switch is visible). Two
     up every visit: nothing is stored, so this one needs no pre-paint
     head script the way the layout and theme do. */
  const colsSwitch = document.querySelector('.cols-switch');
  if (colsSwitch) {
    const setCols = bindViewSwitch(colsSwitch, 'cols', (cols) => {
      document.body.dataset.cols = cols;
    });
    setCols('two', false);
  }

  /* Logos grid (archive ?view=logos): the cards live in the HTML.
     Stagger their load reveal in DOM order, wide enough that each card
     reads as its own entrance against the 2s soft ease, not one wave. */
  document.querySelectorAll('.logo-grid .logo-card').forEach((card, i) => {
    card.style.setProperty('--lg-d', (i * 0.15).toFixed(2) + 's');
  });

  /* Load reveal: intro chars sweep in first, then the nav labels get the
     same treatment top to bottom, while the first project rises in via
     CSS keyframes (see the rise-in rules; their delays are tuned to land
     as the intro sweep finishes). Runs only when the head script set
     .anim-intro (i.e. not for reduced motion). */
  if (document.documentElement.classList.contains('anim-intro')) {
    const INTRO_DELAY = 150; // ms before the intro's first char moves
    const NAV_DELAY = 1150; // ms before the first nav item starts
    const NAV_ITEM_STAGGER = 70; // ms between nav items

    /* The 404 page has no intro; its big numerals take the sweep
       instead. Three chars at the intro's 14ms stagger land as one
       quick fade, so each digit gets its own beat and the longer
       duration set on .nf-code .reveal-char (keep the two in step). */
    const intro = document.querySelector('.intro, .nf-code');
    if (intro && intro.classList.contains('nf-code')) {
      splitReveal(intro, 250, 160, 1400);
      intro.classList.add('is-split');
    } else if (intro) {
      splitReveal(intro, INTRO_DELAY);
      intro.classList.add('is-split');
    }

    const nav = document.querySelector('.site-nav');
    if (nav) {
      // Split only the visible roll copy; the aria-hidden duplicate that
      // powers the hover roll stays plain text. Direct links only: the
      // archive sub-links ([ Design / Logos ]) reveal as one unit with
      // the nav dots, not char by char.
      nav
        .querySelectorAll(':scope > ul > li > a .roll > span:first-child')
        .forEach((label, index) => {
          splitReveal(label, NAV_DELAY + index * NAV_ITEM_STAGGER);
        });
      nav.classList.add('is-split');
      // Let the dots (active page, hover) fade in once the sweep is underway
      setTimeout(() => {
        document.documentElement.classList.add('nav-in');
      }, NAV_DELAY + 350);
    }

    // Two frames so the initial (hidden) state paints before transitioning
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (intro) intro.classList.add('is-play');
        if (nav) nav.classList.add('is-play');
      });
    });

    /* Scroll reveals: Kind Words + Why rise in (staggered via the
       .in-view CSS delays) once the section is ~20% into the viewport */
    const revealSections = document.querySelectorAll('.kind-words, .why');
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('in-view');
              io.unobserve(entry.target);
              // Release the reveal styles once the last stagger settles
              // (0.45s delay + 0.9s transition); pinned transforms would
              // block the CTA buttons' hover scale
              setTimeout(() => entry.target.classList.add('is-done'), 1500);
              /* Kind Words only: dim everything but each quote's key
                 phrase (reference/testimonial-interaction.png). The
                 quotes go one at a time, FOCUS_STEP apart, so each
                 changes while the reader is on it rather than both at
                 once. Measured from .in-view, so the 0.9s reveal has
                 long settled. A quote with no key phrase is skipped
                 rather than dimmed flat. One-way: scrolling away and
                 back does not replay it. */
              if (entry.target.classList.contains('kind-words')) {
                const FOCUS_STEP = 3000; // ms between quotes: 3s, 6s, ...
                entry.target
                  .querySelectorAll('.quote')
                  .forEach((quote, index) => {
                    if (!quote.querySelector('.quote-key')) return;
                    setTimeout(
                      () => quote.classList.add('is-focused'),
                      (index + 1) * FOCUS_STEP
                    );
                  });
              }
            }
          });
        },
        { threshold: 0.2 }
      );
      revealSections.forEach((section) => io.observe(section));
    } else {
      revealSections.forEach((section) => {
        section.classList.add('in-view', 'is-done');
        section
          .querySelectorAll('.quote')
          .forEach((quote) => quote.classList.add('is-focused'));
      });
    }
  }

  /* Footer settings: the Settings pill (reading Done while open) slides
     the Theme and Sound toggles out from behind itself. The theme follows the system setting unless
     overridden; light is data-theme='light' on <html>, applied pre-paint
     by the inline head script. Sound is on
     by default; "off" persists to localStorage "sound" and sounds.js
     reads it back before anything can play. The markup ships with
     dark + on checked, so only the stored deviations need syncing. */
  const settingsWrap = document.querySelector('.footer-settings');
  if (settingsWrap) {
    const rootEl = document.documentElement;
    const settingsBtn = settingsWrap.querySelector('.settings-btn');
    const menu = settingsWrap;

    /* Toggle semantics: checked = knob right = dark mode / sound on.
       The markup ships checked (dark + on), so only the stored
       deviations need syncing. */
    const themeInput = menu.querySelector('input[name="theme"]');
    if (rootEl.getAttribute('data-theme') === 'light') {
      themeInput.checked = false;
    }

    /* The theme follows the system setting (prefers-color-scheme) until
       someone picks one in the menu. Only a pick that differs from the
       system is stored, so switching back to match it hands control
       back to the system. */
    const systemLight = window.matchMedia('(prefers-color-scheme: light)');
    const applyTheme = (dark) => {
      if (dark) {
        rootEl.removeAttribute('data-theme');
      } else {
        rootEl.setAttribute('data-theme', 'light');
      }
      themeInput.checked = dark;
    };
    systemLight.addEventListener('change', () => {
      let saved = null;
      try {
        saved = localStorage.getItem('theme');
      } catch (e) {}
      if (saved !== 'light' && saved !== 'dark') applyTheme(!systemLight.matches);
    });
    try {
      if (localStorage.getItem('sound') === 'off') {
        menu.querySelector('input[name="sound"]').checked = false;
      }
    } catch (e) {}

    // .settings-open on the footer fades the email + copyright on phones.
    // A class, not :has(): iOS Safari missed restyling the copyright (it
    // follows the pill in the DOM) when the pill's state changed.
    const footerEl = settingsWrap.closest('.site-footer');
    const setOpen = (open) => {
      settingsWrap.classList.toggle('is-open', open);
      if (footerEl) footerEl.classList.toggle('settings-open', open);
      settingsBtn.setAttribute('aria-expanded', String(open));
    };
    settingsBtn.addEventListener('click', () => {
      setOpen(!settingsWrap.classList.contains('is-open'));
    });
    document.addEventListener('pointerdown', (e) => {
      if (
        settingsWrap.classList.contains('is-open') &&
        !settingsWrap.contains(e.target)
      ) {
        setOpen(false);
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && settingsWrap.classList.contains('is-open')) {
        setOpen(false);
        settingsBtn.focus();
      }
    });

    themeInput.addEventListener('change', (e) => {
      const dark = e.target.checked;
      applyTheme(dark);
      try {
        if (dark === !systemLight.matches) {
          localStorage.removeItem('theme');
        } else {
          localStorage.setItem('theme', dark ? 'dark' : 'light');
        }
      } catch (e2) {}
      sfx('press');
    });

    /* The sound toggle's click sound is played here, not stamped as
       data-cuelume-press: switching Off must be silent from that very
       click, and switching On can only sound after setEnabled(true). */
    menu.querySelector('input[name="sound"]').addEventListener('change', (e) => {
      const on = e.target.checked;
      if (window.cuelume) window.cuelume.setEnabled(on);
      try {
        localStorage.setItem('sound', on ? 'on' : 'off');
      } catch (e2) {}
      if (on) sfx('press');
    });
  }

  /* Project accordion: Project Info / Credits. One panel at a time,
     revealed in the header's second column (see the .acc-* styles);
     clicking the open row closes it back to the default state. */
  document.querySelectorAll('.project-header').forEach((header) => {
    const items = header.querySelectorAll('.project-acc-item');
    if (!items.length) return;
    items.forEach((btn) => {
      btn.addEventListener('click', () => {
        const wasOpen = btn.getAttribute('aria-expanded') === 'true';
        items.forEach((b) => b.setAttribute('aria-expanded', 'false'));
        if (wasOpen) {
          delete header.dataset.open;
        } else {
          btn.setAttribute('aria-expanded', 'true');
          header.dataset.open = btn.dataset.panel;
        }
      });
    });
  });
})();
