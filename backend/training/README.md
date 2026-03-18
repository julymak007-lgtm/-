# SIPLACE SX2 预测模型后端训练系统

真正的后端训练实现，包括LSTM深度学习和生存分析模型。

## 目录结构

```
backend/
├── training/
│   ├── train_lstm.py          # LSTM模型训练脚本
│   ├── train_survival.py      # 生存分析模型训练脚本
│   ├── task_queue.py          # 训练任务队列和工作进程
│   ├── README.md               # 本文档
│   ├── queue/                  # 任务队列目录
│   ├── results/                # 训练结果目录
│   └── models/                 # 保存的模型目录
└── ...
```

## 技术栈

- **TensorFlow/Keras**: LSTM深度学习模型
- **lifelines**: 生存分析库
- **scikit-learn**: 数据预处理和评估
- **pandas/numpy**: 数据处理
- **PostgreSQL**: 数据存储
- **Celery/RQ (可选)**: 任务队列

## 快速开始

### 1. 安装依赖

```bash
cd backend/training
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
export SUPABASE_HOST="your-host"
export SUPABASE_DB="your-db"
export SUPABASE_USER="your-user"
export SUPABASE_PASSWORD="your-password"
export SUPABASE_PORT="5432"
```

### 3. 启动训练工作进程

```bash
# 方式1: 直接运行Python工作进程
python task_queue.py

# 方式2: 使用Celery（需要Redis）
celery -A task_queue worker --loglevel=info
```

### 4. 提交训练任务

通过Next.js API提交训练任务，或者直接使用Python API:

```python
from task_queue import submit_training_task

config = {
    "model_type": "lstm",
    "target_label_type": "nozzle_clog",
    "config": {
        "epochs": 50,
        "batch_size": 32,
        "learning_rate": 0.001
    },
    "hyperparameters": {
        "lstm_units": [64, 32],
        "dropout": 0.2
    }
}

result = submit_training_task("training-001", config)
```

## 模型架构

### LSTM模型架构

```
输入层: (batch_size, 240, 20)
  ↓
LSTM层1: 64单元, 返回序列
  ↓
Dropout: 0.2
  ↓
LSTM层2: 32单元
  ↓
Dropout: 0.2
  ↓
全连接层: 16单元, ReLU
  ↓
输出层: 1单元, Sigmoid
```

### 生存分析模型

- **Weibull AFT**: 适合有明确分布的数据
- **Cox PH**: 半参数模型，适用性广
- **Random Survival Forest**: 非线性关系建模

## 数据要求

### LSTM训练数据

需要以下格式的数据：

```sql
-- 标注数据表
labeled_data (
    id,
    device_id,
    start_time,      -- 时间窗口开始
    end_time,        -- 时间窗口结束
    is_fault,        -- 是否故障
    label_type,      -- 故障类型
    train_split      -- train/val/test
)

-- 设备参数表
device_parameters (
    id,
    device_id,
    parameter_name,  -- 参数名
    parameter_value, -- 参数值
    recorded_at      -- 记录时间
)
```

### 特征工程

提取的特征包括：

1. **原始特征**: 真空度、气压、抛料率等30+参数
2. **统计特征**: 滑动窗口的均值、标准差、最大值、最小值、斜率
3. **领域特征**:
   - CPH效率 (Components Per Hour)
   - 热应力标志
   - 单位抛料率

## 模型评估指标

### 分类模型（LSTM）

- **精确率 (Precision)**: TP / (TP + FP)
- **召回率 (Recall)**: TP / (TP + FN)
- **F1值**: 2 * (Precision * Recall) / (Precision + Recall)
- **准确率 (Accuracy)**: (TP + TN) / Total

### 生存分析模型

- **C-index (Concordance Index)**: 预测排序的准确性

## 生产部署建议

### 1. 任务队列架构

```
Next.js API
    ↓
Redis/RabbitMQ (消息队列)
    ↓
Celery Worker (多个)
    ↓
GPU训练节点 (可选)
```

### 2. 模型部署

1. **导出为ONNX格式**: 用于跨平台部署
2. **TensorFlow Serving**: 用于大规模部署
3. **Docker容器化**: 打包训练和推理环境

### 3. 监控

- 训练任务监控（队列长度、失败率）
- 模型性能监控（数据漂移、概念漂移）
- 资源监控（GPU/CPU使用率、内存）

## API集成

### Next.js → Python后端

可以通过以下方式集成：

1. **子进程调用**（简单场景）
2. **HTTP API**（FastAPI/Flask）
3. **消息队列**（Redis/RabbitMQ）

推荐使用消息队列方式，解耦前后端。

## 故障排查

### 常见问题

1. **数据库连接失败**: 检查环境变量和网络连接
2. **内存不足**: 减小batch_size或使用数据生成器
3. **训练不收敛**: 调整学习率、检查数据质量
4. **模型过拟合**: 增加dropout、添加正则化、扩充数据

### 日志位置

- 训练日志: `backend/training/results/{training_id}.log`
- 任务队列日志: `backend/training/queue/{training_id}.json`
- 模型文件: `backend/models/{training_id}.onnx`
