// plugins/withExpoPodSources.js
const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('@expo/config-plugins');

function ensurePodfileHasExpoSource(podfilePath) {
  if (!fs.existsSync(podfilePath)) return;
  let podfile = fs.readFileSync(podfilePath, 'utf8');

  // If the expo source already present, do nothing
  if (podfile.includes("source 'https://github.com/expo/expo.git'")) return;

  // Insert expo git source before the CDN source (or at the top)
  // Keep existing content; add our lines on top if needed
  const prefix = "source 'https://github.com/expo/expo.git'\nsource 'https://cdn.cocoapods.org/'\n\n";
  podfile = prefix + podfile;
  fs.writeFileSync(podfilePath, podfile, 'utf8');
}

module.exports = function withExpoPodSources(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config._internal?.projectRoot || config.projectRoot || process.cwd();
      const podfilePath = path.join(projectRoot, 'ios', 'Podfile');

      // If Podfile doesn't exist yet (before ios prebuild), try to create a small placeholder
      // but normally the Podfile exists after prebuild step on EAS. We'll try to patch if present.
      try {
        ensurePodfileHasExpoSource(podfilePath);
      } catch (e) {
        // don't throw — we want prebuild to continue; log to stdout/stderr in EAS logs
        console.warn('withExpoPodSources: failed to patch Podfile:', e);
      }
      return config;
    },
  ]);
};
