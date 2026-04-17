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
      { icon: '🪙', name: '试用创作者', condition: '0', dailyLimit: '3条', commission: '10%' },
      { icon: '📝', name: '新手创作者', condition: '≥1', dailyLimit: '8条', commission: '10%' },
      { icon: '🌟', name: '活跃创作者', condition: '≥5', dailyLimit: '15条', commission: '10%' },
      { icon: '🏅', name: '优质创作者', condition: '≥20', dailyLimit: '30条', commission: '10%' },
      { icon: '👑', name: '金牌创作者', condition: '≥50', dailyLimit: '50条', commission: '5%' },
      { icon: '💎', name: '特约创作者', condition: '≥100', dailyLimit: '无上限', commission: '3%' },
    ],
    rules: [
      '等级由累计采纳数（作品被商家录用/入围次数）自动升级',
      '等级越高，每日可投稿的任务数量越多，平台抽成越低',
      '超过5次恶意投稿被投诉将永久封禁投稿权限',
      '正常质量不佳、未中标、风格不符等非恶意情况，不降级、不处罚',
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
