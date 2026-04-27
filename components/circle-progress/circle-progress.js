Component({
  properties: {
    progress: {
      type: Number,
      value: 0,
      observer() {
        this.drawProgress();
      }
    },
    size: {
      type: Number,
      value: 108,
      observer() {
        this.initCanvas();
      }
    },
    lineWidth: {
      type: Number,
      value: 10,
      observer() {
        this.initCanvas();
      }
    },
    trackColor: {
      type: String,
      value: '#FFDDCA',
      observer() {
        this.drawBackground();
      }
    },
    progressColor: {
      type: String,
      value: '#EF8802',
      observer() {
        this.drawProgress();
      }
    },
    lineCap: {
      type: String,
      value: 'round',
      observer() {
        this.initCanvas();
      }
    }
  },

  data: {
    bgCanvasId: 'circle_progress_bg',
    fgCanvasId: 'circle_progress_fg'
  },

  lifetimes: {
    ready() {
      this.initCanvas();
    }
  },

  methods: {
    getSafeProgress() {
      const value = Number(this.data.progress);
      if (!Number.isFinite(value)) return 0;
      if (value < 0) return 0;
      if (value > 100) return 100;
      return value;
    },

    getRadius() {
      const size = Number(this.data.size) || 108;
      const lineWidth = Number(this.data.lineWidth) || 10;
      return size / 2 - lineWidth / 2;
    },

    drawBackground() {
      if (!this.data.bgCanvasId) return;
      const size = Number(this.data.size) || 108;
      const lineWidth = Number(this.data.lineWidth) || 10;
      const radius = this.getRadius();
      const center = size / 2;

      const ctx = wx.createCanvasContext(this.data.bgCanvasId, this);
      ctx.clearRect(0, 0, size, size);
      ctx.setLineWidth(lineWidth);
      ctx.setLineCap(this.data.lineCap || 'round');
      ctx.setStrokeStyle(this.data.trackColor || '#FFDDCA');
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2, false);
      ctx.stroke();
      ctx.draw();
    },

    drawProgress() {
      if (!this.data.fgCanvasId) return;
      const size = Number(this.data.size) || 108;
      const lineWidth = Number(this.data.lineWidth) || 10;
      const radius = this.getRadius();
      const center = size / 2;
      const progress = this.getSafeProgress();
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * progress / 100);

      const ctx = wx.createCanvasContext(this.data.fgCanvasId, this);
      ctx.clearRect(0, 0, size, size);
      ctx.setLineWidth(lineWidth);
      ctx.setLineCap(this.data.lineCap || 'round');
      ctx.setStrokeStyle(this.data.progressColor || '#EF8802');
      ctx.beginPath();
      ctx.arc(center, center, radius, startAngle, endAngle, false);
      ctx.stroke();
      ctx.draw();
    },

    initCanvas() {
      this.drawBackground();
      this.drawProgress();
    }
  }
});
