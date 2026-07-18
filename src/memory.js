// memory.js — 记忆引擎。差异化核心（研究：跨形态/跨会话连续性 = 唯一剩的候选真-moat）。
// L1 最小实现：从对话抽取稳定事实 → 本地持久 → 注入后续系统提示（grounding + 个性化）。
// 抽取用启发式（零依赖、离线可用）；接了真模型后可升级为模型抽取。

import { store } from './store.js';
import { complete } from './llm.js';

const STOP = '\\s，。,.!！?？、；;:：'; // 值不该跨过的标点/空白
const PATTERNS = [
  { k: '名字', re: new RegExp(`(?:我叫|我的名字是|我名字叫)\\s*([^${STOP}]{1,12})`) },
  { k: '在做', re: new RegExp(`(?:我在做|我正在做|我的项目是|我在搞)\\s*([^${STOP}]{1,40})`) },
  { k: '喜欢', re: new RegExp(`(?:我喜欢|我爱|我偏好|我习惯)\\s*([^${STOP}]{1,40})`) },
  { k: '不喜欢', re: new RegExp(`(?:我不喜欢|我讨厌|别给我|我不想)\\s*([^${STOP}]{1,40})`) },
  { k: '身份', re: new RegExp(`(?:我是一名|我是个|我的职业是|我做)\\s*([^${STOP}]{1,30})`) },
  { k: '记住', re: /(?:记住|请记住|记一下|帮我记)\s*[:：]?\s*([^]{2,80})/ },
];

// 疑问/指代噪声守卫：拒绝把提问当事实（如"你还记得我叫什么吗"里的"什么"）。
const INTERROGATIVE = /什么|怎么|哪|谁|多少|吗|呢|？|\?|还记得|你是不是/;

function valid(v) {
  const s = v.trim();
  if (s.length < 1) return false;
  if (INTERROGATIVE.test(s)) return false; // 值本身像提问 → 弃
  return true;
}

// ── 模型提炼（接真模型后的主路径；失败或 demo 回退启发式）──
// 小模型（3B 档）需要具体示例才能可靠抽取——抽象规则会得到空数组。
const EXTRACT_SYS = `从用户这句话里，把"关于说话人本人的长期稳定信息"抽成 JSON 数组，每项 {"k":"类别","v":"值"}。
类别 k 用 2-6 字中文（名字/身份/在做/喜欢/不喜欢/习惯/关系/宠物/所在地/计划 等）；值 v 简洁忠实、≤30 字。
示例：
输入：我搬到了上海，养了只叫豆豆的狗，平时喜欢喝茶
输出：[{"k":"所在地","v":"上海"},{"k":"宠物","v":"狗·豆豆"},{"k":"喜欢","v":"喝茶"}]
只在真有可提取信息时输出数组；对助手的提问、闲聊、临时请求一律输出 []。只输出 JSON 数组，不要任何其它文字。`;

export async function extractSmart(settings, text) {
  const heuristic = extract(text); // 守卫过的启发式：可靠捕获显式模式（我叫/我不喜欢…）
  if (!settings || settings.provider === 'demo') return heuristic;
  let model = [];
  try {
    const raw = await complete(
      settings,
      [{ role: 'system', content: EXTRACT_SYS }, { role: 'user', content: text }],
      { temperature: 0, maxTokens: 220 }
    );
    model = parseMemoryJSON(raw); // 模型：捕获隐式/无"我"的事实（搬到波士顿…）
  } catch (e) {
    console.warn('nyth: 模型记忆提炼失败，仅用启发式', e);
  }
  // 并集：模型高精度（隐式）+ 启发式高召回（显式）；同 key 模型优先
  const merged = [...model];
  for (const h of heuristic) if (!merged.some((m) => m.k === h.k)) merged.push(h);
  return merged.slice(0, 6);
}

// 鲁棒解析：小模型常产出轻微畸形 JSON（如末尾 }} 不配平）。
// 逐个正则抽取 {"k":..,"v":..} 键值对，不依赖数组整体配平。
export function parseMemoryJSON(raw) {
  const pairs = [...raw.matchAll(/\{\s*"k"\s*:\s*"([^"]{1,12})"\s*,\s*"v"\s*:\s*"([^"]{1,60})"\s*\}/g)];
  return pairs
    .map((m) => ({ k: m[1].trim().slice(0, 8), v: m[2].trim().slice(0, 40) }))
    .filter((e) => e.k && e.v && valid(e.v))
    .slice(0, 5);
}

// 从一条用户消息抽取候选记忆（启发式回退路径）。返回 [{k, v}]。
export function extract(text) {
  // 整句是对 nyth 的提问（你…吗/你…什么）→ 不抽取任何"我…"事实
  if (/^(?:你|nyth).*(?:吗|？|\?|什么|记得)/.test(text.trim())) return [];
  const found = [];
  for (const { k, re } of PATTERNS) {
    const m = text.match(re);
    if (m && m[1] && valid(m[1])) found.push({ k, v: m[1].trim() });
  }
  return found;
}

// 写入记忆（同 key 覆盖，去重）。返回新增/更新的条目用于 UI 反馈。
export function remember(items) {
  if (!items.length) return [];
  const mem = store.getMemory();
  const changed = [];
  for (const it of items) {
    const existing = mem.find((e) => e.k === it.k);
    if (existing) {
      if (existing.v !== it.v) { existing.v = it.v; existing.at = Date.now(); changed.push(it); }
    } else {
      mem.push({ k: it.k, v: it.v, at: Date.now() });
      changed.push(it);
    }
  }
  store.setMemory(mem);
  return changed;
}

// 把已知记忆拼成一段系统提示，喂给模型 —— 这就是"越用越贴合"。
export function asSystemPrompt() {
  const mem = store.getMemory();
  const base =
    '你是 nyth，用户设备上的常驻陪伴 agent。说话简洁、真诚、像身边的朋友。你只在本机运行、尊重用户主权。';
  if (!mem.length) return base;
  const facts = mem.map((e) => `- ${e.k}：${e.v}`).join('\n');
  return base + '\n\n你已经了解这个人（只用于更贴合地回应，不要复述）：\n' + facts;
}

export function all() { return store.getMemory(); }

export function forget(index) {
  const mem = store.getMemory();
  mem.splice(index, 1);
  store.setMemory(mem);
}

export function clearAll() { store.setMemory([]); }

export function importItems(items) {
  if (!Array.isArray(items)) return 0;
  const clean = items.filter((e) => e && typeof e.k === 'string' && typeof e.v === 'string');
  store.setMemory(clean);
  return clean.length;
}
