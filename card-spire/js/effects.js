"use strict";
/* 声明式效果：动态数值解析 + 中央结算器 + 伤害/Buff 管线
   卡牌只写数据，一切效果经 OPERATORS 结算；未知算子直接抛异常。 */

function resolve(v, ctx) {
  if (typeof v === 'number') return v;
  if (!v || typeof v !== 'object') return 0;
  switch (v.ref) {
    case 'buff': return (ctx.self.buffs[v.buff] || 0) + (v.base || 0);
    case 'targetVulnerable': return ctx.target && ctx.target.buffs.vulnerable ? Math.floor((v.base || 0) * 1.5) : (v.base || 0);
    case 'block': return Math.floor((ctx.self.block || 0) * (v.factor || 1)) + (v.base || 0);
    case 'targetLostHp': return (v.base || 0) + Math.max(0, (ctx.target ? ctx.target.maxHp - ctx.target.hp : 0));
    default: return v.base || 0;
  }
}
function resolveSub(v) { return typeof v === 'number' ? v : (v && v.value) || 0; }

function applyEffect(ctx, eff) {
  const op = OPERATORS[eff.op];
  if (!op) throw new Error('未知算子: ' + eff.op);
  op(ctx, eff.value !== undefined ? eff.value : eff, eff);
}

const OPERATORS = {
  damage: (ctx, v, eff) => {
    const pierce = !!(eff && eff.pierce) || !!(v && v.pierce) || !!(ctx.card && ctx.card.pierce);
    const amt = resolve(v, ctx);
    if (ctx.card && ctx.card.target === 'all') {
      for (const e of aliveEnemies()) dealDamage(ctx.self, e, amt, { pierce });
    } else {
      let t = ctx.target;
      if (!t || t.hp <= 0) t = aliveEnemies()[0];
      if (t) dealDamage(ctx.self, t, amt, { pierce });
    }
  },
  block: (ctx, v) => {
    const amt = resolve(v, ctx) + (ctx.self.buffs.dexterity || 0);
    if (amt > 0) { ctx.self.block += amt; FX.push({ host: hostOf(ctx.self), text: '🛡+' + amt, cls: 'fblk' }); }
  },
  draw: (ctx, v) => drawCards(resolve(v, ctx)),
  gainEnergy: (ctx, v) => { G.b.energy += resolve(v, ctx); },
  heal: (ctx, v) => {
    const amt = resolve(v, ctx);
    if (amt > 0 && ctx.self.hp < ctx.self.maxHp) {
      ctx.self.hp = Math.min(ctx.self.maxHp, ctx.self.hp + amt);
      FX.push({ host: hostOf(ctx.self), text: '+' + amt, cls: 'fheal' });
      SFX.play('heal');
    }
  },
  applyBuff: (ctx, v) => {
    const amt = resolveSub(v);
    let targets;
    if (ctx.card && ctx.card.target === 'all') targets = aliveEnemies();
    else targets = (ctx.target && ctx.target.hp > 0) ? [ctx.target] : [];
    for (const t of targets) addBuff(t, v.buff, amt, 'player');
  },
  selfBuff: (ctx, v) => addBuff(ctx.self, v.buff, resolveSub(v), 'player'),
  multi: (ctx, v) => {
    const times = resolve(v.times, ctx);
    for (let i = 0; i < times; i++) applyEffect(ctx, v.effect);
  },
};

/* ---------------- 伤害 / 治疗 / Buff 结算 ---------------- */
function calcAttackDamage(src, dst, base) {
  let d = base + (src.buffs.strength || 0);
  if (src.buffs.weak) d = Math.floor(d * 0.75);
  if (dst.buffs.vulnerable) d = Math.floor(d * 1.5);
  return Math.max(0, d);
}
function dealDamage(src, dst, base, opts = {}) {
  const d = calcAttackDamage(src, dst, base);
  let toHp = d;
  if (!opts.pierce && dst.block > 0) {
    const ab = Math.min(dst.block, d);
    dst.block -= ab; toHp = d - ab;
    if (ab > 0) { FX.push({ host: hostOf(dst), text: '🛡' + ab, cls: 'fblk' }); SFX.play('block'); }
  }
  if (toHp > 0) {
    dst.hp = Math.max(0, dst.hp - toHp);
    FX.push({ host: hostOf(dst), text: '-' + toHp, cls: 'fdmg' });
    SFX.play(dst === G.b.p ? 'hurt' : 'attack');
  }
  if (dst.buffs.thorns && src && src.hp > 0 && src !== dst) {
    const t = dst.buffs.thorns;
    src.hp = Math.max(0, src.hp - t);
    FX.push({ host: hostOf(src), text: '-' + t, cls: 'fdmg' });
    if (src.def && src.hp <= 0) onEnemyDeath(src);
  }
  if (dst.def && dst.hp <= 0) onEnemyDeath(dst);
  return d;
}
function onEnemyDeath(e) {
  if (e.counted) return;
  e.counted = true;
  pushLog(`${e.def.name} 被击败了！`);
  relicOnKill();
}
function loseHp(e, n, tag) {
  if (n <= 0) return;
  e.hp = Math.max(0, e.hp - n);
  FX.push({ host: hostOf(e), text: '-' + n + (tag === 'poison' ? '🧪' : ''), cls: 'fdmg' });
  SFX.play('poison');
}
function addBuff(e, buff, n, src) {
  if (!n || n <= 0 || !e || e.hp <= 0) return;
  if (buff === 'vulnerable' && src === 'player' && hasRelic('eagle_charm')) n += 1;
  e.buffs[buff] = (e.buffs[buff] || 0) + n;
  SFX.play(BUFFS[buff] && BUFFS[buff].good ? 'buff' : 'debuff');
}
function decDebuffs(e) { // 该生物回合结束时，身上的减益 -1（力量/敏捷等增益常驻）
  for (const k of ['vulnerable', 'weak']) if (e.buffs[k]) e.buffs[k]--;
}
function tickStart(e) { // 生物回合开始：中毒结算 → 蛮力成长
  if (e.buffs.poison) { loseHp(e, e.buffs.poison, 'poison'); e.buffs.poison--; }
  if (e.buffs.growth) e.buffs.strength = (e.buffs.strength || 0) + e.buffs.growth;
}
