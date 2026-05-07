const Api = require('../../../utils/api.js');
const { formatDateTime } = require('../../../utils/util.js');
const app = getApp();

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '商家审核中' },
  { key: 'adopted', label: '已采纳' },
  { key: 'rejected', label: '已淘汰' },
  { key: 'reported', label: '被举报' }
];

function formatMoney(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function getClaimReward(claim = {}) {
  const reward = toFiniteNumber(pick(
    claim.creator_reward,
    claim.creatorReward,
    claim.reward,
    claim.income,
    claim.settlement_amount,
    claim.settlementAmount
  ));
  return reward > 0 ? reward : 0;
}

function getVideoMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'video') || null;
}

function getImageMaterial(materials = []) {
  return materials.find((item) => item.file_type === 'image') || null;
}

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function buildClaimIncomeMap(transactions = []) {
  return transactions.reduce((map, tx) => {
    const relatedId = pick(tx.related_id, tx.relatedId, tx.claim_id, tx.claimId);
    if (!relatedId) return map;

    const typeCode = String(pick(tx.type_code, tx.typeCode, '')).toLowerCase();
    const type = Number(pick(tx.type, 0)) || 0;
    const typeText = String(pick(tx.type_str, tx.typeText, tx.remark, ''));
    const isClaimIncome =
      type === 5 ||
      type === 9 ||
      type === 10 ||
      typeCode === 'task_reward' ||
      typeCode === 'participation_payment' ||
      typeCode === 'award_payment' ||
      typeText.indexOf('参与') >= 0 ||
      typeText.indexOf('采纳') >= 0 ||
      typeText.indexOf('基础奖励') >= 0 ||
      typeText.indexOf('自动通过') >= 0 ||
      typeText.indexOf('任务通过结算') >= 0;

    const amount = toFiniteNumber(pick(tx.amount, tx.raw_amount, 0));
    if (!isClaimIncome || amount <= 0) return map;

    const key = String(relatedId);
    map[key] = (map[key] || 0) + amount;
    return map;
  }, {});
}

function getSettledIncome(claim = {}, claimIncomeMap = {}) {
  const claimId = pick(claim.id, claim.claim_id, claim.claimId);
  const transactionIncome = claimId ? toFiniteNumber(claimIncomeMap[String(claimId)]) : 0;
  if (transactionIncome > 0) return transactionIncome;

  const claimReward = getClaimReward(claim);
  if (claimReward > 0) return claimReward;

  return 0;
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
    this.initialized = false;
  },

  onShow() {
    this.bootstrap();
  },

  onPullDownRefresh() {
    this.bootstrap(true).finally(() => wx.stopPullDownRefresh());
  },

  async bootstrap(force = false) {
    if (this.initialized && !force) return;
    if (!app.isLoggedIn()) {
      await app.silentLogin();
      if (!app.isLoggedIn()) return;
    }
    this.initialized = true;
    await this.loadWorks();
  },

  async loadWorks() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.showLoading({ title: '加载中...' });

    try {
      const [claimsRes, transRes] = await Promise.all([
        Api.getMyClaims({ page: 1 }),
        Api.getTransactions({ page: 1, limit: 100 }).catch(() => ({ data: { data: [] } }))
      ]);
      const transData = transRes.data || {};
      const transactions = Array.isArray(transData.data)
        ? transData.data
        : Array.isArray(transData.transactions)
          ? transData.transactions
          : [];
      const claimIncomeMap = buildClaimIncomeMap(transactions);
      const claims = claimsRes.data || [];
      // 筛选已提交的作品，保留淘汰/举报这类已处理记录
      const submittedWorks = claims
        .filter(c => Number(c.status) >= 2 || Number(c.review_result || c.reviewResult || 0) > 0)
        .map(c => this.formatWork(c, claimIncomeMap));
      this.setData({ works: submittedWorks, loading: false });
      this.applyFilter(this.data.currentFilter);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  formatWork(claim, claimIncomeMap = {}) {
    const status = Number(claim.status);
    const reviewResult = Number(claim.review_result || claim.reviewResult || 0);
    const settledIncome = getSettledIncome(claim, claimIncomeMap);
    const materials = Array.isArray(claim.materials) ? claim.materials : [];
    const imageMaterials = materials.filter(m => m.file_type === 'image');
    const videoMaterials = materials.filter(m => m.file_type === 'video');

    const firstMaterial = materials[0] || {};
    const firstVideoMaterial = getVideoMaterial(materials);
    const firstImageMaterial = getImageMaterial(materials);
    const coverType = firstVideoMaterial ? 'video' : (firstImageMaterial ? 'image' : (firstMaterial.file_type || 'image'));
    const displayCover = coverType === 'video'
      ? Api.getDisplayUrl(
        (firstVideoMaterial && (firstVideoMaterial.thumbnail_path || firstVideoMaterial.poster_url)) || ''
      )
      : Api.getDisplayUrl(
        (firstImageMaterial && (firstImageMaterial.thumbnail_path || firstImageMaterial.file_path)) ||
        firstMaterial.thumbnail_path ||
        firstMaterial.file_path ||
        ''
      );
    const previewVideoSrc = Api.getPlayableUrl(
      (firstVideoMaterial && (
        firstVideoMaterial.previewUrl ||
        firstVideoMaterial.file_path ||
        firstVideoMaterial.processed_file_path
      )) || ''
    );
    const processStatus = (firstVideoMaterial && firstVideoMaterial.process_status) || (coverType === 'video' && !previewVideoSrc ? 'processing' : '');
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
      incomeLabel = '收入(参与金)';
      incomeText = `¥${formatMoney(settledIncome || claim.unit_price || 0)}`;
      rejectReason = claim.review_comment || claim.reviewComment || '';
    } else if (status === 1 && reviewResult === 3) {
      incomeLabel = '被举报作品无奖金';
      incomeText = '¥0';
      reportReason = claim.review_comment || claim.reviewComment || '';
    } else if (status === 2) {
      // 待验收/审核中
      incomeLabel = '收入(参与金)';
      incomeText = `¥${formatMoney(settledIncome)}`;
    } else if (status === 3) {
      // 已采纳
      incomeLabel = '收入(采纳金+参与金)';
      incomeText = `¥${formatMoney(settledIncome)}`;
    } else if (status === 4) {
      // 审核超时自动发参与奖
      incomeLabel = '收入(审核超时自动补发参与金)';
      incomeText = `¥${formatMoney(settledIncome || claim.unit_price || 0)}`;
    } else if (status === 5) {
      // 已超时
      incomeLabel = '收入(已超时)';
      incomeText = '¥0';
    } else if (status === 6) {
      // 被举报
      reportReason = claim.report_reason || '涉嫌敏感词、低俗内容、侵权内容、政治敏感、广告夸大。';
    }

    let tipsVariant = '';
    let tipsIcon = '';
    let tipsTitle = '';
    let tipsDesc = '';
    if (status === 2) {
      tipsVariant = 'pending';
      tipsIcon = '../../../images/icon/clock.png';
      tipsTitle = '已提交作品，等待审核结果';
      tipsDesc = '预计审核时间：72小时内';
    } else if (status === 4) {
      tipsVariant = 'timeout';
      tipsIcon = '../../../images/icon/alert-circle.png';
      tipsTitle = '商家审核超时，自动发放参与奖';
      tipsDesc = '之后商家如果采纳了您的稿件，您依然可以获得采纳金。';
    } else if (status === 5) {
      tipsVariant = 'rejected';
      tipsIcon = '../../../images/icon/frown.png';
      tipsTitle = '任务已超时';
      tipsDesc = '该稿件未在约定期限内完成流程，暂无奖励。';
    } else if (status === 1 && reviewResult === 2) {
      tipsVariant = 'rejected';
      tipsIcon = '../../../images/icon/frown.png';
      tipsTitle = '很遗憾，此视频未能入选';
      tipsDesc = rejectReason ? `淘汰原因：${rejectReason}` : '淘汰原因：暂无说明';
    } else if (status === 3) {
      tipsVariant = 'adopted';
      tipsIcon = '../../../images/icon/smile.png';
      tipsTitle = '恭喜你！作品已被商家采纳';
      tipsDesc = '商家付费采纳了此稿件，该视频版权归属商家。';
    } else if ((status === 1 && reviewResult === 3) || status === 6) {
      tipsVariant = 'reported';
      tipsIcon = '../../../images/icon/alert-triangle.png';
      tipsTitle = '此视频已被举报，如有异议请尽快申诉';
      tipsDesc = reportReason ? `被举报原因：${reportReason}` : '被举报原因：涉嫌敏感词、低俗内容、侵权内容、政治敏感、广告夸大。';
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
      previewImages: imageMaterials.map(m => Api.getDisplayUrl(m.file_path)).filter(Boolean),
      previewVideos: videoMaterials.map(m => ({
        url: Api.getPlayableUrl(m.previewUrl || m.file_path || m.processed_file_path || ''),
        poster: Api.getDisplayUrl(m.thumbnail_path || '')
      })).filter(item => item.url),
      submittedAt: formatDateTime(claim.submitted_at || claim.updated_at || ''),
      unit_price: Number(claim.unit_price || 0) || 0,
      award_price: Number(claim.award_price || 0) || 0,
      displayCover,
      isVideo: coverType === 'video',
      previewVideoSrc,
      thumbnail: Api.getDisplayUrl((firstVideoMaterial && firstVideoMaterial.thumbnail_path) || firstMaterial.thumbnail_path || ''),
      processStatus,
      processStatusText,
      incomeLabel,
      incomeText,
      rejectReason,
      reportReason,
      tipsVariant,
      tipsIcon,
      tipsTitle,
      tipsDesc
    };
  },

  getStatusText(status, reviewResult = 0) {
    if (status === 1 && reviewResult === 2) return '已淘汰';
    if (status === 1 && reviewResult === 3) return '已举报';
    const map = {
      2: '商家审核中',
      3: '已采纳',
      4: '商家审核超时',
      5: '已超时',
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
      5: 'timeout',
      6: 'reported'
    };
    return map[status] || 'draft';
  },

  getFilterKey(status, reviewResult = 0) {
    if (status === 1 && reviewResult === 2) return 'rejected';
    if (status === 1 && reviewResult === 3) return 'reported';
    if (status === 2) return 'pending';
    if (status === 3) return 'adopted';
    if (status === 5) return 'all';
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
      wx.navigateTo({ url: `/pages/video-player/index?id=${id}` });
    }
  },

  previewImages(e) {
    const { index } = e.currentTarget.dataset;
    const work = this.data.filteredWorks[Number(index)];
    const images = work && work.previewImages || [];
    if (images.length === 0) return;
    wx.previewImage({ current: images[0], urls: images });
  },

  goAppeal(e) {
    const claimId = e.currentTarget.dataset.claimId;
    if (!claimId) return;
    wx.navigateTo({ url: `/pages/mine/appeal/index?claimId=${encodeURIComponent(claimId)}` });
  },
});
