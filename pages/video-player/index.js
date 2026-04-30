const Api = require('../../utils/api.js');

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
}

function normalizePreviewUrl(value = '') {
  const raw = (value || '').trim();
  if (!raw) return '';
  try {
    return Api.getDisplayUrl(decodeURIComponent(raw));
  } catch (e) {
    return Api.getDisplayUrl(raw);
  }
}

Page({
  data: {
    work: null,
    loading: true,
    videoUrl: '',
    processStatus: '',
    processStatusText: '',
  },

  onLoad(options) {
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
      processStatus,
      processStatusText,
    });
  },

  onVideoError() {
    wx.showToast({ title: 'Video error', icon: 'none' });
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
