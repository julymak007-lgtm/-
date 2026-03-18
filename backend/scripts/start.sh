#!/bin/bash
# ========================================
# SIPLACE SX2 后端启动脚本
# ========================================

# 项目根目录
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          SIPLACE SX2 预测模型后端服务启动                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 加载环境变量
if [ -f ".env" ]; then
    echo -e "${YELLOW}加载环境变量...${NC}"
    export $(grep -v '^#' .env | xargs)
else
    echo -e "${RED}警告: .env 文件不存在，使用默认配置${NC}"
fi

# 默认配置
HOST=${BACKEND_HOST:-0.0.0.0}
PORT=${BACKEND_PORT:-8000}
RELOAD=${BACKEND_RELOAD:-true}

echo -e "📡 监听地址: ${GREEN}${HOST}:${PORT}${NC}"
echo -e "🔄 热重载: ${GREEN}${RELOAD}${NC}"
echo ""

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未找到 python3${NC}"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}创建Python虚拟环境...${NC}"
    python3 -m venv venv
fi

# 激活虚拟环境
echo -e "${YELLOW}激活虚拟环境...${NC}"
source venv/bin/activate

# 检查依赖
echo -e "${YELLOW}检查Python依赖...${NC}"
pip install -q -r requirements.txt

echo ""
echo -e "${GREEN}✅ 依赖检查完成${NC}"
echo ""

# 确保必要的目录存在
mkdir -p training/queue
mkdir -p training/results
mkdir -p models
mkdir -p logs

echo -e "${BLUE}"
echo "🚀 启动 FastAPI 后端服务..."
echo -e "${NC}"
echo ""

# 启动服务
if [ "$RELOAD" = "true" ]; then
    echo -e "${YELLOW}提示: 使用 --reload 模式（开发环境）${NC}"
    echo ""
    uvicorn backend.api.main:app --host "$HOST" --port "$PORT" --reload
else
    echo -e "${YELLOW}提示: 使用生产模式${NC}"
    echo ""
    uvicorn backend.api.main:app --host "$HOST" --port "$PORT"
fi
