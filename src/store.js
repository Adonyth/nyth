// store.js — 本地优先持久层。所有状态只存本机 localStorage，不出设备。
// 主权设计：一切可导出为纯 JSON（退出权 / 跨设备迁移的最小实现）。

const NS = 'nyth.l1.';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch (e) {
    console.warn('nyth: 本地存储写入失败', e);
  }
}

export const store = {
  // 对话历史（用于跨会话连续性；跨设备连续性靠导出/导入迁移）
  getMessages: () => read('messages', []),
  setMessages: (m) => write('messages', m),

  // 记忆条目：nyth 对你的持久了解（差异化核心）
  getMemory: () => read('memory', []),
  setMemory: (m) => write('memory', m),

  // 模型设置（provider-neutral；key 只存本机）
  getSettings: () => read('settings', { provider: 'demo', baseUrl: '', apiKey: '', model: '' }),
  setSettings: (s) => write('settings', s),

  // 当前模式
  getMode: () => read('mode', 'accompany'),
  setMode: (m) => write('mode', m),

  // 全量导出（主权：你拥有全部数据，随时带走）
  exportAll() {
    return {
      _app: 'nyth-l1',
      _version: 1,
      _exportedAt: new Date().toISOString(),
      memory: this.getMemory(),
      messages: this.getMessages(),
    };
  },
};
