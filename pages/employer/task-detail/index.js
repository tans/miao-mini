// pages/employer/task-detail/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    task: null,
    loading: true,
    materials: [],
    currentTab: 'detail',
  },

  onLoad(options) {
    this.loadTaskDetail(options.id);
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      console.log('getTask response:', res);
      const task = res.data;

      if (!task) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        this.setData({ loading: false });
        return;
      }

      this.setData({
        task,
        materials: task.materials || [],
        loading: false
      });
    } catch (err) {
      console.error('loadTaskDetail error:', err);
      wx.showToast({ title: '加载失败: ' + (err.message || '未知错误'), icon: 'none', duration: 3000 });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    const taskId = this.data.task && this.data.task.id;
    if (taskId) {
      wx.setClipboardData({
        data: taskId,
        success() {
          wx.showToast({ title: '已复制', icon: 'success' });
        }
      });
    }
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  }
});