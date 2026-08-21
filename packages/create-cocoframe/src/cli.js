#!/usr/bin/env node
import { runCreator } from "./index.js";

try {
  await runCreator(process.argv.slice(2));
} catch (error) {
  console.error("\ncreate-cocoframe: " + (error instanceof Error ? error.message : String(error)));
  console.error("Run create-cocoframe --help for usage.");
  process.exitCode = 1;
}