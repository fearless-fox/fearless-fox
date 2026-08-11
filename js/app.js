import { initFoxParticleSystem } from './modules/particleSystem.js';
import { initCubeGallery } from './modules/cubeGallery.js';

document.addEventListener('DOMContentLoaded', () => {
  initFoxParticleSystem('ff-three-canvas');
  initCubeGallery('cube-canvas');
});
