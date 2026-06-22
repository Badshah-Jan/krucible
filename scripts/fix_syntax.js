const fs = require('fs');
const path = 'src/app/(tabs)/index.tsx';
let content = fs.readFileSync(path, 'utf8');

const startMarker = '{/* ── COMMUNITY RECOMMENDATIONS ── */}';
const endMarker = '{/* ── NEIGHBOURHOOD MODAL ── */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  let start = content.lastIndexOf('\n', startIndex);
  if (start === -1) start = 0;
  
  let end = content.lastIndexOf('\n', endIndex);
  if (end === -1) end = endIndex;

  const newContent = content.substring(0, start) + '\n\n' + content.substring(end);
  fs.writeFileSync(path, newContent, 'utf8');
  console.log('Successfully deleted the orphaned JSX block.');
} else {
  console.log('Could not find markers. startIndex:', startIndex, 'endIndex:', endIndex);
}
