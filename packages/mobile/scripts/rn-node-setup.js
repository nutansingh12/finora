const path = require('path');
const Module = require('module');

// Ensure Node can resolve hoisted deps from the monorepo root
process.env.NODE_PATH = path.resolve(__dirname, '../../../node_modules');
Module._initPaths();

