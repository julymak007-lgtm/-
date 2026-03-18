import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取知识库列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const deviceType = searchParams.get("device_type");
    const keyword = searchParams.get("keyword");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = client
      .from("knowledge_base")
      .select("id, title, category, device_type, keywords, source, view_count, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq("category", category);
    }
    if (deviceType) {
      query = query.eq("device_type", deviceType);
    }
    if (keyword) {
      query = query.ilike("title", `%${keyword}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch knowledge base" },
      { status: 500 }
    );
  }
}

// 创建知识条目
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await client
      .from("knowledge_base")
      .insert({
        title: body.title,
        category: body.category,
        device_type: body.device_type,
        content: body.content,
        keywords: body.keywords,
        source: body.source,
        created_by: body.created_by,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create knowledge" },
      { status: 500 }
    );
  }
}
