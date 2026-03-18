import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取单个训练记录详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data, error } = await client
      .from("model_trainings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch model training" },
      { status: 500 }
    );
  }
}

// 更新训练记录（部署模型）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.is_deployed !== undefined) {
      updateData.is_deployed = body.is_deployed;
      if (body.is_deployed) {
        updateData.deployed_at = new Date().toISOString();
        
        // 取消其他模型的部署状态
        const { data: model } = await client
          .from("model_trainings")
          .select("model_type, target_label_type")
          .eq("id", id)
          .single();
          
        if (model) {
          await client
            .from("model_trainings")
            .update({ is_deployed: false })
            .eq("model_type", model.model_type)
            .eq("target_label_type", model.target_label_type)
            .neq("id", id);
        }
      }
    }

    const { data, error } = await client
      .from("model_trainings")
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
      { error: "Failed to update model training" },
      { status: 500 }
    );
  }
}
