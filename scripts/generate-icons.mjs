#!/usr/bin/env node
/**
 * src/app/icon.svg 를 원본으로 파비콘 세트를 생성한다.
 *   src/app/icon.png        48×48   (일반 브라우저 탭)
 *   src/app/apple-icon.png  180×180 (iOS 홈 화면)
 *   src/app/favicon.ico     32×32   (구형 브라우저·북마크. PNG 를 담은 ICO)
 * Next App Router 는 이 파일들을 자동으로 <link rel="icon"> 으로 노출한다.
 *
 * 사용: node scripts/generate-icons.mjs   (아이콘 디자인을 바꿨을 때만 실행하고 결과를 커밋한다)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(ROOT, "src", "app");
const svg = readFileSync(join(APP, "icon.svg"));

const png = (size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();

/** PNG 하나를 담은 ICO 컨테이너 (ICONDIR 6B + ICONDIRENTRY 16B + PNG 데이터). Windows·Chrome 모두 PNG 내장 ICO 를 읽는다. */
function pngToIco(pngBuffer, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size, 0); // width (256 → 0)
  entry.writeUInt8(size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8); // size
  entry.writeUInt32LE(6 + 16, 12); // offset
  return Buffer.concat([header, entry, pngBuffer]);
}

const [icon48, apple180, ico32] = await Promise.all([png(48), png(180), png(32)]);
writeFileSync(join(APP, "icon.png"), icon48);
writeFileSync(join(APP, "apple-icon.png"), apple180);
writeFileSync(join(APP, "favicon.ico"), pngToIco(ico32, 32));
console.log("generated: src/app/icon.png (48), src/app/apple-icon.png (180), src/app/favicon.ico (32)");
