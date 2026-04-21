const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    // 卡片统计数据
    totalClaims: 0,       // 累计报名
    totalSubmitted: 0,   // 累计提交
    totalAdopted: 0,     // 累计采纳
    currentLevel: 0,      // 当前等级
    currentLevelName: '试用创作者',
    commissionRate: '10%', // 当前佣金
    reportCount: 0,       // 被举报次数
    reportWarning: false, // 举报预警（≥3次时显示）
    loading: false
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      app.silentLogin().then(() => {
        if (app.isLoggedIn()) {
          this.loadData();
        }
      });
      return;
    }
    this.loadData();
  },

  onShow() {
    if (app.isLoggedIn() && !this.data.loading) {
      this.loadData();
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await Promise.all([
        this.loadCreatorStats(),
        this.loadClaimsStats(),
        this.loadUserInfo()
      ]);
    } catch (err) {
      // ignore
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadCreatorStats() {
    try {
      const res = await Api.getCreatorStats();
      const stats = res.data || {};
      const levelNameMap = ['试用创作者', '新手创作者', '活跃创作者', '优质创作者', '金牌创作者', '特约创作者'];
      const commissionRates = ['10%', '10%', '10%', '5%', '5%', '3%'];
      this.setData({
        currentLevel: stats.level || 0,
        currentLevelName: levelNameMap[stats.level] || '试用创作者',
        commissionRate: commissionRates[stats.level] || '10%',
        totalAdopted: stats.adopted_count || 0
      });
    } catch (err) {
      // ignore
    }
  },

  async loadClaimsStats() {
    try {
      const res = await Api.getMyClaims({ page: 1 });
      const claims = res.data || [];
      const totalClaims = claims.length;
      // 累计提交: status >= 2 (待验收/已完成)
      const totalSubmitted = claims.filter(c => Number(c.status) >= 2).length;
      this.setData({
        totalClaims,
        totalSubmitted
      });
    } catch (err) {
      // ignore
    }
  },

  async loadUserInfo() {
    try {
      const res = await Api.getMe();
      const user = res.data || {};
      const reportCount = user.report_count || 0;
      this.setData({
        reportCount,
        reportWarning: reportCount >= 3  // 3次及以上显示预警
      });
    } catch (err) {
      // ignore
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});