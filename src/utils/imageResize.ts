const THUMBNAIL_SIZE = 200;
const WEBP_QUALITY = 0.8;

export async function resizeToWebPThumbnail(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(THUMBNAIL_SIZE / bitmap.width, THUMBNAIL_SIZE / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: 'image/webp', quality: WEBP_QUALITY });
  return new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' });
}
