const config = require('../../../utils/config.js');

const helpContent = {
  creator: {
    title: '创作者指南',
    icon: '/assets/icons/help-creator.png',
    sections: [
      {
        title: '如何接任务',
        content: '1. 在首页或灵感广场浏览感兴趣的任务\n2. 点击任务详情，了解任务要求、奖励金额和截稿时间\n3. 点击"立即报名"按钮报名参与任务\n4. 报名后可在任务详情页查看即梦合拍链接和商家素材'
      },
      {
        title: '如何提交作品',
        content: '1. 报名成功后，点击"上传稿件"按钮\n2. 拍摄或制作符合任务要求的视频\n3. 视频需满足：竖屏9:16、1080P、时长30秒内\n4. 上传视频并确认提交\n5. 提交后等待商家审核，审核结果将通知您'
      },
      {
        title: '奖励规则',
        content: '• 采纳奖励：作品被商家审核通过后获得\n• 参与奖励：按时提交符合基本要求的作品即可获得\n• 提现：奖励进入钱包后可直接提现到微信钱包'
      },
      {
        title: '注意事项',
        content: '• 请确保作品为原创，避免侵权\n• 不要提交与任务无关的内容\n• 遵守平台规范，作品不得包含敏感词、低俗内容\n• 被有效举报超过5次将永久封号'
      }
    ]
  },
  merchant: {
    title: '商家指南',
    icon: '/assets/icons/help-merchant.png',
    sections: [
      {
        title: '如何发布任务',
        content: '1. 进入个人中心或首页点击"发布任务"\n2. 填写任务标题、描述、奖励金额、视频规格等\n3. 上传参考素材（如有）\n4. 设置截稿时间并发布'
      },
      {
        title: '如何审核作品',
        content: '1. 进入"我的任务"，查看收到的投稿\n2. 点击投稿查看视频内容\n3. 可点击"采纳"通过或"拒绝"不通过\n4. 如发现违规内容可点击"举报"\n5. 采纳后任务奖励将自动结算给创作者'
      },
      {
        title: '费用结算',
        content: '• 任务费用将在投稿被采纳后自动扣除\n• 充值支持微信支付，实时到账\n• 可查看钱包明细了解资金流水'
      },
      {
        title: '注意事项',
        content: '• 发布任务需缴纳保证金（已托管资金）\n• 请明确任务要求，避免争议\n• 及时审核投稿，创作者较重视截稿时间\n• 遵守平台规范，不得发布违规需求'
      }
    ]
  },
  wallet: {
    title: '钱包与提现',
    icon: '/assets/icons/help-wallet.png',
    sections: [
      {
        title: '如何充值',
        content: '1. 进入"我的"-钱包\n2. 点击"充值"按钮\n3. 选择或输入充值金额\n4. 使用微信支付完成付款\n5. 充值成功后余额将即时到账'
      },
      {
        title: '如何提现',
        content: '1. 进入"我的"-钱包\n2. 点击"提现"按钮\n3. 输入提现金额（最低10元）\n4. 确认提现到微信钱包\n5. 提现申请审核后将在24小时内到账'
      },
      {
        title: '提现规则',
        content: '• 最低提现金额：10元\n• 提现手续费：0%（平台补贴）\n• 到账时间：24小时内\n• 每日提现次数限制：3次'
      },
      {
        title: '常见问题',
        content: 'Q: 提现失败怎么办？\nA: 请检查微信钱包是否实名认证，或联系客服处理\n\nQ: 余额可以退回吗？\nA: 充值余额可以退还，请联系客服申请退款'
      }
    ]
  },
  common: {
    title: '常见问题',
    icon: '/assets/icons/help-common.png',
    sections: [
      {
        title: '账号与登录',
        content: 'Q: 如何登录？\nA: 小程序启动后自动通过微信授权登录，无需额外操作\n\nQ: 如何修改个人信息？\nA: 进入"我的"-个人资料，可修改昵称和头像'
      },
      {
        title: '认证相关',
        content: 'Q: 什么是商家认证？\nA: 商家认证用于展示企业标志和认证状态，帮助提升账号可信度\n\nQ: 认证需要多久？\nA: 提交认证后，平台将在1-3个工作日内完成审核'
      },
      {
        title: '申诉与反馈',
        content: `Q: 对审核结果有异议怎么办？\nA: 可以在任务详情页点击"申诉"按钮，提交申诉理由和证据，平台将在2个工作日内处理\n\nQ: 如何联系客服？\nA: 在帮助中心页面点击"联系客服"按钮，或拨打客服热线：${config.customerServicePhone}`
      }
    ]
  }
};

Page({
  data: {
    type: '',
    content: null,
    title: ''
  },

  onLoad(options) {
    if (options.type && helpContent[options.type]) {
      const type = options.type;
      this.setData({
        type,
        content: helpContent[type],
        title: helpContent[type].title
      });
    } else {
      wx.showToast({ title: '内容不存在', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});
