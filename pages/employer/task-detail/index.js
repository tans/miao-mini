const Api = require('../../../utils/api.js');
const app = getApp();

function toList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  if (typeof value === 'string') {
    return value
      .split(/[,，、]/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [value];
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function getDeadlineText(endAt) {
  if (!endAt) return '未设置';
  const diff = new Date(endAt).getTime() - Date.now();
  if (Number.isNaN(diff)) return '未设置';
  if (diff <= 0) return '已截止';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}小时${minutes}分`;
}

function normalizeTask(task = {}) {
  const endAt = pick(task.end_at, task.endAt, '');
  const industryTags = toList(pick(task.industries, task.industry));
  const styleTags = toList(pick(task.styles, task.style));
  const materials = Array.isArray(task.materials) ? task.materials : [];

  return {
    ...task,
    id: pick(task.id, task.task_id, ''),
    businessName: pick(task.business_name, task.businessName, task.merchant_name, task.merchantName, '商家'),
    businessAvatar: pick(task.business_avatar, task.businessAvatar, task.merchantAvatar, ''),
    title: pick(task.title, task.name, '高端楼盘春日氛围视频'),
    unitPrice: Number(pick(task.unit_price, task.unitPrice, 100)) || 100,
    awardPrice: Number(pick(task.award_price, task.awardPrice, 10)) || 10,
    industry: industryTags[0] || pick(task.industry, '房产家居'),
    style: styleTags[0] || pick(task.style, '房产家居'),
    industryTags: industryTags.length ? industryTags : [pick(task.industry, '房产家居')],
    styleTags: styleTags.length ? styleTags : [pick(task.style, '房产家居')],
    description: pick(
      task.description,
      task.desc,
      '突出空间通透感与生活方式场景，口语化表达，避免过度摆拍。适合地产、家居类创作者参与。'
    ),
    videoAspect: pick(task.video_aspect, task.videoAspect, '9:16 竖屏'),
    videoResolution: pick(task.video_resolution, task.videoResolution, '1080P'),
    videoDuration: pick(task.video_duration, task.videoDuration, '30s'),
    endAt,
    deadlineText: getDeadlineText(endAt),
    videoUrl: pick(task.video_url, task.videoUrl, ''),
    jimengLink: pick(task.jimeng_link, task.jimengLink, ''),
    jimengEnabled: task.jimeng_enabled ?? task.jimengEnabled ?? true,
    materials,
    pendingReviewCount: Number(pick(task.pending_review_count, task.pendingReviewCount, 0)) || 0,
    adoptionRate: Number(pick(task.adoption_rate, task.adoptionRate, 86)) || 86,
    totalPublished: Number(pick(task.total_published, task.totalPublished, 120)) || 120,
    totalSpent: Number(pick(task.total_spent, task.totalSpent, 6800)) || 6800,
  };
}

Page({
  data: {
    taskId: '',
    task: {
      industryTags: ['房产家居'],
      styleTags: ['房产家居'],
    },
    materials: [],
    proposalCount: 0,
    currentTab: 'detail',
    loading: false,
    showEditJimeng: false,
    editJimengLink: '',
  },

  onLoad(options = {}) {
    const taskId = options.id || options.taskId || '';
    const currentTab = options.tab === 'video' ? 'video' : 'detail';
    this.setData({ taskId, currentTab });

    wx.setNavigationBarTitle({ title: '商家任务详情' });

    if (!taskId) {
      wx.showToast({ title: '缺少任务ID', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1200);
      return;
    }

    if (!app.isLoggedIn()) {
      app.silentLogin().catch(() => {}).finally(() => {
        this.loadTaskDetail(taskId);
      });
      return;
    }

    this.loadTaskDetail(taskId);
  },

  onPullDownRefresh() {
    if (!this.data.taskId) {
      wx.stopPullDownRefresh();
      return;
    }
    this.loadTaskDetail(this.data.taskId).finally(() => wx.stopPullDownRefresh());
  },

  async loadTaskDetail(taskId) {
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });
    try {
      const [taskRes, claimsRes] = await Promise.all([
        Api.getTask(taskId).catch(() => ({ data: null })),
        app.isLoggedIn()
          ? Api.getTaskClaims(taskId).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
      ]);

      const rawTask = taskRes.data;
      if (!rawTask) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        this.setData({ loading: false });
        setTimeout(() => wx.navigateBack(), 1200);
        return;
      }
      const task = normalizeTask(rawTask);
      const claims = Array.isArray(claimsRes.data) ? claimsRes.data : [];
      const proposalCount = task.pendingReviewCount || claims.filter(item => Number(item.status) === 2).length;
      const materials = task.materials || [];

      this.setData({
        task,
        materials,
        proposalCount,
        showEditJimeng: false,
        editJimengLink: task.jimengLink || '',
        loading: false,
      });

    } catch (err) {
      wx.showToast({ title: err.message || '加载失败', icon: 'none' });
      this.setData({ loading: false });
    } finally {
      wx.hideLoading();
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) return;
    this.setData({ currentTab: tab });
  },

  goBack() {
    wx.navigateBack({
      fail: () => wx.switchTab({ url: '/pages/home/index' }),
    });
  },

  copyTaskId() {
    const taskId = this.data.task.id;
    if (!taskId) return;
    wx.setClipboardData({
      data: taskId,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  previewMaterial(e) {
    const { url, type } = e.currentTarget.dataset;
    if (!url) return;
    if (type === 'video') {
      wx.navigateTo({
        url: `/pages/video-player/index?url=${encodeURIComponent(url)}`,
      });
      return;
    }
    wx.previewImage({ urls: [url], current: url });
  },

  goToProposalReview() {
    const taskId = this.data.task.id;
    if (!taskId) return;
    wx.navigateTo({
      url: `/pages/employer/video-proposals/index?taskId=${taskId}`,
    });
  },

  playVideo() {
    const url = this.data.task.videoUrl;
    if (!url) return;
    wx.navigateTo({
      url: `/pages/video-player/index?url=${encodeURIComponent(url)}`,
    });
  },

  downloadAllMaterials() {
    if (!this.data.materials.length) {
      wx.showToast({ title: '暂无素材', icon: 'none' });
      return;
    }
    wx.showToast({ title: '下载能力待接入', icon: 'none' });
  },

  showJimengTutorial() {
    wx.navigateTo({ url: '/pages/employer/jimeng-tutorial/index' });
  },

  onJimengLinkInput(e) {
    this.setData({ editJimengLink: e.detail.value });
  },

  toggleEditJimeng() {
    const showEditJimeng = !this.data.showEditJimeng;
    this.setData({
      showEditJimeng,
      editJimengLink: showEditJimeng ? (this.data.task.jimengLink || '') : this.data.editJimengLink,
    });
  },

  async updateJimengLink() {
    const { task, editJimengLink } = this.data;
    if (!task.id) {
      wx.showToast({ title: '任务不存在', icon: 'none' });
      return;
    }
    if (!editJimengLink || editJimengLink.length < 10) {
      wx.showToast({ title: '请输入有效的邀请链接', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '更新中...' });
    try {
      await Api.updateTaskJimengLink(task.id, editJimengLink);
      wx.showToast({ title: '更新成功', icon: 'success' });
      this.setData({
        'task.jimengLink': editJimengLink,
        showEditJimeng: false,
      });
    } catch (err) {
      wx.showToast({ title: err.message || '更新失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },
});
