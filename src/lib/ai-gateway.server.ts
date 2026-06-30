import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Claude (Anthropic) provider helper（server-only）。
 * 仅在 createServerFn 的 handler 中调用，禁止在客户端模块中导入。
 * 取代了原先的 Lovable AI Gateway —— 不再依赖 Lovable。
 */
export function createClaudeProvider(apiKey: string) {
  return createAnthropic({ apiKey });
}
