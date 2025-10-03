#!/usr/bin/env node

/**
 * SatHub Translation Migration Helper
 *
 * This script helps identify hardcoded strings in React components
 * and suggests translation keys.
 *
 * Usage: node migration-helper.js <component-file>
 */

const fs = require('fs');
const path = require('path');

function analyzeComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  console.log(`Analyzing ${filePath}\n`);

  const hardcodedStrings = [];
  const jsxTextRegex = />[^}]*([^}]*?)</g;
  const stringLiteralRegex = /"([^"]*?)"/g;
  const templateLiteralRegex = /`([^`]*?)`/g;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Find JSX text content
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      if (text && !text.includes('{') && !text.includes('}')) {
        hardcodedStrings.push({
          text,
          line: lineNumber,
          type: 'JSX Text'
        });
      }
    }

    // Find string literals in attributes
    while ((match = stringLiteralRegex.exec(line)) !== null) {
      const text = match[1];
      if (text && text.length > 2 && !text.includes('{')) {
        hardcodedStrings.push({
          text,
          line: lineNumber,
          type: 'String Literal'
        });
      }
    }

    // Find template literals
    while ((match = templateLiteralRegex.exec(line)) !== null) {
      const text = match[1];
      if (text && !text.includes('${')) {
        hardcodedStrings.push({
          text,
          line: lineNumber,
          type: 'Template Literal'
        });
      }
    }
  });

  if (hardcodedStrings.length === 0) {
    console.log('No hardcoded strings found!');
    return;
  }

  console.log(`Found ${hardcodedStrings.length} potential hardcoded strings:\n`);

  hardcodedStrings.forEach((item, index) => {
    console.log(`${index + 1}. Line ${item.line} (${item.type}): "${item.text}"`);
    console.log(`   Suggested key: ${suggestTranslationKey(item.text)}`);
    console.log('');
  });
}

function suggestTranslationKey(text) {
  // Convert to lowercase, replace spaces/special chars with dots
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

// Main execution
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: node migration-helper.js <component-file>');
  process.exit(1);
}

const filePath = args[0];
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

analyzeComponent(filePath);