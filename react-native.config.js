const path = require('path');

module.exports = {
  reactNativePath: path.resolve(__dirname, 'node_modules/react-native'),
  dependencies: {
    'react-native': {
      root: path.resolve(__dirname, 'node_modules/react-native'),
    },
  },
  project: {
    android: {
      sourceDir: path.resolve(__dirname, 'packages/mobile/android'),
    },
    // iOS can be added when needed
  },
  assets: [path.resolve(__dirname, 'packages/mobile/src/assets/fonts')],
};

