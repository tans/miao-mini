const config = require('./config.js');

function showUnavailableToast() {
  wx.showToast({
    title: '暂时无法打开在线客服',
    icon: 'none',
  });
}

function openCustomerServiceChat(options = {}) {
  const url = String(config.customerServiceKfUrl || '').trim();
  const corpId = String(config.customerServiceCorpId || '').trim();
  const sessionFrom = String(options.sessionFrom || '').trim();
  const showMessageCard = options.showMessageCard !== false;
  const sendMessageTitle = String(options.sendMessageTitle || '创意喵客服咨询').trim();

  if (!url || !corpId) {
    showUnavailableToast();
    return;
  }

  const extInfo = { url };
  if (sessionFrom) {
    extInfo.sessionFrom = sessionFrom;
  }
  if (showMessageCard) {
    extInfo.showMessageCard = true;
    extInfo.sendMessageTitle = sendMessageTitle;
  }

  wx.openCustomerServiceChat({
    corpId,
    extInfo,
    success: () => {},
    fail: (err) => {
      console.warn('[customer-service] open chat failed', err);
      showUnavailableToast();
    },
  });
}

module.exports = {
  openCustomerServiceChat,
  showUnavailableToast,
};
