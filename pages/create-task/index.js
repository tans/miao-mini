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
    styleOptions: ['种草推荐', '开箱评测', '剧情故事', '日常记录']
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    const user = app.getUser();
    if (user && user.role !== 'business') {
      wx.showToast({ title: '只有商家才能创建任务', icon: 'none' });
      wx.switchTab({ url: '/pages/home/index' });
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

  async handleSubmit() {
    const { title, description, unit_price, total_count, deadline, video_duration, creative_style } = this.data;

    if (!title || !description || !unit_price || !total_count || !deadline) {
      wx.showToast({ title: '请填写必填项', icon: 'none' });
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
        industries: []
      });
      wx.showToast({ title: '发布成功！', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/my-tasks/index' });
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '发布失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
