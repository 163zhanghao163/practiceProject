(() => {
  "use strict";

  /* ================= 配置 ================= */
  // 内联 SVG 风景画作为默认图：零网络依赖、必定可加载、各区域色彩差异明显便于辨认
  const DEFAULT_IMAGE =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">' +
        "<defs>" +
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#8ec9ff"/><stop offset="1" stop-color="#eaf6ff"/>' +
        "</linearGradient>" +
        '<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0" stop-color="#3f8fe0"/><stop offset="1" stop-color="#7cc4f2"/>' +
        "</linearGradient>" +
        "</defs>" +
        '<rect width="512" height="288" fill="url(#sky)"/>' +
        '<circle cx="96" cy="86" r="60" fill="#FFE066" opacity="0.35"/>' +
        '<circle cx="96" cy="86" r="46" fill="#FFE066"/>' +
        '<g fill="#ffffff" opacity="0.95">' +
        '<ellipse cx="330" cy="70" rx="44" ry="16"/><ellipse cx="304" cy="80" rx="26" ry="12"/><ellipse cx="358" cy="80" rx="28" ry="13"/>' +
        '<ellipse cx="210" cy="126" rx="32" ry="12"/><ellipse cx="190" cy="134" rx="18" ry="9"/><ellipse cx="232" cy="134" rx="20" ry="10"/>' +
        '<ellipse cx="438" cy="150" rx="28" ry="11"/><ellipse cx="420" cy="158" rx="16" ry="8"/></g>' +
        '<polygon points="0,288 110,140 230,288" fill="#8a93c9"/>' +
        '<polygon points="110,140 92,168 128,168" fill="#ffffff"/>' +
        '<polygon points="150,288 300,120 460,288" fill="#7683bd"/>' +
        '<polygon points="300,120 278,152 322,152" fill="#ffffff"/>' +
        '<path d="M0,288 Q120,218 260,288 Z" fill="#58b368"/>' +
        '<rect y="288" width="512" height="224" fill="#6cc07a"/>' +
        '<ellipse cx="360" cy="400" rx="150" ry="70" fill="url(#lake)"/>' +
        '<ellipse cx="320" cy="378" rx="60" ry="14" fill="#cfeaff" opacity="0.7"/>' +
        '<rect x="130" y="340" width="84" height="64" fill="#f6e7c1"/>' +
        '<polygon points="122,344 172,306 222,344" fill="#d9534f"/>' +
        '<rect x="196" y="314" width="10" height="22" fill="#b0553a"/>' +
        '<rect x="162" y="368" width="20" height="36" fill="#8a5a33"/>' +
        '<rect x="138" y="352" width="18" height="16" fill="#9adcf5"/>' +
        '<rect x="54" y="350" width="12" height="44" fill="#7a4a2b"/>' +
        '<circle cx="60" cy="330" r="30" fill="#2e8b57"/><circle cx="42" cy="346" r="17" fill="#2e8b57"/><circle cx="78" cy="344" r="17" fill="#2e8b57"/>' +
        '<rect x="446" y="342" width="9" height="30" fill="#7a4a2b"/>' +
        '<circle cx="450" cy="326" r="21" fill="#3ca06a"/>' +
        '<g><circle cx="46" cy="452" r="5" fill="#ff8fab"/><circle cx="84" cy="470" r="5" fill="#ffd166"/><circle cx="120" cy="450" r="5" fill="#c77dff"/><circle cx="160" cy="474" r="5" fill="#ff8fab"/></g>' +
        '<g stroke="#3a4664" stroke-width="3" fill="none" stroke-linecap="round">' +
        '<path d="M296,182 q9,-10 18,0 q9,-10 18,0"/><path d="M350,208 q7,-8 14,0 q7,-8 14,0"/></g>' +
        "</svg>"
    );
  const TIMER_TICK_MS = 250;

  /* ================= 状态 ================= */
  const state = {
    size: 4,
    imageSrc: "default", // 'default' | 'custom'
    imageUrl: DEFAULT_IMAGE,
    pieces: [], // 切片 dataURL；pieces[k] 对应拼块号 k，正确位置即格子 k
    cells: [], // cells[idx] = 拼块号 或 -1（空）
    tray: [], // 拼块区里的拼块号列表
    moves: 0,
    startTime: null,
    timerId: null,
    playing: false,
    finished: false,
    hint: false,
    loading: false,
    loadGen: 0, // 异步代际号：丢弃过期加载结果
  };

  /* ================= DOM ================= */
  const $ = (id) => document.getElementById(id);
  const boardEl = $("board");
  const boardFrame = $("boardFrame");
  const hintLayer = $("hintLayer");
  const trayEl = $("tray");
  const trayCountEl = $("trayCount");
  const movesEl = $("movesEl");
  const timeEl = $("timeEl");
  const progEl = $("progEl");
  const bestMovesEl = $("bestMovesEl");
  const bestTimeEl = $("bestTimeEl");
  const winOverlay = $("winOverlay");
  const resultText = $("resultText");
  const previewModal = $("previewModal");
  const previewImg = $("previewImg");
  const previewCaption = $("previewCaption");
  const previewBtn = $("previewBtn");
  const previewClose = $("previewClose");
  const fileInput = $("fileInput");
  const shuffleBtn = $("shuffleBtn");
  const hintBtn = $("hintBtn");
  const srcDefaultBtn = $("srcDefault");
  const srcCustomBtn = $("srcCustom");

  /* ================= 小工具 ================= */
  const cellCount = () => state.size * state.size;
  const correctCount = () =>
    state.cells.reduce((acc, pid, idx) => acc + (pid === idx ? 1 : 0), 0);

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
  const updateProgress = () => {
    progEl.textContent = `${correctCount()} / ${cellCount()}`;
  };

  const bestKey = () => `dsh_drag_best_${state.size}`;

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

  /* ================= 计时 ================= */
  function startTimer() {
    state.startTime = Date.now();
    state.timerId = setInterval(() => setTime(getElapsedSec()), TIMER_TICK_MS);
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

  /* ================= 渲染 ================= */
  function renderBoard() {
    boardEl.style.setProperty("--size", state.size);
    boardEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let idx = 0; idx < cellCount(); idx++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.idx = String(idx);
      const pid = state.cells[idx];
      if (pid >= 0) {
        cell.classList.add("filled");
        const p = document.createElement("div");
        p.className = "piece" + (pid === idx ? " correct" : "");
        p.style.backgroundImage = `url("${state.pieces[pid]}")`;
        p.dataset.pid = String(pid);
        cell.appendChild(p);
      }
      frag.appendChild(cell);
    }
    boardEl.appendChild(frag);

    // 底图提示层
    hintLayer.style.backgroundImage = `url("${state.imageUrl}")`;
    hintLayer.classList.toggle("show", state.hint && !state.finished);
  }

  function renderTray() {
    const n = state.tray.length;
    // 根据数量自适应缩略图尺寸
    const thumb = n > 49 ? 46 : n > 25 ? 58 : n > 9 ? 74 : 92;
    trayEl.style.setProperty("--thumb", thumb + "px");
    trayEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const pid of state.tray) {
      const d = document.createElement("div");
      d.className = "tray-piece";
      d.style.backgroundImage = `url("${state.pieces[pid]}")`;
      d.dataset.pid = String(pid);
      frag.appendChild(d);
    }
    trayEl.appendChild(frag);
    trayCountEl.textContent = String(n);
  }

  function renderAll() {
    renderBoard();
    renderTray();
    updateProgress();
    refreshBest();
  }

  /* ================= 回合管理 ================= */
  function shuffledIds() {
    const a = [...Array(cellCount()).keys()];
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 重开一局：清空棋盘、打乱拼块区（切片必须已就绪）
  function newLayout() {
    state.cells = new Array(cellCount()).fill(-1);
    state.tray = shuffledIds();
    state.moves = 0;
    setMoves();
    updateProgress();
    stopTimer();
    state.startTime = null;
    setTime(0);
    state.playing = false;
    state.finished = false;
    renderAll();
  }

  function finish() {
    state.finished = true;
    stopTimer();
    const sec = getElapsedSec();
    setTime(sec);
    saveBest(state.moves, sec);
    resultText.textContent = `难度 ${state.size}×${state.size} · 用时 ${fmtTime(sec)} · 共 ${state.moves} 步`;
    renderBoard(); // 关闭底图提示、点亮全部完成描边
    setTimeout(() => winOverlay.classList.remove("hidden"), 300);
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

  // 居中正方形裁剪 -> size×size 均分切片
  function sliceImage(img, size) {
    const OUT = size <= 5 ? 256 : 192; // 高难度降低单片分辨率，控制内存
    const w = img.naturalWidth || OUT * 2;
    const h = img.naturalHeight || OUT * 2;
    const cell = Math.max(8, Math.floor(Math.min(w, h) / size));
    const crop = cell * size;
    const sx = ((w - crop) / 2) | 0;
    const sy = ((h - crop) / 2) | 0;

    const cv = document.createElement("canvas");
    cv.width = OUT;
    cv.height = OUT;
    const ctx = cv.getContext("2d");

    const pieces = [];
    for (let k = 0; k < size * size; k++) {
      const r = (k / size) | 0;
      const c = k % size;
      ctx.clearRect(0, 0, OUT, OUT);
      ctx.drawImage(img, sx + c * cell, sy + r * cell, cell, cell, 0, 0, OUT, OUT);
      pieces.push(cv.toDataURL("image/png"));
    }
    return pieces;
  }

  async function prepareImage() {
    const gen = ++state.loadGen;
    setLoading(true);
    try {
      const img = await loadImage(state.imageUrl);
      if (gen !== state.loadGen) return;
      state.pieces = sliceImage(img, state.size);
      if (gen !== state.loadGen) return;
      setLoading(false);
      newLayout();
    } catch (err) {
      if (gen !== state.loadGen) return;
      setLoading(false);
      console.error(err);
      alert("图片加载失败，请重试或更换图片。");
    }
  }

  function setLoading(on) {
    state.loading = on;
    boardFrame.classList.toggle("loading", on);
    for (const el of [
      shuffleBtn,
      previewBtn,
      hintBtn,
      srcDefaultBtn,
      srcCustomBtn,
      ...document.querySelectorAll(".diff-btn"),
    ]) {
      el.disabled = on;
    }
  }

  /* ================= 拖拽引擎（Pointer Events，支持鼠标/触屏） ================= */
  let drag = null; // {pid, from:{type:'tray'}|{type:'cell',idx}, ghost, srcEl}
  let hoverMark = null;

  const GAP = 4; // 与 style.css 中 .board 的 gap 保持一致

  function clearHover() {
    if (hoverMark) hoverMark.classList.remove("drop-target", "drop-zone");
    hoverMark = null;
  }

  // 几何命中测试：优先棋盘格，其次拼块区
  function hitTest(x, y) {
    const b = boardEl.getBoundingClientRect();
    if (x >= b.left && x <= b.right && y >= b.top && y <= b.bottom) {
      const slot = (b.width - GAP * (state.size - 1)) / state.size;
      const step = slot + GAP;
      let c = Math.floor((x - b.left) / step);
      let r = Math.floor((y - b.top) / step);
      c = Math.min(state.size - 1, Math.max(0, c));
      r = Math.min(state.size - 1, Math.max(0, r));
      return { type: "cell", idx: r * state.size + c };
    }
    const t = trayEl.getBoundingClientRect();
    if (x >= t.left && x <= t.right && y >= t.top && y <= t.bottom) {
      return { type: "tray" };
    }
    return null;
  }

  function moveGhost(x, y) {
    const g = drag.ghost;
    drag.ghostX = x - g.offsetWidth / 2;
    drag.ghostY = y - g.offsetHeight / 2;
    g.style.left = drag.ghostX + "px";
    g.style.top = drag.ghostY + "px";
  }

  function beginDrag(e, pid, from, srcEl) {
    if (drag || state.loading || state.finished || !state.pieces.length) return;
    e.preventDefault();
    const cs = boardEl.getBoundingClientRect().width / state.size;
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.style.width = cs + "px";
    ghost.style.height = cs + "px";
    ghost.style.backgroundImage = `url("${state.pieces[pid]}")`;
    document.body.appendChild(ghost);
    srcEl.classList.add("dragging");
    drag = { pid, from, ghost, srcEl };
    moveGhost(e.clientX, e.clientY);
  }

  function endDrag() {
    if (!drag) return;
    drag.srcEl.classList.remove("dragging");
    drag.ghost.remove();
    clearHover();
    drag = null;
  }

  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return; // 仅主键/触摸
    const pieceEl = e.target.closest(".piece,.tray-piece");
    if (!pieceEl) return;
    const hostCell = pieceEl.closest(".cell");
    const from = hostCell
      ? { type: "cell", idx: Number(hostCell.dataset.idx) }
      : { type: "tray" };
    beginDrag(e, Number(pieceEl.dataset.pid), from, pieceEl);
  }

  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    moveGhost(e.clientX, e.clientY);
    const hit = hitTest(e.clientX, e.clientY);
    clearHover();
    if (hit && hit.type === "cell") {
      const cell = boardEl.children[hit.idx];
      if (cell) {
        cell.classList.add("drop-target");
        hoverMark = cell;
      }
    } else if (hit && hit.type === "tray") {
      trayEl.classList.add("drop-zone");
      hoverMark = trayEl;
    }
  });

  window.addEventListener("pointerup", (e) => {
    if (!drag) return;
    const info = drag;
    const hit = hitTest(e.clientX, e.clientY);
    endDrag();
    resolveDrop(info, hit);
  });

  window.addEventListener("pointercancel", endDrag);

  trayEl.addEventListener("pointerdown", onPointerDown);
  boardEl.addEventListener("pointerdown", onPointerDown);

  // 落子规则：
  //   拼块区 -> 空格：放置；-> 已占用格：与该格拼块交换（对方回拼块区原位）
  //   格子 -> 格子：交换/移动
  //   格子 -> 拼块区：取回拼块区末尾
  function resolveDrop(info, hit) {
    let acted = false;
    if (hit) {
      if (hit.type === "cell") {
        const occ = state.cells[hit.idx];
        if (info.from.type === "tray") {
          if (occ < 0) {
            state.cells[hit.idx] = info.pid;
            state.tray.splice(state.tray.indexOf(info.pid), 1);
            acted = true;
          } else if (occ !== info.pid) {
            state.cells[hit.idx] = info.pid;
            state.tray.splice(state.tray.indexOf(info.pid), 1, occ);
            acted = true;
          }
        } else if (hit.idx !== info.from.idx) {
          state.cells[hit.idx] = info.pid;
          state.cells[info.from.idx] = occ; // occ 可能是 -1（空格），正好完成移动
          acted = true;
        }
      } else if (hit.type === "tray" && info.from.type === "cell") {
        state.cells[info.from.idx] = -1;
        state.tray.push(info.pid);
        acted = true;
      }
    }
    if (!acted) return;

    if (!state.playing) {
      state.playing = true;
      startTimer(); // 首次有效操作开始计时
    }
    state.moves++;
    setMoves();
    renderBoard();
    renderTray();
    updateProgress();
    if (correctCount() === cellCount()) finish();
  }

  /* ================= 控件事件 ================= */
  function setActive(btn, sel) {
    document.querySelectorAll(sel).forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  document.querySelectorAll(".diff-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const size = parseInt(btn.dataset.size, 10);
      if (size === state.size) return;
      setActive(btn, ".diff-btn");
      state.size = size;
      prepareImage();
      refreshBest();
    });
  });

  srcDefaultBtn.addEventListener("click", () => {
    if (state.imageSrc === "default") return;
    state.imageSrc = "default";
    state.imageUrl = DEFAULT_IMAGE;
    setActive(srcDefaultBtn, "#srcDefault, #srcCustom");
    prepareImage();
  });

  srcCustomBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ""; // 允许重复选择同一文件
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.imageSrc = "custom";
      state.imageUrl = reader.result;
      setActive(srcCustomBtn, "#srcDefault, #srcCustom");
      prepareImage();
    };
    reader.onerror = () => alert("读取图片文件失败，请重试。");
    reader.readAsDataURL(file);
  });

  shuffleBtn.addEventListener("click", () => {
    if (!state.loading && state.pieces.length) newLayout();
  });

  hintBtn.addEventListener("click", () => {
    state.hint = !state.hint;
    hintBtn.classList.toggle("active", state.hint);
    hintBtn.setAttribute("aria-pressed", String(state.hint));
    renderBoard();
  });

  previewBtn.addEventListener("click", () => {
    if (state.loading || !state.pieces.length) return;
    previewImg.onload = () => {
      previewCaption.textContent = `原图尺寸：${previewImg.naturalWidth} × ${previewImg.naturalHeight} px`;
    };
    previewImg.onerror = () => {
      previewCaption.textContent = "";
    };
    previewImg.src = state.imageUrl;
    previewModal.classList.remove("hidden");
  });
  previewClose.addEventListener("click", () => previewModal.classList.add("hidden"));
  previewModal.addEventListener("click", (e) => {
    if (e.target === previewModal) previewModal.classList.add("hidden");
  });

  $("playAgain").addEventListener("click", () => {
    winOverlay.classList.add("hidden");
    newLayout();
  });

  /* ================= 启动 ================= */
  refreshBest();
  prepareImage();
})();
