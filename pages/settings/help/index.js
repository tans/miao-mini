Page({
  data: {
    quickLinks: [
      {
        title: '商家如何发布任务',
        desc: '填写标题、预算、数量和参考要求，审核通过后即可展示给创作者。'
      },
      {
        title: '创作者如何认领并提交',
        desc: '浏览任务详情后认领，在截止前完成作品并提交交付。'
      },
      {
        title: '收益在哪里查看',
        desc: '通过“我的任务”“我领取的任务”和“钱包/收益明细”跟踪进度与结算。'
      }
    ],
    levels: [
      { icon: '🪙', name: '青铜', dailyLimit: '3个', commission: '20%', margin: '冻结10元' },
      { icon: '🥈', name: '白银', dailyLimit: '10个', commission: '15%', margin: '无' },
      { icon: '🥇', name: '黄金', dailyLimit: '20个', commission: '12%', margin: '无' },
      { icon: '💎', name: '钻石', dailyLimit: '50个', commission: '10%', margin: '无' },
    ],
    rules: [
      '只有白银及以上等级才能认领任务',
      '青铜用户需要冻结10元保证金才能认领',
      '等级越高，每日可认领的任务数量越多，平台抽成越低',
      '等级由行为分（-1000~+2000）和交易分（0~500）综合决定',
    ],
    faqs: [
      {
        question: '任务完成后多久能看到收益？',
        answer: '作品审核通过后，收益会同步进入钱包余额和收益明细，便于继续提现或查看流水。'
      },
      {
        question: '商家和创作者是分开的账号吗？',
        answer: '不是。当前平台强调双角色协作，同一账号可按实际需求切换使用。'
      },
      {
        question: '遇到问题怎么联系平台？',
        answer: '可通过页面底部邮箱联系平台，说明账号、任务编号和问题描述，方便快速处理。'
      }
    ],
    contacts: [
      { label: '客服邮箱', value: 'support@chuangyimiao.com' },
      { label: '商务合作', value: 'business@chuangyimiao.com' },
    ]
  },
});
