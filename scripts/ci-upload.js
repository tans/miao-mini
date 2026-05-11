const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');
const appConfig = require('../utils/config.js');

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
  },
  prod: {
    appid: 'wx4a1a4cedce98a1ac',
  },
};

async function upload() {
  const projectPath = path.resolve(__dirname, '..');
  const config = isProd ? environments.prod : environments.test;
  const runtimeConfig = appConfig.getAppConfig(config.appid);
  const defaultPrivateKeyPath = isProd
    ? path.resolve(__dirname, '..', 'private.wx4a1a4cedce98a1ac.key')
    : path.resolve(__dirname, '..', 'private.key');
  console.log('Upload target:', {
    environment: isProd ? 'prod' : 'test',
    appid: config.appid,
    apiBase: runtimeConfig.apiBase,
    pendingReviewTemplateId: runtimeConfig.subscribeTemplates && runtimeConfig.subscribeTemplates.pendingReview ? 'configured' : 'empty',
    privateKeyPath: process.env.PRIVATE_KEY_PATH || defaultPrivateKeyPath,
  });
  const buildInfoPath = path.join(projectPath, 'build-info.js');
  const now = new Date();
  const version = process.env.VERSION || pkg.version || '1.0.1';
  const uploadTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const buildInfoContent = `// 此文件由 CI 自动更新，请勿手动修改\nmodule.exports = {\n  version: '${version}',\n  uploadTime: '${uploadTime}',\n};\n`;
  fs.writeFileSync(buildInfoPath, buildInfoContent);
  console.log('Build info updated:', { version, uploadTime });

  const privateKeyPath = process.env.PRIVATE_KEY_PATH || defaultPrivateKeyPath;

  const project = new ci.Project({
    appid: config.appid,
    type: 'miniProgram',
    projectPath,
    privateKeyPath,
  });

  const uploadResult = await ci.upload({
    project,
    version,
    desc: process.env.COMMIT_MESSAGE || 'CI Upload',
    setting: {
      es6: true,
      es7: true,
      minify: false,
    },
  });

  console.log('Args:', process.argv.slice(2).join(' '));
  console.log('Upload result:', uploadResult);
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
