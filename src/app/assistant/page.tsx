"use client";

import { AppLayout } from "@/components/layout";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Loader2, Bot, User } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 创建新会话
    createSession();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const createSession = async () => {
    try {
      const res = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "user-001" }),
      });
      const data = await res.json();
      setSessionId(data.data.id);
    } catch (error) {
      console.error("Failed to create session:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let assistantContent = "";
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessage.id
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "抱歉，出现了错误。请稍后重试。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickQuestions = [
    "吸嘴堵塞怎么处理？",
    "真空报警是什么原因？",
    "CPH效率低如何排查？",
    "如何更换吸嘴？",
  ];

  return (
    <AppLayout>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">智能维修助手</h1>
          <p className="mt-1 text-slate-600">AI驱动的设备故障诊断与维修建议</p>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Chat Area */}
          <div className="flex flex-1 flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Bot className="mb-4 h-16 w-16 text-slate-300" />
                  <h2 className="mb-2 text-xl font-semibold text-slate-700">
                    您好，我是智能维修助手
                  </h2>
                  <p className="mb-6 text-slate-500">
                    我可以协助您诊断设备故障、提供维修建议
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {quickQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="justify-start"
                        onClick={() => {
                          setInput(question);
                          inputRef.current?.focus();
                        }}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <Bot className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          message.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </p>
                      </div>
                      {message.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                          <User className="h-5 w-5 text-slate-600" />
                        </div>
                      )}
                    </div>
                  ))}
                  {loading && messages[messages.length - 1]?.role === "user" && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100">
                        <Bot className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="rounded-lg bg-slate-100 px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t bg-white p-4">
              <div className="mx-auto flex max-w-3xl gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="输入您的问题..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button onClick={handleSend} disabled={loading || !input.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="hidden w-80 border-l bg-slate-50 p-4 lg:block">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">使用提示</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900">故障诊断</p>
                  <p>描述故障现象，获取排查建议</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">维修指导</p>
                  <p>查询维修步骤和安全规范</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">备件查询</p>
                  <p>获取备件型号和更换指南</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">参数解释</p>
                  <p>了解设备参数含义和正常范围</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
