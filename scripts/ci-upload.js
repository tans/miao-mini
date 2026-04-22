const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

async function upload() {
  const projectPath = path.resolve(__dirname, '..');

  // 更新 build-info.js 的上传时间
  const buildInfoPath = path.join(projectPath, 'build-info.js');
  const now = new Date();
  const uploadTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const buildInfoContent = `// 此文件由 CI 自动更新，请勿手动修改\nmodule.exports = {\n  uploadTime: '${uploadTime}',\n};\n`;
  fs.writeFileSync(buildInfoPath, buildInfoContent);
  console.log('Build info updated:', uploadTime);

  // Read appid from project.config.json if not set
  let appid = process.env.MINI_APPID;
  if (!appid) {
    const projectConfig = JSON.parse(fs.readFileSync(path.join(projectPath, 'project.config.json'), 'utf-8'));
    appid = projectConfig.appid;
  }

  const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.resolve(__dirname, '..', 'private.key');

  const project = new ci.Project({
    appid,
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

  console.log('Upload result:', uploadResult);
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});