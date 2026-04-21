const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    status: 'uncertified', // uncertified, pending, certified
    companyName: '',
    contactName: '',
    contactPhone: '',
    licenseUrl: '',
    statusIcon: 'icon-uncertified',
    statusIconText: '未认证',
    statusTitle: '您尚未完成商家认证',
    statusDesc: '完成认证后可发布任务、享受更多权益'
  },

  onLoad() {
    this.loadAuthStatus();
  },

  loadAuthStatus() {
    Api.getMerchantAuthStatus().then(res => {
      const data = res.data || {};
      this.setData({
        status: data.status || 'uncertified',
        companyName: data.company_name || '',
        contactName: data.contact_name || '',
        contactPhone: data.contact_phone || '',
        licenseUrl: data.license_url || ''
      });
      this._updateStatusUI(data.status);
    }).catch(err => {
      console.error('获取认证状态失败', err);
    });
  },

  _updateStatusUI(status) {
    const statusMap = {
      certified: { icon: 'icon-certified', text: '已认证', title: '已通过商家认证', desc: '您已是认证商家，可发布任务' },
      pending: { icon: 'icon-pending', text: '审核中', title: '认证申请已提交', desc: '预计1-3个工作日内完成审核' },
      uncertified: { icon: 'icon-uncertified', text: '未认证', title: '您尚未完成商家认证', desc: '完成认证后可发布任务、享受更多权益' }
    };
    const info = statusMap[status] || statusMap.uncertified;
    this.setData({
      statusIcon: info.icon,
      statusIconText: info.text,
      statusTitle: info.title,
      statusDesc: info.desc
    });
  },

  onCompanyNameInput(e) {
    this.setData({ companyName: e.detail.value });
  },

  onContactNameInput(e) {
    this.setData({ contactName: e.detail.value });
  },

  onContactPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value });
  },

  uploadLicense() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        Api.uploadImage(tempFilePath).then((url) => {
          this.setData({ licenseUrl: url });
          wx.hideLoading();
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      }
    });
  },

  submitAuth() {
    const { companyName, contactName, contactPhone, licenseUrl } = this.data;
    if (!companyName.trim()) {
      wx.showToast({ title: '请输入企业名称', icon: 'none' });
      return;
    }
    if (!contactName.trim()) {
      wx.showToast({ title: '请输入联系人', icon: 'none' });
      return;
    }
    if (!contactPhone.trim()) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' });
      return;
    }
    // 手机号格式校验（11位手机号或带区号的固话）
    const phoneRegex = /^1[3-9]\d{9}$|^0\d{2,3}-?\d{7,8}$/;
    if (!phoneRegex.test(contactPhone.trim())) {
      wx.showToast({ title: '请输入正确的联系电话', icon: 'none' });
      return;
    }
    if (!licenseUrl) {
      wx.showToast({ title: '请上传营业执照', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    Api.submitMerchantAuth({
      company_name: companyName,
      contact_name: contactName,
      contact_phone: contactPhone,
      license_url: licenseUrl
    }).then(res => {
      wx.hideLoading();
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      this.setData({ status: 'pending' });
      this._updateStatusUI('pending');
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: err.message || '提交失败', icon: 'none' });
    });
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});