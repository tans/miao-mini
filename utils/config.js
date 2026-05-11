// 创意喵 - 小程序配置文件
// 后端地址按小程序 AppID 自动选择，上传脚本不再改写此文件。
const DEFAULT_APPID = 'wx902124d67fa60b0e';

const EMPTY_SUBSCRIBE_TEMPLATES = {
  pendingReview: '',
  reviewResult: '',
  appealResult: '',
  taskStatus: '',
};

const appConfigs = {
  wx902124d67fa60b0e: {
    apiBase: 'https://miao-test.clawos.cc/api/v1',
    subscribeTemplates: {
      pendingReview: 'oQ6nLdG2Ntb5Om6Vfc9j8eWeUDoXRj2tcTHB5hG2Mzw',
      reviewResult: '8nQFpp2iXI83mCGsiTNWrcTCJ2PT1kkfBvK9CWnR13A',
      appealResult: '',
      taskStatus: '',
    },
  },
  wx4a1a4cedce98a1ac: {
    apiBase: 'https://miao.jisuhudong.com/api/v1',
    subscribeTemplates: {
      pendingReview: 'Nh9dx1Fs5CTfWJUls0iTt2NzpIaJOmIz7EbhdTIjuEE',
      reviewResult: '78UAV64JZ-zlNklvKsXPnK6XZPCvHCXVwuDAJcBSihQ',
      appealResult: '',
      taskStatus: '',
    },
  },
};

function getCurrentAppId() {
  if (typeof wx === 'undefined' || !wx.getAccountInfoSync) {
    return DEFAULT_APPID;
  }

  try {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo && accountInfo.miniProgram && accountInfo.miniProgram.appId || DEFAULT_APPID;
  } catch (e) {
    return DEFAULT_APPID;
  }
}

function getAppConfig(appid) {
  const appidKey = appid || getCurrentAppId();
  return appConfigs[appidKey] || appConfigs[DEFAULT_APPID];
}

const currentConfig = getAppConfig();

module.exports = {
  appConfigs,
  currentAppId: getCurrentAppId(),
  defaultAppId: DEFAULT_APPID,
  getAppConfig,
  getCurrentAppId,
  apiBase: currentConfig.apiBase,
  subscribeTemplates: currentConfig.subscribeTemplates || EMPTY_SUBSCRIBE_TEMPLATES,

  // 企业微信客服链接
  customerServiceKfUrl: 'https://work.weixin.qq.com/kfid/kfc3919d20f9b916edb',
};
