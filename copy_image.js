import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = 'C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\2133f139-c1df-4d00-bb80-593fdcfde172';
const publicDir = path.join(__dirname, 'public');

const filesToCopy = [
  { src: 'feature_cashout_graphic_1785918757085.png', dest: 'feature_cashout.png' },
  { src: 'feature_transparency_graphic_1785918793819.png', dest: 'feature_transparency.png' },
  { src: 'usbt_hero_graphic_1785914036498.png', dest: 'usbt_hero.png' }
];

filesToCopy.forEach(item => {
  const srcPath = path.join(srcDir, item.src);
  const destPath = path.join(publicDir, item.dest);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied ${item.src} -> ${item.dest}`);
});
