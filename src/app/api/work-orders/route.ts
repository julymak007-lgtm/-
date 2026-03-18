import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取工单列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");

    let query = client
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch work orders" },
      { status: 500 }
    );
  }
}

// 创建工单
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const orderNumber = `WO-${Date.now()}`;

    const { data, error } = await client
      .from("work_orders")
      .insert({
        order_number: orderNumber,
        title: body.title,
        description: body.description,
        priority: body.priority || "medium",
        status: body.status || "pending",
        device_id: body.device_id,
        fault_analysis: "",
        inspection_steps: [],
        required_parts: [],
        safety_notes: "",
        assigned_to: null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create work order" },
      { status: 500 }
    );
  }
}
