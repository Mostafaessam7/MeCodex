/* ==========================================================================
   MeCodex — main.js
   0. Header scroll state + scroll-progress bar + scroll parallax + scroll-to-top
   1. Mobile nav toggle
   2. Smooth scroll for in-page anchors
   3. Scroll-reveal via IntersectionObserver
   4. Current year in footer
   5. Contact form client-side "submit" (with loading + success states)
   6. Hero stat counters (odometer-style digit flip on scroll into view)
   7. Headline word-reveal (hero H1 + page H1s)
   8. Cursor-aware spotlight + tilt + magnetic buttons (rAF-batched, pointer:fine only)
   9. Ambient particle background (canvas, sitewide)
   10. Accordion (FAQ pages/section) — button-triggered, ARIA-driven, reuses the §3 reveal observer

   Listener/loop inventory (kept intentionally short — see docs/WORK_LOG.md v7 entry):
   - one scroll listener (§0), rAF-throttled, drives header state/progress bar/parallax/scroll-to-top
   - one mousemove listener per pointer-fx element (§8: spotlight rows, tilt cards, magnetic
     buttons), all flushed through a single shared rAF batch rather than one loop per effect
   - one resize listener (§0, header/parallax) + one resize listener (§9, particle canvas resize)
   - one continuous rAF loop (§9, particle field animation)
   ========================================================================== */
(function () {
  "use strict";

  // Computed once at load — matches the static-snapshot pattern already used throughout this
  // file (matchMedia isn't re-checked live if the OS setting changes mid-session).
  var reducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 0. Header scroll state + scroll-progress bar + parallax + scroll-to-top ---------- */
  var siteHeader = document.querySelector(".site-header");
  var scrollProgressEl = document.querySelector(".scroll-progress");
  var heroVisualFrame = document.querySelector(".hero-visual-frame");
  var bgParticlesEl = document.querySelector(".bg-particles");
  var scrollTopBtn = document.querySelector(".scroll-top");

  var updateHeaderState = function () {
    if (siteHeader) {
      siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
      if (scrollProgressEl) {
        var doc = document.documentElement;
        var scrollableHeight = doc.scrollHeight - doc.clientHeight;
        var progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
        scrollProgressEl.style.width = Math.min(100, Math.max(0, progress)) + "%";
      }
    }
    // Gentle scroll parallax (v7) — transform-only, capped at a handful of px, never causes
    // layout shift. Applied to .hero-visual-frame rather than .hero-visual itself, which still
    // owns the v4 load-in `animation` on the `transform` property — writing an inline transform
    // to the same element the animation targets would just get overridden by it.
    if (!reducedMotion) {
      if (heroVisualFrame) {
        var frameOffset = Math.min(16, window.scrollY * 0.05);
        heroVisualFrame.style.transform = "translateY(" + frameOffset.toFixed(1) + "px)";
      }
      if (bgParticlesEl) {
        var bgOffset = Math.min(10, window.scrollY * 0.015);
        bgParticlesEl.style.transform = "translateY(" + bgOffset.toFixed(1) + "px)";
      }
    }
    // Scroll-to-top affordance (v7) — appears once the hero has scrolled past.
    if (scrollTopBtn) {
      scrollTopBtn.classList.toggle("is-visible", window.scrollY > window.innerHeight * 0.6);
    }
  };
  updateHeaderState();

  // Single rAF-throttled scroll listener drives header state, the progress bar, scroll parallax,
  // and the scroll-to-top affordance — deliberately one listener/one pending rAF rather than a
  // separate scroll handler per effect.
  var scrollRafId = null;
  var onScroll = function () {
    if (scrollRafId !== null) { return; }
    scrollRafId = window.requestAnimationFrame(function () {
      updateHeaderState();
      scrollRafId = null;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", updateHeaderState, { passive: true });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  /* ---------- 1. Mobile nav toggle ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var primaryNav = document.querySelector(".primary-nav");

  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      var expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      primaryNav.classList.toggle("open", !expanded);
    });

    // Close mobile nav when a link is clicked
    primaryNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navToggle.setAttribute("aria-expanded", "false");
        primaryNav.classList.remove("open");
      });
    });
  }

  /* ---------- 2. Smooth scroll for in-page anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    });
  });

  /* ---------- 3. Scroll-reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------- 4. Current year in footer ---------- */
  var yearEls = document.querySelectorAll("[data-current-year]");
  var year = new Date().getFullYear();
  yearEls.forEach(function (el) { el.textContent = String(year); });

  /* ---------- 5. Contact form ---------- */
  var contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    var successMsg = document.querySelector("#form-success");
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }
      if (submitBtn) {
        submitBtn.classList.add("is-loading");
        submitBtn.disabled = true;
      }
      // Hand the message off to the visitor's own mail client. Not as slick as a
      // form backend, but it genuinely delivers — the previous version showed a
      // success state and sent nothing, which meant anyone who missed the "in a
      // live version of this site" wording walked away thinking they'd made
      // contact. Needs no third-party signup or server. To move to a real form
      // service later, POST the same fields instead of building this URL; the
      // markup already has correct `name` attributes throughout.
      var handOffToMailClient = function () {
        var field = function (name) {
          var el = contactForm.querySelector('[name="' + name + '"]');
          return el ? el.value.trim() : "";
        };

        var body =
          "From: " + field("name") + " <" + field("email") + ">\n\n" + field("message");

        // encodeURIComponent, not escape/raw: subjects and messages routinely
        // contain &, #, and newlines, all of which would otherwise truncate the
        // mailto URL at the first offending character.
        var mailto =
          "mailto:hello@mecodex.com" +
          "?subject=" + encodeURIComponent(field("subject")) +
          "&body=" + encodeURIComponent(body);

        window.location.href = mailto;

        if (submitBtn) {
          submitBtn.classList.remove("is-loading");
          submitBtn.disabled = false;
        }
        if (successMsg) {
          successMsg.classList.add("visible");
          successMsg.setAttribute("role", "status");
          // Two rAFs so the browser commits the "visible" (display:flex) state
          // before the opacity/transform transition to "is-shown" starts.
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
              successMsg.classList.add("is-shown");
            });
          });
          successMsg.focus();
        }
        // Deliberately not reset(): if the mail client doesn't open (not every
        // visitor has one configured), wiping what they just typed would lose
        // their message with nothing to show for it. The success note tells them
        // they can copy it to an email instead.
      };
      // Brief delay so the loading state is perceptible; skipped entirely under
      // reduced motion.
      window.setTimeout(handOffToMailClient, reducedMotion ? 0 : 650);
    });
  }

  /* ---------- 6. Hero stat counters (odometer-style digit flip) ---------- */
  var statEls = document.querySelectorAll(".hero-statbar .stat-num");
  if (statEls.length) {
    // Replaces a stat number's content with one <span class="digit"> per numeral (zero-padded
    // to the target's own digit count) plus a trailing non-animated <span class="digit-suffix">
    // for "%" etc. Returns the digit spans so the caller can update them in place.
    var buildDigitSpans = function (el, digitsStr, suffix) {
      el.innerHTML = "";
      var frag = document.createDocumentFragment();
      digitsStr.split("").forEach(function (ch) {
        var span = document.createElement("span");
        span.className = "digit";
        span.textContent = ch;
        frag.appendChild(span);
      });
      if (suffix) {
        var suffixSpan = document.createElement("span");
        suffixSpan.className = "digit-suffix";
        suffixSpan.textContent = suffix;
        frag.appendChild(suffixSpan);
      }
      el.appendChild(frag);
      return el.querySelectorAll(".digit");
    };

    // Only count up stats that are purely numeric (optionally with a trailing "%") —
    // formats like "24/7" or "3 yrs+" are left as static fade/rise instead of being
    // counted, since a numeric count-up would misrepresent them. The count-up itself
    // steps through a handful of intermediate values (not every rAF frame) so each
    // digit change reads as a distinct flip/tumble — a split-flap/odometer feel per the
    // client's "بتلف بتتشقلب" request — rather than a smooth linear increment blur.
    var animateStat = function (el) {
      var raw = el.textContent.trim();
      var match = raw.match(/^(\d+)(%?)$/);
      if (!match || reducedMotion) { return; }
      var target = parseInt(match[1], 10);
      var suffix = match[2];
      if (isNaN(target)) { return; }
      var padLen = match[1].length;
      var stepCount = target > 0 ? Math.min(10, target) : 1;
      var duration = 900;

      var digitSpans = buildDigitSpans(el, new Array(padLen + 1).join("0"), suffix);

      var setValue = function (value) {
        var str = String(value);
        while (str.length < padLen) { str = "0" + str; }
        for (var i = 0; i < digitSpans.length; i++) {
          var ch = str.charAt(i);
          if (digitSpans[i].textContent !== ch) {
            digitSpans[i].textContent = ch;
            // Retrigger the CSS flip animation on this digit only.
            digitSpans[i].classList.remove("is-flipping");
            void digitSpans[i].offsetWidth; // force reflow
            digitSpans[i].classList.add("is-flipping");
          }
        }
      };

      var start = null;
      var step = function (timestamp) {
        if (start === null) { start = timestamp; }
        var progress = Math.min((timestamp - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var stepIndex = Math.round(eased * stepCount);
        var value = Math.round((stepIndex / stepCount) * target);
        setValue(value);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        } else {
          setValue(target);
        }
      };
      window.requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      var statObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              var wrap = entry.target.closest(".hero-statbar > div") || entry.target.parentElement;
              if (wrap) { wrap.classList.add("is-visible"); }
              animateStat(entry.target);
              statObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      statEls.forEach(function (el) { statObserver.observe(el); });
    } else {
      statEls.forEach(function (el) {
        var wrap = el.closest(".hero-statbar > div") || el.parentElement;
        if (wrap) { wrap.classList.add("is-visible"); }
      });
    }
  }

  /* ---------- 7. Headline word-reveal ---------- */
  // Wraps each word of a short headline in a <span class="word"> carrying a --i index,
  // so CSS can stagger their opacity/transform in. Preserves any nested inline element
  // (e.g. the hero's <span class="text-gradient">) as a single "word" unit instead of
  // flattening it to plain text.
  var wrapHeadlineWords = function (el) {
    if (!el || el.dataset.wordsWrapped) { return; }
    var nodes = Array.prototype.slice.call(el.childNodes);
    var frag = document.createDocumentFragment();
    var i = 0;
    nodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var parts = node.textContent.split(/(\s+)/);
        parts.forEach(function (part) {
          if (part === "") { return; }
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part));
            return;
          }
          var span = document.createElement("span");
          span.className = "word";
          span.style.setProperty("--i", i++);
          span.textContent = part;
          frag.appendChild(span);
        });
      } else {
        var wrap = document.createElement("span");
        wrap.className = "word";
        wrap.style.setProperty("--i", i++);
        wrap.appendChild(node.cloneNode(true));
        frag.appendChild(wrap);
      }
    });
    el.innerHTML = "";
    el.appendChild(frag);
    el.dataset.wordsWrapped = "true";
  };

  var headlineEls = document.querySelectorAll(".word-reveal");
  headlineEls.forEach(wrapHeadlineWords);

  if (reducedMotion) {
    // Show final state instantly, no cascade.
    headlineEls.forEach(function (el) { el.classList.add("words-in"); });
  } else {
    // Hero headline: not scroll-gated, animates shortly after load (alongside heroEnter).
    var heroHeadline = document.querySelector(".hero-copy h1.word-reveal");
    if (heroHeadline) {
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          heroHeadline.classList.add("words-in");
        });
      });
    }
    // Page headlines: animate once their section-head scrolls into view.
    var pageHeadlines = document.querySelectorAll(".section-head h1.word-reveal");
    if ("IntersectionObserver" in window && pageHeadlines.length) {
      var wordObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("words-in");
              wordObserver.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      pageHeadlines.forEach(function (el) { wordObserver.observe(el); });
    } else {
      pageHeadlines.forEach(function (el) { el.classList.add("words-in"); });
    }
  }

  /* ---------- 8. Cursor-aware spotlight + tilt + magnetic buttons ---------- */
  // A soft radial highlight follows the pointer within a row/card on hover (v5). v7 layers a
  // subtle 3D tilt onto the same rows plus engagement cards, and a small magnetic pull onto the
  // primary/secondary buttons — all funnelled through one shared rAF-batched flush (a Map of
  // element -> pending update) instead of a separate rAF loop per effect. Desktop-with-precise-
  // pointer only; on touch none of this attaches (harmless, no half-styled state) and the
  // matching CSS is scoped behind @media (pointer: fine) anyway. Tilt/magnetic additionally
  // require motion to be allowed — the spotlight glow itself is kept under reduced motion (it's
  // just an opacity glow, not real motion), matching the v5 precedent.
  var pointerFine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (pointerFine) {
    var pointerRafId = null;
    var pendingPointerUpdates = new Map();
    var flushPointerFX = function () {
      pendingPointerUpdates.forEach(function (data, el) {
        if (data.mx !== undefined) {
          el.style.setProperty("--mx", data.mx + "px");
          el.style.setProperty("--my", data.my + "px");
        }
        if (data.tiltX !== undefined) {
          el.style.setProperty("--tilt-x", data.tiltX.toFixed(2) + "deg");
          el.style.setProperty("--tilt-y", data.tiltY.toFixed(2) + "deg");
        }
        if (data.magX !== undefined) {
          el.style.setProperty("--mag-x", data.magX.toFixed(1) + "px");
          el.style.setProperty("--mag-y", data.magY.toFixed(1) + "px");
        }
      });
      pendingPointerUpdates.clear();
      pointerRafId = null;
    };
    var queuePointerUpdate = function (el, data) {
      pendingPointerUpdates.set(el, data);
      if (pointerRafId === null) {
        pointerRafId = window.requestAnimationFrame(flushPointerFX);
      }
    };

    var spotlightTargets = document.querySelectorAll(
      ".service-row, .value-row, .why-item, .contact-info-item"
    );
    // Rows that also get the tilt (contact-info-item stays spotlight-only — an icon row, not a
    // card/panel worth tilting). Only built when motion is allowed.
    var tiltRowSet = new Set();
    if (!reducedMotion) {
      document.querySelectorAll(".service-row, .why-item, .value-row").forEach(function (el) {
        el.classList.add("tilt");
        tiltRowSet.add(el);
      });
    }

    spotlightTargets.forEach(function (el) {
      el.classList.add("spotlight");
      var tilts = tiltRowSet.has(el);
      el.addEventListener(
        "mousemove",
        function (e) {
          var rect = el.getBoundingClientRect();
          var x = e.clientX - rect.left;
          var y = e.clientY - rect.top;
          var data = { mx: x, my: y };
          if (tilts) {
            var px = x / rect.width - 0.5;
            var py = y / rect.height - 0.5;
            data.tiltX = px * 8; // rows are wide — keep the tilt range small (max ~4deg)
            data.tiltY = -py * 8;
          }
          queuePointerUpdate(el, data);
        },
        { passive: true }
      );
      if (tilts) {
        el.addEventListener("mouseleave", function () {
          el.style.removeProperty("--tilt-x");
          el.style.removeProperty("--tilt-y");
        });
      }
    });

    if (!reducedMotion) {
      // Engagement cards (services page): tilt only, no spotlight glow — that stays a rows-only
      // v5 effect, cards already get their own hover lift/shadow.
      document.querySelectorAll(".engagement-card").forEach(function (el) {
        el.classList.add("tilt");
        el.addEventListener(
          "mousemove",
          function (e) {
            var rect = el.getBoundingClientRect();
            var px = (e.clientX - rect.left) / rect.width - 0.5;
            var py = (e.clientY - rect.top) / rect.height - 0.5;
            queuePointerUpdate(el, { tiltX: px * 14, tiltY: -py * 14 }); // max ~7deg, narrower cards
          },
          { passive: true }
        );
        el.addEventListener("mouseleave", function () {
          el.style.removeProperty("--tilt-x");
          el.style.removeProperty("--tilt-y");
        });
      });

      // Primary/secondary buttons: a small magnetic pull toward the cursor within the button's
      // own hover zone, snapping back on mouseleave via the CSS transition already on `transform`.
      document.querySelectorAll(".btn-primary, .btn-secondary").forEach(function (el) {
        el.classList.add("magnetic");
        el.addEventListener(
          "mousemove",
          function (e) {
            var rect = el.getBoundingClientRect();
            var px = (e.clientX - rect.left) / rect.width - 0.5;
            var py = (e.clientY - rect.top) / rect.height - 0.5;
            queuePointerUpdate(el, { magX: px * 10, magY: py * 8 });
          },
          { passive: true }
        );
        el.addEventListener("mouseleave", function () {
          el.style.removeProperty("--mag-x");
          el.style.removeProperty("--mag-y");
        });
      });
    }
  }

  /* ---------- 9. Ambient particle background ---------- */
  // A modest field of slow-drifting dots behind all content, reinforcing the existing
  // network/blueprint visual language (sparser and lower-opacity than the hero's own
  // foreground diagram, never competing with it). Vanilla canvas, no library. Decorative
  // only: the canvas is aria-hidden and pointer-events:none in CSS. Respects
  // prefers-reduced-motion (draws one static frame, no rAF loop) and pauses while the tab
  // is hidden. Particle count scales down on narrower viewports for performance.
  var particleCanvas = bgParticlesEl;
  if (particleCanvas && particleCanvas.getContext) {
    var pCtx = particleCanvas.getContext("2d");
    var pDpr = Math.min(window.devicePixelRatio || 1, 2);
    var pWidth = 0;
    var pHeight = 0;
    var particles = [];
    var pRafId = null;
    var pLastTime = null;

    // Brand-matching, low-opacity dot colors (teal / blue), same palette as the rest of the
    // "Tech / Network" motion system — never a full-opacity fill.
    var particleColors = [
      "rgba(51, 224, 199, ALPHA)",
      "rgba(61, 108, 242, ALPHA)"
    ];

    var particleCountFor = function (width) {
      if (width < 640) { return 16; }
      if (width < 1024) { return 26; }
      return 42;
    };

    var makeParticle = function () {
      var speed = 6 + Math.random() * 10; // px/sec, gentle drift
      var angle = Math.random() * Math.PI * 2;
      return {
        x: Math.random() * pWidth,
        y: Math.random() * pHeight,
        r: 1 + Math.random() * 1.6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 0.12 + Math.random() * 0.26,
        color: particleColors[Math.floor(Math.random() * particleColors.length)]
      };
    };

    var resizeParticles = function () {
      pWidth = window.innerWidth;
      pHeight = window.innerHeight;
      particleCanvas.width = pWidth * pDpr;
      particleCanvas.height = pHeight * pDpr;
      particleCanvas.style.width = pWidth + "px";
      particleCanvas.style.height = pHeight + "px";
      pCtx.setTransform(pDpr, 0, 0, pDpr, 0, 0);
      var count = particleCountFor(pWidth);
      particles = [];
      for (var i = 0; i < count; i++) { particles.push(makeParticle()); }
    };

    var drawParticles = function () {
      pCtx.clearRect(0, 0, pWidth, pHeight);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        pCtx.beginPath();
        pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pCtx.fillStyle = p.color.replace("ALPHA", String(p.alpha));
        pCtx.fill();
      }
    };

    var tickParticles = function (timestamp) {
      if (pLastTime === null) { pLastTime = timestamp; }
      // Clamp delta so a backgrounded/throttled tab doesn't make dots jump on return.
      var dt = Math.min((timestamp - pLastTime) / 1000, 0.1);
      pLastTime = timestamp;
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Wrap around edges rather than bounce, so density stays even.
        if (p.x < -10) { p.x = pWidth + 10; }
        if (p.x > pWidth + 10) { p.x = -10; }
        if (p.y < -10) { p.y = pHeight + 10; }
        if (p.y > pHeight + 10) { p.y = -10; }
      }
      drawParticles();
      pRafId = window.requestAnimationFrame(tickParticles);
    };

    var startLoop = function () {
      if (pRafId !== null || reducedMotion) { return; }
      pLastTime = null;
      pRafId = window.requestAnimationFrame(tickParticles);
    };
    var stopLoop = function () {
      if (pRafId !== null) {
        window.cancelAnimationFrame(pRafId);
        pRafId = null;
      }
    };

    resizeParticles();
    drawParticles(); // always paint one frame, even under reduced motion (static dots)

    if (!reducedMotion) {
      startLoop();
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") { stopLoop(); } else { startLoop(); }
      });
    }

    var pResizeTimer = null;
    window.addEventListener(
      "resize",
      function () {
        window.clearTimeout(pResizeTimer);
        pResizeTimer = window.setTimeout(function () {
          resizeParticles();
          drawParticles();
        }, 150);
      },
      { passive: true }
    );
  }

  /* ---------- 10. Accordion (FAQ pages/section) ---------- */
  // Each question is a real <button> (per-accordion-item .accordion-trigger) toggling
  // aria-expanded on itself and letting CSS animate the adjacent .accordion-panel via the
  // grid-rows 0fr/1fr trick — no height measurement needed. Multiple items may be open at
  // once (a FAQ list, not a single-open tab set), so no other items are force-closed on
  // click. Entrance stagger reuses the existing §3 IntersectionObserver via the .reveal class
  // already present on each .accordion container — no second observer.
  document.querySelectorAll(".accordion-trigger").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var expanded = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!expanded));
      var item = trigger.closest(".accordion-item");
      if (item) { item.classList.toggle("is-open", !expanded); }
    });
  });

  /* ---------- 11. Newsletter notice form (insights.html) ---------- */
  // No mailing list exists yet, so rather than swallow the click silently (which read as a
  // broken button even with the note underneath), hand the request off by email the same way
  // the contact form does. Replace with a real list provider's POST when there is one.
  var newsletterForm = document.querySelector("#newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!newsletterForm.checkValidity()) {
        newsletterForm.reportValidity();
        return;
      }
      var emailInput = newsletterForm.querySelector('[name="email"]');
      var address = emailInput ? emailInput.value.trim() : "";
      window.location.href =
        "mailto:hello@mecodex.com" +
        "?subject=" + encodeURIComponent("Notify me about new MeCodex insights") +
        "&body=" + encodeURIComponent("Please add " + address + " to the list for new posts.");
    });
  }
})();
