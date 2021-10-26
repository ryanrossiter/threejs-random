import * as THREE from 'three';
import { OrbitControls } from './OrbitControls';
import { GUI } from 'dat.gui';

import SimplexNoise from './perlin-simplex-noise';

// const stats = Stats()

type PlanetTextureOptions = {
  simplexNoiseScale: number,
}

const options: PlanetTextureOptions = {
  simplexNoiseScale: 1,
};

function createGui(planet: THREE.Mesh, planetCanvas: HTMLCanvasElement) {
  const controls = {
    redraw() {
      drawPlanetTexture(planet.geometry, planetCanvas, options);
      planet.material = buildPlanetMaterial(planetCanvas);
    },
  };

  const gui = new GUI();
  const simplexNoise = gui.addFolder('Simplex Noise');
  simplexNoise.add(options, 'simplexNoiseScale', 0, 30, 0.3);
  simplexNoise.open();
  gui.add(controls, 'redraw');
}

// draws to the provided canvas
function drawPlanetTexture(geometry: THREE.BufferGeometry, canvas: HTMLCanvasElement, options: PlanetTextureOptions): void {
  const noise = new SimplexNoise();
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  // const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  // gradient.addColorStop(0, '#000000');
  // gradient.addColorStop(1, '#ffffff');
  // ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffffff";

  // stolen code: https://threejs.org/examples/misc_uv_tests.html
  const index = geometry.index;
  const positionAttribute = geometry.attributes.position as THREE.Float32BufferAttribute;
  const uvAttribute = geometry.attributes.uv as THREE.Float32BufferAttribute;
  const face: [number, number, number] = [0,0,0];
  const uvs: [THREE.Vector2, THREE.Vector2, THREE.Vector2] = [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()];

  if (index) {
    // indexed geometry

    for (let i = 0, il = index.count; i < il; i += 3) {

      face[0] = index.getX(i);
      face[1] = index.getX(i + 1);
      face[2] = index.getX(i + 2);

      uvs[0].fromBufferAttribute(uvAttribute, face[0]);
      uvs[1].fromBufferAttribute(uvAttribute, face[1]);
      uvs[2].fromBufferAttribute(uvAttribute, face[2]);

      processFace(face, uvs, i / 3);

    }

  } else {

    // non-indexed geometry

    for (let i = 0, il = uvAttribute.count; i < il; i += 3) {

      face[0] = i;
      face[1] = i + 1;
      face[2] = i + 2;

      uvs[0].fromBufferAttribute(uvAttribute, face[0]);
      uvs[1].fromBufferAttribute(uvAttribute, face[1]);
      uvs[2].fromBufferAttribute(uvAttribute, face[2]);

      processFace(face, uvs, i / 3);

    }

  }

  function processFace(face: [number, number, number], uvs: [THREE.Vector2, THREE.Vector2, THREE.Vector2], i: number) {
    // const gradients = [];
    const a = new THREE.Vector2();
    ctx.beginPath();
    for (let j = 0, jl = uvs.length; j < jl; j ++) {

			const uv = uvs[ j ];
      const v = (new THREE.Vector3()).fromBufferAttribute(positionAttribute, face[ j ]);

			a.x += uv.x;
			a.y += uv.y;

      const x = uv.x * ( canvas.width - 2 ) + 0.5;
      const y = ( 1 - uv.y ) * ( canvas.height - 2 ) + 0.5;

			if ( j === 0 ) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

      const height = (noise.noise3d(
        v.x * options.simplexNoiseScale,
        v.y * options.simplexNoiseScale,
        v.z * options.simplexNoiseScale,
      ) + 1) / 2;
      // const height = Math.min(Math.abs(v.z), Math.abs(v.x), Math.abs(v.y));
      const heightHex = Math.floor(height * 255).toString(16).padStart(2, '0');

      const grd = ctx.createRadialGradient(x, y, 0, x, y, 10);
      grd.addColorStop(0, "#ffffff" + heightHex);
      grd.addColorStop(1, "#ffffff00");
      ctx.fillStyle = grd;
      ctx.fillRect(x - 10, y - 10, 20, 20);

      // color the seam
      if (x < 10 || x > canvas.width - 10) {
        const xo = x + canvas.width * -Math.sign(x - canvas.width / 2);
        const yo = y;
        const grd = ctx.createRadialGradient(xo, yo, 0, xo, yo, 10);
        grd.addColorStop(0, "#ffffff" + heightHex);
        grd.addColorStop(1, "#ffffff00");
        ctx.fillStyle = grd;
        ctx.fillRect(xo - 10, yo - 10, 20, 20);
      }
      // gradients.push(grd);
		}
    ctx.closePath();
    
    // ctx.fillStyle = "#ffffff";
    // ctx.fill();

    // ctx.globalCompositeOperation = "lighter";
    // ctx.fillStyle = gradients[0];
    // ctx.fill();
    // ctx.fillStyle = gradients[1];
    // ctx.fill();
    // ctx.fillStyle = gradients[2];
    // ctx.fill();
    // ctx.globalCompositeOperation = "source-over";

		// ctx.stroke();
  }
}

function buildPlanetMaterial(canvas: HTMLCanvasElement): THREE.Material {
  const texture = new THREE.CanvasTexture(canvas, THREE.UVMapping, THREE.RepeatWrapping, THREE.RepeatWrapping, THREE.LinearFilter, THREE.LinearFilter);

  const material = new THREE.MeshStandardMaterial({
    // color: 0x00ff00,
    displacementMap: texture,
    map: texture,
  });
  return material;
}

function buildPlanet(): [THREE.Mesh, HTMLCanvasElement] {
  // const geometry = new THREE.PlaneGeometry( 100, 100, 4, 4 );
  const geometry = new THREE.IcosahedronGeometry(1, 20);

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  drawPlanetTexture(geometry, canvas, options);
  document.body.append(canvas);

  
  const mesh = new THREE.Mesh(geometry, buildPlanetMaterial(canvas));
  return [mesh, canvas];
}

function main() {
  console.log('Starting');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const [planet, planetCanvas] = buildPlanet();
  scene.add(planet);

  createGui(planet, planetCanvas);

  const lightHolder = new THREE.Group();

  const light = new THREE.PointLight(0xddddff);
  light.position.z = 4;
  lightHolder.add(light);

  const light2 = new THREE.PointLight(0xffdddd);
  // light2.position.z = 5;
  light2.position.y = 5;
  lightHolder.add(light2);
  scene.add(lightHolder);

  const controls = new OrbitControls(camera, renderer.domElement);
  
  camera.position.z = 4;
  controls.update();

  function animate() {
    requestAnimationFrame(animate);
    // planet.rotation.x += 0.01;
    // planet.rotation.y += 0.01;
    controls.update();
    lightHolder.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
  }
  animate();
}

window.addEventListener('load', main);
