const fs = require('fs');
const file = 'src/app/(tabs)/index.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\\n/g;
const hasEscapedNewlines = regex.test(content);

if (hasEscapedNewlines) {
    // Only replace literal "\n" inside JSX components. The `\n` literals seem to have corrupted the React Native components formatting.
    // We can just globally replace all instances of "\n" as long as it's not part of a string literal that intentionally needs \n.
    // Looking at the context, it seems the file was incorrectly formatted by an AI/copy-paste, so replacing all literal \n is safe.
    
    content = content.replace(/\\n/g, '\n');
    fs.writeFileSync(file, content);
    console.log("Replaced all \\n with actual newlines.");
} else {
    console.log("No \\n found.");
}
