const CDN_URL = 'https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js';

function addAtmosphere() {
  if (document.querySelector('.cosmic-aura')) return;

  const aura = document.createElement('div');
  aura.className = 'cosmic-aura';
  aura.setAttribute('aria-hidden', 'true');

  const runes = document.createElement('div');
  runes.className = 'cosmic-runes';
  runes.setAttribute('aria-hidden', 'true');
  runes.innerHTML = '<span>CELESTIAL · FATE · SOUL</span><span>AS ABOVE · SO BELOW</span>';

  document.body.prepend(runes);
  document.body.prepend(aura);
}

function addFallbackStars() {
  if (document.getElementById('cosmic-fallback')) return;
  const fallback = document.createElement('div');
  fallback.id = 'cosmic-fallback';
  fallback.setAttribute('aria-hidden', 'true');
  fallback.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:-2', 'pointer-events:none',
    'background-image:radial-gradient(circle at 20% 25%,rgba(255,238,183,.62) 0 1px,transparent 1.5px),radial-gradient(circle at 75% 18%,rgba(155,185,168,.62) 0 1px,transparent 1.5px),radial-gradient(circle at 62% 72%,rgba(120,181,160,.52) 0 1px,transparent 1.5px)',
    'background-size:113px 113px,157px 157px,199px 199px'
  ].join(';');
  document.body.prepend(fallback);
}

addAtmosphere();

try {
  const THREE = await import(CDN_URL);
  initCosmicScene(THREE);
} catch (error) {
  addFallbackStars();
  console.info('Three.js 星空背景未載入，已切換靜態星空。', error);
}

function initCosmicScene(THREE) {
  const canvas = document.createElement('canvas');
  canvas.id = 'cosmic-scene';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: window.devicePixelRatio < 2,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a2420, 0.032);

  const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 13);

  const universe = new THREE.Group();
  universe.rotation.x = -0.12;
  scene.add(universe);

  const isMobile = window.matchMedia('(max-width: 720px)').matches;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const starCount = isMobile ? 650 : 1350;

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const palette = [
    new THREE.Color(0xf7e8b1),
    new THREE.Color(0x9bb9a8),
    new THREE.Color(0x78b5a0),
    new THREE.Color(0xf5f3e9)
  ];

  for (let i = 0; i < starCount; i += 1) {
    const radius = 8 + Math.random() * 32;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const index = i * 3;
    starPositions[index] = radius * Math.sin(phi) * Math.cos(theta);
    starPositions[index + 1] = radius * Math.sin(phi) * Math.sin(theta);
    starPositions[index + 2] = radius * Math.cos(phi) - 8;

    const color = palette[Math.floor(Math.random() * palette.length)];
    const intensity = 0.45 + Math.random() * 0.55;
    starColors[index] = color.r * intensity;
    starColors[index + 1] = color.g * intensity;
    starColors[index + 2] = color.b * intensity;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: isMobile ? 0.062 : 0.072,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.96,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const stars = new THREE.Points(starGeometry, starMaterial);
  universe.add(stars);

  const orbitGroup = new THREE.Group();
  orbitGroup.position.set(isMobile ? 2.6 : 4.8, 1.1, -2.8);
  orbitGroup.rotation.set(0.92, 0.2, -0.15);
  universe.add(orbitGroup);

  const goldMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9bc72,
    transparent: true,
    opacity: 0.20,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const violetMaterial = new THREE.MeshBasicMaterial({
    color: 0x7da28d,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const orbitRadii = [2.05, 2.7, 3.42];
  orbitRadii.forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 1 ? 0.012 : 0.008, 6, 160),
      index === 1 ? goldMaterial : violetMaterial
    );
    ring.rotation.x = index * 0.36;
    ring.rotation.y = index * 0.24;
    orbitGroup.add(ring);
  });

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.18, 1),
    new THREE.MeshBasicMaterial({
      color: 0x8faf9b,
      wireframe: true,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending
    })
  );
  orbitGroup.add(core);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 36, 36),
    new THREE.MeshStandardMaterial({
      color: 0xc6d2c7,
      emissive: 0x173b32,
      emissiveIntensity: 0.52,
      roughness: 0.82,
      metalness: 0.08,
      transparent: true,
      opacity: 0.67
    })
  );
  moon.position.set(-4.9, 2.4, -4.6);
  universe.add(moon);

  const crescent = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.06, 10, 90, Math.PI * 1.42),
    new THREE.MeshBasicMaterial({
      color: 0xf3dea0,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending
    })
  );
  crescent.position.set(-4.9, 2.4, -4.1);
  crescent.rotation.z = -0.42;
  universe.add(crescent);

  const glyphGroup = new THREE.Group();
  glyphGroup.position.copy(orbitGroup.position);
  glyphGroup.rotation.copy(orbitGroup.rotation);
  universe.add(glyphGroup);
  const zodiac = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

  zodiac.forEach((symbol, index) => {
    const glyphCanvas = document.createElement('canvas');
    glyphCanvas.width = 96;
    glyphCanvas.height = 96;
    const context = glyphCanvas.getContext('2d');
    context.clearRect(0, 0, 96, 96);
    context.font = '44px Georgia, serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = index % 3 === 0 ? '#f3dda0' : '#9bb9a8';
    context.shadowColor = context.fillStyle;
    context.shadowBlur = 10;
    context.fillText(symbol, 48, 50);

    const texture = new THREE.CanvasTexture(glyphCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    }));
    const angle = (index / zodiac.length) * Math.PI * 2;
    sprite.position.set(Math.cos(angle) * 3.42, Math.sin(angle) * 3.42, 0);
    sprite.scale.set(0.52, 0.52, 1);
    glyphGroup.add(sprite);
  });

  // ===== 華麗立體升級：星儀、光暈、星雲、水晶、行星、星座連線 =====
  function makeGlowTexture(inner, outer) {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, outer);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  const goldGlowTex = makeGlowTexture('rgba(255,226,140,0.95)', 'rgba(226,182,71,0.30)');
  const sageGlowTex = makeGlowTexture('rgba(190,225,205,0.85)', 'rgba(110,170,145,0.26)');

  function makeGlow(tex, scale, opacity) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    s.scale.set(scale, scale, 1);
    return s;
  }

  // 星儀放大並加入核心光暈
  const armillaryScale = isMobile ? 1.0 : 1.3;
  orbitGroup.scale.setScalar(armillaryScale);
  glyphGroup.scale.setScalar(armillaryScale);
  const coreGlow = makeGlow(goldGlowTex, 4.6, 0.55);
  orbitGroup.add(coreGlow);
  const coreSolid = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending })
  );
  orbitGroup.add(coreSolid);

  // 黃道傾斜環（互相垂直的立體金環）
  const gimbals = [];
  [[2.35, 0, 0], [2.35, Math.PI / 2, 0], [2.35, Math.PI / 4, Math.PI / 3]].forEach(([r, rx, ry], i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.02, 8, 140),
      new THREE.MeshBasicMaterial({
        color: i === 2 ? 0x9bb9a8 : 0xe2b647,
        transparent: true,
        opacity: i === 2 ? 0.42 : 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = rx;
    ring.rotation.y = ry;
    orbitGroup.add(ring);
    gimbals.push(ring);
  });

  // 環上行星（金、鼠尾草、月白）
  const planets = [];
  [[2.7, 0xe2b647, 0.13, 0.5], [3.42, 0x9bb9a8, 0.1, 0.33], [2.05, 0xf5f3e9, 0.08, 0.72]].forEach(([r, col, size, speed], i) => {
    const holder = new THREE.Group();
    holder.rotation.x = i * 0.36;
    holder.rotation.y = i * 0.24;
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(size, 16, 16),
      new THREE.MeshBasicMaterial({ color: col })
    );
    body.position.set(r, 0, 0);
    body.add(makeGlow(col === 0xe2b647 ? goldGlowTex : sageGlowTex, size * 9, 0.75));
    holder.add(body);
    orbitGroup.add(holder);
    planets.push({ holder, speed, offset: i * 2.1 });
  });

  // 星雲：多層柔光雲，營造前中後景
  const nebulas = [];
  const nebulaCount = isMobile ? 7 : 14;
  for (let i = 0; i < nebulaCount; i += 1) {
    const tex = i % 3 === 0 ? goldGlowTex : sageGlowTex;
    const s = makeGlow(tex, 7 + Math.random() * 9, 0.10 + Math.random() * 0.10);
    s.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 18, -9 - Math.random() * 14);
    universe.add(s);
    nebulas.push({ s, base: s.position.clone(), phase: Math.random() * 6.28 });
  }

  // 懸浮水晶（前景，慢速自轉，增加深度）
  const crystals = [];
  const crystalSpots = isMobile
    ? [[-3.2, -2.2, 2.2], [3.4, 2.6, 1.5]]
    : [[-7.2, -2.6, 2.0], [-5.8, 3.4, 0.8], [7.6, -3.1, 1.6], [6.4, 3.8, -0.6], [-9.2, 0.4, -2.2]];
  crystalSpots.forEach(([x, y, z], i) => {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.34 + (i % 3) * 0.1, 0),
      new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x9bb9a8 : 0xe2b647,
        wireframe: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
      })
    );
    crystal.position.set(x, y, z);
    crystal.add(makeGlow(i % 2 ? sageGlowTex : goldGlowTex, 1.9, 0.5));
    universe.add(crystal);
    crystals.push({ crystal, baseY: y, phase: i * 1.3 });
  });

  // 星座連線網：隨機鄰近星點以細線連接
  const lineCount = isMobile ? 22 : 46;
  const linePositions = [];
  for (let i = 0; i < lineCount; i += 1) {
    const cx = (Math.random() - 0.5) * 26;
    const cy = (Math.random() - 0.5) * 14;
    const cz = -4 - Math.random() * 8;
    linePositions.push(cx, cy, cz, cx + (Math.random() - 0.5) * 3.2, cy + (Math.random() - 0.5) * 2.4, cz + (Math.random() - 0.5) * 2);
  }
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const constellation = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({
    color: 0xc9b274, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false
  }));
  universe.add(constellation);

  // 命運光束：由星儀向上的垂直光柱
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.5, 14, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xe2b647, transparent: true, opacity: 0.07, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    })
  );
  beam.position.y = 7;
  orbitGroup.add(beam);

  scene.add(new THREE.AmbientLight(0xa9c2b3, 0.82));
  const moonLight = new THREE.PointLight(0xf1d899, 2.2, 18);
  moonLight.position.set(-4, 3, 3);
  scene.add(moonLight);

  // 清楚可見的流星會定期穿過畫面，讓動態不必靠滑鼠才看得出來。
  const shootingStars = new THREE.Group();
  const shootingStarData = [];
  const shootingStarCount = isMobile ? 3 : 5;
  for (let index = 0; index < shootingStarCount; index += 1) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-1.9, 0.72, 0)
    ]);
    const material = new THREE.LineBasicMaterial({
      color: index % 2 === 0 ? 0xf6e6ad : 0x9bb9a8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const streak = new THREE.Line(geometry, material);
    streak.position.z = -1.5 - index * 0.45;
    shootingStars.add(streak);
    shootingStarData.push({
      streak,
      phase: index * 4.7 + Math.random() * 2,
      speed: 2.2 + index * 0.18,
      startY: 4.8 - index * 2.1
    });
  }
  scene.add(shootingStars);

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const clock = new THREE.Clock();
  let frameId = 0;
  let isVisible = true;

  function onPointerMove(event) {
    target.x = (event.clientX / window.innerWidth - 0.5) * 0.90;
    target.y = (event.clientY / window.innerHeight - 0.5) * 0.58;
  }

  function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(width, height, false);
  }

  function render() {
    if (!isVisible) return;
    const elapsed = clock.getElapsedTime();
    pointer.x += (target.x - pointer.x) * 0.025;
    pointer.y += (target.y - pointer.y) * 0.025;

    if (!reducedMotion) {
      stars.rotation.y = elapsed * 0.020 + pointer.x * 0.18;
      stars.rotation.x = elapsed * 0.004 + pointer.y * 0.13;
      stars.rotation.z = elapsed * 0.006;
      starMaterial.opacity = 0.82 + Math.sin(elapsed * 1.35) * 0.14;

      orbitGroup.rotation.z = elapsed * 0.060 - pointer.x * 0.22;
      orbitGroup.rotation.y = 0.2 + Math.sin(elapsed * 0.42) * 0.14;
      glyphGroup.rotation.z = -elapsed * 0.048 - pointer.x * 0.17;
      core.rotation.x = elapsed * 0.19;
      core.rotation.y = elapsed * 0.14;
      moon.position.y = 2.4 + Math.sin(elapsed * 0.72) * 0.22;
      crescent.position.y = moon.position.y;

      gimbals.forEach((ring, i) => {
        ring.rotation.z = elapsed * (0.12 + i * 0.05) * (i % 2 ? -1 : 1);
      });
      planets.forEach(({ holder, speed, offset }) => {
        holder.rotation.z = elapsed * speed + offset;
      });
      const pulse = 1 + Math.sin(elapsed * 1.6) * 0.08;
      coreGlow.scale.set(4.6 * pulse, 4.6 * pulse, 1);
      coreSolid.scale.setScalar(pulse);
      beam.material.opacity = 0.055 + Math.sin(elapsed * 0.9) * 0.025;
      constellation.material.opacity = 0.16 + Math.sin(elapsed * 0.7) * 0.07;
      constellation.rotation.z = Math.sin(elapsed * 0.05) * 0.04 + pointer.x * 0.06;
      nebulas.forEach(({ s, base, phase }) => {
        s.position.x = base.x + Math.sin(elapsed * 0.08 + phase) * 1.2 - pointer.x * 1.6;
        s.position.y = base.y + Math.cos(elapsed * 0.07 + phase) * 0.8 + pointer.y * 1.0;
        s.material.opacity = 0.11 + (Math.sin(elapsed * 0.3 + phase) + 1) * 0.05;
      });
      crystals.forEach(({ crystal, baseY, phase }, i) => {
        crystal.rotation.x = elapsed * 0.3 + phase;
        crystal.rotation.y = elapsed * 0.42 + phase;
        crystal.position.y = baseY + Math.sin(elapsed * 0.8 + phase) * 0.28;
      });

      shootingStarData.forEach(({ streak, phase, speed, startY }) => {
        const progress = (elapsed * speed + phase) % 22;
        streak.position.x = -11 + progress;
        streak.position.y = startY - progress * 0.36;
        const edgeFade = Math.min(progress / 2.2, (22 - progress) / 2.2, 1);
        streak.material.opacity = Math.max(0, edgeFade) * 0.72;
      });

      camera.position.x = pointer.x * 0.22;
      camera.position.y = pointer.y * -0.13 - window.scrollY * 0.00035;
      // 捲動時星儀沿景深退後並傾斜，產生空間展開感
      const depth = Math.min(window.scrollY / 1400, 1);
      camera.position.z = 13 + depth * 2.2;
      universe.rotation.y = pointer.x * 0.12 + depth * 0.35;
      orbitGroup.position.z = -2.8 - depth * 1.5;
      glyphGroup.position.z = orbitGroup.position.z;
    }

    renderer.render(scene, camera);
    frameId = requestAnimationFrame(render);
  }

  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    if (isVisible) render();
    else cancelAnimationFrame(frameId);
  });
  window.addEventListener('resize', onResize, { passive: true });
  if (!reducedMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

  renderer.render(scene, camera);
  requestAnimationFrame(() => canvas.classList.add('is-ready'));
  render();
}
