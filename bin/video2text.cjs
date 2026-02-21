#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const tsxPath = path.join(__dirname, '../node_modules/tsx/dist/cli.mjs');
const tsFile = path.join(__dirname, 'video2text.ts');

spawn(process.execPath, [tsxPath, tsFile, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env
}).on('exit', (code) => {
  process.exit(code || 0);
});
