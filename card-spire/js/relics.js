"use strict";
/* 遗物数据与钩子派发：battleStart / turnStart / onPlayCard / onKill / passive */

const RELICS = [
  { id: 'iron_charm',  name: '铁护符',   rar: 'common',   on: 'battleStart', fx: { t: 'block', v: 6 }, desc: '战斗开始时获得 6 点格挡。' },
  { id: 'vamp_dagger', name: '吸血匕首', rar: 'common',   on: 'onKill',      fx: { t: 'heal', v: 3 },  desc: '每击杀一名敌人，回复 3 点生命。' },
  { id: 'thorn_band',  name: '荆棘护腕', rar: 'common',   on: 'battleStart', fx: { t: 'buff', buff: 'thorns', v: 2 }, desc: '战斗开始时获得 2 层荆棘。' },
  { id: 'lucky_coin',  name: '幸运钱袋', rar: 'common',   on: 'turnStart',   fx: { t: 'gold', v: 2 },  desc: '战斗中每回合开始获得 2 金币。' },
  { id: 'whetstone',   name: '磨刀石',   rar: 'common',   on: 'battleStart', fx: { t: 'buff', buff: 'strength', v: 1 }, desc: '战斗开始时获得 1 层力量。' },
  { id: 'vet_band',    name: '老兵护腕', rar: 'common',   on: 'battleStart', fx: { t: 'buff', buff: 'dexterity', v: 1 }, desc: '战斗开始时获得 1 层敏捷。' },
  { id: 'small_pack',  name: '小背包',   rar: 'common',   on: 'passive',     fx: { t: 'maxHp', v: 12 }, desc: '生命上限 +12。' },
  { id: 'poison_gland',name: '毒囊',     rar: 'uncommon', on: 'battleStart', fx: { t: 'epoison', v: 1 }, desc: '战斗开始时使所有敌人获得 1 层中毒。' },
  { id: 'eagle_charm', name: '鹰眼护符', rar: 'uncommon', on: 'passive',     fx: { t: 'none' }, desc: '你施加的易伤额外 +1 层。' },
  { id: 'steel_heart', name: '钢铁之心', rar: 'uncommon', on: 'passive',     fx: { t: 'maxHp', v: 20, heal: 20 }, desc: '生命上限 +20，并获得 20 点生命。' },
  { id: 'blood_jade',  name: '血玉',     rar: 'uncommon', on: 'turnStart',   fx: { t: 'heal', v: 2 }, desc: '战斗中每回合开始回复 2 点生命。' },
  { id: 'swift_boots', name: '迅捷之靴', rar: 'uncommon', on: 'turnStart',   fx: { t: 'draw', v: 1, even: true }, desc: '偶数回合开始时多抽 1 张牌。' },
  { id: 'thorn_mail',  name: '荆棘锁甲', rar: 'uncommon', on: 'battleStart', fx: { t: 'buff', buff: 'thorns', v: 4 }, desc: '战斗开始时获得 4 层荆棘。' },
  { id: 'battle_flag', name: '战旗',     rar: 'uncommon', on: 'battleStart', fx: { t: 'buff2', buff1: 'strength', v1: 1, buff2: 'dexterity', v2: 1 }, desc: '战斗开始时获得 1 层力量和 1 层敏捷。' },
  { id: 'energy_core', name: '能量核心', rar: 'rare',     on: 'passive',     fx: { t: 'energy' }, desc: '每回合能量上限 +1（3→4）。' },
  { id: 'demon_pact',  name: '恶魔契约', rar: 'rare',     on: 'battleStart', fx: { t: 'buff', buff: 'strength', v: 2, costHp: 6 }, desc: '战斗开始时获得 2 层力量（拾取时生命上限 -6）。' },
  { id: 'phoenix',     name: '凤凰羽',   rar: 'rare',     on: 'passive',     fx: { t: 'none' }, desc: '致命伤害下浴火重生，回复 30% 生命（每场战斗一次）。' },
  { id: 'time_sand',   name: '时之沙',   rar: 'rare',     on: 'turnStart',   fx: { t: 'energy', v: 1, third: true }, desc: '每第 3 回合开始时额外获得 1 点能量。' },
  { id: 'titan_belt',  name: '巨人腰带', rar: 'rare',     on: 'passive',     fx: { t: 'maxHp', v: 30 }, desc: '生命上限 +30。' },
  { id: 'sage_stone',  name: '贤者之石', rar: 'rare',     on: 'onPlayCard',  fx: { t: 'skillBlock', v: 2 }, desc: '每打出一张技能牌，获得 2 点格挡。' },
  { id: 'hunt_bow',    name: '猎人短弓', rar: 'rare',     on: 'onPlayCard',  fx: { t: 'comboDraw', v: 3 }, desc: '每打出 3 张攻击牌，抽 1 张牌。' },
  { id: 'tome',        name: '战术手册', rar: 'rare',     on: 'turnStart',   fx: { t: 'draw', v: 1 }, desc: '每回合开始时多抽 1 张牌。' },
  { id: 'berserk_mask',name: '狂战面具', rar: 'rare',     on: 'onKill',      fx: { t: 'buff', buff: 'strength', v: 1 }, desc: '每击杀一名敌人，获得 1 层力量。' },
];
const RELIC_BY = {};
for (const r of RELICS) RELIC_BY[r.id] = r;
const RELIC_ICON = { common: '⚪', uncommon: '🟢', rare: '🟡' };

function hasRelic(id) { return G.relics.includes(id); }
function fireRelics(hook) {
  for (const id of G.relics) {
    const d = RELIC_BY[id]; if (!d || d.on !== hook || !d.fx) continue;
    const f = d.fx;
    switch (f.t) {
      case 'block': G.b.p.block += f.v; FX.push({ host: '#p-panel', text: '🛡+' + f.v, cls: 'fblk' }); break;
      case 'buff': addBuff(G.b.p, f.buff, f.v, 'player'); break;
      case 'buff2': addBuff(G.b.p, f.buff1, f.v1, 'player'); addBuff(G.b.p, f.buff2, f.v2, 'player'); break;
      case 'draw': if (f.even && G.b.turn % 2 !== 0) break; drawCards(f.v); break;
      case 'energy': if (f.third && G.b.turn % 3 !== 0) break; G.b.energy += f.v; break;
      case 'gold': G.gold += f.v; SFX.play('coin'); break;
      case 'heal': if (G.b.p.hp < G.b.p.maxHp) { G.b.p.hp = Math.min(G.b.p.maxHp, G.b.p.hp + f.v); FX.push({ host: '#p-panel', text: '+' + f.v, cls: 'fheal' }); } break;
      case 'epoison': for (const e of aliveEnemies()) addBuff(e, 'poison', f.v, 'player'); break;
    }
  }
}
function relicOnPlay(card) {
  for (const id of G.relics) {
    const d = RELIC_BY[id]; if (!d || d.on !== 'onPlayCard') continue;
    if (d.fx.t === 'skillBlock' && card.type === 'skill') { G.b.p.block += d.fx.v; FX.push({ host: '#p-panel', text: '🛡+' + d.fx.v, cls: 'fblk' }); }
    if (d.fx.t === 'comboDraw' && card.type === 'attack') { G.b.atkCount = (G.b.atkCount || 0) + 1; if (G.b.atkCount % d.fx.v === 0) drawCards(1); }
  }
}
function relicOnKill() {
  for (const id of G.relics) {
    const d = RELIC_BY[id]; if (!d || d.on !== 'onKill') continue;
    if (d.fx.t === 'heal' && G.b.p.hp < G.b.p.maxHp) { G.b.p.hp = Math.min(G.b.p.maxHp, G.b.p.hp + d.fx.v); FX.push({ host: '#p-panel', text: '+' + d.fx.v, cls: 'fheal' }); }
    if (d.fx.t === 'buff') addBuff(G.b.p, d.fx.buff, d.fx.v, 'player');
  }
}
