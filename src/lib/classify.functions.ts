import { createServerFn } from "@tanstack/react-start";
import { generateText, Output } from "ai";
import { z } from "zod";

import { categories, type CategoryId } from "./data";

// 简洁的 schema，避免 Gemini 「too many states」限制
const ResultSchema = z.object({
  category: z.string().describe("大类 id，必须取值于给定 taxonomy"),
  subcategory: z.string().describe("小类 id，必须取值于该大类下的 subcategories"),
  tags: z.array(z.string()).max(6).describe("3-6 个中文短标签"),
  reason: z.string().describe("一句话说明分类理由（不超过 50 字）"),
});

const InputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(8000),
  mediaType: z.enum(["project", "video", "article"]).default("article"),
});

export type ClassifyResult = z.infer<typeof ResultSchema> & {
  category: CategoryId | string;
};

function buildTaxonomyPrompt() {
  return categories
    .map(
      (c) =>
        `- ${c.id} (${c.label})：${c.description}\n  小类：${c.subcategories
          .map((s) => `${s.id}(${s.label})`)
          .join("、")}`
    )
    .join("\n");
}

export const classifyContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("Missing LOVABLE_API_KEY");
    }

    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(apiKey);

    const taxonomy = buildTaxonomyPrompt();
    const system = `你是一名内容编辑助理，负责为个人作品集网站的内容自动分类。
请严格在下列 taxonomy 中选择一个【大类 id】和该大类下的一个【小类 id】，禁止返回 taxonomy 之外的值：

${taxonomy}

要求：
1. category 与 subcategory 必须返回 id（如 web、website），不要返回中文 label。
2. tags 输出 3-6 个简洁的中文短标签，便于站内筛选。
3. reason 用一句话（≤50 字）说明分类理由。`;

    const prompt = `内容媒介类型：${data.mediaType}
标题：${data.title}

正文（节选）：
${data.content.slice(0, 6000)}`;

    try {
      const { experimental_output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        experimental_output: Output.object({ schema: ResultSchema }),
        system,
        prompt,
      });

      const result = experimental_output as ClassifyResult;

      // 兜底校验：若 AI 返回了不在 taxonomy 中的 id，回退到合理默认值
      const cat = categories.find((c) => c.id === result.category);
      if (!cat) {
        const fallback = data.mediaType === "video" ? "video" : "article";
        return {
          category: fallback,
          subcategory: categories.find((c) => c.id === fallback)?.subcategories[0]?.id ?? "",
          tags: result.tags ?? [],
          reason: `AI 返回的 category 不在 taxonomy 中，已回退至 ${fallback}`,
        } satisfies ClassifyResult;
      }
      const sub = cat.subcategories.find((s) => s.id === result.subcategory);
      if (!sub) {
        return {
          ...result,
          subcategory: cat.subcategories[0]?.id ?? "",
          reason: `AI 返回的 subcategory 不在 ${cat.label} 下，已回退至 ${cat.subcategories[0]?.label}`,
        } satisfies ClassifyResult;
      }

      return result satisfies ClassifyResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // 把上游 429/402 等关键错误信息透出到前端
      throw new Error(`AI 分类失败：${message}`);
    }
  });
