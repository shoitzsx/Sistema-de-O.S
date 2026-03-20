import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const splashSvgPath = path.join(root, 'src/assets/aguia-florestal-splash.svg');
const monoSvgPath = path.join(root, 'src/assets/aguia-florestal-logo-mono.svg');
const colorSvgPath = path.join(root, 'src/assets/aguia-florestal-logo.svg');

const splashSvg = await fs.readFile(splashSvgPath);
const monoSvg = await fs.readFile(monoSvgPath);
const colorSvg = await fs.readFile(colorSvgPath);

const pngTargets = [
  { input: monoSvg, width: 180, height: 180, output: 'public/apple-touch-icon.png' },
  { input: monoSvg, width: 192, height: 192, output: 'public/icon-192.png' },
  { input: monoSvg, width: 512, height: 512, output: 'public/icon-512.png' },
  { input: monoSvg, width: 1024, height: 1024, output: 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' },
  { input: splashSvg, width: 320, height: 480, output: 'android/app/src/main/res/drawable/splash.png' },
  { input: splashSvg, width: 320, height: 480, output: 'android/app/src/main/res/drawable-port-mdpi/splash.png' },
  { input: splashSvg, width: 480, height: 800, output: 'android/app/src/main/res/drawable-port-hdpi/splash.png' },
  { input: splashSvg, width: 720, height: 1280, output: 'android/app/src/main/res/drawable-port-xhdpi/splash.png' },
  { input: splashSvg, width: 960, height: 1600, output: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png' },
  { input: splashSvg, width: 1280, height: 1920, output: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png' },
  { input: splashSvg, width: 480, height: 320, output: 'android/app/src/main/res/drawable-land-mdpi/splash.png' },
  { input: splashSvg, width: 800, height: 480, output: 'android/app/src/main/res/drawable-land-hdpi/splash.png' },
  { input: splashSvg, width: 1280, height: 720, output: 'android/app/src/main/res/drawable-land-xhdpi/splash.png' },
  { input: splashSvg, width: 1600, height: 960, output: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png' },
  { input: splashSvg, width: 1920, height: 1280, output: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png' },
  { input: splashSvg, width: 2732, height: 2732, output: 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png' },
  { input: splashSvg, width: 2732, height: 2732, output: 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png' },
  { input: splashSvg, width: 2732, height: 2732, output: 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png' },
  { input: colorSvg, width: 512, height: 256, output: 'public/social-card.png' }
];

for (const target of pngTargets) {
  const outputPath = path.join(root, target.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(target.input, { density: 300 })
    .resize(target.width, target.height, { fit: 'contain', background: '#ffffff' })
    .png()
    .toFile(outputPath);
  console.log(`generated ${target.output}`);
}
