const INDUSTRY_OPTIONS = [
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
  { id: 1099, name: '其他行业' },
];

const INDUSTRY_NAMES = INDUSTRY_OPTIONS.map((item) => item.name);
const INDUSTRY_TAGS = ['全部'].concat(INDUSTRY_NAMES);

function buildIndustryTags(extraNames = []) {
  const tags = INDUSTRY_TAGS.slice();
  const seen = new Set(tags);

  (Array.isArray(extraNames) ? extraNames : []).forEach((name) => {
    const safeName = String(name || '').trim();
    if (!safeName || seen.has(safeName)) return;
    seen.add(safeName);
    tags.push(safeName);
  });

  return tags;
}

module.exports = {
  INDUSTRY_OPTIONS,
  INDUSTRY_NAMES,
  INDUSTRY_TAGS,
  buildIndustryTags,
};
