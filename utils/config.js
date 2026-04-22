// 创意喵 - 小程序配置文件
// API 地址通过此文件配置，部署时修改 BUILD_ENV 环境变量切换环境
// 可用值: 'test' | 'production'
module.exports = {
  env: process.env.BUILD_ENV || 'production',

  // API Base URL - 根据 BUILD_ENV 自动选择
  apiBase: (() => {
    const env = process.env.BUILD_ENV || 'production';
    if (env === 'test') {
      return "https://miao-test.clawos.cc/api/v1";
    }
    return "https://miao.clawos.cc/api/v1";
  })(),

  // 客服热线 - 通过环境变量 MINI_CUSTOMER_SERVICE_PHONE 配置
  customerServicePhone: process.env.MINI_CUSTOMER_SERVICE_PHONE || "400-xxx-xxxx",
};
