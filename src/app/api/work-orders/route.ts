import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 生成工单编号
function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WO-${timestamp}-${random}`;
}

// 获取工单列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const deviceId = searchParams.get("device_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = client
      .from("work_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }
    if (priority) {
      query = query.eq("priority", priority);
    }
    if (deviceId) {
      query = query.eq("device_id", deviceId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
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

    const orderNumber = generateOrderNumber();

    const { data, error } = await client
      .from("work_orders")
      .insert({
        order_number: orderNumber,
        device_id: body.device_id,
        alert_id: body.alert_id,
        title: body.title,
        description: body.description,
        fault_analysis: body.fault_analysis,
        inspection_steps: body.inspection_steps,
        required_parts: body.required_parts,
        safety_notes: body.safety_notes,
        priority: body.priority || "medium",
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
      { error: "Failed to create work order" },
      { status: 500 }
    );
  }
}
