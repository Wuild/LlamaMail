const {spawnSync} = require('node:child_process');
const path = require('node:path');

function run(command, args) {
	const result = spawnSync(command, args, {stdio: 'inherit'});
	if (result.error) {
		throw result.error;
	}
	if (typeof result.status === 'number' && result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
	}
}

function has(value) {
	return typeof value === 'string' && value.trim().length > 0;
}

exports.default = async function afterSign(context) {
	if (process.platform !== 'darwin') return;

	const appOutDir = context.appOutDir;
	const productFilename = context.packager.appInfo.productFilename;
	const appPath = path.join(appOutDir, `${productFilename}.app`);

	const keychainProfile = process.env.APPLE_NOTARYTOOL_PROFILE;
	const apiKeyPath = process.env.APPLE_API_KEY;
	const apiKeyId = process.env.APPLE_API_KEY_ID;
	const apiIssuer = process.env.APPLE_API_ISSUER;

	const useProfile = has(keychainProfile);
	const useApiKey = has(apiKeyPath) && has(apiKeyId) && has(apiIssuer);

	if (!useProfile && !useApiKey) {
		console.log('[notarize] Skipping notarization: provide APPLE_NOTARYTOOL_PROFILE or APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER');
		return;
	}

	const submitArgs = ['notarytool', 'submit', appPath, '--wait'];
	if (useProfile) {
		submitArgs.push('--keychain-profile', keychainProfile.trim());
	} else {
		submitArgs.push('--key', apiKeyPath.trim(), '--key-id', apiKeyId.trim(), '--issuer', apiIssuer.trim());
	}

	console.log(`[notarize] Submitting ${appPath}`);
	run('xcrun', submitArgs);
	console.log(`[notarize] Stapling ${appPath}`);
	run('xcrun', ['stapler', 'staple', appPath]);
	console.log('[notarize] Done');
};
