// 创意喵 - 小程序配置文件
// API 地址通过此文件配置，部署时修改此文件即可切换环境
module.exports = {
  // API Base URL - 修改此处切换测试/生产环境
  apiBase: "https://miao-test.clawos.cc/api/v1",

  // 客服热线 - 通过环境变量 MINI_CUSTOMER_SERVICE_PHONE 配置
  customerServicePhone: process.env.MINI_CUSTOMER_SERVICE_PHONE || "400-xxx-xxxx",
};
