const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const sharp = require('sharp');

const execFileAsync = promisify(execFile);

const projectRoot = path.resolve(__dirname, '..');
const llamaSource = path.join(projectRoot, 'src', 'resources', 'llama.png');
const llamaMacSource = path.join(projectRoot, 'src', 'resources', 'llama-app.png');
const llamaTraySource = path.join(projectRoot, 'src', 'resources', 'llamatray.png');
const llamaTrayMonochromedSource = path.join(projectRoot, 'src', 'resources', 'llamatray-monochromed.png');
const buildDir = path.join(projectRoot, 'build');
const iconsDir = path.join(buildDir, 'icons');
const appIconOut = path.join(buildDir, 'icon.png');
const macAppIconOut = path.join(buildDir, 'icon-mac.png');
const trayIconOut = path.join(buildDir, 'llamatray.png');
const trayMonochromedOut = path.join(buildDir, 'llamatray-monochromed.png');
const trayTemplateIconOut = path.join(buildDir, 'llamatrayTemplate.png');
const appIconIcoOut = path.join(buildDir, 'icon.ico');
const trayIconIcoOut = path.join(buildDir, 'llamatray.ico');

const iconSizes = [16, 32, 48, 64, 128, 256, 512, 1024];

async function ensureSourceFiles() {
	await fs.access(llamaSource);
	await fs.access(llamaMacSource);
	await fs.access(llamaTrayMonochromedSource);
}

async function ensureDirectories() {
	await fs.mkdir(iconsDir, {recursive: true});
}

async function writeAppIcons() {
	for (const size of iconSizes) {
		const outPath = path.join(iconsDir, `${size}x${size}.png`);
		await sharp(llamaSource).resize(size, size, {fit: 'contain'}).png().toFile(outPath);
	}

	await sharp(llamaSource).resize(1024, 1024, {fit: 'contain'}).png().toFile(appIconOut);
	const macCanvasSize = 1024;
	const macGlyphSize = 860;
	const macCornerRadius = 190;
	const macInset = Math.floor((macCanvasSize - macGlyphSize) / 2);
	const roundedRectMask = Buffer.from(
		`<svg width="${macGlyphSize}" height="${macGlyphSize}" viewBox="0 0 ${macGlyphSize} ${macGlyphSize}" xmlns="http://www.w3.org/2000/svg">
			<rect x="0" y="0" width="${macGlyphSize}" height="${macGlyphSize}" rx="${macCornerRadius}" ry="${macCornerRadius}" fill="#fff"/>
		</svg>`,
	);
	const maskedGlyph = await sharp(llamaMacSource)
		.resize(macGlyphSize, macGlyphSize, {fit: 'cover'})
		.composite([{input: roundedRectMask, blend: 'dest-in'}])
		.png()
		.toBuffer();
	await sharp({
		create: {
			width: macCanvasSize,
			height: macCanvasSize,
			channels: 4,
			background: {r: 0, g: 0, b: 0, alpha: 0},
		},
	})
		.composite([{input: maskedGlyph, top: macInset, left: macInset}])
		.png()
		.toFile(macAppIconOut);
}

async function writeTrayIcon() {
	await sharp(llamaTraySource).resize(64, 64, {fit: 'contain'}).png().toFile(trayIconOut);
	await sharp(llamaTrayMonochromedSource).resize(64, 64, {fit: 'contain'}).png().toFile(trayMonochromedOut);
	const alphaChannel = await sharp(llamaTraySource)
		.resize(64, 64, {fit: 'contain'})
		.ensureAlpha()
		.extractChannel('alpha')
		.toBuffer();
	await sharp({
		create: {
			width: 64,
			height: 64,
			channels: 3,
			background: {r: 0, g: 0, b: 0},
		},
	})
		.joinChannel(alphaChannel)
		.png()
		.toFile(trayTemplateIconOut);
}

async function writeWindowsIco() {
	try {
		await execFileAsync('convert', [
			path.join(iconsDir, '16x16.png'),
			path.join(iconsDir, '32x32.png'),
			path.join(iconsDir, '48x48.png'),
			path.join(iconsDir, '64x64.png'),
			path.join(iconsDir, '128x128.png'),
			path.join(iconsDir, '256x256.png'),
			appIconIcoOut,
		]);
		await execFileAsync('convert', [trayIconOut, trayIconIcoOut]);
	} catch {
		// ImageMagick may not be available in all environments; PNG icons remain as fallback.
	}
}

async function main() {
	await ensureSourceFiles();
	await ensureDirectories();
	await Promise.all([writeAppIcons(), writeTrayIcon()]);
	await writeWindowsIco();
	console.log(`Generated app icons in ${iconsDir}`);
	console.log(`Generated app icon: ${appIconOut}`);
	console.log(`Generated macOS app icon: ${macAppIconOut}`);
	console.log(`Generated tray icon: ${trayIconOut}`);
	console.log(`Generated monochromed tray icon: ${trayMonochromedOut}`);
	console.log(`Generated macOS tray template icon: ${trayTemplateIconOut}`);
	console.log(`Generated Windows app icon: ${appIconIcoOut}`);
	console.log(`Generated Windows tray icon: ${trayIconIcoOut}`);
}

main().catch((error) => {
	console.error('Failed to generate icons:', error);
	process.exit(1);
});
