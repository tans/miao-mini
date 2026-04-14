// pages/create-task/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    title: '',
    description: '',
    unit_price: '',
    total_count: '',
    award_price: '0',
    award_count: '0',
    deadline: '',
    video_duration: '15秒',
    creative_style: '种草推荐',
    durationOptions: ['15秒', '30秒', '60秒', '1-3分钟'],
    styleOptions: ['种草推荐', '开箱评测', '剧情故事', '日常记录'],
    materials: [],
    uploading: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    // 设置默认截止日期为30天后
    const date = new Date();
    date.setDate(date.getDate() + 30);
    this.setData({ deadline: date.toISOString().split('T')[0] });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onUnitPriceInput(e) {
    this.setData({ unit_price: e.detail.value });
  },

  onTotalCountInput(e) {
    this.setData({ total_count: e.detail.value });
  },

  onAwardPriceInput(e) {
    this.setData({ award_price: e.detail.value });
  },

  onAwardCountInput(e) {
    this.setData({ award_count: e.detail.value });
  },

  onDeadlineChange(e) {
    this.setData({ deadline: e.detail.value });
  },

  selectDuration(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ video_duration: value });
  },

  selectStyle(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ creative_style: value });
  },

  // 添加素材
  async addMaterial() {
    const { materials } = this.data;
    const mustBeImage = materials.length === 0;

    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: mustBeImage ? ['image'] : ['image', 'video'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        });
      });

      const file = res.tempFiles[0];
      const isVideo = file.fileType === 'video' || (res.type === 'video');
      const fileType = isVideo ? 'video' : 'image';

      this.setData({ uploading: true });

      let url;
      if (fileType === 'image') {
        url = await Api.uploadImage(file.tempFilePath);
      } else {
        url = await Api.uploadVideo(file.tempFilePath);
      }

      const newMaterials = [...this.data.materials, {
        url,
        fileName: file.tempFilePath.split('/').pop(),
        fileType,
        fileSize: file.size || 0,
      }];
      this.setData({ materials: newMaterials });
    } catch (err) {
      if (err && err.errMsg && err.errMsg.includes('cancel')) return;
      wx.showToast({ title: err.message || '上传失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 删除素材
  deleteMaterial(e) {
    const index = e.currentTarget.dataset.index;
    const materials = [...this.data.materials];
    materials.splice(index, 1);
    this.setData({ materials });
  },

  async handleSubmit() {
    const { title, description, unit_price, total_count, deadline, video_duration, creative_style, materials } = this.data;

    if (!title || !description || !unit_price || !total_count || !deadline) {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
      return;
    }

    if (materials.length === 0) {
      wx.showToast({ title: '请至少上传一个素材（第一个必须是图片）', icon: 'none' });
      return;
    }

    if (materials[0].fileType !== 'image') {
      wx.showToast({ title: '第一个素材必须是图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });
    try {
      await Api.createTask({
        title,
        description,
        unit_price: Number(unit_price),
        total_count: Number(total_count),
        award_price: Number(this.data.award_price) || 0,
        award_count: Number(this.data.award_count) || 0,
        deadline,
        video_duration,
        creative_style,
        industries: [],
        materials: materials.map((m, i) => ({
          file_name: m.fileName,
          file_path: m.url,
          file_size: m.fileSize,
          file_type: m.fileType,
          sort_order: i,
        })),
      });
      wx.showToast({ title: '发布成功！', icon: 'success' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/my-tasks/index' });
      }, 1500);
    } catch (err) {
      const msg = err && err.message || '发布失败';
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
