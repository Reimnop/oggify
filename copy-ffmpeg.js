import fs from "fs";
import path from "path";

const srcDir = "./node_modules/@ffmpeg/core-mt/dist/esm";
const destDir = "./static/wasm";

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const filesToCopy = ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"];

filesToCopy.forEach((file) => {
  fs.copyFileSync(path.join(srcDir, file), path.join(destDir, file));
  console.log(`✅ Copied ${file} to ${destDir}`);
});
