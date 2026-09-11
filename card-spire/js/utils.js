"use strict";
/* 工具函数 + 全局杂项（所有页面共享的全局池） */
const $ = s => document.querySelector(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rand = n => Math.floor(Math.random() * n);
const randInt = (a, b) => a + rand(b - a + 1);
const choice = arr => arr[rand(arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

let UID = 1;
const FX = []; // 战斗飘字队列（结算时压入，渲染后统一播放）

/* ---------------- Buff 定义 ---------------- */
const BUFFS = {
  strength:  { name: '力量', icon: '💪', good: true,  desc: '每次攻击伤害 +X' },
  dexterity: { name: '敏捷', icon: '🌀', good: true,  desc: '获得格挡 +X' },
  vulnerable:{ name: '易伤', icon: '💔', good: false, desc: '受到攻击伤害 ×1.5' },
  weak:      { name: '虚弱', icon: '😵', good: false, desc: '造成攻击伤害 ×0.75' },
  poison:    { name: '中毒', icon: '🧪', good: false, desc: '回合开始失去 X 点生命，然后 -1 层' },
  thorns:    { name: '荆棘', icon: '🌵', good: true,  desc: '被攻击时反弹 X 点伤害' },
  growth:    { name: '蛮力', icon: '🔥', good: true,  desc: '每回合开始获得 X 层力量' },
  charge:    { name: '充能', icon: '⚡', good: true,  desc: '每回合开始额外获得 X 点能量' },
  barricade: { name: '壁垒', icon: '🏰', good: true,  desc: '格挡在回合开始不再清零' },
};
