# 🎟️ NotionNext 注册邀请码系统操作手册

本文档记录了 LD研究生院（`seeyjys.eu.org`）站点的**注册邀请码门禁系统**的工作原理、批量生成方法、配置参数以及日常运维 SOP。

---

## 📌 一、 核心工作原理

本系统采用 **HMAC-SHA256 密码学签名算法**，实现“**零数据库存储、秒生万码、即时验真**”：

1. **防伪格式**：`[前缀]-[随机字符]-[签名校验码]`（例如：`YJYS-8M7P-K4F2`）；
2. **安全字符**：排除了易混淆的字符（`0, O, 1, I`），避免用户输入失误；
3. **输入容错**：支持用户输入连字符（`YJYS-8M7P-K4F2`）或直接输入纯字母数字（`YJYS8M7PK4F2`），自动转大写；
4. **双重兼容**：优先校验算法签名码，同时兼容管理员设置的静态通用口令（如 `SEEYJYS2026`）。

---

## ⚡ 二、 快速日常操作：批量生成邀请码

在本地项目目录 `编程/网站维护/NotionNext` 下打开终端（PowerShell 或 CMD），运行以下命令：

### 1. 常用生成命令

```powershell
# 1. 默认生成 20 个邀请码
npm run gen-invites

# 2. 批量生成 100 个邀请码
npm run gen-invites 100

# 3. 批量生成 500 个邀请码
npm run gen-invites 500

# 4. 指定前缀生成（例如生成 LINUXDO 专属前缀）
node scripts/generate-invites.js 200 --prefix=LINUXDO

# 5. 指定输出文件名
node scripts/generate-invites.js 100 --out=vip-invites.txt
```

### 2. 生成结果与分发

- 终端会即时打印前 10 个邀请码预览；
- 脚本会自动在项目根目录下生成带时间戳的文件（如 `invites-YJYS-20260830-004846.txt`）；
- 打开文件全选复制，即可直接在 Excel、微信、群聊或邮件中分发给受邀用户。
- *(注：`invites-*.txt` 已被 `.gitignore` 自动忽略，不会污染代码仓库)*

---

## ⚙️ 三、 环境变量与配置参数（Vercel）

如需修改密钥或默认设置，可在 **Vercel 控制台 -> Settings -> Environment Variables** 中配置（改后触发 Redeploy 即生效）：

| 环境变量名 | 说明 | 默认值 | 应用场景 |
|---|---|---|---|
| `INVITATION_SECRET` | 签名密钥（私钥） | 内置默认密钥 | **安全性核心**：修改后之前生成的老邀请码将全部作废 |
| `NEXT_PUBLIC_INVITATION_CODE_PREFIX` | 邀请码前缀 | `YJYS` | 用于改变默认前缀（如改为 `SEEYJYS`） |
| `INVITATION_CODE` | 静态兜底邀请码 | `SEEYJYS2026` | 备用通用口令（支持多个以逗号分隔，如 `VIP2026,HELLO`） |
| `NEXT_PUBLIC_ENABLE_INVITATION_CODE` | 是否开启邀请门禁 | `true` | 设置为 `false` 可一键临时放开全网免邀请注册 |
| `NEXT_PUBLIC_INVITATION_TIPS` | 注册门禁提示语 | `本站实行专属邀请注册制...` | 自定义门禁卡片上展示的引导文案 |
| `NEXT_PUBLIC_INVITATION_CONTACT_URL` | 获取邀请码外链 | `''`（留空不显示） | 可填入管理员联系邮箱、社群地址或申请表单链接 |
| `NEXT_PUBLIC_INVITATION_CONTACT_TEXT` | 获取邀请码按钮文案 | `获取邀请码` | 底部跳转按钮文案 |

---

## 🛠️ 四、 常见运维场景 SOP

### 场景 1：要给一个新社群/班级发放 200 个专属邀请码
1. 在项目终端执行：
   ```powershell
   node scripts/generate-invites.js 200 --prefix=JXNU --out=jxnu_200.txt
   ```
2. 打开 `jxnu_200.txt`，复制生成的 200 个码分发给该群体的用户即可。

### 场景 2：想临时设置一个全员通用的简单口令（如活动开放）
1. 在 Vercel 环境变量中添加或修改 `INVITATION_CODE`，填入：`OPEN2026`；
2. 重新部署后，用户输入 `OPEN2026` 即可直接通过注册。

### 场景 3：需要彻底放开注册（免邀请）
1. 在 Vercel 环境变量中设置：`NEXT_PUBLIC_ENABLE_INVITATION_CODE = false`；
2. 用户访问 `/sign-up` 时将直接展示注册表单，无门禁卡片。

### 场景 4：怀疑邀请码泄露，需要全部作废重置
1. 在 Vercel 环境变量中修改 `INVITATION_SECRET` 为一段新的随机字符串；
2. 重新部署后，所有旧算法码将立即失效；
3. 本地使用新密钥重新生成一批新码即可。

---

## 📂 五、 核心代码文件索引

- **算法生成与验真库**：[`lib/invitation.js`](file:///c:/Users/JingJing/Desktop/AI-Assistant/编程/网站维护/NotionNext/lib/invitation.js)
- **批量生成命令行脚本**：[`scripts/generate-invites.js`](file:///c:/Users/JingJing/Desktop/AI-Assistant/编程/网站维护/NotionNext/scripts/generate-invites.js)
- **服务端验证 API**：[`pages/api/auth/verify-invite.js`](file:///c:/Users/JingJing/Desktop/AI-Assistant/编程/网站维护/NotionNext/pages/api/auth/verify-invite.js)
- **前端门禁 UI 组件**：[`components/InvitationGate.js`](file:///c:/Users/JingJing/Desktop/AI-Assistant/编程/网站维护/NotionNext/components/InvitationGate.js)
- **配置文件**：[`conf/invitation.config.js`](file:///c:/Users/JingJing/Desktop/AI-Assistant/编程/网站维护/NotionNext/conf/invitation.config.js)
