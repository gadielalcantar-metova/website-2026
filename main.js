// ═══════════════════════════════════════════════════════
// MAIN JS — Metova Website 2026
// ═══════════════════════════════════════════════════════

// Scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }});
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// Sticky nav — subtle bg on scroll, pill keeps its own styling
const nav = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.style.background = 'rgba(15,15,15,0.7)';
    nav.style.backdropFilter = 'blur(16px)';
    nav.style.webkitBackdropFilter = 'blur(16px)';
    nav.style.borderBottomColor = 'rgba(255,255,255,0.05)';
  } else {
    nav.style.background = 'transparent';
    nav.style.backdropFilter = 'none';
    nav.style.webkitBackdropFilter = 'none';
    nav.style.borderBottomColor = 'rgba(255,255,255,0.05)';
  }
});

// Mobile menu
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
let menuOpen = false;
menuBtn.addEventListener('click', () => {
  menuOpen = !menuOpen;
  mobileMenu.style.transform = menuOpen ? 'translateX(0)' : 'translateX(-100%)';
  document.getElementById('bar1').style.transform = menuOpen ? 'rotate(45deg) translate(4px, 4px)' : '';
  document.getElementById('bar2').style.opacity = menuOpen ? '0' : '1';
  document.getElementById('bar3').style.transform = menuOpen ? 'rotate(-45deg) translate(4px, -4px)' : '';
});
function closeMobile() {
  menuOpen = false;
  mobileMenu.style.transform = 'translateX(-100%)';
  document.getElementById('bar1').style.transform = '';
  document.getElementById('bar2').style.opacity = '1';
  document.getElementById('bar3').style.transform = '';
}

// Stat counter
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const el = e.target;
      const target = parseInt(el.dataset.target);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '+';
      let current = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const interval = setInterval(() => {
        current += step;
        if (current >= target) { current = target; clearInterval(interval); }
        el.textContent = prefix + current + suffix;
      }, 30);
      statObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => statObserver.observe(el));

// FAQ accordion
function toggleFaq(item) {
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
}

// Three.js noise halo
(function() {
  const wrap = document.getElementById('halo-wrap');
  const canvas = document.getElementById('halo-canvas');
  if (!canvas || !wrap) return;

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  script.onload = initHalo;
  document.head.appendChild(script);

  function initHalo() {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;

    const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uArcY;

      // Simplex 3D noise
      vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
      vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v){
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod(i, 289.0);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 1.0/7.0;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float aspect = uResolution.x / uResolution.y;

        // Planet center positioned relative to CTA/footer boundary
        // Scale radius with aspect so it stays round on mobile
        float baseRadius = 2.2;
        float radius = baseRadius * max(aspect, 1.0);
        vec2 planetCenter = vec2(0.5, uArcY - radius);

        // Distance from planet center, corrected for aspect ratio
        vec2 diff = uv - planetCenter;
        diff.x *= aspect;
        float dist = length(diff);

        // Distance from the planet surface (0 = on surface, positive = above)
        float surfaceDist = dist - radius;

        // Noise for organic variation
        float t = uTime * 0.12;
        float n1 = snoise(vec3(uv.x * 3.0, uv.y * 2.0, t)) * 0.5 + 0.5;
        float n2 = snoise(vec3(uv.x * 5.0 + 10.0, uv.y * 3.0, t * 0.7)) * 0.5 + 0.5;
        float n3 = snoise(vec3(uv.x * 1.5 + 20.0, uv.y * 1.0, t * 0.5)) * 0.5 + 0.5;
        float noiseMix = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;

        // Bright edge line at the horizon
        float edgeLine = exp(-pow(surfaceDist * 18.0, 2.0)) * 1.2;
        // Add noise wobble to the edge
        edgeLine *= 0.7 + noiseMix * 0.5;

        // Atmospheric glow above the horizon
        float atmoGlow = smoothstep(0.5, 0.0, surfaceDist) * smoothstep(-0.05, 0.02, surfaceDist);
        atmoGlow *= atmoGlow;
        atmoGlow *= 0.6 + noiseMix * 0.4;

        // Wide diffuse haze reaching higher
        float haze = exp(-surfaceDist * 3.0) * smoothstep(-0.1, 0.01, surfaceDist);
        haze *= 0.4 + n3 * 0.3;

        // Breathing animation — deeper, more visible
        float breath = sin(uTime * 0.6) * 0.40 + 0.8;
        float breath2 = sin(uTime * 0.3 + 1.5) * 0.2 + 0.85;

        // Metova color palette
        vec3 brightLime = vec3(0.73, 0.92, 0.26);   // #BAEB42
        vec3 midGreen   = vec3(0.55, 0.68, 0.25);   // #8BAD41
        vec3 darkGreen  = vec3(0.15, 0.25, 0.05);
        vec3 warmTint   = vec3(0.35, 0.30, 0.10);

        // Edge: bright lime — toned down 3x
        vec3 edgeCol = brightLime * edgeLine * breath * 0.3;

        // Atmosphere: mid green with noise-driven variation — toned down 3x
        vec3 atmoCol = mix(midGreen, brightLime, noiseMix * 0.3) * atmoGlow * breath * 0.2;

        // Haze: darker, wider — toned down 3x
        vec3 hazeCol = mix(darkGreen, midGreen, n1 * 0.5) * haze * breath2 * 0.33;

        // Warm accent at the very core of the arc
        float warmZone = exp(-pow(surfaceDist * 12.0, 2.0)) * noiseMix * 0.3;
        vec3 warmCol = warmTint * warmZone;

        // Combine
        vec3 col = edgeCol + atmoCol + hazeCol + warmCol;

        // Fade out above the arc (inside the planet body is dark)
        col *= smoothstep(-0.02, 0.005, surfaceDist);

        // Vignette the sides slightly
        float sideVig = 1.0 - pow(abs(uv.x - 0.5) * 1.6, 4.0);
        col *= sideVig;

        float alpha = max(max(edgeLine, atmoGlow), haze) * sideVig;
        alpha = clamp(alpha, 0.0, 1.0);

        gl_FragColor = vec4(col, alpha);
      }
    `;

    const geo = new THREE.PlaneGeometry(2, 2);
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2() },
        uArcY: { value: 0.45 }
      },
      transparent: true,
      depthWrite: false
    });
    scene.add(new THREE.Mesh(geo, mat));

    function resize() {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      renderer.setSize(w, h);
      mat.uniforms.uResolution.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
      // Position arc between CTA bottom and footer top
      const ctaEl = document.getElementById('contact');
      if (ctaEl) {
        const ctaRect = ctaEl.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        const ctaBottom = (ctaRect.bottom - wrapRect.top) / wrapRect.height;
        // Invert for GL coords (0=bottom, 1=top)
        mat.uniforms.uArcY.value = 1.0 - ctaBottom;
      }
    }
    resize();
    window.addEventListener('resize', resize);

    // Fade in
    wrap.style.opacity = '1';

    function tick(t) {
      mat.uniforms.uTime.value = t * 0.001;
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
})();

// How We Work — SVG flow connectors
(function() {
  const container = document.getElementById('hww-zigzag');
  const svg = document.getElementById('hww-connectors');
  if (!container || !svg) return;

  const NS = 'http://www.w3.org/2000/svg';
  let paths = [];
  let dots = [];

  function rel(card) {
    const cr = card.getBoundingClientRect();
    const pr = container.getBoundingClientRect();
    return {
      left: cr.left - pr.left,
      right: cr.right - pr.left,
      top: cr.top - pr.top,
      bottom: cr.bottom - pr.top,
      cx: cr.left - pr.left + cr.width * 0.5,
      cy: cr.top - pr.top + cr.height * 0.5,
      w: cr.width,
      h: cr.height
    };
  }

  function buildPaths() {
    // Clear old
    svg.innerHTML = '';
    paths = [];
    dots = [];

    const cards = container.querySelectorAll('.hww-card[data-step]');
    if (cards.length < 2) return;

    // Temporarily force all cards to final position for accurate measurement
    const rows = container.querySelectorAll('.hww-row');
    rows.forEach(r => {
      r.style.opacity = '1';
      r.style.transform = 'translateY(0)';
      r.style.transition = 'none';
    });

    const isMobile = window.innerWidth < 1024;

    // Defs for glow filter
    const defs = document.createElementNS(NS, 'defs');
    const filter = document.createElementNS(NS, 'filter');
    filter.setAttribute('id', 'connector-glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');
    const blur = document.createElementNS(NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '3');
    blur.setAttribute('result', 'glow');
    filter.appendChild(blur);
    const merge = document.createElementNS(NS, 'feMerge');
    const mn1 = document.createElementNS(NS, 'feMergeNode');
    mn1.setAttribute('in', 'glow');
    const mn2 = document.createElementNS(NS, 'feMergeNode');
    mn2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    filter.appendChild(merge);
    defs.appendChild(filter);
    svg.appendChild(defs);

    for (let i = 0; i < cards.length - 1; i++) {
      const cardA = cards[i];
      const cardB = cards[i + 1];
      const rA = rel(cardA);
      const rB = rel(cardB);

      let start, end, cp1, cp2;

      if (isMobile) {
        // Mobile: bottom-center of A → top-center of B
        start = { x: rA.cx, y: rA.bottom };
        end = { x: rB.cx, y: rB.top };
        const midY = (start.y + end.y) / 2;
        cp1 = { x: start.x, y: midY };
        cp2 = { x: end.x, y: midY };
      } else {
        // Desktop: bottom-right/left edge of A → top-left/right edge of B
        const aIsLeft = cardA.dataset.side === 'left';

        // Start from bottom edge of card A, offset toward the connecting side
        start = {
          x: aIsLeft ? rA.right : rA.left,
          y: rA.bottom
        };
        // End at top edge of card B, offset toward the connecting side
        end = {
          x: aIsLeft ? rB.left : rB.right,
          y: rB.top
        };

        // S-curve: exit vertically, then sweep horizontally to the next card
        const dropY = (end.y - start.y) * 0.4;
        cp1 = { x: start.x, y: start.y + dropY };
        cp2 = { x: end.x, y: end.y - dropY };
      }

      // Draw path
      const d = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

      // Glow path (wider, softer)
      const glowPath = document.createElementNS(NS, 'path');
      glowPath.setAttribute('d', d);
      glowPath.setAttribute('fill', 'none');
      glowPath.setAttribute('stroke', 'rgba(186,235,66,0.05)');
      glowPath.setAttribute('stroke-width', '4');
      glowPath.setAttribute('filter', 'url(#connector-glow)');
      svg.appendChild(glowPath);

      // Main dashed path
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(186,235,66,0.2)');
      path.setAttribute('stroke-width', '1');
      path.setAttribute('stroke-dasharray', '6 4');
      path.setAttribute('stroke-linecap', 'round');

      // Measure length for draw animation
      svg.appendChild(path);
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = 'none';
      paths.push({ el: path, len, index: i });

      // Start dot
      const dotStart = document.createElementNS(NS, 'circle');
      dotStart.setAttribute('cx', start.x);
      dotStart.setAttribute('cy', start.y);
      dotStart.setAttribute('r', '3');
      dotStart.setAttribute('fill', '#BAEB42');
      dotStart.setAttribute('opacity', '0');
      dotStart.style.transition = 'opacity 0.4s ease';
      svg.appendChild(dotStart);
      dots.push(dotStart);

      // End dot
      const dotEnd = document.createElementNS(NS, 'circle');
      dotEnd.setAttribute('cx', end.x);
      dotEnd.setAttribute('cy', end.y);
      dotEnd.setAttribute('r', '3');
      dotEnd.setAttribute('fill', '#BAEB42');
      dotEnd.setAttribute('opacity', '0');
      dotEnd.style.transition = 'opacity 0.4s ease';
      svg.appendChild(dotEnd);
      dots.push(dotEnd);

      // Glow path also needs dash animation
      glowPath.style.strokeDasharray = len;
      glowPath.style.strokeDashoffset = len;
      glowPath.style.transition = 'none';
      paths.push({ el: glowPath, len, index: i, isGlow: true });
    }

    // Restore rows to their pre-animation state (let fade-up handle reveal)
    rows.forEach(r => {
      r.style.opacity = '';
      r.style.transform = '';
      r.style.transition = '';
    });

    // Trigger draw animation on scroll
    requestAnimationFrame(observePaths);
  }

  function observePaths() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          // Animate all paths with staggered delay
          const uniqueIndices = [...new Set(paths.map(p => p.index))];
          uniqueIndices.forEach((idx, order) => {
            const group = paths.filter(p => p.index === idx);
            const delay = order * 600;
            group.forEach(p => {
              setTimeout(() => {
                p.el.style.transition = `stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)`;
                p.el.style.strokeDashoffset = '0';
              }, delay);
            });
            // Animate dots for this connector
            const dotPair = dots.slice(idx * 2, idx * 2 + 2);
            setTimeout(() => {
              dotPair.forEach(d => d.setAttribute('opacity', '0.6'));
            }, delay);
            setTimeout(() => {
              dotPair.forEach(d => d.setAttribute('opacity', '0.4'));
            }, delay + 1200);
          });
          observer.disconnect();
        }
      });
    }, { threshold: 0.15 });

    observer.observe(container);
  }

  // Build on load + resize
  let resizeTimer;
  function rebuild() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildPaths, 200);
  }

  // Wait for layout to settle
  window.addEventListener('load', () => setTimeout(buildPaths, 500));
  window.addEventListener('resize', rebuild);

  // Also rebuild after fade-up animations complete (cards may shift)
  setTimeout(buildPaths, 2000);
})();

// How We Work — particle nebula background
(function() {
  const canvas = document.getElementById('hww-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w, h, particles = [], mouse = { x: -9999, y: -9999 };
  const PARTICLE_COUNT = 180;
  const CONNECTION_DIST = 120;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
  }

  function createParticles() {
    particles = [];
    // Concentrate particles in center column
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const centerBias = (Math.random() * 0.6 + 0.2); // 20%-80% of width
      particles.push({
        x: centerBias * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.8 + 0.5,
        // Green/lime tint with some blue variation
        color: Math.random() > 0.3
          ? `rgba(186,235,66,${Math.random() * 0.25 + 0.05})`
          : `rgba(139,173,65,${Math.random() * 0.2 + 0.05})`
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Central nebula glow
    const grd = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.45, w * 0.4);
    grd.addColorStop(0, 'rgba(186,235,66,0.04)');
    grd.addColorStop(0.5, 'rgba(139,173,65,0.02)');
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Update + draw particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();

      // Draw connections to nearby particles
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECTION_DIST) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(186,235,66,${0.06 * (1 - dist / CONNECTION_DIST)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  // Add grain overlay via offscreen canvas
  function addGrain() {
    const grainCanvas = document.createElement('canvas');
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const gctx = grainCanvas.getContext('2d');
    const imageData = gctx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const v = Math.random() * 255;
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 8; // Very subtle
    }
    gctx.putImageData(imageData, 0, 0);
    // Apply as repeating pattern to the parent
    canvas.parentElement.style.backgroundImage = `url(${grainCanvas.toDataURL()})`;
    canvas.parentElement.style.backgroundRepeat = 'repeat';
  }

  window.addEventListener('resize', () => { resize(); createParticles(); });
  resize();
  createParticles();
  addGrain();
  draw();
})();

// Services section — Three.js dotted wave background
(function() {
  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const s = document.createElement('script');
  s.src = THREE_CDN;
  s.onload = function() {
    // Delay to ensure rows have painted and wrapper has full height
    requestAnimationFrame(function() {
      const canvas = document.getElementById('services-dots-canvas');
      const wrapper = document.getElementById('service-rows-wrapper');
      if (!canvas || !wrapper) return;

      // Match original component grid density
      const AMOUNTX = 1000, AMOUNTY = 1000, SEP = 150;

      let W = wrapper.clientWidth;
      let H = wrapper.clientHeight || wrapper.scrollHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, W / H, 1, 10000);
      camera.position.set(0, 355, 1220);
      camera.lookAt(0, 0, 0); // tilt toward grid so dots fill full canvas height

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W, H);           // sets canvas width/height attrs + style
      renderer.setClearColor(0x000000, 0);

      // Build particle grid
      const positions = new Float32Array(AMOUNTX * AMOUNTY * 3);
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          positions[i * 3]     = ix * SEP - (AMOUNTX * SEP) / 2;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = iy * SEP - (AMOUNTY * SEP) / 2;
          i++;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        size: 6, color: 0x8BAD41, transparent: true, opacity: 0.8, sizeAttenuation: true
      });
      scene.add(new THREE.Points(geo, mat));

      let count = 0;
      function animate() {
        requestAnimationFrame(animate);
        const arr = geo.attributes.position.array;
        let k = 0;
        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            arr[k * 3 + 1] = Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
            k++;
          }
        }
        geo.attributes.position.needsUpdate = true;
        renderer.render(scene, camera);
        count += 0.07;
      }
      animate();

      // Keep canvas sized to wrapper on resize
      const ro = new ResizeObserver(function() {
        W = wrapper.clientWidth;
        H = wrapper.clientHeight || wrapper.scrollHeight;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
        camera.lookAt(0, 0, 0);
      });
      ro.observe(wrapper);
    });
  };
  document.head.appendChild(s);
})();

// ── SCALES: cursor entrance + all-handle interactive resize ──────
(function initScalesAnimation() {
  const outer = document.querySelector('.scales-outer');
  const inner = outer && outer.querySelector('.scales-inner');
  if (!outer || !inner) return;

  // z-index: text above semi-transparent background
  inner.style.position = 'relative';
  inner.style.zIndex   = '2';

  // Cancel CSS animations on decorative spans (border, handles, cursor)
  inner.style.animation = 'none';
  inner.style.clipPath  = 'none';
  outer.querySelectorAll('.scales-border, .scales-handle, .scales-cursor').forEach(el => {
    el.style.animation = 'none';
    el.style.opacity   = '0';
    el.style.display   = 'none';
  });

  // Collapse to 0×0 at top-left — cursor will drag it open
  outer.style.transformOrigin = 'top left';
  outer.style.transform       = 'scale(0)';
  outer.style.transition      = 'none';

  // Briefly scale(1) to read natural dimensions, then restore scale(0)
  function measureRect() {
    outer.style.transform = 'scale(1)';
    const r = outer.getBoundingClientRect();
    outer.style.transform = 'scale(0)';
    return r;
  }

  // Shared cursor SVG factory (↙↗ resize arrow)
  function makeCursor() {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;opacity:0;' +
      'transform:translate(-50%,-50%);filter:drop-shadow(0 0 6px rgba(186,235,66,0.5));' +
      'transition:opacity 0.2s ease;';
    el.innerHTML = `<svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M3 25L11.5 16.5" stroke="#BAEB42" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M3 25H9.5"       stroke="#BAEB42" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M3 25V18.5"      stroke="#BAEB42" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M25 3L16.5 11.5" stroke="#BAEB42" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M25 3H18.5"      stroke="#BAEB42" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M25 3V9.5"       stroke="#BAEB42" stroke-width="2.2" stroke-linecap="round"/>
    </svg>`;
    document.body.appendChild(el);
    return el;
  }

  // Easing: ease-out cubic (fast start, decelerates → natural drag feel)
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  const ANIM_START = 1000; // ms — after hero text finishes (~1.36s)
  const ANIM_DUR   = 950;  // ms — single duration for BOTH cursor travel and box scale

  setTimeout(() => {
    const r = measureRect(); // measure at scale(1), returns to scale(0)

    // Cursor enters from left edge, travels diagonally to BR corner
    const curStartX = -14;
    const curStartY = r.top + r.height * 0.4;
    const curEndX   = r.right;
    const curEndY   = r.bottom;

    const animCur = makeCursor();
    animCur.style.transition = 'none';
    animCur.style.left       = curStartX + 'px';
    animCur.style.top        = curStartY + 'px';
    animCur.style.opacity    = '1';

    const t0 = performance.now();

    // Single RAF loop — SCALES grows AND cursor travels, same eased progress
    function tick(now) {
      const ts  = (now !== undefined && !isNaN(+now)) ? +now : performance.now();
      const raw = Math.min(1, (ts - t0) / ANIM_DUR);
      const t   = easeOut(raw);

      outer.style.transform = `scale(${t})`;
      animCur.style.left = (curStartX + (curEndX - curStartX) * t) + 'px';
      animCur.style.top  = (curStartY + (curEndY - curStartY) * t) + 'px';

      if (raw < 1) {
        requestAnimationFrame(tick);
      } else {
        outer.style.transform = 'scale(1)';
        animCur.style.opacity = '0';
        setTimeout(() => { animCur.remove(); enterResizeMode(); }, 0);
      }
    }

    requestAnimationFrame(tick);
  }, ANIM_START);

  function enterResizeMode() {
    outer.style.transition = 'none';
    outer.style.transform  = 'none';

    // Restore selection border (z:1, below text z:2)
    const border = outer.querySelector('.scales-border');
    if (border) {
      border.style.display   = '';
      border.style.animation = 'none';
      border.style.opacity   = '1';
      border.style.zIndex    = '1';
    }

    // Lock width using offsetWidth (unaffected by transforms). Height follows font-size.
    // No cursor on outer — cursor only appears on handles.
    const baseW = outer.offsetWidth;
    outer.style.width = baseW + 'px';

    // Create all 4 corner handles
    const HS = 'position:absolute;width:16px;height:16px;background:#f6ffdf;border:2px solid #BAEB42;z-index:20;cursor:none;';
    const handleDefs = [
      { corner: 'tl', pos: 'top:-8px;left:-8px;'    },
      { corner: 'tr', pos: 'top:-8px;right:-8px;'   },
      { corner: 'bl', pos: 'bottom:-8px;left:-8px;' },
      { corner: 'br', pos: 'bottom:-8px;right:-8px;'},
    ];
    const handles = handleDefs.map(({ corner, pos }) => {
      const h = document.createElement('div');
      h.style.cssText  = HS + pos;
      h.dataset.corner = corner;
      outer.appendChild(h);
      return h;
    });

    const hoverCur = makeCursor();
    let hoveredHandle = null;
    let dragging = false;
    let activeCorner = null;
    let x0, y0, w0, fs0, left0;

    const trackCursor = (e) => { hoverCur.style.left = e.clientX + 'px'; hoverCur.style.top = e.clientY + 'px'; };

    // Each handle shows cursor on hover and starts drag on mousedown
    handles.forEach(h => {
      h.addEventListener('mouseenter', (e) => {
        hoveredHandle = h;
        trackCursor(e);
        hoverCur.style.opacity = '1';
      });
      h.addEventListener('mouseleave', () => {
        hoveredHandle = null;
        if (!dragging) hoverCur.style.opacity = '0';
      });
      h.addEventListener('mousedown', (e) => {
        dragging      = true;
        activeCorner  = h.dataset.corner;
        x0   = e.clientX;
        y0   = e.clientY;
        w0   = outer.offsetWidth;
        fs0  = parseFloat(window.getComputedStyle(inner).fontSize);
        left0 = parseFloat(outer.style.left) || 0;
        hoverCur.style.opacity = '1';
        e.preventDefault(); e.stopPropagation();
        document.body.style.userSelect = 'none';
      });
    });

    document.addEventListener('mousemove', (e) => {
      if (hoveredHandle || dragging) trackCursor(e);
      if (!dragging) return;

      const dx = e.clientX - x0;
      const dy = e.clientY - y0;

      // Each corner's "outward" direction maps to positive delta = grow
      let delta;
      switch (activeCorner) {
        case 'br': delta = ( dx + dy) / 2; break;  // right+down  = grow
        case 'bl': delta = (-dx + dy) / 2; break;  // left+down   = grow
        case 'tr': delta = ( dx - dy) / 2; break;  // right+up    = grow
        case 'tl': delta = (-dx - dy) / 2; break;  // left+up     = grow
      }

      const newW = Math.max(60, w0 + delta);
      outer.style.width    = newW + 'px';
      inner.style.fontSize = (fs0 * (newW / w0)) + 'px';

      // Left-side handles (BL, TL): right edge must stay fixed → shift element left
      if (activeCorner === 'bl' || activeCorner === 'tl') {
        outer.style.left = (left0 - (newW - w0)) + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        document.body.style.userSelect = '';
        if (!hoveredHandle) hoverCur.style.opacity = '0';
      }
    });
  }
})();

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ═══════════════════════════════════════════════════════
// Service rows floating image interaction
// ═══════════════════════════════════════════════════════
(function() {
  const wrapper = document.getElementById('service-rows-wrapper');
  const floatEl = document.getElementById('svc-float-img');
  if (!wrapper || !floatEl) return;
  const floatImg = floatEl.querySelector('img');
  const rows = wrapper.querySelectorAll('.service-row');

  // Lerp state
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;
  let isActive = false;
  let currentSrc = '';
  let rafId = null;
  let swapTimer = null;

  // Preload all images
  rows.forEach(row => {
    const src = row.dataset.svcImg;
    if (src) { const i = new Image(); i.src = src; }
  });

  function lerp(a, b, t) { return a + (b - a) * t; }

  function animate() {
    if (!isActive) { rafId = null; return; }
    currentX = lerp(currentX, targetX, 0.08);
    currentY = lerp(currentY, targetY, 0.08);
    floatEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
    rafId = requestAnimationFrame(animate);
  }

  function startLoop() {
    if (!rafId) { rafId = requestAnimationFrame(animate); }
  }

  // Mouse move on wrapper — update target position (fixed positioning = use clientX/Y directly)
  wrapper.addEventListener('mousemove', (e) => {
    targetX = e.clientX + 24;
    targetY = e.clientY - 110;
  });

  rows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      const src = row.dataset.svcImg;
      if (!src) return;

      isActive = true;

      // If image source changed, swap it
      if (src !== currentSrc) {
        // Hide first, swap, then reveal
        floatEl.classList.remove('is-visible');
        if (swapTimer) clearTimeout(swapTimer);
        swapTimer = setTimeout(() => {
          swapTimer = null;
          if (!isActive) return; // Bail if we left during the delay
          floatImg.src = src;
          currentSrc = src;
          // Small delay for the image to load then reveal
          floatImg.onload = () => {
            if (!isActive) return; // Bail if we left during load
            floatEl.classList.add('is-visible');
            floatImg.onload = null;
          };
          // If already cached, onload fires synchronously or not at all
          if (floatImg.complete && isActive) {
            floatEl.classList.add('is-visible');
            floatImg.onload = null;
          }
        }, currentSrc ? 200 : 0); // If switching between rows, brief hide first
      } else {
        floatEl.classList.add('is-visible');
      }

      // Init position near cursor to avoid jump
      if (!currentSrc) {
        currentX = targetX;
        currentY = targetY;
      }

      startLoop();
    });

    row.addEventListener('mouseleave', (e) => {
      // Only hide if leaving to outside wrapper or to a non-service-row
      const related = e.relatedTarget;
      if (related && related.closest && related.closest('.service-row')) return;
      hide();
    });
  });

  // Also handle leaving the wrapper entirely
  wrapper.addEventListener('mouseleave', () => {
    hide();
  });

  function hide(instant) {
    isActive = false;
    if (swapTimer) { clearTimeout(swapTimer); swapTimer = null; }
    if (instant) {
      floatEl.style.transition = 'none';
      floatEl.classList.remove('is-visible');
      // Force reflow then restore transition
      floatEl.offsetHeight;
      floatEl.style.transition = '';
    } else {
      floatEl.classList.remove('is-visible');
    }
    currentSrc = '';
    floatImg.onload = null;
  }

  // Force-hide when section scrolls out of view (fast scroll)
  const svcObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (!e.isIntersecting) hide(true); });
  }, { threshold: 0 });
  svcObserver.observe(wrapper);

  // Hide when fast-scrolling away — only if cursor is no longer over wrapper
  let lastScrollY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (!isActive) return;
    const delta = Math.abs(window.scrollY - lastScrollY);
    lastScrollY = window.scrollY;
    // Only trigger on fast scrolls (> 50px jump)
    if (delta > 50) {
      const rect = wrapper.getBoundingClientRect();
      const midY = window.innerHeight / 2;
      if (rect.bottom < 0 || rect.top > window.innerHeight || rect.top > midY) hide(true);
    }
  }, { passive: true });
})();

// ═══════════════════════════════════════════════════════
// Case studies sticky scroll controller
// ═══════════════════════════════════════════════════════
(function() {
  const wrapper = document.getElementById('cs-scroll-wrapper');
  if (!wrapper) return;

  const track = wrapper.querySelector('.cs-images-track');
  const clientNum = wrapper.querySelector('.cs-client-num');
  const clientName = wrapper.querySelector('.cs-client-name');
  const description = wrapper.querySelector('.cs-description');
  const tagsEl = wrapper.querySelector('.cs-tags');
  const ctaBtn = wrapper.querySelector('.cs-cta');

  const studies = [
    {
      name: 'FitOn',
      desc: 'Cut Azure hosting costs by 50% while scaling to millions of active users through intelligent infrastructure optimization.',
      tags: ['Cloud Infrastructure', 'Mobile Dev', 'DevOps'],
      url: '/work/fiton'
    },
    {
      name: 'MyBambu',
      desc: 'Built a neobanking platform for underserved communities with real-time payments, virtual cards, and bilingual support.',
      tags: ['FinTech', 'Full-Stack Dev', 'UX Design'],
      url: '/work/mybambu'
    },
    {
      name: 'Barwis Methods',
      desc: 'Designed and developed a performance training platform connecting elite athletes with data-driven workout programs.',
      tags: ['Health & Fitness', 'Mobile Dev', 'UX Design'],
      url: '/work/barwis'
    },
    {
      name: 'FleetPulse',
      desc: 'Real-time fleet tracking and predictive maintenance platform managing 12,000+ vehicles across North America with 99.9% uptime.',
      tags: ['IoT', 'Fleet Management', 'Data Analytics'],
      url: '#'
    },
    {
      name: 'MediSync',
      desc: 'AI-powered patient scheduling and triage system that reduced wait times by 40% across a 200-clinic hospital network.',
      tags: ['Healthcare', 'AI Integration', 'HIPAA Compliance'],
      url: '#'
    },
    {
      name: 'Verdant',
      desc: 'Sustainable marketplace platform connecting eco-conscious consumers with verified green brands. 3x revenue growth in first year post-launch.',
      tags: ['E-Commerce', 'UX Design', 'Full-Stack Dev'],
      url: '#'
    }
  ];

  const totalStudies = studies.length;
  const csImages = track.querySelectorAll('.cs-img');
  let currentIndex = -1;

  function makeTagHTML(tags) {
    return tags.map(t =>
      `<span class="text-[10px] font-bold uppercase tracking-[1.5px] px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0" style="color:#9CA3AF; border-color:rgba(156,163,175,0.2); background:rgba(156,163,175,0.06);">${t}</span>`
    ).join('');
  }

  function updateText(index) {
    if (index === currentIndex) return;
    currentIndex = index;
    const study = studies[index];

    // Update image focus
    csImages.forEach((img, i) => {
      if (i === index) img.classList.add('is-active');
      else img.classList.remove('is-active');
    });

    // Fade out
    clientNum.style.opacity = '0';
    clientName.style.opacity = '0';
    clientName.style.transform = 'translateY(8px)';
    description.style.opacity = '0';
    tagsEl.style.opacity = '0';
    ctaBtn.style.opacity = '0';

    setTimeout(() => {
      clientNum.textContent = `(${String(index + 1).padStart(2, '0')})`;
      clientName.textContent = study.name;
      description.textContent = study.desc;
      tagsEl.innerHTML = makeTagHTML(study.tags);
      ctaBtn.href = study.url;

      // Fade in
      requestAnimationFrame(() => {
        clientNum.style.opacity = '1';
        clientName.style.opacity = '1';
        clientName.style.transform = 'translateY(0)';
        description.style.opacity = '1';
        tagsEl.style.opacity = '1';
        ctaBtn.style.opacity = '1';
      });
    }, 250);
  }

  // Add transition for the transform on client name
  clientName.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

  function onScroll() {
    const rect = wrapper.getBoundingClientRect();
    const wrapperTop = -rect.top; // how far we've scrolled into the wrapper
    const scrollRange = wrapper.offsetHeight - window.innerHeight;

    if (wrapperTop < 0 || scrollRange <= 0) {
      track.style.transform = 'translateY(0)';
      updateText(0);
      return;
    }

    const progress = Math.min(Math.max(wrapperTop / scrollRange, 0), 1);

    // Calculate how far the image track needs to move
    // Total track height minus one viewport height
    const trackHeight = track.scrollHeight;
    const viewH = window.innerHeight;
    const maxTranslate = trackHeight - viewH + 48; // 48 = top+bottom padding
    const translateY = -progress * maxTranslate;
    track.style.transform = `translateY(${translateY}px)`;

    // Determine which image is closest to the vertical center of the viewport
    const viewCenter = viewH / 2;
    let closestIndex = 0;
    let closestDist = Infinity;
    csImages.forEach((img, i) => {
      if (i >= totalStudies) return; // skip "view all projects" card
      const r = img.getBoundingClientRect();
      const imgCenter = r.top + r.height / 2;
      const dist = Math.abs(imgCenter - viewCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    });
    updateText(closestIndex);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ═══════════════════════════════════════════════════════
// Navbar hide on scroll down, show on scroll up
// ═══════════════════════════════════════════════════════
(function() {
  const nav = document.getElementById('navbar');
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > lastY && y > 80) {
      nav.style.transform = 'translateY(-100%)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    lastY = y;
  }, { passive: true });
})();
