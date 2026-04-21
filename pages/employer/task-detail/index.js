// pages/employer/task-detail/index.js
const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    task: null,
    loading: true,
    materials: [],
    currentTab: 'detail',
    showEditJimeng: false,
    editJimengLink: '',
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
  },

  showJimengTutorial() {
    wx.showToast({ title: '教程页面开发中', icon: 'none' });
  },

  onJimengLinkInput(e) {
    this.setData({ editJimengLink: e.detail.value });
  },

  async updateJimengLink() {
    const { task, editJimengLink } = this.data;
    if (!editJimengLink || editJimengLink.length < 10) {
      wx.showToast({ title: '请输入有效的邀请链接', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '更新中...' });
    try {
      await Api.updateTaskJimengLink(task.id, editJimengLink);
      wx.showToast({ title: '更新成功', icon: 'success' });
      this.setData({
        'task.jimeng_link': editJimengLink,
        showEditJimeng: false
      });
    } catch (err) {
      wx.showToast({ title: '更新失败: ' + (err.message || '未知错误'), icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  toggleEditJimeng() {
    this.setData({ showEditJimeng: !this.data.showEditJimeng, editJimengLink: this.data.task.jimeng_link || '' });
  }
});