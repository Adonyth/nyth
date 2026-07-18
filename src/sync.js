// sync.js — 跨设备记忆连续性（本地优先，经你自己的枢纽，零第三方云）。
// 协议：append-only op-log；合并 = 同 key 以最新 ts 胜（LWW）。
// 每台设备有 deviceId；本地产生的记忆变更记为 op，push 给枢纽；轮询 pull 远端 op 并合并。
// 诚实边界：v0 做完整性与局域网边界；端到端加密列为下一步（未加密前不要跨公网用）。

import { store } from './store.js';

const OPLOG_KEY = 'nyth.l1.oplog';       // 本地 op 历史（含远端合并进来的）
const PUSHED_KEY = 'nyth.l1.sync.pushed'; // 已推送 opId 集
const SINCE_KEY = 'nyth.l1.sync.since';   // 已拉到的枢纽 seq
const DEV_KEY = 'nyth.l1.deviceId';

export function deviceId() {
  let id = localStorage.getItem(DEV_KEY);
  if (!id) {
    id = 'dev-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem(DEV_KEY, id);
  }
  return id;
}

function loadOps() { try { return JSON.parse(localStorage.getItem(OPLOG_KEY)) || []; } catch { return []; } }
function saveOps(ops) { localStorage.setItem(OPLOG_KEY, JSON.stringify(ops)); }

// 本地记忆变更 → 记一条 op（由 memory.js 调用）
export function recordOp(kind, k = '', v = '') {
  const ops = loadOps();
  ops.push({
    opId: deviceId() + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    deviceId: deviceId(),
    ts: Date.now(),
    kind, k, v,
  });
  saveOps(ops);
}

// LWW 合并：从全量 op-log 重算记忆物化视图（clear 之后的 op 才生效；同 k 最新 ts 胜）
export function materialize() {
  const ops = loadOps().slice().sort((a, b) => a.ts - b.ts || (a.opId < b.opId ? -1 : 1));
  let mem = new Map();
  for (const op of ops) {
    if (op.kind === 'clear') mem = new Map();
    else if (op.kind === 'remember' && op.k) mem.set(op.k, { k: op.k, v: op.v, at: op.ts });
    else if (op.kind === 'forget' && op.k) mem.delete(op.k);
  }
  const list = [...mem.values()].sort((a, b) => a.at - b.at);
  store.setMemory(list);
  return list;
}

// ── 与枢纽的同步循环 ──────────────────────────────────────
let timer = null;
let statusCb = () => {};
export function onStatus(cb) { statusCb = cb; }

function hubBase() {
  const s = store.getSettings();
  return (s.hubUrl || window.location.origin).replace(/\/+$/, '');
}

async function pushNew() {
  const pushed = new Set(JSON.parse(localStorage.getItem(PUSHED_KEY) || '[]'));
  const mine = loadOps().filter((o) => o.deviceId === deviceId() && !pushed.has(o.opId));
  if (!mine.length) return 0;
  const res = await fetch(hubBase() + '/api/sync/push', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops: mine }),
  });
  if (!res.ok) throw new Error('push ' + res.status);
  for (const o of mine) pushed.add(o.opId);
  localStorage.setItem(PUSHED_KEY, JSON.stringify([...pushed]));
  return mine.length;
}

async function pullNew() {
  const since = parseInt(localStorage.getItem(SINCE_KEY) || '0', 10);
  const res = await fetch(hubBase() + `/api/sync/pull?since=${since}`);
  if (!res.ok) throw new Error('pull ' + res.status);
  const data = await res.json();
  const ops = loadOps();
  const known = new Set(ops.map((o) => o.opId));
  let added = 0;
  for (const op of data.ops || []) {
    if (!known.has(op.opId)) { ops.push(op); known.add(op.opId); added++; }
  }
  if (added) saveOps(ops);
  localStorage.setItem(SINCE_KEY, String(data.seq || since));
  return added;
}

async function tick() {
  try {
    const pushed = await pushNew();
    const pulled = await pullNew();
    if (pulled) materialize();
    statusCb({ ok: true, pushed, pulled, device: deviceId() });
    return pulled;
  } catch (e) {
    statusCb({ ok: false, error: e.message });
    return 0;
  }
}

export function start(intervalMs = 2000) {
  if (timer) return;
  // 首启：把存量记忆迁入 op-log（一次性，防老数据丢失）
  if (!loadOps().length) {
    for (const m of store.getMemory()) recordOp('remember', m.k, m.v);
  }
  tick();
  timer = setInterval(tick, intervalMs);
}
export function stop() { if (timer) { clearInterval(timer); timer = null; } statusCb({ ok: false, stopped: true }); }
export function running() { return !!timer; }
