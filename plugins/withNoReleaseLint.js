// Turns off Android's "lint vital" check in release builds (EAS production /
// preview). Only matters for real builds - Expo Go ignores it.
//
// Why: since Stripe 0.81 (SDK 58), that check tries to download a Google
// library (play-services-tapandpay) that isn't on the public servers, so the
// build fails. The check only looks for code mistakes; it doesn't change the app.
// Remove this once Stripe fixes it.
const { withAppBuildGradle } = require('expo/config-plugins');

const LINT_BLOCK = 'lint {\n        checkReleaseBuilds false\n    }';

module.exports = function withNoReleaseLint(config) {
  return withAppBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;
    if (!gradle.includes('checkReleaseBuilds false')) {
      // Add it inside the app's `android { ... }` block
      config.modResults.contents = gradle.replace(
        /android\s*\{/,
        (match) => `${match}\n    ${LINT_BLOCK}\n`
      );
    }
    return config;
  });
};
