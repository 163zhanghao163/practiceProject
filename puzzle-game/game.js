(() => {
  "use strict";

  /* ================= 配置 ================= */
  // 内联 SVG 笑脸作为默认图：零网络依赖、必定可加载
  const DEFAULT_IMAGE =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 256 256">' +
        '<rect width="256" height="256" rx="28" fill="#22315e"/>' +
        '<circle cx="128" cy="128" r="96" fill="#FFD700" stroke="#FFA500" stroke-width="6"/>' +
        '<circle cx="96" cy="104" r="12" fill="#333"/>' +
        '<circle cx="160" cy="104" r="12" fill="#333"/>' +
        '<path d="M84 152 Q128 196 172 152" stroke="#333" stroke-width="10" fill="none" stroke-linecap="round"/>' +
        "</svg>"
    );
  const PIECE_OUTPUT = 256; // 每片切片的输出分辨率，避免大屏/高分屏放大模糊
  const TIMER_TICK_MS = 250;

  /* ================= 状态 ================= */
  const state = {
    size: 4,
    mode: "number", // 'number' | 'image'
    imageSrc: "default", // 'default' | 'custom'
    customImageUrl: null,
    pieces: [], // 图片切片 dataURL；pieces[k] 对应拼块号 k+1
    board: [], // board[pos] = 拼块号；0 表示空格
    emptyPos: 0,
    moves: 0,
    startTime: null,
    timerId: null,
    playing: false,
    previewing: false,
    loading: false,
    loadGen: 0, // 异步加载代际号：用于丢弃过期的加载结果（防竞态）
  };

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const movesEl = $("movesEl");
  const timeEl = $("timeEl");
  const bestMovesEl = $("bestMovesEl");
  const bestTimeEl = $("bestTimeEl");
  const overlay = $("overlay");
  const resultText = $("resultText");
  const imgSrcRow = $("imgSrcRow");
  const fileInput = $("fileInput");
  const shuffleBtn = $("shuffleBtn");
  const solveBtn = $("solveBtn");
  const undoBtn = $("undoBtn");
  const srcDefaultBtn = $("srcDefault");
  const srcCustomBtn = $("srcCustom");

  let tiles = new Map(); // 拼块号 -> tile 元素（每个拼块固定一个元素，滑动靠 transform 过渡）
  let holeEl = null; // 空格虚线占位框
  let history = []; // 悔棋历史：{board, emptyPos} 快照栈

  /* ================= 音效（WebAudio 合成，M 键静音） ================= */
  const SFX = (() => {
    let ac = null, muted = false;
    try { muted = localStorage.getItem("puzzle-muted") === "1"; } catch (_) { muted = false; }
    function a() {
      if (!ac) { const AC = window.AudioContext || window.webkitAudioContext; if (AC) ac = new AC(); }
      if (ac && ac.state === "suspended") ac.resume();
      return ac;
    }
    function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
      const c = a(); if (!c || muted) return;
      const t0 = c.currentTime + when;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.02);
    }
    return {
      get muted() { return muted; },
      toggle() { muted = !muted; try { localStorage.setItem("puzzle-muted", muted ? "1" : "0"); } catch (_) {} return muted; },
      slide(back) { tone(back ? 190 : 230 + Math.random() * 50, 0.07, "triangle", 0.09, 0, back ? 120 : 150); },
      win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, "square", 0.08, i * 0.09)); },
    };
  })();

  /* ================= 小工具 ================= */
  const cellCount = () => state.size * state.size;

  const fmtTime = (sec) => {
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const setMoves = () => {
    movesEl.textContent = String(state.moves);
  };
  const setTime = (sec) => {
    timeEl.textContent = fmtTime(sec);
  };

  const bestKey = () => `dsh_puzzle_best_${state.size}_${state.mode}`;

  function refreshBest() {
    let best = null;
    try {
      const raw = localStorage.getItem(bestKey());
      if (raw) best = JSON.parse(raw);
    } catch (_) {
      best = null;
    }
    bestMovesEl.textContent =
      best && Number.isFinite(best.moves) ? String(best.moves) : "—";
    bestTimeEl.textContent =
      best && Number.isFinite(best.time) ? fmtTime(best.time) : "—";
  }

  function saveBest(moves, sec) {
    try {
      const cur = JSON.parse(localStorage.getItem(bestKey()) || "null") || {};
      cur.moves = Math.min(Number.isFinite(cur.moves) ? cur.moves : Infinity, moves);
      cur.time = Math.min(Number.isFinite(cur.time) ? cur.time : Infinity, sec);
      localStorage.setItem(bestKey(), JSON.stringify(cur));
      refreshBest();
    } catch (_) {
      /* localStorage 不可用时静默忽略 */
    }
  }

  /* ================= 棋盘模型 ================= */
  // 目标布局：1..n-1 依序排列，空格固定在最后一个位置（右下角）。
  // 这样图片模式下 piece[k] 恰好落在位置 k，才能拼出完整原图。
  function solvedBoard() {
    const n = cellCount();
    const b = new Array(n);
    for (let i = 0; i < n - 1; i++) b[i] = i + 1;
    b[n - 1] = 0;
    return b;
  }

  function isSolvedArr(b) {
    const n = b.length;
    for (let i = 0; i < n - 1; i++) {
      if (b[i] !== i + 1) return false;
    }
    return b[n - 1] === 0;
  }

  const isSolved = () => isSolvedArr(state.board);

  function neighborsOf(pos) {
    const size = state.size;
    const r = (pos / size) | 0;
    const c = pos % size;
    const out = [];
    if (r > 0) out.push(pos - size);
    if (r < size - 1) out.push(pos + size);
    if (c > 0) out.push(pos - 1);
    if (c < size - 1) out.push(pos + 1);
    return out;
  }

  function isMovable(pos) {
    if (pos < 0 || pos >= cellCount()) return false;
    const size = state.size;
    const dr = Math.abs(((pos / size) | 0) - ((state.emptyPos / size) | 0));
    const dc = Math.abs((pos % size) - (state.emptyPos % size));
    return dr + dc === 1; // 相邻（上下左右）
  }

  /* ================= 渲染 ================= */
  function buildTiles() {
    boardEl.style.setProperty("--size", state.size);
    boardEl.innerHTML = "";
    tiles = new Map();
    const n = cellCount();
    const frag = document.createDocumentFragment();
    for (let tile = 1; tile < n; tile++) {
      const el = document.createElement("div");
      el.className = "tile";
      el.dataset.tile = String(tile);
      tiles.set(tile, el);
      frag.appendChild(el);
    }
    holeEl = document.createElement("div");
    holeEl.className = "hole";
    frag.appendChild(holeEl);
    boardEl.appendChild(frag);
  }

  // 就地更新所有拼块位置（改 --c/--r 触发 transform 滑动过渡）
  function paint(arr) {
    const imgMode = state.mode === "image";
    for (let pos = 0; pos < arr.length; pos++) {
      const tile = arr[pos];
      if (tile === 0) continue;
      const el = tiles.get(tile);
      el.style.setProperty("--c", String(pos % state.size));
      el.style.setProperty("--r", String((pos / state.size) | 0));
      const movable = state.playing && !state.previewing && isMovable(pos);
      let cls = "tile";
      if (imgMode) {
        cls += " image-mode";
        el.style.backgroundImage = `url("${state.pieces[tile - 1]}")`;
        el.textContent = "";
      } else {
        el.style.backgroundImage = "";
        el.textContent = String(tile);
      }
      if (movable) cls += " movable";
      el.className = cls;
    }
    holeEl.style.setProperty("--c", String(state.emptyPos % state.size));
    holeEl.style.setProperty("--r", String((state.emptyPos / state.size) | 0));
    // 仅在进行中的游戏达成目标时点亮完成描边
    boardEl.classList.toggle("done", state.playing && isSolvedArr(arr));
    updateUndo();
  }

  function updateUndo() {
    undoBtn.disabled = !state.playing || state.previewing || history.length === 0;
  }

  /* ================= 交互 ================= */
  function attemptMove(pos) {
    if (!state.playing || state.previewing || state.loading) return false;
    if (pos === state.emptyPos || !isMovable(pos)) return false;

    history.push({ board: state.board.slice(), emptyPos: state.emptyPos });
    state.board[state.emptyPos] = state.board[pos];
    state.board[pos] = 0;
    state.emptyPos = pos;

    state.moves++;
    setMoves();
    if (!state.timerId) startTimer(); // 首次有效移动才开始计时

    SFX.slide(false);
    paint(state.board);
    if (isSolved()) win();
    return true;
  }

  // 悔棋：恢复上一步棋盘（步数 +1 作为代价，防止刷最佳步数）
  function undo() {
    if (!state.playing || state.previewing || state.loading || !history.length) return;
    const h = history.pop();
    state.board = h.board;
    state.emptyPos = h.emptyPos;
    state.moves++;
    setMoves();
    SFX.slide(true);
    paint(state.board);
  }

  // 事件委托：棋盘上只挂一个监听器（拼块元素按拼块号索引）
  boardEl.addEventListener("click", (e) => {
    const t = e.target.closest(".tile");
    if (t) attemptMove(state.board.indexOf(Number(t.dataset.tile)));
  });

  // 方向键：把空格对应方向上的方块滑入空格；Z 悔棋；M 静音
  window.addEventListener("keydown", (e) => {
    const delta = { ArrowUp: state.size, ArrowDown: -state.size, ArrowLeft: 1, ArrowRight: -1 }[e.key];
    if (delta !== undefined) {
      if (attemptMove(state.emptyPos + delta)) e.preventDefault();
      return;
    }
    if (e.key === "z" || e.key === "Z") undo();
    if (e.key === "m" || e.key === "M") {
      SFX.toggle();
      shuffleBtn.title = SFX.muted ? "已静音" : "";
    }
  });

  /* ================= 计时 ================= */
  function startTimer() {
    state.startTime = Date.now();
    state.timerId = setInterval(() => {
      setTime(getElapsedSec());
    }, TIMER_TICK_MS);
  }

  function stopTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  function getElapsedSec() {
    return state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
  }

  /* ================= 胜利 ================= */
  function win() {
    stopTimer();
    state.playing = false;
    const sec = getElapsedSec();
    setTime(sec);
    saveBest(state.moves, sec);
    SFX.win();
    boardEl.classList.add("win");                       // 对角线波次脉冲
    setTimeout(() => boardEl.classList.remove("win"), 750);
    resultText.textContent = `用时 ${fmtTime(sec)}，共 ${state.moves} 步。`;
    setTimeout(() => overlay.classList.remove("hidden"), 650);
  }

  /* ================= 开局 / 重置 ================= */
  function setLoading(on) {
    state.loading = on;
    boardEl.classList.toggle("loading", on);
    shuffleBtn.disabled = on;
    solveBtn.disabled = on;
  }

  function resetRound() {
    exitPreview(false);
    state.loadGen++; // 使进行中的图片加载失效
    state.playing = false;
    stopTimer();
    state.startTime = null;
    setTime(0);
    state.moves = 0;
    setMoves();
    history = [];
    boardEl.classList.remove("win");
    state.board = solvedBoard();
    state.emptyPos = cellCount() - 1;
  }

  // 尺寸 / 模式 / 图片来源变化后的统一入口
  function startFreshRound() {
    resetRound();
    buildTiles();
    if (state.mode === "image") prepareImage();
    else paint(state.board);
  }

  function scramble() {
    if (state.loading) return;
    exitPreview(false);

    // 从已解状态出发做随机游走 —— 天然保证有解；
    // 禁止立即回退上一步，并确保结果不是已解状态。
    const n = cellCount();
    let b, empty;
    do {
      b = solvedBoard();
      empty = n - 1;
      let last = -1;
      for (let i = 0, steps = n * 60; i < steps; i++) {
        const opts = neighborsOf(empty).filter((p) => p !== last);
        const pick = opts[(Math.random() * opts.length) | 0];
        b[empty] = b[pick];
        b[pick] = 0;
        last = empty;
        empty = pick;
      }
    } while (isSolvedArr(b));

    state.board = b;
    state.emptyPos = empty;
    state.moves = 0;
    setMoves();
    state.playing = true;
    history = [];
    stopTimer();
    state.startTime = null;
    setTime(0);
    boardEl.classList.add("no-anim"); // 随机游走过程不做滑动动画
    paint(state.board);
    // 强制回流使禁用动画生效后立即恢复（双 rAF 在后台标签页可能被节流不触发）
    void boardEl.offsetWidth;
    boardEl.classList.remove("no-anim");
  }

  /* ================= 图片切割 ================= */
  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (!url.startsWith("data:")) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load error"));
      img.src = url;
    });
  }

  // 居中正方形裁剪 -> 均分切片；固定输出 PIECE_OUTPUT 见方，缩放显示更清晰
  function sliceImage(img, size) {
    const w = img.naturalWidth || PIECE_OUTPUT * 2;
    const h = img.naturalHeight || PIECE_OUTPUT * 2;
    const cell = Math.max(8, Math.floor(Math.min(w, h) / size));
    const crop = cell * size; // 保证整除，每片等大
    const sx = ((w - crop) / 2) | 0;
    const sy = ((h - crop) / 2) | 0;

    const cv = document.createElement("canvas");
    cv.width = PIECE_OUTPUT;
    cv.height = PIECE_OUTPUT;
    const ctx = cv.getContext("2d");

    const pieces = [];
    for (let k = 0; k < size * size - 1; k++) {
      const r = (k / size) | 0;
      const c = k % size;
      ctx.clearRect(0, 0, PIECE_OUTPUT, PIECE_OUTPUT);
      ctx.drawImage(img, sx + c * cell, sy + r * cell, cell, cell, 0, 0, PIECE_OUTPUT, PIECE_OUTPUT);
      pieces.push(cv.toDataURL("image/png"));
    }
    return pieces;
  }

  async function prepareImage() {
    const gen = ++state.loadGen;
    setLoading(true);
    const url =
      state.imageSrc === "custom" && state.customImageUrl
        ? state.customImageUrl
        : DEFAULT_IMAGE;
    try {
      const img = await loadImage(url);
      if (gen !== state.loadGen) return; // 已过期（用户切换了尺寸/来源）
      state.pieces = sliceImage(img, state.size);
      if (gen !== state.loadGen) return;
      setLoading(false);
      paint(state.board);
    } catch (err) {
      if (gen !== state.loadGen) return;
      setLoading(false);
      console.error(err);
      alert("图片加载失败，请重试或更换图片。");
    }
  }

  /* ================= 预览原图 ================= */
  function enterPreview() {
    state.previewing = true;
    solveBtn.textContent = "🔁 恢复拼图";
    paint(solvedBoard()); // 复用统一渲染：直接画目标布局
  }

  function exitPreview(rerender = true) {
    if (!state.previewing) return;
    state.previewing = false;
    solveBtn.textContent = "👁 预览原图";
    if (rerender) paint(state.board);
  }

  solveBtn.addEventListener("click", () => {
    if (state.mode !== "image" || state.pieces.length === 0 || state.loading) return;
    state.previewing ? exitPreview() : enterPreview();
  });

  /* ================= 控件事件 ================= */
  function setSegActive(activeBtn, groupSel) {
    document.querySelectorAll(groupSel).forEach((b) => b.classList.remove("active"));
    activeBtn.classList.add("active");
  }

  $("modeNumber").addEventListener("click", () => {
    if (state.mode === "number") return;
    state.mode = "number";
    setSegActive($("modeNumber"), ".seg-btn#modeNumber, .seg-btn#modeImage");
    imgSrcRow.hidden = true;
    solveBtn.hidden = true;
    startFreshRound();
    refreshBest();
  });

  $("modeImage").addEventListener("click", () => {
    if (state.mode === "image") return;
    state.mode = "image";
    setSegActive($("modeImage"), ".seg-btn#modeNumber, .seg-btn#modeImage");
    imgSrcRow.hidden = false;
    solveBtn.hidden = false;
    startFreshRound();
    refreshBest();
  });

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = parseInt(btn.dataset.size, 10);
      if (size === state.size) return;
      setSegActive(btn, ".diff-btn");
      state.size = size;
      startFreshRound();
      refreshBest();
    });
  });

  srcDefaultBtn.addEventListener("click", () => {
    if (state.imageSrc === "default") return;
    state.imageSrc = "default";
    state.customImageUrl = null;
    setSegActive(srcDefaultBtn, "#srcDefault, #srcCustom");
    resetRound();
    buildTiles();
    prepareImage();
  });

  // 先选文件，成功读取后才切换到“本地图片”，取消选择不打乱 UI 状态
  srcCustomBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.imageSrc = "custom";
      state.customImageUrl = reader.result;
      setSegActive(srcCustomBtn, "#srcDefault, #srcCustom");
      resetRound();
      buildTiles();
      prepareImage();
    };
    reader.onerror = () => alert("读取图片文件失败，请重试。");
    reader.readAsDataURL(file);
  });

  shuffleBtn.addEventListener("click", scramble);
  undoBtn.addEventListener("click", undo);

  $("playAgain").addEventListener("click", () => {
    overlay.classList.add("hidden");
    scramble();
  });

  /* ================= 启动 ================= */
  solveBtn.hidden = true; // 数字模式无需预览
  resetRound(); // 先初始化棋盘数据，否则 board 为空、滑块没有坐标会全部叠在左上角
  buildTiles();
  paint(state.board);
  refreshBest();
})();
