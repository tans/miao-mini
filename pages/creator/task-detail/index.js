const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    taskId: '',
    task: {},
    materials: [],
    recommendations: [],
    currentTab: 'detail',
    hasSignedUp: false,
    canSubmit: false,
    countdownText: '',
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ taskId: options.id });
      this.loadTaskDetail(options.id);
    }
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      const task = res.data || {};
      this.setData({
        task,
        materials: task.materials || [],
        hasSignedUp: task.hasSignedUp || false,
        canSubmit: task.canSubmit || false,
      });
      this.updateCountdown(task.endAt);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  initMockData() {
    if (process.env.NODE_ENV !== 'development') return;
    // 模拟数据用于开发和测试
    const mockTask = {
      id: 'CC-20260418-000126',
      title: '高端楼盘春日氛围视频',
      unitPrice: 100,
      awardPrice: 10,
      industry: '房产家居',
      style: '高级感',
      description: '突出空间通透感与生活方式场景，口语化表达，避免过度摆拍。适合地产、家居类创作者参与。',
      videoAspect: '9:16 竖屏',
      videoResolution: '1080P',
      videoDuration: '30s',
      endAt: '2026-04-24 18:00',
      merchantName: '美寓家居旗舰店',
      merchantAvatar: 'https://img.yzcdn.cn/vant/avatar.jpg',
      isBrandEnterprise: true,
      adoptionRate: '86',
      totalTasks: 120,
      totalSpend: 6800,
      jimengLink: '',
    };

    const mockMaterials = [
      { id: 1, file_path: 'https://img.yzcdn.cn/vant/cat.jpeg', file_type: 'image' },
      { id: 2, file_path: 'https://img.yzcdn.cn/vant/cat.jpeg', file_type: 'image' },
      { id: 3, file_path: 'https://img.yzcdn.cn/vant/cat.jpeg', file_type: 'image' },
    ];

    const mockRecommendations = [
      {
        id: 1,
        title: '企业宣传片剪辑',
        unitPrice: 100,
        industry: '房产家居',
        style: '高级感',
        duration: '30s视频',
        enrolled: 3,
        limit: 10,
        enrolledPercent: 30,
        deadlineText: '2天16小时后截止投稿'
      },
      {
        id: 2,
        title: '企业宣传片拍摄剪辑',
        unitPrice: 100,
        industry: '房产家居',
        style: '高级感',
        duration: '30s视频',
        enrolled: 3,
        limit: 10,
        enrolledPercent: 30,
        deadlineText: '2天16小时后截止投稿'
      }
    ];

    this.setData({
      task: mockTask,
      materials: mockMaterials,
      recommendations: mockRecommendations,
    });
    this.updateCountdown(mockTask.endAt);
  },

  updateCountdown(endAt) {
    if (!endAt) return;
    const endTime = new Date(endAt).getTime();
    const now = new Date().getTime();
    const diff = endTime - now;
    if (diff <= 0) {
      this.setData({ countdownText: '已截止' });
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    this.setData({ countdownText: `${hours}小时${minutes}分` });
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  copyTaskId() {
    const taskId = this.data.task.id || 'CC-20260418-000126';
    wx.setClipboardData({
      data: taskId,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  },

  goTaskDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/creator/task-detail/index?id=${id}` });
  },

  handleSignUp() {
    wx.showLoading({ title: '报名中...' });
    setTimeout(() => {
      wx.hideLoading();
      this.setData({ hasSignedUp: true, canSubmit: true });
      wx.showToast({ title: '报名成功', icon: 'success' });
    }, 1000);
  },

  goSubmitWork() {
    wx.navigateTo({ url: `/pages/creator/submit-work/index?taskId=${this.data.taskId}` });
  }
});