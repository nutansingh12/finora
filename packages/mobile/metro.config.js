const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * https://facebook.github.io/metro/docs/configuration
 *
 * @type {import('metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

const config = {
  watchFolders: [
    path.resolve(__dirname, '../../node_modules'),
  ],
  resolver: {
    nodeModulesPaths: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
    ],
    platforms: ['ios', 'android', 'native'],
  },
};

const merged = mergeConfig(defaultConfig, config);
// Debug: print platforms so we can see what's going on during bundling
if (process.env.RN_PRINT_PLATFORMS === '1') {
  console.log('metro.default.platforms =', defaultConfig?.resolver?.platforms);
  console.log('metro.merged.platforms   =', merged?.resolver?.platforms);
}

module.exports = merged;
