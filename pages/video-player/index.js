const Api = require('../../utils/api.js');

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
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
    processStatus: '',
    processStatusText: '',
    playing: true,
    duration: 0,
    currentTime: 0,
    durationText: '0:00',
    currentTimeText: '0:00',
  },

  onLoad(options) {
    this.videoContext = wx.createVideoContext('videoPlayer', this);
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
        videoUrl: Api.getDisplayUrl(decodeURIComponent(options.url)),
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
      videoUrl = Api.getDisplayUrl(
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
      processStatus,
      processStatusText,
    });
  },

  onVideoError() {
    wx.showToast({ title: 'Video error', icon: 'none' });
  },

  onLoadedMetadata(e) {
    const duration = Number(e.detail.duration) || 0;
    this.setData({
      duration,
      durationText: formatTime(duration),
    });
  },

  onTimeUpdate(e) {
    const currentTime = Number(e.detail.currentTime) || 0;
    const duration = Number(e.detail.duration) || this.data.duration || 0;
    this.setData({
      currentTime,
      duration,
      currentTimeText: formatTime(currentTime),
      durationText: formatTime(duration),
    });
  },

  onVideoPlay() {
    this.setData({ playing: true });
  },

  onVideoPause() {
    this.setData({ playing: false });
  },

  onVideoEnded() {
    this.setData({
      playing: false,
      currentTime: 0,
      currentTimeText: '0:00',
    });
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
      currentTime,
      currentTimeText: formatTime(currentTime),
    });
  },

  onSeekChange(e) {
    const currentTime = Number(e.detail.value) || 0;
    if (this.videoContext) {
      this.videoContext.seek(currentTime);
    }
    this.setData({
      currentTime,
      currentTimeText: formatTime(currentTime),
    });
  },

  onUnload() {
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
