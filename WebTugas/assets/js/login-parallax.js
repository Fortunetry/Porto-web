/* =========================================================
   login-parallax.js
   Depth parallax for the login background.
   No dependencies. Only .scene is rotated; one transform per frame.
   ========================================================= */

(() => {
  const px = document.querySelector(".px");
  if (!px) return;

  const sc = px.firstElementChild;
  if (!sc) return;

  const P = parseFloat(getComputedStyle(px).getPropertyValue("--p")) || 1200;
  const MAX = 9;
  const D = Math.PI / 180;
  const L = [...sc.children].map((e) => ({
    e,
    z: parseFloat(e.style.getPropertyValue("--z")) || 0,
  }));
  const rm = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, m) => Math.max(-m, Math.min(m, v));

  let nx = 0;
  let ny = 0;
  let cx = 0;
  let cy = 0;
  let idle = 0;
  let t0 = 0;
  let tin = 0;
  let raf = 0;
  let prev = "";
  let queued = false;

  // <solver>
  // Corner projection at the four extreme tilts; the layer must still cover the viewport corners.
  function covers(z, o, W, H) {
    const s = (P - z) / P,
      m = MAX * D;
    for (const a of [-m, m])
      for (const b of [-m, m])
        for (const [kx, ky] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          const x = (kx * o * W) / 2 * s,
            y = (ky * o * H) / 2 * s,
            x1 = x * Math.cos(b) + z * Math.sin(b),
            z1 = -x * Math.sin(b) + z * Math.cos(b),
            y2 = y * Math.cos(a) - z1 * Math.sin(a),
            z2 = y * Math.sin(a) + z1 * Math.cos(a),
            k = P / (P - z2);
          if (kx * x1 * k < (W / 2) * 1.02 || ky * y2 * k < (H / 2) * 1.02)
            return false;
        }
    return true;
  }
  function solve() {
    const W = innerWidth,
      H = innerHeight;
    for (const l of L) {
      let lo = 1,
        hi = 3;
      for (let i = 0; i < 14; i++) {
        const m = (lo + hi) / 2;
        covers(l.z, m, W, H) ? (hi = m) : (lo = m);
      }
      l.e.style.setProperty("--o", hi.toFixed(3));
    }
  }
  // </solver>

  function frame(n) {
    const dt = Math.min(0.05, (n - t0) / 1e3);
    t0 = n;
    idle += ((n - tin > 2500 ? 1 : 0) - idle) * Math.min(1, dt / 1.5);
    const s = n / 1e3,
      ry = clamp(-nx * MAX + Math.sin(s * 0.5) * 1.4 * idle, MAX),
      rx = clamp(ny * MAX + Math.sin(s * 0.37 + 1) * 1.0 * idle, MAX),
      k = 1 - Math.exp(-dt / 0.12);
    cx += (ry - cx) * k;
    cy += (rx - cy) * k;
    const t = `rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`;
    if (t !== prev) {
      sc.style.transform = t;
      prev = t;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || rm.matches || document.hidden) return;
    t0 = tin = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function poke() {
    tin = performance.now();
    idle = 0;
  }

  addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    nx = clamp((e.clientX / innerWidth) * 2 - 1, 1);
    ny = clamp((e.clientY / innerHeight) * 2 - 1, 1);
    poke();
  });

  document.documentElement.addEventListener("pointerleave", () => {
    nx = 0;
    ny = 0;
  });

  function scheduleSolve() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      solve();
    });
  }

  addEventListener("resize", scheduleSolve);

  rm.addEventListener("change", () => {
    if (rm.matches) {
      stop();
      sc.style.transform = "";
      prev = "";
    } else {
      start();
    }
  });

  document.addEventListener("visibilitychange", () =>
    document.hidden ? stop() : start(),
  );

  solve();
  start();
})();
