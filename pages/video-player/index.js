const Api = require('../../utils/api.js');

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
}

function getImageMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'image') || null;
}

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
        isVideo: true,
        showVideo: true,
        videoUrl: decodeURIComponent(options.url),
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
    const firstImageMaterial = getImageMaterial(materials);
    const coverType = work.cover_type ||
      (firstVideoMaterial ? 'video' : '') ||
      (firstImageMaterial ? 'image' : '') ||
      (work.isVideo ? 'video' : 'image');
    const processStatus = (firstVideoMaterial && firstVideoMaterial.process_status) || '';

    let images = [];
    let videoUrl = '';
    let showVideo = false;
    let processStatusText = '';

    if (coverType === 'video') {
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
      showVideo = !!videoUrl;
      if (!videoUrl) {
        processStatusText = processStatus === 'failed'
          ? 'Video processing failed'
          : 'Video is processing';
      }
    } else {
      materials.forEach((m) => {
        if (m.file_type === 'image' && m.file_path) {
          images.push(Api.getDisplayUrl(m.file_path));
        }
      });
      if (images.length === 0) {
        if (work.cover_url) images.push(Api.getDisplayUrl(work.cover_url));
        if (work.image) images.push(Api.getDisplayUrl(work.image));
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
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/home/index' })
    });
  }
});
