// pages/create-task/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    title: '',
    description: '',
    unit_price: 2,
    unit_price_index: 0,
    priceRange: Array.from({length: 99}, (_, i) => i + 2),
    total_count: '',
    award_price: '0',
    award_count: '0',
    deadline: '',
    video_duration: '15秒',
    creative_style: '种草推荐',
    durationOptions: ['15秒', '30秒', '60秒', '1-3分钟'],
    styleOptions: ['种草推荐', '开箱评测', '剧情故事', '日常记录'],
    materials: [],
    uploading: false,
    baseTotal: '0.00',
    awardTotal: '0.00',
    totalBudget: '0.00',
    rules: [
      { prop: 'title', rules: [{ required: true, message: '请填写任务标题' }] },
      { prop: 'description', rules: [{ required: true, message: '请填写详细描述' }] },
      { prop: 'unit_price', rules: [{ required: true, message: '请填写基础奖励' }, { validator: (val) => val >= 2, message: '基础奖励至少2元' }] },
      { prop: 'total_count', rules: [{ required: true, message: '请填写报名人数上限' }, { validator: (val) => val >= 10, message: '报名人数至少10人' }] },
      { prop: 'deadline', rules: [{ required: true, message: '请填写截止日期' }] },
    ],
    formData: {}
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.showLoading({ title: '登录中...' });
      app.silentLogin().then(() => {
        wx.hideLoading();
        if (!app.isLoggedIn()) {
          wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        }
      });
    }
    // 设置截止日期范围：最早3天后，最晚30天后
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 3);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    this.setData({
      deadline: minDate.toISOString().split('T')[0],
      minDeadline: minDate.toISOString().split('T')[0],
      maxDeadline: maxDate.toISOString().split('T')[0]
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  onUnitPriceChange(e) {
    const index = e.detail.value;
    const priceRange = this.data.priceRange;
    this.setData({
      unit_price_index: index,
      unit_price: priceRange[index]
    });
    this.updateBudgetPreview();
  },

  onTotalCountInput(e) {
    this.setData({ total_count: e.detail.value });
    this.updateBudgetPreview();
  },

  onAwardPriceInput(e) {
    this.setData({ award_price: e.detail.value });
    this.updateBudgetPreview();
  },

  onAwardCountInput(e) {
    this.setData({ award_count: e.detail.value });
    this.updateBudgetPreview();
  },

  updateBudgetPreview() {
    const unitPrice = parseFloat(this.data.unit_price) || 0;
    const totalCount = parseInt(this.data.total_count) || 0;
    const awardPrice = parseFloat(this.data.award_price) || 0;
    const awardCount = parseInt(this.data.award_count) || 0;

    const baseTotal = unitPrice * totalCount;
    const awardTotal = awardPrice * awardCount;
    const total = baseTotal + awardTotal;

    this.setData({
      baseTotal: baseTotal.toFixed(2),
      awardTotal: awardTotal.toFixed(2),
      totalBudget: total.toFixed(2)
    });
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

    if (!title) {
      wx.showToast({ title: '请填写任务标题', icon: 'none' });
      return;
    }
    if (!description) {
      wx.showToast({ title: '请填写详细描述', icon: 'none' });
      return;
    }
    if (!unit_price) {
      wx.showToast({ title: '请填写基础奖励', icon: 'none' });
      return;
    }
    if (!total_count) {
      wx.showToast({ title: '请填写报名人数上限', icon: 'none' });
      return;
    }
    if (!deadline) {
      wx.showToast({ title: '请填写截止日期', icon: 'none' });
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
