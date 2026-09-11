"use strict";
/* 界面渲染与交互（UI 命名空间供 inline onclick 调用） */

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => t.classList.remove('on'), 2000);
}
function openModal(html) { $('#mbox').innerHTML = html; $('#modal').classList.add('on'); }
function closeModal() { $('#modal').classList.remove('on'); }

const RAR_STARS = { common: 1, uncommon: 2, rare: 3 };
function cardHTML(c, cls = '', clickable = false, extra = '') {
  const typeIcon = c.type === 'attack' ? '⚔️' : c.type === 'skill' ? '🛡️' : '✦';
  const stars = RAR_STARS[c.rarity] + (c.upgraded ? 1 : 0);
  const starTitle = '稀有度：' + (RARITY_NAME[c.rarity] || '') + (c.upgraded ? '（已升级）' : '');
  return `<div class="hcard r-${c.rarity} ${cls} ${clickable ? 'clickable' : ''}" ${extra}>
    <div class="c-cost">${c.cost}</div>
    <div class="c-stars ${c.upgraded ? 'up' : ''}" title="${starTitle}">${'★'.repeat(stars)}</div>
    <div class="c-name">${esc(c.name)}</div>
    <div class="c-type">${typeIcon} ${TYPE_NAME[c.type]}</div>
    <div class="c-desc">${c.desc}</div>
    ${c.exhaust ? '<div class="c-exh">消耗</div>' : ''}
  </div>`;
}
function buffChips(buffs) {
  return Object.entries(buffs).filter(([, v]) => v > 0).map(([k, v]) => {
    const d = BUFFS[k];
    return `<span class="buff ${d.good ? 'g' : 'b'}" title="${d.name}：${d.desc}">${d.icon}${d.name}${v}</span>`;
  }).join('');
}
function intentHTML(e) {
  const it = e.def.intents[e.ii % e.def.intents.length];
  const name = BUFFS[it.buff] ? BUFFS[it.buff].name : '';
  switch (it.t) {
    case 'attack': {
      const d = calcAttackDamage(e, G.b.p, it.v);
      return `⚔️ ${d}${(it.times || 1) > 1 ? '×' + it.times : ''}`;
    }
    case 'block': return `🛡️ ${it.v}`;
    case 'buff': return `⬆️ ${name}`;
    case 'debuff': return `⬇️ ${name}`;
    case 'heal': return `💗 ${it.v}`;
    case 'wait': return '⏳ 蓄力';
  }
  return '❓';
}

function renderTopbar() {
  const tb = $('#topbar');
  if (['title', 'dead', 'win', 'selftest'].includes(G.screen)) { tb.classList.remove('on'); return; }
  tb.classList.add('on');
  const floor = G.row < 0 ? 1 : G.row + 2;
  tb.innerHTML = `
    <div class="tb-hp">❤️<div class="hpbar"><i style="width:${(G.hp / G.maxHp * 100).toFixed(1)}%"></i></div><span>${G.hp}/${G.maxHp}</span></div>
    <span class="tb-item">💰<b>${G.gold}</b></span>
    <span class="tb-item hide-m">${esc(ACT_NAME[G.act])}</span>
    <span class="tb-item">第 ${floor}/9 层</span>
    <span class="tb-item" title="战斗胜利获得经验，升级可强化基础属性">Lv.<b>${G.level}</b><span class="hide-m"> ✨${G.xp}/${xpNeed(G.level)}</span></span>
    <span class="tb-spacer"></span>
    <button class="tb-btn" onclick="UI.relicView()" title="遗物">🟡 ${G.relics.length}</button>
    <button class="tb-btn" onclick="UI.deckView()" title="牌组">📜 ${G.deck.length}</button>
    <button class="tb-btn" onclick="UI.toggleMute()" title="音效开关">${SFX.muted ? '🔇' : '🔊'}</button>
    <button class="tb-btn" onclick="UI.confirmQuit()">🏠</button>`;
}
function renderMap() {
  const avail = new Set(availNodes().map(String));
  let rows = '';
  G.mapRows.forEach((row, r) => {
    const items = row.map((n, i) => {
      const isDone = r < G.row || (r === G.row && i === G.pos);
      const isCur = r === G.row && i === G.pos;
      const isAvail = !isDone && !isCur && (G.row < 0 ? r === 0 : r === G.row + 1) && avail.has(String(i));
      const st = isCur ? 'cur' : isDone ? 'done' : isAvail ? 'avail' : 'locked';
      return `<button class="mnode ${st}" data-key="${r},${i}" ${isAvail ? `onclick="UI.node(${r},${i})"` : 'disabled'}>${NODE_ICON[n.t]}<span class="mlabel">${NODE_NAME[n.t]}</span></button>`;
    }).join('');
    rows += `<div class="mrow">${items}</div>`;
  });
  const floor = G.row < 0 ? '出发！选择你的第一场战斗' : '选择下一个节点';
  $('#stage').innerHTML = `
    <div class="map-screen">
      <div class="map-title">${esc(ACT_NAME[G.act])}</div>
      <div id="mapwrap"><svg id="maplines"></svg>${rows}</div>
      <div class="map-hint">${floor}</div>
    </div>`;
  requestAnimationFrame(drawMapLines);
}
function drawMapLines() {
  const wrap = $('#mapwrap'); if (!wrap) return;
  const svg = $('#maplines'); if (!svg) return;
  const wr = wrap.getBoundingClientRect();
  let lines = '';
  G.mapRows.forEach((row, r) => {
    if (r >= G.mapRows.length - 1) return;
    row.forEach((node, i) => {
      const from = document.querySelector(`.mnode[data-key="${r},${i}"]`);
      if (!from) return;
      (node.edges || []).forEach(j => {
        const to = document.querySelector(`.mnode[data-key="${r + 1},${j}"]`);
        if (!to) return;
        const a = from.getBoundingClientRect(), b2 = to.getBoundingClientRect();
        lines += `<line x1="${a.left + a.width / 2 - wr.left}" y1="${a.top + a.height / 2 - wr.top}" x2="${b2.left + b2.width / 2 - wr.left}" y2="${b2.top + b2.height / 2 - wr.top}"/>`;
      });
    });
  });
  svg.setAttribute('viewBox', `0 0 ${wr.width} ${wr.height}`);
  svg.innerHTML = lines;
}
function renderBattle() {
  const b = G.b;
  const enemies = b.enemies.map(e => {
    const targetable = b.sel != null && e.hp > 0;
    return `<div class="enemy ${e.hp <= 0 ? 'dead' : ''} ${targetable ? 't' : ''}" id="en-${e.slot}" ${targetable ? `onclick="UI.hitEnemy(${e.slot})"` : ''}>
      ${e.hp > 0 ? `<div class="intent">${intentHTML(e)}</div>` : ''}
      ${creatureSVG(e.def.art)}
      <div class="ehp"><div class="hpbar"><i style="width:${(e.hp / e.maxHp * 100).toFixed(1)}%"></i></div><span>${e.hp}/${e.maxHp}</span>${e.block > 0 ? `<span class="blkchip">🛡${e.block}</span>` : ''}</div>
      <div class="ebuffs">${buffChips(e.buffs)}</div>
    </div>`;
  }).join('');
  const hand = b.hand.map((uid, i) => {
    const c = b.cardByUid[uid];
    const dis = c.cost > b.energy ? 'dis' : '';
    return cardHTML(c, `handcard ${dis} ${b.sel === i ? 'selected' : ''}`, true, `data-hand="${i}" onclick="UI.cardClick(${i})"`);
  }).join('');
  const hint = b.sel != null ? `<span style="color:var(--gold)">👆 点击一名敌人出牌（再点卡牌取消）</span>` : `<span class="hint-pc">桌面端：<span class="kbd">1-9</span> 出牌 · <span class="kbd">E</span> 结束回合 · <span class="kbd">D</span> 牌组</span><span class="hint-m">👆 点卡牌出牌 · 带剑标的牌需再点一名敌人</span>`;
  $('#stage').innerHTML = `
    <div class="battle">
      <div class="benemies">${enemies}</div>
      <div class="blog">${b.log.map(esc).join('<br>')}</div>
      <div class="bplayer" id="p-panel">
        <div class="pavatar">${HERO_SVG}</div>
        <div class="pmeta">
          <div class="pname">冒险者</div>
          <div class="hpbar"><i style="width:${(b.p.hp / b.p.maxHp * 100).toFixed(1)}%"></i></div>
          <div class="pnum">❤️ ${b.p.hp}/${b.p.maxHp}　💰 ${G.gold}　🃏 抽牌堆 ${b.drawPile.length} / 弃牌 ${b.discardPile.length}${b.exhaustPile.length ? ' / 消耗 ' + b.exhaustPile.length : ''}</div>
        </div>
        <div class="pbuffs">${b.p.block > 0 ? `<span class="blkchip">🛡${b.p.block}</span>` : ''}${buffChips(b.p.buffs)}</div>
      </div>
      <div class="bhand">
        <div class="energyorb ${b.energy >= b.maxEnergy ? 'full' : ''}"><b>${b.energy}</b><span>/${b.maxEnergy}</span></div>
        <div class="handwrap" id="hand">${hand || '<div style="color:var(--dim);align-self:center">手牌已空</div>'}</div>
        <div class="bctl">
          <button class="endturn" onclick="UI.endTurn()" ${b.busy ? 'disabled' : ''}>结束回合</button>
          <button class="pile" onclick="UI.pile('draw')">🂠 抽牌堆 ${b.drawPile.length}</button>
          <button class="pile" onclick="UI.pile('discard')">🗑 弃牌堆 ${b.discardPile.length}</button>
        </div>
      </div>
      <div style="text-align:center;font-size:11px;color:var(--dim);padding:0 0 6px">${hint}</div>
    </div>`;
}
function renderReward() {
  const r = G.pendingReward;
  const cards = pickCardChoices(3);
  G.pendingReward.choices = cards;
  $('#stage').innerHTML = `
    <div class="panel-screen">
      <h2>⚔️ 战斗胜利！</h2>
      <div class="panel-box" style="text-align:center">
        <div class="gold-big">💰 获得 ${r.gold} 金币 · ✨ 获得 ${r.xp || 0} 经验</div>
        ${r.relicName ? `<div style="margin-top:8px"><span class="relic-tag">🟡 遗物：${esc(r.relicName)}</span></div>` : ''}
        <p style="color:var(--dim);margin:10px 0 4px">选择一张卡牌加入你的牌组：</p>
        <div class="reward-cards">${cards.map(id => cardHTML(CARD_BY_ID[id], 'mini clickable', true, `onclick="UI.takeCard('${id}')"`)).join('')}</div>
        <button class="btn ghost skipbtn" onclick="UI.skipReward()">跳过 ✋</button>
      </div>
    </div>`;
}
function renderLevelUp() {
  const opts = G.levelChoices || [];
  $('#stage').innerHTML = `
    <div class="panel-screen" style="justify-content:center">
      <h2>🎉 升级！Lv.${G.level}</h2>
      <div class="panel-box" style="text-align:center">
        <p style="color:var(--dim);line-height:1.8">战斗经验让你的冒险者变得更强。<br>选择一项<b style="color:var(--gold)">永久强化</b>（基础属性在整局冒险中生效）：</p>
        <div class="event-opts" style="max-width:480px;margin:14px auto 0">
          ${opts.map((o, i) => `<button class="btn ghost" onclick="UI.chooseLevelUp(${i})">${o.icon} <b>${esc(o.name)}</b>　${esc(o.desc)}</button>`).join('')}
        </div>
        ${G.pendingLevels > 1 ? `<p style="color:var(--gold);margin-top:12px">还有 ${G.pendingLevels - 1} 次升级待选择</p>` : ''}
      </div>
    </div>`;
}
function renderShop() {
  const s = G.shopStock;
  const cardItems = s.cards.filter(c => !c.sold).map(c => `
    <div class="shop-item">${cardHTML(CARD_BY_ID[c.id], 'tiny')}
      <span class="price">💰 ${c.price}</span>
      <button class="btn ghost" onclick="UI.buyCard(${s.cards.indexOf(c)})" ${G.gold < c.price ? 'disabled' : ''}>购买</button>
    </div>`).join('');
  const relicItems = s.relics.filter(c => !c.sold).map(r => {
    const d = RELIC_BY[r.id];
    return `<div class="shop-item">
      <span class="relic-tag">${RELIC_ICON[d.rar]} ${esc(d.name)}</span>
      <span style="color:var(--dim);font-size:12px">${esc(d.desc)}</span>
      <span class="price">💰 ${r.price}</span>
      <button class="btn ghost" onclick="UI.buyRelic(${s.relics.indexOf(r)})" ${G.gold < r.price ? 'disabled' : ''}>购买</button>
    </div>`;
  }).join('');
  $('#stage').innerHTML = `
    <div class="panel-screen">
      <h2>🛒 尖塔商铺</h2>
      <div class="gold-big">💰 ${G.gold}　<span style="color:var(--dim);font-size:13px">（删卡服务：💰 ${G.removeCost}）</span></div>
      <div class="panel-box"><h3 style="margin-bottom:8px">卡牌</h3>${cardItems || '<p style="color:var(--dim);text-align:center">已售罄</p>'}</div>
      <div class="panel-box"><h3 style="margin-bottom:8px">遗物</h3>${relicItems || '<p style="color:var(--dim);text-align:center">已售罄</p>'}</div>
      <div class="panel-box"><div class="shop-item">
        <span>✂️ <b>删卡服务</b>：从牌组中移除一张卡</span>
        <span class="price">💰 ${G.removeCost}</span>
        <button class="btn ghost" onclick="UI.removeService()" ${G.gold < G.removeCost || s.removeUsed ? 'disabled' : ''}>${s.removeUsed ? '已使用' : '使用'}</button>
      </div></div>
      <button class="btn" onclick="UI.leaveShop()">离开商店 →</button>
    </div>`;
}
function renderRest() {
  const healAmt = Math.ceil(G.maxHp * 0.3);
  $('#stage').innerHTML = `
    <div class="panel-screen">
      <h2>🔥 营地休整</h2>
      <div class="panel-box" style="text-align:center">
        <p style="color:var(--dim);line-height:1.7">篝火噼啪作响。短暂休整，为攀爬下一层做准备。<br>（本层营地只能选择一项）</p>
        <div class="event-opts" style="max-width:420px;margin:14px auto 0">
          <button class="btn" onclick="UI.restHeal()">💤 休息（回复 ${healAmt} 生命）</button>
          <button class="btn ghost" onclick="UI.restUpgrade()">⚒️ 锻造（升级一张卡牌）</button>
        </div>
      </div>
    </div>`;
}
function renderEvent() {
  const ev = G.curEvent;
  if (G.evResult) {
    $('#stage').innerHTML = `
      <div class="panel-screen">
        <h2>${ev.icon} ${esc(ev.name)}</h2>
        <div class="panel-box">
          <div class="event-result">${G.evResult}</div>
          <div style="text-align:center;margin-top:14px"><button class="btn" onclick="UI.finishEvent()">继续 →</button></div>
        </div>
      </div>`;
    return;
  }
  const opts = ev.opts.map((o, i) => {
    const ok = !o.need || o.need(G.gold);
    return `<button class="btn ghost" onclick="UI.eventOpt(${i})" ${ok ? '' : 'disabled'}>${esc(o.label)}${ok ? '' : '（金币不足）'}</button>`;
  }).join('');
  $('#stage').innerHTML = `
    <div class="panel-screen">
      <h2>${ev.icon} ${esc(ev.name)}</h2>
      <div class="panel-box">
        <div class="event-icon">${ev.icon}</div>
        <p class="event-text" style="text-align:center">${esc(ev.text)}</p>
        <div class="event-opts">${opts}</div>
      </div>
    </div>`;
}
function renderEnd(win) {
  const rec = loadRecords();
  $('#stage').innerHTML = `
    <div class="panel-screen" style="justify-content:center">
      <h2 style="font-size:34px">${win ? '🏆 通关！' : '💀 远征失败'}</h2>
      <div class="panel-box" style="text-align:center;max-width:460px">
        <p style="line-height:2">${win ? '你击败了塔主·湮灭者，尖塔的传说将由你书写！' : '尖塔吞噬了又一位挑战者……但传说不会终结。'}</p>
        <p style="color:var(--dim);margin-top:8px">Lv.${G.level} · 抵达：${esc(ACT_NAME[G.act])} · 击杀：${G.kills} · 获得金币：${G.goldEarned}</p>
        <p style="color:var(--dim)">遗物收集：${G.relics.length} 件 · 卡组规模：${G.deck.length} 张</p>
        <p style="color:var(--dim)">总场次 ${rec.runs} · 通关 ${rec.wins} 次</p>
        <button class="btn" style="margin-top:14px" onclick="UI.toTitle()">返回主菜单</button>
      </div>
    </div>`;
}
function renderTitle() {
  const rec = loadRecords();
  let hasSave = false, prog = null;
  try { prog = JSON.parse(localStorage.getItem(LS_SAVE)); hasSave = !!prog; } catch (e) {}
  $('#stage').innerHTML = `
    <div class="tscreen-bg">
      <svg class="tspire" width="420" height="300" viewBox="0 0 420 300">
        <polygon points="200,20 250,300 150,300" fill="#241c3e"/>
        <polygon points="200,20 214,60 186,60" fill="#3a2f5c"/>
        <rect x="192" y="100" width="16" height="12" fill="#0d0a18"/>
        <rect x="188" y="170" width="24" height="14" fill="#0d0a18"/>
        <circle cx="205" cy="14" r="4" fill="#e8b84b"/>
      </svg>
    </div>
    <div class="title-screen">
      <h1>尖塔构筑者</h1>
      <div class="sub">SPIRE BUILDER · ROGUELIKE DECKBUILDER</div>
      <div class="title-menu">
        ${hasSave ? `<button class="btn" onclick="UI.continueRun()">▶ 继续冒险</button>
        <div class="title-progress">第 ${prog.act} 幕 · ❤️ ${prog.hp}/${prog.maxHp} · 💰 ${prog.gold} · 🃏 ${prog.deck.length} 张</div>` : ''}
        <button class="btn ${hasSave ? 'ghost' : ''}" onclick="UI.newRun()">⚔️ 新的远征</button>
        <button class="btn ghost" onclick="UI.howto()">📖 玩法说明</button>
        <button class="btn ghost" onclick="UI.allCards()">🃏 卡牌图鉴</button>
      </div>
      <div class="title-stats">总场次 ${rec.runs} · 通关 ${rec.wins} 次</div>
    </div>`;
}
function renderSelftest() {
  const results = runSelfTests();
  G.screen = 'selftest'; // 测试中的 startBattle 会改写 G.screen，渲染面板前复位
  const ok = results.filter(r => r.ok).length;
  $('#stage').innerHTML = `
    <div class="selftest">
      <h2 style="text-align:center;margin-bottom:14px">🧪 自测套件 ${ok}/${results.length} 通过</h2>
      ${results.map(r => `<div class="st-row ${r.ok ? 'st-ok' : 'st-fail'}">${r.ok ? '✅' : '❌'} ${esc(r.name)}${r.msg ? ' —— ' + esc(r.msg) : ''}</div>`).join('')}
      <div style="text-align:center;margin-top:16px"><button class="btn ghost" onclick="location.href=location.pathname">返回游戏</button></div>
    </div>`;
}
function render() {
  renderTopbar();
  switch (G.screen) {
    case 'title': renderTitle(); break;
    case 'map': renderMap(); break;
    case 'battle': renderBattle(); break;
    case 'reward': renderReward(); break;
    case 'levelup': renderLevelUp(); break;
    case 'shop': renderShop(); break;
    case 'rest': renderRest(); break;
    case 'event': renderEvent(); break;
    case 'dead': renderEnd(false); break;
    case 'win': renderEnd(true); break;
    case 'selftest': renderSelftest(); break;
  }
}

/* ================================================================
   交互（UI 命名空间，供 inline onclick 调用）
   ================================================================ */
const UI = {
  node: (r, i) => enterNode(r, i),
  cardClick(i) {
    const b = G.b; if (!b || b.busy || b.over) return;
    const uid = b.hand[i]; if (uid == null) return;
    tryPlay(i, null);
  },
  hitEnemy(slot) {
    const b = G.b; if (!b || b.sel == null) return;
    const e = b.enemies[slot];
    tryPlay(b.sel, e);
  },
  endTurn: () => endTurn(),
  pile(kind) {
    const b = G.b; if (!b) return;
    const uids = kind === 'draw' ? b.drawPile : b.discardPile;
    const cards = uids.map(u => b.cardByUid[u]);
    openModal(`<h3>${kind === 'draw' ? '🂠 抽牌堆' : '🗑 弃牌堆'}（${cards.length}）</h3>
      <div class="deckgrid">${cards.map(c => cardHTML(c, 'tiny')).join('') || '<p style="color:var(--dim)">空</p>'}</div>
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">关闭</button></div>`);
  },
  deckView() {
    openModal(`<h3>📜 你的牌组（${G.deck.length} 张）</h3>
      <div class="deckgrid">${G.deck.map(c => cardHTML(c, 'tiny')).join('')}</div>
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">关闭</button></div>`);
  },
  relicView() {
    const list = G.relics.map(id => RELIC_BY[id]).filter(Boolean);
    openModal(`<h3>🟡 遗物收藏（${list.length}）</h3>
      ${list.length ? `<div class="relic-grid" style="flex-direction:column">${list.map(d => `
        <div class="relic-row"><span class="rname">${RELIC_ICON[d.rar]} ${esc(d.name)}</span><span class="rdesc">${esc(d.desc)}</span></div>`).join('')}</div>`
        : '<p style="color:var(--dim);text-align:center">尚未获得遗物。精英与首领掉落遗物，商店亦有出售。</p>'}
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">关闭</button></div>`);
  },
  allCards(rar) {
    UI._codexRar = rar || UI._codexRar || 'all';
    const tabs = [['all', '全部'], ['common', '普通'], ['uncommon', '罕见'], ['rare', '稀有']];
    const cur = UI._codexRar;
    const list = CARDS.filter(c => cur === 'all' || c.rarity === cur);
    openModal(`<h3>🃏 卡牌图鉴（${list.length} 张）</h3>
      <div class="ftabs">${tabs.map(([k, n]) =>
        `<button class="${cur === k ? 'on' : ''}" onclick="UI.allCards('${k}')">${n}</button>`).join('')}</div>
      <div class="deckgrid">${list.map(c => cardHTML(c, 'tiny')).join('')}</div>
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">关闭</button></div>`);
  },
  toggleMute() { SFX.toggle(); renderTopbar(); },
  howto() {
    openModal(`<h3>📖 玩法说明</h3>
      <div style="line-height:2;font-size:14px;color:#d8d0ee">
        <p>🃏 每回合抽 5 张牌、有 3 点能量，出牌消耗能量；能量不足的牌会自动置灰。</p>
        <p>🛡️ <b>格挡</b>抵挡伤害，回合开始清空；敌人头顶显示<b>意图</b>（攻击/防御/增益…）。</p>
        <p>👆 需要指定敌人的卡牌：先点卡牌、再点敌人；其余卡牌点击直接生效。</p>
        <p>🗺️ 三幕分支地图：战斗 / 精英 / 事件 / 商店 / 营地 / 首领。精英与首领掉落遗物（顶栏 🟡 可随时查看收藏）。</p>
        <p>🔥 营地可回复生命或升级卡牌；💰 商店可购买卡牌、遗物与删卡服务。</p>
        <p>🏆 击败第三幕首领即可通关。进度自动保存，随时可继续。</p>
        <p style="color:var(--dim)">桌面端快捷键：<span class="kbd">1-9</span> 出牌 · <span class="kbd">E</span> 结束回合 · <span class="kbd">D</span> 牌组</p>
      </div>
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">知道了</button></div>`);
  },
  closeModal,
  newRun() {
    const rec = loadRecords(); rec.runs++; saveRecords(rec);
    Object.assign(G, { screen: 'map', act: 1, row: -1, pos: -1, hp: 80, maxHp: 80, gold: 99,
      deck: [], relics: [], mapRows: genMap(1), removeCost: 75, kills: 0, goldEarned: 0,
      maxEnergy: 3, b: null, shopStock: null, curEvent: null, evResult: null, pendingReward: null,
      level: 1, xp: 0, pendingLevels: 0, levelChoices: null, lvlEnergyTaken: false,
      baseStrength: 0, baseDexterity: 0, baseBlock: 0 });
    for (const id of ['strike', 'strike', 'strike', 'strike', 'strike', 'defend', 'defend', 'defend', 'defend', 'bash']) G.deck.push(mkCard(id));
    saveRun(); render();
  },
  continueRun() {
    if (loadRun()) {
      if (G.pendingLevels > 0) { rollLevelChoices(); G.screen = 'levelup'; } // 存档停在升级选择
      else G.screen = 'map';
      G.b = null; render();
    } else toast('存档读取失败');
  },
  confirmQuit() {
    openModal(`<h3>返回主菜单？</h3><p style="color:var(--dim)">当前进度已自动保存，之后可以继续冒险。</p>
      <div style="text-align:center;margin-top:14px"><button class="btn" onclick="UI.quitNow()">返回主菜单</button> <button class="btn ghost" onclick="UI.closeModal()">取消</button></div>`);
  },
  quitNow() { saveRun(); closeModal(); G.screen = 'title'; G.b = null; render(); },
  takeCard(id) { SFX.play('coin'); G.deck.push(mkCard(id)); G.pendingReward = null; completeNode(); },
  skipReward() { G.pendingReward = null; completeNode(); },
  buyCard(i) {
    const c = G.shopStock.cards[i];
    if (!c || c.sold || G.gold < c.price) return;
    G.gold -= c.price; c.sold = true;
    G.deck.push(mkCard(c.id));
    SFX.play('coin');
    toast('🛒 购买了「' + CARD_BY_ID[c.id].name + '」');
    saveRun(); render();
  },
  buyRelic(i) {
    const r = G.shopStock.relics[i];
    if (!r || r.sold || G.gold < r.price) return;
    G.gold -= r.price; r.sold = true;
    gainRelic(r.id);
    saveRun(); render();
  },
  removeService() {
    if (G.shopStock.removeUsed || G.gold < G.removeCost) return;
    openModal(`<h3>✂️ 选择要移除的卡牌（💰 ${G.removeCost}）</h3>
      <div class="deckgrid">${G.deck.map((c, i) => cardHTML(c, 'tiny clickable', true, `onclick="UI.doRemove(${i})"`)).join('')}</div>
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">取消</button></div>`);
  },
  doRemove(i) {
    if (G.shopStock.removeUsed || G.gold < G.removeCost) return;
    G.gold -= G.removeCost;
    G.removeCost += 25;
    G.shopStock.removeUsed = true;
    const name = G.deck.splice(i, 1)[0].name;
    toast('✂️ 移除了「' + name + '」');
    closeModal(); saveRun(); render();
  },
  leaveShop() { closeModal(); completeNode(); },
  restHeal() {
    if (G.restDone) return;
    G.restDone = true;
    healPlayer(Math.ceil(G.maxHp * 0.3));
    SFX.play('heal');
    toast('💤 休整完毕，生命回复！');
    completeNode();
  },
  restUpgrade() {
    if (G.restDone) return;
    const pool = G.deck.filter(c => !c.upgraded);
    if (!pool.length) { toast('没有可升级的卡牌'); return; }
    openModal(`<h3>⚒️ 选择要升级的卡牌</h3>
      <div class="deckgrid">${G.deck.map((c, i) => cardHTML(c, 'tiny clickable', !c.upgraded, `onclick="UI.doUpgrade(${i})" ${c.upgraded ? 'style="opacity:.35"' : ''}`)).join('')}</div>
      <div style="text-align:center"><button class="btn ghost mclose" onclick="UI.closeModal()">取消</button></div>`);
  },
  doUpgrade(i) {
    const inst = G.deck[i];
    if (!inst || inst.upgraded) return;
    const up = upgradedCard(CARD_BY_ID[inst.id]);
    up.uid = inst.uid;
    G.deck.splice(i, 1, up);
    G.restDone = true;
    SFX.play('buff');
    toast('⚒️ 「' + up.name + '」升级成功！');
    closeModal();
    completeNode();
  },
  eventOpt(i) {
    const o = G.curEvent.opts[i];
    if (o.need && !o.need(G.gold)) return;
    if (o.pre) o.pre();
    SFX.play('select');
    G.evResult = o.run();
    render();
  },
  finishEvent() { G.evResult = null; G.curEvent = null; completeNode(); },
  toTitle() { G.screen = 'title'; render(); },
  chooseLevelUp(i) {
    const opt = (G.levelChoices || [])[i];
    if (!opt || G.pendingLevels <= 0) return;
    opt.apply();
    G.pendingLevels--;
    SFX.play('levelup');
    toast(`${opt.icon} ${opt.name}！`);
    if (G.pendingLevels > 0) { rollLevelChoices(); render(); return; }
    G.levelChoices = null;
    saveRun();
    G.screen = 'map'; render();
  },
};
window.UI = UI;

document.addEventListener('click', e => {
  if (e.target.id === 'modal') closeModal();
  const btn = e.target.closest('button');
  if (btn && !btn.disabled && !btn.classList.contains('mnode') && !btn.classList.contains('endturn')) SFX.play('click');
});
document.addEventListener('keydown', e => {
  if (G.screen !== 'battle' || !G.b) return;
  if (e.key >= '1' && e.key <= '9') { const i = +e.key - 1; if (G.b.hand[i] != null) tryPlay(i, null); }
  else if (e.key === 'e' || e.key === 'E') endTurn();
  else if (e.key === 'd' || e.key === 'D') UI.deckView();
  else if (e.key === 'Escape') { G.b.sel = null; render(); }
});
window.addEventListener('resize', () => { if (G.screen === 'map') drawMapLines(); });
