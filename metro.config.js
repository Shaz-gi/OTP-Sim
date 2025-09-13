// metro.config.js (expo + svg transformer)
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// treat svg as source, not asset
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');

// include common source extensions (add 'mjs')
config.resolver.sourceExts = [
  ...new Set([
    ...(config.resolver.sourceExts || []),
    'ts',
    'tsx',
    'cjs',
    'mjs',   // <- add this
    'svg',
  ]),
];

config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true, // <- set false while debugging release bundle
    },
  }),
};

module.exports = config;
