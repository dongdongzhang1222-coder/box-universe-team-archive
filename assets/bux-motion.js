/* ============================================================
   BOX UNIVERSE — MOTION OVERLAY  (bux-motion.js)
   ------------------------------------------------------------
   Purely additive motion layer for the shipped production build.
   It never edits assets/app.js, never rewrites copy, never
   changes layout, and never touches the 16 elements the app's own
   GSAP instance already animates (.section-heading + the 8 section
   containers, which carry app-written inline transform/opacity).

   Library choice: GSAP + ScrollTrigger. The page already ships GSAP,
   ScrollTrigger and Lenis inside its bundle, so scroll-driven
   choreography stays in the same motion language; ScrollTrigger is
   also the only clean way to do scrub-linked, velocity-aware effects.

   Kill switch:  ?motion=off      Opt-in artwork zoom: ?kenburns=1
   ============================================================ */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  if (params.get("motion") === "off") return;
  var KEN_BURNS = params.get("kenburns") === "1";

  /* ---------------------------------------------------------- *
   * Elements the app's own GSAP owns. Never animate these.
   * ---------------------------------------------------------- */
  var APP_OWNED =
    ".section-heading, .art-screen, .team-collage, .player-galaxy, " +
    ".caseboard, .idea-bank, .end-wrap";

  function free(nodes) {
    return Array.prototype.filter.call(nodes || [], function (el) {
      return el && el.nodeType === 1 && !el.matches(APP_OWNED);
    });
  }
  function all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ---------------------------------------------------------- *
   * Entry gate motion (main.entry-page).
   *
   * The gate is a full-bleed artwork plus a transparent .start-hit
   * button positioned in percentages over that artwork. Scaling or
   * moving either would break the hit target, so everything here is
   * a decorative, pointer-events:none sibling layer that mirrors the
   * button's percentage box instead of transforming it.
   * ---------------------------------------------------------- */
  var GATE_HIT = { top: "33.5%", left: "31.5%", width: "37%", height: "10.5%" };
  var GATE_HIT_NARROW = { left: "24%", width: "52%" };

  function decorateGate(gate) {
    if (!window.gsap || gate.querySelector(".bux-gate-fx")) return null;
    var gsap = window.gsap;

    var layer = document.createElement("div");
    layer.className = "bux-gate-fx";
    layer.setAttribute("aria-hidden", "true");

    var aurora = document.createElement("div");
    aurora.className = "bux-gate-aurora";

    var ring = document.createElement("div");
    ring.className = "bux-gate-ring";
    var narrow = window.matchMedia("(max-width: 760px)").matches;
    ring.style.top = GATE_HIT.top;
    ring.style.height = GATE_HIT.height;
    ring.style.left = narrow ? GATE_HIT_NARROW.left : GATE_HIT.left;
    ring.style.width = narrow ? GATE_HIT_NARROW.width : GATE_HIT.width;

    layer.appendChild(aurora);
    layer.appendChild(ring);
    gate.appendChild(layer);

    var mmGate = gsap.matchMedia();
    mmGate.add("(prefers-reduced-motion: no-preference)", function () {
      gsap.to(aurora, {
        xPercent: 120,
        duration: 7,
        repeat: -1,
        ease: "none",
      });
      gsap.fromTo(
        ring,
        { opacity: 0.18, scale: 0.985 },
        {
          opacity: 0.6,
          scale: 1.015,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          transformOrigin: "50% 50%",
        }
      );
    });

    // Keep the ring aligned with the button's responsive breakpoint.
    function syncRing() {
      var isNarrow = window.matchMedia("(max-width: 760px)").matches;
      ring.style.left = isNarrow ? GATE_HIT_NARROW.left : GATE_HIT.left;
      ring.style.width = isNarrow ? GATE_HIT_NARROW.width : GATE_HIT.width;
    }
    window.addEventListener("resize", syncRing);

    return function cleanup() {
      window.removeEventListener("resize", syncRing);
      mmGate.revert();
      if (layer.parentNode) layer.parentNode.removeChild(layer);
    };
  }

  function watchGate() {
    var cleanup = null;
    var tries = 0;
    (function poll() {
      var gate = document.querySelector("main.entry-page");
      if (gate) {
        if (!cleanup) cleanup = decorateGate(gate);
      } else if (cleanup) {
        cleanup();
        cleanup = null;
        return; // gate is gone for good; the shell takes over from here.
      }
      if (++tries > 900) return; // ~15 min of patience, then stop polling.
      setTimeout(poll, 1000);
    })();
  }
  watchGate();

  /* ---------------------------------------------------------- *
   * Boot: wait until the React tree has rendered the shell.
   * ---------------------------------------------------------- */
  function whenReady(cb) {
    var booted = false;

    function shellIfReady() {
      var shell = document.querySelector(".site-shell");
      if (shell && shell.children.length >= 8 && document.querySelector("#end")) return shell;
      return null;
    }

    function attempt() {
      if (booted) return true;
      var shell = shellIfReady();
      if (!shell) return false;
      booted = true;
      if (observer) observer.disconnect();
      clearInterval(timer);
      cb(shell);
      return true;
    }

    // The archive sits behind a "PRESS START" gate, so the shell can mount
    // arbitrarily late. Watch instead of racing a fixed timeout.
    var observer = null;
    var timer = setInterval(attempt, 400);

    function watch() {
      var root = document.getElementById("root");
      if (!root) return setTimeout(watch, 100);
      observer = new MutationObserver(attempt);
      observer.observe(root, { childList: true, subtree: true });
      attempt();
    }
    watch();
  }

  whenReady(function (shell) {
    if (!window.gsap || !window.ScrollTrigger) return;
    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "power3.out", duration: 0.85 });

    /* ======================================================== *
     * 1. Atmosphere host — appended to <body>, outside #root,
     *    so React can never reconcile it away.
     * ======================================================== */
    var fx = document.createElement("div");
    fx.className = "bux-fx";
    fx.setAttribute("aria-hidden", "true");

    var glow = document.createElement("div");
    glow.className = "bux-cursor-glow";

    var beam = document.createElement("div");
    beam.className = "bux-beam";

    var vignette = document.createElement("div");
    vignette.className = "bux-vignette";

    fx.appendChild(vignette);
    fx.appendChild(beam);
    fx.appendChild(glow);

    var MOTE_COUNT = 22;
    var motes = [];
    for (var i = 0; i < MOTE_COUNT; i++) {
      var m = document.createElement("div");
      m.className = "bux-mote";
      fx.appendChild(m);
      motes.push(m);
    }

    var progress = document.createElement("div");
    progress.className = "bux-progress";
    progress.setAttribute("aria-hidden", "true");

    document.body.appendChild(fx);
    document.body.appendChild(progress);

    /* ======================================================== *
     * 2. Per-screen atmosphere layers.
     *    z-index 2 + appended last => paints over the artwork but
     *    under every interactive hotspot (z-index >= 3).
     * ======================================================== */
    function decorateScreens() {
      all(".art-screen").forEach(function (screen) {
        if (screen.querySelector(":scope > .bux-screen-fx")) return;
        var layer = document.createElement("div");
        layer.className = "bux-screen-fx";
        layer.setAttribute("aria-hidden", "true");
        layer.style.cssText =
          "position:absolute;inset:0;z-index:2;pointer-events:none;" +
          "overflow:hidden;border-radius:inherit;";
        layer.innerHTML =
          '<div class="bux-screen-sweep" style="position:absolute;top:-25%;left:-45%;' +
          "width:38%;height:150%;opacity:0;mix-blend-mode:screen;filter:blur(10px);" +
          "background:linear-gradient(102deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.3) 46%," +
          'rgba(246,182,215,.26) 56%,rgba(255,255,255,0) 100%);"></div>' +
          '<div class="bux-screen-bloom" style="position:absolute;inset:0;opacity:0;' +
          "mix-blend-mode:screen;background:radial-gradient(115% 62% at 50% 0%," +
          'rgba(255,255,255,.42) 0%,rgba(255,255,255,0) 62%);"></div>';
        screen.appendChild(layer);
      });
    }

    /* ======================================================== *
     * 3. Decorations on existing elements — additive classes and
     *    a transition-property tweak so GSAP transforms are not
     *    double-eased by the stylesheet's `transition: all`.
     * ======================================================== */
    function decorateElements() {
      var cta = document.querySelector(".video-play-center");
      if (cta) cta.classList.add("bux-sheen");

      all(".box-camera").forEach(function (el) {
        el.classList.add("bux-halo");
      });
      all(".joy-hotspots button").forEach(function (el) {
        el.classList.add("bux-halo");
      });

      all(".case-card").forEach(function (card) {
        // Keep colour/shadow easing from the stylesheet, hand transform to GSAP.
        card.style.transitionProperty =
          "box-shadow, background, background-color, border-color";
      });
    }

    decorateScreens();
    decorateElements();

    /* React re-render guard: re-apply decorations if anything is stripped. */
    var reapply = null;
    var root = document.getElementById("root");
    if (root && window.MutationObserver) {
      var mo = new MutationObserver(function () {
        clearTimeout(reapply);
        reapply = setTimeout(function () {
          decorateScreens();
          decorateElements();
          ScrollTrigger.refresh();
        }, 250);
      });
      mo.observe(root, { childList: true, subtree: true });
    }

    /* ======================================================== *
     * 4. Motion layer — only built when the visitor has not asked
     *    for reduced motion. gsap.matchMedia reverts everything
     *    automatically if that preference flips.
     * ======================================================== */
    var mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", function () {
      /* ---------- 4.1 cursor glow ---------- */
      var xTo = gsap.quickTo(glow, "x", { duration: 0.5, ease: "power3" });
      var yTo = gsap.quickTo(glow, "y", { duration: 0.5, ease: "power3" });
      var glowShown = false;
      function onMove(e) {
        xTo(e.clientX);
        yTo(e.clientY);
        if (!glowShown) {
          glowShown = true;
          gsap.to(glow, { opacity: 0.5, duration: 0.7 });
        }
      }
      function onLeave() {
        glowShown = false;
        gsap.to(glow, { opacity: 0, duration: 0.5 });
      }
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerdown", onMove, { passive: true });
      document.addEventListener("mouseleave", onLeave);

      /* ---------- 4.2 drifting motes ---------- */
      motes.forEach(function (mote) {
        var startX = gsap.utils.random(0, window.innerWidth);
        var startY = gsap.utils.random(0, window.innerHeight);
        var size = gsap.utils.random(2, 5.5);
        gsap.set(mote, { x: startX, y: startY, width: size, height: size });
        gsap.to(mote, {
          opacity: gsap.utils.random(0.18, 0.62),
          duration: gsap.utils.random(1.6, 4),
          delay: gsap.utils.random(0, 3),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(mote, {
          x: "+=" + gsap.utils.random(-160, 160),
          y: "+=" + gsap.utils.random(-190, 190),
          duration: gsap.utils.random(11, 22),
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

      /* ---------- 4.3 grain breathing ---------- */
      var grain = document.querySelector(".grain");
      if (grain) {
        gsap.to(grain, {
          opacity: 0.068,
          duration: 5.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      /* ---------- 4.4 scroll progress rail ---------- */
      gsap.to(progress, {
        scaleX: 1,
        ease: "none",
        scrollTrigger: {
          trigger: shell,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.35,
        },
      });

      /* ---------- 4.5 page-wide sheen drift ---------- */
      gsap.fromTo(
        beam,
        { x: 0, rotate: -4 },
        {
          x: function () {
            return window.innerWidth * 2.15;
          },
          rotate: 6,
          ease: "none",
          invalidateOnRefresh: true,
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.9,
          },
        }
      );

      /* ---------- 4.6 velocity-driven vignette + beam boost ---------- */
      var vigTo = gsap.quickTo(vignette, "opacity", {
        duration: 0.55,
        ease: "power2.out",
      });
      var beamTo = gsap.quickTo(beam, "opacity", {
        duration: 0.55,
        ease: "power2.out",
      });
      var settle = null;
      ScrollTrigger.create({
        trigger: shell,
        start: "top top",
        end: "bottom bottom",
        onUpdate: function (self) {
          var v = Math.min(Math.abs(self.getVelocity()) / 2600, 1);
          vigTo(v * 0.52);
          beamTo(0.5 + v * 0.4);
          clearTimeout(settle);
          settle = setTimeout(function () {
            vigTo(0);
            beamTo(0.5);
          }, 160);
        },
      });

      /* ---------- 4.7 heading choreography ----------
         The app fades the .section-heading wrapper; we choreograph its
         children, which the app never touches. */
      all(".section-heading").forEach(function (head) {
        var num = head.querySelector(".section-number");
        var kicker = head.querySelector("div > p");
        var title = head.querySelector("h2");
        var desc = head.querySelector(".section-description");
        var tl = gsap.timeline({
          scrollTrigger: { trigger: head, start: "top 90%", once: true },
        });
        if (num) {
          tl.from(num, {
            scale: 0.4,
            rotate: -140,
            autoAlpha: 0,
            duration: 0.9,
            ease: "back.out(1.9)",
            clearProps: "transform,opacity,visibility",
          });
        }
        [kicker, title, desc].forEach(function (el, idx) {
          if (!el) return;
          tl.from(
            el,
            {
              yPercent: 70,
              autoAlpha: 0,
              duration: 0.75,
              clearProps: "transform,opacity,visibility",
            },
            0.12 + idx * 0.1
          );
        });
      });

      /* ---------- 4.8 per-screen atmosphere, tied to scroll ---------- */
      all(".art-screen").forEach(function (screen) {
        var layer = screen.querySelector(":scope > .bux-screen-fx");
        if (!layer) return;
        var sweep = layer.querySelector(".bux-screen-sweep");
        var bloom = layer.querySelector(".bux-screen-bloom");

        gsap.fromTo(
          sweep,
          { xPercent: 0, opacity: 0 },
          {
            xPercent: 420,
            opacity: 0.85,
            ease: "none",
            scrollTrigger: {
              trigger: screen,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.1,
            },
          }
        );
        gsap.fromTo(
          bloom,
          { opacity: 0 },
          {
            opacity: 0.55,
            ease: "none",
            scrollTrigger: {
              trigger: screen,
              start: "top bottom",
              end: "center center",
              scrub: 0.8,
            },
          }
        );

        /* the decorative wash layer is safe to scale — it is inset:0,
           pointer-events:none and carries no hotspot geometry */
        var wash = screen.querySelector(".vanta-wash");
        if (wash) {
          gsap.fromTo(
            wash,
            { opacity: 0.04, scale: 1 },
            {
              opacity: 0.15,
              scale: 1.07,
              ease: "none",
              scrollTrigger: {
                trigger: screen,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            }
          );
        }

        /* Opt-in only: zooming the artwork crops ~1.5% of each edge, so it
           stays behind ?kenburns=1. Hotspots are scaled about the SCREEN's
           centre (origin expressed as a % of each child's own box, which is
           resize-invariant) so nothing drifts out of alignment. */
        if (KEN_BURNS) {
          var kids = Array.prototype.filter.call(screen.children, function (el) {
            return !el.classList.contains("bux-screen-fx");
          });
          var setOrigins = function () {
            var s = screen.getBoundingClientRect();
            var cx = s.left + s.width / 2;
            var cy = s.top + s.height / 2;
            kids.forEach(function (kid) {
              var r = kid.getBoundingClientRect();
              if (!r.width || !r.height) return;
              gsap.set(kid, {
                transformOrigin:
                  ((cx - r.left) / r.width) * 100 +
                  "% " +
                  ((cy - r.top) / r.height) * 100 +
                  "%",
              });
            });
          };
          setOrigins();
          gsap.fromTo(
            kids,
            { scale: 1.03 },
            {
              scale: 1.075,
              ease: "none",
              scrollTrigger: {
                trigger: screen,
                start: "top bottom",
                end: "bottom top",
                scrub: 1.2,
                onRefresh: setOrigins,
              },
            }
          );
        }
      });

      /* ---------- 4.9 team collage: photographic "develop" reveal ----------
         .collage-layer runs a CSS `portraitDrift` transform animation, so we
         only touch opacity and hand it straight back with clearProps. */
      var collage = document.querySelector(".team-collage");
      if (collage) {
        var plates = [].concat(
          free(collage.querySelectorAll(".bux-collage-video")),
          free(collage.querySelectorAll(".collage-base")),
          free(collage.querySelectorAll(".collage-layer"))
        );
        if (plates.length) {
          gsap.from(plates, {
            autoAlpha: 0,
            duration: 1,
            stagger: 0.11,
            clearProps: "opacity,visibility",
            scrollTrigger: { trigger: collage, start: "top 82%", once: true },
          });
        }
        var label = collage.querySelector(".collage-label");
        if (label) {
          gsap.from(label, {
            yPercent: 120,
            autoAlpha: 0,
            duration: 0.8,
            delay: 0.5,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: collage, start: "top 82%", once: true },
          });
        }
      }

      /* ---------- 4.10 player galaxy ----------
         .orbit-player carries the CSS `orbitFloat` transform loop, so its
         entrance is opacity-only; the parent grid gets the parallax. */
      var galaxy = document.querySelector(".player-galaxy");
      if (galaxy) {
        var copy = free(galaxy.querySelectorAll(".galaxy-copy > *"));
        if (copy.length) {
          gsap.from(copy, {
            yPercent: 80,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.1,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: galaxy, start: "top 84%", once: true },
          });
        }
        var players = all(".orbit-player", galaxy);
        if (players.length) {
          gsap.from(players, {
            autoAlpha: 0,
            duration: 0.7,
            stagger: { each: 0.09, from: "center" },
            clearProps: "opacity,visibility",
            scrollTrigger: { trigger: galaxy, start: "top 76%", once: true },
          });
        }
        var orbits = galaxy.querySelector(".player-orbits");
        if (orbits) {
          gsap.fromTo(
            orbits,
            { y: 34 },
            {
              y: -34,
              ease: "none",
              scrollTrigger: {
                trigger: galaxy,
                start: "top bottom",
                end: "bottom top",
                scrub: 1,
              },
            }
          );
        }
      }

      /* ---------- 4.11 caseboard: title, parallax, card choreography ---------- */
      var board = document.querySelector(".caseboard");
      if (board) {
        var boardTitle = free(board.querySelectorAll(".caseboard-title > *"));
        if (boardTitle.length) {
          gsap.from(boardTitle, {
            yPercent: 90,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.12,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: board, start: "top 85%", once: true },
          });
        }
      }

      ScrollTrigger.batch(".case-card", {
        start: "top 94%",
        once: true,
        onEnter: function (batch) {
          gsap.from(batch, {
            yPercent: 14,
            autoAlpha: 0,
            rotationX: 12,
            transformPerspective: 900,
            transformOrigin: "50% 100%",
            duration: 0.85,
            stagger: 0.07,
            clearProps: "transform,opacity,visibility",
          });
        },
      });

      /* ---------- 4.12 idea bank ---------- */
      var bank = document.querySelector(".idea-bank");
      if (bank) {
        var bankHead = free(bank.querySelectorAll(":scope > header > *"));
        if (bankHead.length) {
          gsap.from(bankHead, {
            yPercent: 85,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.12,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: bank, start: "top 85%", once: true },
          });
        }
        var ideaKids = free(bank.querySelectorAll(".idea-cards > *"));
        if (ideaKids.length) {
          gsap.from(ideaKids, {
            yPercent: 16,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.09,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: bank, start: "top 74%", once: true },
          });
        }
      }

      /* ---------- 4.13 knowledge / joy copy blocks ---------- */
      var knowledgeHead = free(all("#knowledge > header > *"));
      if (knowledgeHead.length) {
        gsap.from(knowledgeHead, {
          yPercent: 85,
          autoAlpha: 0,
          duration: 0.8,
          stagger: 0.12,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: "#knowledge", start: "top 85%", once: true },
        });
      }

      var joy = document.querySelector("#joy");
      if (joy) {
        var joyBits = free([
          joy.querySelector(".joy-media"),
          joy.querySelector(".joy-now"),
        ]);
        if (joyBits.length) {
          gsap.from(joyBits, {
            scale: 0.86,
            autoAlpha: 0,
            duration: 0.9,
            stagger: 0.14,
            ease: "back.out(1.5)",
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: joy, start: "top 72%", once: true },
          });
        }
      }

      /* ---------- 4.14 end screen: the closing artwork ----------
         The shipped ornaments (.end-decor) and the duplicated sign-off
         line (.end-copy) are hidden by bux-endscreen.css now that the
         new artwork carries both, so the beat moves onto the image.

         Scaling .art-base is safe *only* here: the end screen's single
         hit target is .back-top, a full-bleed inset:0 link, so it can
         never fall out of alignment. The other art screens carry
         percentage-positioned hotspots and are deliberately left alone. */
      var endArt = document.querySelector(".end-screen .art-base");
      if (endArt) {
        gsap.from(endArt, {
          scale: 1.05,
          autoAlpha: 0,
          duration: 1.3,
          ease: "power2.out",
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: "#end", start: "top 82%", once: true },
        });

        // Slow drift so the closing frame keeps breathing as you settle on it.
        gsap.fromTo(
          endArt,
          { yPercent: -1.6 },
          {
            yPercent: 1.6,
            ease: "none",
            scrollTrigger: {
              trigger: "#end",
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          }
        );
      }

      /* ---------- 4.15 primary CTA breathing ----------
         xPercent/yPercent replicate the stylesheet's translate(-50%,-50%)
         so GSAP can own the transform without the button jumping. */
      var cta = document.querySelector(".video-play-center");
      if (cta) {
        gsap.set(cta, { xPercent: -50, yPercent: -50 });
        gsap.to(cta, {
          scale: 1.055,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }

      /* ---------- 4.16 magnetic tilt on the case cards ---------- */
      var tiltCleanups = [];
      all(".case-card").forEach(function (card) {
        var rx = gsap.quickTo(card, "rotationY", { duration: 0.45, ease: "power3" });
        var ry = gsap.quickTo(card, "rotationX", { duration: 0.45, ease: "power3" });
        var lift = gsap.quickTo(card, "y", { duration: 0.45, ease: "power3" });

        function move(e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          gsap.set(card, { transformPerspective: 900 });
          rx(px * 11);
          ry(-py * 9);
          lift(-9);
        }
        function leave() {
          gsap.to(card, {
            rotationX: 0,
            rotationY: 0,
            y: 0,
            duration: 0.55,
            ease: "power3.out",
            onComplete: function () {
              gsap.set(card, { clearProps: "transform" });
            },
          });
        }
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        tiltCleanups.push(function () {
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
          gsap.set(card, { clearProps: "transform" });
        });
      });

      /* ---------- 4.17 orbit portrait glow (box-shadow only, so the
                        stylesheet's hover scale keeps working) ---------- */
      var glowCleanups = [];
      all(".orbit-player").forEach(function (player) {
        var frame = player.querySelector(".orbit-frame");
        if (!frame) return;
        function enter() {
          gsap.to(frame, {
            boxShadow:
              "7px 8px 0 rgba(15,30,112,0.38), 0 0 34px 7px rgba(233,161,200,0.6)",
            duration: 0.4,
          });
        }
        function leave() {
          gsap.to(frame, {
            boxShadow: "7px 8px 0 rgba(15,30,112,0.38)",
            duration: 0.45,
            onComplete: function () {
              gsap.set(frame, { clearProps: "boxShadow" });
            },
          });
        }
        player.addEventListener("pointerenter", enter);
        player.addEventListener("pointerleave", leave);
        player.addEventListener("focus", enter);
        player.addEventListener("blur", leave);
        glowCleanups.push(function () {
          player.removeEventListener("pointerenter", enter);
          player.removeEventListener("pointerleave", leave);
          player.removeEventListener("focus", enter);
          player.removeEventListener("blur", leave);
          gsap.set(frame, { clearProps: "boxShadow" });
        });
      });

      /* ---------- 4.18 nav lift as you leave the top ---------- */
      var nav = document.querySelector(".top-nav");
      if (nav) {
        gsap.fromTo(
          nav,
          { boxShadow: "0 12px 36px rgba(27,39,103,0.15)" },
          {
            boxShadow: "0 18px 52px rgba(27,39,103,0.34)",
            ease: "none",
            scrollTrigger: {
              trigger: shell,
              start: "top top",
              end: "+=520",
              scrub: 0.6,
            },
          }
        );
      }

      /* ---------- cleanup handed back to matchMedia ---------- */
      return function () {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerdown", onMove);
        document.removeEventListener("mouseleave", onLeave);
        tiltCleanups.forEach(function (fn) {
          fn();
        });
        glowCleanups.forEach(function (fn) {
          fn();
        });
      };
    });

    /* ======================================================== *
     * 5. Keep trigger positions honest: the page is image-heavy
     *    and loads two remote webfonts.
     * ======================================================== */
    function refresh() {
      ScrollTrigger.refresh();
    }
    window.addEventListener("load", refresh);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refresh);
    all("img", shell).forEach(function (img) {
      if (!img.complete) img.addEventListener("load", refresh, { once: true });
    });
    setTimeout(refresh, 1200);
    setTimeout(refresh, 3000);

    window.BUXMotion = {
      refresh: refresh,
      kill: function () {
        mm.revert();
        ScrollTrigger.getAll().forEach(function (t) {
          t.kill();
        });
        fx.remove();
        progress.remove();
        all(".bux-screen-fx").forEach(function (el) {
          el.remove();
        });
      },
    };
  });
})();
