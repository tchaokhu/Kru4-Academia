// ============================================================
//  Floating arcane particles (embers / dust / sparks)
// ============================================================
(function () {
  const canvas = document.getElementById("particles");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let raf = null;
  const settings = { count: 70, speed: 1, hue: null };

  const PALETTE = [
    [246, 221, 155], // gold
    [224, 191, 110], // gold deep
    [180, 150, 230], // arcane violet
    [150, 190, 240], // arcane blue
  ];

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle(initial) {
    const col = PALETTE[(Math.random() * PALETTE.length) | 0];
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + 20,
      r: 0.6 + Math.random() * 2.2,
      vy: -(0.15 + Math.random() * 0.55),
      vx: (Math.random() - 0.5) * 0.3,
      a: 0.1 + Math.random() * 0.5,
      tw: Math.random() * Math.PI * 2,
      tws: 0.01 + Math.random() * 0.03,
      col,
    };
  }

  function build() {
    particles = [];
    for (let i = 0; i < settings.count; i++) particles.push(makeParticle(true));
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.y += p.vy * settings.speed;
      p.x += p.vx * settings.speed;
      p.tw += p.tws;
      const flick = (Math.sin(p.tw) + 1) / 2;
      const alpha = p.a * (0.35 + 0.65 * flick);
      if (p.y < -20 || p.x < -20 || p.x > W + 20) Object.assign(p, makeParticle(false));
      const [r, g, b] = p.col;
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      grd.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  }

  window.Kru4Particles = {
    init(opts) {
      Object.assign(settings, opts || {});
      resize();
      build();
      if (!raf) tick();
    },
    set(opts) {
      Object.assign(settings, opts || {});
      build();
    },
  };

  window.addEventListener("resize", () => { resize(); });
  // auto-start
  window.Kru4Particles.init();
})();
