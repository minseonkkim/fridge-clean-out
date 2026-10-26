/**
 * 앱 아이콘 원본 (SVG). 초록 바탕에 흰 2도어 냉장고, 문에 급한 재료를 뜻하는 빨간 점.
 * safe: maskable 아이콘처럼 가장자리가 잘려도 되도록 그림을 가운데 60%에 둔다.
 */
export function iconSvg({ size, safe = false }: { size: number; safe?: boolean }): string {
  const scale = safe ? 0.6 : 0.78;
  const w = 100 * scale * 0.62;
  const h = 100 * scale;
  const x = (100 - w) / 2;
  const y = (100 - h) / 2;
  const split = y + h * 0.58;
  const radius = safe ? 0 : 22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="${radius}" fill="#059669"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.14}" fill="#ffffff"/>
  <line x1="${x}" y1="${split}" x2="${x + w}" y2="${split}" stroke="#059669" stroke-width="${h * 0.035}"/>
  <rect x="${x + w * 0.12}" y="${y + h * 0.14}" width="${w * 0.07}" height="${h * 0.22}" rx="${w * 0.035}" fill="#059669"/>
  <rect x="${x + w * 0.12}" y="${split + h * 0.08}" width="${w * 0.07}" height="${h * 0.16}" rx="${w * 0.035}" fill="#059669"/>
  <circle cx="${x + w * 0.74}" cy="${y + h * 0.2}" r="${w * 0.12}" fill="#ef4444"/>
</svg>`;
}

/** iOS 시작 화면 (세로). 흰 바탕 가운데 아이콘과 앱 이름. */
export function splashHtml(width: number, height: number): string {
  const iconSize = Math.round(Math.min(width, height) * 0.28);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;width:${width}px;height:${height}px;background:#ffffff;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(iconSize * 0.18)}px;
  font-family:"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif;}
  p{margin:0;font-size:${Math.round(iconSize * 0.22)}px;font-weight:700;color:#065f46;}
  </style></head><body>${iconSvg({ size: iconSize })}<p>냉털 레시피</p></body></html>`;
}
