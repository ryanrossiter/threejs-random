import * as THREE from 'three';
import { OrbitControls } from './OrbitControls';
import { GUI } from 'dat.gui';
import { FBM } from './three-noise/FBM';

// import SimplexNoise from './perlin-simplex-noise';
// import createDeterministicRandom from './createDeterministicRandom';

// const stats = Stats()
// const random = createDeterministicRandom();
const fbm = new FBM({
  seed: 4372857,
});

type PlanetCanvases = {
  [k in "displacement" | "color"]: HTMLCanvasElement | null;
}

const planetCanvases: PlanetCanvases = {
  displacement: null,
  color: null,
}

type PlanetTextureOptions = {
  noiseScale: number,
  magnitude: number,
  floor: number,
  ceiling: number,
  waterDepth: number,
}

const options: PlanetTextureOptions = {
  noiseScale: 1.2,
  magnitude: 1,
  floor: 0.2,
  ceiling: 1,
  waterDepth: 0.05,
};

function createGui(planet: THREE.Mesh, planetCanvases: PlanetCanvases) {
  const controls = {
    redraw() {
      drawPlanetTexture(planet.geometry, planetCanvases, options);
      planet.material = buildPlanetMaterial(planetCanvases);
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

// draws to the provided canvas
function drawPlanetTexture(geometry: THREE.BufferGeometry, canvases: PlanetCanvases, options: PlanetTextureOptions): void {
  const colorCtx = canvases.color.getContext('2d');
  colorCtx.fillStyle = '#ffffff';
  colorCtx.fillRect(0, 0, canvases.color.width, canvases.color.height);

  const ctx = canvases.displacement.getContext('2d');
  ctx.fillStyle = '#000000';
  // const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  // gradient.addColorStop(0, '#000000');
  // gradient.addColorStop(1, '#ffffff');
  // ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvases.displacement.width, canvases.displacement.height);
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
    let heightAvg = 0;
    const texPoints: THREE.Vector2[] = [];

    for (let j = 0, jl = uvs.length; j < jl; j ++) {

			const uv = uvs[ j ];
      const v = (new THREE.Vector3()).fromBufferAttribute(positionAttribute, face[ j ]);

      const x = uv.x * ( canvases.displacement.width - 2 ) + 0.5;
      const y = ( 1 - uv.y ) * ( canvases.displacement.height - 2 ) + 0.5;
      texPoints.push(new THREE.Vector2(x, y));

      const height = fbm.get3(v.multiplyScalar(options.noiseScale));
      // const height = (noise.noise3d(
      //   v.x * options.noiseScale,
      //   v.y * options.noiseScale,
      //   v.z * options.noiseScale,
      // ) + 1) / 2;
      // const height = Math.min(Math.abs(v.z), Math.abs(v.x), Math.abs(v.y));
      const scaledHeight = Math.min(
        1,
        options.floor
          + Math.min(1, Math.max(0,
            height
              * Math.abs(options.ceiling - options.floor)
              * options.magnitude,
          )),
      );
      heightAvg += scaledHeight;
      const heightHex = Math.floor(255 * scaledHeight).toString(16).padStart(2, '0');


      ctx.fillStyle = "#" + heightHex + heightHex + heightHex;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      // const grd = ctx.createRadialGradient(x, y, 0, x, y, 5);
      // grd.addColorStop(0, "#" + heightHex + heightHex + heightHex + 'ff');
      // grd.addColorStop(1, "#" + heightHex + heightHex + heightHex + '00');
      // ctx.fillStyle = grd;
      // ctx.fillRect(x - 10, y - 10, 20, 20);

      // color the seam
      // if (x <= 10 || x >= canvases.displacement.width - 10) {
      //   const xo = x + canvases.displacement.width * -Math.sign(x - canvases.displacement.width / 2);
      //   const yo = y;
      //   const grd = ctx.createRadialGradient(xo, yo, 0, xo, yo, 10);
      //   grd.addColorStop(0, "#ffffff" + heightHex);
      //   grd.addColorStop(1, "#ffffff00");
      //   ctx.fillStyle = grd;
      //   ctx.fillRect(xo - 10, yo - 10, 20, 20);
      // }
      // gradients.push(grd);
		}

    let offscreen = 0; // +/- 1 based on which side of the screen it's on
    colorCtx.beginPath();
    for (let i = 0; i < texPoints.length; i++) {
      const { x, y } = texPoints[i];
      if ( i === 0 ) {
        colorCtx.moveTo(x, y);
      } else {
        colorCtx.lineTo(x, y);
      }

      if (x < 10) offscreen = 1;
      else if (x > canvases.color.width - 10) offscreen = -1;
    }
    colorCtx.closePath();

    heightAvg /= uvs.length;
    const waterLevel = options.floor + options.waterDepth;
    const rgb = [
      0.1,
      Math.max(0, Math.sin(heightAvg / 2 + 0.5)),
      Math.min(1, Math.max(0, waterLevel - heightAvg) * (1 / (options.waterDepth))),//Math.max(0, Math.cos(heightAvg * 2)),
    ];
    // const heightHex = Math.floor(255 * heightAvg).toString(16).padStart(2, '0').slice(-2);

    const colorHex = rgb.reduce((hex, v) => hex + Math.floor(255 * v).toString(16).padStart(2, '0').slice(-2), '#');
    colorCtx.fillStyle = colorCtx.strokeStyle = colorHex;
    colorCtx.fill();
    colorCtx.stroke();

    if (offscreen !== 0) {
      // draw again on other side of the screen
      colorCtx.beginPath();
      for (let i = 0; i < texPoints.length; i++) {
        const { x, y } = texPoints[i];
        const xo = x + canvases.color.width * offscreen * 0.998; // jank
        if ( i === 0 ) {
          colorCtx.moveTo(xo, y);
        } else {
          colorCtx.lineTo(xo, y);
        }
      }
      colorCtx.closePath();
      colorCtx.fill();
      colorCtx.stroke();
    }
    
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

function buildPlanetMaterial(canvases: PlanetCanvases): THREE.Material {
  const displacementTexture = new THREE.CanvasTexture(
    canvases.displacement,
    THREE.UVMapping,
    THREE.RepeatWrapping,
    THREE.RepeatWrapping,
    THREE.LinearFilter,
    THREE.LinearFilter,
  );

  const colorTexture = new THREE.CanvasTexture(
    canvases.color,
    THREE.UVMapping,
    THREE.RepeatWrapping,
    THREE.RepeatWrapping,
    THREE.LinearFilter,
    THREE.LinearFilter,
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    displacementMap: displacementTexture,
    map: colorTexture,
    flatShading: true,
    // roughness: 0.2,
  });

  return material;
}

function buildPlanet(): [THREE.Mesh, PlanetCanvases] {
  // const geometry = new THREE.TorusGeometry(1, 0.5, 50, 50);
  // const geometry = new THREE.ConeGeometry(1, 3, 50, 50);
  // const geometry = new THREE.TorusKnotGeometry(1, 0.1, 50, 50);
  const geometry = new THREE.IcosahedronGeometry(1, 20);

  const displacementCanvas = document.createElement('canvas');
  displacementCanvas.width = 1024;
  displacementCanvas.height = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1024;
  colorCanvas.height = 1024;

  const planetCanvases: PlanetCanvases = {
    displacement: displacementCanvas,
    color: colorCanvas,
  }
  drawPlanetTexture(geometry, planetCanvases, options);
  document.body.append(displacementCanvas);
  document.body.append(colorCanvas);

  const mesh = new THREE.Mesh(geometry, buildPlanetMaterial(planetCanvases));
  return [mesh, planetCanvases];
}

function main() {
  console.log('Starting');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  // renderer.shadowMap.enabled = true;
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const [planet, planetCanvas] = buildPlanet();
  scene.add(planet);

  createGui(planet, planetCanvas);

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
    // planet.rotation.x += 0.01;
    // planet.rotation.y += 0.01;
    controls.update();
    lightHolder.quaternion.copy(camera.quaternion);
    renderer.render(scene, camera);
  }
  animate();
}

window.addEventListener('load', main);
