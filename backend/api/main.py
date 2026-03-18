"""
SIPLACE SX2 预测模型后端API服务
使用FastAPI提供训练、推理和模型管理功能
"""

import os
import sys
import json
import uuid
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn

# 添加训练模块路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from training.task_queue import TrainingTaskQueue


# ============== Pydantic 模型 ==============

class TrainingConfig(BaseModel):
    """训练配置"""
    model_type: str = Field(..., description="模型类型: lstm, survival, rule_engine")
    target_label_type: str = Field(..., description="目标标签类型")
    config: Optional[Dict] = Field(default_factory=dict, description="训练配置")
    hyperparameters: Optional[Dict] = Field(default_factory=dict, description="超参数")
    labeled_data_ids: Optional[List[str]] = Field(default_factory=list, description="标注数据ID列表")


class TrainingTaskCreate(BaseModel):
    """创建训练任务请求"""
    training_id: Optional[str] = None
    config: TrainingConfig
    model_name: Optional[str] = None


class TrainingTaskResponse(BaseModel):
    """训练任务响应"""
    training_id: str
    status: str
    config: Dict
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    message: str


class PredictionRequest(BaseModel):
    """预测请求"""
    model_id: str
    device_id: str
    features: Dict[str, Any]


class PredictionResponse(BaseModel):
    """预测响应"""
    prediction_id: str
    model_id: str
    device_id: str
    fault_probability: float
    is_fault: bool
    remaining_useful_life: Optional[float] = None
    confidence: float
    timestamp: str


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str
    timestamp: str
    version: str


# ============== 全局状态 ==============

task_queue: Optional[TrainingTaskQueue] = None


# ============== 生命周期管理 ==============

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期"""
    print("🚀 启动SIPLACE SX2 后端API服务...")
    
    # 初始化任务队列
    global task_queue
    task_queue = TrainingTaskQueue()
    
    print("✅ 任务队列初始化完成")
    print("=" * 60)
    
    yield
    
    print("\n👋 关闭API服务...")


# ============== FastAPI 应用 ==============

app = FastAPI(
    title="SIPLACE SX2 预测模型API",
    description="设备健康预测与维护系统 - 模型训练与推理服务",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== API 路由 ==============

@app.get("/", response_model=HealthResponse)
async def root():
    """根路径 - 健康检查"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """健康检查"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0"
    )


@app.post("/api/v1/training/submit", response_model=TrainingTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_training_task(
    request: TrainingTaskCreate,
    background_tasks: BackgroundTasks
):
    """
    提交训练任务
    
    - 创建训练任务
    - 异步执行训练
    """
    try:
        if not task_queue:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="任务队列未初始化"
            )
        
        # 生成训练ID
        training_id = request.training_id or f"train_{uuid.uuid4().hex[:12]}"
        
        # 准备配置
        config_dict = request.config.model_dump()
        
        # 提交任务到队列
        task_queue.submit_task(training_id, config_dict)
        
        # 后台执行训练
        background_tasks.add_task(
            run_training_background,
            training_id,
            config_dict
        )
        
        return TrainingTaskResponse(
            training_id=training_id,
            status="pending",
            config=config_dict,
            created_at=datetime.now().isoformat(),
            message="训练任务已提交，正在后台执行"
        )
        
    except Exception as e:
        print(f"❌ 提交训练任务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/v1/training/{training_id}")
async def get_training_status(training_id: str):
    """获取训练任务状态"""
    try:
        if not task_queue:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="任务队列未初始化"
            )
        
        # 从队列获取状态
        task_status = task_queue.get_training_status(training_id)
        
        if not task_status:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"训练任务 {training_id} 不存在"
            )
        
        return {
            "training_id": training_id,
            "status": task_status.get("status", "unknown"),
            "config": task_status.get("config", {}),
            "created_at": task_status.get("created_at"),
            "started_at": task_status.get("started_at"),
            "completed_at": task_status.get("completed_at"),
            "results": task_status.get("results", None),
            "error_message": task_status.get("error_message", None),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 获取训练状态失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.get("/api/v1/training")
async def list_training_tasks(limit: int = 50, status: Optional[str] = None):
    """列出所有训练任务"""
    try:
        if not task_queue:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="任务队列未初始化"
            )
        
        tasks = []
        queue_dir = task_queue.queue_dir
        
        if os.path.exists(queue_dir):
            for filename in os.listdir(queue_dir):
                if not filename.endswith('.json'):
                    continue
                
                task_file = os.path.join(queue_dir, filename)
                
                try:
                    with open(task_file, 'r') as f:
                        task = json.load(f)
                    
                    # 可选过滤
                    if status and task.get("status") != status:
                        continue
                    
                    tasks.append(task)
                except Exception as e:
                    print(f"⚠️ 读取任务文件失败: {filename}, {e}")
        
        # 按创建时间排序
        tasks.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return {
            "count": len(tasks[:limit]),
            "tasks": tasks[:limit]
        }
        
    except Exception as e:
        print(f"❌ 列出训练任务失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@app.post("/api/v1/prediction", response_model=PredictionResponse)
async def make_prediction(request: PredictionRequest):
    """
    执行预测推理
    
    注意：这是一个简化版，实际生产中应该加载训练好的模型
    """
    try:
        prediction_id = f"pred_{uuid.uuid4().hex[:12]}"
        
        # 模拟预测（实际生产中应该加载真实模型）
        import numpy as np
        fault_probability = np.random.uniform(0.1, 0.9)
        is_fault = fault_probability > 0.7
        confidence = 0.7 + np.random.uniform(0, 0.3)
        
        # 如果是故障，生成RUL
        rul = None
        if is_fault:
            rul = np.random.uniform(1, 24)  # 1-24小时
        
        return PredictionResponse(
            prediction_id=prediction_id,
            model_id=request.model_id,
            device_id=request.device_id,
            fault_probability=round(float(fault_probability), 4),
            is_fault=is_fault,
            remaining_useful_life=round(float(rul), 2) if rul else None,
            confidence=round(float(confidence), 4),
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        print(f"❌ 预测失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============== 后台任务 ==============

async def run_training_background(training_id: str, config: Dict):
    """后台运行训练任务"""
    try:
        print(f"🚀 开始后台训练: {training_id}")
        
        if not task_queue:
            print("❌ 任务队列未初始化")
            return
        
        # 运行训练
        results = task_queue.run_task(training_id, config)
        
        print(f"✅ 后台训练完成: {training_id}")
        
    except Exception as e:
        print(f"❌ 后台训练失败: {training_id}, {e}")


# ============== 启动入口 ==============

def start_server(host: str = "0.0.0.0", port: int = 8000, reload: bool = False):
    """启动服务器"""
    uvicorn.run(
        "backend.api.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SIPLACE SX2 后端API服务")
    parser.add_argument("--host", default="0.0.0.0", help="监听地址")
    parser.add_argument("--port", type=int, default=8000, help="监听端口")
    parser.add_argument("--reload", action="store_true", help="启用热重载")
    
    args = parser.parse_args()
    
    start_server(args.host, args.port, args.reload)
