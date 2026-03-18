#!/bin/bash
# ========================================
# SIPLACE SX2 全栈启动脚本
# 同时启动 Next.js 前端和 Python 后端
# ========================================

# 项目根目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}正在停止服务...${NC}"
    
    # 停止所有子进程
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    
    echo -e "${RED}服务已停止${NC}"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║          SIPLACE SX2 设备健康预测与维护系统                      ║"
echo "║                    全栈服务启动                                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 检查是否安装了并发工具
if command -v tmux &> /dev/null; then
    USE_TMUX=true
elif command -v screen &> /dev/null; then
    USE_SCREEN=true
else
    USE_BACKGROUND=true
fi

# 启动后端
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[1/2] 启动 Python 后端服务...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd "$PROJECT_DIR/backend"

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}首次启动，正在安装后端依赖...${NC}"
    ./scripts/install.sh
fi

# 在后台启动后端
if [ "$USE_BACKGROUND" = true ]; then
    source venv/bin/activate
    echo -e "${YELLOW}后端将在后台启动 (端口 8000)...${NC}"
    
    # 创建日志目录
    mkdir -p logs
    
    # 启动后端
    nohup uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 > logs/backend.log 2>&1 &
    BACKEND_PID=$!
    
    echo -e "${GREEN}✅ 后端已启动 (PID: $BACKEND_PID)${NC}"
    echo -e "${YELLOW}后端日志: tail -f backend/logs/backend.log${NC}"
fi

# 回到项目根目录
cd "$PROJECT_DIR"

# 等待后端启动
echo ""
echo -e "${YELLOW}等待后端服务启动...${NC}"
sleep 5

# 检查后端是否启动成功
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务启动成功${NC}"
else
    echo -e "${RED}⚠️  后端服务可能未完全启动，请检查日志${NC}"
fi

# 启动前端
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}[2/2] 启动 Next.js 前端服务...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    pnpm install
fi

# 启动前端
echo -e "${GREEN}启动 Next.js 开发服务器...${NC}"
echo ""

if [ "$USE_BACKGROUND" = true ]; then
    # 后台启动前端
    nohup pnpm dev > logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    echo -e "${GREEN}✅ 前端已启动 (PID: $FRONTEND_PID)${NC}"
    echo -e "${YELLOW}前端日志: tail -f logs/frontend.log${NC}"
else
    # 直接启动前端
    pnpm dev
fi

# 显示访问信息
echo ""
echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                        服务已启动！                               ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  🌐 前端地址: http://localhost:5000                           ║"
echo "║  🔧 后端地址: http://localhost:8000                           ║"
echo "║  📡 API文档: http://localhost:8000/docs                       ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║  按 Ctrl+C 停止所有服务                                         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 保持脚本运行
if [ "$USE_BACKGROUND" = true ]; then
    echo ""
    echo -e "${YELLOW}服务正在后台运行...${NC}"
    echo -e "${YELLOW}查看后端日志: tail -f backend/logs/backend.log${NC}"
    echo -e "${YELLOW}查看前端日志: tail -f logs/frontend.log${NC}"
    echo ""
    
    # 等待用户中断
    wait
fi
