import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取设备列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const deviceType = searchParams.get("device_type");

    let query = client
      .from("devices")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (deviceType) {
      query = query.eq("device_type", deviceType);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

// 创建设备
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await client
      .from("devices")
      .insert({
        device_code: body.device_code,
        device_name: body.device_name,
        device_type: body.device_type || "SIPLACE SX2",
        location: body.location,
        status: body.status || "online",
        health_score: body.health_score || 100,
        metadata: body.metadata,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    );
  }
}
