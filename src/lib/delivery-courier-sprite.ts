import { CanvasTexture, SRGBColorSpace } from "three";

const textureCache = new Map<string, CanvasTexture>();

export function makeCourierSpriteTexture(emoji: string, name: string) {
  const key = `${emoji}:${name}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not draw courier sprite");
  }

  ctx.clearRect(0, 0, 256, 300);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "140px sans-serif";
  ctx.fillText(emoji, 128, 108);

  const displayName = name.length > 12 ? `${name.slice(0, 11)}…` : name;
  ctx.font = "700 28px sans-serif";
  ctx.fillStyle = "#ffedd5";
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 6;
  ctx.strokeText(displayName, 128, 238);
  ctx.fillText(displayName, 128, 238);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}
