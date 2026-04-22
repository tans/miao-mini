const Api = require('../../utils/api.js');

Page({
  data: {
    work: null,
    loading: true,
    currentIndex: 0,
    isVideo: false,
    videoUrl: '',
    processStatus: '',
    processStatusText: '',
    images: [],
    showVideo: false,
  },

  onLoad(options) {
    if (options.id) {
      const storedWork = wx.getStorageSync(`work_preview_${options.id}`);
      if (storedWork && storedWork.id) {
        this.setWorkData(storedWork);
      } else {
        this.loadWork(options.id);
      }
    } else if (options.data) {
      try {
        const work = JSON.parse(decodeURIComponent(options.data));
        this.setWorkData(work);
      } catch (e) {
        wx.showToast({ title: 'Data error', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } else {
      wx.showToast({ title: 'Param error', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
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
    const materials = Array.isArray(work.materials) ? work.materials : [];
    const coverType = work.cover_type ||
      (materials[0] && materials[0].file_type) ||
      (work.isVideo ? 'video' : 'image');
    const firstVideoMaterial = materials.find(m => m.file_type === 'video') || null;
    const processStatus = (firstVideoMaterial && firstVideoMaterial.process_status) || '';

    let images = [];
    let videoUrl = '';
    let showVideo = false;
    let processStatusText = '';

    if (coverType === 'video') {
      videoUrl = work.previewVideoSrc ||
        work.video_url ||
        (materials.find(m => m.file_type === 'video') && materials.find(m => m.file_type === 'video').file_path) ||
        work.cover_url ||
        '';
      showVideo = !!videoUrl;
      if (!videoUrl) {
        processStatusText = processStatus === 'failed'
          ? 'Video processing failed'
          : 'Video is processing';
      }
    } else {
      materials.forEach(m => {
        if (m.file_type === 'image' && m.file_path) {
          images.push(m.file_path);
        }
      });
      if (images.length === 0) {
        if (work.cover_url) images.push(work.cover_url);
        if (work.image) images.push(work.image);
      }
    }

    this.setData({
      work,
      loading: false,
      isVideo: coverType === 'video',
      videoUrl,
      processStatus,
      processStatusText,
      images,
      showVideo,
    });
  },

  onImageTap(e) {
    const { index } = e.currentTarget.dataset;
    if (this.data.images.length > 0) {
      wx.previewImage({
        current: this.data.images[index],
        urls: this.data.images,
      });
    }
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
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },
});
