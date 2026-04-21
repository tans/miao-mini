const Api = require('../../../utils/api.js');
const app = getApp();

Page({
  data: {
    title: '',
    description: '',
    unit_price: 2,
    award_price: 20,
    total_count: 10,
    deadline: '',
    video_duration: '30秒',
    privacyProtected: false,
    jimengEnabled: false,
    jimeng_link: '',
    selectedIndustries: [],
    selectedStyles: [],
    industryOptions: [
      { id: 1001, name: '餐饮美食' },
      { id: 1002, name: '酒店民宿' },
      { id: 1003, name: '本地生活' },
      { id: 1004, name: '房产家居' },
      { id: 1005, name: '家居家电' },
      { id: 1006, name: '服饰穿搭' },
      { id: 1007, name: '美妆护肤' },
      { id: 1008, name: '母婴亲子' },
      { id: 1009, name: '数码科技' },
      { id: 1010, name: '教育培训' },
      { id: 1011, name: '汽车服务' },
      { id: 1012, name: '医疗健康' },
      { id: 1013, name: '金融理财' },
      { id: 1014, name: '企业商务' },
      { id: 1015, name: '电商零售' },
      { id: 1099, name: '其他行业' }
    ],
    styleOptions: ['口语化', '高级感', '接地气', '幽默风趣', '温馨治愈', '时尚潮流'],
    baseTotal: '20.00',
    awardTotal: '200.00',
    platformFee: '10.00',
    totalBudget: '230.00',
    minDeadline: '',
    maxDeadline: '',
  },

  onLoad() {
    if (!app.isLoggedIn()) {
      wx.showLoading({ title: '登录中...' });
      app.silentLogin().then(() => {
        wx.hideLoading();
        if (!app.isLoggedIn()) {
          wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        }
      });
    }
    this.initDeadlineRange();
    this.updateBudgetPreview();
  },

  initDeadlineRange() {
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 3);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + 30);
    this.setData({
      minDeadline: minDate.toISOString().split('T')[0],
      maxDeadline: maxDate.toISOString().split('T')[0]
    });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onDescInput(e) {
    this.setData({ description: e.detail.value });
  },

  isIndustrySelected(id) {
    return this.data.selectedIndustries.indexOf(id) > -1;
  },

  isStyleSelected(style) {
    return this.data.selectedStyles.indexOf(style) > -1;
  },

  toggleIndustry(e) {
    const id = e.currentTarget.dataset.id;
    const { selectedIndustries } = this.data;
    const index = selectedIndustries.indexOf(id);
    if (index > -1) {
      selectedIndustries.splice(index, 1);
    } else {
      selectedIndustries.push(id);
    }
    this.setData({ selectedIndustries });
  },

  toggleStyle(e) {
    const style = e.currentTarget.dataset.style;
    const { selectedStyles } = this.data;
    const index = selectedStyles.indexOf(style);
    if (index > -1) {
      selectedStyles.splice(index, 1);
    } else {
      selectedStyles.push(style);
    }
    this.setData({ selectedStyles });
  },

  togglePrivacy() {
    this.setData({ privacyProtected: !this.data.privacyProtected });
  },

  toggleJimeng() {
    this.setData({ jimengEnabled: !this.data.jimengEnabled });
  },

  onJimengLinkInput(e) {
    this.setData({ jimeng_link: e.detail.value });
  },

  onDeadlineChange(e) {
    this.setData({ deadline: e.detail.value });
  },

  onUnitPriceInput(e) {
    const val = e.detail.value ? parseFloat(e.detail.value) : 0;
    this.setData({ unit_price: val || 0 });
    this.updateBudgetPreview();
  },

  onAwardPriceInput(e) {
    const val = e.detail.value ? parseFloat(e.detail.value) : 0;
    this.setData({ award_price: val || 0 });
    this.updateBudgetPreview();
  },

  onTotalCountInput(e) {
    const val = e.detail.value ? parseInt(e.detail.value) : 0;
    this.setData({ total_count: val || 0 });
    this.updateBudgetPreview();
  },

  updateBudgetPreview() {
    const unitPrice = parseFloat(this.data.unit_price) || 0;
    const totalCount = parseInt(this.data.total_count) || 0;
    const awardPrice = parseFloat(this.data.award_price) || 0;

    const baseTotal = unitPrice * totalCount;
    const awardTotal = awardPrice * totalCount;
    const platformFee = Math.round((baseTotal + awardTotal) * 0.05 * 100) / 100;
    const total = baseTotal + awardTotal + platformFee;

    this.setData({
      baseTotal: baseTotal.toFixed(2),
      awardTotal: awardTotal.toFixed(2),
      platformFee: platformFee.toFixed(2),
      totalBudget: total.toFixed(2)
    });
  },

  aiWriteDesc() {
    wx.showToast({ title: 'AI帮写功能开发中', icon: 'none' });
  },

  showJimengTutorial() {
    wx.showToast({ title: '教程页面开发中', icon: 'none' });
  },

  goBack() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/home/index' }) });
  },

  async handleSubmit() {
    const { title, description, unit_price, total_count, selectedIndustries, selectedStyles, privacyProtected, jimeng_link, jimengEnabled } = this.data;

    if (!title) {
      wx.showToast({ title: '请填写任务标题', icon: 'none' });
      return;
    }
    if (!description || description.length < 10) {
      wx.showToast({ title: '请输入不少于10个字的描述', icon: 'none' });
      return;
    }
    if (selectedIndustries.length === 0) {
      wx.showToast({ title: '请至少选择一个行业', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '发布中...' });
    try {
      await Api.createTask({
        title,
        description,
        unit_price: Number(unit_price),
        total_count: Number(total_count),
        award_price: Number(this.data.award_price) || 0,
        deadline: this.data.deadline,
        video_duration: this.data.video_duration,
        privacy_protected: privacyProtected ? 1 : 0,
        industries: selectedIndustries,
        styles: selectedStyles,
        jimeng_link: jimengEnabled ? jimeng_link : '',
        jimeng_code: '',
      });
      wx.showToast({ title: '发布成功！', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/employer/my-tasks/index' });
      }, 1500);
    } catch (err) {
      const msg = err && err.message || '发布失败';
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});