const fs = require('fs');
let content = fs.readFileSync('firestore.rules', 'utf8');
content = content.replace(/\|\| true/g, "|| (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['likedBy', 'likes', 'responderIds', 'commentsCount']))");
fs.writeFileSync('firestore.rules', content);
