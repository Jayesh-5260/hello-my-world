/**
 * ============================================================================
 * JAYESH KHATWANI // AEROSPACE ENGINEERING SIMULATION ENGINE (JS)
 * Multi-Platform Edition (Desktop Mouse + Mobile Touch Responsive)
 * ============================================================================
 */

(function() {
  'use strict';

  // --- CANVAS & SIMULATION SETUP ---
  const canvas = document.getElementById('space-canvas');
  const ctx = canvas.getContext('2d');

  // Detect Touch Device
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  // Resize handler
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initPlanets();
    initStarfield();
  });

  // User Mouse & Cursor Tracker State
  const mouse = {
    x: width / 2,
    y: height / 2,
    targetX: width / 2,
    targetY: height / 2,
    isActive: true,
    hasMoved: false,
    isTouching: false
  };

  // Cursor Rocket Physics State
  const cursorRocket = {
    x: width / 2,
    y: height / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    targetAngle: -Math.PI / 2,
    speed: 0,
    maxSpeed: isTouchDevice ? 10 : 14,
    friction: 0.88,
    accel: isTouchDevice ? 0.08 : 0.12,
    idleTimer: 0
  };

  // Active Particle Arrays
  let plumeParticles = [];
  let explosionParticles = [];
  let stars = [];
  let planets = [];
  let trajectoryRockets = [];

  // Telemetry HUD Elements
  const cursorCoordsEl = document.getElementById('cursor-coords');
  const metTimerEl = document.getElementById('met-timer');
  const cursorToggleBtn = document.getElementById('cursor-toggle-btn');

  // --- INITIALIZE STARFIELD ---
  function initStarfield() {
    stars = [];
    const density = isTouchDevice ? 5500 : 3800; // slightly fewer stars on mobile for battery optimization
    const starCount = Math.floor((width * height) / density);
    for (let i = 0; i < starCount; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() < 0.85 ? Math.random() * 1.5 + 0.5 : Math.random() * 2.5 + 1.2,
        alpha: Math.random() * 0.7 + 0.3,
        twinkleSpeed: Math.random() * 0.03 + 0.008,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: Math.random() < 0.7 ? '#ffffff' : (Math.random() < 0.5 ? '#93c5fd' : '#fde047')
      });
    }
  }

  // --- INITIALIZE REALISTIC PLANETS (RESPONSIVE SCALING) ---
  function initPlanets() {
    const isMobile = width < 768;
    const scale = isMobile ? 0.75 : 1.0;

    planets = [
      {
        name: 'Earth',
        type: 'earth',
        x: isMobile ? width * 0.22 : width * 0.18,
        y: isMobile ? height * 0.38 : height * 0.45,
        radius: 46 * scale,
        glowColor: 'rgba(56, 189, 248, 0.4)',
        atmosphereColor: '#0284c7'
      },
      {
        name: 'Moon',
        type: 'moon',
        parent: 0, // orbits Earth
        distFromParent: 75 * scale,
        radius: 12 * scale,
        orbitAngle: 1.2,
        orbitSpeed: 0.0018,
        glowColor: 'rgba(226, 232, 240, 0.3)'
      },
      {
        name: 'Mars',
        type: 'mars',
        x: isMobile ? width * 0.78 : width * 0.82,
        y: isMobile ? height * 0.28 : height * 0.35,
        radius: 38 * scale,
        glowColor: 'rgba(239, 68, 68, 0.35)',
        atmosphereColor: '#c2410c'
      },
      {
        name: 'Jupiter',
        type: 'jupiter',
        x: isMobile ? width * 0.85 : width * 0.90,
        y: isMobile ? height * 0.82 : height * 0.82,
        radius: 60 * scale,
        glowColor: 'rgba(245, 158, 11, 0.3)'
      }
    ];

    initTrajectoryRockets();
  }

  // --- INITIALIZE AUTONOMOUS TRAJECTORY ROCKETS ---
  function initTrajectoryRockets() {
    trajectoryRockets = [
      {
        id: 'SRMSAT-1',
        originIndex: 0, // Earth
        targetIndex: 2, // Mars
        progress: 0.15,
        speed: 0.00075,
        trail: [],
        color: '#ff6b35',
        trailColor: 'rgba(255, 107, 53, 0.65)',
        x: 0,
        y: 0,
        angle: 0
      },
      {
        id: 'TUM-Orbiter',
        originIndex: 2, // Mars
        targetIndex: 0, // Earth
        progress: 0.65,
        speed: 0.0006,
        trail: [],
        color: '#00e5ff',
        trailColor: 'rgba(0, 229, 255, 0.65)',
        x: 0,
        y: 0,
        angle: 0
      }
    ];
  }

  // --- REALISTIC CELESTIAL RENDERING ---
  function drawRealisticPlanet(planet) {
    let px = planet.x;
    let py = planet.y;

    if (planet.parent !== undefined) {
      const parent = planets[planet.parent];
      planet.orbitAngle += planet.orbitSpeed;
      px = parent.x + Math.cos(planet.orbitAngle) * planet.distFromParent;
      py = parent.y + Math.sin(planet.orbitAngle) * planet.distFromParent * 0.6;
      planet.x = px;
      planet.y = py;
    }

    ctx.save();

    // 1. Atmosphere Glow Ring
    const glow = ctx.createRadialGradient(px, py, planet.radius * 0.8, px, py, planet.radius * 1.5);
    glow.addColorStop(0, planet.glowColor || 'rgba(255,255,255,0.2)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, planet.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Planet Surface Shading
    ctx.beginPath();
    ctx.arc(px, py, planet.radius, 0, Math.PI * 2);
    ctx.clip();

    if (planet.type === 'earth') {
      const oceanGrad = ctx.createRadialGradient(
        px - planet.radius * 0.35,
        py - planet.radius * 0.35,
        planet.radius * 0.1,
        px,
        py,
        planet.radius
      );
      oceanGrad.addColorStop(0, '#38bdf8');
      oceanGrad.addColorStop(0.5, '#0284c7');
      oceanGrad.addColorStop(1, '#0c1a30');
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Continents
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(px - planet.radius * 0.2, py - planet.radius * 0.1, planet.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px + planet.radius * 0.35, py + planet.radius * 0.2, planet.radius * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Atmosphere clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.ellipse(px - planet.radius * 0.1, py - planet.radius * 0.2, planet.radius * 0.6, planet.radius * 0.18, Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

    } else if (planet.type === 'mars') {
      const marsGrad = ctx.createRadialGradient(
        px - planet.radius * 0.35,
        py - planet.radius * 0.35,
        planet.radius * 0.1,
        px,
        py,
        planet.radius
      );
      marsGrad.addColorStop(0, '#fb923c');
      marsGrad.addColorStop(0.5, '#ea580c');
      marsGrad.addColorStop(0.85, '#9a3412');
      marsGrad.addColorStop(1, '#1c0a04');
      ctx.fillStyle = marsGrad;
      ctx.fill();

      ctx.fillStyle = 'rgba(67, 20, 7, 0.55)';
      ctx.beginPath();
      ctx.arc(px + planet.radius * 0.1, py + planet.radius * 0.15, planet.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(px - planet.radius * 0.15, py - planet.radius * 0.75, planet.radius * 0.35, planet.radius * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

    } else if (planet.type === 'moon') {
      const moonGrad = ctx.createRadialGradient(
        px - planet.radius * 0.3,
        py - planet.radius * 0.3,
        planet.radius * 0.1,
        px,
        py,
        planet.radius
      );
      moonGrad.addColorStop(0, '#f8fafc');
      moonGrad.addColorStop(0.6, '#94a3b8');
      moonGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = moonGrad;
      ctx.fill();

      ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
      ctx.beginPath();
      ctx.arc(px - planet.radius * 0.2, py - planet.radius * 0.1, planet.radius * 0.25, 0, Math.PI * 2);
      ctx.arc(px + planet.radius * 0.3, py + planet.radius * 0.25, planet.radius * 0.2, 0, Math.PI * 2);
      ctx.fill();

    } else if (planet.type === 'jupiter') {
      const jupGrad = ctx.createRadialGradient(
        px - planet.radius * 0.3,
        py - planet.radius * 0.3,
        planet.radius * 0.1,
        px,
        py,
        planet.radius
      );
      jupGrad.addColorStop(0, '#fed7aa');
      jupGrad.addColorStop(0.5, '#d97706');
      jupGrad.addColorStop(1, '#1e1104');
      ctx.fillStyle = jupGrad;
      ctx.fill();

      ctx.fillStyle = 'rgba(180, 83, 9, 0.6)';
      ctx.fillRect(px - planet.radius, py - planet.radius * 0.3, planet.radius * 2, planet.radius * 0.25);
      ctx.fillRect(px - planet.radius, py + planet.radius * 0.2, planet.radius * 2, planet.radius * 0.3);

      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.ellipse(px + planet.radius * 0.3, py + planet.radius * 0.25, planet.radius * 0.25, planet.radius * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shadow Hemisphere
    const shadowGrad = ctx.createRadialGradient(
      px - planet.radius * 0.3,
      py - planet.radius * 0.3,
      planet.radius * 0.6,
      px,
      py,
      planet.radius
    );
    shadowGrad.addColorStop(0, 'transparent');
    shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.3)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    ctx.restore();

    // Planet Label
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(planet.name.toUpperCase(), px, py + planet.radius + 14);
  }

  // --- TRAJECTORY ROCKETS & ORBITAL PATHS ---
  function updateAndDrawTrajectories() {
    trajectoryRockets.forEach(rocket => {
      const p1 = planets[rocket.originIndex];
      const p2 = planets[rocket.targetIndex];

      if (!p1 || !p2) return;

      ctx.save();
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.15)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();

      const ctrlX = (p1.x + p2.x) / 2;
      const ctrlY = Math.min(p1.y, p2.y) - (width < 768 ? 90 : 140);

      ctx.moveTo(p1.x, p1.y);
      ctx.quadraticCurveTo(ctrlX, ctrlY, p2.x, p2.y);
      ctx.stroke();
      ctx.restore();

      rocket.progress += rocket.speed;
      if (rocket.progress > 1) {
        rocket.progress = 0;
        const temp = rocket.originIndex;
        rocket.originIndex = rocket.targetIndex;
        rocket.targetIndex = temp;
      }

      const t = rocket.progress;
      const invT = 1 - t;

      const rx = invT * invT * p1.x + 2 * invT * t * ctrlX + t * t * p2.x;
      const ry = invT * invT * p1.y + 2 * invT * t * ctrlY + t * t * p2.y;

      const nextT = Math.min(1, t + 0.01);
      const nextInvT = 1 - nextT;
      const nextX = nextInvT * nextInvT * p1.x + 2 * nextInvT * nextT * ctrlX + nextT * nextT * p2.x;
      const nextY = nextInvT * nextInvT * p1.y + 2 * nextInvT * nextT * ctrlY + nextT * nextT * p2.y;

      rocket.angle = Math.atan2(nextY - ry, nextX - rx);
      rocket.x = rx;
      rocket.y = ry;

      rocket.trail.push({ x: rx, y: ry, alpha: 1 });
      if (rocket.trail.length > (isTouchDevice ? 14 : 22)) rocket.trail.shift();

      rocket.trail.forEach((pt, idx) => {
        pt.alpha *= 0.92;
        ctx.fillStyle = rocket.trailColor.replace('0.65', (pt.alpha * 0.6).toFixed(2));
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, (idx / rocket.trail.length) * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      drawTrajectoryRocketSprite(rx, ry, rocket.angle, rocket.color, rocket.id);
    });
  }

  function drawTrajectoryRocketSprite(x, y, angle, color, label) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const scale = width < 768 ? 0.8 : 1.0;
    ctx.scale(scale, scale);

    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-10, -4, 20, 8);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10, -4);
    ctx.lineTo(16, 0);
    ctx.lineTo(10, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-6, -10, 8, 4);
    ctx.fillRect(-6, 6, 8, 4);

    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(-15 - Math.random() * 4, 0);
    ctx.lineTo(-10, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(label, x, y - 12);
  }

  // --- PIXEL-ART ROCKET CURSOR TRACKER (WITH MOBILE AUTONOMOUS PATROL) ---
  function updateCursorRocket() {
    if (!mouse.isActive) return;

    cursorRocket.idleTimer++;

    // On mobile, if no touch active, smoothly patrol in a figure-8 orbit
    if (isTouchDevice && !mouse.isTouching && !mouse.hasMoved) {
      const time = Date.now() * 0.001;
      mouse.targetX = width / 2 + Math.sin(time * 0.8) * (width * 0.35);
      mouse.targetY = height / 2 + Math.sin(time * 1.6) * (height * 0.2);
    }

    const dx = mouse.targetX - cursorRocket.x;
    const dy = mouse.targetY - cursorRocket.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 3) {
      cursorRocket.targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
    }

    let angleDiff = cursorRocket.targetAngle - cursorRocket.angle;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    cursorRocket.angle += angleDiff * 0.18;

    cursorRocket.vx += dx * cursorRocket.accel;
    cursorRocket.vy += dy * cursorRocket.accel;

    cursorRocket.vx *= cursorRocket.friction;
    cursorRocket.vy *= cursorRocket.friction;

    cursorRocket.x += cursorRocket.vx;
    cursorRocket.y += cursorRocket.vy;

    cursorRocket.speed = Math.sqrt(cursorRocket.vx * cursorRocket.vx + cursorRocket.vy * cursorRocket.vy);

    if (cursorRocket.speed > 0.3 || Math.random() < 0.25) {
      emitGaseousPlume();
    }
  }

  function emitGaseousPlume() {
    const exhaustX = cursorRocket.x + Math.sin(cursorRocket.angle) * 15;
    const exhaustY = cursorRocket.y - Math.cos(cursorRocket.angle) * 15;

    // Flame core
    plumeParticles.push({
      x: exhaustX + (Math.random() - 0.5) * 4,
      y: exhaustY + (Math.random() - 0.5) * 4,
      vx: Math.sin(cursorRocket.angle) * (Math.random() * 2.5 + 1.5) + (Math.random() - 0.5) * 1.5,
      vy: -Math.cos(cursorRocket.angle) * (Math.random() * 2.5 + 1.5) + (Math.random() - 0.5) * 1.5,
      size: Math.random() * 3 + 2,
      alpha: 1,
      decay: Math.random() * 0.06 + 0.04,
      type: 'flame',
      color: Math.random() < 0.6 ? '#ff6b35' : '#ffd166'
    });

    // Smoke
    plumeParticles.push({
      x: exhaustX + (Math.random() - 0.5) * 5,
      y: exhaustY + (Math.random() - 0.5) * 5,
      vx: Math.sin(cursorRocket.angle) * (Math.random() * 1.2 + 0.4) + (Math.random() - 0.5) * 1.2,
      vy: -Math.cos(cursorRocket.angle) * (Math.random() * 1.2 + 0.4) + (Math.random() - 0.5) * 1.2,
      size: Math.random() * 5 + 3,
      maxSize: Math.random() * 12 + 8,
      alpha: 0.6,
      decay: Math.random() * 0.025 + 0.015,
      type: 'smoke',
      color: Math.random() < 0.5 ? 'rgba(148, 163, 184, ' : 'rgba(56, 189, 248, '
    });
  }

  function drawPixelRocket(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const px = width < 768 ? 2.0 : 2.5;

    const rocketPixels = [
      [0, 0, 0, 3, 3, 0, 0, 0],
      [0, 0, 3, 1, 1, 3, 0, 0],
      [0, 0, 1, 3, 3, 1, 0, 0],
      [0, 0, 1, 3, 3, 1, 0, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 2, 1, 1, 1, 1, 2, 0],
      [0, 2, 1, 4, 4, 1, 2, 0],
      [2, 2, 1, 1, 1, 1, 2, 2],
      [2, 2, 1, 1, 1, 1, 2, 2],
      [2, 0, 4, 4, 4, 4, 0, 2],
      [0, 0, 4, 0, 0, 4, 0, 0]
    ];

    const colors = {
      1: '#ffffff',
      2: '#00e5ff',
      3: '#ff6b35',
      4: '#475569'
    };

    const rows = rocketPixels.length;
    const cols = rocketPixels[0].length;
    const offsetX = -(cols * px) / 2;
    const offsetY = -(rows * px) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = rocketPixels[r][c];
        if (val !== 0) {
          ctx.fillStyle = colors[val];
          ctx.fillRect(offsetX + c * px, offsetY + r * px, px, px);
        }
      }
    }

    const flameHeight = Math.random() * 6 + 3;
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(offsetX + 3 * px, offsetY + rows * px, 2 * px, flameHeight);
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(offsetX + 3.5 * px, offsetY + rows * px, 1 * px, flameHeight * 0.6);

    ctx.restore();
  }

  // --- PIXEL EXPLOSIONS & BURSTS ---
  function triggerPixelExplosion(x, y, count = 26) {
    const isMobile = width < 768;
    const actualCount = isMobile ? Math.min(count, 18) : count;

    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.2;
      const pixelSize = Math.random() < 0.7 ? 3 : 4.5;

      let pColor = '#ff6b35';
      const rand = Math.random();
      if (rand < 0.35) pColor = '#ff6b35';
      else if (rand < 0.7) pColor = '#ffd166';
      else if (rand < 0.9) pColor = '#00e5ff';
      else pColor = '#ffffff';

      explosionParticles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: pixelSize,
        alpha: 1,
        decay: Math.random() * 0.04 + 0.025,
        color: pColor
      });
    }
  }

  // --- CROSS-PATH COLLISION DETECTION ---
  function checkCrossPathCollisions() {
    if (!mouse.isActive) return;

    trajectoryRockets.forEach(tRocket => {
      const dx = cursorRocket.x - tRocket.x;
      const dy = cursorRocket.y - tRocket.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 30) {
        const midX = (cursorRocket.x + tRocket.x) / 2;
        const midY = (cursorRocket.y + tRocket.y) / 2;
        triggerPixelExplosion(midX, midY, 32);

        flashStatus(`COLLISION AVOIDANCE // ${tRocket.id} RELAUNCHED`);

        tRocket.progress = 0;
        tRocket.trail = [];
      }
    });
  }

  function flashStatus(msg) {
    const statusEl = document.getElementById('mission-status-text');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = '#ff6b35';
      setTimeout(() => {
        statusEl.textContent = 'STATUS: FLIGHT READY • 7.9 CGPA';
        statusEl.style.color = 'var(--accent-emerald)';
      }, 3500);
    }
  }

  // --- MAIN ANIMATION LOOP ---
  function animate() {
    ctx.fillStyle = 'rgba(7, 9, 14, 0.45)';
    ctx.fillRect(0, 0, width, height);

    // 1. Stars
    stars.forEach(star => {
      star.twinkleOffset += star.twinkleSpeed;
      const currentAlpha = star.alpha + Math.sin(star.twinkleOffset) * 0.25;
      ctx.fillStyle = star.color;
      ctx.globalAlpha = Math.max(0.1, Math.min(1, currentAlpha));
      ctx.fillRect(star.x, star.y, star.size, star.size);
    });
    ctx.globalAlpha = 1;

    // 2. Realistic Planets
    planets.forEach(drawRealisticPlanet);

    // 3. Trajectories
    updateAndDrawTrajectories();

    // 4. Plume Particles
    for (let i = plumeParticles.length - 1; i >= 0; i--) {
      const p = plumeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= p.decay;

      if (p.type === 'smoke') {
        p.size += (p.maxSize - p.size) * 0.08;
        ctx.fillStyle = `${p.color}${Math.max(0, p.alpha)})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      }

      if (p.alpha <= 0) {
        plumeParticles.splice(i, 1);
      }
    }

    // 5. Explosion Particles
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
      const ep = explosionParticles[i];
      ep.x += ep.vx;
      ep.y += ep.vy;
      ep.vx *= 0.94;
      ep.vy *= 0.94;
      ep.alpha -= ep.decay;

      ctx.fillStyle = ep.color;
      ctx.globalAlpha = Math.max(0, ep.alpha);
      ctx.fillRect(ep.x, ep.y, ep.size, ep.size);
      ctx.globalAlpha = 1;

      if (ep.alpha <= 0) {
        explosionParticles.splice(i, 1);
      }
    }

    // 6. Rocket Physics & Collision
    if (mouse.isActive) {
      updateCursorRocket();
      drawPixelRocket(cursorRocket.x, cursorRocket.y, cursorRocket.angle);
      checkCrossPathCollisions();
    }

    requestAnimationFrame(animate);
  }

  // --- MOUSE & TOUCH EVENT LISTENERS ---
  window.addEventListener('mousemove', e => {
    mouse.targetX = e.clientX;
    mouse.targetY = e.clientY;
    mouse.hasMoved = true;

    if (cursorCoordsEl) {
      cursorCoordsEl.textContent = `X: ${Math.round(e.clientX)} | Y: ${Math.round(e.clientY)}`;
    }
  });

  // Mobile Touch Support
  window.addEventListener('touchstart', e => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouse.targetX = touch.clientX;
      mouse.targetY = touch.clientY;
      mouse.isTouching = true;
      mouse.hasMoved = true;

      // Tap explosion on mobile
      triggerPixelExplosion(touch.clientX, touch.clientY, 20);

      if (cursorCoordsEl) {
        cursorCoordsEl.textContent = `X: ${Math.round(touch.clientX)} | Y: ${Math.round(touch.clientY)}`;
      }
    }
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      mouse.targetX = touch.clientX;
      mouse.targetY = touch.clientY;
      mouse.isTouching = true;

      if (cursorCoordsEl) {
        cursorCoordsEl.textContent = `X: ${Math.round(touch.clientX)} | Y: ${Math.round(touch.clientY)}`;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    mouse.isTouching = false;
  }, { passive: true });

  // Desktop Click Trigger Explosion
  window.addEventListener('click', e => {
    triggerPixelExplosion(e.clientX, e.clientY, 30);
  });

  // Custom Cursor Toggle
  if (cursorToggleBtn) {
    cursorToggleBtn.addEventListener('click', e => {
      e.stopPropagation();
      mouse.isActive = !mouse.isActive;
      document.body.classList.toggle('custom-cursor-active', mouse.isActive);
      cursorToggleBtn.querySelector('.btn-text').textContent = mouse.isActive ? 'TRACKER: ON' : 'TRACKER: OFF';
    });
  }

  if (!isTouchDevice) {
    document.body.classList.add('custom-cursor-active');
  }

  // --- MISSION ELAPSED TIME (MET) CLOCK ---
  const startTime = Date.now();
  function updateMET() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const hrs = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const secs = String(elapsed % 60).padStart(2, '0');

    if (metTimerEl) {
      metTimerEl.textContent = `T+${hrs}:${mins}:${secs}`;
    }
  }
  setInterval(updateMET, 1000);

  // --- DYNAMIC SKILL INSPECTOR ---
  const skillChips = document.querySelectorAll('.skill-chip');
  const inspectorTitle = document.getElementById('inspector-title');
  const inspectorText = document.getElementById('inspector-text');

  skillChips.forEach(chip => {
    const activate = () => {
      const name = chip.querySelector('.chip-name').textContent;
      const desc = chip.getAttribute('data-desc');
      if (inspectorTitle && inspectorText) {
        inspectorTitle.textContent = name;
        inspectorText.textContent = desc;
      }
    };
    chip.addEventListener('mouseenter', activate);
    chip.addEventListener('click', activate);
  });

  // --- MISSION MODALS DATABASE ---
  const missionData = {
    srmsat: {
      badge: 'MISSION SPEC // NANOSATELLITE STRUCTURES',
      title: 'Aerospace Design & Fabrication for Satellite (SRMSAT)',
      system: 'Spacecraft Chassis & Payload Integration',
      tools: 'CATIA v5, Structural Honeycomb Modeling',
      status: 'MISSION SUCCESS',
      body: `
        <h4>Project Objective</h4>
        <p>Contributed to university student satellite division (SRMSAT) working on honeycomb sandwich structural core panels engineered to protect sensitive onboard scientific payloads from intense acoustic and vibrational loads during launch vehicle ascent.</p>
        <h4>Key Engineering Contributions</h4>
        <ul>
          <li>Analyzed lightweight honeycomb structural topologies in CATIA v5 to maximize rigidity-to-mass ratio.</li>
          <li>Studied face-sheet debonding, core crushing resistance, and compressive shear mechanics under simulated launch acceleration.</li>
          <li>Collaborated with multi-disciplinary subsystem teams (avionics, power, telemetry) to ensure rigid mounting tolerances.</li>
        </ul>
        <h4>Takeaways & Outcomes</h4>
        <p>Mastered aerospace composite structural design principles, satellite bus packaging constraints, and weight-reduction optimization techniques essential for modern orbital missions.</p>
      `
    },
    asrl: {
      badge: 'MISSION SPEC // RESEARCH LABORATORY',
      title: 'Aerospace Design & Fabrication (ASRL)',
      system: 'Experimental Prototyping & Aerodynamics',
      tools: 'SolidWorks, ANSYS CFD, Lab Machining',
      status: 'ACTIVE RESEARCH',
      body: `
        <h4>Laboratory Overview</h4>
        <p>Active engineering member in the Aerospace Research Lab (ASRL), engaging in experimental design, rapid prototyping, and empirical aerodynamic evaluation of aircraft components.</p>
        <h4>Core Responsibilities</h4>
        <ul>
          <li>Parametric 3D CAD modeling and blueprint drafting of aerodynamic fixtures and airframe subassemblies.</li>
          <li>Hands-on fabrication using precision tools, lathe, drilling, composite layup, and assembly.</li>
          <li>Assisting senior research teams in fluid dynamic evaluation, airfoil profiling, and wind-tunnel fixture alignment.</li>
        </ul>
        <h4>Engineering Competencies Gained</h4>
        <p>Developed strong design-for-manufacturability (DFM) intuition, cross-functional lab collaboration, and practical problem solving.</p>
      `
    },
    longboard: {
      badge: 'MISSION SPEC // 1ST PRIZE WINNER',
      title: 'High-Torque Custom Electric Longboard Vehicle',
      system: 'Mechanical Propulsion & Energy Conversion',
      tools: 'Fabrication, Torque Transmission, Power Dynamics',
      status: 'AWARDED 1ST PRIZE',
      body: `
        <h4>Project Background</h4>
        <p>Engineered and fabricated an electric urban mobility vehicle from the ground up, incorporating an adapted high-torque drilling drive mechanism into a custom longboard chassis.</p>
        <h4>Technical Highlights</h4>
        <ul>
          <li>Constructed custom mechanical drive train linking the motor power output to rear urethane drive wheels.</li>
          <li>Applied foundational principles of rotational mechanics, gear ratios, torque conversion, and material fatigue.</li>
          <li>Awarded <strong>1st Prize Certificate</strong> at the high-school Physics & Innovation Exhibition for ingenuity and mechanical execution.</li>
        </ul>
        <h4>Significance</h4>
        <p>Demonstrated early engineering leadership, self-directed fabrication, and empirical testing of electrified mechanical powertrains.</p>
      `
    },
    rupert: {
      badge: 'MISSION SPEC // MATERIAL FRACTURE PHYSICS',
      title: 'Prince Rupert’s Drop Fracture Mechanics Investigation',
      system: 'Solid Mechanics & Stress Distribution',
      tools: 'Thermal Quenching, Fracture Analysis',
      status: 'EMPIRICAL STUDY',
      body: `
        <h4>Scientific Investigation</h4>
        <p>Conducted an in-depth empirical investigation into the non-linear internal stress distribution within Prince Rupert’s Drops created by rapid molten glass thermal quenching in cold water.</p>
        <h4>Physical Insights Explored</h4>
        <ul>
          <li>Analyzed the extreme residual compressive stress layer (> 100 MPa) formed on the exterior bulb, making it impervious to hammer blows.</li>
          <li>Investigated the high-tension interior core and catastrophic explosive crack propagation (traveling at ~1,500 m/s) when the fragile tail is severed.</li>
          <li>Bridged theoretical solid mechanics concepts with real-world toughened glass engineering applications.</li>
        </ul>
      `
    }
  };

  window.openMissionModal = function(missionKey) {
    const data = missionData[missionKey];
    if (!data) return;

    document.getElementById('modal-badge').textContent = data.badge;
    document.getElementById('modal-title').textContent = data.title;
    document.getElementById('modal-system').textContent = data.system;
    document.getElementById('modal-tools').textContent = data.tools;
    document.getElementById('modal-status').textContent = data.status;
    document.getElementById('modal-body').innerHTML = data.body;

    const modal = document.getElementById('mission-modal');
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  window.closeMissionModal = function() {
    const modal = document.getElementById('mission-modal');
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') window.closeMissionModal();
  });

  document.getElementById('mission-modal').addEventListener('click', e => {
    if (e.target.id === 'mission-modal') window.closeMissionModal();
  });

  // --- COPY EMAIL UTILITY ---
  window.copyEmail = function() {
    const email = 'jk032004de@gmail.com';
    navigator.clipboard.writeText(email).then(() => {
      const copyText = document.getElementById('copy-text');
      copyText.textContent = 'COPIED!';
      setTimeout(() => {
        copyText.textContent = 'COPY';
      }, 2500);
    });
  };

  // --- CONTACT FORM HANDLER ---
  window.handleFormSubmit = function(e) {
    e.preventDefault();
    const name = document.getElementById('sender-name').value;
    const email = document.getElementById('sender-email').value;
    const subject = document.getElementById('sender-subject').value;
    const message = document.getElementById('sender-message').value;

    const feedback = document.getElementById('form-feedback');
    feedback.className = 'form-feedback success';
    feedback.textContent = `TRANSMISSION ENCRYPTED & LOGGED: Opening your default email client to jk032004de@gmail.com...`;

    const mailtoUrl = `mailto:jk032004de@gmail.com?subject=${encodeURIComponent('[Portfolio Inquiry] ' + subject)}&body=${encodeURIComponent(`Sender: ${name} (${email})\n\nMessage:\n${message}`)}`;
    
    setTimeout(() => {
      window.location.href = mailtoUrl;
    }, 800);
  };

  // --- MOBILE NAV TOGGLE & AUTO-CLOSE ON LINK CLICK ---
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const hudNav = document.querySelector('.hud-nav');
  const mobileNavLinks = document.querySelectorAll('.hud-nav .nav-link');

  if (mobileToggle && hudNav) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = hudNav.classList.toggle('mobile-open');
      mobileToggle.classList.toggle('active', isOpen);
    });

    mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        hudNav.classList.remove('mobile-open');
        mobileToggle.classList.remove('active');
      });
    });
  }

  // --- SCROLLSPY NAV HIGHLIGHTER ---
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    let current = '';
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionHeight = section.offsetHeight;
      const sectionTop = section.offsetTop - 120;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  }, { passive: true });

  // --- START SIMULATION ---
  initStarfield();
  initPlanets();
  animate();

})();
