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
        condition: '≥1',
        dailyLimit: '8条',
        commission: '10%',
        privileges: ['每日投稿8条', '升级后解锁更多权益']
      },
      {
        icon: '🌟',
        name: '活跃创作者',
        level: 2,
        condition: '≥5',
        dailyLimit: '15条',
        commission: '10%',
        privileges: ['每日投稿15条', '享有平台推荐优先权']
      },
      {
        icon: '🏅',
        name: '优质创作者',
        level: 3,
        condition: '≥20',
        dailyLimit: '30条',
        commission: '10%',
        privileges: ['每日投稿30条', '高质量任务优先推送']
      },
      {
        icon: '👑',
        name: '金牌创作者',
        level: 4,
        condition: '≥50',
        dailyLimit: '50条',
        commission: '5%',
        privileges: ['每日投稿50条', '高佣金低抽成', '专属高价任务']
      },
      {
        icon: '💎',
        name: '特约创作者',
        level: 5,
        condition: '≥100',
        dailyLimit: '无上限',
        commission: '3%',
        privileges: ['投稿无上限', '最低佣金3%', '专属客服通道', '定向约稿特权']
      }
    ],
    currentLevel: 0,
    currentAdoptedCount: 0
  },

  onLoad(options) {
    const { level, adopted_count } = options;
    if (level !== undefined) {
      this.setData({ currentLevel: parseInt(level), currentAdoptedCount: parseInt(adopted_count) || 0 });
    }
  },

  onShow() {
    this.loadCreatorStats();
  },

  async loadCreatorStats() {
    const Api = require('../../utils/api.js');
    const app = getApp();
    try {
      const res = await Api.getCreatorStats();
      const stats = res.data || {};
      const level = stats.level || 0;
      this.setData({
        currentLevel: level,
        currentAdoptedCount: stats.adopted_count || 0
      });
    } catch (err) {
      // ignore
    }
  }
});