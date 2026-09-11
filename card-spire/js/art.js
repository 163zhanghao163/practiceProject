"use strict";
/* SVG 生物图鉴：几何图形 + 深色描边，与合集画风统一 */
const OUT = '#14102a';
function shadow(y) { return `<ellipse cx="50" cy="${y || 90}" rx="20" ry="4.5" fill="#000" opacity=".3"/>`; }
const ART = {
  blob: c => `
    <path d="M22 72 Q20 44 50 40 Q80 44 78 72 Q80 84 50 85 Q20 84 22 72Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="36" cy="52" rx="9" ry="4.5" fill="${c.c2}" opacity=".75"/>
    <circle cx="40" cy="60" r="4.5" fill="#fff"/><circle cx="60" cy="60" r="4.5" fill="#fff"/>
    <circle cx="41.5" cy="61" r="2.2" fill="${OUT}"/><circle cx="61.5" cy="61" r="2.2" fill="${OUT}"/>
    <path d="M44 71 Q50 76 56 71" stroke="${OUT}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${c.crown ? `<path d="M38 36 L42 26 L47 33 L52 24 L57 33 L62 26 L66 36 Z" fill="#f0c96a" stroke="${OUT}" stroke-width="2"/>` : ''}
    ${shadow()}`,
  bat: c => `
    <path d="M50 58 L20 40 Q10 56 24 64 L38 62Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M50 58 L80 40 Q90 56 76 64 L62 62Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="60" rx="14" ry="17" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M42 46 L39 34 L48 42Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M58 46 L61 34 L52 42Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="44" cy="56" r="3.4" fill="${c.e || '#ffd34d'}"/><circle cx="56" cy="56" r="3.4" fill="${c.e || '#ffd34d'}"/>
    <circle cx="44" cy="57" r="1.4" fill="${OUT}"/><circle cx="56" cy="57" r="1.4" fill="${OUT}"/>
    <path d="M46 66 L47.5 71 L49 66Z" fill="#fff"/><path d="M51 66 L52.5 71 L54 66Z" fill="#fff"/>
    ${shadow()}`,
  shroom: c => `
    <rect x="41" y="56" width="18" height="28" rx="8" fill="#e8ddc8" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M18 56 Q22 26 50 24 Q78 26 82 56 Q82 62 74 62 L26 62 Q18 62 18 56Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="38" cy="40" r="4" fill="${c.c2}"/><circle cx="58" cy="34" r="5" fill="${c.c2}"/><circle cx="66" cy="46" r="3.5" fill="${c.c2}"/>
    <circle cx="45" cy="68" r="3" fill="#fff"/><circle cx="56" cy="68" r="3" fill="#fff"/>
    <circle cx="45.8" cy="69" r="1.5" fill="${OUT}"/><circle cx="56.8" cy="69" r="1.5" fill="${OUT}"/>
    <path d="M40 63 L48 66 M61 66 L53 63" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
    ${shadow()}`,
  skel: c => `
    <circle cx="50" cy="36" r="15" fill="#ece7dc" stroke="${OUT}" stroke-width="2.5"/>
    <rect x="42" y="47" width="16" height="6" rx="2" fill="#ece7dc" stroke="${OUT}" stroke-width="2"/>
    <circle cx="44.5" cy="34" r="4" fill="${OUT}"/><circle cx="55.5" cy="34" r="4" fill="${OUT}"/>
    <circle cx="45.5" cy="33" r="1.2" fill="#8ef0ff"/><circle cx="56.5" cy="33" r="1.2" fill="#8ef0ff"/>
    <path d="M44 42 Q50 45 56 42" stroke="${OUT}" stroke-width="2" fill="none"/>
    <rect x="43" y="55" width="14" height="20" rx="4" fill="${c.c1 || '#cfc8b8'}" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M45 60 H55 M45 65 H55 M45 70 H55" stroke="${OUT}" stroke-width="1.8"/>
    <path d="M43 58 L30 66 M57 58 L70 66" stroke="${c.c1 || '#cfc8b8'}" stroke-width="5" stroke-linecap="round"/>
    <path d="M30 66 L26 74 M70 66 L74 74" stroke="#ece7dc" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M46 75 L44 88 M54 75 L56 88" stroke="#ece7dc" stroke-width="3.5" stroke-linecap="round"/>
    ${shadow()}`,
  hum: c => `
    <path d="${c.weapon === 'staff' ? 'M72 26 L72 80' : 'M71 32 L71 64'}" stroke="#6b4a2a" stroke-width="4" stroke-linecap="round"/>
    ${c.weapon === 'sword' ? `<rect x="68" y="22" width="6" height="34" rx="2" fill="#cdd6e4" stroke="${OUT}" stroke-width="2"/><rect x="63" y="54" width="16" height="4" rx="2" fill="#8a6414"/>` : ''}
    ${c.weapon === 'axe' ? `<rect x="69" y="24" width="5" height="42" rx="2" fill="#6b4a2a" stroke="${OUT}" stroke-width="2"/><path d="M74 26 Q88 30 74 44Z" fill="#cdd6e4" stroke="${OUT}" stroke-width="2"/>` : ''}
    ${c.weapon === 'staff' ? `<circle cx="72" cy="21" r="6.5" fill="${c.c2}" stroke="${OUT}" stroke-width="2" opacity=".95"/>` : ''}
    ${c.shield ? `<ellipse cx="24" cy="58" rx="10" ry="14" fill="${c.c2}" stroke="${OUT}" stroke-width="2.5"/><path d="M24 50 L24 66" stroke="${OUT}" stroke-width="2"/>` : ''}
    <rect x="40" y="42" width="22" height="28" rx="7" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <rect x="34" y="44" width="8" height="20" rx="4" fill="${c.c1}" stroke="${OUT}" stroke-width="2"/>
    <rect x="60" y="44" width="8" height="20" rx="4" fill="${c.c1}" stroke="${OUT}" stroke-width="2"/>
    <rect x="42" y="68" width="8" height="18" rx="3" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2"/>
    <rect x="52" y="68" width="8" height="18" rx="3" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2"/>
    <circle cx="51" cy="31" r="10" fill="#f2c9a0" stroke="${OUT}" stroke-width="2.5"/>
    ${c.helm ? `<path d="M40 30 Q40 18 51 18 Q62 18 62 30 L62 26 Q62 22 51 22 Q40 22 40 26Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2"/><rect x="40" y="28" width="22" height="4" fill="${c.c1}" stroke="${OUT}" stroke-width="1.5"/>` : ''}
    <circle cx="47.5" cy="32" r="1.6" fill="${OUT}"/><circle cx="54.5" cy="32" r="1.6" fill="${OUT}"/>
    <path d="M47 37 Q51 39 55 37" stroke="${OUT}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    ${shadow()}`,
  beast: c => `
    <ellipse cx="56" cy="62" rx="25" ry="18" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="30" cy="48" r="13" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M22 38 L18 26 L28 34Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M34 36 L38 25 L41 36Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="26" cy="46" r="2.8" fill="${c.e || '#ff5a4d'}"/><circle cx="35" cy="46" r="2.8" fill="${c.e || '#ff5a4d'}"/>
    <path d="M22 54 L27 51 M32 55 L37 52" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M80 58 Q92 52 88 40" stroke="${c.c1}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M46 78 L44 88 M56 79 L56 88 M66 77 L68 88" stroke="${c.c1}" stroke-width="6" stroke-linecap="round"/>
    ${shadow()}`,
  golem: c => `
    <rect x="30" y="32" width="40" height="46" rx="10" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <rect x="38" y="20" width="24" height="16" rx="6" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="24" cy="56" r="9" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="76" cy="56" r="9" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <rect x="36" y="76" width="12" height="12" rx="4" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <rect x="52" y="76" width="12" height="12" rx="4" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M40 26 L46 26 M56 26 L60 26" stroke="${c.e || '#ffb347'}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M40 46 L48 52 L44 60 M58 42 L54 54 L62 58" stroke="${c.c2 || '#00000055'}" stroke-width="2" fill="none"/>
    ${shadow()}`,
  demon: c => `
    <path d="M38 28 Q28 12 40 8 Q40 20 46 26Z" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M62 28 Q72 12 60 8 Q60 20 54 26Z" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    ${c.wings ? `<path d="M38 44 L14 30 Q10 52 30 58Z" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" opacity=".9"/><path d="M62 44 L86 30 Q90 52 70 58Z" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round" opacity=".9"/>` : ''}
    <path d="M36 40 Q50 32 64 40 L68 72 Q50 82 32 72Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="43" cy="42" r="3.4" fill="${c.e || '#ffd34d'}"/><circle cx="57" cy="42" r="3.4" fill="${c.e || '#ffd34d'}"/>
    <circle cx="43" cy="43" r="1.5" fill="${OUT}"/><circle cx="57" cy="43" r="1.5" fill="${OUT}"/>
    <path d="M40 50 L45 53 M60 50 L55 53" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
    <path d="M42 58 L45 63 L48 58 L51 63 L54 58 L57 63 L60 58" stroke="#fff" stroke-width="2" fill="none"/>
    ${c.crown ? `<path d="M40 20 L44 10 L50 17 L56 10 L60 20Z" fill="#f0c96a" stroke="${OUT}" stroke-width="2"/>` : ''}
    ${shadow()}`,
  dragon: c => `
    <path d="M52 52 L86 34 Q92 54 70 62Z" fill="${c.c2 || c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round"/>
    <ellipse cx="50" cy="62" rx="24" ry="18" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M28 56 Q14 52 10 42 Q22 42 28 48Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
    <circle cx="26" cy="46" r="2.6" fill="${c.e || '#ffd34d'}"/>
    <path d="M10 44 L6 40 M12 48 L8 46" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M46 44 L50 36 L54 44 L58 38 L62 46" fill="none" stroke="${c.c2 || c.c1}" stroke-width="4" stroke-linecap="round"/>
    <path d="M72 70 Q88 74 92 84" stroke="${c.c1}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M44 78 L44 88 M58 78 L58 88" stroke="${c.c1}" stroke-width="6" stroke-linecap="round"/>
    ${shadow()}`,
  ghost: c => `
    <circle cx="50" cy="48" r="26" fill="${c.c2 || c.c1}" opacity=".18"/>
    <path d="M30 72 Q26 34 50 30 Q74 34 70 72 L63 64 L57 74 L50 64 L43 74 L37 64Z" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5" stroke-linejoin="round" opacity=".92"/>
    <circle cx="42" cy="50" r="6" fill="#fff"/><circle cx="58" cy="50" r="6" fill="#fff"/>
    <circle cx="43" cy="52" r="2.8" fill="${c.e || '#8ef0ff'}"/><circle cx="59" cy="52" r="2.8" fill="${c.e || '#8ef0ff'}"/>
    <path d="M45 62 Q50 66 55 62" stroke="${OUT}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${shadow(92)}`,
  bug: c => `
    <circle cx="66" cy="62" r="10" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="48" cy="60" r="13" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <circle cx="30" cy="56" r="10" fill="${c.c1}" stroke="${OUT}" stroke-width="2.5"/>
    <path d="M26 48 L20 38 M32 46 L30 34" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="27" cy="54" r="2.6" fill="${c.e || '#ff5a4d'}"/><circle cx="34" cy="54" r="2.6" fill="${c.e || '#ff5a4d'}"/>
    <path d="M40 70 L34 80 M50 72 L50 82 M58 70 L66 80 M44 50 L36 44 M56 50 L64 44" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
    ${shadow()}`,
};
function creatureSVG(art) {
  return `<svg viewBox="0 0 100 100" class="csvg" aria-hidden="true">${ART[art.shape](art)}</svg>`;
}
const HERO_SVG = `
<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M30 44 Q26 66 34 78 L44 74 L40 48Z" fill="#3a5a9a" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
  <rect x="40" y="42" width="22" height="28" rx="7" fill="#3a6ec8" stroke="${OUT}" stroke-width="2.5"/>
  <rect x="34" y="44" width="8" height="20" rx="4" fill="#3a6ec8" stroke="${OUT}" stroke-width="2"/>
  <rect x="60" y="44" width="8" height="20" rx="4" fill="#3a6ec8" stroke="${OUT}" stroke-width="2"/>
  <rect x="42" y="68" width="8" height="18" rx="3" fill="#4a3a2a" stroke="${OUT}" stroke-width="2"/>
  <rect x="52" y="68" width="8" height="18" rx="3" fill="#4a3a2a" stroke="${OUT}" stroke-width="2"/>
  <rect x="70" y="24" width="5" height="34" rx="2" fill="#cdd6e4" stroke="${OUT}" stroke-width="2"/>
  <rect x="64" y="55" width="16" height="4" rx="2" fill="#e8b84b" stroke="${OUT}" stroke-width="1.5"/>
  <circle cx="49" cy="31" r="10" fill="#f2c9a0" stroke="${OUT}" stroke-width="2.5"/>
  <path d="M39 28 Q40 16 49 16 Q60 16 59 27 L57 24 Q49 20 42 25Z" fill="#c9453a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="46" cy="32" r="1.7" fill="${OUT}"/><circle cx="53" cy="32" r="1.7" fill="${OUT}"/>
  <path d="M46 37 Q49 39 52 37" stroke="${OUT}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="50" cy="90" rx="18" ry="4" fill="#000" opacity=".3"/>
</svg>`;
