import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取知识详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data, error } = await client
      .from("knowledge_base")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // 增加浏览次数
    await client
      .from("knowledge_base")
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq("id", id);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch knowledge" },
      { status: 500 }
    );
  }
}
