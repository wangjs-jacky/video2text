#!/usr/bin/env node
import { runCli } from '../src/cli/index.js';

runCli().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
