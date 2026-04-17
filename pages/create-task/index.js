// pages/create-task/index.js
const Api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    title: '',
    description: '',
    unit_price: 2,
    unit_price_index: 0,
    priceRange: Array.from({length: 99}, (_, i) => i + 2),
    total_count: '10',
    total_count_index: 0,
    totalCountRange: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000],
    deadline: '',
    video_duration: '15秒',
    creative_style: '种草推荐',
    durationOptions: ['15秒', '30秒', '60秒', '1-3分钟'],
    styleOptions: ['种草推荐', '开箱评测', '剧情故事', '日常记录'],
    industry: '',
    industry_index: 0,
    industryOptions: [
      { id: 1001, name: '餐饮美食', note: '餐饮门店、探店、美食宣传' },
      { id: 1002, name: '酒店民宿', note: '酒店、民宿、文旅住宿宣传' },
      { id: 1003, name: '本地生活', note: '美业、健身、家政、婚庆等服务' },
      { id: 1004, name: '房产家居', note: '房产租售、装修、家居相关' },
      { id: 1005, name: '家居家电', note: '家电、家居好物、日用百货' },
      { id: 1006, name: '服饰穿搭', note: '服装、鞋包、穿搭种草' },
      { id: 1007, name: '美妆护肤', note: '美妆、护肤、彩妆教程' },
      { id: 1008, name: '母婴亲子', note: '母婴用品、育儿、亲子内容' },
      { id: 1009, name: '数码科技', note: '数码、3C、科技产品测评' },
      { id: 1010, name: '教育培训', note: '培训机构、课程、技能教学' },
      { id: 1011, name: '汽车服务', note: '汽车保养、门店、用车内容' },
      { id: 1012, name: '医疗健康', note: '健康科普、体检、理疗养生' },
      { id: 1013, name: '金融理财', note: '理财、保险、财经知识科普' },
      { id: 1014, name: '企业商务', note: '企业宣传、品牌、商务服务' },
      { id: 1015, name: '电商零售', note: '电商带货、产品种草、商超' },
      { id: 1099, name: '其他行业', note: '不属于以上类别的通用需求' }
    ],
    materials: [],
    uploading: false,
    jimeng_link: '',
    jimeng_code: '',
    baseTotal: '0.00',
    awardTotal: '0.00',
    totalBudget: '0.00',
    rules: [
      { prop: 'title', rules: [{ required: true, message: '请填写任务标题' }] },
      { prop: 'description', rules: [{ required: true, message: '请填写详细描述' }] },
      { prop: 'unit_price', rules: [{ required: true, message: '请填写基础奖励' }, { validator: (val) => val >= 2, message: '基础奖励至少2元' }] },
      { prop: 'total_count', rules: [{ required: true, message: '请填写报名人数上限' }, { validator: (val) => val >= 10, message: '报名人数至少10人' }] },
    ],
    formData: {}
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
    // 设置截止日期范围：最早3天后，最晚30天后（仅在用户选择时显示）
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

  onUnitPriceChange(e) {
    const index = e.detail.value;
    const priceRange = this.data.priceRange;
    this.setData({
      unit_price_index: index,
      unit_price: priceRange[index]
    });
    this.updateBudgetPreview();
  },

  onTotalCountChange(e) {
    const index = e.detail.value;
    const range = this.data.totalCountRange;
    this.setData({
      total_count_index: index,
      total_count: String(range[index])
    });
    this.updateBudgetPreview();
  },

  onAwardPriceInput(e) {
    this.setData({ award_price: e.detail.value });
    this.updateBudgetPreview();
  },

  updateBudgetPreview() {
    const unitPrice = parseFloat(this.data.unit_price) || 0;
    const totalCount = parseInt(this.data.total_count) || 0;
    const awardPrice = parseFloat(this.data.award_price) || 0;

    const baseTotal = unitPrice * totalCount;
    const awardTotal = awardPrice * totalCount;
    const total = baseTotal + awardTotal;

    this.setData({
      baseTotal: baseTotal.toFixed(2),
      awardTotal: awardTotal.toFixed(2),
      totalBudget: total.toFixed(2)
    });
  },

  onDeadlineChange(e) {
    this.setData({ deadline: e.detail.value });
  },

  onIndustryChange(e) {
    const index = e.detail.value;
    const industryOptions = this.data.industryOptions;
    this.setData({
      industry_index: index,
      industry: industryOptions[index].name
    });
  },

  selectDuration(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ video_duration: value });
  },

  selectStyle(e) {
    const value = e.currentTarget.dataset.value;
    this.setData({ creative_style: value });
  },

  onJimengLinkInput(e) {
    this.setData({ jimeng_link: e.detail.value });
  },

  onJimengCodeInput(e) {
    this.setData({ jimeng_code: e.detail.value });
  },

  // 添加素材
  async addMaterial() {
    const { materials } = this.data;
    const mustBeImage = materials.length === 0;

    try {
      const res = await new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: mustBeImage ? ['image'] : ['image', 'video'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        });
      });

      const file = res.tempFiles[0];
      const isVideo = file.fileType === 'video' || (res.type === 'video');
      const fileType = isVideo ? 'video' : 'image';

      this.setData({ uploading: true });

      let url;
      if (fileType === 'image') {
        url = await Api.uploadImage(file.tempFilePath);
      } else {
        url = await Api.uploadVideo(file.tempFilePath);
      }

      const newMaterials = [...this.data.materials, {
        url,
        fileName: file.tempFilePath.split('/').pop(),
        fileType,
        fileSize: file.size || 0,
      }];
      this.setData({ materials: newMaterials });
    } catch (err) {
      if (err && err.errMsg && err.errMsg.includes('cancel')) return;
      wx.showToast({ title: err.message || '上传失败', icon: 'none' });
    } finally {
      this.setData({ uploading: false });
    }
  },

  // 删除素材
  deleteMaterial(e) {
    const index = e.currentTarget.dataset.index;
    const materials = [...this.data.materials];
    materials.splice(index, 1);
    this.setData({ materials });
  },

  // 请求任务完成提醒订阅
  requestTaskReminderSubscription: function() {
    return new Promise(function(resolve) {
      var templateId = 'AT0007';
      wx.requestSubscribeMessage({
        tmplIds: [templateId],
        success: function(res) {
          console.log('订阅消息结果:', res);
          resolve(res[templateId]);
        },
        fail: function(err) {
          console.log('订阅消息失败:', err);
          resolve('fail');
        }
      });
    });
  },

  async handleSubmit() {
    const { title, description, unit_price, total_count, deadline, video_duration, creative_style, materials, jimeng_link, jimeng_code } = this.data;

    if (!title) {
      wx.showToast({ title: '请填写任务标题', icon: 'none' });
      return;
    }
    if (!description) {
      wx.showToast({ title: '请填写详细描述', icon: 'none' });
      return;
    }
    if (!unit_price) {
      wx.showToast({ title: '请填写基础奖励', icon: 'none' });
      return;
    }
    if (!total_count) {
      wx.showToast({ title: '请填写报名人数上限', icon: 'none' });
      return;
    }

    if (materials.length === 0) {
      wx.showToast({ title: '请至少上传一个素材（第一个必须是图片）', icon: 'none' });
      return;
    }

    if (materials[0].fileType !== 'image') {
      wx.showToast({ title: '第一个素材必须是图片', icon: 'none' });
      return;
    }

    // 弹出订阅提醒对话框
    var modalRes = await new Promise(function(resolve) {
      wx.showModal({
        title: '订阅任务完成提醒',
        content: '任务截止后，您将收到1条通知，提醒您审核投稿。是否立即订阅？',
        confirmText: '立即订阅',
        cancelText: '稍后再说',
        success: function(res) {
          resolve(res);
        }
      });
    });

    // 如果用户点击了确认，发起订阅请求
    if (modalRes.confirm) {
      await this.requestTaskReminderSubscription();
    }

    wx.showLoading({ title: '发布中...' });
    try {
      await Api.createTask({
        title,
        description,
        unit_price: Number(unit_price),
        total_count: Number(total_count),
        award_price: Number(this.data.award_price) || 0,
        deadline,
        video_duration,
        creative_style,
        industries: [this.data.industryOptions[this.data.industry_index].id],
        materials: materials.map((m, i) => ({
          file_name: m.fileName,
          file_path: m.url,
          file_size: m.fileSize,
          file_type: m.fileType,
          sort_order: i,
        })),
        jimeng_link,
        jimeng_code,
      });
      wx.showToast({ title: '发布成功！', icon: 'success' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/my-tasks/index' });
      }, 1500);
    } catch (err) {
      const msg = err && err.message || '发布失败';
      wx.showToast({ title: msg, icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});
