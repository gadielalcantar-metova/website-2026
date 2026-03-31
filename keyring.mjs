// ═══════════════════════════════════════════════════════
// 3D KEY RING — Three.js + Cannon-es physics
// ═══════════════════════════════════════════════════════
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';

(function() {
  const container = document.getElementById('keyring-container');
  if (!container) return;

  // --- TECH KEYCHAINS ---
  const keychainConfig = [
    { text: 'AI / ML',  color: '#8BAD41', shape: 'box',        textColor: '#ffffff', spawnAngle: 175, desc: 'TensorFlow, PyTorch, Hugging Face' },
    { text: 'LLMs',     color: '#BAEB42', shape: 'cylinder',   textColor: '#ffffff', spawnAngle: 200, desc: 'GPT, Claude, LangChain, RAG' },
    { text: 'iOS',      color: '#60a5fa', shape: 'hexagon',    textColor: '#ffffff', spawnAngle: 225, desc: 'Swift, SwiftUI, Objective-C' },
    { text: 'Android',  color: '#34d399', shape: 'capsule',    textColor: '#ffffff', spawnAngle: 250, desc: 'Kotlin, Jetpack Compose' },
    { text: 'React',    color: '#61dafb', shape: 'octahedron', textColor: '#ffffff', spawnAngle: 280, desc: 'Next.js, React Native, TypeScript' },
    { text: 'Cloud',    color: '#fbbf24', shape: 'box',        textColor: '#ffffff', spawnAngle: 305, desc: 'AWS, Azure, GCP, Kubernetes' },
    { text: 'IoT',      color: '#a78bfa', shape: 'cylinder',   textColor: '#ffffff', spawnAngle: 330, desc: 'Embedded, Zebra, Fleet Mgmt' },
    { text: 'Data',     color: '#f87171', shape: 'hexagon',    textColor: '#ffffff', spawnAngle: 355, desc: 'PostgreSQL, MongoDB, Redis' }
  ];

  let scene, camera, renderer, controls, pmremGenerator;
  let physicsWorld;
  const clock = new THREE.Clock();
  const physicsObjects = [];
  const interactableMeshes = [];
  const keychainBodies = []; // track keychain bodies for fan-out
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let isFannedOut = false;
  let fanCooldown = 0;
  const lastMousePos = new THREE.Vector2();
  const params = { forceMultiplier: 3.0 };

  const GROUP_RING = 1, GROUP_KEYCHAIN = 2, GROUP_SMALL_RING = 4, GROUP_DUMMY = 8;

  const sharedGlassMaterial = new THREE.MeshPhysicalMaterial({
    metalness: 0.1, roughness: 0.15, transmission: 1.0,
    thickness: 0.8, ior: 1.5, transparent: true, side: THREE.DoubleSide
  });

  function getSize() {
    return { w: container.clientWidth, h: container.clientHeight };
  }

  function init() {
    const { w, h } = getSize();
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0F0F0F');

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, -1.0, 12);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, -1.0, 0);
    controls.enableZoom = false;
    controls.enablePan = false;

    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Physics
    physicsWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
    physicsWorld.broadphase = new CANNON.SAPBroadphase(physicsWorld);
    physicsWorld.solver.iterations = 50;

    const kcMat = new CANNON.Material('keychain');
    physicsWorld.addContactMaterial(new CANNON.ContactMaterial(kcMat, kcMat, {
      friction: 0.1, restitution: 0.4, contactEquationStiffness: 1e9, contactEquationRelaxation: 3
    }));
    scene.userData.keychainMaterial = kcMat;

    buildMainRing();
    buildKeychains();

    window.addEventListener('resize', onResize);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mousedown', () => { container.style.cursor = 'grabbing'; });
    container.addEventListener('mouseup', () => { container.style.cursor = 'grab'; });
    container.addEventListener('mouseenter', onContainerEnter);
    container.addEventListener('mouseleave', onContainerLeave);

    const loading = document.getElementById('keyring-loading');
    if (loading) loading.style.opacity = '0';
  }

  function buildMainRing() {
    const ringRadius = 3.0, tubeRadius = 0.08, ringPosY = 4.0;
    const ringGeo = new THREE.TorusGeometry(ringRadius, tubeRadius, 32, 100);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 1.0, roughness: 0.2 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    scene.add(ringMesh);

    const ringBody = new CANNON.Body({ mass: 40.0, type: CANNON.Body.DYNAMIC, position: new CANNON.Vec3(0, ringPosY, 0), linearDamping: 0.1, angularDamping: 0.3 });
    for (let i = 0; i < 36; i++) {
      const angle = (i * 10 * Math.PI) / 180;
      const x = ringRadius * Math.cos(angle), y = ringRadius * Math.sin(angle);
      const arcLen = (2 * Math.PI * ringRadius) / 36;
      const boxShape = new CANNON.Box(new CANNON.Vec3(arcLen * 0.55, tubeRadius * 1.5, tubeRadius * 1.5));
      const q = new CANNON.Quaternion();
      q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle + Math.PI / 2);
      ringBody.addShape(boxShape, new CANNON.Vec3(x, y, 0), q);
    }
    ringBody.collisionFilterGroup = GROUP_RING;
    ringBody.collisionFilterMask = GROUP_KEYCHAIN;
    physicsWorld.addBody(ringBody);

    const topPivot = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
    topPivot.position.set(0, ringPosY + ringRadius, 0);
    physicsWorld.addBody(topPivot);
    physicsWorld.addConstraint(new CANNON.PointToPointConstraint(ringBody, new CANNON.Vec3(0, ringRadius, 0), topPivot, new CANNON.Vec3(0, 0, 0)));

    interactableMeshes.push(ringMesh);
    ringMesh.userData.physicsBody = ringBody;
    physicsObjects.push({ mesh: ringMesh, body: ringBody });
    Object.assign(scene.userData, { ringBody, ringRadius, tubeRadius, ringPosY });
  }

  function createTextTexture(text, textColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 512, 256);
    ctx.font = 'bold 80px "Anek Telugu", "Arial Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = textColor;
    ctx.fillText(text, 256, 128);
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return texture;
  }

  function buildKeychains() {
    const { ringRadius, tubeRadius, ringBody, ringPosY } = scene.userData;
    const smallRingRadius = 0.8;
    const trackRadius = ringRadius + smallRingRadius - tubeRadius;

    keychainConfig.forEach((skill) => {
      const angleRad = skill.spawnAngle * (Math.PI / 180);
      const attachX = trackRadius * Math.cos(angleRad);
      const attachY = trackRadius * Math.sin(angleRad);

      // Dummy arm
      const dummyArm = new CANNON.Body({ mass: 3.0, position: new CANNON.Vec3(0, ringPosY, 0), linearDamping: 0.01, angularDamping: 0.01 });
      dummyArm.addShape(new CANNON.Sphere(trackRadius));
      dummyArm.collisionFilterGroup = GROUP_DUMMY;
      dummyArm.collisionFilterMask = 0;
      dummyArm.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angleRad);
      physicsWorld.addBody(dummyArm);
      physicsWorld.addConstraint(new CANNON.HingeConstraint(ringBody, dummyArm, {
        pivotA: new CANNON.Vec3(0, 0, 0), axisA: new CANNON.Vec3(0, 0, 1),
        pivotB: new CANNON.Vec3(0, 0, 0), axisB: new CANNON.Vec3(0, 0, 1)
      }));

      // Small ring
      const holeGeo = new THREE.TorusGeometry(smallRingRadius, 0.03, 16, 64);
      const holeMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', metalness: 1, roughness: 0.2 });
      const holeMesh = new THREE.Mesh(holeGeo, holeMat);
      scene.add(holeMesh);

      const smallRingPos = new CANNON.Vec3(attachX, attachY + ringPosY, 0);
      const tangent = new THREE.Vector3(-Math.sin(angleRad), Math.cos(angleRad), 0).normalize();
      const radial = new THREE.Vector3(Math.cos(angleRad), Math.sin(angleRad), 0).normalize();
      const localY = radial.clone().negate();
      const localZ = tangent;
      const localX = new THREE.Vector3().crossVectors(localY, localZ).normalize();
      const mMatrix = new THREE.Matrix4().makeBasis(localX, localY, localZ);
      const smallRingQuat = new THREE.Quaternion().setFromRotationMatrix(mMatrix);

      const smallRingBody = new CANNON.Body({ mass: 1.0, position: smallRingPos, shape: new CANNON.Sphere(smallRingRadius), linearDamping: 0.01, angularDamping: 0.2 });
      smallRingBody.collisionFilterGroup = GROUP_SMALL_RING;
      smallRingBody.collisionFilterMask = 0;
      smallRingBody.quaternion.set(smallRingQuat.x, smallRingQuat.y, smallRingQuat.z, smallRingQuat.w);
      physicsWorld.addBody(smallRingBody);
      physicsWorld.addConstraint(new CANNON.PointToPointConstraint(dummyArm, new CANNON.Vec3(trackRadius, 0, 0), smallRingBody, new CANNON.Vec3(0, 0, 0)));

      physicsObjects.push({ mesh: holeMesh, body: smallRingBody, isSmallRing: true });
      interactableMeshes.push(holeMesh);
      holeMesh.userData.physicsBody = smallRingBody;

      // Glass keychain
      const keychainGroup = new THREE.Group();
      scene.add(keychainGroup);

      let geometry;
      const width = 2.4, height = 2.4, depth = 0.15;
      const shapePhysics = new CANNON.Box(new CANNON.Vec3((width/2)*0.9, (height/2)*0.9, (depth/2)*1.5));

      switch(skill.shape) {
        case 'box': geometry = new THREE.BoxGeometry(width, height, depth, 4, 4, 4); break;
        case 'cylinder': geometry = new THREE.CylinderGeometry(width/2, width/2, depth, 32); geometry.rotateX(Math.PI/2); break;
        case 'capsule': geometry = new THREE.CapsuleGeometry(width/2.5, height/2, 16, 32); geometry.scale(1,1,depth/(2*(width/2.5))); break;
        case 'hexagon': geometry = new THREE.CylinderGeometry(width/2.2, width/2.2, depth, 6); geometry.rotateX(Math.PI/2); geometry.rotateZ(Math.PI/6); break;
        case 'octahedron': geometry = new THREE.OctahedronGeometry(width/1.8, 1); geometry.scale(1,1,depth/(2*(width/1.8))); break;
      }
      geometry.computeBoundingBox();
      const visualTopY = geometry.boundingBox.max.y;

      const mat = sharedGlassMaterial.clone();
      mat.color.set(skill.color);
      const glassMesh = new THREE.Mesh(geometry, mat);
      keychainGroup.add(glassMesh);
      interactableMeshes.push(glassMesh);

      const textTexture = createTextTexture(skill.text, skill.textColor);
      const textMat = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true, depthWrite: false });
      const textFront = new THREE.Mesh(new THREE.PlaneGeometry(width*1.2, width*0.6), textMat);
      textFront.position.z = depth/2 + 0.01;
      keychainGroup.add(textFront);
      const textBack = new THREE.Mesh(new THREE.PlaneGeometry(width*1.2, width*0.6), textMat);
      textBack.position.z = -depth/2 - 0.01;
      textBack.rotation.y = Math.PI;
      keychainGroup.add(textBack);

      // Spawn calculation
      const pivotA_local = new CANNON.Vec3(0, -smallRingRadius, 0);
      const pivotA_world = new THREE.Vector3(pivotA_local.x, pivotA_local.y, pivotA_local.z);
      pivotA_world.applyQuaternion(smallRingQuat);
      pivotA_world.add(new THREE.Vector3(smallRingPos.x, smallRingPos.y, smallRingPos.z));
      const pivotB_local = new CANNON.Vec3(0, visualTopY - 0.1, 0);
      const spawnPos = new CANNON.Vec3(pivotA_world.x - pivotB_local.x, pivotA_world.y - pivotB_local.y, pivotA_world.z - pivotB_local.z);

      const keychainBody = new CANNON.Body({
        mass: 1.5, material: scene.userData.keychainMaterial, shape: shapePhysics,
        position: spawnPos, linearDamping: 0.3, angularDamping: 0.5
      });
      keychainBody.collisionFilterGroup = GROUP_KEYCHAIN;
      keychainBody.collisionFilterMask = GROUP_KEYCHAIN | GROUP_RING;
      physicsWorld.addBody(keychainBody);
      physicsWorld.addConstraint(new CANNON.PointToPointConstraint(smallRingBody, pivotA_local, keychainBody, pivotB_local));

      glassMesh.userData.physicsBody = keychainBody;
      glassMesh.userData.skillIndex = keychainConfig.indexOf(skill);
      physicsObjects.push({ mesh: keychainGroup, body: keychainBody });
      keychainBodies.push({ body: keychainBody, config: skill, group: keychainGroup });
    });
  }

  // --- TOOLTIP REFS ---
  const tooltipEl = document.getElementById('keyring-tooltip');
  const tooltipTitle = document.getElementById('keyring-tooltip-title');
  const tooltipDesc = document.getElementById('keyring-tooltip-desc');
  let hoveredSkill = null;
  let tooltipVisible = false;

  function showTooltip(skill, screenX, screenY) {
    const rect = container.getBoundingClientRect();
    tooltipTitle.textContent = skill.text;
    tooltipTitle.style.color = skill.color;
    tooltipDesc.textContent = skill.desc;
    // Position tooltip above the keychain, clamped inside container
    let tx = screenX - rect.left;
    let ty = screenY - rect.top - 20;
    // Clamp so it doesn't overflow
    tx = Math.max(10, Math.min(tx - 80, rect.width - 170));
    ty = Math.max(10, ty);
    tooltipEl.style.left = tx + 'px';
    tooltipEl.style.top = ty + 'px';
    if (!tooltipVisible) {
      tooltipEl.style.opacity = '1';
      tooltipEl.style.transform = 'translateY(0)';
      tooltipVisible = true;
    }
  }

  function hideTooltip() {
    tooltipEl.style.opacity = '0';
    tooltipEl.style.transform = 'translateY(6px)';
    tooltipVisible = false;
    hoveredSkill = null;
  }

  // --- FAN OUT / COLLAPSE ---
  function getFanTargets() {
    const count = keychainBodies.length;
    const spreadX = 8;
    const baseY = 0.5;
    const targets = [];
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      targets.push(new CANNON.Vec3(t * spreadX, baseY, 0));
    }
    return targets;
  }

  const fanTargets = [];

  function onContainerEnter() {
    isFannedOut = true;
    if (fanTargets.length === 0) {
      const targets = getFanTargets();
      targets.forEach(t => fanTargets.push(t));
    }
  }

  function onContainerLeave() {
    isFannedOut = false;
    hideTooltip();
  }

  function applyFanForces() {
    if (!isFannedOut || keychainBodies.length === 0 || fanTargets.length === 0) return;
    const springK = 12;
    const damping = 4;

    keychainBodies.forEach((kc, i) => {
      const target = fanTargets[i];
      const pos = kc.body.position;
      const vel = kc.body.velocity;

      const dx = target.x - pos.x;
      const dz = target.z - pos.z;
      const dy = target.y - pos.y;

      kc.body.applyForce(new CANNON.Vec3(
        dx * springK - vel.x * damping,
        dy * springK * 0.5 - vel.y * damping * 0.3,
        dz * springK - vel.z * damping
      ), pos);
    });
  }

  function onMouseMove(event) {
    const rect = container.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const velocityX = mouse.x - lastMousePos.x;
    const velocityY = mouse.y - lastMousePos.y;
    lastMousePos.copy(mouse);

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(interactableMeshes, false);

    let foundSkill = null;

    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object.userData.physicsBody) {
        const body = hit.object.userData.physicsBody;
        const massFactor = body.mass;
        const forceMag = params.forceMultiplier * 4 * massFactor;
        const clamp = (val, max) => Math.max(Math.min(val, max), -max);
        const cVelX = clamp(velocityX, 0.15), cVelY = clamp(velocityY, 0.15);
        const impulse = new CANNON.Vec3(cVelX * forceMag, cVelY * forceMag, -Math.abs(cVelX + cVelY) * forceMag * 0.8);
        if (Math.abs(cVelX) < 0.001 && Math.abs(cVelY) < 0.001) {
          impulse.set((Math.random()-0.5)*massFactor*0.2, (Math.random()-0.5)*massFactor*0.2, -0.2*massFactor);
        }
        body.applyImpulse(impulse, new CANNON.Vec3(hit.point.x, hit.point.y, hit.point.z));

        const idx = hit.object.userData.skillIndex;
        if (idx !== undefined) {
          foundSkill = keychainConfig[idx];
          const pos3d = new THREE.Vector3().copy(keychainBodies[idx].body.position);
          pos3d.y += 1.4;
          pos3d.project(camera);
          const sx = (pos3d.x * 0.5 + 0.5) * rect.width + rect.left;
          const sy = (-pos3d.y * 0.5 + 0.5) * rect.height + rect.top;
          showTooltip(foundSkill, sx, sy);
        }
      }
    }

    if (!foundSkill && tooltipVisible) {
      hideTooltip();
    }
  }

  function onResize() {
    const { w, h } = getSize();
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    applyFanForces();

    physicsWorld.step(1/60, delta, 3);
    const ringBody = scene.userData.ringBody;

    for (let i = 0; i < physicsObjects.length; i++) {
      const obj = physicsObjects[i];
      if (obj.isSmallRing && ringBody) {
        const localPos = ringBody.pointToLocalFrame(obj.body.position);
        const localTangent = new CANNON.Vec3(-localPos.y, localPos.x, 0);
        localTangent.normalize();
        const worldTangent = ringBody.vectorToWorldFrame(localTangent);
        const currentZ = obj.body.quaternion.vmult(new CANNON.Vec3(0, 0, 1));
        const torque = currentZ.cross(worldTangent);
        const k = 20, d = 2, av = obj.body.angularVelocity;
        obj.body.applyTorque(new CANNON.Vec3(torque.x*k - av.x*d, torque.y*k - av.y*d, torque.z*k - av.z*d));
      }
      obj.mesh.position.copy(obj.body.position);
      obj.mesh.quaternion.copy(obj.body.quaternion);
    }
    controls.update();
    renderer.render(scene, camera);
  }

  // Only init when section scrolls into view (performance)
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      init();
      animate();
    }
  }, { threshold: 0.1 });
  observer.observe(container);
})();
