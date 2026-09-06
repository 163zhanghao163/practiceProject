#!/usr/bin/env node
// Token 用量扫描 CLI —— 直接按路径扫描工具数据目录，输出 JSON 供网页导入
// 用法:
//   node scan-cli.mjs ~/.claude claude
//   node scan-cli.mbs C:\Users\you\.trae trae C:\Users\you\.zcode zcode
//   node scan-cli.mjs ~/.codex codex --out usage.json
// 多个 "目录 工具" 对依次排列；--out 写文件，否则打印到控制台
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const IN_KEYS = ["input_tokens", "prompt_tokens", "inputTokens", "promptTokens", "input"];
const OUT_KEYS = ["output_tokens", "completion_tokens", "outputTokens", "completionTokens", "output"];
const CACHE_KEYS = ["cache_read_input_tokens", "cache_creation_input_tokens", "cacheReadInputTokens", "cacheCreationInputTokens"];
const DATE_KEYS = ["date", "timestamp", "created_at", "time", "ts", "createdAt"];
const TODAY = new Date().toISOString().slice(0, 10);
const SKIP_DIRS = new Set(["node_modules", ".git", ".cache"]);

function pickDateRaw(o) {
  for (const k of DATE_KEYS) {
    if (o[k] === undefined || o[k] === null) continue;
    let v = o[k];
    if (typeof v === "number") v = v > 1e11 ? v : v > 1e9 ? v * 1000 : v;
    const d = new Date(v);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  return null;
}
function extract(obj, tool, found) {
  (function walk(o, pd) {
    if (!o || typeof o !== "object") return;
    if (Array.isArray(o)) { o.forEach(x => walk(x, pd)); return; }
    const iK = IN_KEYS.find(k => typeof o[k] === "number");
    const oK = OUT_KEYS.find(k => typeof o[k] === "number");
    if (iK && oK) {
      let inV = o[iK];
      for (const ck of CACHE_KEYS) if (typeof o[ck] === "number") inV += o[ck];
      found.push({ date: pickDateRaw(o) || pd || TODAY, tool, note: String(o.model || o.note || o.task || ""), in: inV, out: o[oK] });
      return;
    }
    const nd = pickDateRaw(o) || pd;
    if (o.usage) walk(o.usage, nd);
    for (const k of ["message", "response", "result", "data", "entries", "items", "events", "sessions"]) if (o[k]) walk(o[k], nd);
  })(obj, undefined);
}
function parseText(text, name, tool) {
  const found = [];
  try {
    if (/\.csv$/i.test(name)) {
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return found;
      const head = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/["']/g, ""));
      const iI = head.findIndex(h => IN_KEYS.includes(h)), iO = head.findIndex(h => OUT_KEYS.includes(h));
      const iD = head.findIndex(h => ["date", "timestamp", "time"].includes(h));
      for (const line of lines.slice(1)) {
        const c = line.split(",");
        found.push({ date: iD >= 0 ? (c[iD] || TODAY).slice(0, 10) : TODAY, tool, note: "", in: +c[iI] || 0, out: +c[iO] || 0 });
      }
    } else if (text.trim().startsWith("[")) {
      extract(JSON.parse(text), tool, found);
    } else {
      for (const line of text.split(/\r?\n/)) {
        if (!line.trim()) continue;
        try { extract(JSON.parse(line), tool, found); } catch { /* 坏行跳过 */ }
      }
    }
  } catch { /* 整文件失败跳过 */ }
  return found;
}
function walkDir(root, cb, depth = 0) {
  if (depth > 6) return;
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(root, e.name);
    if (e.isDirectory()) walkDir(full, cb, depth + 1);
    else if (/\.(jsonl|json|csv)$/i.test(e.name)) cb(full, e.name);
  }
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx >= 0 ? args[outIdx + 1] : null;
if (outIdx >= 0) args.splice(outIdx, 2);
if (args.length < 2) {
  console.error('用法: node scan-cli.mjs <目录> <工具名> [目录2 工具2 ...] [--out usage.json]');
  console.error('示例: node scan-cli.mjs ~/.claude claude ~/.codex codex --out usage.json');
  process.exit(1);
}
const records = [];
let filesScanned = 0;
for (let i = 0; i + 1 < args.length; i += 2) {
  const dir = args[i].replace(/^~(?=\/|\\|$)/, os.homedir());
  const tool = args[i + 1];
  if (!fs.existsSync(dir)) { console.error(`⚠ 目录不存在: ${dir}`); continue; }
  walkDir(dir, (full, name) => {
    try {
      const st = fs.statSync(full);
      if (st.size > 50 * 1024 * 1024) return;
      const recs = parseText(fs.readFileSync(full, "utf8"), name, tool);
      filesScanned++;
      if (!recs.length) return;
      const sum = recs.reduce((a, r) => ({ i: a.i + r.in, o: a.o + r.out }), { i: 0, o: 0 });
      const dates = recs.map(r => r.date).sort();
      // 按天拆分记录，日期更精确
      const byDay = {};
      for (const r of recs) { (byDay[r.date] = byDay[r.date] || { i: 0, o: 0 }); byDay[r.date].i += r.in; byDay[r.date].o += r.out; }
      for (const [d, v] of Object.entries(byDay)) {
        records.push({ date: d, tool, note: path.relative(dir, full), in: v.i, out: v.o, src: "扫描" });
      }
    } catch { /* 读取失败跳过 */ }
  });
}
const json = JSON.stringify(records, null, 2);
if (outFile) { fs.writeFileSync(outFile, json); console.error(`✓ ${records.length} 条记录（${filesScanned} 个文件）→ ${outFile}`); }
else console.log(json);
