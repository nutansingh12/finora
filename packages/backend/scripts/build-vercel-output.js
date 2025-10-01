/* Build Output API v3 generator for Vercel
 * - Compiles TypeScript (src -> dist)
 * - Emits .vercel/output with serverless functions for:
 *   - api/health
 *   - api/index (Express app)
 * - Adds routes mapping /api/* to the functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, '.vercel', 'output');
const functionsDir = path.join(outDir, 'functions');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function writeFile(p, content) {
  fs.writeFileSync(p, content);
}

function buildTypescript() {
  console.log('> Compiling TypeScript (npm run build)');
  execSync('npm run build', { stdio: 'inherit' });
}

function emitHealthFunction() {
  const funcBase = path.join(functionsDir, 'api', 'health.func');
  ensureDir(funcBase);

  // Minimal health handler
  writeFile(
    path.join(funcBase, 'index.js'),
    `module.exports = function handler(_req, res) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ status: 'ok', from: 'vercel-output-func', timestamp: new Date().toISOString() }));
    };\n`
  );

  writeJSON(path.join(funcBase, '.vc-config.json'), {
    runtime: 'nodejs18.x',
    handler: 'index.js',
  });
}

function emitIndexFunction() {
  const funcBase = path.join(functionsDir, 'api', 'index.func');
  ensureDir(funcBase);

  // Bundle the Express app and its deps into a single handler using @vercel/ncc
  const tmpDir = path.join(root, '.vercel', 'tmp');
  ensureDir(tmpDir);
  const tmpEntry = path.join(tmpDir, 'index-entry.js');
  writeFile(
    tmpEntry,
    `const app = require('../../dist/index.js').default;\nmodule.exports = (req, res) => app(req, res);\n`
  );
  // Build with ncc into the function directory
  execSync(`npx --yes @vercel/ncc build ${JSON.stringify(tmpEntry)} -o ${JSON.stringify(funcBase)} -m`, { stdio: 'inherit' });

  writeJSON(path.join(funcBase, '.vc-config.json'), {
    runtime: 'nodejs18.x',
    handler: 'index.js',
  });
}

function emitConfig() {
  ensureDir(outDir);
  // Minimal static dir so deployments that expect static output don't error
  ensureDir(path.join(outDir, 'static'));

  // Build Output API v3 config with routes
  writeJSON(path.join(outDir, 'config.json'), {
    version: 3,
    routes: [
      { src: '/api/health', dest: 'api/health' },
      { src: '/api/(.*)', dest: 'api/index' },
      { src: '/(.*)', dest: 'api/index' },
    ],
  });
}

function main() {
  buildTypescript();
  ensureDir(functionsDir);
  emitHealthFunction();
  emitIndexFunction();
  emitConfig();
  console.log('> Vercel Build Output generated in .vercel/output');
}

main();

