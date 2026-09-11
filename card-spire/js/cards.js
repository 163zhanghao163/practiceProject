"use strict";
/* 卡牌数据 + 描述自动生成 + 升级规则 */

const CARDS = [];
function C(id, name, cost, type, rarity, target, effects, opts = {}) {
  CARDS.push(Object.assign({ id, name, cost, type, rarity, target, effects }, opts));
}
const DMG = v => ({ op: 'damage', value: v });
const BLK = v => ({ op: 'block', value: v });
const DRW = v => ({ op: 'draw', value: v });
const ENR = v => ({ op: 'gainEnergy', value: v });
const HEL = v => ({ op: 'heal', value: v });
const ABF = (b, v) => ({ op: 'applyBuff', value: { buff: b, value: v } });
const SBF = (b, v) => ({ op: 'selfBuff', value: { buff: b, value: v } });
const MUL = (times, effect) => ({ op: 'multi', value: { times, effect } });

/* --- 初始卡组 --- */
C('strike', '打击', 1, 'attack', 'common', 'enemy', [DMG(6)]);
C('defend', '防御', 1, 'skill', 'common', 'self', [BLK(5)]);
C('bash', '重击', 2, 'attack', 'common', 'enemy', [DMG(12), ABF('vulnerable', 2)]);

/* --- 普通：力量 / 连击 / 毒系 / 通用 --- */
C('quick_jab', '疾刺', 0, 'attack', 'common', 'enemy', [DMG(4)]);
C('swift_step', '疾步', 0, 'skill', 'common', 'self', [BLK(3), DRW(1)]);
C('warcry', '战吼', 0, 'skill', 'common', 'self', [DRW(2)], { exhaust: true });
C('recharge', '充能', 0, 'skill', 'common', 'self', [ENR(1)], { exhaust: true });
C('cleave', '横扫', 1, 'attack', 'common', 'all', [DMG(8)]);
C('twin_strike', '双重打击', 1, 'attack', 'common', 'enemy', [MUL(2, DMG(5))]);
C('iron_wave', '铁波', 1, 'attack', 'common', 'enemy', [DMG(5), BLK(5)]);
C('pommel_strike', '剑柄打击', 1, 'attack', 'common', 'enemy', [DMG(9), DRW(1)]);
C('headbutt', '头槌', 1, 'attack', 'common', 'enemy', [DMG(9), ABF('vulnerable', 1)]);
C('wild_swipe', '乱挥', 1, 'attack', 'common', 'enemy', [MUL(3, DMG(3))]);
C('thunderclap', '雷鸣击', 1, 'attack', 'common', 'all', [DMG(4), ABF('vulnerable', 1)]);
C('heavy_blade', '重刃', 2, 'attack', 'common', 'enemy', [DMG({ ref: 'buff', buff: 'strength', base: 10 })]);
C('guard_break', '破防一击', 1, 'attack', 'common', 'enemy', [DMG(6), ABF('vulnerable', 2)]);
C('flurry', '疾风连打', 1, 'attack', 'common', 'enemy', [MUL(4, DMG(2))]);
C('poison_stab', '淬毒之刺', 1, 'attack', 'common', 'enemy', [DMG(3), ABF('poison', 3)]);
C('precise_cut', '精准斩', 1, 'attack', 'common', 'enemy', [DMG(9)]);
C('iron_fist', '铁拳', 1, 'attack', 'common', 'enemy', [DMG(7)]);
C('shield_bash', '盾击', 1, 'attack', 'common', 'enemy', [DMG(4), BLK(6)]);
C('shrug_off', '甩开负担', 1, 'skill', 'common', 'self', [BLK(8), DRW(1)]);
C('armor_up', '加固', 1, 'skill', 'common', 'self', [BLK(9)]);
C('quick_tactics', '战术', 1, 'skill', 'common', 'self', [DRW(2)]);
C('focus', '凝神', 1, 'skill', 'common', 'self', [SBF('dexterity', 2)]);
C('stone_skin', '石肤', 1, 'skill', 'common', 'self', [BLK(4), SBF('dexterity', 1)]);
C('defend_pose', '防御姿态', 2, 'skill', 'common', 'self', [BLK(10)]);
C('second_wind', '重整旗鼓', 1, 'skill', 'common', 'self', [BLK(5), HEL(3)]);
C('taunt', '挑衅', 1, 'skill', 'common', 'all', [ABF('weak', 1), BLK(4)]);
C('emergency_reserve', '应急储备', 1, 'skill', 'common', 'self', [ENR(1), BLK(4)]);

/* --- 罕见（能量回复与充能联动） --- */
C('inflame', '燃焰', 1, 'power', 'uncommon', 'self', [SBF('strength', 2)]);
C('heavy_swing', '蛮击', 2, 'attack', 'uncommon', 'enemy', [DMG(18)]);
C('whirlwind', '旋风斩', 2, 'attack', 'uncommon', 'all', [DMG(10)]);
C('crushing_blow', '碎甲重击', 2, 'attack', 'uncommon', 'enemy', [DMG(10), ABF('vulnerable', 3)]);
C('rampage', '狂暴斩', 1, 'attack', 'uncommon', 'enemy', [DMG({ ref: 'buff', buff: 'strength', base: 8 })]);
C('poison_cloud', '剧毒云雾', 2, 'attack', 'uncommon', 'all', [ABF('poison', 5)]);
C('corrosive_ink', '腐蚀墨汁', 1, 'attack', 'uncommon', 'enemy', [ABF('poison', 4), ABF('weak', 1)]);
C('rapid_fire', '连射', 1, 'attack', 'uncommon', 'enemy', [MUL(3, DMG(4))]);
C('ricochet', '弹射', 1, 'attack', 'uncommon', 'all', [MUL(2, DMG(5))]);
C('iron_wall', '铁壁', 2, 'skill', 'uncommon', 'self', [BLK(16)]);
C('entrench', '据壑', 2, 'skill', 'uncommon', 'self', [BLK({ ref: 'block' })], { up: { cost: 1 } });
C('thorns_cloak', '荆棘披风', 1, 'power', 'uncommon', 'self', [SBF('thorns', 3)]);
C('ghost_veil', '幻影面纱', 1, 'skill', 'uncommon', 'self', [BLK(7), SBF('dexterity', 1)]);
C('blood_pact', '血之契约', 0, 'skill', 'uncommon', 'self', [ENR(2)], { exhaust: true });
C('first_aid', '急救', 1, 'skill', 'uncommon', 'self', [HEL(8)]);
C('battle_rhythm', '战斗韵律', 1, 'power', 'uncommon', 'self', [SBF('growth', 1)]);
C('rage_potion', '狂暴药剂', 1, 'skill', 'uncommon', 'self', [SBF('strength', 2), SBF('dexterity', 1)]);
C('smoke_bomb', '烟雾弹', 1, 'skill', 'uncommon', 'all', [ABF('weak', 2)]);
C('terror', '恐吓', 2, 'skill', 'uncommon', 'all', [ABF('vulnerable', 2)]);
C('preparation', '预判', 0, 'skill', 'uncommon', 'self', [DRW(2)]);
C('counter_stance', '反击架势', 2, 'skill', 'uncommon', 'self', [BLK(10), SBF('thorns', 2)]);
C('breath_focus', '呼吸法', 1, 'skill', 'uncommon', 'self', [ENR(1), DRW(1)]);
C('power_surge', '供能过载', 0, 'skill', 'uncommon', 'self', [ENR(2), SBF('vulnerable', 1)], { exhaust: true });
C('resonance_slash', '谐振斩', 1, 'attack', 'uncommon', 'enemy', [DMG({ ref: 'buff', buff: 'charge', base: 6 })]);
C('energy_shield', '能量护盾', 1, 'skill', 'uncommon', 'self', [ENR(1), BLK(6)]);

/* --- 稀有 --- */
C('demon_form', '恶魔形态', 3, 'power', 'rare', 'self', [SBF('growth', 3)]);
C('meditation', '冥想', 1, 'skill', 'rare', 'self', [ENR(1), DRW(2)], { exhaust: true });
C('overload', '超载', 0, 'skill', 'rare', 'self', [ENR(3), SBF('weak', 2)], { exhaust: true });
C('core_resonance', '核心共鸣', 2, 'power', 'rare', 'self', [SBF('charge', 1)]);
C('limit_break', '极限突破', 1, 'skill', 'rare', 'self', [BLK({ ref: 'block', factor: 2 })], { exhaust: true, up: { exhaust: false } });
C('offering', '献祭', 0, 'skill', 'rare', 'self', [ENR(2), DRW(3)], { exhaust: true });
C('heart_piercer', '穿心之刺', 2, 'attack', 'rare', 'enemy', [DMG(12)], { pierce: true });
C('execute', '处决', 2, 'attack', 'rare', 'enemy', [DMG({ ref: 'targetLostHp', base: 8 })]);
C('chain_lightning', '连锁闪电', 2, 'attack', 'rare', 'all', [DMG(9), ABF('weak', 1)]);
C('immolate', '焚灭', 2, 'attack', 'rare', 'all', [DMG(20)]);
C('strategy_master', '战略大师', 0, 'skill', 'rare', 'self', [DRW(3)], { exhaust: true });
C('vampiric_blade', '吸血之刃', 2, 'attack', 'rare', 'enemy', [DMG(10), HEL(5)]);
C('omnislash', '无极斩', 3, 'attack', 'rare', 'enemy', [MUL(4, DMG(8))]);
C('phoenix_flame', '不死鸟之焰', 2, 'skill', 'rare', 'self', [HEL(10), BLK(10)]);
C('barricade_card', '壁垒', 3, 'power', 'rare', 'self', [SBF('barricade', 1)]);
C('time_rift', '时空裂隙', 2, 'skill', 'rare', 'self', [BLK(12), DRW(2)]);
C('god_strike', '神之一击', 3, 'attack', 'rare', 'enemy', [DMG(30)]);
C('apocalypse', '天启', 3, 'attack', 'rare', 'all', [DMG(16), ABF('vulnerable', 2)]);
C('mirror_blade', '镜刃', 1, 'attack', 'rare', 'enemy', [MUL(2, DMG({ ref: 'buff', buff: 'strength', base: 5 }))]);
C('poison_bomb', '毒爆', 2, 'attack', 'rare', 'all', [ABF('poison', 8)]);
C('thousand_cuts', '千刀万剐', 2, 'attack', 'rare', 'enemy', [MUL(6, DMG(4))]);

const CARD_BY_ID = {};
for (const c of CARDS) CARD_BY_ID[c.id] = c;
for (const c of CARDS) if (!c.desc) c.desc = describeCard(c);
const TYPE_NAME = { attack: '攻击', skill: '技能', power: '能力' };
const RARITY_NAME = { common: '普通', uncommon: '罕见', rare: '稀有' };

/* ---------------- 卡牌描述自动生成 ---------------- */
function refLabel(v) {
  if (typeof v === 'number') return String(v);
  if (!v || typeof v !== 'object') return '0';
  switch (v.ref) {
    case 'buff': return (v.base || 0) + '+' + (BUFFS[v.buff] ? BUFFS[v.buff].name : '力量') + '层数';
    case 'targetVulnerable': return (v.base || 0) + '（目标易伤时 ×1.5）';
    case 'block': return '当前格挡' + (v.factor && v.factor !== 1 ? '×' + v.factor : '') + (v.base ? '+' + v.base : '');
    case 'targetLostHp': return (v.base || 0) + '+目标已损失生命';
    default: return String(v.base || 0);
  }
}
function describeCard(c) {
  const parts = [];
  const walk = (effs, target) => {
    for (const eff of effs) {
      switch (eff.op) {
        case 'damage': {
          const a = refLabel(eff.value);
          const all = target === 'all';
          parts.push((all ? '对所有敌人造成 ' : '造成 ') + a + ' 点伤害' + (eff.pierce || c.pierce ? '（无视格挡）' : ''));
          break;
        }
        case 'block': parts.push('获得 ' + refLabel(eff.value) + ' 点格挡'); break;
        case 'draw': parts.push('抽 ' + refLabel(eff.value) + ' 张牌'); break;
        case 'gainEnergy': parts.push('获得 ' + refLabel(eff.value) + ' 点能量'); break;
        case 'heal': parts.push('回复 ' + refLabel(eff.value) + ' 点生命'); break;
        case 'applyBuff': {
          const b = BUFFS[eff.value.buff];
          const all = target === 'all';
          parts.push((all ? '对所有敌人' : '对敌人') + '施加 ' + b.name + ' ' + resolveSub(eff.value) + ' 层');
          break;
        }
        case 'selfBuff': parts.push('自己获得 ' + BUFFS[eff.value.buff].name + ' ' + resolveSub(eff.value) + ' 层'); break;
        case 'multi': parts.push(walkInner(eff.value.effect, target) + '，重复 ' + eff.value.times + ' 次'); break;
      }
    }
  };
  const walkInner = (eff, target) => {
    const saved = parts.length;
    walk([eff], target);
    return parts.slice(saved).join('，');
  };
  walk(c.effects, c.target);
  return parts.join('，') + '。';
}

/* ---------------- 卡牌实例与升级 ---------------- */
function mkCard(id) {
  const base = CARD_BY_ID[id];
  return Object.assign(JSON.parse(JSON.stringify(base)), { uid: UID++ });
}
function bumpVal(e, d) {
  if (typeof e.value === 'number') { e.value += d; return; }
  if (e.value && typeof e.value === 'object') {
    if (e.value.effect) { bumpVal(e.value.effect, d); return; }
    if (e.value.base != null) { e.value.base += d; return; }
    if (e.value.value != null) { e.value.value += d; return; }
  }
}
function upgradedCard(base) {
  const n = JSON.parse(JSON.stringify(base));
  n.upgraded = true;
  n.name = base.up && base.up.name ? base.up.name : base.name + '+';
  if (base.up && base.up.cost != null) n.cost = base.up.cost;
  if (base.up && base.up.exhaust === false) n.exhaust = false;
  const vals = base.up && base.up.vals;
  n.effects = n.effects.map((e, i) => {
    const e2 = JSON.parse(JSON.stringify(e));
    if (vals && vals[i] != null) { bumpVal(e2, vals[i]); return e2; }
    if (e.op === 'damage' || e.op === 'block' || e.op === 'heal') bumpVal(e2, 3);
    else if (e.op === 'applyBuff' || e.op === 'selfBuff') bumpVal(e2, 1);
    else if (e.op === 'draw' || e.op === 'gainEnergy') bumpVal(e2, 1);
    else if (e.op === 'multi') bumpVal(e2, 1);
    return e2;
  });
  n.desc = describeCard(n);
  return n;
}
