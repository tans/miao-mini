const config = require('./config.js');

const BUSINESS_TEMPLATE_KEYS = [
  'pendingReview',
  'reviewResult',
  'appealResult',
  'taskStatus',
];
const MAX_REQUEST_TEMPLATE_COUNT = 5;

function getSubscribeTemplates() {
  return config.subscribeTemplates || {};
}

function getTemplateIds(keys = BUSINESS_TEMPLATE_KEYS) {
  const templates = getSubscribeTemplates();
  const seen = {};
  return keys
    .map((key) => String(templates[key] || '').trim())
    .filter((id) => {
      if (!id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
}

function hasBusinessNotifyTemplates() {
  return getTemplateIds(BUSINESS_TEMPLATE_KEYS).length > 0;
}

function isAccepted(value) {
  return value === 'accept' || value === 'acceptWithAudio' || value === 'acceptWithAlert';
}

function requestSubscribe(keys = BUSINESS_TEMPLATE_KEYS) {
  const tmplIds = getTemplateIds(keys).slice(0, MAX_REQUEST_TEMPLATE_COUNT);
  if (!tmplIds.length) {
    wx.showToast({ title: '消息模板未配置', icon: 'none' });
    return Promise.resolve({ accepted: [], rejected: [], raw: null });
  }
  if (!wx.requestSubscribeMessage) {
    wx.showToast({ title: '当前微信版本不支持订阅消息', icon: 'none' });
    return Promise.resolve({ accepted: [], rejected: tmplIds, raw: null });
  }

  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success(res) {
        const accepted = tmplIds.filter((id) => isAccepted(res[id]));
        const rejected = tmplIds.filter((id) => !isAccepted(res[id]));
        resolve({ accepted, rejected, raw: res });
      },
      fail(err) {
        wx.showToast({ title: '未能打开通知授权', icon: 'none' });
        resolve({ accepted: [], rejected: tmplIds, raw: err });
      },
    });
  });
}

function requestBusinessNotifications() {
  return requestSubscribe(BUSINESS_TEMPLATE_KEYS);
}

function checkSubscriptionBlocked() {
  return new Promise((resolve) => {
    if (!wx.getSetting) {
      resolve({ mainSwitch: true, blockedTemplates: [] });
      return;
    }
    wx.getSetting({
      withSubscriptions: true,
      success(res) {
        const subSetting = res.subscriptionsSetting || {};
        const mainSwitch = subSetting.mainSwitch !== false;
        const itemSettings = subSetting.itemSettings || {};
        const templates = getSubscribeTemplates();
        const blockedTemplates = BUSINESS_TEMPLATE_KEYS.filter((key) => {
          const tid = String(templates[key] || '').trim();
          return tid && itemSettings[tid] === 'reject';
        });
        resolve({ mainSwitch, blockedTemplates });
      },
      fail() {
        resolve({ mainSwitch: true, blockedTemplates: [] });
      },
    });
  });
}

module.exports = {
  getTemplateIds,
  hasBusinessNotifyTemplates,
  checkSubscriptionBlocked,
  requestBusinessNotifications,
  requestSubscribe,
};
