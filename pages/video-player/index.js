const Api = require('../../utils/api.js');

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
}

function safeDecodeURIComponent(value = '') {
  if (!value) return '';
  try {
    return decodeURIComponent(value);
  } catch (e) {
    return value;
  }
}

function normalizePreviewUrl(value = '') {
  return Api.getDisplayUrl(safeDecodeURIComponent(value));
}

function resolveVideoPoster(work = {}, firstVideoMaterial = null, fallbackPoster = '') {
  const poster = fallbackPoster ||
    work.poster ||
    work.displayCover ||
    work.cover ||
    work.cover_url ||
    work.coverUrl ||
    work.thumbnail ||
    work.thumbnail_path ||
    work.poster_url ||
    work.previewCover ||
    (firstVideoMaterial && (
      firstVideoMaterial.poster_url ||
      firstVideoMaterial.thumbnail_path ||
      firstVideoMaterial.thumbnail ||
      firstVideoMaterial.cover_url ||
      firstVideoMaterial.cover
    )) ||
    '';
  return Api.getDisplayUrl(poster);
}

function formatTime(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const remainSeconds = total % 60;
  return `${minutes}:${String(remainSeconds).padStart(2, '0')}`;
}

Page({
  data: {
    work: null,
    loading: true,
    videoUrl: '',
    poster: '',
    processStatus: '',
    processStatusText: '',
    playing: false,
    duration: 0,
    currentTime: 0,
    durationText: '0:00',
    currentTimeText: '0:00',
    isSeeking: false,
  },

  onLoad(options) {
    this.videoContext = wx.createVideoContext('videoPlayer', this);
    this.autoPlayRequested = false;
    this.initialPoster = normalizePreviewUrl(options.poster || '');
    if (options.id) {
      this.workId = options.id;
      const storedWork = wx.getStorageSync(`work_preview_${options.id}`);
      if (storedWork && storedWork.id) {
        this.setWorkData(storedWork);
      } else {
        this.loadWork(options.id);
      }
      return;
    }

    if (options.data) {
      try {
        const work = JSON.parse(decodeURIComponent(options.data));
        this.setWorkData(work);
      } catch (e) {
        wx.showToast({ title: 'Data error', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
      return;
    }

    if (options.url) {
      this.setData({
        loading: false,
        videoUrl: normalizePreviewUrl(options.url),
        poster: this.initialPoster,
        isSeeking: false,
        playing: false,
      });
    }
  },

  onPullDownRefresh() {
    const workId = this.workId || (this.data.work && this.data.work.id);
    if (!workId) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadWork(workId).finally(() => wx.stopPullDownRefresh());
  },

  async loadWork(id) {
    wx.showLoading({ title: 'Loading...' });
    try {
      const res = await Api.getWork(id);
      const work = res.data;
      if (work) {
        this.setWorkData(work);
      } else {
        wx.showToast({ title: 'Work not found', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: 'Load failed', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    } finally {
      wx.hideLoading();
    }
  },

  setWorkData(work) {
    this.workId = work && work.id ? work.id : this.workId;
    const materials = Array.isArray(work.materials) ? work.materials : [];
    const firstVideoMaterial = getVideoMaterial(materials);
    const processStatus = (firstVideoMaterial && firstVideoMaterial.process_status) || '';

    let videoUrl = '';
    let processStatusText = '';

    if (firstVideoMaterial || work.isVideo || work.cover_type === 'video' || work.video_url || work.previewVideoSrc) {
      videoUrl = normalizePreviewUrl(
        work.previewVideoSrc ||
        work.video_url ||
        (firstVideoMaterial && (
          firstVideoMaterial.previewUrl ||
          firstVideoMaterial.file_path ||
          firstVideoMaterial.processed_file_path
        )) ||
        ''
      );
      if (!videoUrl) {
        processStatusText = processStatus === 'failed'
          ? 'Video processing failed'
          : 'Video is processing';
      }
    }

    this.setData({
      work,
      loading: false,
      videoUrl,
      poster: resolveVideoPoster(work, firstVideoMaterial, this.initialPoster),
      processStatus,
      processStatusText,
      playing: false,
    });
  },

  onVideoError() {
    wx.showToast({ title: 'Video error', icon: 'none' });
  },

  onVideoCanPlay() {
    if (this.autoPlayRequested) return;
    this.autoPlayRequested = true;
    if (this.videoContext) {
      this.videoContext.play();
    }
  },

  onLoadedMetadata(e) {
    const duration = Number(e.detail.duration) || 0;
    this.progressBaseTime = 0;
    this.progressBaseAt = Date.now();
    this.setData({
      duration,
      durationText: formatTime(duration),
    });
  },

  onTimeUpdate(e) {
    const currentTime = Number(e.detail.currentTime) || 0;
    const duration = Number(e.detail.duration) || this.data.duration || 0;
    this.progressBaseTime = currentTime;
    this.progressBaseAt = Date.now();
    if (this.data.isSeeking) return;
    this.setData({
      currentTime,
      duration,
      currentTimeText: formatTime(currentTime),
      durationText: formatTime(duration),
    });
  },

  onVideoPlay() {
    this.setData({ playing: true });
    this.autoPlayRequested = true;
    this.progressBaseTime = this.data.currentTime || 0;
    this.progressBaseAt = Date.now();
    this.startProgressTicker();
  },

  onVideoPause() {
    this.setData({ playing: false });
    this.stopProgressTicker();
  },

  onVideoEnded() {
    this.stopProgressTicker();
    this.setData({
      playing: false,
      currentTime: 0,
      currentTimeText: '0:00',
    });
  },

  onVideoTap() {
    const now = Date.now();
    if (this.lastVideoTapAt && now - this.lastVideoTapAt < 280) {
      this.lastVideoTapAt = 0;
      this.togglePlay();
      return;
    }
    this.lastVideoTapAt = now;
    clearTimeout(this.lastVideoTapTimer);
    this.lastVideoTapTimer = setTimeout(() => {
      this.lastVideoTapAt = 0;
    }, 320);
  },

  togglePlay() {
    if (!this.videoContext) return;
    if (this.data.playing) {
      this.videoContext.pause();
      return;
    }
    this.videoContext.play();
  },

  onSeekChanging(e) {
    const currentTime = Number(e.detail.value) || 0;
    this.setData({
      isSeeking: true,
      currentTime,
      currentTimeText: formatTime(currentTime),
    });
  },

  onSeekChange(e) {
    const currentTime = Number(e.detail.value) || 0;
    if (this.videoContext) {
      this.videoContext.seek(currentTime);
    }
    this.progressBaseTime = currentTime;
    this.progressBaseAt = Date.now();
    this.setData({
      isSeeking: false,
      currentTime,
      currentTimeText: formatTime(currentTime),
    });
  },

  startProgressTicker() {
    if (this.progressTimer) return;
    this.progressTimer = setInterval(() => {
      if (!this.data.playing || this.data.isSeeking) return;
      const duration = this.data.duration || 0;
      const baseTime = Number(this.progressBaseTime || 0);
      const baseAt = Number(this.progressBaseAt || Date.now());
      const nextTime = Math.max(0, Math.min(duration || Infinity, baseTime + (Date.now() - baseAt) / 1000));
      this.setData({
        currentTime: nextTime,
        currentTimeText: formatTime(nextTime),
      });
    }, 100);
  },

  stopProgressTicker() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  },

  onUnload() {
    this.stopProgressTicker();
    clearTimeout(this.lastVideoTapTimer);
    if (this.data.work && this.data.work.id) {
      wx.removeStorageSync(`work_preview_${this.data.work.id}`);
    }
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/home/index' })
    });
  }
});
