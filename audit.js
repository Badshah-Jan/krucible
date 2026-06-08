const fs = require('fs');
const path = require('path');

const REPORT_PATH = './localization_audit_report.md';

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
let totalHardcodedReplaced = 0;
let missedFiles = {};
let translationKeysFound = new Set();

const toSnakeCase = (str) => {
  return str.replace(/[^a-zA-Z0-9]/g, ' ').trim().replace(/\s+/g, '_').toLowerCase().substring(0, 30);
};

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // Find <Text>Something</Text> and <Text style={...}>Something</Text>
  const matches = [...content.matchAll(/<Text([^>]*)>([^<{}]+)<\/Text>/g)];
  
  let replacedCount = 0;
  
  if (matches.length > 0) {
    let validMatches = matches.filter(m => m[2].trim().length > 0 && !m[2].includes('v1.0.0') && m[2].trim() !== '⚡' && m[2].trim() !== '·' && m[2].trim() !== '🏠' && m[2].trim() !== '🔥');
    
    if (validMatches.length > 0) {
      // Check if file has useTranslation
      let needsImport = !content.includes('react-i18next');
      let needsHook = !content.includes('const { t } = useTranslation()') && !content.includes('const {t} = useTranslation()') && !content.includes('const { t, i18n } = useTranslation()');
      
      // We will only do simple replacements if we can easily inject the hook.
      // Find the default export function to inject hook
      const componentMatch = content.match(/export default function\s+[A-Za-z0-9]+\s*\([^)]*\)\s*{/);
      const componentMatch2 = content.match(/export default function\([^)]*\)\s*{/);
      
      let hookInjected = false;
      if (needsHook) {
         if (componentMatch) {
            content = content.replace(componentMatch[0], componentMatch[0] + '\n  const { t } = useTranslation();');
            hookInjected = true;
         } else if (componentMatch2) {
            content = content.replace(componentMatch2[0], componentMatch2[0] + '\n  const { t } = useTranslation();');
            hookInjected = true;
         }
      } else {
         hookInjected = true;
      }
      
      if (hookInjected) {
         if (needsImport) {
           content = "import { useTranslation } from 'react-i18next';\n" + content;
         }
         
         validMatches.forEach(m => {
            const originalText = m[2];
            const trimmed = originalText.trim();
            const key = toSnakeCase(trimmed) || 'text_key';
            translationKeysFound.add(key);
            
            // Reconstruct the tag
            // We use {t('key', 'Default')}
            const replacement = `<Text${m[1]}>{t('${key}', '${trimmed}')}</Text>`;
            content = content.replace(m[0], replacement);
            replacedCount++;
         });
         
         fs.writeFileSync(file, content, 'utf8');
         totalHardcodedReplaced += replacedCount;
      } else {
         missedFiles[file] = validMatches.map(m => m[2].trim());
      }
    }
  }
});

let report = `# Neighborly Localization Audit Report

## Executive Summary
- **Total Hardcoded Strings Replaced Automatically**: ${totalHardcodedReplaced}
- **Files Requiring Manual Audit**: ${Object.keys(missedFiles).length}

## Files Still Containing Hardcoded Strings
These files contain hardcoded strings but require manual \`useTranslation\` hook injection due to complex structures (e.g. classes, nested functions, missing default exports, or strings passed as props instead of inside Text tags).

`;

Object.keys(missedFiles).forEach(file => {
  report += `### ${file}\n`;
  missedFiles[file].forEach(str => {
    report += `- ${str}\n`;
  });
  report += `\n`;
});

report += `
## Newly Discovered Translation Keys
These keys have been automatically injected with English fallbacks in the codebase. You MUST add these keys to \`ur.json\`, \`ar.json\`, \`fr.json\`, and \`es.json\` for complete localization.

\`\`\`json
{
`;

Array.from(translationKeysFound).forEach(key => {
  report += `  "${key}": "TRANSLATE_ME",\n`;
});

report += `}
\`\`\`
`;

fs.writeFileSync(REPORT_PATH, report);
console.log('Audit complete. Report generated at', REPORT_PATH);
