// pages/task-detail/index.js
const Api = require('../../utils/api.js');
const { getStatusText, getClaimStatusText, getStatusClass } = require('../../utils/util.js');
const app = getApp();

Page({
  data: {
    task: null,
    claims: [],
    materials: [],
    isMyTask: false,
    canClaim: false,
    claimReason: '',
    myClaim: null,      // 当前用户对该任务的认领记录
    hasClaimed: false,   // 是否已认领（待提交状态）
  },

  onLoad(options) {
    // 详情允许未登录用户查看；仅在操作（接单/审核）时才要求登录
    this.loadTaskDetail(options.id);
  },

  async loadTaskDetail(taskId) {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await Api.getTask(taskId);
      const task = res.data;

      if (!task) {
        wx.showToast({ title: '任务不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500);
        return;
      }

      const user = app.getUser();
      const taskStatus = typeof task.status === 'number' ? task.status : parseInt(task.status, 10);
      const isMyTask = user && task.business_id === user.id;

      let claimReason = '';
      let canClaim = false;

      if (!user) {
        claimReason = '请先登录';
      } else if (isMyTask) {
        claimReason = '无法接自己的任务';
      } else if (taskStatus !== 2) {
        claimReason = '任务未开放领取';
      } else if (task.remaining_count <= 0) {
        claimReason = '名额已满';
      } else {
        canClaim = true;
      }

      // 检查当前用户是否已认领该任务
      let myClaim = null;
      let hasClaimed = false;
      if (user && !isMyTask) {
        try {
          const claimRes = await Api.getClaimByTaskId(taskId);
          myClaim = claimRes.data;
          // 只有待提交状态的认领才算已认领
          hasClaimed = myClaim && myClaim.status === 1;
        } catch (e) {
          // 忽略错误，继续显示领取按钮
        }
      }

      this.setData({
        task,
        materials: task.materials || [],
        isMyTask,
        canClaim,
        claimReason,
        myClaim,
        hasClaimed
      });

      if (isMyTask) {
        this.loadTaskClaims(taskId);
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async loadTaskClaims(taskId) {
    try {
      const res = await Api.getTaskClaims(taskId);
      this.setData({ claims: res.data || [] });
    } catch (err) {
      console.error('加载提案失败', err);
    }
  },

  async claimTask() {
    if (!app.isLoggedIn()) {
      wx.showLoading({ title: '登录中...' });
      await app.silentLogin();
      wx.hideLoading();
      if (!app.isLoggedIn()) {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
        return;
      }
    }
    const { task } = this.data;
    wx.showLoading({ title: '接单中...' });
    try {
      await Api.claimTask(task.id);
      wx.showToast({ title: '接单成功！', icon: 'success' });
      // Reload task detail to update claim state
      await this.loadTaskDetail(task.id);
    } catch (err) {
      wx.showToast({ title: err.message || '接单失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 跳转到提交作品页面
  goSubmitWork() {
    const { myClaim } = this.data;
    if (myClaim) {
      // 跳转到我的认领页面，带上claimId和taskId参数
      wx.navigateTo({ url: `/pages/my-claims/index?claimId=${myClaim.id}&action=submit` });
    }
  },

  async reviewClaim(e) {
    const { claimId, result } = e.currentTarget.dataset;
    try {
      await Api.reviewClaim(claimId, result);
      wx.showToast({ title: result === 1 ? '已采纳' : '已拒绝', icon: 'success' });
      this.loadTaskClaims(this.data.task.id);
    } catch (err) {
      wx.showToast({ title: err.message || '操作失败', icon: 'none' });
    }
  },

  getStatusText(status) {
    return getStatusText(status);
  },

  getClaimStatusText(status) {
    return getClaimStatusText(status);
  },

  getStatusClass(status) {
    return getStatusClass(status);
  },

  previewMaterial(e) {
    const url = e.currentTarget.dataset.url;
    wx.previewImage({ urls: [url], current: url });
  }
});