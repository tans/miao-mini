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
    // TODO: 调用 API 获取商家认证状态
    // Api.getMerchantAuthStatus().then(res => {
    //   this.setData({ status: res.data.status });
    // });
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
    if (!licenseUrl) {
      wx.showToast({ title: '请上传营业执照', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    // TODO: 调用 API 提交认证
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '提交成功，等待审核', icon: 'success' });
      this.setData({
        status: 'pending',
        statusIcon: 'icon-pending',
        statusIconText: '审核中',
        statusTitle: '认证申请已提交',
        statusDesc: '预计1-3个工作日内完成审核'
      });
    }, 1500);
  },

  goBack() {
    wx.navigateBack({ delta: 1 });
  }
});