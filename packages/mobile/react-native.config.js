const path = require('path');

module.exports = {
  // Point RN CLI to the actual hoisted react-native location
  reactNativePath: path.resolve(__dirname, '../../node_modules/react-native'),
  // Also override the dependency root so CLI reads RN's config from the correct place
  dependencies: {
    'react-native': {
      root: path.resolve(__dirname, '../../node_modules/react-native'),
    },
  },
  project: {
    ios: {},
    android: {},
  },
  assets: ['./src/assets/fonts/'],
};
