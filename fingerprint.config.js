// What counts as "native code" for over-the-air updates (runtimeVersion
// policy "fingerprint" in app.json). package.json scripts are left out:
// none of ours affect the native build (no postinstall etc.), and counting
// them meant adding or editing a script (e.g. update:production) stopped
// installed builds getting updates. If a script that changes native code is
// ever added (e.g. a postinstall patch), remove this skip.
/** @type {import('expo/fingerprint').Config} */
const { SourceSkips } = require('expo/fingerprint');

module.exports = {
  sourceSkips: SourceSkips.PackageJsonScriptsAll,
};
