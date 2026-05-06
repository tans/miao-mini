const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

const envArg = process.argv.find(arg => arg.startsWith('--env='));
const envFlag = envArg ? envArg.split('=')[1] : '';
const isProd = envFlag === 'prod' || envFlag === 'production' || process.argv.includes('--prod');

const environments = {
  test: {
    apiBase: 'https://miao-test.clawos.cc/api/v1',
    appid: 'wx902124d67fa60b0e',
  },
  prod: {
    apiBase: 'https://miao.jisuhudong.com/api/v1',
    appid: 'wx4a1a4cedce98a1ac',
  },
};

async function upload() {
  const projectPath = path.resolve(__dirname, '..');
  const config = isProd ? environments.prod : environments.test;
  const buildInfoPath = path.join(projectPath, 'build-info.js');
  const now = new Date();
  const uploadTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const buildInfoContent = `// 此文件由 CI 自动更新，请勿手动修改\nmodule.exports = {\n  uploadTime: '${uploadTime}',\n};\n`;
  fs.writeFileSync(buildInfoPath, buildInfoContent);
  console.log('Build info updated:', uploadTime);

  const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.resolve(__dirname, '..', 'private.key');

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

  console.log('Environment:', isProd ? 'prod' : 'test');
  console.log('Upload result:', uploadResult);
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
