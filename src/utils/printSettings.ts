export type PrintScale = 70 | 80 | 90 | 100 | 110 | 120;

const KEY = 'printScale';

export function getPrintScale(): PrintScale {
  try {
    const v = localStorage.getItem(KEY);
    const n = v ? parseInt(v, 10) : 100;
    const allowed: number[] = [70, 80, 90, 100, 110, 120];
    return (allowed.includes(n) ? (n as PrintScale) : 100);
  } catch {
    return 100;
  }
}

export function setPrintScale(scale: PrintScale) {
  try { localStorage.setItem(KEY, String(scale)); } catch {}
}

export function formatNowForFile(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

