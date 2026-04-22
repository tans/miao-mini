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
    this.loadMyTasks().then(() => {
      this.loadAppealRecords();
    });
  },

  loadMyTasks() {
    return Api.getMyClaims({ page: 1, limit: 100 }).then(res => {
      if (res.data && res.data.length > 0) {
        // Map claims to task list for picker
        const taskList = res.data.map(claim => ({
          id: claim.id,
          task_id: claim.task_id,
          title: claim.task_title,
          status: claim.status
        }));
        this.setData({ taskList });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载任务失败', icon: 'none' });
    });
  },

  loadAppealRecords() {
    Api.getAppeals({ limit: 50, offset: 0 }).then(res => {
      if (res.data && res.data.appeals) {
        // Build task title lookup from loaded tasks (from loadMyTasks)
        const taskMap = {};
        (this.data.taskList || []).forEach(task => {
          // key by claim id
          taskMap[task.id] = task.title;
        });
        const records = res.data.appeals.map(appeal => {
          // Try to get task title from cached taskList, fallback to target_id
          const taskTitle = taskMap[appeal.target_id] || `任务 #${appeal.target_id}`;
          return {
            id: appeal.id,
            taskTitle: taskTitle,
            reason: appeal.reason,
            status: appeal.status,
            statusText: appeal.status_str || (appeal.status === 1 ? '待处理' : '已处理'),
            createTime: appeal.created_at ? appeal.created_at.split('T')[0] : ''
          };
        });
        this.setData({ records });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '加载申诉记录失败', icon: 'none' });
    });
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

    // Upload images first if any, then submit appeal
    const uploadAndSubmit = async () => {
      let evidence = '';
      if (this.data.uploadImages.length > 0) {
        const uploadedUrls = [];
        for (const img of this.data.uploadImages) {
          try {
            const url = await Api.uploadImage(img);
            uploadedUrls.push(url);
          } catch (e) {
            wx.showToast({ title: '图片上传失败，请重试', icon: 'none' });
          }
        }
        evidence = uploadedUrls.join(',');
      }

      return Api.createAppeal({
        type: 1, // 任务申诉
        target_id: this.data.selectedTask.id, // claim ID
        reason: this.data.selectedType.name + ': ' + this.data.reason,
        evidence: evidence
      });
    };

    uploadAndSubmit().then(res => {
      wx.hideLoading();
      wx.showToast({ title: '申诉已提交', icon: 'success' });
      this.setData({ reason: '', uploadImages: [], selectedTask: null, selectedType: null });
      this.loadAppealRecords();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});