import { NextRequest } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 流式聊天接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, session_id, context } = body;

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 构建系统提示词
    const systemPrompt = `你是一名专业的SMT设备维护工程师助手，专门协助工程师处理西门子SIPLACE SX2贴片机的维护工作。

你的职责：
1. 解答设备故障相关问题
2. 提供维修建议和排查步骤
3. 解释设备参数和预警含义
4. 推荐备件和维护方案

回答要求：
- 专业准确，有理有据
- 简洁明了，重点突出
- 如需查询知识库，明确说明
- 对于不确定的问题，建议查阅手册或联系技术支持

设备上下文：
${context || '无特定设备上下文'}`;

    // 获取历史会话
    let messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    if (session_id) {
      const supabase = getSupabaseClient();
      const { data: session } = await supabase
        .from("chat_sessions")
        .select("messages")
        .eq("id", session_id)
        .single();

      if (session?.messages && Array.isArray(session.messages)) {
        messages = messages.concat(session.messages as Array<{ role: "system" | "user" | "assistant"; content: string }>);
      }
    }

    messages.push({ role: "user", content: message });

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const llmStream = client.stream(messages, {
            model: "doubao-seed-1-8-251228",
            temperature: 0.7,
          });

          let fullResponse = "";

          for await (const chunk of llmStream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              fullResponse += text;
              
              // 发送SSE格式数据
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: text })}\n\n`)
              );
            }
          }

          // 保存会话历史
          if (session_id) {
            const supabase = getSupabaseClient();
            const { data: session } = await supabase
              .from("chat_sessions")
              .select("messages")
              .eq("id", session_id)
              .single();

            const existingMessages = (session?.messages as Array<{ role: string; content: string }>) || [];
            existingMessages.push({ role: "user", content: message });
            existingMessages.push({ role: "assistant", content: fullResponse });

            await supabase
              .from("chat_sessions")
              .update({
                messages: existingMessages,
                updated_at: new Date().toISOString(),
              })
              .eq("id", session_id);
          }

          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to process chat" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
