"use strict";
/* 游戏引擎：全局状态 / 存档 / 战斗流程 / 地图生成 / 奖励-商店-营地-事件逻辑 */

const LS_SAVE = 'spire-save', LS_REC = 'spire-records';
const G = {
  screen: 'title', act: 1, row: -1, pos: -1,
  hp: 80, maxHp: 80, gold: 99, deck: [], relics: [],
  mapRows: null, removeCost: 75, kills: 0, goldEarned: 0,
  maxEnergy: 3, curEvent: null, shopStock: null, restDone: false,
  b: null,
  // 成长系统
  level: 1, xp: 0, pendingLevels: 0, levelChoices: null, lvlEnergyTaken: false,
  baseStrength: 0, baseDexterity: 0, baseBlock: 0,
};

/* ---------------- 经验与等级成长 ---------------- */
function xpNeed(level) { return 30 + (level - 1) * 15; }
function gainXp(n) {
  G.xp += n;
  let ups = 0;
  while (G.xp >= xpNeed(G.level)) { G.xp -= xpNeed(G.level); G.level++; ups++; }
  if (ups) { G.pendingLevels += ups; toast(`🎉 升级！Lv.${G.level}`); SFX.play('levelup'); }
  return ups;
}
const LEVEL_UPS = [
  { id: 'hp',     icon: '❤️', name: '强健体魄', desc: '生命上限 +10，并回复 10 点生命', apply: () => { G.maxHp += 10; G.hp = Math.min(G.maxHp, G.hp + 10); } },
  { id: 'str',    icon: '⚔️', name: '磨砺锋刃', desc: '战斗开始时永久获得 1 层力量', apply: () => { G.baseStrength++; } },
  { id: 'dex',    icon: '🛡️', name: '加固护甲', desc: '战斗开始时永久获得 1 层敏捷', apply: () => { G.baseDexterity++; } },
  { id: 'blk',    icon: '🏰', name: '备战姿态', desc: '战斗开始时永久获得 3 点格挡', apply: () => { G.baseBlock += 3; } },
  { id: 'gold',   icon: '💰', name: '搜刮补给', desc: '立刻获得 80 金币', apply: () => { G.gold += 80; } },
  { id: 'energy', icon: '⚡', name: '核心扩张', desc: '能量上限 +1（每局仅一次）', can: () => !G.lvlEnergyTaken, apply: () => { G.maxEnergy++; G.lvlEnergyTaken = true; } },
];
function rollLevelChoices() {
  const pool = LEVEL_UPS.filter(o => !o.can || o.can());
  G.levelChoices = shuffle(pool.slice()).slice(0, 3);
}

/* ---------------- 存档 ---------------- */
function saveRun() {
  if (!G.mapRows) return;
  const s = { v: 1, act: G.act, row: G.row, pos: G.pos, hp: G.hp, maxHp: G.maxHp, gold: G.gold,
    deck: G.deck, relics: G.relics, mapRows: G.mapRows, removeCost: G.removeCost,
    kills: G.kills, goldEarned: G.goldEarned, maxEnergy: G.maxEnergy,
    level: G.level, xp: G.xp, pendingLevels: G.pendingLevels, lvlEnergyTaken: G.lvlEnergyTaken,
    baseStrength: G.baseStrength, baseDexterity: G.baseDexterity, baseBlock: G.baseBlock };
  try { localStorage.setItem(LS_SAVE, JSON.stringify(s)); } catch (e) {}
}
function loadRun() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_SAVE));
    if (!s || s.v !== 1) return false;
    Object.assign(G, { act: s.act, row: s.row, pos: s.pos, hp: s.hp, maxHp: s.maxHp, gold: s.gold,
      deck: s.deck, relics: s.relics, mapRows: s.mapRows, removeCost: s.removeCost,
      kills: s.kills, goldEarned: s.goldEarned, maxEnergy: s.maxEnergy, b: null,
      level: s.level || 1, xp: s.xp || 0, pendingLevels: s.pendingLevels || 0, lvlEnergyTaken: !!s.lvlEnergyTaken,
      baseStrength: s.baseStrength || 0, baseDexterity: s.baseDexterity || 0, baseBlock: s.baseBlock || 0 });
    UID = Math.max(1000, ...G.deck.map(c => c.uid || 0)) + 1;
    return true;
  } catch (e) { return false; }
}
function clearSave() { try { localStorage.removeItem(LS_SAVE); } catch (e) {} }
function loadRecords() { try { return JSON.parse(localStorage.getItem(LS_REC)) || { runs: 0, wins: 0 }; } catch (e) { return { runs: 0, wins: 0 }; } }
function saveRecords(r) { try { localStorage.setItem(LS_REC, JSON.stringify(r)); } catch (e) {} }
function recordsEnd(win) { const r = loadRecords(); if (win) { r.wins++; saveRecords(r); } }

/* ---------------- 战斗状态 ---------------- */
function playerB() { return G.b.p; }
function aliveEnemies() { return G.b ? G.b.enemies.filter(e => e.hp > 0) : []; }
function hostOf(e) { return e === (G.b && G.b.p) ? '#p-panel' : '#en-' + e.slot; }

function startBattle(keys) {
  const enemies = keys.map((k, i) => {
    const d = ENEMY_BY[k];
    const hp = randInt(d.hp[0], d.hp[1]);
    return { key: k, def: d, hp, maxHp: hp, block: 0, buffs: {}, ii: 0, slot: i };
  });
  const drawPile = shuffle(G.deck.map(c => c.uid));
  G.b = {
    enemies, p: { hp: G.hp, maxHp: G.maxHp, block: G.baseBlock || 0, buffs: {
      strength: G.baseStrength || 0, dexterity: G.baseDexterity || 0,
    } },
    hand: [], drawPile, discardPile: [], exhaustPile: [],
    cardByUid: {}, energy: G.maxEnergy, maxEnergy: G.maxEnergy,
    turn: 0, sel: null, busy: false, over: false, phoenixUsed: false, atkCount: 0,
    log: ['遭遇了 ' + enemies.map(e => e.def.name).join('、') + '！'],
  };
  for (const k of ['strength', 'dexterity']) if (!G.b.p.buffs[k]) delete G.b.p.buffs[k];
  for (const c of G.deck) G.b.cardByUid[c.uid] = c;
  fireRelics('battleStart');
  drawCards(5);
  if (enemies.some(e => e.def.boss)) { toast('⚠️ 首领战：' + enemies[0].def.name); SFX.play('boss'); }
  else if (enemies.some(e => e.def.elite)) { toast('👹 精英遭遇战！'); SFX.play('select'); }
  G.screen = 'battle';
  render();
}
function drawCards(n) {
  const b = G.b; if (!b) return;
  for (let i = 0; i < n; i++) {
    if (b.hand.length >= 10) break;
    if (!b.drawPile.length) {
      if (!b.discardPile.length) break;
      b.drawPile = shuffle(b.discardPile); b.discardPile = [];
      pushLog('弃牌堆已洗回抽牌堆');
    }
    b.hand.push(b.drawPile.pop());
  }
}
function pushLog(msg) { if (G.b) { G.b.log.push(msg); if (G.b.log.length > 3) G.b.log.shift(); } }

function castGhost(idx) { // 打出卡牌时从手牌位飞出的残影动画（不影响状态，测试环境安全）
  const el = document.querySelector('[data-hand="' + idx + '"]');
  if (!el) return;
  const r = el.getBoundingClientRect();
  const ghost = el.cloneNode(true);
  ghost.classList.remove('selected', 'dis');
  ghost.classList.add('cast-ghost');
  ghost.style.cssText += `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`;
  document.body.appendChild(ghost);
  setTimeout(() => ghost.remove(), 400);
}

function tryPlay(idx, target) {
  const b = G.b;
  if (!b || b.busy || b.over) return { ok: false };
  const card = b.cardByUid[b.hand[idx]];
  if (!card) return { ok: false };
  if (card.cost > b.energy) { toast('能量不足！'); return { ok: false, reason: '能量不足' }; }
  if (card.target === 'enemy') {
    if (!target) {
      b.sel = b.sel === idx ? null : idx;
      SFX.play('select');
      render(); return { ok: false, selecting: true };
    }
    if (target.hp <= 0) return { ok: false };
  }
  b.busy = true; b.sel = null;
  castGhost(idx);
  SFX.play('card');
  b.energy -= card.cost;
  b.hand.splice(idx, 1);
  const ctx = { self: b.p, target: target || aliveEnemies()[0], b, card };
  try {
    for (const eff of card.effects) applyEffect(ctx, eff);
  } catch (err) { console.error(err); toast('结算异常：' + err.message); }
  pushLog(`你打出「${card.name}」`);
  relicOnPlay(card);
  if (card.exhaust) b.exhaustPile.push(card.uid); else b.discardPile.push(card.uid);
  render();
  return animateFX().then(() => {
    if (G._testing) return { ok: true };
    checkEnd();
    if (G.screen === 'battle' && G.b && !G.b.over) { b.busy = false; render(); }
  });
}
async function animateFX() {
  const list = FX.splice(0);
  for (const f of list) {
    const host = document.querySelector(f.host);
    if (host) {
      const s = document.createElement('span');
      s.className = 'floatnum ' + f.cls;
      s.textContent = f.text;
      host.appendChild(s);
      setTimeout(() => s.remove(), 900);
      if (f.cls === 'fdmg' && f.host.startsWith('#en-')) {
        host.classList.remove('flash');
        void host.offsetWidth;
        host.classList.add('flash');
      }
    }
    await sleep(140);
  }
}
function checkEnd() {
  const b = G.b; if (!b || b.over) return;
  if (b.enemies.every(e => e.hp <= 0)) { b.over = true; setTimeout(() => endBattle(true), 500); return; }
  if (b.p.hp <= 0) {
    if (hasRelic('phoenix') && !b.phoenixUsed) {
      b.phoenixUsed = true;
      b.p.hp = Math.ceil(G.maxHp * 0.3);
      toast('🟡 凤凰羽发动：浴火重生！');
      pushLog('凤凰羽燃起金色的火焰！');
      SFX.play('heal');
      render(); return;
    }
    b.over = true; setTimeout(() => endBattle(false), 500);
  }
}
function endBattle(win) {
  const b = G.b; if (!b) return;
  G.hp = Math.max(1, b.p.hp);
  if (!win) {
    clearSave(); recordsEnd(false);
    SFX.play('lose');
    G.screen = 'dead'; render(); return;
  }
  const isBoss = b.enemies.some(e => e.def.boss);
  const isElite = b.enemies.some(e => e.def.elite);
  const gold = isBoss ? randInt(90, 120) : isElite ? randInt(40, 60) : randInt(18, 30);
  const xp = isBoss ? 40 : isElite ? 22 : 10;
  G.gold += gold; G.goldEarned += gold;
  G.kills += b.enemies.length;
  gainXp(xp);
  let relicName = null;
  if (isBoss || isElite) { relicName = grantRandomRelic(); }
  G.b = null;
  G.pendingReward = { gold, xp, relicName, isBoss, isElite, choices: pickCardChoices(3) };
  G.screen = 'reward';
  SFX.play('win');
  render();
}
async function endTurn() {
  const b = G.b;
  if (!b || b.busy || b.over) return;
  b.busy = true; b.sel = null;
  b.discardPile.push(...b.hand); b.hand = [];
  decDebuffs(b.p);
  render();
  await sleep(260);
  for (const e of b.enemies) {
    if (e.hp <= 0 || b.p.hp <= 0 || b.over) break;
    tickStart(e);
    if (e.hp <= 0) { render(); await sleep(250); continue; }
    await enemyAct(e);
    checkEnd();
    if (b.over || b.p.hp <= 0) return;
    await sleep(200);
  }
  checkEnd();
  if (b.over || b.p.hp <= 0) return;
  await startPlayerTurn();
  b.busy = false; render();
}
async function enemyAct(e) {
  const b = G.b;
  const it = e.def.intents[e.ii % e.def.intents.length];
  e.ii++;
  const el = () => document.getElementById('en-' + e.slot);
  switch (it.t) {
    case 'attack': {
      const times = it.times || 1;
      for (let i = 0; i < times; i++) {
        if (e.hp <= 0 || b.p.hp <= 0) break;
        const node = el(); if (node) node.classList.add('lunge');
        await sleep(300);
        dealDamage(e, b.p, it.v || 0);
        pushLog(`${e.def.name} 发动攻击！`);
        render(); await animateFX(); checkEnd();
        if (b.over || b.p.hp <= 0) return;
        await sleep(180);
      }
      break;
    }
    case 'block': e.block += it.v; FX.push({ host: hostOf(e), text: '🛡+' + it.v, cls: 'fblk' }); pushLog(`${e.def.name} 摆出了防御姿态`); render(); await animateFX(); break;
    case 'buff': addBuff(e, it.buff, it.value, 'enemy'); pushLog(`${e.def.name} 获得了 ${BUFFS[it.buff].name}`); render(); await sleep(320); break;
    case 'debuff': addBuff(b.p, it.buff, it.value, 'enemy'); pushLog(`${e.def.name} 对你施加了 ${BUFFS[it.buff].name}`); render(); await animateFX(); break;
    case 'heal': e.hp = Math.min(e.maxHp, e.hp + it.v); FX.push({ host: hostOf(e), text: '+' + it.v, cls: 'fheal' }); pushLog(`${e.def.name} 恢复了生命`); render(); await animateFX(); break;
    case 'wait': pushLog(`${e.def.name} 正在酝酿可怕的攻击……`); render(); await sleep(420); break;
  }
  decDebuffs(e);
}
function applyTurnEnergy(b) { // 回合开始能量：基础 + 充能 buff
  b.energy = b.maxEnergy;
  if (b.p.buffs.charge) b.energy += b.p.buffs.charge;
}
async function startPlayerTurn() {
  const b = G.b;
  b.turn++;
  tickStart(b.p);
  render(); await animateFX();
  if (b.p.hp <= 0) { checkEnd(); return; }
  if (!b.p.buffs.barricade) b.p.block = 0;
  applyTurnEnergy(b);
  fireRelics('turnStart');
  drawCards(5);
  b.busy = false;
  render();
}

/* ================================================================
   地图生成（三幕，每幕 8 层 + Boss，分支路径）
   ================================================================ */
function genMap(act) {
  const ROWS = 6 + rand(4);                       // 每幕 6-9 层随机，每局结构都不同
  const rows = [];
  for (let r = 0; r < ROWS; r++) {
    const n = r === 0 ? 2 + rand(2) : 2 + rand(4); // 首行 2-3 个节点，其余 2-5 个
    const row = [];
    for (let i = 0; i < n; i++) row.push({ t: 'battle', edges: [] });
    rows.push(row);
  }
  // 节点类型：权重随机 + 约束（首行全战斗；精英不早于第 3 层且后半程更多；
  // 商店/宝箱每幕上限 2 个；营地后半程更密集）
  let shopCount = 0, restCount = 0, treasureCount = 0;
  for (let r = 1; r < ROWS; r++) {
    const late = r >= ROWS - 3;
    for (const node of rows[r]) {
      const roll = Math.random();
      const eliteW = r >= 2 ? (late ? 0.20 : 0.10) : 0;
      const restW = r >= 2 ? (late ? 0.22 : 0.12) : 0.04;
      let t = 'battle';
      if (roll < 0.13) t = 'event';
      else if (roll < 0.21 && treasureCount < 2) { t = 'treasure'; treasureCount++; }
      else if (roll < 0.21 + eliteW && r >= 2) t = 'elite';
      else if (roll < 0.21 + eliteW + 0.09 && shopCount < 2) { t = 'shop'; shopCount++; }
      else if (roll < 0.21 + eliteW + 0.09 + restW && restCount < 3) { t = 'rest'; restCount++; }
      node.t = t;
    }
  }
  // 约束：Boss 前最后一行必有一个营地；全图至少一个营地
  if (!rows[ROWS - 1].some(n => n.t === 'rest')) choice(rows[ROWS - 1]).t = 'rest';
  if (restCount === 0) choice(rows[Math.max(1, ROWS - 2 - rand(Math.max(1, ROWS - 3)))]).t = 'rest';
  // 连边：每个节点连向下层基准列附近的 1-3 列（可跨 2 列交叉），路径更自然
  for (let r = 0; r < ROWS - 1; r++) {
    const cur = rows[r], nxt = rows[r + 1];
    cur.forEach((node, i) => {
      const p = cur.length > 1 ? i / (cur.length - 1) : 0.5;
      const base = clamp(Math.round(p * (nxt.length - 1)), 0, nxt.length - 1);
      const set = new Set([base]);
      const extra = 1 + (Math.random() < 0.4 ? 1 : 0);
      for (let k = 0; k < extra; k++) {
        const spread = 1 + rand(2);
        set.add(clamp(base + (Math.random() < 0.5 ? -spread : spread), 0, nxt.length - 1));
      }
      set.forEach(j => node.edges.push(j));
    });
    // 兜底：保证下层每个节点都有入边（连通性）
    nxt.forEach((_, j) => {
      if (!cur.some(nd => nd.edges.includes(j))) {
        const src = cur[clamp(Math.round(j / Math.max(1, nxt.length - 1) * (cur.length - 1)), 0, cur.length - 1)];
        src.edges.push(j);
      }
    });
  }
  rows.push([{ t: 'boss', edges: [] }]);
  // 最后一层普通节点全部连向首领，确保每幕都能挑战 Boss
  rows[ROWS - 1].forEach(n => n.edges.push(0));
  return rows;
}

const NODE_ICON = { battle: '⚔️', elite: '👹', event: '❓', shop: '🛒', rest: '🔥', treasure: '🎁', boss: '👑' };
const NODE_NAME = { battle: '战斗', elite: '精英', event: '事件', shop: '商店', rest: '营地', treasure: '宝箱', boss: '首领' };

function availNodes() {
  if (G.row < 0) return G.mapRows[0].map((_, i) => i);
  const node = G.mapRows[G.row] && G.mapRows[G.row][G.pos];
  return node ? node.edges : [];
}
function enterNode(r, i) {
  const node = G.mapRows[r][i];
  G.curRow = r; G.curPos = i;
  if (node.t === 'battle') startBattle(choice(ENCOUNTERS[G.act].mobs));
  else if (node.t === 'elite') startBattle(choice(ENCOUNTERS[G.act].elites));
  else if (node.t === 'boss') startBattle(ENCOUNTERS[G.act].boss);
  else if (node.t === 'shop') { genShop(); G.screen = 'shop'; render(); }
  else if (node.t === 'rest') { G.restDone = false; G.screen = 'rest'; render(); }
  else if (node.t === 'event') { G.curEvent = choice(EVENTS); G.evResult = null; G.screen = 'event'; render(); }
  else if (node.t === 'treasure') {
    const gold = randInt(25, 45);
    G.gold += gold;
    const rel = grantRandomRelic();
    toast('🎁 宝箱：💰 +' + gold + (rel ? ' · 🟡 遗物「' + rel + '」' : ''));
    completeNode();
    return;
  }
}
function completeNode() {
  if (G.curRow == null) { G.curRow = G.row; G.curPos = G.pos; } // 兜底：战斗未经理由 enterNode 进入时
  G.row = G.curRow; G.pos = G.curPos;
  if (G.mapRows[G.row][G.pos].t === 'boss') {
    if (G.act >= 3) { clearSave(); recordsEnd(true); SFX.play('win'); G.screen = 'win'; render(); return; }
    G.act++;
    G.mapRows = genMap(G.act);
    G.row = -1; G.pos = -1;
    G.hp = Math.min(G.maxHp, G.hp + 15);
    toast(`🕯️ 进入${ACT_NAME[G.act]}！生命 +15`);
  }
  if (G.pendingLevels > 0) { // 有待领取的升级强化，先进入升级选择
    rollLevelChoices();
    saveRun();
    G.screen = 'levelup';
    render();
    return;
  }
  saveRun();
  G.screen = 'map'; render();
}

/* ---------------- 奖励 / 商店 / 休息 / 事件辅助 ---------------- */
function pickCardChoices(n) {
  const out = [];
  const isBoss = G.pendingReward && G.pendingReward.isBoss;
  const isElite = G.pendingReward && G.pendingReward.isElite;
  for (let i = 0; i < n; i++) {
    const roll = Math.random();
    let rar = 'common';
    const cCut = isBoss ? 0.45 : isElite ? 0.5 : 0.62;
    const uCut = isBoss ? 0.85 : isElite ? 0.88 : 0.92;
    if (roll >= uCut) rar = 'rare'; else if (roll >= cCut) rar = 'uncommon';
    // 同一批奖励不出现重复卡牌（符合常规卡牌奖励规则）
    let pool = CARDS.filter(c => c.rarity === rar && !out.includes(c.id));
    if (!pool.length) pool = CARDS.filter(c => c.rarity === rar);
    if (!pool.length) pool = CARDS;
    out.push(choice(pool).id);
  }
  return out;
}
function grantRandomRelic() {
  const pool = RELICS.filter(r => !G.relics.includes(r.id));
  if (!pool.length) return null;
  const r = choice(pool);
  gainRelic(r.id);
  return r.name;
}
function gainRelic(id) {
  G.relics.push(id);
  const d = RELIC_BY[id];
  if (d && d.fx) {
    if (d.fx.t === 'maxHp') { G.maxHp += d.fx.v; if (d.fx.heal) G.hp += d.fx.heal; G.hp = Math.min(G.hp, G.maxHp); }
    if (d.fx.t === 'energy') G.maxEnergy += 1;
    if (d.fx.costHp) { G.maxHp -= d.fx.costHp; G.hp = Math.min(G.hp, G.maxHp); }
  }
  SFX.play('coin');
  toast('🟡 获得遗物「' + (d ? d.name : id) + '」');
}
function healPlayer(n) { G.hp = Math.min(G.maxHp, G.hp + n); }
function dmgPlayer(n) { G.hp = Math.max(1, G.hp - n); }
function addRandomCard(rar) { const c = mkCard(choice(CARDS.filter(x => x.rarity === rar)).id); G.deck.push(c); return c.name; }
function removeRandomCard() { if (!G.deck.length) return null; const c = G.deck.splice(rand(G.deck.length), 1)[0]; return c.name; }
function upgradeRandomCard() {
  const pool = G.deck.filter(c => !c.upgraded);
  if (!pool.length) return null;
  const inst = choice(pool);
  const up = upgradedCard(CARD_BY_ID[inst.id]);
  up.uid = inst.uid;
  G.deck.splice(G.deck.indexOf(inst), 1, up);
  return up.name;
}
function genShop() {
  const cards = [];
  for (let i = 0; i < 5; i++) {
    const roll = Math.random();
    const rar = roll < 0.55 ? 'common' : roll < 0.87 ? 'uncommon' : 'rare';
    cards.push({ id: choice(CARDS.filter(c => c.rarity === rar)).id, sold: false });
  }
  const relicPool = shuffle(RELICS.filter(r => !G.relics.includes(r.id))).slice(0, 2);
  G.shopStock = {
    cards: cards.map(c => Object.assign(c, { price: c.rarity === 'common' ? randInt(45, 60) : c.rarity === 'uncommon' ? randInt(68, 85) : randInt(100, 125) })),
    relics: relicPool.map(r => ({ id: r.id, price: r.rar === 'common' ? randInt(120, 150) : r.rar === 'uncommon' ? randInt(155, 185) : randInt(195, 240), sold: false })),
    removeUsed: false,
  };
}
