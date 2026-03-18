import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 创建聊天会话
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await client
      .from("chat_sessions")
      .insert({
        user_id: body.user_id,
        title: body.title || "新对话",
        messages: [],
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create chat session" },
      { status: 500 }
    );
  }
}

// 获取用户的聊天会话列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "user_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await client
      .from("chat_sessions")
      .select("id, title, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}
