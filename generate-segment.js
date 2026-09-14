// Segment generator for parallel remote renders.
// Usage: node generate-segment.js <totalSecs> <startSec> <lenSecs> <outputDir>
// Renders cues for [startSec, startSec+lenSecs) of a totalSecs countdown,
// with delays rebased to 0 so the segment records standalone.
// The on-screen time + ring progress stay global (count down to 00:00 of the full video).
const fs = require('fs');
const path = require('path');

const totalSecs = parseInt(process.argv[2], 10);
const startSec = parseInt(process.argv[3], 10);
const lenSecs = parseInt(process.argv[4], 10);
const outputDir = process.argv[5];

if (!totalSecs || startSec === undefined || isNaN(startSec) || !lenSecs || !outputDir) {
  console.error('Usage: node generate-segment.js <totalSecs> <startSec> <lenSecs> <outputDir>');
  process.exit(1);
}

const W = 3840, H = 2160;
const CROSSFADE = 200;
const RING_R = 500;
const RING_C = 2 * Math.PI * RING_R;
const CX = W / 2;
const CY = H / 2;

let cues = '';
for (let sec = startSec; sec < startSec + lenSecs && sec < totalSecs; sec++) {
  const remaining = totalSecs - sec;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const display = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
  const delayMs = (sec - startSec) * 1000;
  const durMs = 1000 + CROSSFADE;
  const progress = remaining / totalSecs;
  const dashOffset = RING_C * (1 - progress);
  cues += `<div class="cue" id="c${sec}" style="z-index:${sec - startSec + 1};animation-delay:${delayMs}ms;animation-duration:${durMs}ms;">
  <svg class="ring" viewBox="0 0 ${RING_R*2+40} ${RING_R*2+40}" style="left:${CX}px;top:${CY - RING_R - 20}px;">
    <circle class="ring-bg" cx="${RING_R+20}" cy="${RING_R+20}" r="${RING_R}"/>
    <circle class="ring-fg" cx="${RING_R+20}" cy="${RING_R+20}" r="${RING_R}"
      stroke-dasharray="${RING_C}" stroke-dashoffset="${dashOffset}"/>
  </svg>
  <div class="timer" data-node-role="text" style="top:${CY - 80}px;">${display}</div>
</div>\n`;
}

const wv = `<meta charset="utf-8">
<style>
@font-face{
  font-family:'TimerFont';
  src:url('fonts/JetBrainsMono-Bold.ttf');
  font-weight:700;
  font-display:block;
}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${W}px;height:${H}px;position:relative;overflow:hidden;background:#0a0a0f}
@keyframes fadeIn{0%{opacity:0}10%{opacity:1}90%{opacity:1}100%{opacity:0}}
.cue{position:absolute;inset:0;opacity:0;animation:fadeIn linear forwards}
.ring{
  position:absolute;width:${RING_R*2+40}px;height:${RING_R*2+40}px;
  transform:translateX(-50%);
}
.ring-bg{fill:none;stroke:rgba(255,255,255,0.06);stroke-width:8}
.ring-fg{fill:none;stroke:url(#grad);stroke-width:8;stroke-linecap:round;
  transform:rotate(-90deg);transform-origin:center;}
.timer{
  position:absolute;left:0;right:0;
  text-align:center;font-size:${RING_R}px;font-weight:700;
  font-family:'TimerFont',monospace;
  color:#fff;letter-spacing:0.06em;
}
</style>
<svg style="position:absolute;width:0;height:0">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#00d4ff"/>
      <stop offset="100%" stop-color="#7b2ff7"/>
    </linearGradient>
  </defs>
</svg>
${cues}`;

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(path.join(outputDir, 'fonts'), { recursive: true });
fs.copyFileSync(
  path.resolve(__dirname, 'fonts/JetBrainsMono-Bold.ttf'),
  path.join(outputDir, 'fonts', 'JetBrainsMono-Bold.ttf')
);
fs.writeFileSync(path.join(outputDir, 'timer.wv'), wv);
console.log(`Generated segment [${startSec}, ${startSec + lenSecs}) of ${totalSecs}s in ${outputDir}`);
