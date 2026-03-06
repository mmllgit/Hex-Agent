# 英雄联盟海克斯大乱斗国服 AI Agent

基于 LangChain.js + GPT-4o 的英雄联盟海克斯大乱斗攻略助手，提供英雄玩法分析、海克斯搭配推荐和技巧建议。

## 技术栈

- **前端**: Next.js 15 + React 19 + Tailwind CSS
- **后端**: Node.js + Express + TypeScript + LangChain.js
- **数据库**: MongoDB (Mongoose)
- **LLM**: OpenAI GPT-4o
- **部署**: Docker + docker-compose

## 快速开始

### 方式一：Docker 一键启动

```bash
# 设置 OpenAI API Key
export OPENAI_API_KEY=sk-your-key-here

# 启动所有服务
docker-compose up --build
```

访问 http://localhost:3000 即可使用。

### 方式二：本地开发

**前置条件**: Node.js 18+, MongoDB 运行在 localhost:27017

```bash
# 1. 安装后端依赖
cd backend && npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 文件填入 OPENAI_API_KEY

# 3. 初始化数据库
npm run seed

# 4. 启动后端
npm run dev

# 5. 新终端 - 安装前端依赖并启动
cd frontend && npm install
npm run dev
```

- 前端: http://localhost:3000
- 后端: http://localhost:3001
- API 健康检查: http://localhost:3001/health

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/chat | Agent 对话 (SSE 流式) |
| GET | /api/champions | 获取英雄列表 |
| GET | /api/hextech | 获取海克斯增益列表 |

## 项目结构

```
├── docker-compose.yml
├── backend/
│   └── src/
│       ├── index.ts          # Express 入口
│       ├── agent/            # LangChain Agent 核心
│       ├── tools/            # 工具 (英雄查询/海克斯查询/爬虫)
│       ├── db/               # MongoDB 连接/模型/种子数据
│       └── routes/           # API 路由
└── frontend/
    └── src/
        ├── app/              # Next.js 页面
        ├── components/       # React 组件
        └── lib/              # API 调用封装
```
