"use strict";
/* 数据校验 + 自测套件（?selftest=1 查看） */

function expandEffects(effs, out = []) {
  for (const e of effs) {
    out.push(e);
    if (e.op === 'multi') expandEffects([e.value.effect], out);
  }
  return out;
}
function validateData() {
  const errs = [];
  const ids = new Set();
  for (const c of CARDS) {
    if (ids.has(c.id)) errs.push(`卡牌 id 重复: ${c.id}`);
    ids.add(c.id);
    if (c.cost < 0 || c.cost > 3) errs.push(`${c.id} cost 越界: ${c.cost}`);
    if (!c.effects.length) errs.push(`${c.id} effects 为空`);
    if (!c.desc || /TODO|待补充|placeholder/i.test(c.desc)) errs.push(`${c.id} 描述缺失或为占位符`);
    for (const e of expandEffects(c.effects)) {
      if (!OPERATORS[e.op]) errs.push(`${c.id} 未知算子: ${e.op}`);
      if (e.op === 'applyBuff' || e.op === 'selfBuff') if (!BUFFS[e.value.buff]) errs.push(`${c.id} 未知 buff: ${e.value.buff}`);
      if ((e.op === 'applyBuff' || e.op === 'selfBuff') && typeof e.value === 'object' && e.value.value > 8) errs.push(`${c.id} buff 数值过大: ${e.value.value}`);
      const dmg = e.op === 'damage' ? (typeof e.value === 'number' ? e.value : (e.value.base || 0)) : 0;
      if (dmg > 34) errs.push(`${c.id} 单段伤害超模: ${dmg}`);
    }
  }
  const rids = new Set();
  for (const r of RELICS) {
    if (rids.has(r.id)) errs.push(`遗物 id 重复: ${r.id}`);
    rids.add(r.id);
    if (!r.desc) errs.push(`遗物 ${r.id} 缺少描述`);
  }
  const eids = new Set();
  for (const en of ENEMIES) {
    if (eids.has(en.key)) errs.push(`敌人 key 重复: ${en.key}`);
    eids.add(en.key);
    if (!en.intents.length) errs.push(`敌人 ${en.key} 无意图`);
  }
  return errs;
}
function runSelfTests() {
  G._testing = true; // 测试期间抑制战斗异步回调的界面重绘
  const T = [];
  const t = (name, fn) => { try { fn(); T.push({ name, ok: true }); } catch (e) { T.push({ name, ok: false, msg: e.message }); } };
  const assert = (c, m) => { if (!c) throw new Error(m || '断言失败'); };
  function mkBattle(handIds, enemyHp) {
    G.deck = handIds.map(id => mkCard(id));
    G.relics = []; G.maxEnergy = 3; G.hp = 50; G.maxHp = 50;
    startBattle(['slime_s']);
    const e = G.b.enemies[0];
    e.hp = enemyHp; e.maxHp = enemyHp; e.buffs = {}; e.block = 0; e.ii = 99; // ii 指向安全意图
    G.b.p.hp = 50; G.b.p.maxHp = 50; G.b.p.buffs = {}; G.b.p.block = 0;
    G.b.over = false; G.b.busy = false;
    return e;
  }
  function clearFx() { FX.length = 0; }

  t('数据校验：卡牌/遗物/敌人零错误', () => {
    const errs = validateData();
    assert(errs.length === 0, errs.slice(0, 3).join('；'));
  });
  t('打击：6 点伤害（50→44）', () => {
    const e = mkBattle(['strike'], 50);
    G.b.energy = 3; clearFx();
    tryPlay(0, e);
    assert(e.hp === 44, `敌人 HP=${e.hp}`);
  });
  t('防御：获得 5 点格挡', () => {
    mkBattle(['defend'], 50); G.b.energy = 3; clearFx();
    tryPlay(0, null);
    assert(G.b.p.block === 5, `格挡=${G.b.p.block}`);
  });
  t('多重打击：3×4=12（嵌套 multi 结算）', () => {
    const e = mkBattle(['twin_strike'], 50);
    G.b.cardByUid[G.b.hand[0]].effects = [MUL(3, DMG(4))];
    G.b.energy = 3; clearFx();
    tryPlay(0, e);
    assert(e.hp === 38, `敌人 HP=${e.hp}`);
  });
  t('力量 buff 正确加成伤害（+2 → 6+2=8）', () => {
    const e = mkBattle(['strike'], 50);
    G.b.p.buffs.strength = 2;
    G.b.energy = 3; clearFx();
    tryPlay(0, e);
    assert(e.hp === 42, `敌人 HP=${e.hp}`);
  });
  t('易伤使受到的攻击伤害 ×1.5（6→9）', () => {
    const e = mkBattle(['strike'], 50);
    e.buffs.vulnerable = 1;
    G.b.energy = 3; clearFx();
    tryPlay(0, e);
    assert(e.hp === 41, `敌人 HP=${e.hp}`);
  });
  t('虚弱使攻击伤害 ×0.75 向下取整（6→4）', () => {
    const e = mkBattle(['strike'], 50);
    G.b.p.buffs.weak = 1;
    G.b.energy = 3; clearFx();
    tryPlay(0, e);
    assert(e.hp === 46, `敌人 HP=${e.hp}`);
  });
  t('能量不足时拒绝出牌', () => {
    const e = mkBattle(['bash'], 50);
    G.b.energy = 1; clearFx();
    const before = G.b.hand.length;
    tryPlay(0, e);
    assert(G.b.hand.length === before && e.hp === 50, '手牌与敌人 HP 不应变化');
  });
  t('格挡吸收伤害（5 格挡挡 8 伤害 → 扣 3 血）', () => {
    mkBattle(['defend'], 50);
    const p = G.b.p; p.block = 5; clearFx();
    dealDamage(G.b.enemies[0], p, 8);
    assert(p.hp === 47 && p.block === 0, `HP=${p.hp} 格挡=${p.block}`);
  });
  t('中毒：回合开始失去等量生命并 -1 层', () => {
    const e = mkBattle(['defend'], 50);
    e.buffs.poison = 3; clearFx();
    tickStart(e);
    assert(e.hp === 47 && e.buffs.poison === 2, `HP=${e.hp} 中毒=${e.buffs.poison}`);
  });
  t('未知算子必须抛异常', () => {
    const e = mkBattle(['defend'], 50);
    let threw = false;
    try { applyEffect({ self: G.b.p, target: e, card: { target: 'enemy' } }, { op: 'fireball' }); }
    catch (err) { threw = true; assert(/未知算子/.test(err.message), '异常信息不符合'); }
    assert(threw, '未抛出异常');
  });
  t('空抽牌堆时自动洗回弃牌堆', () => {
    mkBattle(['defend', 'defend'], 50);
    const b = G.b;
    b.drawPile = []; b.discardPile = [b.hand.pop(), b.hand.pop()];
    b.hand = [];
    drawCards(1);
    assert(b.hand.length === 1 && b.drawPile.length === 1 && b.discardPile.length === 0, `手牌=${b.hand.length} 抽牌堆=${b.drawPile.length} 弃牌=${b.discardPile.length}`);
  });
  t('荆棘反弹伤害', () => {
    mkBattle(['defend'], 50);
    const p = G.b.p, e = G.b.enemies[0];
    p.buffs.thorns = 3; e.hp = 20; clearFx();
    dealDamage(e, p, 6);
    assert(e.hp === 17, `攻击者 HP=${e.hp}`);
  });
  t('穿心之刺无视格挡', () => {
    const e = mkBattle(['heart_piercer'], 50);
    e.block = 20;
    G.b.energy = 3; clearFx();
    tryPlay(0, e);
    assert(e.hp === 38 && e.block === 20, `HP=${e.hp} 格挡=${e.block}`);
  });
  t('升级：打击+ 伤害提升', () => {
    const up = upgradedCard(CARD_BY_ID['strike']);
    assert(up.name === '打击+' && up.effects[0].value === 9, `name=${up.name} dmg=${up.effects[0].value}`);
  });
  t('充能 buff：回合开始额外获得能量', () => {
    mkBattle(['defend'], 50);
    G.b.p.buffs.charge = 2;
    applyTurnEnergy(G.b);
    assert(G.b.energy === 5, `能量=${G.b.energy}`);
  });
  t('经验升级：达到阈值升级并累计待选强化', () => {
    Object.assign(G, { level: 1, xp: 0, pendingLevels: 0 });
    gainXp(30); // need(1)=30
    assert(G.level === 2 && G.pendingLevels === 1 && G.xp === 0, `Lv=${G.level} 待选=${G.pendingLevels}`);
    gainXp(50); // need(2)=45 → 余 5
    assert(G.level === 3 && G.pendingLevels === 2 && G.xp === 5, `Lv=${G.level} xp=${G.xp} 待选=${G.pendingLevels}`);
    G.pendingLevels = 0;
  });
  t('基础属性：战斗开始时应用永久力量/敏捷/格挡', () => {
    G.deck = [mkCard('strike')]; G.relics = []; G.maxEnergy = 3; G.hp = 50; G.maxHp = 50;
    G.baseStrength = 2; G.baseDexterity = 1; G.baseBlock = 4;
    startBattle(['slime_s']);
    const p = G.b.p;
    assert(p.buffs.strength === 2 && p.buffs.dexterity === 1 && p.block === 4,
      `力量=${p.buffs.strength} 敏捷=${p.buffs.dexterity} 格挡=${p.block}`);
    G.baseStrength = 0; G.baseDexterity = 0; G.baseBlock = 0;
  });
  t('呼吸法：消耗 1 能量回 1 能量并净抽 1 张', () => {
    mkBattle(['breath_focus', 'strike', 'defend'], 50);
    const b = G.b;
    const i = b.hand.findIndex(uid => b.cardByUid[uid].id === 'breath_focus');
    // 把 defend 挪到抽牌堆，保证结算效果时有牌可抽
    const other = b.hand.find((uid, k) => k !== i && b.cardByUid[uid].id === 'defend');
    b.hand.splice(b.hand.indexOf(other), 1);
    b.drawPile = [other];
    b.energy = 1; clearFx();
    tryPlay(i, null);
    assert(G.b.energy === 1 && G.b.hand.length === 2, `能量=${G.b.energy} 手牌=${G.b.hand.length}`);
  });
  t('奖励三选一：随机 100 次均可生成合法卡牌', () => {
    G.pendingReward = { gold: 0, relicName: null, isBoss: false, isElite: false };
    for (let i = 0; i < 100; i++) {
      const ids = pickCardChoices(3);
      assert(ids.length === 3 && ids.every(id => !!CARD_BY_ID[id]), `生成失败: ${ids}`);
    }
    G.pendingReward = null;
  });
  t('界面交互：所有模板引用的 UI.* 方法均已定义', () => {
    const src = [renderTopbar, renderMap, renderBattle, renderReward, renderShop, renderRest, renderEvent, renderEnd, renderTitle]
      .map(f => f.toString()).join('\n');
    const re = /UI\.([A-Za-z_]\w*)\s*\(/g;
    const missing = [];
    let m;
    while ((m = re.exec(src))) if (typeof UI[m[1]] !== 'function') missing.push(m[1]);
    assert(missing.length === 0, '缺少方法: ' + [...new Set(missing)].join(','));
  });
  t('地图生成：三幕随机 60 次全图连通、无死路、必达首领', () => {
    for (let trial = 0; trial < 20; trial++) {
      for (const act of [1, 2, 3]) {
        const rows = genMap(act);
        assert(rows.length === 9 && rows[8][0].t === 'boss', '首领行缺失');
        for (let r = 0; r < 8; r++) {
          for (const n of rows[r]) assert(n.edges.length > 0, `第 ${r} 行存在死路节点`);
          rows[r].forEach((n, i) => n.edges.forEach(j =>
            assert(rows[r + 1][j] !== undefined, `第 ${r} 行节点边越界: ${i}->${j}`)));
        }
        for (let r = 1; r < 9; r++) {
          rows[r].forEach((_, j) =>
            assert(rows[r - 1].some(n => n.edges.includes(j)), `第 ${r} 行节点 ${j} 不可达`));
        }
      }
    }
  });
  G._testing = false;
  return T;
}

/* ---------------- 启动 ---------------- */
(function init() {
  const errs = validateData();
  if (errs.length) console.warn('[数据校验] 发现问题：', errs);
  else console.info('[数据校验] 卡牌 ' + CARDS.length + ' 张 / 遗物 ' + RELICS.length + ' 个 / 敌人 ' + ENEMIES.length + ' 种 / 事件 ' + EVENTS.length + ' 个，全部通过');
  if (location.search.includes('selftest=1')) { G.screen = 'selftest'; renderSelftest(); renderTopbar(); return; }
  render();
})();
