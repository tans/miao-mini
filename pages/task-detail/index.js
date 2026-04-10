// pages/task-detail/index.js
const Api = require('../../utils/api.js');
const { getStatusText, getClaimStatusText, getStatusClass } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    task: null,
    claims: [],
    isMyTask: false,
    canClaim: false
  },

  onLoad(options) {
    if (!app.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.loadTaskDetail(options.id);
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      const task = res.data;

      if (!task) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      const user = app.getUser();
      const taskStatus = typeof task.status === 'number' ? task.status : parseInt(task.status, 10);
      const isMyTask = user && task.business_id == user.id;
      // 已上线(status=1)且用户是创作者且不是任务创建者时可接单
      const canClaim = !isMyTask && user && user.role === 'creator' && taskStatus === 1;

      this.setData({ task, isMyTask, canClaim });

      if (isMyTask) {
        this.loadTaskClaims(taskId);
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async loadTaskClaims(taskId) {
    try {
      const res = await Api.getTaskClaims(taskId);
      this.setData({ claims: res.data || [] });
    } catch (err) {
      console.error('加载提案失败', err);
    }
  },

  async claimTask() {
    const { task } = this.data;
    wx.showLoading({ title: '提交中...' });
    try {
      await Api.claimTask(task.id);
      wx.showToast({ title: '接单成功！', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/my-tasks/index' });
      }, 1500);
    } catch (err) {
      wx.showToast({ title: err.message || '接单失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async reviewClaim(e) {
    const { claimId, result } = e.currentTarget.dataset;
    try {
      await Api.reviewClaim(claimId, result);
      wx.showToast({ title: result == 1 ? '已采纳' : '已拒绝', icon: 'success' });
      this.loadTaskClaims(this.data.task.id);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  getStatusText(status) {
    return getStatusText(status);
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  },

  getStatusClass(status) {
    return getStatusClass(status);
  }
});
