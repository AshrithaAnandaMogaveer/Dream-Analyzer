const Bottleneck = require("bottleneck");
const { OpenAI } = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const RATE_LIMIT_MAX_CONCURRENT = Number(process.env.OAI_MAX_CONCURRENT || 2);
const RATE_LIMIT_MIN_TIME = Number(process.env.OAI_MIN_TIME_MS || 250);
const RETRY_MAX = Number(process.env.OAI_RETRY_MAX || 2);
const FALLBACK_MODEL = process.env.OAI_FALLBACK_MODEL || "gpt-4o";
const GLOBAL_TIMEOUT_MS = Number(process.env.AI_ANALYSIS_TIMEOUT_MS || 12000);

const limiter = new Bottleneck({
  maxConcurrent: RATE_LIMIT_MAX_CONCURRENT,
  minTime: RATE_LIMIT_MIN_TIME,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeOpenAI(fn, { retries = RETRY_MAX, timeoutMs = GLOBAL_TIMEOUT_MS } = {}) {
  return limiter.schedule(async () => {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const p = fn();
        const t = new Promise((_, reject) => {
          const e = new Error("AI_TIMEOUT");
          e.status = 408;
          setTimeout(() => reject(e), timeoutMs);
        });
        return await Promise.race([p, t]);
      } catch (err) {
        const status = err?.status || err?.response?.status;
        const h = err?.headers || err?.response?.headers || {};
        const retryMS = Number(h["retry-after-ms"] || (h["retry-after"] * 1000) || 0);

        if (err && err.message === "AI_TIMEOUT") {
          if (attempt > retries) throw err;
          continue;
        }

        if (status === 429 && retryMS > 0) {
          await sleep(retryMS + 50);
        } else if (status === 429) {
          const backoff = Math.min(60000, 1000 * 2 ** (attempt - 1));
          await sleep(backoff + Math.floor(Math.random() * 300));
        } else if (status >= 500 && status < 600) {
          await sleep(1000 * attempt);
        } else {
          throw err;
        }

        if (attempt > retries) throw err;
      }
    }
  });
}

async function callOpenAIWithFallback(callFn, options = {}) {
  try {
    return await safeOpenAI(callFn, options);
  } catch (err) {
    const code = err?.error?.code || err?.code;
    const isLimit = err?.status === 429 || code === "rate_limit_exceeded" || code === "tokens";
    const isTimeout = err?.message === "AI_TIMEOUT" || err?.status === 408;
    if (isLimit && FALLBACK_MODEL) {
      return safeOpenAI(() => callFn({ model: FALLBACK_MODEL }));
    }
    if (isTimeout && FALLBACK_MODEL) {
      return safeOpenAI(() => callFn({ model: FALLBACK_MODEL }), { timeoutMs: Math.max(4000, GLOBAL_TIMEOUT_MS - 2000) });
    }
    throw err;
  }
}

module.exports = { client, safeOpenAI, callOpenAIWithFallback };
