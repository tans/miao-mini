// utils/util.js - 工具函数

const enums = require('./enums');

/**
 * 格式化日期时间，统一显示 YYYY-MM-DD HH:mm:ss
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    return formatDateObject(dateStr);
  }

  if (typeof dateStr === 'number') {
    const date = new Date(dateStr);
    return Number.isNaN(date.getTime()) ? '' : formatDateObject(date);
  }

  const normalized = String(dateStr)
    .trim()
    .replace('T', ' ')
    .replace(/Z$/, '')
    .replace(/\.\d+/, '')
    .replace(/([+-]\d{2}:\d{2})$/, '')
    .replace(/([+-]\d{4})$/, '');
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?/);
  if (match) {
    return `${match[1]} ${match[2]}:${match[3] || '00'}`;
  }

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return normalized;
  return formatDateObject(date);
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

function formatAmount(value, options = {}) {
  const num = Number(value || 0);
  const safeNum = Number.isFinite(num) ? num : 0;
  const { useGrouping = true } = options;

  return safeNum.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping,
  });
}

function padNumber(value) {
  return String(value).padStart(2, '0');
}

function formatDateObject(date) {
  return [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
  ].join('-') + ' ' + [
    padNumber(date.getHours()),
    padNumber(date.getMinutes()),
    padNumber(date.getSeconds()),
  ].join(':');
}

/**
 * 获取任务状态文本
 * 对应 TaskStatus: 1=兼容旧数据(按已上架处理), 2=已上架, 3=进行中, 4=已结束, 5=已取消
 */
function getStatusText(status) {
  return enums.getTaskStatusText(status);
}

/**
 * 获取状态对应的样式类
 * 对应 TaskStatus: 1=兼容旧数据(按已上架处理), 2=已上架, 3=进行中, 4=已结束, 5=已取消
 */
function getStatusClass(status) {
  const colorMap = {
    1: 'open',
    2: 'open',
    3: 'in-progress',
    4: 'closed',
    5: 'cancelled',
  };
  return colorMap[status] || 'open';
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
  formatAmount,
  formatPrice,
  getStatusText,
  getClaimStatusText,
  getStatusClass
};
