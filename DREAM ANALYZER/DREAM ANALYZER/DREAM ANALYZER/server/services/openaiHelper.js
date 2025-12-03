const Bottleneck = require("bottleneck");
const { OpenAI } = require("openai");
let client = null;
try {
  const key = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim();
  if (key) {
    client = new OpenAI({ apiKey: key });
  }
} catch (_) {
  client = null;
}

const RATE_LIMIT_MAX_CONCURRENT = Number(process.env.OAI_MAX_CONCURRENT || 2);
const RATE_LIMIT_MIN_TIME = Number(process.env.OAI_MIN_TIME_MS || 350);
const RETRY_MAX = Number(process.env.OAI_RETRY_MAX || 3);
const FALLBACK_MODEL = process.env.OAI_FALLBACK_MODEL || "gpt-4o";

const limiter = new Bottleneck({
  maxConcurrent: RATE_LIMIT_MAX_CONCURRENT,
  minTime: RATE_LIMIT_MIN_TIME,
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function safeOpenAI(fn, { retries = RETRY_MAX } = {}) {
  return limiter.schedule(async () => {
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        return await fn();
      } catch (err) {
        const status = err?.status || err?.response?.status;
        const h = err?.headers || err?.response?.headers || {};
        const retryMS = Number(h["retry-after-ms"] || (h["retry-after"] * 1000) || 0);

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
    if (isLimit && FALLBACK_MODEL) {
      return safeOpenAI(() => callFn({ model: FALLBACK_MODEL }));
    }
    throw err;
  }
}

module.exports = { client, safeOpenAI, callOpenAIWithFallback };
