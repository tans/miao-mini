const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

const envArg = process.argv.find(arg => arg.startsWith('--env='));
const envFlag = envArg ? envArg.split('=')[1] : '';
const isProd =
  envFlag === 'prod' ||
  envFlag === 'production' ||
  process.argv.includes('--prod') ||
  process.env.npm_config_prod === 'true' ||
  process.env.NPM_CONFIG_PROD === 'true';

const environments = {
  test: {
    appid: 'wx902124d67fa60b0e',
    apiBase: 'https://miao-test.clawos.cc/api/v1',
  },
  prod: {
    appid: 'wx4a1a4cedce98a1ac',
    apiBase: 'https://miao.jisuhudong.com/api/v1',
  },
};

function createConfigContent(apiBase) {
  return `// 创意喵 - 小程序配置文件\n// API 地址通过此文件配置，部署时修改此文件即可切换环境\nmodule.exports = {\n  // API Base URL - 修改此处切换测试/生产环境\n  apiBase: "${apiBase}",\n\n  // 客服热线\n  customerServicePhone: "400-xxx-xxxx",\n};\n`;
}

async function upload() {
  const projectPath = path.resolve(__dirname, '..');
  const config = isProd ? environments.prod : environments.test;
  const configPath = path.join(projectPath, 'utils', 'config.js');
  const originalConfig = fs.readFileSync(configPath, 'utf8');
  const defaultPrivateKeyPath = isProd
    ? path.resolve(__dirname, '..', 'private.wx4a1a4cedce98a1ac.key')
    : path.resolve(__dirname, '..', 'private.key');
  console.log('Upload target:', {
    environment: isProd ? 'prod' : 'test',
    appid: config.appid,
    apiBase: config.apiBase,
    privateKeyPath: process.env.PRIVATE_KEY_PATH || defaultPrivateKeyPath,
  });
  const buildInfoPath = path.join(projectPath, 'build-info.js');
  const now = new Date();
  const uploadTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const buildInfoContent = `// 此文件由 CI 自动更新，请勿手动修改\nmodule.exports = {\n  uploadTime: '${uploadTime}',\n};\n`;
  fs.writeFileSync(buildInfoPath, buildInfoContent);
  console.log('Build info updated:', uploadTime);

  const privateKeyPath = process.env.PRIVATE_KEY_PATH || defaultPrivateKeyPath;

  try {
    fs.writeFileSync(configPath, createConfigContent(config.apiBase));

    const project = new ci.Project({
      appid: config.appid,
      type: 'miniProgram',
      projectPath,
      privateKeyPath,
    });

    const uploadResult = await ci.upload({
      project,
      version: process.env.VERSION || '1.0.0',
      desc: process.env.COMMIT_MESSAGE || 'CI Upload',
      setting: {
        es6: true,
        es7: true,
        minify: false,
      },
    });

    console.log('Args:', process.argv.slice(2).join(' '));
    console.log('Upload result:', uploadResult);
  } finally {
    fs.writeFileSync(configPath, originalConfig);
  }
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
