const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let brace = 0, paren = 0, bracket = 0;
  let inString = false;
  let strChar = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inString) {
      if (c === '\\') {
        i++; // skip escaped
        continue;
      }
      if (c === strChar) {
        inString = false;
      }
      continue;
    }

    // Comments
    if (c === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }

    // Strings
    if (c === "'" || c === '"') {
      // Check for triple quotes
      if (content.substr(i, 3) === c + c + c) {
        // Simple skip for now
        i += 2;
      }
      inString = true;
      strChar = c;
      continue;
    }

    if (c === '{') brace++;
    else if (c === '}') brace--;
    else if (c === '(') paren++;
    else if (c === ')') paren--;
    else if (c === '[') bracket++;
    else if (c === ']') bracket--;

    if (brace < 0 || paren < 0 || bracket < 0) {
      return { ok: false, error: `Negative count at char ${i} (${c}): brace=${brace}, paren=${paren}, bracket=${bracket}` };
    }
  }

  if (brace !== 0 || paren !== 0 || bracket !== 0) {
    return { ok: false, error: `Unbalanced EOF: brace=${brace}, paren=${paren}, bracket=${bracket}` };
  }
  return { ok: true };
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (file.endsWith('.dart')) {
      results.push(fullPath);
    }
  }
  return results;
}

const dartFiles = walkDir('d:/Hacknex/mobile/lib');
console.log(`Checking ${dartFiles.length} Dart files...`);
let hasError = false;

for (const f of dartFiles) {
  const res = checkFile(f);
  if (!res.ok) {
    console.error(`❌ ${f}: ${res.error}`);
    hasError = true;
  } else {
    console.log(`✅ ${path.relative('d:/Hacknex/mobile/lib', f)}`);
  }
}

if (!hasError) {
  console.log('\n🎉 All Dart files have balanced syntax!');
} else {
  process.exit(1);
}
