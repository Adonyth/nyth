// llm.js — provider-neutral 推理层。模型主权：任何后端都只是可替换的能力席位。
// 统一走 OpenAI 兼容的 chat/completions 形状——覆盖 OpenAI、本地 Ollama(/v1)、LM Studio 等。
// demo 模式无需任何 key，纯本地回显 + 记忆演示，用于零配置首跑。

export async function complete(settings, messages, opts = {}) {
  const provider = settings.provider || 'demo';
  if (provider === 'demo') return demoComplete(messages);
  return openaiCompatComplete(settings, messages, opts);
}

// 演示后端：不联网。回显 + 轻量"理解"，让记忆连续性可被立刻感知。
function demoComplete(messages) {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const known = messages.filter((m) => m.role === 'system').map((m) => m.content).join(' ');
  const text = last ? last.content : '';
  let reply;
  if (/^(你好|hi|hello|在吗|嘿|hey)\b/i.test(text)) {
    reply = '我在。演示模式下我不联网，但我会在这台设备上记住你说的要点——试着告诉我一件关于你的事，然后刷新页面，它还在。';
  } else if (known && /(我叫|我是|我的名字|记住|我喜欢|我在做|我的项目)/.test(known + text)) {
    reply = '记下了。这条只存在你这台设备上——你可以在"记忆"里看到、导出带走、随时清除。要连真正的模型，去设置里选本地 Ollama 或填 API key。';
  } else {
    reply = '（演示模式）我听到了："' + text + '"。要让我真正回应，去右下角设置接一个模型——本地 Ollama 完全离线，或自带云端 key。你的 key 只存本机。';
  }
  return Promise.resolve(reply);
}

async function openaiCompatComplete(settings, messages, opts = {}) {
  const base = (settings.baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('未设置端点 Base URL（设置 → 端点）。');
  const url = base + '/chat/completions';
  const headers = { 'Content-Type': 'application/json' };
  if (settings.apiKey) headers['Authorization'] = 'Bearer ' + settings.apiKey;

  const body = {
    model: settings.model || 'gpt-4o-mini',
    messages: messages.map(({ role, content }) => ({ role, content })),
    temperature: opts.temperature ?? 0.6,
    stream: false,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;

  // 超时守卫：后端卡住时优雅报错，绝不让 UI 永久"…"（本地首token+加载可能较慢，给足 90s）
  const ctrl = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 90000;
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`模型超时（${timeoutMs / 1000}s 无响应）——检查端点/模型是否在跑。`);
    throw new Error('无法连接模型端点：' + (e.message || e));
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error('模型调用失败 ' + res.status + '：' + detail.slice(0, 180));
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) throw new Error('模型返回为空。');
  return reply.trim();
}
