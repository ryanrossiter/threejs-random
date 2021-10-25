import * as THREE from 'three';

import SimplexNoise from './perlin-simplex-noise';

function buildPlanet() {
  const noise = new SimplexNoise();
  const geometry = new THREE.IcosahedronGeometry(2, 10);
  // const geometry = new THREE.BoxGeometry();
  const attr = geometry.getAttribute('position');
  const vs = Array.from(attr.array);
  for (let i = 0; i < vs.length; i += 3) {
    const x = vs[i];
    const y = vs[i + 1];
    const z = vs[i + 2];
    const height = noise.noise3d(x, y, z) * 0.1 + 0.5;
    vs[i] = x * height;
    vs[i + 1] = y * height;
    vs[i + 2] = z * height;
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute( vs, 3 ));

  const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
  const mesh = new THREE.Mesh( geometry, material );
  return mesh;
}

function main() {
  console.log('Starting');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  const planet = buildPlanet();
  scene.add(planet);

  const light = new THREE.PointLight(0xddddff);
  light.position.z = 5;
  scene.add(light);

  const light2 = new THREE.PointLight(0xffdddd);
  // light2.position.z = 5;
  light2.position.y = 5;
  scene.add(light2);

  camera.position.z = 5;

  function animate() {
    requestAnimationFrame( animate );
    planet.rotation.x += 0.01;
    planet.rotation.y += 0.01;
    renderer.render( scene, camera );
  }
  animate();
  buildPlanet();
}

window.addEventListener('load', main);
