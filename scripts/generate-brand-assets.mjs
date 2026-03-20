import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const officialLogoPath = path.join(root, 'logo/logo.png');
const fallbackSvgPath = path.join(root, 'src/assets/aguia-florestal-logo.svg');

let officialLogo;
let useOfficialLogo = false;

try {
  const stats = await fs.stat(officialLogoPath);
  if (stats.size > 0) {
    officialLogo = await fs.readFile(officialLogoPath);
    useOfficialLogo = true;
  }
} catch {
  // fallback below
}

if (!officialLogo) {
  officialLogo = await fs.readFile(fallbackSvgPath);
}

const makeMonoLogo = async (size) => {
  return sharp(officialLogo)
    .resize(size, size, { fit: 'contain', background: '#ffffff' })
    .grayscale()
    .normalise()
    .png()
    .toBuffer();
};

const makeSplash = async (width, height) => {
  const logoWidth = Math.round(Math.min(width * 0.72, 1200));
  const logoHeight = Math.round(height * 0.42);
  const logoBuffer = await sharp(officialLogo)
    .resize(logoWidth, logoHeight, { fit: 'contain', background: '#ffffff' })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: '#f7fbf8'
    }
  })
    .composite([
      {
        input: logoBuffer,
        gravity: 'center'
      }
    ])
    .png()
    .toBuffer();
};

if (!useOfficialLogo) {
  console.log('logo/logo.png ausente ou vazio; usando fallback src/assets/aguia-florestal-logo.svg');
}

const pngTargets = [
  { kind: 'mono', width: 32, height: 32, output: 'public/favicon-32x32.png' },
  { kind: 'mono', width: 180, height: 180, output: 'public/apple-touch-icon.png' },
  { kind: 'mono', width: 192, height: 192, output: 'public/icon-192.png' },
  { kind: 'mono', width: 512, height: 512, output: 'public/icon-512.png' },
  { kind: 'mono', width: 1024, height: 1024, output: 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png' },
  { kind: 'splash', width: 320, height: 480, output: 'android/app/src/main/res/drawable/splash.png' },
  { kind: 'splash', width: 320, height: 480, output: 'android/app/src/main/res/drawable-port-mdpi/splash.png' },
  { kind: 'splash', width: 480, height: 800, output: 'android/app/src/main/res/drawable-port-hdpi/splash.png' },
  { kind: 'splash', width: 720, height: 1280, output: 'android/app/src/main/res/drawable-port-xhdpi/splash.png' },
  { kind: 'splash', width: 960, height: 1600, output: 'android/app/src/main/res/drawable-port-xxhdpi/splash.png' },
  { kind: 'splash', width: 1280, height: 1920, output: 'android/app/src/main/res/drawable-port-xxxhdpi/splash.png' },
  { kind: 'splash', width: 480, height: 320, output: 'android/app/src/main/res/drawable-land-mdpi/splash.png' },
  { kind: 'splash', width: 800, height: 480, output: 'android/app/src/main/res/drawable-land-hdpi/splash.png' },
  { kind: 'splash', width: 1280, height: 720, output: 'android/app/src/main/res/drawable-land-xhdpi/splash.png' },
  { kind: 'splash', width: 1600, height: 960, output: 'android/app/src/main/res/drawable-land-xxhdpi/splash.png' },
  { kind: 'splash', width: 1920, height: 1280, output: 'android/app/src/main/res/drawable-land-xxxhdpi/splash.png' },
  { kind: 'splash', width: 2732, height: 2732, output: 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732.png' },
  { kind: 'splash', width: 2732, height: 2732, output: 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-1.png' },
  { kind: 'splash', width: 2732, height: 2732, output: 'ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732-2.png' },
  { kind: 'color', width: 512, height: 256, output: 'public/social-card.png' }
];

for (const target of pngTargets) {
  const outputPath = path.join(root, target.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const input =
    target.kind === 'mono'
      ? await makeMonoLogo(Math.max(target.width, target.height))
      : target.kind === 'splash'
        ? await makeSplash(target.width, target.height)
        : await sharp(officialLogo)
            .resize(target.width, target.height, { fit: 'contain', background: '#ffffff' })
            .png()
            .toBuffer();
  await fs.writeFile(outputPath, input);
  console.log(`generated ${target.output}`);
}
