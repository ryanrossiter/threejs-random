import * as THREE from 'three';
import { OrbitControls } from './OrbitControls';
import { GUI } from 'dat.gui';
import Planet, { PlanetNS } from './Planet';

const options: PlanetNS.TextureOptions = {
  noiseScale: 1.2,
  magnitude: 1,
  floor: 0.2,
  ceiling: 1,
  waterDepth: 0.05,
};

function createGui(planet: Planet) {
  const controls = {
    redraw() {
      planet.redraw(options);
    },
  };

  const gui = new GUI();
  const simplexNoise = gui.addFolder('Noise');
  simplexNoise.add(options, 'noiseScale', 0, 10, 0.1);
  simplexNoise.add(options, 'magnitude', 0, 2, 0.1);
  simplexNoise.add(options, 'floor', 0, 1, 0.05);
  simplexNoise.add(options, 'ceiling', 0, 1, 0.05);
  simplexNoise.add(options, 'waterDepth', 0.01, 1, 0.01);
  simplexNoise.open();
  gui.add(controls, 'redraw');
}

function main() {
  console.log('Starting');

  const scene = new THREE.Scene();
  // const camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 0.1, 1000);
  const { innerWidth: width, innerHeight: height } = window;
  const scale = 500 - Math.max(0, 500 - width) * 3;
  const camera = new THREE.OrthographicCamera(width / - scale, width / scale, height / scale, height / - scale, 1, 1000);

  const renderer = new THREE.WebGLRenderer();
  // renderer.shadowMap.enabled = true;
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  const planet = new Planet(options);
  scene.add(planet);

  createGui(planet);

  const sun = new THREE.PointLight(0xffa044, 1, 100, 0);
  sun.position.z = 40;
  sun.position.x = 40;
  // sun.castShadow = true;
  scene.add(sun);

  const ambientLight = new THREE.AmbientLight(0xbbd0ff, 0.3);
  scene.add(ambientLight);

  const lightHolder = new THREE.Group();

  const camLight = new THREE.PointLight(0xddddff, 0.1);
  camLight.position.z = 4;
  lightHolder.add(camLight);

  // const topLight = new THREE.PointLight(0xffdddd);
  // // topLight.position.z = 5;
  // topLight.position.y = 5;
  // lightHolder.add(topLight);
  scene.add(lightHolder);

  const controls = new OrbitControls(camera, renderer.domElement);
  
  camera.position.z = 4;
  controls.update();

  function animate() {
    requestAnimationFrame(animate);

    planet.update();
    controls.update();
    lightHolder.quaternion.copy(camera.quaternion);

    renderer.render(scene, camera);
  }
  animate();
}

window.addEventListener('load', main);
