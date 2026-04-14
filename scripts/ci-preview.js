const ci = require('miniprogram-ci');
const path = require('path');

async function preview() {
  const projectPath = path.resolve(__dirname, '..');
  const privateKeyPath = process.env.PRIVATE_KEY_PATH;

  const project = new ci.Project({
    appid: process.env.MINI_APPID,
    type: 'miniProgram',
    projectPath,
    privateKeyPath,
    ignores: ['node_modules/**/*'],
  });

  const previewResult = await ci.preview({
    project,
    version: process.env.VERSION || '1.0.0',
    desc: 'CI Preview',
    setting: {
      es6: true,
      es7: true,
      minify: false,
    },
    qrcodeFormat: 'image',
    qrcodeOutputPath: path.join(__dirname, 'preview-qrcode.png'),
  });

  console.log('Preview result:', previewResult);
}

preview().catch(err => {
  console.error('Preview failed:', err);
  process.exit(1);
});