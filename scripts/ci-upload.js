const ci = require('miniprogram-ci');
const path = require('path');

async function upload() {
  const projectPath = path.resolve(__dirname, '..');
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;

  const project = new ci.Project({
    appid: process.env.MINI_APPID,
    type: 'miniProgram',
    projectPath,
    privateKeyPath,
    ignores: ['node_modules/**/*'],
  });

  const uploadResult = await ci.upload({
    project,
    version: process.env.VERSION || '1.0.0',
    desc: process.env.GITHUB_SHA ? `Upload from ${process.env.GITHUB_SHA.slice(0, 7)}` : 'CI Upload',
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