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
    tempSelectedIndustries: [],
    selectedStyles: [],
    tempSelectedStyles: [],
    refImages: [],
    videoSpecOptions: {
      duration: ['15秒', '30秒', '60秒', '90秒'],
      ratio: ['9:16', '16:9', '1:1'],
      quality: ['720P', '1080P', '4K']
    },
    selectedDuration: '30秒',
    selectedRatio: '9:16',
    selectedQuality: '1080P',
    durationIndex: 1,
    ratioIndex: 0,
    qualityIndex: 1,
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
    showDialog: false,
    showStyleDialog: false,
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
  // 打开对话框
  openDialog() {
    this.setData({
      tempSelectedIndustries: [...this.data.selectedIndustries],
      showDialog: true
    });
  },
  
  // 关闭对话框
  onCloseDialog() {
    this.setData({ 
      showDialog: false,
      tempSelectedIndustries: []
    });
  },
  
  // 确认选择
  confirmIndustrySelection() {
    this.setData({
      selectedIndustries: [...this.data.tempSelectedIndustries],
      showDialog: false
    });
  },
  
  // 重置选择
  resetIndustrySelection() {
    this.setData({ tempSelectedIndustries: [] });
  },
  
  // 确认风格选择
  confirmStyleSelection() {
    this.setData({
      selectedStyles: [...this.data.tempSelectedStyles],
      showStyleDialog: false
    });
  },
  
  // 重置风格选择
  resetStyleSelection() {
    this.setData({ tempSelectedStyles: [] });
  },
    // 打开对话框
    openStyleDialog() {
      this.setData({
        tempSelectedStyles: [...this.data.selectedStyles],
        showStyleDialog: true
      });
    },
    
    // 关闭对话框
    onCloseStyleDialog() {
      this.setData({ 
        showStyleDialog: false,
        tempSelectedStyles: []
      });
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
    const { tempSelectedIndustries } = this.data;
    const index = tempSelectedIndustries.indexOf(id);
    if (index > -1) {
      tempSelectedIndustries.splice(index, 1);
    } else {
      tempSelectedIndustries.push(id);
    }
    this.setData({ tempSelectedIndustries });
  },

  toggleStyle(e) {
    const style = e.currentTarget.dataset.style;
    const { tempSelectedStyles } = this.data;
    const index = tempSelectedStyles.indexOf(style);
    if (index > -1) {
      tempSelectedStyles.splice(index, 1);
    } else {
      tempSelectedStyles.push(style);
    }
    this.setData({ tempSelectedStyles });
  },

  togglePrivacy() {
    this.setData({ privacyProtected: !this.data.privacyProtected });
  },

  toggleJimeng() {
    this.setData({ jimengEnabled: !this.data.jimengEnabled });
  },

  addRefImage() {
    if (this.data.refImages.length >= 3) {
      wx.showToast({ title: '最多上传3张图片', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: 3 - this.data.refImages.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          refImages: this.data.refImages.concat(res.tempFilePaths)
        });
      }
    });
  },

  removeRefImage(e) {
    const index = e.currentTarget.dataset.index;
    this.data.refImages.splice(index, 1);
    this.setData({ refImages: this.data.refImages });
  },

  // ActionSheet for duration selection
  showDurationActionSheet() {
    const that = this;
    const durationOptions = this.data.videoSpecOptions.duration;
    const itemList = durationOptions.map((option, index) => {
      return `${option}`;
    });
    
    wx.showActionSheet({
      itemList: itemList,
      success(res) {
        const selectedIndex = res.tapIndex;
        that.setData({
          selectedDuration: durationOptions[selectedIndex],
          durationIndex: selectedIndex
        });
      },
      fail(res) {
        console.log(res.errMsg);
      }
    });
  },

  // ActionSheet for ratio selection
  showRatioActionSheet() {
    const that = this;
    const ratioOptions = this.data.videoSpecOptions.ratio;
    const itemList = [
      '9:16 (抖音/小红书竖屏)',
      '16:9 (抖音/视频号横屏)',
      '1:1 (小红书正方形)'
    ];
    
    wx.showActionSheet({
      itemList: itemList,
      success(res) {
        const selectedIndex = res.tapIndex;
        that.setData({
          selectedRatio: ratioOptions[selectedIndex],
          ratioIndex: selectedIndex
        });
      },
      fail(res) {
        console.log(res.errMsg);
      }
    });
  },

  // ActionSheet for quality selection
  showQualityActionSheet() {
    const that = this;
    const qualityOptions = this.data.videoSpecOptions.quality;
    const itemList = qualityOptions.map((option) => {
      return option;
    });
    
    wx.showActionSheet({
      itemList: itemList,
      success(res) {
        const selectedIndex = res.tapIndex;
        that.setData({
          selectedQuality: qualityOptions[selectedIndex],
          qualityIndex: selectedIndex
        });
      },
      fail(res) {
        console.log(res.errMsg);
      }
    });
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
    const { title, selectedIndustries, selectedStyles } = this.data;

    if (!title) {
      wx.showToast({ title: '请先填写任务标题', icon: 'none' });
      return;
    }

    // Convert industry IDs to names
    const industryNames = selectedIndustries.map(id => {
      const industry = this.data.industryOptions.find(i => i.id === id);
      return industry ? industry.name : '';
    }).filter(name => name);

    wx.showLoading({ title: 'AI帮写中...' });

    Api.aiWriteTaskDescription({
      title: title,
      industries: industryNames,
      styles: selectedStyles
    }).then(res => {
      wx.hideLoading();
      if (res.data && res.data.success && res.data.description) {
        this.setData({ description: res.data.description });
        wx.showToast({ title: 'AI帮写成功', icon: 'success' });
      } else if (res.data && res.data.error) {
        wx.showToast({ title: res.data.error, icon: 'none', duration: 3000 });
      } else {
        wx.showToast({ title: 'AI帮写失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      const msg = err && err.message || 'AI帮写失败';
      wx.showToast({ title: msg, icon: 'none', duration: 3000 });
    });
  },

  showJimengTutorial() {
    wx.navigateTo({ url: '/pages/employer/jimeng-tutorial/index' });
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

    const industryNames = selectedIndustries.map(id => {
      const industry = this.data.industryOptions.find(i => i.id === id);
      return industry ? industry.name : '';
    }).filter(name => name);

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
        public: !privacyProtected,
        industries: industryNames,
        styles: selectedStyles,
        jimeng_text: jimengEnabled ? jimeng_link : '',
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







