// Register TS path aliases BEFORE loading the app, to avoid hoisting issues
// Use require here so this runs prior to loading '../src/index'
const path = require('path');
const fs = require('fs');
const { register: registerTsPaths } = require('tsconfig-paths');
(() => {
  try {
    const candidates = [
      __dirname,
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, '..', 'src'),
    ];
    const baseUrl = candidates.find((c) =>
      fs.existsSync(path.join(c, 'models')) ||
      fs.existsSync(path.join(c, 'routes')) ||
      fs.existsSync(path.join(c, 'controllers'))
    );
    if (baseUrl) {
      try { console.log('[ts-paths][api/index] baseUrl:', baseUrl); } catch {}
      registerTsPaths({ baseUrl, paths: { '@/*': ['*', 'src/*'] } });
    }
  } catch {}
})();

// Now load the app after registration
// eslint-disable-next-line @typescript-eslint/no-var-requires
const app = require('../src/index').default;

// Export a handler function for @vercel/node
export default function handler(req: any, res: any) {
  return (app as any)(req, res);
}
