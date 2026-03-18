# Vercel + Fly.io 部署指南

## 🚀 完整部署方案

- **前端**: Vercel（Next.js 官方托管，免费）
- **后端**: Fly.io（Python 应用托管，免费额度）
- **数据库**: Supabase（已经在用了）

---

## 📋 前置准备

### 1. 注册账号

- [Vercel 账号](https://vercel.com/signup) - 免费
- [Fly.io 账号](https://fly.io/app/sign-up) - 需要信用卡验证（免费额度内不扣费）
- [Supabase 账号](https://supabase.com/) - 已有

### 2. 安装命令行工具

```bash
# 安装 Fly.io CLI
curl -L https://fly.io/install.sh | sh

# 或使用 Homebrew (Mac)
brew install flyctl

# 安装完成后登录
fly auth login
```

---

## 🌐 第一步：部署前端到 Vercel

### 方式1：Vercel Dashboard（推荐）

1. 将代码推送到 GitHub
2. 访问 [vercel.com/new](https://vercel.com/new)
3. 导入你的项目
4. 配置环境变量（Settings → Environment Variables）：
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   USE_REAL_BACKEND=true
   NEXT_PUBLIC_BACKEND_URL=https://your-app-name.fly.dev
   ```
5. 点击 Deploy！

### 方式2：Vercel CLI

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 部署
vercel
```

---

## 🔧 第二步：部署后端到 Fly.io

### 1. 配置 Fly.io

编辑 `backend/fly.toml`，修改应用名：

```toml
app = "siplace-sx2-backend"  # 改成独一无二的名字，比如你的名字缩写
primary_region = "hkg"          # 香港区域，国内访问快
```

### 2. 初始化 Fly 应用

```bash
# 进入后端目录
cd backend

# 初始化应用（如果还没创建）
fly launch

# 或者直接使用现有的 fly.toml
fly apps create siplace-sx2-backend  # 用你自己的名字
```

### 3. 设置环境变量密钥

```bash
# 设置 Supabase 相关密钥（从你的 Supabase 项目获取）
fly secrets set \
  SUPABASE_URL="your_supabase_url" \
  SUPABASE_ANON_KEY="your_supabase_anon_key" \
  SUPABASE_SERVICE_ROLE_KEY="your_service_role_key" \
  SUPABASE_HOST="db.xxxx.supabase.co" \
  SUPABASE_PORT="5432" \
  SUPABASE_DB="postgres" \
  SUPABASE_USER="postgres" \
  SUPABASE_PASSWORD="your_database_password" \
  USE_REAL_TRAINING="true"

# 验证密钥
fly secrets list
```

### 4. 部署！

```bash
# 部署到 Fly.io
fly deploy

# 查看部署状态
fly status

# 查看日志
fly logs
```

### 5. 测试后端

```bash
# 获取你的后端地址
fly open

# 或手动访问
curl https://siplace-sx2-backend.fly.dev/health
```

应该看到：
```json
{
  "status": "healthy",
  "timestamp": "...",
  "version": "1.0.0"
}
```

---

## 🔗 第三步：连接前后端

### 1. 更新 Vercel 环境变量

在 Vercel Dashboard → Settings → Environment Variables：

```
NEXT_PUBLIC_BACKEND_URL=https://siplace-sx2-backend.fly.dev
USE_REAL_BACKEND=true
```

### 2. 重新部署 Vercel

修改环境变量后需要重新部署：

```bash
# 在项目根目录
vercel --prod
```

或者在 Vercel Dashboard 点击 "Redeploy"。

---

## 📊 完整部署检查清单

- [ ] 前端已部署到 Vercel
- [ ] 后端已部署到 Fly.io
- [ ] Supabase 数据库已配置
- [ ] 环境变量已设置
- [ ] 前后端可以通信
- [ ] 可以访问前端页面
- [ ] 后端健康检查通过
- [ ] API 文档可访问

---

## 🎯 常用 Fly.io 命令

```bash
# 查看应用状态
fly status

# 查看日志
fly logs

# 打开应用
fly open

# SSH 进入容器
fly ssh console

# 重启应用
fly apps restart

# 扩容/缩容
fly scale count 2

# 查看区域
fly regions list

# 更改配置后重新部署
fly deploy
```

---

## 💸 成本说明

### Vercel
- ✅ **Hobby 计划免费**
- 100GB 带宽/月
- 无限项目

### Fly.io
- ✅ **免费额度**：
  - 3 个共享 CPU 虚拟机
  - 3GB 内存
  - 160GB 带宽
- ⚠️ 需要信用卡验证（防止滥用）
- 超出免费额度才会扣费

### Supabase
- ✅ **Free 计划**：
  - 500MB 数据库
  - 2GB 存储
  - 50MB 带宽/月

---

## 🐛 故障排查

### 问题1：后端部署失败

```bash
# 查看详细日志
fly logs

# 检查 Dockerfile 是否正确
fly deploy --local-only
```

### 问题2：前后端无法连接

1. 检查 CORS 配置
2. 确认环境变量 `NEXT_PUBLIC_BACKEND_URL` 正确
3. 检查后端健康检查：`https://your-app.fly.dev/health`

### 问题3：数据库连接失败

1. 确认 Supabase 密钥正确
2. 检查数据库 IP 白名单（Supabase → Database → Network Restrictions）
3. 允许 0.0.0.0/0（开发测试用）

---

## 🔒 安全建议

1. **不要将 `.env` 文件提交到 Git**
2. **使用 Fly Secrets** 存储敏感信息
3. **定期轮换密钥**
4. **配置 Supabase 行级安全策略(RLS)**
5. **生产环境关闭自动停止**（`fly.toml` 中 `min_machines_running = 1`）

---

## 📚 相关文档

- [Vercel 文档](https://vercel.com/docs)
- [Fly.io 文档](https://fly.io/docs/)
- [Supabase 文档](https://supabase.com/docs)

---

## 🎉 部署完成！

部署成功后，你将拥有：

- 🌐 **前端**: `https://your-app.vercel.app`
- 🔧 **后端**: `https://your-backend.fly.dev`
- 📚 **API文档**: `https://your-backend.fly.dev/docs`

恭喜！你的系统现在已经在云端运行了！🚀
