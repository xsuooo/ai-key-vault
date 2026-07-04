# AI Key Vault

AI Key Vault 是一个本地运行的 AI API Key 管理工具，适合统一保存多组 OpenAI 兼容接口配置，并快速检查 Key 是否可用、能看到哪些模型，以及哪个模型更适合日常使用。

项目默认把配置保存在浏览器本地，不需要数据库，也不托管你的 Key。

## 快速使用

### 方式一：下载 Docker 包

适合只想直接用、不想安装 Node.js 的朋友。

1. 打开 [Releases](https://github.com/xsuooo/ai-key-vault/releases/latest)。
2. 下载 `ai-key-vault-docker.zip`。
3. 解压后启动 Docker Desktop。
4. 双击 `start.bat`。
5. 打开 [http://localhost:3000](http://localhost:3000)。

停止服务时双击 `stop.bat`。

如果本机 3000 端口已经被占用，可以编辑压缩包里的 `docker-compose.yml`，把：

```yaml
ports:
  - "3000:3000"
```

改成：

```yaml
ports:
  - "3001:3000"
```

然后访问 [http://localhost:3001](http://localhost:3001)。

### 方式二：从源码运行

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

### 方式三：自己构建 Docker 镜像

```bash
docker compose up -d --build
```

常用命令：

```bash
docker compose logs -f app
docker compose down
```

也可以使用项目内置脚本：

```bash
npm run docker:deploy
npm run docker:logs
npm run docker:down
```

## 主要功能

- 本地保存多组配置：名称、Base URL、API Key、默认模型。
- 支持复制单条配置、复制全部配置、导出 `.txt` / `.md` / `.json`。
- 支持从 `curl`、JSON、环境变量文本、结构化文本块、`ccswitch://` 链接中解析配置。
- 支持导入 `cc-switch` 导出的 `.sql` 文件。
- 支持单条测试和批量测试，记录状态、错误详情和最近测试时间。
- 支持模型列表探测、推荐模型、复制模型列表。
- 支持按模型进行 1 到 3 轮测速，展示平均耗时、中位耗时、首字时间、成功率和稳定性。
- 支持 CC Switch 导出和唤起导入，目标应用包括 `Claude`、`Codex`、`Gemini`、`OpenCode`、`OpenClaw`。

## 隐私说明

配置数据默认保存在浏览器 `localStorage` 中。项目没有数据库，也没有服务端持久化 Key 的逻辑。

连通性测试、模型识别和性能评测需要真实请求上游接口。为了绕开浏览器直连常见的 CORS 限制，这些请求会通过本项目的同源后端接口转发。

简单来说：

- 配置默认存在你自己的浏览器里。
- 项目不会把 Key 写入数据库。
- 测试和测速时，Key 会参与当前这一次后端转发请求。
- 如果把项目部署到公网，请只给可信的人使用。

## 安全策略

服务端会校验 OpenAI 兼容 Base URL，默认拒绝本地地址、内网地址和其他非公开地址，降低误请求内网资源的风险。

生产环境默认要求 HTTPS。如果确实需要访问某些内部服务，可以通过环境变量显式放开：

```bash
OPENAI_PROXY_ALLOWED_HOSTS=example.internal,relay.example.com
```

本地开发时如需允许私有地址：

```bash
OPENAI_PROXY_ALLOW_PRIVATE=1
```

不建议在公网部署时开启私有地址访问。

## 开发命令

```bash
npm test
npm run lint
npm run build
npm audit --json
```

## 技术栈

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- ECharts
- Zustand
