const fs = require('fs-extra');
const path = require('path');

async function build() {
  console.log('🚀 Building MazI Windows Desktop Application (.exe)...');

  const root = __dirname;
  const electronDist = path.join(root, 'node_modules', 'electron', 'dist');
  const outDir = path.join(root, 'dist', 'MazI-win32-x64');
  const appDir = path.join(outDir, 'resources', 'app');

  if (!fs.existsSync(electronDist)) {
    throw new Error('Electron dist not found at ' + electronDist);
  }

  // 1. Clean output dir
  await fs.remove(outDir);
  await fs.ensureDir(outDir);

  // 2. Copy Electron runtime files
  console.log('📦 Copying Electron runtime...');
  await fs.copy(electronDist, outDir);

  // 3. Rename electron.exe to MazI.exe
  const originalExe = path.join(outDir, 'electron.exe');
  const targetExe = path.join(outDir, 'MazI.exe');
  if (fs.existsSync(originalExe)) {
    await fs.move(originalExe, targetExe, { overwrite: true });
    console.log('✨ Renamed executable to MazI.exe');
  }

  // 4. Create resources/app
  await fs.ensureDir(appDir);

  // 5. Copy app files
  console.log('📄 Copying app code...');
  await fs.copy(path.join(root, 'package.json'), path.join(appDir, 'package.json'));
  await fs.copy(path.join(root, 'main.js'), path.join(appDir, 'main.js'));

  console.log('✅ Build completed successfully!');
  console.log('📁 Output Folder: ' + outDir);
  console.log('🎯 Executable: ' + targetExe);
}

build().catch(err => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
