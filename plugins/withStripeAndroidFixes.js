// Two fixes so Android release builds (EAS production / preview) work with
// Stripe 0.81 (SDK 58). Only matters for real builds - Expo Go ignores it.
//
// Both come from Stripe's "push provisioning" (adding cards to Google Wallet),
// which we don't use. It relies on a Google library (play-services-tapandpay)
// that isn't on the public servers, so:
// 1. Android's "lint vital" check fails trying to download it - turned off for
//    release builds (it only looks for code mistakes; it doesn't change the app).
// 2. R8, which shrinks the app's code, stops because those classes are missing -
//    told to ignore them (Stripe's own advice).
// Remove this once Stripe fixes it.
const { withAppBuildGradle, withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const LINT_BLOCK = 'lint {\n        checkReleaseBuilds false\n    }';
const PROGUARD_RULE = '-dontwarn com.stripe.android.pushProvisioning.**';

// 1. android { lint { checkReleaseBuilds false } } in app/build.gradle
const withNoReleaseLint = (config) =>
  withAppBuildGradle(config, (config) => {
    const gradle = config.modResults.contents;
    if (!gradle.includes('checkReleaseBuilds false')) {
      config.modResults.contents = gradle.replace(
        /android\s*\{/,
        (match) => `${match}\n    ${LINT_BLOCK}\n`
      );
    }
    return config;
  });

// 2. Add the ignore rule to app/proguard-rules.pro
const withIgnorePushProvisioning = (config) =>
  withDangerousMod(config, [
    'android',
    (config) => {
      const file = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      );
      const rules = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (!rules.includes(PROGUARD_RULE)) {
        fs.writeFileSync(
          file,
          `${rules}\n# Stripe push provisioning - not used (plugins/withStripeAndroidFixes.js)\n${PROGUARD_RULE}\n`
        );
      }
      return config;
    },
  ]);

module.exports = (config) =>
  withIgnorePushProvisioning(withNoReleaseLint(config));
