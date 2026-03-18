import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取单个设备详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data: device, error } = await client
      .from("devices")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // 获取设备部件
    const { data: components } = await client
      .from("device_components")
      .select("*")
      .eq("device_id", id);

    // 获取最新参数
    const { data: parameters } = await client
      .from("device_parameters")
      .select("*")
      .eq("device_id", id)
      .order("recorded_at", { ascending: false })
      .limit(100);

    return NextResponse.json({
      data: {
        ...device,
        components: components || [],
        parameters: parameters || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch device" },
      { status: 500 }
    );
  }
}

// 更新设备
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (body.status) updateData.status = body.status;
    if (body.health_score !== undefined) updateData.health_score = body.health_score;
    if (body.location) updateData.location = body.location;
    if (body.next_maintenance_at) updateData.next_maintenance_at = body.next_maintenance_at;
    if (body.last_maintenance_at) updateData.last_maintenance_at = body.last_maintenance_at;

    const { data, error } = await client
      .from("devices")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update device" },
      { status: 500 }
    );
  }
}
