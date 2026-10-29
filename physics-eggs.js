/* ==========================================================================
   physics-eggs.js — hidden physics easter eggs for CalacAttack

   HOW TO ADD IT TO A PAGE
   Paste these two lines just before </body>:

     <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
     <script src="physics-eggs.js"></script>

   SECRET CODES (type anywhere on the page, not inside a text box)
     g=0      gravity off: everything floats
     g=9.8    Earth gravity
     g=1.6    Moon gravity
     g=24.8   Jupiter gravity
     g=-9.8   gravity upside down
     mu=0     friction off: things slide and bounce forever
     mu=1     friction back on
     psi      quantum mode on/off: unobserved things blur into probability clouds
     reset    put everything back (or press Esc)

   While physics is on, you can grab and throw things with the mouse.
   In the browser console: physics.gravity(0), physics.friction(0),
   physics.quantum(), physics.reset()
   ========================================================================== */

(function () {
  "use strict";

  // ===================== SETTINGS (safe to edit) ==========================
  const SETTINGS = {
    // Typed code  ->  gravity in m/s²
    gravityCodes: {
      "g=0": 0,
      "g=9.8": 9.8,
      "g=1.6": 1.6,
      "g=24.8": 24.8,
      "g=-9.8": -9.8,
    },

    // Typed code  ->  friction coefficient (0 = none, 1 = very grippy)
    frictionCodes: {
      "mu=0": 0,
      "mu=1": 1,
    },

    quantumCode: "psi", // turns quantum mode on and off
    quantumBlur: 6,     // how fuzzy unobserved things get (pixels)

    resetCode: "reset", // pressing Esc also resets

    // Which page elements come loose. (Only ones fully on screen move.)
    targets: "h1, h2, h3, h4, p, img, li, button, figure, blockquote, .card",

    // Elements that never move (and everything inside them).
    // Add data-no-physics to any element in your HTML to protect it.
    skip: "nav, [data-no-physics]",

    maxElements: 120,   // safety limit for very long pages
    floatKick: 1.5,     // how hard things drift when gravity turns off
    bounciness: 0.3,    // 0 = thud, 1 = superball (when friction is on)
    showMessages: true, // little pop-up label when an effect changes
    consoleHint: true,  // secret note for anyone who opens DevTools
  };
  // ========================================================================

  if (typeof Matter === "undefined") {
    console.warn("physics-eggs.js: Matter.js didn't load, so the easter eggs are off.");
    return;
  }

  const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint } = Matter;
  const STEP = 1000 / 60;

  let engine = null;
  let items = [];
  let walls = [];
  let overlay = null;
  let rafId = null;
  let lastTime = 0;
  let leftover = 0;
  let gravity = 9.8;
  let mu = null; // null = default friction
  const scrollState = { locked: false };

  // ---------- turning physics on ----------

  function start() {
    if (engine) return;
    lockScroll();

    engine = Engine.create();
    engine.gravity.y = gravity / 9.8;

    items = pickElements(true).map(function (el) {
      const r = el.getBoundingClientRect();
      const body = Bodies.rectangle(r.left + r.width / 2, r.top + r.height / 2, r.width, r.height);
      const item = {
        el: el,
        body: body,
        x0: body.position.x,
        y0: body.position.y,
        oldTransform: el.style.transform,
        oldTransition: el.style.transition,
        oldWillChange: el.style.willChange,
      };
      el.style.transition = "none";
      el.style.willChange = "transform";
      return item;
    });
    Composite.add(engine.world, items.map(function (i) { return i.body; }));

    buildWalls();

    // An invisible layer on top of the page lets you grab and throw things.
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;cursor:grab;touch-action:none;";
    document.body.appendChild(overlay);
    const mouse = Mouse.create(overlay);
    Composite.add(engine.world, MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: { stiffness: 0.2, render: { visible: false } },
    }));

    window.addEventListener("resize", buildWalls);
    lastTime = performance.now();
    leftover = 0;
    rafId = requestAnimationFrame(loop);
  }

  // onScreenOnly: physics only moves things that are fully on screen;
  // quantum mode affects the whole page.
  function pickElements(onScreenOnly) {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const limit = onScreenOnly ? SETTINGS.maxElements : SETTINGS.maxElements * 4;
    const chosen = [];
    const all = document.querySelectorAll(SETTINGS.targets);

    for (let i = 0; i < all.length && chosen.length < limit; i++) {
      const el = all[i];
      if (SETTINGS.skip && el.closest(SETTINGS.skip)) continue;
      // If a parent is already moving, its children ride along with it.
      if (chosen.some(function (c) { return c.contains(el); })) continue;

      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (cs.display === "inline" && el.tagName !== "IMG") continue;
      if (cs.position === "fixed" || cs.position === "sticky") continue;

      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      if (onScreenOnly && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1)) continue;

      chosen.push(el);
    }
    return chosen;
  }

  function buildWalls() {
    if (!engine) return;
    if (walls.length) Composite.remove(engine.world, walls);
    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    const t = 400; // thick walls so fast objects can't tunnel through
    walls = [
      Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, { isStatic: true }), // floor
      Bodies.rectangle(w / 2, -t / 2, w + t * 2, t, { isStatic: true }),    // ceiling
      Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, { isStatic: true }),    // left
      Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, { isStatic: true }), // right
    ];
    Composite.add(engine.world, walls);
    applyFriction();
  }

  function applyFriction() {
    if (!engine) return;
    const frictionless = mu === 0;
    const bodies = items.map(function (i) { return i.body; }).concat(walls);
    bodies.forEach(function (b) {
      b.friction = frictionless ? 0 : (mu === null ? 0.4 : mu);
      b.frictionStatic = frictionless ? 0 : 0.5;
      b.frictionAir = frictionless ? 0 : 0.002;
      b.restitution = frictionless ? 1 : SETTINGS.bounciness;
    });
  }

  // ---------- animation loop ----------

  function loop(now) {
    // Fixed time steps keep the physics the same speed on 60 Hz and 120 Hz screens.
    leftover += Math.min(now - lastTime, 100);
    lastTime = now;
    while (leftover >= STEP) {
      Engine.update(engine, STEP);
      leftover -= STEP;
    }

    const w = document.documentElement.clientWidth;
    const h = document.documentElement.clientHeight;
    items.forEach(function (it) {
      const b = it.body;
      const p = b.position;
      // If something escapes the walls, bring it back to the middle.
      if (p.x < -300 || p.x > w + 300 || p.y < -300 || p.y > h + 300) {
        Body.setPosition(b, { x: w / 2, y: h / 2 });
        Body.setVelocity(b, { x: 0, y: 0 });
      }
      it.el.style.transform =
        "translate(" + (p.x - it.x0) + "px," + (p.y - it.y0) + "px) rotate(" + b.angle + "rad)";
    });

    rafId = requestAnimationFrame(loop);
  }

  // ---------- the effects ----------

  function setGravity(g) {
    g = Number(g);
    if (!isFinite(g)) return;
    gravity = g;
    start();
    engine.gravity.y = g / 9.8;
    if (g === 0) kick();

    const labels = {
      "0": "g = 0. Gravity is off. Grab something and give it a push.",
      "9.8": "g = 9.8 m/s². Earth gravity.",
      "1.6": "g = 1.6 m/s². Welcome to the Moon.",
      "24.8": "g = 24.8 m/s². Jupiter gravity.",
      "-9.8": "g = −9.8 m/s². Gravity is upside down.",
    };
    message((labels[String(g)] || "g = " + g + " m/s².") + " Press Esc to reset.");
  }

  function setFriction(m) {
    m = Number(m);
    if (!isFinite(m)) return;
    mu = Math.max(0, Math.min(1, m));
    start();
    applyFriction();
    message(mu === 0
      ? "μ = 0. Friction is off. Things in motion stay in motion. Press Esc to reset."
      : "μ = " + mu + ". Friction is back on. Press Esc to reset.");
  }

  // Give every element a gentle random push so it drifts in zero gravity.
  function kick() {
    const k = SETTINGS.floatKick;
    items.forEach(function (it) {
      Body.setVelocity(it.body, {
        x: (Math.random() * 2 - 1) * k,
        y: (Math.random() * 2 - 1) * k - k * 0.5,
      });
      Body.setAngularVelocity(it.body, (Math.random() * 2 - 1) * 0.006);
    });
  }

  function reset() {
    const hadQuantum = quantumOn;
    if (quantumOn) setQuantum(false, true);
    if (!engine) {
      if (hadQuantum) message("Reset. The laws of physics are back to normal.");
      return;
    }
    cancelAnimationFrame(rafId);
    window.removeEventListener("resize", buildWalls);
    if (overlay) overlay.remove();

    const old = items;
    old.forEach(function (it) {
      it.el.style.transition = "transform 0.9s cubic-bezier(.2,.8,.2,1)";
      it.el.style.transform = it.oldTransform;
    });

    Engine.clear(engine);
    engine = null;
    items = [];
    walls = [];
    overlay = null;
    gravity = 9.8;
    mu = null;

    setTimeout(function () {
      old.forEach(function (it) {
        it.el.style.transition = it.oldTransition;
        it.el.style.willChange = it.oldWillChange;
      });
      if (!engine) unlockScroll();
    }, 950);

    message("Reset. The laws of physics are back to normal.");
  }

  // ---------- quantum mode ----------
  // Elements nobody is looking at blur and jitter like a probability cloud.
  // Hovering (or tapping, or tabbing to) one "measures" it, and it snaps sharp.
  // This part doesn't use Matter.js. It works alongside gravity and friction.

  let quantumOn = false;
  let quantumEls = [];
  let observed = null;
  let quantumStyle = null;
  let pendingPointer = null;

  function setQuantum(on, quiet) {
    on = on === undefined ? !quantumOn : !!on;

    if (on && !quantumOn) {
      addQuantumStyles();
      quantumEls = pickElements(false);
      quantumEls.forEach(function (el) {
        const r = function (n) { return ((Math.random() * 2 - 1) * n).toFixed(1) + "px"; };
        el.style.setProperty("--qm-x1", r(4));
        el.style.setProperty("--qm-y1", r(4));
        el.style.setProperty("--qm-x2", r(4));
        el.style.setProperty("--qm-y2", r(4));
        el.style.setProperty("--qm-d", (0.15 + Math.random() * 0.25).toFixed(2) + "s");
        el.classList.add("qm-cloud");
      });
      document.addEventListener("pointermove", onPointer, true);
      document.addEventListener("pointerdown", onPointer, true);
      document.addEventListener("focusin", onFocus);
      document.documentElement.addEventListener("mouseleave", onLeave);
      quantumOn = true;
      if (!quiet) message("ψ Quantum mode on. Anything you aren't observing is a probability cloud. Hover to measure it.");
    } else if (!on && quantumOn) {
      document.removeEventListener("pointermove", onPointer, true);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("focusin", onFocus);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      quantumEls.forEach(function (el) {
        el.classList.remove("qm-cloud", "qm-observed");
        ["--qm-x1", "--qm-y1", "--qm-x2", "--qm-y2", "--qm-d"].forEach(function (p) { el.style.removeProperty(p); });
      });
      quantumEls = [];
      observed = null;
      quantumOn = false;
      if (!quiet) message("Quantum mode off. Everything is classical again.");
    }
  }

  function addQuantumStyles() {
    if (quantumStyle) return;
    quantumStyle = document.createElement("style");
    quantumStyle.textContent =
      "@keyframes qm-spread{from{filter:blur(0);opacity:1}to{filter:blur(var(--qm-blur));opacity:.45}}" +
      "@keyframes qm-jitter{from{translate:var(--qm-x1) var(--qm-y1)}to{translate:var(--qm-x2) var(--qm-y2)}}" +
      ".qm-cloud{--qm-blur:" + SETTINGS.quantumBlur + "px;" +
      "animation:qm-spread .6s ease-out forwards,qm-jitter var(--qm-d) ease-in-out infinite alternate}" +
      ".qm-cloud.qm-observed{animation:none;filter:none;opacity:1;translate:none}" +
      "@media (prefers-reduced-motion:reduce){.qm-cloud{animation:qm-spread .01s forwards}}";
    document.head.appendChild(quantumStyle);
  }

  // Find which cloud the pointer is over. Checking positions (instead of
  // relying on hover) keeps this working while the physics drag layer is on.
  function onPointer(e) {
    const first = pendingPointer === null;
    pendingPointer = { x: e.clientX, y: e.clientY };
    if (!first) return;
    requestAnimationFrame(function () {
      const p = pendingPointer;
      pendingPointer = null;
      let hit = null;
      for (let i = quantumEls.length - 1; i >= 0; i--) {
        const r = quantumEls[i].getBoundingClientRect();
        if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) { hit = quantumEls[i]; break; }
      }
      setObserved(hit);
    });
  }

  function onFocus(e) {
    const hit = quantumEls.find(function (el) { return el.contains(e.target); });
    setObserved(hit || null);
  }

  function onLeave() { setObserved(null); }

  function setObserved(el) {
    if (el === observed) return;
    if (observed) observed.classList.remove("qm-observed");
    observed = el;
    if (el) el.classList.add("qm-observed");
  }

  // ---------- scroll lock (keeps the walls lined up with the screen) ----------

  function lockScroll() {
    if (scrollState.locked) return;
    const html = document.documentElement;
    const body = document.body;
    const scrollbar = window.innerWidth - html.clientWidth;
    scrollState.htmlOverflow = html.style.overflow;
    scrollState.bodyPadding = body.style.paddingRight;
    html.style.overflow = "hidden";
    if (scrollbar > 0) {
      body.style.paddingRight = (parseFloat(getComputedStyle(body).paddingRight) + scrollbar) + "px";
    }
    scrollState.locked = true;
  }

  function unlockScroll() {
    if (!scrollState.locked) return;
    document.documentElement.style.overflow = scrollState.htmlOverflow;
    document.body.style.paddingRight = scrollState.bodyPadding;
    scrollState.locked = false;
  }

  // ---------- pop-up messages ----------

  let toast = null;
  let toastTimer = null;
  function message(text) {
    if (!SETTINGS.showMessages) return;
    if (!toast) {
      toast = document.createElement("div");
      toast.setAttribute("role", "status");
      toast.style.cssText =
        "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));" +
        "transform:translateX(-50%);z-index:2147483647;max-width:min(560px,calc(100vw - 32px));" +
        "background:rgba(14,22,36,.94);color:#fff;font:600 15px/1.4 system-ui,sans-serif;" +
        "padding:10px 16px;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.28);" +
        "text-align:center;pointer-events:none;transition:opacity .3s;";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.opacity = "1";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.style.opacity = "0"; }, 4000);
  }

  // ---------- secret codes ----------

  let typed = "";
  document.addEventListener("keydown", function (e) {
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "Escape") { reset(); return; }
    if (!e.key || e.key.length !== 1) return;

    typed = (typed + e.key.toLowerCase()).slice(-24);

    for (const code in SETTINGS.gravityCodes) {
      if (typed.endsWith(code.toLowerCase())) { typed = ""; setGravity(SETTINGS.gravityCodes[code]); return; }
    }
    for (const code in SETTINGS.frictionCodes) {
      if (typed.endsWith(code.toLowerCase())) { typed = ""; setFriction(SETTINGS.frictionCodes[code]); return; }
    }
    if (typed.endsWith(SETTINGS.quantumCode.toLowerCase())) { typed = ""; setQuantum(); return; }
    if (typed.endsWith(SETTINGS.resetCode.toLowerCase())) { typed = ""; reset(); }
  });

  // ---------- console controls for curious students ----------

  window.physics = {
    gravity: setGravity,
    friction: setFriction,
    quantum: function (on) { setQuantum(on); },
    reset: reset,
    help: function () {
      console.log(
        "physics.gravity(0)     zero gravity\n" +
        "physics.gravity(-9.8)  upside down\n" +
        "physics.gravity(274)   try the Sun\n" +
        "physics.friction(0)    frictionless\n" +
        "physics.quantum()      quantum mode on/off\n" +
        "physics.reset()        back to normal"
      );
    },
  };

  if (SETTINGS.consoleHint) {
    console.log(
      "%cYou found the lab console.",
      "font: 700 16px system-ui; color: #2f5bea",
      "\nThis page obeys the laws of physics. Mostly.\nType physics.help() to bend them."
    );
  }
})();
