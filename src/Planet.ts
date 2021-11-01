import * as THREE from 'three';
import { FBM } from './three-noise/FBM';
import CanvasAnimation from './CanvasAnimation';

const fbm = new FBM({
  seed: 4372857,
});

export namespace PlanetNS {
  export type Canvases = {
    [k in "displacement" | "color" | "roughness"]: HTMLCanvasElement | null;
  } & {
    [k in "displacementTexture" | "colorTexture" | "roughnessTexture"]: THREE.CanvasTexture | null;
  } & {
    displacementCanvasAnim: CanvasAnimation | null,
  }

  export type TextureOptions = {
    noiseScale: number,
    magnitude: number,
    floor: number,
    ceiling: number,
    waterDepth: number,
  }
}

export default class Planet extends THREE.Mesh {
  readonly canvases: PlanetNS.Canvases;

  constructor(options: PlanetNS.TextureOptions) {
    const geometry = new THREE.IcosahedronGeometry(1, 40);

    const displacementCanvas = document.createElement('canvas');
    displacementCanvas.width = 1024;
    displacementCanvas.height = 1024;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = 1024;
    colorCanvas.height = 1024;
    const roughnessCanvas = document.createElement('canvas');
    roughnessCanvas.width = 1024;
    roughnessCanvas.height = 1024;

    const canvases: PlanetNS.Canvases = {
      displacement: displacementCanvas,
      color: colorCanvas,
      roughness: roughnessCanvas,
      displacementTexture: null,
      colorTexture: null,
      roughnessTexture: null,
      displacementCanvasAnim: null,
    }
    Planet.DrawTextures(geometry, canvases, options);

    super(geometry, Planet.BuildMaterial(canvases));

    this.canvases = canvases;
  }

  static BuildMaterial(canvases: PlanetNS.Canvases): THREE.Material {
    canvases.displacementTexture = new THREE.CanvasTexture(
      canvases.displacement,
      THREE.UVMapping,
      THREE.RepeatWrapping,
      THREE.RepeatWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter,
    );
  
    canvases.colorTexture = new THREE.CanvasTexture(
      canvases.color,
      THREE.UVMapping,
      THREE.RepeatWrapping,
      THREE.RepeatWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter,
    );
  
    canvases.roughnessTexture = new THREE.CanvasTexture(
      canvases.roughness,
      THREE.UVMapping,
      THREE.RepeatWrapping,
      THREE.RepeatWrapping,
      THREE.LinearFilter,
      THREE.LinearFilter,
    );
  
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      displacementMap: canvases.displacementTexture,
      map: canvases.colorTexture,
      roughnessMap: canvases.roughnessTexture,
      flatShading: true,
      // roughness: 0.2,
    });
  
    return material;
  }

  static DrawTextures(geometry: THREE.BufferGeometry, canvases: PlanetNS.Canvases, options: PlanetNS.TextureOptions): void {
    const canvasAnim = canvases.displacementCanvasAnim = new CanvasAnimation(canvases.displacement, 1); // 12, 8 are nice
    const colorCtx = canvases.color.getContext('2d');
    colorCtx.fillStyle = '#ffffff';
    colorCtx.fillRect(0, 0, canvases.color.width, canvases.color.height);

    const roughnessCtx = canvases.roughness.getContext('2d');
    roughnessCtx.fillStyle = '#ffffff';
    roughnessCtx.fillRect(0, 0, canvases.roughness.width, canvases.roughness.height);

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
        const midScalingFac = Math.abs(options.ceiling - options.floor) * options.magnitude;
        const scaledHeight = Math.min(
          1,
          options.floor
            + Math.min(1, Math.max(0,
              height * midScalingFac,
            )),
        );
        heightAvg += scaledHeight;

        // const heightHex = Math.floor(255 * scaledHeight).toString(16).padStart(2, '0');
        // ctx.fillStyle = "#" + heightHex + heightHex + heightHex;
        // ctx.beginPath();
        // ctx.arc(x, y, 5, 0, Math.PI * 2);
        // ctx.fill();

        const waveNoise = fbm.get3(v.multiplyScalar(100)); // basically white noise
        const offset = Math.random();
        const waterLevel = options.floor + options.waterDepth;
        const waterFac = Math.max(0, Math.sign(waterLevel - scaledHeight));
        canvasAnim.drawAllFrames((i, ctx2) => {
          // const animFac = Math.max(0, Math.sign(waterLevel - scaledHeight)) * (Math.sin(v.x ^ v.y ^ v.z + i / canvasAnim.frames * 2 * Math.PI) + 1) / 2 * midScalingFac * 0.05;
          // const animFac = waterFac * Math.random() * 0.01;
          const animFac = waterFac * (Math.sin(waveNoise + Math.sin((i / canvasAnim.frames + offset) * 2 * Math.PI)) + 1) / 2 * 0.01;
          const hh = Math.floor(255 * (scaledHeight + animFac)).toString(16).padStart(2, '0');
          ctx2.fillStyle = "#" + hh + hh + hh;
          ctx2.beginPath();
          ctx2.arc(x, y, 5, 0, Math.PI * 2);
          ctx2.fill();
        });
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
        Math.max(0, Math.sin(heightAvg / 2 + 0.5)) ** 2,
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
      

      // roughness
      if (heightAvg < waterLevel) {
        roughnessCtx.fillStyle = '#555555'; // reflectiveness

        roughnessCtx.beginPath();
        for (let i = 0; i < texPoints.length; i++) {
          const { x, y } = texPoints[i];
          if ( i === 0 ) {
            roughnessCtx.moveTo(x, y);
          } else {
            roughnessCtx.lineTo(x, y);
          }

          if (x < 10) offscreen = 1;
          else if (x > canvases.color.width - 10) offscreen = -1;
        }
        roughnessCtx.closePath();
        roughnessCtx.fill();
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

  redraw(options: PlanetNS.TextureOptions) {
    Planet.DrawTextures(this.geometry, this.canvases, options);
    this.canvases.colorTexture.needsUpdate = true;
    this.canvases.displacementTexture.needsUpdate = true;
  }

  update() {
    const updatedDisplacementCanvas = this.canvases.displacementCanvasAnim.update();
    if (updatedDisplacementCanvas) {
      this.canvases.displacementTexture.needsUpdate = true;
    }
  }
}
