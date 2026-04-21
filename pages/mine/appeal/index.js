const Api = require('../../../utils/api.js');

Page({
  data: {
    taskList: [],
    selectedTask: null,
    appealTypes: [
      { id: 1, name: '作品被错误拒绝' },
      { id: 2, name: '任务需求变更' },
      { id: 3, name: '结算金额有误' },
      { id: 4, name: '其他问题' }
    ],
    selectedType: null,
    reason: '',
    uploadImages: [],
    records: []
  },

  onLoad() {
    this.loadMyTasks();
    this.loadAppealRecords();
  },

  loadMyTasks() {
    // TODO: 加载我的任务列表
  },

  loadAppealRecords() {
    // TODO: 加载申诉记录
  },

  onTaskChange(e) {
    const index = e.detail.value;
    this.setData({ selectedTask: this.data.taskList[index] });
  },

  onAppealTypeChange(e) {
    const index = e.detail.value;
    this.setData({ selectedType: this.data.appealTypes[index] });
  },

  onReasonInput(e) {
    this.setData({ reason: e.detail.value });
  },

  uploadImage() {
    wx.chooseMedia({
      count: 3 - this.data.uploadImages.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const images = res.tempFiles.map(f => f.tempFilePath);
        this.setData({
          uploadImages: [...this.data.uploadImages, ...images]
        });
      }
    });
  },

  removeImage(e) {
    const index = e.currentTarget.dataset.index;
    const images = [...this.data.uploadImages];
    images.splice(index, 1);
    this.setData({ uploadImages: images });
  },

  submitAppeal() {
    if (!this.data.selectedTask) {
      wx.showToast({ title: '请选择任务', icon: 'none' });
      return;
    }
    if (!this.data.selectedType) {
      wx.showToast({ title: '请选择申诉类型', icon: 'none' });
      return;
    }
    if (!this.data.reason.trim()) {
      wx.showToast({ title: '请输入申诉原因', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    // TODO: 调用 API 提交申诉
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '申诉已提交', icon: 'success' });
      this.setData({ reason: '', uploadImages: [] });
      this.loadAppealRecords();
    }, 1500);
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});