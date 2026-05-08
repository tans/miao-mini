const config = require('./config.js');

function fallbackToPhone() {
  const phone = String(config.customerServicePhone || '').trim();
  if (!phone) {
    wx.showToast({
      title: '客服暂不可用',
      icon: 'none',
    });
    return;
  }

  wx.showModal({
    title: '暂时无法打开在线客服',
    content: `请拨打客服热线：${phone}`,
    confirmText: '拨打电话',
    success: (res) => {
      if (res.confirm) {
        wx.makePhoneCall({
          phoneNumber: phone,
          fail: () => {
            wx.showToast({
              title: `请拨打客服热线：${phone}`,
              icon: 'none',
            });
          },
        });
      }
    },
  });
}

function openCustomerServiceChat(options = {}) {
  const url = String(config.customerServiceKfUrl || '').trim();
  const sessionFrom = String(options.sessionFrom || '').trim();
  const showMessageCard = options.showMessageCard !== false;
  const sendMessageTitle = String(options.sendMessageTitle || '创意喵客服咨询').trim();

  if (!url) {
    fallbackToPhone();
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
    extInfo,
    success: () => {},
    fail: (err) => {
      console.warn('[customer-service] open chat failed', err);
      fallbackToPhone();
    },
  });
}

module.exports = {
  openCustomerServiceChat,
  fallbackToPhone,
};
