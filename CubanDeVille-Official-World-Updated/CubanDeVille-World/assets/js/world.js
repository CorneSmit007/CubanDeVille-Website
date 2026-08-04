(() => {
  'use strict';

  const canvas = document.getElementById('worldCanvas');
  if (!canvas) return;

  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);

  let width = 0;
  let height = 0;
  let dpr = 1;
  let stars = [];
  let anchors = [];
  let frame = 0;
  let lastTime = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;
  let scrollVelocity = 0;
  let previousScroll = window.scrollY;
  let resizeTimer = 0;

  const randomRange = (min, max) => min + Math.random() * (max - min);

  const createStar = (anchor = false) => ({
    x: randomRange(-width * .82, width * .82),
    y: randomRange(-height * .82, height * .82),
    z: randomRange(120, 1200),
    previousZ: 0,
    radius: anchor ? randomRange(1.1, 2.2) : randomRange(.35, 1.4),
    alpha: anchor ? randomRange(.35, .72) : randomRange(.14, .62),
    phase: randomRange(0, Math.PI * 2),
    anchor
  });

  const resetStar = (star, far = true) => {
    star.x = randomRange(-width * .82, width * .82);
    star.y = randomRange(-height * .82, height * .82);
    star.z = far ? randomRange(900, 1250) : randomRange(120, 1200);
    star.previousZ = star.z + 4;
  };

  const resize = () => {
    width = Math.max(window.innerWidth, 320);
    height = Math.max(window.innerHeight, 480);
    dpr = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.7);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const density = saveData ? 0.00006 : coarsePointer ? 0.000105 : 0.000145;
    const count = Math.max(70, Math.min(coarsePointer ? 145 : 240, Math.round(width * height * density)));
    stars = Array.from({ length: count }, () => createStar(false));
    anchors = Array.from({ length: coarsePointer ? 10 : 18 }, () => createStar(true));
  };

  const project = (star, zValue = star.z) => {
    const fov = Math.min(width, height) * .76;
    const scale = fov / Math.max(zValue, 1);
    return {
      x: width * .5 + (star.x + pointerX * .28) * scale,
      y: height * .5 + (star.y + pointerY * .22) * scale,
      scale
    };
  };

  const drawBackground = () => {
    const gradient = context.createRadialGradient(
      width * .73, height * .21, 0,
      width * .73, height * .21, Math.max(width, height) * .9
    );
    gradient.addColorStop(0, '#0b0915');
    gradient.addColorStop(.28, '#07070c');
    gradient.addColorStop(1, '#040405');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    const lowerGlow = context.createRadialGradient(
      width * .18, height * .8, 0,
      width * .18, height * .8, Math.max(width, height) * .52
    );
    lowerGlow.addColorStop(0, 'rgba(255,255,255,.026)');
    lowerGlow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = lowerGlow;
    context.fillRect(0, 0, width, height);
  };

  const drawConnections = (time) => {
    const projected = anchors
      .map((star) => ({ star, point: project(star) }))
      .filter(({ point }) => point.x > -80 && point.x < width + 80 && point.y > -80 && point.y < height + 80);

    context.lineWidth = 1;
    for (let i = 0; i < projected.length; i += 1) {
      for (let j = i + 1; j < projected.length; j += 1) {
        const a = projected[i].point;
        const b = projected[j].point;
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const threshold = coarsePointer ? 115 : 155;
        if (distance > threshold) continue;
        const alpha = (1 - distance / threshold) * .075;
        context.strokeStyle = `rgba(190,184,255,${alpha})`;
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }
    }

    projected.forEach(({ star, point }) => {
      const twinkle = .72 + Math.sin(time * .0011 + star.phase) * .28;
      const radius = Math.max(.45, star.radius * point.scale * 1.4);
      context.fillStyle = `rgba(230,228,255,${star.alpha * twinkle})`;
      context.beginPath();
      context.arc(point.x, point.y, Math.min(radius, 2.3), 0, Math.PI * 2);
      context.fill();
    });
  };

  const drawStars = (delta, time) => {
    const speed = reducedMotion ? 0 : (18 + scrollVelocity * .55) * delta;

    stars.forEach((star) => {
      star.previousZ = star.z;
      star.z -= speed;
      if (star.z < 28) resetStar(star, true);

      const point = project(star);
      if (point.x < -30 || point.x > width + 30 || point.y < -30 || point.y > height + 30) {
        if (star.z < 340) resetStar(star, true);
        return;
      }

      const previous = project(star, star.previousZ + Math.max(2, speed * 2.2));
      const depth = 1 - Math.min(star.z / 1200, 1);
      const twinkle = .78 + Math.sin(time * .0014 + star.phase) * .22;
      const alpha = star.alpha * (.35 + depth * .85) * twinkle;
      const radius = Math.max(.3, star.radius * (.48 + depth * 1.25));

      if (!reducedMotion && depth > .45) {
        context.strokeStyle = `rgba(210,207,255,${alpha * .22})`;
        context.lineWidth = Math.max(.35, radius * .48);
        context.beginPath();
        context.moveTo(previous.x, previous.y);
        context.lineTo(point.x, point.y);
        context.stroke();
      }

      context.fillStyle = `rgba(245,244,255,${alpha})`;
      context.beginPath();
      context.arc(point.x, point.y, Math.min(radius, 2.15), 0, Math.PI * 2);
      context.fill();
    });

    anchors.forEach((star) => {
      star.previousZ = star.z;
      star.z -= speed * .48;
      if (star.z < 100) resetStar(star, true);
    });
  };

  const render = (time) => {
    const elapsed = Math.min((time - lastTime) / 1000, .05);
    lastTime = time;

    pointerX += (targetPointerX - pointerX) * .035;
    pointerY += (targetPointerY - pointerY) * .035;
    scrollVelocity *= .91;

    drawBackground();
    drawConnections(time);
    drawStars(elapsed, time);

    if (!document.hidden && !reducedMotion) frame = requestAnimationFrame(render);
  };

  window.addEventListener('pointermove', (event) => {
    if (coarsePointer || reducedMotion) return;
    targetPointerX = (event.clientX / width - .5) * -120;
    targetPointerY = (event.clientY / height - .5) * -90;
  }, { passive: true });

  window.addEventListener('scroll', () => {
    const current = window.scrollY;
    scrollVelocity = Math.min(34, Math.abs(current - previousScroll));
    previousScroll = current;
  }, { passive: true });

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 160);
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !reducedMotion) {
      lastTime = performance.now();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    }
  });

  resize();
  if (reducedMotion) render(performance.now());
  else frame = requestAnimationFrame(render);
})();
