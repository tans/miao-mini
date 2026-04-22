const Api = require('../../utils/api.js');

Page({
  data: {
    work: null,
    loading: true,
    currentIndex: 0,
    isVideo: false,
    videoUrl: '',
    images: [],
    showVideo: false,
  },

  onLoad(options) {
    if (options.id) {
      // 优先从 storage 获取，避免 URL 长度超限问题
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
        wx.showToast({ title: '数据解析失败', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  async loadWork(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getWork(id);
      const work = res.data;
      if (work) {
        this.setWorkData(work);
      } else {
        wx.showToast({ title: '作品不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
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

    let images = [];
    let videoUrl = '';
    let showVideo = false;

    if (coverType === 'video') {
      videoUrl = work.previewVideoSrc ||
        work.video_url ||
        (materials.find(m => m.file_type === 'video') && materials.find(m => m.file_type === 'video').file_path) ||
        work.cover_url ||
        '';
      showVideo = true;
    } else {
      // Collect all image materials
      materials.forEach(m => {
        if (m.file_type === 'image' && m.file_path) {
          images.push(m.file_path);
        }
      });
      // Fallback to cover_url or image
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

  onVideoError(e) {
    wx.showToast({ title: '视频播放失败', icon: 'none' });
  },

  onUnload() {
    // 清理 storage 中的预览数据
    if (this.data.work && this.data.work.id) {
      wx.removeStorageSync(`work_preview_${this.data.work.id}`);
    }
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },
});