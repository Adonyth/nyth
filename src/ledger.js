// ledger.js — 本地见证账本：append-only hash 链。
// 性质：只记录本机 agent 行为的不可回填时间线（每条链上一条的 hash——改任何历史行都会断链）。
// 纪律：账本行只存 payload 的 hash（明文留在各自 store）；对外只发链头 hash。
// 这是"可问责 agent"的地基：冻结→结算→打分的每一步都落一条链上行。

const KEY = 'nyth.l1.ledger';

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function save(chain) { localStorage.setItem(KEY, JSON.stringify(chain)); }

// 追加一条账本行。type 如 'receipt.freeze' / 'receipt.resolve'；payload 为对象（只入 hash）。
export async function appendEntry(type, payload) {
  const chain = load();
  const prev = chain.length ? chain[chain.length - 1].hash : 'genesis';
  const seq = chain.length + 1;
  const ts = new Date().toISOString();
  const payloadHash = await sha256(JSON.stringify(payload));
  const hash = await sha256(`${seq}|${ts}|${type}|${payloadHash}|${prev}`);
  const entry = { seq, ts, type, payloadHash, prevHash: prev, hash };
  chain.push(entry);
  save(chain);
  return entry;
}

// 全链复算校验：任何人（或未来的你）可验证没有一行被改动/插入/删除。
export async function verifyChain() {
  const chain = load();
  let prev = 'genesis';
  for (const e of chain) {
    const expect = await sha256(`${e.seq}|${e.ts}|${e.type}|${e.payloadHash}|${prev}`);
    if (expect !== e.hash) return { ok: false, badSeq: e.seq };
    prev = e.hash;
  }
  return { ok: true, length: chain.length, head: prev };
}

export function head() {
  const chain = load();
  return chain.length ? chain[chain.length - 1].hash : 'genesis';
}
export function length() { return load().length; }

// 导出账本（hash 链本体，可外发——不含任何明文内容）。
export function exportLedger() {
  return { _app: 'nyth-l1', _kind: 'witness-ledger', _exportedAt: new Date().toISOString(), chain: load() };
}
