const ci = require('miniprogram-ci');
const path = require('path');
const fs = require('fs');

async function upload() {
  const projectPath = path.resolve(__dirname, '..');

  // Read appid from project.config.json if not set
  let appid = process.env.MINI_APPID;
  if (!appid) {
    const projectConfig = JSON.parse(fs.readFileSync(path.join(projectPath, 'project.config.json'), 'utf-8'));
    appid = projectConfig.appid;
  }

  const privateKeyPath = process.env.PRIVATE_KEY_PATH || path.resolve(__dirname, '..', 'private.key');

  const project = new ci.Project({
    appid,
    appid: process.env.MINI_APPID,
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