const defaultHost = process.env.OLLAMA_HOST ?? "http://127.0.0.1:11434";

const baseUrl = (host = defaultHost) =>
  /^https?:\/\//.test(host) ? host : `http://${host}`;

export type ChatResult = {
  content: string;
  totalDuration: number;
  promptTokens: number;
  responseTokens: number;
};

export type ChatOptions = {
  model: string;
  system: string;
  prompt: string;
  schema?: unknown;
  seed?: number;
  think?: boolean;
  contextLength?: number;
  timeoutMs?: number;
  host?: string;
};

type ChatResponseBody = {
  message?: { content?: string };
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
};

const toRequestBody = ({
  model,
  system,
  prompt,
  schema,
  seed = 7,
  think = false,
  contextLength = 16384,
}: ChatOptions) =>
  JSON.stringify({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    stream: false,
    think,
    ...(schema == null ? {} : { format: schema }),
    options: { temperature: 0, seed, num_ctx: contextLength },
  });

const toChatResult = (body: ChatResponseBody): ChatResult => ({
  content: body.message?.content ?? "",
  totalDuration: body.total_duration ?? 0,
  promptTokens: body.prompt_eval_count ?? 0,
  responseTokens: body.eval_count ?? 0,
});

export const chat = async (options: ChatOptions): Promise<ChatResult> => {
  const { timeoutMs = 600000, host } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl(host)}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: toRequestBody(options),
    });

    if (!response.ok) {
      throw new Error(
        `Ollama returned ${response.status}: ${(await response.text()).slice(0, 400)}`,
      );
    }

    return toChatResult((await response.json()) as ChatResponseBody);
  } finally {
    clearTimeout(timeout);
  }
};

export const listModels = async (host?: string) => {
  const response = await fetch(`${baseUrl(host)}/api/tags`);
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}`);
  }

  const { models = [] } = (await response.json()) as {
    models?: { name: string; size?: number }[];
  };
  return models.map(({ name, size }) => ({ name, size: size ?? 0 }));
};

export const serverVersion = async (host?: string) => {
  try {
    const response = await fetch(`${baseUrl(host)}/api/version`);
    if (!response.ok) {
      return null;
    }

    const { version } = (await response.json()) as { version?: string };
    return version ?? null;
  } catch {
    return null;
  }
};
