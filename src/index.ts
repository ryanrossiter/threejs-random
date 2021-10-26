import * as THREE from 'three';

import SimplexNoise from './perlin-simplex-noise';

function createPlanetTexture(geometry: THREE.BufferGeometry): THREE.Texture {
  const noise = new SimplexNoise();

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000000';
  // const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  // gradient.addColorStop(0, '#000000');
  // gradient.addColorStop(1, '#ffffff');
  // ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#ffffff";

  // for (let i = 0; i < positionData.length / 3; i++) {
  //   const x = positionData[i * 3 + 0];
  //   const y = positionData[i * 3 + 1];
  //   const z = positionData[i * 3 + 2];
  //   const uvx = (uvData[i * 2 + 0] + 50) * canvas.width / 100;
  //   const uvy = (uvData[i * 2 + 1] + 50) * canvas.height / 100;

  //   if (i % 3 === 0) {
  //     if (i !== 0) {
  //       ctx.closePath();
  //       ctx.stroke();
  //     }

  //     ctx.beginPath();
  //     ctx.moveTo(uvx, uvy);
  //   } else {
  //     ctx.lineTo(uvx, uvy);
  //   }
  // }
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
    for ( let j = 0, jl = uvs.length; j < jl; j ++ ) {

			const uv = uvs[ j ];
      const v = (new THREE.Vector3()).fromBufferAttribute(positionAttribute, face[j]);

			a.x += uv.x;
			a.y += uv.y;

      const x = uv.x * ( canvas.width - 2 ) + 0.5;
      const y = ( 1 - uv.y ) * ( canvas.height - 2 ) + 0.5;

			if ( j === 0 ) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}

      const height = Math.floor((noise.noise3d(v.x, v.y, v.z) + 1) / 2 * 255).toString(16).padStart(2, '0');
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 8);
      grd.addColorStop(0, "#ffffff" + height);
      grd.addColorStop(1, "#00000000");
      ctx.fillStyle = grd;
      ctx.fillRect(x - 10, y - 10, 20, 20);
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

  document.body.append(canvas);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function buildPlanet() {
  // const geometry = new THREE.PlaneGeometry( 100, 100, 4, 4 );
  const geometry = new THREE.IcosahedronGeometry(1, 15);

  const texture = createPlanetTexture(geometry);
  // const attr = geometry.getAttribute('position');
  // const vs = Array.from(attr.array);
  // for (let i = 0; i < vs.length; i += 3) {
  //   const x = vs[i];
  //   const y = vs[i + 1];
  //   const z = vs[i + 2];
  //   const height = noise.noise3d(x, y, z) * 0.1 + 0.5;
  //   vs[i] = x * height;
  //   vs[i + 1] = y * height;
  //   vs[i + 2] = z * height;
  // }

  // geometry.setAttribute('position', new THREE.Float32BufferAttribute( vs, 3 ));

  const material = new THREE.MeshStandardMaterial({
    color: 0x00ff00,
    displacementMap: texture,
    // map: texture,
  });
  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function main() {
  console.log('Starting');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

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
    requestAnimationFrame(animate);
    planet.rotation.x += 0.01;
    planet.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
  animate();
  buildPlanet();
}

window.addEventListener('load', main);
