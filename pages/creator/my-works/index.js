const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');
const app = getApp();

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '审核中' },
  { key: 'adopted', label: '已采纳' },
  { key: 'rejected', label: '未采纳' },
  { key: 'reported', label: '被举报' }
];

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

Page({
  data: {
    works: [],
    filteredWorks: [],
    activeFilter: 'all',
    filters: FILTERS,
    loading: false,
    currentFilter: 'all'
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) this.loadWorks();
      });
      return;
    }
    this.loadWorks();
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadWorks();
    }
  },

  onPullDownRefresh() {
    this.loadWorks().finally(() => wx.stopPullDownRefresh());
  },

  async loadWorks() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    try {
      const res = await Api.getMyClaims({ page: 1 });
      const claims = res.data || [];
      // 筛选已提交的作品，保留退回/举报这类已处理记录
      const submittedWorks = claims
        .filter(c => Number(c.status) >= 2 || Number(c.review_result || c.reviewResult || 0) > 0)
        .map(c => this.formatWork(c));
      this.setData({ works: submittedWorks, loading: false });
      this.applyFilter(this.data.currentFilter);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  formatWork(claim) {
    const status = Number(claim.status);
    const reviewResult = Number(claim.review_result || claim.reviewResult || 0);
    const materials = Array.isArray(claim.materials) ? claim.materials : [];
    const imageMaterials = materials.filter(m => m.file_type === 'image');
    const videoMaterials = materials.filter(m => m.file_type === 'video');

    const firstMaterial = materials[0] || {};
    const coverType = firstMaterial.file_type || 'image';
    const displayCover = coverType === 'video'
      ? (firstMaterial.thumbnail_path || firstMaterial.file_path || '')
      : (firstMaterial.thumbnail_path || firstMaterial.file_path || '');
    const previewVideoSrc = firstMaterial.file_path || '';
    const processStatus = firstMaterial.process_status || (coverType === 'video' && !previewVideoSrc ? 'processing' : '');
    const processStatusText = coverType !== 'video'
      ? ''
      : processStatus === 'failed'
        ? '视频处理失败'
        : processStatus && processStatus !== 'done'
          ? '压缩加水印处理中'
          : '';

    let incomeLabel = '';
    let incomeText = '';
    let rejectReason = '';
    let reportReason = '';

    if (status === 1 && reviewResult === 2) {
      incomeLabel = '收入(已退回，可重提)';
      incomeText = '¥0';
      rejectReason = claim.review_comment || claim.reviewComment || '';
    } else if (status === 1 && reviewResult === 3) {
      incomeLabel = '收入(被举报)';
      incomeText = '¥0';
      reportReason = claim.review_comment || claim.reviewComment || '';
    } else if (status === 2) {
      // 待验收/审核中
      incomeLabel = '收入(审核超时自动补发参与金)';
      incomeText = '¥5';
    } else if (status === 3) {
      // 已采纳
      incomeLabel = '收入(采纳金+参与金)';
      incomeText = `¥${claim.unit_price || 0} + ¥${claim.award_price || 0}`;
    } else if (status === 5) {
      // 已拒绝/未采纳
      incomeLabel = '收入(参与金)';
      incomeText = '¥5';
      rejectReason = claim.reject_reason || '品牌露出不足，镜头切换节奏不符合要求。';
    } else if (status === 6) {
      // 被举报
      reportReason = claim.report_reason || '涉嫌敏感词、低俗内容、侵权内容、政治敏感、广告夸大。';
    }

    return {
      id: claim.id,
      task_id: claim.task_id,
      task_title: claim.task_title || '任务' + claim.task_id,
      title: claim.title || '',
      content: claim.content || '',
      status,
      reviewResult,
      statusText: this.getStatusText(status, reviewResult),
      statusClass: this.getStatusClass(status, reviewResult),
      filterKey: this.getFilterKey(status, reviewResult),
      previewImages: imageMaterials.map(m => m.file_path),
      previewVideos: videoMaterials.map(m => ({
        url: m.file_path,
        poster: m.thumbnail_path || ''
      })),
      submittedAt: formatDateTime(claim.submitted_at || claim.updated_at || ''),
      unit_price: Number(claim.unit_price || 0) || 0,
      award_price: Number(claim.award_price || 0) || 0,
      displayCover,
      isVideo: coverType === 'video',
      previewVideoSrc,
      thumbnail: firstMaterial.thumbnail_path || '',
      processStatus,
      processStatusText,
      incomeLabel,
      incomeText,
      rejectReason,
      reportReason
    };
  },

  getStatusText(status, reviewResult = 0) {
    if (status === 1 && reviewResult === 2) return '已退回';
    if (status === 1 && reviewResult === 3) return '已举报';
    const map = {
      2: '商家审核中',
      3: '已采纳',
      4: '商家审核超时',
      5: '已淘汰',
      6: '被举报'
    };
    return map[status] || '未知';
  },

  getStatusClass(status, reviewResult = 0) {
    if (status === 1 && reviewResult === 2) return 'rejected';
    if (status === 1 && reviewResult === 3) return 'reported';
    const map = {
      2: 'pending',
      3: 'adopted',
      4: 'timeout',
      5: 'rejected',
      6: 'reported'
    };
    return map[status] || 'draft';
  },

  getFilterKey(status, reviewResult = 0) {
    if (status === 1 && reviewResult === 2) return 'rejected';
    if (status === 1 && reviewResult === 3) return 'reported';
    if (status === 2) return 'pending';
    if (status === 3) return 'adopted';
    if (status === 5) return 'rejected';
    if (status === 6) return 'reported';
    return 'all';
  },

  switchFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ currentFilter: filter });
    this.applyFilter(filter);
  },

  applyFilter(filter) {
    const filteredWorks = filter === 'all'
      ? this.data.works
      : this.data.works.filter(item => item.filterKey === filter);
    this.setData({ activeFilter: filter, filteredWorks });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  goTaskDetail(e) {
    const taskId = e.currentTarget.dataset.taskId;
    if (taskId) {
      wx.navigateTo({ url: `/pages/creator/task-detail/index?id=${taskId}` });
    }
  },

  goWorkDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (id) {
      const work = this.data.filteredWorks.find(w => w.id === id) || {};
      if (work.isVideo && !work.previewVideoSrc) {
        wx.showToast({ title: work.processStatusText || '视频处理中', icon: 'none' });
        return;
      }
      // 使用 storage 传递，避免 URL 长度超限
      wx.setStorageSync(`work_preview_${id}`, work);
      wx.navigateTo({ url: `/pages/work-preview/index?id=${id}` });
    }
  },

  previewImages(e) {
    const { index } = e.currentTarget.dataset;
    const work = this.data.filteredWorks[Number(index)];
    const images = work && work.previewImages || [];
    if (images.length === 0) return;
    wx.previewImage({ current: images[0], urls: images });
  }
});
