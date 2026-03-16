# 飞书应用配置完整指南

> 从零创建飞书应用到 agent-to-feishu 跑通的完整步骤。
> 基于 2026-03-15~16 夙愿实际操作过程整理。

---

## 一、创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)，登录企业账号
2. 点击「创建企业自建应用」
3. 填写应用名称（如 `AI Agent`）和描述，创建
4. 进入应用详情页，左侧导航栏 →「凭证与基础信息」
5. 复制 **App ID**（`cli_` 开头）和 **App Secret**

---

## 二、开启机器人能力

1. 左侧导航栏 →「应用能力」→「机器人」
2. 点击「开启机器人能力」

---

## 三、配置权限

### 方式一：批量导入（推荐）

左侧导航栏 →「权限管理」→ 右上角「批量开通」→ 粘贴以下 JSON：

```json
{
  "scopes": {
    "tenant": [
      "approval:approval",
      "bitable:app",
      "calendar:calendar",
      "contact:user.employee_id:readonly",
      "docx:document",
      "drive:drive",
      "drive:file",
      "im:chat",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource",
      "sheets:spreadsheet",
      "wiki:wiki"
    ],
    "user": []
  }
}
```

### 方式二：手动搜索添加

在「权限管理」页面的搜索框里逐个搜索并勾选。

### 权限说明

| 权限 | 用途 | 是否需要审核 |
|------|------|-------------|
| `im:message` | 消息读写 | 免审 |
| `im:message:send_as_bot` | 主动发消息（不只是回复） | 免审 |
| `im:message:readonly` | 读取消息内容 | 免审 |
| `im:message.p2p_msg:readonly` | 接收私聊消息 | 免审 |
| `im:message.group_at_msg:readonly` | 接收群里 @bot 的消息 | 免审 |
| `im:chat` | 群聊管理（建群、列群） | 免审 |
| `im:chat.members:bot_access` | 允许 bot 被拉进群 | 免审 |
| `im:chat.access_event.bot_p2p_chat:read` | 监听私聊会话事件 | 免审 |
| `im:resource` | 访问消息中的图片/文件 | 免审 |
| `contact:user.employee_id:readonly` | 查用户 ID（@人时用） | 免审 |
| `docx:document` | 云文档读写 | 免审 |
| `drive:drive` | 云盘文件读写 | 免审 |
| `drive:file` | 上传下载文件 | 免审 |
| `sheets:spreadsheet` | 电子表格读写 | 免审 |
| `bitable:app` | 多维表格读写 | 免审 |
| `wiki:wiki` | 知识库读写 | 免审 |
| `calendar:calendar` | 日历事件读写 | 免审 |
| `approval:approval` | 审批全部操作（提交、查询、同意、拒绝、撤回） | 免审 |

> 以上 18 条权限全部是「免审权限」，加完发版后立即生效，不需要管理员额外审批。

---

## 四、发布应用版本

**每次修改权限后都要重新发布版本！** 这是飞书的机制，不发版权限不生效。

1. 左侧导航栏 →「版本管理与发布」
2. 点击「创建版本」
3. 填写版本号（如 `1.0.1`）和更新说明（如「新增文档/表格/日历权限」）
4. 可用范围：选「全部员工」或指定范围
5. 提交发布
6. 如果你是管理员，可能自动通过；否则等管理员审核

---

## 五、配置事件订阅（如果要用 claude-to-im 桥接）

> 这一步只有需要飞书机器人接收消息时才需要（即用 claude-to-im 做聊天入口）。
> 如果只是用 agent-to-feishu CLI 主动操作飞书，可以跳过。

1. 确保 claude-to-im 桥接服务已启动（`/claude-to-im start`）
2. 左侧导航栏 →「事件与回调」→「事件订阅」
3. 请求方式选「使用长连接接收事件」（WebSocket，不需要公网 IP）
4. 添加事件：搜索并添加 `im.message.receive_v1`（接收消息）
5. **再次发布新版本**（改了事件订阅后也要发版）
6. 等管理员审核通过

---

## 六、配置 agent-to-feishu

```bash
# 交互式配置
npx agent-to-feishu setup

# 或手动写配置文件
mkdir -p ~/.agent-to-feishu
cat > ~/.agent-to-feishu/config.json << 'EOF'
{
  "appId": "cli_你的AppID",
  "appSecret": "你的AppSecret",
  "domain": "https://open.feishu.cn"
}
EOF
chmod 600 ~/.agent-to-feishu/config.json
```

---

## 七、验证

```bash
# 测试认证是否通过
agent-to-feishu im list-chats

# 成功应该返回 {"code": 0, "data": {"items": [...]}}
# 如果返回 99991672 错误码，说明缺权限，看报错里的链接去加
# 如果返回 99991661 错误码，说明 App ID 或 Secret 填错了
```

---

## 八、获取测试用的 chat_id

机器人被拉进群后，运行：

```bash
agent-to-feishu im list-chats
```

返回结果里每个群都有 `chat_id`（格式 `oc_` 开头），拿来发消息：

```bash
agent-to-feishu im send --chat "oc_xxx" --text "Hello from AI Agent!"
```

---

## 常见问题

**Q: 权限加了但还是报 99991672？**
发版了吗？每次改权限都要去「版本管理与发布」创建新版本。

**Q: 机器人搜不到 / 拉不进群？**
版本没发布或管理员没审核通过。去「版本管理与发布」看状态。

**Q: 国际版 Lark 怎么办？**
把 domain 改成 `https://open.larksuite.com`。

**Q: 报错 token 过期？**
正常的，`tenant_access_token` 有效期 2 小时，agent-to-feishu 会自动刷新。如果服务长时间没跑，第一次调用可能需要几秒钟获取新 token。

---

*最后更新：2026-03-16*
