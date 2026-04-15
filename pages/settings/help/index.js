const app = getApp();

Page({
  data: {
    levels: [
      { icon: '🪙', name: '青铜', dailyLimit: 3, commission: '20%', needMargin: true, margin: '冻结10元' },
      { icon: '🥈', name: '白银', dailyLimit: 10, commission: '15%', needMargin: false, margin: '无' },
      { icon: '🥇', name: '黄金', dailyLimit: 20, commission: '12%', needMargin: false, margin: '无' },
      { icon: '💎', name: '钻石', dailyLimit: 50, commission: '10%', needMargin: false, margin: '无' },
    ],
    rules: [
      '只有白银及以上等级才能认领任务',
      '青铜用户需要冻结10元保证金才能认领',
      '等级由行为分（-1000~+2000）和交易分（0~500）综合决定',
      '等级越高，每日可认领的任务数量越多，平台抽成越低',
    ]
  },

  goBack() {
    wx.navigateBack();
  },
});