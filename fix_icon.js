const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function fixIcon() {
  try {
    const iconJpegPath = path.join(__dirname, 'assets', 'images', 'icon.png.jpeg');
    const faviconJpegPath = path.join(__dirname, 'assets', 'images', 'favicon.png.jpeg');
    const trueIconPath = path.join(__dirname, 'assets', 'images', 'icon.png');
    const trueFaviconPath = path.join(__dirname, 'assets', 'images', 'favicon.png');
    
    // Fix icon.png.jpeg
    if (fs.existsSync(iconJpegPath)) {
      console.log("Converting icon.png.jpeg to true PNG...");
      await sharp(fs.readFileSync(iconJpegPath))
        .toFormat('png')
        .toFile(trueIconPath);
      fs.unlinkSync(iconJpegPath); // remove the old jpeg
      console.log("Successfully created icon.png");
    }

    // Fix favicon.png.jpeg
    if (fs.existsSync(faviconJpegPath)) {
      console.log("Converting favicon.png.jpeg to true PNG...");
      await sharp(fs.readFileSync(faviconJpegPath))
        .toFormat('png')
        .toFile(trueFaviconPath);
      fs.unlinkSync(faviconJpegPath); // remove the old jpeg
      console.log("Successfully created favicon.png");
    }

  } catch (error) {
    console.error("Error converting images:", error);
  }
}

fixIcon();
