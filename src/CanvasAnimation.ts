export default class CanvasAnimation {
  private frame: number = 0;
  private lastUpdate: number = 0;
  private frameCanvas: HTMLCanvasElement;

  constructor(private targetCanvas: HTMLCanvasElement, readonly frames: number, private fps: number = frames) {
    this.frameCanvas = document.createElement('canvas');
    // document.body.appendChild(this.frameCanvas);
    this.frameCanvas.width = targetCanvas.width;
    this.frameCanvas.height = frames * targetCanvas.height;
  }

  drawAllFrames(drawCb: (i: number, ctx: CanvasRenderingContext2D) => void): void {
    const ctx = this.frameCanvas.getContext("2d");
    for (let i = 0; i < this.frames; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, this.targetCanvas.width, this.targetCanvas.height);
      ctx.clip();

      drawCb(i, ctx);
      ctx.restore(); // remove clip
      ctx.translate(0, this.targetCanvas.height);
    }
    ctx.resetTransform();
  }

  update(): boolean {
    const delta = Date.now() - this.lastUpdate;
    const targetDelta = 1000 / this.fps;
    if (delta >= targetDelta) {
      this.lastUpdate = Date.now();
      const ctx = this.targetCanvas.getContext("2d");
      ctx.drawImage(this.frameCanvas, 0, this.targetCanvas.height * -this.frame);
      this.frame = (this.frame + 1) % this.frames;
      return true;
    }

    return false;
  }
}
