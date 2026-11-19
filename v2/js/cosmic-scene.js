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
    'background-image:radial-gradient(circle at 20% 25%,rgba(255,238,183,.55) 0 1px,transparent 1.5px),radial-gradient(circle at 75% 18%,rgba(193,157,232,.55) 0 1px,transparent 1.5px),radial-gradient(circle at 62% 72%,rgba(120,216,209,.45) 0 1px,transparent 1.5px)',
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
  scene.fog = new THREE.FogExp2(0x07030f, 0.032);

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
    new THREE.Color(0xb494df),
    new THREE.Color(0x7edbd4),
    new THREE.Color(0xffffff)
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
    color: 0x9c72d3,
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
      color: 0xa77bd9,
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
      color: 0xcbb7d9,
      emissive: 0x3b205c,
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
    context.fillStyle = index % 3 === 0 ? '#f3dda0' : '#b99add';
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

  scene.add(new THREE.AmbientLight(0xbda4d3, 0.82));
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
      color: index % 2 === 0 ? 0xf6e6ad : 0xb997df,
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

      shootingStarData.forEach(({ streak, phase, speed, startY }) => {
        const progress = (elapsed * speed + phase) % 22;
        streak.position.x = -11 + progress;
        streak.position.y = startY - progress * 0.36;
        const edgeFade = Math.min(progress / 2.2, (22 - progress) / 2.2, 1);
        streak.material.opacity = Math.max(0, edgeFade) * 0.72;
      });

      camera.position.x = pointer.x * 0.22;
      camera.position.y = pointer.y * -0.13 - window.scrollY * 0.00035;
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
