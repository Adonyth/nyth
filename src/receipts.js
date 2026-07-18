// receipts.js — 可问责建议的生命周期：freeze → resolve → score。
// 机制（协议级）：nyth 每次主动开口 = 一条被冻结的预测；用户后续行为 = resolve；
// 打分史可回看。每一步落一条见证账本行（ledger.js）。
// 诚实边界：这是本机 agent 行为的问责记录，不是产品效果宣称。

import { appendEntry } from './ledger.js';

const KEY = 'nyth.l1.receipts';
const EXPIRE_MS = 48 * 3600 * 1000; // 48h 未回应 = expired（沉默也是一种 resolve）

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

// 冻结一条主动建议（预测）。返回 receipt（含账本 seq）。
export async function freeze(prediction, context = '') {
  const list = load();
  const receipt = {
    id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: new Date().toISOString(),
    prediction,
    context,
    status: 'frozen',
    outcome: null,
    resolvedAt: null,
  };
  const entry = await appendEntry('receipt.freeze', { id: receipt.id, prediction, context, ts: receipt.ts });
  receipt.ledgerSeq = entry.seq;
  list.push(receipt);
  save(list);
  return receipt;
}

// 结算：useful（用户采纳/觉得有用）| not_useful | expired（超时沉默）。
export async function resolve(id, outcome) {
  const list = load();
  const r = list.find((x) => x.id === id);
  if (!r || r.status !== 'frozen') return null;
  r.status = 'resolved';
  r.outcome = outcome;
  r.resolvedAt = new Date().toISOString();
  const entry = await appendEntry('receipt.resolve', { id, outcome, ts: r.resolvedAt });
  r.resolveLedgerSeq = entry.seq;
  save(list);
  return r;
}

// 页面加载时清算超时的 frozen（不回应≠没结果——它计入 expired，不许假装没发生）。
export async function expireStale() {
  const list = load();
  const now = Date.now();
  let n = 0;
  for (const r of list) {
    if (r.status === 'frozen' && now - Date.parse(r.ts) > EXPIRE_MS) {
      await resolve(r.id, 'expired');
      n++;
    }
  }
  return n;
}

export function list() { return load().slice().reverse(); } // 新的在前

// 打分史：命中率只算已 resolve 的；frozen 不计入（未来不许拿"还没结算的"充数）。
export function stats() {
  const all = load();
  const resolved = all.filter((r) => r.status === 'resolved');
  const useful = resolved.filter((r) => r.outcome === 'useful').length;
  return {
    total: all.length,
    frozen: all.filter((r) => r.status === 'frozen').length,
    resolved: resolved.length,
    useful,
    notUseful: resolved.filter((r) => r.outcome === 'not_useful').length,
    expired: resolved.filter((r) => r.outcome === 'expired').length,
    hitRate: resolved.length ? Math.round((useful / resolved.length) * 100) : null,
  };
}
