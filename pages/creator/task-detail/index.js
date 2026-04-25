const Api = require('../../../utils/api.js');
const app = getApp();

function toList(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
  return [value];
}

function normalizeTask(task = {}) {
  const claim = task.claim || null;
  const claimMaterials = Array.isArray(task.claim_materials) ? task.claim_materials : [];
  const industries = toList(task.industries);
  const styles = toList(task.styles);
  const endAt = task.endAt || task.end_at || '';

  return {
    ...task,
    merchantName: task.business_name || task.merchantName || '',
    merchantAvatar: task.business_avatar || task.merchantAvatar || '',
    industry: task.industry || industries[0] || '',
    industries,
    style: task.style || styles[0] || '',
    styles,
    unitPrice: task.unitPrice ?? task.unit_price ?? 0,
    awardPrice: task.awardPrice ?? task.award_price ?? 0,
    videoAspect: task.videoAspect || task.video_aspect || '',
    videoResolution: task.videoResolution || task.video_resolution || '',
    videoDuration: task.videoDuration || task.video_duration || '',
    endAt,
    end_at: endAt,
    hasSignedUp: task.hasSignedUp != null ? task.hasSignedUp : (task.has_signed_up != null ? task.has_signed_up : !!claim),
    canSubmit: task.canSubmit != null ? task.canSubmit : (task.can_submit != null ? task.can_submit : (claim ? Number(claim.status) === 1 : false)),
    claim,
    claimMaterials,
    claimStatusText: claim ? getClaimStatusText(claim.status) : '',
  };
}

function getClaimStatusText(status) {
  const value = Number(status);
  const map = {
    1: '已认领，待提交',
    2: '已提交，待验收',
    3: '已验收',
    4: '已取消',
    5: '已超时',
  };
  return map[value] || '未知状态';
}

Page({
  data: {
    taskId: '',
    task: {},
    materials: [],
    claimMaterials: [],
    recommendations: [],
    currentTab: 'detail',
    hasSignedUp: false,
    canSubmit: false,
    countdownText: '',
    countdownTimer: null,
    // 提交模态框相关
    showSubmitModal: false,
    submitClaimId: '',
    submitVideoUrl: '',
    submitting: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ taskId: options.id });
      this.loadTaskDetail(options.id);
    }
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      const task = normalizeTask(res.data || {});
      this.setData({
        task,
        materials: task.materials || [],
        claimMaterials: task.claimMaterials || [],
        hasSignedUp: !!task.hasSignedUp,
        canSubmit: !!task.canSubmit,
        submitClaimId: task.claim && task.claim.id ? String(task.claim.id) : '',
      });
      this.startCountdownTimer(task.endAt);
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  startCountdownTimer(endAt) {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }
    this.updateCountdown(endAt);
    const timer = setInterval(() => {
      this.updateCountdown(endAt);
    }, 60000);
    this.setData({ countdownTimer: timer });
  },

  updateCountdown(endAt) {
    if (!endAt) return;
    const endTime = new Date(endAt).getTime();
    const now = new Date().getTime();
    const diff = endTime - now;
    if (diff <= 0) {
      this.setData({ countdownText: '已截止' });
      if (this.data.countdownTimer) {
        clearInterval(this.data.countdownTimer);
        this.setData({ countdownTimer: null });
      }
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
    if (this.data.hasSignedUp) {
      wx.showToast({ title: '已报名', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '报名中...' });
    Api.claimTask(this.data.taskId).then((res) => {
      const claimId = res.data && res.data.claim_id ? String(res.data.claim_id) : '';
      if (claimId) {
        this.setData({ submitClaimId: claimId });
      }
      wx.showToast({ title: '报名成功', icon: 'success' });
      this.loadTaskDetail(this.data.taskId);
    }).catch((err) => {
      wx.showToast({ title: err.message || '报名失败', icon: 'none' });
    }).finally(() => {
      wx.hideLoading();
    });
  },

  loadClaimId() {
    const task = this.data.task || {};
    if (task.claim && task.claim.id) {
      this.setData({ submitClaimId: String(task.claim.id) });
      return Promise.resolve(task.claim.id);
    }
    return Api.getClaimByTaskId(this.data.taskId).then((res) => {
      if (res.data && res.data.claim) {
        this.setData({ submitClaimId: String(res.data.claim.id || '') });
        return res.data.claim.id;
      }
      this.setData({ submitClaimId: '' });
    }).catch(() => {
      this.setData({ submitClaimId: '' });
    });
  },

  async goSubmitWork() {
    if (!this.data.canSubmit) {
      wx.showToast({ title: '当前状态不可提交', icon: 'none' });
      return;
    }
    if (!this.data.submitClaimId) {
      await this.loadClaimId();
    }
    if (!this.data.submitClaimId) {
      wx.showToast({ title: '认领不存在，请先报名', icon: 'none' });
      return;
    }
    this.setData({ showSubmitModal: true, submitVideoUrl: '' });
  },

  onCloseSubmitModal() {
    this.setData({ showSubmitModal: false, submitVideoUrl: '', submitting: false });
  },

  onChooseVideo() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({ submitVideoUrl: tempFilePath });
        wx.showToast({ title: '视频已选择', icon: 'success' });
      },
      fail: () => {
        wx.showToast({ title: '选择失败', icon: 'none' });
      }
    });
  },

  async onSubmitWork() {
    if (this.data.submitting) return;
    if (!this.data.submitVideoUrl) {
      wx.showToast({ title: '请先选择视频', icon: 'none' });
      return;
    }
    const claimId = this.data.submitClaimId;
    if (!claimId) {
      wx.showToast({ title: '认领不存在，请重新报名', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    wx.showLoading({ title: '上传中...' });

    try {
      const uploadJobId = `claim-${claimId}-${Date.now()}`;
      const uploadRes = await Api.uploadVideo(this.data.submitVideoUrl, {
        bizType: 'claim_source',
        bizId: claimId,
        jobId: uploadJobId,
        returnMeta: true,
      });

      wx.showLoading({ title: '提交中...' });

      const submitRes = await Api.submitClaim(claimId, {
        content: `视频稿件：${uploadRes.filename || 'video.mp4'}`,
        materials: [{
          file_name: uploadRes.filename || 'video.mp4',
          file_path: uploadRes.url,
          file_size: uploadRes.size || 0,
          file_type: uploadRes.type || 'video/mp4',
        }],
      });

      wx.hideLoading();
      const summary = submitRes.data && submitRes.data.process_status_summary;
      const pendingCount = summary ? ((summary.pending || 0) + (summary.processing || 0)) : 0;
      wx.showToast({
        title: pendingCount ? '提交成功，处理中' : '提交成功',
        icon: 'success'
      });
      this.onCloseSubmitModal();
      this.loadTaskDetail(this.data.taskId);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  stopPropagation() {},

  noop() {}
});
