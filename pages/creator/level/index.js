Page({
  data: {
    levels: [
      {
        icon: '🪙',
        name: '试用创作者',
        level: 0,
        condition: '0',
        dailyLimit: '3条',
        commission: '10%',
        privileges: ['每日投稿3条']
      },
      {
        icon: '📝',
        name: '新手创作者',
        level: 1,
        condition: '≥3',
        dailyLimit: '8条',
        commission: '10%',
        privileges: ['每日投稿8条', '升级后解锁更多权益']
      },
      {
        icon: '🌟',
        name: '活跃创作者',
        level: 2,
        condition: '≥10',
        dailyLimit: '15条',
        commission: '10%',
        privileges: ['每日投稿15条', '享有平台推荐优先权']
      },
      {
        icon: '🏅',
        name: '优质创作者',
        level: 3,
        condition: '≥30',
        dailyLimit: '30条',
        commission: '10%',
        privileges: ['每日投稿30条', '高质量任务优先推送']
      },
      {
        icon: '👑',
        name: '金牌创作者',
        level: 4,
        condition: '≥80',
        dailyLimit: '50条',
        commission: '5%',
        privileges: ['每日投稿50条', '高佣金低抽成', '专属高价任务']
      },
      {
        icon: '💎',
        name: '特约创作者',
        level: 5,
        condition: '≥200',
        dailyLimit: '无上限',
        commission: '3%',
        privileges: ['投稿无上限', '最低佣金3%', '专属客服通道', '定向约稿特权']
      }
    ],
    currentLevel: 0,
    currentAdoptedCount: 0,
    totalClaims: 0,
    totalSubmitted: 0,
    totalIncomeDisplay: '0.00'
  },

  onLoad(options) {
    const level = Number(options.level);
    const adoptedCount = Number(options.adopted_count);
    if (!Number.isNaN(level)) {
      this.setData({
        currentLevel: level,
        currentAdoptedCount: Number.isNaN(adoptedCount) ? 0 : adoptedCount
      });
    }
  },

  onShow() {
    this.loadPageData();
  },

  onPullDownRefresh() {
    this.loadPageData().finally(() => wx.stopPullDownRefresh());
  },

  async loadPageData() {
    const Api = require('../../../utils/api.js');
    try {
      const [creatorStatsResult, claimsResult] = await Promise.all([
        Api.getCreatorStats(),
        Api.getMyClaims({ page: 1, limit: 1000 })
      ]);

      const stats = creatorStatsResult.data || {};
      const claims = Array.isArray(claimsResult.data) ? claimsResult.data : [];
      const level = Number(stats.level || 0);
      const totalClaims = Number(stats.total_claims != null ? stats.total_claims : claims.length);
      const totalSubmitted = Number(stats.total_submitted != null
        ? stats.total_submitted
        : claims.filter((claim) => Number(claim && claim.status) >= 2).length);
      const totalIncome = Number(stats.total_income || 0);

      this.setData({
        currentLevel: level,
        currentAdoptedCount: Number(stats.adopted_count || 0),
        totalClaims,
        totalSubmitted,
        totalIncomeDisplay: totalIncome.toFixed(1)
      });
    } catch (err) {
      // ignore
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
