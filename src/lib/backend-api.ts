/**
 * Python后端API客户端
 * 用于与FastAPI后端服务通信
 */

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

interface TrainingConfig {
  model_type: string;
  target_label_type: string;
  config?: Record<string, any>;
  hyperparameters?: Record<string, any>;
  labeled_data_ids?: string[];
}

interface TrainingTaskResponse {
  training_id: string;
  status: string;
  config: Record<string, any>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  message: string;
}

interface TrainingStatusResponse {
  training_id: string;
  status: string;
  config: Record<string, any>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  results?: Record<string, any>;
  error_message?: string;
}

interface PredictionRequest {
  model_id: string;
  device_id: string;
  features: Record<string, any>;
}

interface PredictionResponse {
  prediction_id: string;
  model_id: string;
  device_id: string;
  fault_probability: number;
  is_fault: boolean;
  remaining_useful_life?: number;
  confidence: number;
  timestamp: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export class BackendApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_BASE_URL;
  }

  /**
   * 检查后端服务是否可用
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.warn("后端服务不可用:", error);
      return false;
    }
  }

  /**
   * 获取健康状态
   */
  async getHealth(): Promise<HealthResponse | null> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("获取健康状态失败:", error);
      return null;
    }
  }

  /**
   * 提交训练任务
   */
  async submitTrainingTask(
    config: TrainingConfig,
    trainingId?: string,
    modelName?: string
  ): Promise<TrainingTaskResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/training/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        training_id: trainingId,
        config,
        model_name: modelName,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `提交训练任务失败: ${response.status}`
      );
    }

    return await response.json();
  }

  /**
   * 获取训练任务状态
   */
  async getTrainingStatus(
    trainingId: string
  ): Promise<TrainingStatusResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/training/${trainingId}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `获取训练状态失败: ${response.status}`
      );
    }

    return await response.json();
  }

  /**
   * 列出所有训练任务
   */
  async listTrainingTasks(
    limit: number = 50,
    status?: string
  ): Promise<{ count: number; tasks: TrainingStatusResponse[] }> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(status && { status }),
    });

    const response = await fetch(
      `${this.baseUrl}/api/v1/training?${params.toString()}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `列出训练任务失败: ${response.status}`
      );
    }

    return await response.json();
  }

  /**
   * 执行预测推理
   */
  async predict(request: PredictionRequest): Promise<PredictionResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/prediction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || `预测失败: ${response.status}`
      );
    }

    return await response.json();
  }
}

// 单例实例
export const backendApi = new BackendApiClient();

export default backendApi;
