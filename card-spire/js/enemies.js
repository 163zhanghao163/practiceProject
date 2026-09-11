"use strict";
/* 敌人数据（意图循环）与遭遇表 */
const A = (v, times) => ({ t: 'attack', v, times });
const B = v => ({ t: 'block', v });
const BF = (buff, value) => ({ t: 'buff', buff, value });
const DB = (buff, value) => ({ t: 'debuff', buff, value });
const W = () => ({ t: 'wait' });
const EH = v => ({ t: 'heal', v });

const ENEMIES = [
  // ---- 第一幕 ----
  { key: 'slime_s', name: '小史莱姆', hp: [14, 20], act: 1, art: { shape: 'blob', c1: '#7ee06a', c2: '#c8ffb8', e: '#2a5a1a' }, intents: [A(5), A(4)] },
  { key: 'slime_m', name: '烂泥史莱姆', hp: [28, 36], act: 1, art: { shape: 'blob', c1: '#4fbf5f', c2: '#a0f0a8' }, intents: [A(7), B(6), A(6)] },
  { key: 'bat', name: '洞穴蝙蝠', hp: [18, 24], act: 1, art: { shape: 'bat', c1: '#8a6fb8' }, intents: [A(4, 2), A(6)] },
  { key: 'shroom', name: '毒孢菇', hp: [30, 38], act: 1, art: { shape: 'shroom', c1: '#d95f5f', c2: '#ffd9d9' }, intents: [DB('poison', 2), A(7)] },
  { key: 'skel', name: '骷髅兵', hp: [34, 42], act: 1, art: { shape: 'skel', c1: '#cfc8b8' }, intents: [A(8), B(6), A(9)] },
  { key: 'bandit', name: '强盗', hp: [28, 34], act: 1, art: { shape: 'hum', weapon: 'sword', c1: '#7a5230', c2: '#5a3a20' }, intents: [A(7), BF('strength', 2), A(8)] },
  { key: 'bug', name: '甲虫群', hp: [22, 28], act: 1, art: { shape: 'bug', c1: '#b0b23e' }, intents: [A(3, 3)] },
  { key: 'gargoyle', name: '石像鬼', hp: [70, 78], act: 1, elite: true, art: { shape: 'demon', c1: '#9aa0b8', c2: '#7a8098', e: '#8ef0ff' }, intents: [A(12), B(10), DB('vulnerable', 2), A(10)] },
  { key: 'jailer', name: '典狱长', hp: [78, 86], act: 1, elite: true, art: { shape: 'hum', weapon: 'axe', helm: true, c1: '#5a6b85', c2: '#3e4c60' }, intents: [A(9, 2), DB('weak', 2), A(13), B(8)] },
  { key: 'slime_king', name: '史莱姆大王', hp: [150, 160], act: 1, boss: true, art: { shape: 'blob', c1: '#3fae5f', c2: '#9fe8b0', crown: true }, intents: [A(11), B(14), A(7, 2), BF('strength', 3), A(16)] },
  // ---- 第二幕 ----
  { key: 'knight', name: '黑铁骑士', hp: [50, 58], act: 2, art: { shape: 'hum', weapon: 'sword', helm: true, shield: true, c1: '#4a5570', c2: '#333c52' }, intents: [A(12), B(8), A(14)] },
  { key: 'apprentice', name: '邪教学徒', hp: [34, 42], act: 2, art: { shape: 'hum', weapon: 'staff', c1: '#6a4a8a', c2: '#b48aff' }, intents: [A(6), DB('vulnerable', 2), BF('strength', 2)] },
  { key: 'mage', name: '暗影法师', hp: [46, 54], act: 2, art: { shape: 'hum', weapon: 'staff', c1: '#3a2a5a', c2: '#8a6fd0' }, intents: [A(11), DB('weak', 1), A(12)] },
  { key: 'assassin', name: '双子刺客', hp: [38, 44], act: 2, art: { shape: 'hum', weapon: 'sword', c1: '#2e2e42', c2: '#1e1e2e' }, intents: [A(7, 2), A(5)] },
  { key: 'golem', name: '岩石魔像', hp: [68, 78], act: 2, art: { shape: 'golem', c1: '#7d7a72', c2: '#00000055', e: '#ffb347' }, intents: [W(), A(16), B(10)] },
  { key: 'hound', name: '暗影猎犬', hp: [40, 48], act: 2, art: { shape: 'beast', c1: '#3a3450', e: '#ff5a4d' }, intents: [A(9), BF('strength', 2), A(10)] },
  { key: 'priest', name: '血祭祭司', hp: [52, 62], act: 2, art: { shape: 'hum', weapon: 'staff', c1: '#8a3a4a', c2: '#ff8a9a' }, intents: [A(10), EH(8), DB('vulnerable', 1)] },
  { key: 'executioner', name: '处刑者', hp: [98, 108], act: 2, elite: true, art: { shape: 'hum', weapon: 'axe', helm: true, c1: '#6a2a2a', c2: '#4a1a1a' }, intents: [A(17), BF('strength', 3), A(20)] },
  { key: 'war_golem', name: '战争傀儡', hp: [105, 118], act: 2, elite: true, art: { shape: 'golem', c1: '#5a6a7a', c2: '#00000055', e: '#8ef0ff' }, intents: [A(11, 2), B(14), A(18)] },
  { key: 'ancient_guardian', name: '远古守卫', hp: [220, 235], act: 2, boss: true, art: { shape: 'golem', c1: '#8a7a3a', c2: '#00000055', e: '#ffd34d' }, intents: [A(15), B(18), A(9, 2), DB('weak', 2), A(22)] },
  // ---- 第三幕 ----
  { key: 'abyss_mage', name: '深渊法师', hp: [68, 78], act: 3, art: { shape: 'hum', weapon: 'staff', c1: '#20304a', c2: '#4a8ad0' }, intents: [A(14), DB('vulnerable', 2), A(15)] },
  { key: 'blood_fiend', name: '血魔', hp: [82, 92], act: 3, art: { shape: 'demon', c1: '#8a2438', c2: '#5a1424', wings: true }, intents: [A(15), EH(10), A(17)] },
  { key: 'dragonkin', name: '龙裔卫士', hp: [92, 102], act: 3, art: { shape: 'dragon', c1: '#3a7a5a', c2: '#2a5a42' }, intents: [A(17), B(14), A(19)] },
  { key: 'void_walker', name: '虚空行者', hp: [62, 72], act: 3, art: { shape: 'ghost', c1: '#5a4a9a', e: '#8ef0ff' }, intents: [A(9, 2), BF('strength', 3), DB('weak', 2)] },
  { key: 'chimera', name: '奇美拉', hp: [98, 110], act: 3, art: { shape: 'beast', c1: '#9a6a2a', e: '#ffd34d' }, intents: [A(12), DB('poison', 3), A(18)] },
  { key: 'fallen_knight', name: '堕落骑士', hp: [128, 140], act: 3, elite: true, art: { shape: 'hum', weapon: 'sword', helm: true, shield: true, c1: '#2a1a3a', c2: '#1a1028' }, intents: [A(15, 2), B(18), A(24)] },
  { key: 'chaos_avatar', name: '混沌化身', hp: [132, 148], act: 3, elite: true, art: { shape: 'demon', c1: '#6a2a8a', c2: '#4a1a62', wings: true, e: '#8ef0ff' }, intents: [A(18), BF('strength', 4), DB('vulnerable', 3), A(13, 2)] },
  { key: 'annihilator', name: '塔主 · 湮灭者', hp: [320, 345], act: 3, boss: true, art: { shape: 'demon', c1: '#3a1a4a', c2: '#250f30', wings: true, crown: true, e: '#ff5a4d' }, intents: [W(), A(32), A(11, 2), DB('vulnerable', 3), BF('strength', 4), A(20)] },
];
const ENEMY_BY = {};
for (const e of ENEMIES) ENEMY_BY[e.key] = e;

const ENCOUNTERS = {
  1: { mobs: [['slime_s'], ['slime_s', 'slime_s'], ['slime_m'], ['bat', 'bat'], ['shroom'], ['skel'], ['bandit', 'bandit'], ['bug'], ['slime_m', 'bat']],
       elites: [['gargoyle'], ['jailer']], boss: ['slime_king'] },
  2: { mobs: [['knight'], ['apprentice', 'apprentice'], ['mage'], ['assassin', 'assassin'], ['golem'], ['hound', 'hound'], ['knight', 'apprentice'], ['priest']],
       elites: [['executioner'], ['war_golem']], boss: ['ancient_guardian'] },
  3: { mobs: [['abyss_mage'], ['blood_fiend'], ['dragonkin'], ['void_walker', 'void_walker'], ['chimera'], ['abyss_mage', 'void_walker']],
       elites: [['fallen_knight'], ['chaos_avatar']], boss: ['annihilator'] },
};
const ACT_NAME = { 1: '第一幕 · 苔痕洞窟', 2: '第二幕 · 沉默城塞', 3: '第三幕 · 湮灭之巅' };
