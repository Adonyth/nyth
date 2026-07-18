// app.js — 主装配。模式系统 + 对话 + 记忆面 + provider-neutral 设置。
import { store } from './store.js';
import { complete } from './llm.js';
import * as memory from './memory.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const thread = $('#thread');
const emptyState = $('#empty-state');
const input = $('#input');
const sendBtn = $('#send');

let sending = false;

// ── 模式系统（整机操作逻辑）───────────────────────────────
// 切换靠触控（研究：alone mode 的静默契约不能靠语音进出——物理/触控切换是隐私保证）。
function setMode(mode) {
  app.dataset.mode = mode;
  store.setMode(mode);
  document.querySelectorAll('.mode').forEach((b) =>
    b.setAttribute('aria-selected', String(b.dataset.setMode === mode))
  );
  // 陪伴=可对话；独处=静默、不主动、只走屏幕；勿扰=低干扰
  input.disabled = mode !== 'accompany';
  input.placeholder = mode === 'accompany' ? '对 nyth 说…'
    : mode === 'alone' ? '独处模式 · 切回陪伴以对话'
    : '勿扰 · 仅紧要事项';
}
document.querySelectorAll('.mode').forEach((b) =>
  b.addEventListener('click', () => setMode(b.dataset.setMode))
);

// ── 渲染消息 ────────────────────────────────────────────
function bubble(role, text, learned) {
  const el = document.createElement('div');
  el.className = 'msg ' + (role === 'user' ? 'me' : 'nyth');
  el.textContent = text;
  if (learned && learned.length) {
    const tag = document.createElement('span');
    tag.className = 'learned';
    tag.textContent = '↳ 记住了：' + learned.map((l) => `${l.k}·${l.v}`).join('；');
    el.appendChild(tag);
  }
  thread.appendChild(el);
  thread.scrollTop = thread.scrollHeight;
  return el;
}

function restore() {
  const msgs = store.getMessages();
  if (msgs.length) {
    emptyState.remove();
    msgs.forEach((m) => bubble(m.role, m.content));
  }
  updateMemCount();
  updateProviderStatus();
}

// ── 发送 ────────────────────────────────────────────────
async function send(text) {
  if (!text.trim() || sending) return;
  if (app.dataset.mode !== 'accompany') return; // 只在陪伴模式对话（守卫 stray submit）
  sending = true; sendBtn.disabled = true;
  if (emptyState.isConnected) emptyState.remove();

  // 1) 用户消息（记忆提炼延后到回复完成后进行，避免抢本地模型队列拖慢首响）
  const userBubble = bubble('user', text);

  // 2) 组装喂给模型的消息：系统记忆 + 历史 + 本次
  const history = store.getMessages();
  history.push({ role: 'user', content: text });
  const forModel = [{ role: 'system', content: memory.asSystemPrompt() }, ...history];

  const thinking = bubble('assistant', '…');
  thinking.classList.add('thinking');

  try {
    const reply = await complete(store.getSettings(), forModel);
    thinking.classList.remove('thinking');
    thinking.textContent = reply;
    history.push({ role: 'assistant', content: reply });
  } catch (e) {
    thinking.classList.remove('thinking');
    thinking.textContent = '⚠ ' + (e.message || '出错了');
    history.pop(); // 回滚未成功的用户轮次不影响；此处仅不追加 assistant
  }

  store.setMessages(history);
  sending = false; sendBtn.disabled = false; input.focus();

  // 3) 回复完成后，后台用模型提炼记忆（fire-and-forget，不阻塞下一轮输入）
  distill(text, userBubble);
}

// 后台记忆提炼：模型主路径（demo/失败回退启发式）→ 持久 → 就地给用户气泡补"记住了"标签
async function distill(text, bubbleEl) {
  try {
    const changed = memory.remember(await memory.extractSmart(store.getSettings(), text));
    if (changed.length && bubbleEl?.isConnected) {
      const tag = document.createElement('span');
      tag.className = 'learned';
      tag.textContent = '↳ 记住了：' + changed.map((l) => `${l.k}·${l.v}`).join('；');
      bubbleEl.appendChild(tag);
    }
    if (changed.length) { updateMemCount(); renderMemory(); }
  } catch (e) {
    console.warn('nyth: 记忆提炼后台任务失败', e);
  }
}

$('#composer').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = input.value; input.value = '';
  send(v);
});

// ── 记忆抽屉 ────────────────────────────────────────────
function updateMemCount() { $('#mem-count').textContent = String(memory.all().length); }

function renderMemory() {
  const list = $('#mem-list');
  const mem = memory.all();
  list.innerHTML = '';
  if (!mem.length) {
    list.innerHTML = '<li class="mem-empty">还没有记住什么。<br>告诉我一件关于你的事。</li>';
    return;
  }
  mem.forEach((e, i) => {
    const li = document.createElement('li');
    li.className = 'mem-item';
    li.innerHTML = `<span class="k">${e.k}</span>${escapeHtml(e.v)}<button class="x" aria-label="删除">忘掉</button>`;
    li.querySelector('.x').addEventListener('click', () => {
      memory.forget(i); renderMemory(); updateMemCount();
    });
    list.appendChild(li);
  });
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// 导出（主权：带走你的数据）
$('#export-mem').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(store.exportAll(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'nyth-memory-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click(); URL.revokeObjectURL(a.href);
});
// 导入（跨设备连续性的最小实现：一台导出，另一台导入）
$('#import-mem').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const n = memory.importItems(data.memory || data);
    renderMemory(); updateMemCount();
    alert('已导入 ' + n + ' 条记忆到这台设备。');
  } catch { alert('导入失败：不是有效的 nyth 记忆文件。'); }
  e.target.value = '';
});
$('#clear-mem').addEventListener('click', () => {
  if (confirm('清除这台设备上的全部记忆？此操作不可撤销。')) {
    memory.clearAll(); renderMemory(); updateMemCount();
  }
});

// ── 设置抽屉（provider-neutral）──────────────────────────
function updateProviderStatus() {
  const s = store.getSettings();
  const label = s.provider === 'demo' ? '未连接模型 · 演示模式'
    : s.provider === 'ollama' ? '本地 Ollama · ' + (s.model || '未设模型') + ' · 离线'
    : 'OpenAI 兼容 · ' + (s.model || '未设模型');
  $('#provider-status').textContent = label;
}

function loadSettingsForm() {
  const s = store.getSettings();
  $('#provider').value = s.provider;
  $('#base-url').value = s.baseUrl || '';
  $('#api-key').value = s.apiKey || '';
  $('#model').value = s.model || '';
  syncSettingsFields();
}
function syncSettingsFields() {
  const p = $('#provider').value;
  document.querySelectorAll('.field[data-when]').forEach((f) => {
    f.hidden = !f.dataset.when.split(' ').includes(p);
  });
  const hint = { demo: '零配置。不联网，仅回显+本地记忆演示。',
    ollama: '先本地跑：ollama serve。端点填 http://localhost:11434/v1，模型填你 pull 的名（如 llama3.1）。完全离线、最主权。',
    openai: 'key 只存本机 localStorage，直连你填的端点，nyth 不经手。' }[p];
  $('#settings-hint').textContent = hint || '';
  if (p === 'ollama' && !$('#base-url').value) $('#base-url').value = 'http://localhost:11434/v1';
}
$('#provider').addEventListener('change', syncSettingsFields);
$('#save-settings').addEventListener('click', () => {
  store.setSettings({
    provider: $('#provider').value,
    baseUrl: $('#base-url').value.trim(),
    apiKey: $('#api-key').value.trim(),
    model: $('#model').value.trim(),
  });
  updateProviderStatus();
  closeDrawers();
});

// ── 抽屉开关 ────────────────────────────────────────────
const scrim = $('#scrim');
function openDrawer(id) { closeDrawers(); $(id).hidden = false; scrim.hidden = false; }
function closeDrawers() { $('#memory-drawer').hidden = true; $('#settings-drawer').hidden = true; scrim.hidden = true; }
$('#open-memory').addEventListener('click', () => { renderMemory(); openDrawer('#memory-drawer'); });
$('#close-memory').addEventListener('click', closeDrawers);
$('#open-settings').addEventListener('click', () => { loadSettingsForm(); openDrawer('#settings-drawer'); });
$('#close-settings').addEventListener('click', closeDrawers);
scrim.addEventListener('click', closeDrawers);
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });

// ── 启动 ────────────────────────────────────────────────
setMode(store.getMode());
restore();
input.focus();
