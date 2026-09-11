"use strict";
/* 音效系统：WebAudio 纯合成，零素材零依赖；静音状态记忆在 localStorage */
const SFX = (() => {
  let ctx = null;
  let muted = false;
  try { muted = localStorage.getItem('spire-muted') === '1'; } catch (e) {}
  const lastPlay = {}; // 同名音效节流，避免多重打击瞬间爆音

  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, delay, slide) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(vol || .1, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0); o.stop(t0 + dur + .02);
  }
  const lib = {
    click:  () => tone(660, .05, 'square', .04),
    select: () => tone(520, .07, 'triangle', .07),
    card:   () => { tone(440, .08, 'triangle', .08); tone(880, .07, 'sine', .04, .04); },
    attack: () => { tone(160, .14, 'sawtooth', .12, 0, 70); tone(90, .18, 'square', .08, .02, 50); },
    hurt:   () => tone(220, .2, 'sawtooth', .11, 0, 90),
    block:  () => { tone(1180, .07, 'square', .06); tone(1560, .1, 'sine', .04, .05); },
    heal:   () => { tone(660, .11, 'sine', .07); tone(880, .13, 'sine', .07, .09); },
    buff:   () => tone(500, .16, 'triangle', .07, 0, 900),
    debuff: () => tone(430, .18, 'triangle', .07, 0, 210),
    poison: () => tone(180, .16, 'sine', .08, 0, 120),
    coin:   () => { tone(990, .06, 'square', .05); tone(1320, .09, 'square', .05, .06); },
    win:    () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'triangle', .09, i * .12)),
    levelup:() => { tone(523, .12, 'triangle', .09); tone(784, .16, 'triangle', .09, .1); },
    lose:   () => [330, 262, 208, 165].forEach((f, i) => tone(f, .3, 'sawtooth', .09, i * .16)),
    boss:   () => [110, 98, 87].forEach((f, i) => tone(f, .35, 'sawtooth', .11, i * .2)),
  };
  return {
    play(name) {
      if (muted || !lib[name]) return;
      const now = Date.now();
      if (lastPlay[name] && now - lastPlay[name] < 60) return;
      lastPlay[name] = now;
      try { lib[name](); } catch (e) {}
    },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem('spire-muted', muted ? '1' : '0'); } catch (e) {}
      if (!muted) this.play('select');
      return muted;
    },
  };
})();
