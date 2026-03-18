import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取预警列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const severity = searchParams.get("severity");
    const deviceId = searchParams.get("device_id");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = client
      .from("alerts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }
    if (severity) {
      query = query.eq("severity", severity);
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
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}

// 创建预警（模拟AI预测结果）
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await client
      .from("alerts")
      .insert({
        device_id: body.device_id,
        component_id: body.component_id,
        alert_type: body.alert_type,
        severity: body.severity,
        probability: body.probability,
        model_type: body.model_type,
        predicted_failure_time: body.predicted_failure_time,
        key_evidence: body.key_evidence,
        ai_explanation: body.ai_explanation,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }
}
