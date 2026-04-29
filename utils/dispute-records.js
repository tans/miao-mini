const STORAGE_PREFIX = 'miao_dispute_records_';

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (err) {
    return fallback;
  }
}

function getCurrentUserId() {
  try {
    const app = getApp();
    const appUser = app && app.globalData && app.globalData.user;
    if (appUser && appUser.id != null) return String(appUser.id);
  } catch (err) {}

  const storedUser = safeParse(wx.getStorageSync('miao_user'), null);
  if (storedUser && storedUser.id != null) return String(storedUser.id);
  return 'anonymous';
}

function getStorageKey(userId) {
  return `${STORAGE_PREFIX}${userId || getCurrentUserId()}`;
}

function normalizeRecord(record = {}) {
  const now = new Date().toISOString();
  const claimId = record.claimId != null ? String(record.claimId) : '';
  const taskId = record.taskId != null ? String(record.taskId) : '';
  const sourceType = record.sourceType || 'creator_appeal';
  const localId = record.localId || `${sourceType}:${claimId || taskId || Date.now()}`;

  return {
    localId,
    sourceType,
    claimId,
    taskId,
    taskTitle: record.taskTitle || '',
    workTitle: record.workTitle || '',
    reportReason: record.reportReason || '',
    rejectReason: record.rejectReason || '',
    appealTypeName: record.appealTypeName || '',
    appealReason: record.appealReason || '',
    evidence: record.evidence || '',
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    remoteAppealId: record.remoteAppealId != null ? String(record.remoteAppealId) : '',
    remoteStatus: record.remoteStatus != null ? Number(record.remoteStatus) : 0,
    remoteStatusText: record.remoteStatusText || '',
  };
}

function listDisputeRecords(userId) {
  const records = safeParse(wx.getStorageSync(getStorageKey(userId)), []);
  if (!Array.isArray(records)) return [];
  return records
    .map((item) => normalizeRecord(item))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
}

function writeDisputeRecords(records, userId) {
  wx.setStorageSync(getStorageKey(userId), records.map((item) => normalizeRecord(item)));
}

function saveDisputeRecord(record, userId) {
  const nextRecord = normalizeRecord(record);
  const records = listDisputeRecords(userId);
  const index = records.findIndex((item) => item.localId === nextRecord.localId);

  if (index >= 0) {
    records[index] = {
      ...records[index],
      ...nextRecord,
      updatedAt: nextRecord.updatedAt || new Date().toISOString(),
    };
  } else {
    records.unshift(nextRecord);
  }

  writeDisputeRecords(records, userId);
  return nextRecord;
}

function patchDisputeRecord(localId, patch = {}, userId) {
  const records = listDisputeRecords(userId);
  const index = records.findIndex((item) => item.localId === localId);
  if (index < 0) return null;

  records[index] = normalizeRecord({
    ...records[index],
    ...patch,
    localId,
    updatedAt: patch.updatedAt || new Date().toISOString(),
  });
  writeDisputeRecords(records, userId);
  return records[index];
}

function findDisputeRecordByClaimId(claimId, userId) {
  if (claimId == null || claimId === '') return null;
  const claimKey = String(claimId);
  return listDisputeRecords(userId).find((item) => item.claimId === claimKey) || null;
}

module.exports = {
  getCurrentUserId,
  listDisputeRecords,
  saveDisputeRecord,
  patchDisputeRecord,
  findDisputeRecordByClaimId,
};
