-- 2026-07-05:AI 学习分区细分子分类(幂等)
-- 新增子分类 agent(智能体)、engineering(AI 工程),把现有 AI 文档从 notes/llm 重新归类。
-- 分类定义见 src/lib/data.ts;首页 AI 分区按此分组展示。

UPDATE public.resources SET subcategory = 'agent'
WHERE category = 'ai' AND slug IN (
  'ai-notes-agent-ecosystem-2026',
  'ai-notes-agent-runtime-diagram',
  'ai-notes-agent-runtime-diagram-en',
  'ai-notes-agent-runtime-loop',
  'ai-notes-agent-runtime-walkthrough',
  'ai-notes-antigravity-guide',
  'ai-notes-claude-agent-matrix',
  'ai-notes-claude-arch',
  'ai-notes-openai-agent-ecosystem',
  'ai-notes-coding-agents-101-guide',
  'ai-notes-writing-tools-for-agents',
  'ai-notes-mcp-introduction',
  'ai-notes-mcp-introduction-guide',
  'ai-notes-mcp-registry-preview'
);

UPDATE public.resources SET subcategory = 'engineering'
WHERE category = 'ai' AND slug IN (
  'ai-notes-ai-evals-guide',
  'ai-notes-getting-ai-to-work-in-complex-codebases',
  'ai-notes-how-faang-vibe-codes',
  'ai-notes-specs-are-the-new-source-code',
  'ai-notes-cs146s-week1',
  'ai-notes-claude-dev-handbook'
);

UPDATE public.resources SET subcategory = 'llm'
WHERE category = 'ai' AND slug IN (
  'ai-notes-how-long-contexts-fail',
  'prompt-engineering-roundtable'
);
