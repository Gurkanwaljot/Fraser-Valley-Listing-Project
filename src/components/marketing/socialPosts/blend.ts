export function rgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface DissolveOptions {
  direction?: number;
  start?: number;
  mid?: number;
}

export function dissolve(color: string, { direction = 180, start = 30, mid = 0.55 }: DissolveOptions = {}): string {
  const knee = Math.min(100, start + 30);
  return `linear-gradient(${direction}deg, ${rgba(color, 0)} ${start}%, ${rgba(color, mid)} ${knee}%, ${color} 100%)`;
}

interface VeilOptions {
  direction?: number;
  start?: number;
  strength?: number;
}

export function veil(color: string, { direction = 180, start = 38, strength = 0.72 }: VeilOptions = {}): string {
  return `linear-gradient(${direction}deg, ${rgba(color, 0)} ${start}%, ${rgba(color, strength)} 100%)`;
}
