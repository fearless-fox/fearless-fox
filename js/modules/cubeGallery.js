import * as THREE from 'three';

export function initCubeGallery(canvasId = 'cube-canvas') {
  const container = document.querySelector('.cube-gallery');
  const canvas = document.getElementById(canvasId);
  const loadingEl = document.getElementById('cube-loading');
  if (!container || !canvas) return;

  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.z = 350;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
  dirLight.position.set(2, 2, 5);
  scene.add(dirLight);

  const textureLoader = new THREE.TextureLoader();
  let loadedCount = 0;

  function onTextureLoad() {
    loadedCount++;
    if (loadingEl) {
      loadingEl.textContent = `LOADING ASSETS... ${loadedCount}/${totalTextures}`;
    }
    console.debug(`Cube gallery texture load progress: ${loadedCount}/${totalTextures}`);
    if (loadedCount >= totalTextures && loadingEl) {
      loadingEl.style.opacity = '0';
      setTimeout(() => loadingEl.remove(), 300);
    }
  }

  function loadTexture(url) {
    return textureLoader.load(url, (tex) => {
      const img = tex.image;
      if (img) {
        const aspect = img.width / img.height;
        if (aspect > 1) {
          tex.repeat.set(1, 1 / aspect);
          tex.offset.set(0, (1 - 1 / aspect) / 2);
        } else {
          tex.repeat.set(aspect, 1);
          tex.offset.set((1 - aspect) / 2, 0);
        }
      }
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      onTextureLoad();
    }, undefined, (err) => {
      console.error('Cube gallery texture failed to load:', url, err);
      onTextureLoad();
    });
  }

  function createSolidMaterial(color) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 });
  }

  const cubesData = [
    {
      id: 'cube-brand',
      position: { x: -100, y: 0, z: 0 },
      size: 85,
      faces: [
        { type: 'image', src: './assets/forge.png' },
        { type: 'image', src: './assets/fox.png' },
        { type: 'image', src: './assets/tabletop.png' },
        { type: 'image', src: './assets/rybuild.png' },
        { type: 'solid', color: 0xFF4500 },
        { type: 'solid', color: 0x1a1a1a }
      ]
    },
    {
      id: 'cube-digital',
      position: { x: 100, y: 0, z: 0 },
      size: 85,
      faces: [
        { type: 'image', src: './assets/nova.png' },
        { type: 'image', src: './assets/nixo.png' },
        { type: 'image', src: './assets/nexo.png' },
        { type: 'image', src: './assets/blank.png' },
        { type: 'solid', color: 0x1a1a1a },
        { type: 'solid', color: 0xFF4500 }
      ]
    }
  ];

  const totalTextures = cubesData.reduce((sum, data) => sum + data.faces.filter(face => face.type === 'image').length, 0);
  if (loadingEl) {
    loadingEl.textContent = `LOADING ASSETS... 0/${totalTextures}`;
  }
  console.info('Cube gallery starting load:', totalTextures, 'textures');
  const cubes = [];
  const raycaster = new THREE.Raycaster();
  const mouseVector = new THREE.Vector2();

  cubesData.forEach((data) => {
    const materials = data.faces.map(face => {
      if (face.type === 'image') {
        return new THREE.MeshBasicMaterial({ map: loadTexture(face.src), transparent: true });
      }
      return createSolidMaterial(face.color);
    });

    const geometry = new THREE.BoxGeometry(data.size, data.size, data.size);
    const cube = new THREE.Mesh(geometry, materials);
    cube.position.set(data.position.x, data.position.y, data.position.z);
    cube.userData = {
      id: data.id,
      targetRotX: 0.2,
      targetRotY: -0.3,
      velX: 0,
      velY: 0,
      isHovered: false,
      baseY: data.position.y
    };
    scene.add(cube);
    cubes.push(cube);
  });

  let isDragging = false;
  let lastPos = { x: 0, y: 0 };
  let dragCube = null;

  function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function updateRaycaster(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    mouseVector.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseVector.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseVector, camera);
  }

  function onPointerDown(e) {
    const pos = getPointerPos(e);
    isDragging = true;
    lastPos = { ...pos };
    canvas.style.cursor = 'grabbing';
    updateRaycaster(pos.x, pos.y);
    const intersects = raycaster.intersectObjects(cubes);
    if (intersects.length > 0) {
      dragCube = intersects[0].object;
      dragCube.userData.velX = 0;
      dragCube.userData.velY = 0;
    } else {
      dragCube = 'all';
    }
  }

  function onPointerMove(e) {
    if (!isDragging) {
      const pos = getPointerPos(e);
      updateRaycaster(pos.x, pos.y);
      const intersects = raycaster.intersectObjects(cubes);
      cubes.forEach(c => c.userData.isHovered = false);
      if (intersects.length > 0) {
        intersects[0].object.userData.isHovered = true;
        canvas.style.cursor = 'grab';
      }
      return;
    }
    e.preventDefault();
    const pos = getPointerPos(e);
    const deltaX = pos.x - lastPos.x;
    const deltaY = pos.y - lastPos.y;
    lastPos = { ...pos };
    const sensitivity = 0.008;

    if (dragCube === 'all') {
      cubes.forEach(cube => {
        cube.userData.targetRotY += deltaX * sensitivity;
        cube.userData.targetRotX += deltaY * sensitivity;
      });
    } else if (dragCube) {
      dragCube.userData.targetRotY += deltaX * sensitivity;
      dragCube.userData.targetRotX += deltaY * sensitivity;
    }
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    dragCube = null;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: false });
  canvas.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  function animate() {
    requestAnimationFrame(animate);
    cubes.forEach(cube => {
      const lerpFactor = cube.userData.isHovered ? 0.12 : 0.08;
      cube.rotation.x += (cube.userData.targetRotX - cube.rotation.x) * lerpFactor;
      cube.rotation.y += (cube.userData.targetRotY - cube.rotation.y) * lerpFactor;

      if (!isDragging) {
        cube.userData.targetRotY += 0.003;
        const time = Date.now() * 0.001;
        const bobOffset = Math.sin(time + (cube.userData.id === 'cube-brand' ? 0 : 2)) * 3;
        cube.position.y = cube.userData.baseY + bobOffset;
      }
    });
    renderer.render(scene, camera);
  }

  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);

    if (w < 600) {
      cubes[0].position.x = -55;
      cubes[1].position.x = 55;
      cubes[0].scale.setScalar(0.65);
      cubes[1].scale.setScalar(0.65);
      camera.position.z = 280;
    } else if (w < 960) {
      cubes[0].position.x = -75;
      cubes[1].position.x = 75;
      cubes[0].scale.setScalar(0.8);
      cubes[1].scale.setScalar(0.8);
      camera.position.z = 320;
    } else {
      cubes[0].position.x = -100;
      cubes[1].position.x = 100;
      cubes[0].scale.setScalar(1);
      cubes[1].scale.setScalar(1);
      camera.position.z = 350;
    }
    cubes.forEach(c => c.userData.baseY = c.position.y);
  }

  window.addEventListener('resize', onResize);
  onResize();
  animate();

  if (loadingEl) {
    setTimeout(() => {
      if (loadingEl && document.body.contains(loadingEl)) {
        console.warn('Cube gallery loading overlay still visible after timeout, hiding fallback.');
        loadingEl.style.opacity = '0';
        setTimeout(() => loadingEl.remove(), 300);
      }
    }, 8000);
  }
}
