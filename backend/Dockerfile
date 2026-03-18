# ========================================
# SIPLACE SX2 后端 Dockerfile
# 用于 Fly.io 部署
# ========================================

# 使用官方 Python 基础镜像
FROM python:3.11-slim-bookworm AS builder

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装系统依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt .

# 创建虚拟环境并安装依赖
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r requirements.txt

# ========================================
# 生产阶段
# ========================================
FROM python:3.11-slim-bookworm AS production

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# 从 builder 阶段复制虚拟环境
COPY --from=builder /opt/venv /opt/venv

# 复制应用代码
COPY . .

# 创建必要的目录
RUN mkdir -p training/queue \
    training/results \
    models \
    logs

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动应用
CMD ["uvicorn", "backend.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
