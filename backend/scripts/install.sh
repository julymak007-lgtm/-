#!/bin/bash
# ========================================
# SIPLACE SX2 后端安装脚本
# ========================================

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BACKEND_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          SIPLACE SX2 预测模型后端安装                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查Python
echo -e "${YELLOW}检查Python版本...${NC}"
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}错误: 未找到 python3${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo -e "Python版本: ${GREEN}${PYTHON_VERSION}${NC}"

# 创建虚拟环境
echo ""
echo -e "${YELLOW}创建Python虚拟环境...${NC}"
if [ -d "venv" ]; then
    echo -e "${YELLOW}虚拟环境已存在，跳过创建${NC}"
else
    python3 -m venv venv
    echo -e "${GREEN}✅ 虚拟环境创建完成${NC}"
fi

# 激活虚拟环境
echo ""
echo -e "${YELLOW}激活虚拟环境...${NC}"
source venv/bin/activate

# 安装依赖
echo ""
echo -e "${YELLOW}安装Python依赖...${NC}"
echo "这可能需要几分钟时间，请耐心等待..."
echo ""

pip install --upgrade pip
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
else
    echo ""
    echo -e "${RED}❌ 依赖安装失败${NC}"
    exit 1
fi

# 复制环境变量文件
echo ""
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}创建环境变量文件...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env 文件已创建${NC}"
    echo -e "${YELLOW}请编辑 .env 文件配置数据库连接${NC}"
else
    echo -e "${GREEN}✅ .env 文件已存在${NC}"
fi

# 创建必要的目录
echo ""
echo -e "${YELLOW}创建必要目录...${NC}"
mkdir -p training/queue
mkdir -p training/results
mkdir -p models
mkdir -p logs
echo -e "${GREEN}✅ 目录创建完成${NC}"

echo ""
echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                        安装完成！                                 ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  下一步:                                                        ║"
echo "║  1. 编辑 .env 文件配置数据库连接                                ║"
echo "║  2. 运行: cd backend && ./scripts/start.sh                     ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
