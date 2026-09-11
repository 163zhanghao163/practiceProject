"use strict";
/* 随机事件数据（选项的 run() 读写 G，返回结果文本；need(gold) 控制金币门槛） */

const EVENTS = [
  { id: 'altar', icon: '🗿', name: '神秘祭坛',
    text: '荒芜洞窟深处立着一座古老的祭坛，石面上的凹槽仿佛在等待着什么。',
    opts: [
      { label: '献上一张卡（随机移除一张卡）', run: () => { const r = removeRandomCard(); return r ? `祭坛吞没了你的「${r}」。卡组变得更加精炼。` : '你的卡组空空如也，祭坛毫无反应。'; } },
      { label: '献祭血液（失去 6 生命，获得随机遗物）', run: () => { G.hp = Math.max(1, G.hp - 6); const rl = grantRandomRelic(); return `鲜血渗入石缝……你获得了遗物「${rl}」！`; } },
      { label: '离开', run: () => '你绕开了祭坛，继续前行。' },
    ] },
  { id: 'chest', icon: '🧰', name: '古老宝箱',
    text: '走廊尽头放着一只落满灰尘的宝箱，锁扣早已锈蚀。也许里面是宝藏，也许……',
    opts: [
      { label: '打开宝箱', run: () => { if (Math.random() < 0.6) return `箱盖弹开——遗物「${grantRandomRelic()}」静静躺在丝绒上！`; dmgPlayer(10); return '箱子里窜出一条毒蛇！失去 10 生命。'; } },
      { label: '离开', run: () => '多一事不如少一事。' },
    ] },
  { id: 'merchant', icon: '🧙', name: '流浪商人',
    text: '披着斗篷的商人拦住你："稀罕货，只收现钱。"',
    opts: [
      { label: '购买遗物（40 金币）', need: g => g >= 40, run: () => { G.gold -= 40; return `一手交钱一手交货——「${grantRandomRelic()}」归你了。`; } },
      { label: '请求锻造（30 金币，升级随机卡）', need: g => g >= 30, run: () => { G.gold -= 30; const r = upgradeRandomCard(); return r ? `铁锤起落，「${r}」焕然一新！` : '你没有可升级的卡牌，商人退回了金币。'; } },
      { label: '离开', run: () => '你婉拒了商人。' },
    ] },
  { id: 'seer', icon: '🔮', name: '占卜师',
    text: '水晶球在黑暗中泛着微光："命运的价格是 30 枚金币。"',
    opts: [
      { label: '支付 30 金币，窥探命运', need: g => g >= 30, run: () => { G.gold -= 30; const roll = rand(3); if (roll === 0) { healPlayer(20); return '水晶球泛起暖光——你回复了 20 生命。'; } if (roll === 1) { G.gold += 90; return '你窥见了宝藏的位置——获得 90 金币！'; } const c = addRandomCard('rare'); return `命运指引你获得了稀有卡「${c}」！`; } },
      { label: '离开', run: () => '有些事还是不知道比较好。' },
    ] },
  { id: 'bloodpool', icon: '🩸', name: '血池',
    text: '一池粘稠的暗红液体散发着低语。浸入其中，痛楚会带来力量。',
    opts: [
      { label: '浸入血池（失去 10 生命，生命上限 +14）', run: () => { G.hp = Math.max(1, G.hp - 10); G.maxHp += 14; G.hp += 14; return '血管中奔涌着新的力量！生命上限 +14。'; } },
      { label: '离开', run: () => '你捂住鼻子跑开了。' },
    ] },
  { id: 'spring', icon: '⛲', name: '清澈泉水',
    text: '战斗旅途中难得的绿洲，泉水甘冽清甜。',
    opts: [
      { label: '饮水（回复 22 生命）', run: () => { healPlayer(22); return '泉水沁人心脾，伤口以肉眼可见的速度愈合。'; } },
      { label: '洗净卡牌（随机移除一张卡）', run: () => { const r = removeRandomCard(); return r ? `你把「${r}」放入泉水，它溶成了一缕光。` : '卡组空空如也。'; } },
      { label: '离开', run: () => '你灌满水壶，继续赶路。' },
    ] },
  { id: 'forge', icon: '⚒️', name: '废弃铁匠铺',
    text: '炉火竟还残存着微光，铁砧上放着一套完整的工具。',
    opts: [
      { label: '锻造卡牌（升级随机卡）', run: () => { const r = upgradeRandomCard(); return r ? `火花四溅——「${r}」被强化了！` : '没有可升级的卡牌。'; } },
      { label: '淬炼身体（生命上限 +10）', run: () => { G.maxHp += 10; G.hp += 10; return '你扛起铁砧走了两圈……生命上限 +10。'; } },
      { label: '离开', run: () => '炉火在你身后熄灭了。' },
    ] },
  { id: 'dice', icon: '🎲', name: '赌徒骰子',
    text: '骷髅赌徒摇晃着骰盅："押 50 金币，猜大小，翻倍！"',
    opts: [
      { label: '押注 50 金币', need: g => g >= 50, run: () => { G.gold -= 50; if (Math.random() < 0.5) { G.gold += 100; return '骰子停住了——你赢了！获得 100 金币。'; } return '骰子停住了……你输掉了 50 金币。'; } },
      { label: '离开', run: () => '十赌九输，你很清楚。' },
    ] },
  { id: 'library', icon: '📚', name: '遗忘图书馆',
    text: '倒塌的书架间漂浮着尘埃，一本发烫的典籍自动翻开了书页。',
    opts: [
      { label: '研读典籍（失去 6 生命，获得稀有卡）', run: () => { G.hp = Math.max(1, G.hp - 6); const c = addRandomCard('rare'); return `灼热的知识涌入脑海——获得稀有卡「${c}」！`; } },
      { label: '随手翻阅（获得普通卡）', run: () => { const c = addRandomCard('common'); return `你夹起了一张散页——获得「${c}」。`; } },
      { label: '离开', run: () => '书山太大，时间太少。' },
    ] },
  { id: 'whisper', icon: '👻', name: '幽魂低语',
    text: '一缕半透明的幽魂缠上你的肩膀，用它空洞的声音许诺着力量。',
    opts: [
      { label: '倾听低语（失去 8 生命，获得罕见卡）', run: () => { G.hp = Math.max(1, G.hp - 8); const c = addRandomCard('uncommon'); return `冰冷的低语钻入耳膜——获得罕见卡「${c}」。`; } },
      { label: '驱散幽魂（获得 30 金币）', run: () => { G.gold += 30; return '幽魂消散时落下它生前收藏的金币——+30 金币。'; } },
      { label: '离开', run: () => '你加快脚步甩开了它。' },
    ] },
  { id: 'statue', icon: '🏛️', name: '金色雕像',
    text: '纯金铸造的小雕像立在基座上，底座下似乎藏着机关。',
    opts: [
      { label: '搜刮雕像（+100 金币，50% 触发陷阱）', run: () => { G.gold += 100; if (Math.random() < 0.5) { dmgPlayer(12); return '金子到手！但脚下机关弩箭齐发——失去 12 生命。'; } return '金子到手，全身而退——+100 金币！'; } },
      { label: '离开', run: () => '你警惕地绕开了雕像。' },
    ] },
  { id: 'rift', icon: '🌀', name: '时空裂缝',
    text: '空间在这里撕开一道泛着紫光的裂缝，其中隐约有什么在旋转。',
    opts: [
      { label: '伸手触碰（获得随机遗物，生命上限 -12）', run: () => { G.maxHp = Math.max(30, G.maxHp - 12); G.hp = Math.min(G.hp, G.maxHp); const rl = grantRandomRelic(); return `裂缝中伸出无形之手——获得遗物「${rl}」！代价是生命上限 -12。`; } },
      { label: '离开', run: () => '你绕开了这不祥的裂缝。' },
    ] },
];
