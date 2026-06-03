#!/usr/bin/env node
// Run this once from the client/ directory:
//   node remove-font-import.mjs
//
// It strips the @import url(...fonts.googleapis.com...) line from styles.css
// because the font is now loaded via <link> in index.html (faster, non-blocking).

import { readFileSync, writeFileSync } from "fs";

const path = "./src/styles.css";
const css  = readFileSync(path, "utf8");

const cleaned = css
  .split("\n")
  .filter((line) => !line.trimStart().startsWith("@import url") || !line.includes("fonts.googleapis.com"))
  .join("\n");

writeFileSync(path, cleaned, "utf8");
console.log("✓ Removed Google Fonts @import from styles.css");
