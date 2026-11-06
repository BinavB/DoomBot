import { config, type AiProvider } from "@/lib/config";
import { AgentError, ProviderHttpError } from "@/lib/errors";
import { recordUsage, tokensUsedToday } from "@/lib/usage";

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface Completion {
  content: string | null;
  toolCalls: ToolCall[];
  provider: string;
  model: string;
}

interface CompletionResponse {
  choices: {
    message: { content: string | null; tool_calls?: ToolCall[] };
  }[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

const retryableStatuses = new Set([429, 500, 502, 503, 504]);
const retryDelayMilliseconds = 2000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestCompletion(
  provider: AiProvider,
  model: string,
  messages: ChatMessage[],
  tools?: ToolSpec[],
): Promise<Completion> {
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      ...(tools && tools.length > 0 ? { tools } : {}),
      stream: false,
    }),
    signal: AbortSignal.timeout(90000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new ProviderHttpError(response.status, `request failed (${response.status}): ${detail}`);
  }

  const body = (await response.json()) as CompletionResponse;
  const message = body.choices[0]?.message;
  if (!message) {
    throw new AgentError("returned an empty response");
  }

  if (body.usage) {
    recordUsage(
      `${provider.name}/${model}`,
      body.usage.prompt_tokens,
      body.usage.completion_tokens,
    );
  }

  return {
    content: message.content,
    toolCalls: message.tool_calls ?? [],
    provider: provider.name,
    model,
  };
}

async function requestWithRetry(
  provider: AiProvider,
  model: string,
  messages: ChatMessage[],
  tools?: ToolSpec[],
): Promise<Completion> {
  try {
    return await requestCompletion(provider, model, messages, tools);
  } catch (error) {
    if (error instanceof ProviderHttpError && retryableStatuses.has(error.status)) {
      await delay(retryDelayMilliseconds);
      return requestCompletion(provider, model, messages, tools);
    }
    throw error;
  }
}

export async function createChatCompletion(
  messages: ChatMessage[],
  tools?: ToolSpec[],
): Promise<Completion> {
  const providers = config.aiProviders.filter((provider) => provider.apiKey);
  if (providers.length === 0) {
    throw new AgentError(
      "No AI key is set. Add GEMINI_API_KEY or DEEPSEEK_API_KEY to .env.local and restart the server.",
    );
  }
  if (tokensUsedToday() >= config.dailyTokenLimit) {
    throw new AgentError(
      "The daily token limit was reached. Raise DAILY_TOKEN_LIMIT or try again tomorrow.",
    );
  }

  const failures: string[] = [];
  for (const provider of providers) {
    for (const model of provider.models) {
      try {
        return await requestWithRetry(provider, model, messages, tools);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        failures.push(`${provider.name}/${model}: ${reason.slice(0, 160)}`);
        if (error instanceof ProviderHttpError && [401, 402, 403].includes(error.status)) {
          break;
        }
      }
    }
  }
  throw new AgentError(`All AI providers failed. ${failures.join(" | ")}`);
}
