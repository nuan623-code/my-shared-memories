-- 2026-06-30 新增 7 篇 AI / MCP / 智能体学习文档(静态 HTML 在 public/ai-notes/)
-- 幂等:重复跑不会重复插入(按 slug 冲突跳过)。在 Supabase SQL Editor 跑一次即可。
INSERT INTO public.resources (slug, type, title, summary, category, subcategory, tags, url) VALUES
  ('ai-notes-prompting-techniques','article','提示工程技术全览:从零样本到智能体推理','Prompting Techniques 技术全览','ai','llm',ARRAY['AI','提示工程','Prompt'],'/ai-notes/prompting-techniques-guide.html'),
  ('ai-notes-dspark-paper','article','DSpark 论文精读:置信度调度的半自回归推测解码','DSpark 论文精读','ai','llm',ARRAY['AI','论文','推测解码'],'/ai-notes/dspark-paper-guide.html'),
  ('ai-notes-mcp-introduction','article','模型上下文协议 MCP:面向开发者的全面入门','MCP 全面入门','ai','practice',ARRAY['AI','MCP','协议'],'/ai-notes/mcp-introduction.html'),
  ('ai-notes-mcp-registry','article','MCP Registry 发布:开放的 MCP 服务器目录','MCP 官方注册中心发布预览','ai','practice',ARRAY['AI','MCP','Registry'],'/ai-notes/mcp-registry-preview.html'),
  ('ai-notes-coding-agents-101','article','Coding Agents 101:把事情真正做完的艺术','编程智能体实战指南','ai','practice',ARRAY['AI','智能体','Agent'],'/ai-notes/coding-agents-101-guide.html'),
  ('ai-notes-mcp-dev-intro','article','Model Context Protocol(MCP):面向开发者的完整介绍','MCP 开发者完整介绍(Stytch)','ai','practice',ARRAY['AI','MCP','认证'],'/ai-notes/mcp-introduction-guide.html'),
  ('ai-notes-writing-tools-agents','article','为 AI 智能体编写高效工具 —— 而且用智能体来写','为智能体编写高效工具(Anthropic)','ai','practice',ARRAY['AI','MCP','工具设计'],'/ai-notes/writing-tools-for-agents.html')
ON CONFLICT (slug) DO NOTHING;
