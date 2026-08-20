// 인물 관계도 SVG 워커
// 예) ?u=박재현&a=42&b=70&c=15&d=88&e=55&l=A-B:특채&l=A-D:특채&l=E-D:은혜
//   a~e = 각 인물의 {user} 호감도(0~100), l = 인물끼리의 관계선(반복)

const W = 940, H = 780;
const CX = 470, CY = 372, R = 250;
const AVBASE = 'https://uubao.uk/BA/av/';

const CHARS = [
  ['A', '송세아', '서울시장·관리단 대표'],
  ['B', '정지안', '관리단 인사'],
  ['C', '사이토 칸나', '태성그룹 회장'],
  ['D', '키무라 유나', '6급 측정관'],
  ['E', '백서린', '관리단 추격 담당'],
];

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]));

async function avatarDataURI(code) {
  try {
    const r = await fetch(AVBASE + code + '.webp', { cf: { cacheTtl: 86400 } });
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return 'data:image/webp;base64,' + btoa(bin);
  } catch (e) { return null; }
}

// 호감도 → 색 (낮으면 회색, 높으면 붉게)
const affColor = v =>
  v >= 80 ? '#ef4d6b' : v >= 55 ? '#e8834d' : v >= 30 ? '#7f8ea3' : '#55606e';

const FONT = "'Pretendard','Malgun Gothic',sans-serif";

export default {
  async fetch(req) {
    const q = new URL(req.url).searchParams;
    const user = q.get('u') || '{user}';

    // 5각형 배치 — 맨 위부터 시계방향
    const nodes = CHARS.map(([code, name, role], i) => {
      const rad = (-90 + i * 72) * Math.PI / 180;
      return {
        code, name, role,
        x: CX + R * Math.cos(rad),
        y: CY + R * Math.sin(rad),
        aff: Math.max(0, Math.min(100, parseInt(q.get(code.toLowerCase()) || '0', 10) || 0)),
      };
    });
    const byCode = Object.fromEntries(nodes.map(n => [n.code, n]));

    const pics = {};
    await Promise.all(nodes.map(async n => { pics[n.code] = await avatarDataURI(n.code); }));

    // 인물끼리의 관계선
    const links = q.getAll('l').map(s => {
      const m = String(s).match(/^([A-E])\s*-\s*([A-E])\s*:?\s*(.*)$/i);
      if (!m) return null;
      const a = byCode[m[1].toUpperCase()], b = byCode[m[2].toUpperCase()];
      return a && b ? { a, b, label: m[3] || '' } : null;
    }).filter(Boolean);

    // ── 조각 ────────────────────────────────────────────
    const spokes = nodes.map(n =>
      `<line x1="${CX}" y1="${CY}" x2="${n.x.toFixed(1)}" y2="${n.y.toFixed(1)}" ` +
      `stroke="${affColor(n.aff)}" stroke-width="${1.5 + n.aff / 28}" stroke-opacity="0.55"/>`
    ).join('');

    const webs = links.map(({ a, b, label }) => {
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      return `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" ` +
        `stroke="#4a5568" stroke-width="1.6" stroke-dasharray="7 5"/>` +
        (label
          ? `<rect x="${(mx - 40).toFixed(1)}" y="${(my - 14).toFixed(1)}" width="80" height="26" rx="13" fill="#1b2029" stroke="#3a4453"/>` +
            `<text x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}" fill="#9fb0c4" font-size="14" ` +
            `text-anchor="middle" font-family="${FONT}">${esc(label)}</text>`
          : '');
    }).join('');

    const AVR = 42;
    const nodeSvg = nodes.map((n, i) => {
      const pic = pics[n.code];
      const face = pic
        ? `<defs><clipPath id="np${i}"><circle cx="0" cy="0" r="${AVR}"/></clipPath></defs>` +
          `<image href="${pic}" x="${-AVR}" y="${-AVR}" width="${AVR * 2}" height="${AVR * 2}" ` +
          `clip-path="url(#np${i})" preserveAspectRatio="xMidYMid slice"/>`
        : `<circle cx="0" cy="0" r="${AVR}" fill="#39414f"/>`;
      const barW = 116, fill = Math.round(barW * n.aff / 100);
      return `<g transform="translate(${n.x.toFixed(1)},${n.y.toFixed(1)})">
  <circle cx="0" cy="0" r="${AVR + 4}" fill="#12161d"/>
  ${face}
  <circle cx="0" cy="0" r="${AVR + 2}" fill="none" stroke="${affColor(n.aff)}" stroke-width="3"/>
  <text x="0" y="${AVR + 26}" fill="#e6ebf2" font-size="18" font-weight="700" text-anchor="middle" font-family="${FONT}">${esc(n.name)}</text>
  <text x="0" y="${AVR + 46}" fill="#7f8b9c" font-size="13" text-anchor="middle" font-family="${FONT}">${esc(n.role)}</text>
  <rect x="${-barW / 2}" y="${AVR + 56}" width="${barW}" height="9" rx="4.5" fill="#262d38"/>
  <rect x="${-barW / 2}" y="${AVR + 56}" width="${fill}" height="9" rx="4.5" fill="${affColor(n.aff)}"/>
  <text x="0" y="${AVR + 82}" fill="${affColor(n.aff)}" font-size="14" font-weight="700" text-anchor="middle" font-family="${FONT}">호감도 ${n.aff}</text>
</g>`;
    }).join('');

    const svg =
`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<style>@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');</style>
<rect width="100%" height="100%" fill="#0e1218"/>
<text x="${W / 2}" y="44" fill="#e6ebf2" font-size="22" font-weight="700" text-anchor="middle" font-family="${FONT}">인물 관계도</text>
<line x1="40" y1="64" x2="${W - 40}" y2="64" stroke="#242c37"/>

${spokes}
${webs}

<g transform="translate(${CX},${CY})">
  <circle cx="0" cy="0" r="52" fill="#161b23" stroke="#3a4453" stroke-width="2"/>
  <text x="0" y="-4" fill="#e6ebf2" font-size="19" font-weight="700" text-anchor="middle" font-family="${FONT}">${esc(user)}</text>
  <text x="0" y="18" fill="#7f8b9c" font-size="13" text-anchor="middle" font-family="${FONT}">비서관</text>
</g>

${nodeSvg}
</svg>`;

    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=600',
      },
    });
  },
};
