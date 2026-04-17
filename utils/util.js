// utils/util.js - 工具函数

const enums = require('./enums');

/**
 * 格式化日期时间，最多显示 YYYY-MM-DD HH:mm
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return dateStr.substring(0, 16).replace('T', ' ');
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '不限';
  return dateStr.substring(0, 10);
}

/**
 * 格式化金额
 */
function formatPrice(price) {
  return Number(price || 0).toLocaleString();
}

/**
 * 获取任务状态文本
 * 对应 TaskStatus: 1=待审核, 2=已上架, 3=进行中, 4=已结束, 5=已取消
 */
function getStatusText(status) {
  return enums.getTaskStatusText(status);
}

/**
 * 获取状态对应的样式类
 * 对应 TaskStatus: 1=待审核, 2=已上架, 3=进行中, 4=已结束, 5=已取消
 */
function getStatusClass(status) {
  const colorMap = {
    1: 'pending',
    2: 'open',
    3: 'in-progress',
    4: 'closed',
    5: 'cancelled',
  };
  return colorMap[status] || 'pending';
}

/**
 * 获取接单状态文本
 * 对应 ClaimStatus: 1=待提交, 2=待验收, 3=已完成, 4=已取消, 5=已超时
 */
function getClaimStatusText(status) {
  return enums.getClaimStatusText(status);
}

module.exports = {
  formatDate,
  formatDateTime,
  formatPrice,
  getStatusText,
  getClaimStatusText,
  getStatusClass
};
