import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 部署模型
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    // 获取要部署的模型
    const { data: model, error: modelError } = await client
      .from("model_trainings")
      .select("*")
      .eq("id", id)
      .single();

    if (modelError || !model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (model.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed models can be deployed" },
        { status: 400 }
      );
    }

    // 取消同类型其他模型的部署
    await client
      .from("model_trainings")
      .update({
        is_deployed: false,
        updated_at: new Date().toISOString(),
      })
      .eq("model_type", model.model_type)
      .eq("target_label_type", model.target_label_type);

    // 部署当前模型
    const { data, error } = await client
      .from("model_trainings")
      .update({
        is_deployed: true,
        deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to deploy model" },
      { status: 500 }
    );
  }
}
