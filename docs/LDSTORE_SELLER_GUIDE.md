# 🛒 LDstore 上架「LD研究生院注册邀请码」全流程操作指南

> 本指南针对 LINUX DO 社区集市（LDstore）与 LD研究生院（`seeyjys.eu.org`）的**自动发卡售卖与注册门禁对接**编写。  
> 参考官方教程与配置经验：[玩转LD士多：配置、测试、发布物品全流程](https://linux.do/t/topic/2443127)

---

## 📌 一、 交易机制与收益测算

- **交易货币**：`LDC`（LINUX DO 社区积分）
- **商品定价**：`99 LDC / 个`
- **交付模式**：`自动发卡（CDK）`，用户下单支付后系统秒级交付卡密
- **流转费率**：LINUX DO Credit 积分底层系统流转收取 **15% 手续费**（credit 回收机制）
- **单笔到账**：用户支付 99 LDC，商家最终实收到账约为 **84.15 LDC**

---

## ⚙️ 二、 首次配置：LDC 集市与 LD士多收款绑定（仅需一次）

如果这是你第一次在 LD士多卖东西，需要先打通收款链路：

### 1. 获取 LD士多收款通知参数
1. 浏览器打开 [LD士多 - 个人中心设置](https://ldcstore.com/user/settings)；
2. 页面往下拉找到 **「收款配置」** 区域；
3. 记下页面显示的：
   - **通知 URL**（如 `https://api.ldspro.qzz.io/api/v1/notify`）
   - **回调 URL**（如 `https://ldcstore.com/order/`）

### 2. 在 LINUX DO Credit 集市中心创建应用
1. 浏览器打开 [LINUX DO Credit 集市中心](https://credit.linux.do/merchant)；
2. 点击 **「创建应用」**，填入以下必填项：
   - **应用名称**：`LD士多自动发卡`
   - **应用主页**：`https://credit.linux.do/`
   - **通知 URL**：填入第 1 步在 LD士多获取的 **通知 URL**
   - **回到 URL**：填入第 1 步在 LD士多获取的 **回调 URL**
3. 提交创建后，页面右侧将生成：
   - `Client ID`
   - `Client Secret`

### 3. 反填回 LD士多完成绑定
1. 回到 [LD士多 - 收款配置](https://ldcstore.com/user/settings)；
2. 将刚才获取的 `Client ID` 和 `Client Secret` 填入输入框；
3. 点击 **「保存配置」**。

---

## 🎟️ 三、 批量生成 99 LDC 邀请码库存

在项目目录 `C:\Users\JingJing\Desktop\AI-Assistant\编程\网站维护\NotionNext` 下打开终端：

### 1. 生成卡密命令
```powershell
# 批量生成 50 个用于上架的邀请码
npm run gen-invites 50

# 或批量生成 100 个
npm run gen-invites 100
```

### 2. 卡密文件特性
- 脚本会自动自检并生成纯净的卡密文件：`ldstore-cards-YJYS-XXXXXXXX-XXXXXX.txt`；
- 该文件每行对应一个独立的密码学防伪邀请码（例如 `YJYS-8M7P-K4F2`）；
- 无任何注释或无关字符，**Ctrl+A 全选即可直接粘贴进 LD士多**；
- 该文件已被 `.gitignore` 自动忽略，绝不会泄漏或提交至公共 Git 仓库。

---

## 🚀 四、 LDstore 上架物品实操

1. 打开 [LD士多发布物品页面](https://ldcstore.com/publish)；
2. 填写商品信息：
   - **物品类型**：选择 **`自动发卡`**（⚠️ 必须选自动发卡，不能选普通物品）；
   - **商品分类**：选择 **`公益站`** 或 **`咨询`**；
   - **物品标题**：`LD研究生院注册专属邀请码（官方正版·一码一人）`；
   - **价格 (LDC)**：填入 `99`；
   - **卡密列表**：打开上一步生成的 `ldstore-cards-*.txt` 文件，**全选复制全部内容，粘贴到卡密多行输入框**（每行一个）；
   - **商品介绍参考**：
     ```markdown
     本商品为 LD 研究生院（https://www.seeyjys.eu.org/）官方注册邀请码。
     
     【购买须知】
     1. 自动发卡秒级交付，购买后即刻获得专属卡密（格式如 YJYS-XXXX-YYYY）；
     2. 前往注册页面：https://www.seeyjys.eu.org/sign-up 输入卡密完成验证；
     3. 验证通过后即可使用 Clerk 注册账号并解锁网站全部研究生知识库与互助板块；
     4. 一码一人，请妥善保管。
     ```
3. 点击 **「提交发布」**。
   - 提交后进入审核状态（后台大模型自动审核，一般很快通过）。
   - 审核通过后即正式上架物品广场！

---

## 🔗 五、 将商品直达链接反填至 NotionNext

当你在 LDstore 成功发布商品后：
1. 打开该商品页面，复制浏览器地址栏的完整商品链接（例如：`https://ldcstore.com/goods/xxxxx`）；
2. 前往 **Vercel 控制台** -> 你的项目（NotionNext）-> **Settings** -> **Environment Variables**；
3. 添加或修改以下环境变量：
   ```env
   NEXT_PUBLIC_INVITATION_STORE_URL=https://ldcstore.com/goods/你的商品ID
   NEXT_PUBLIC_INVITATION_PRICE_LDC=99
   ```
4. 触发 Redeploy（或等待自动部署生效）。
5. 用户访问你的注册页面 `/sign-up` 时：
   - 若未填邀请码点击注册，弹窗将提示 **前往 LDstore 购买邀请码** 并**一键直达你的专属商品页面**！

---

## 🛡️ 六、 门禁安全与防刷机制

1. **强密码学验真**：采用 HMAC-SHA256 算法签名，只有通过管理员私钥生成的码才能通过校验，黑客无法伪造猜测；
2. **容错与兼容**：用户输入无论带连字符 `YJYS-8M7P-K4F2` 还是纯字符 `YJYS8M7PK4F2`，大小写均能自动适配；
3. **单次使用防重复（可选 Redis）**：如果配置了 `REDIS_URL`，系统会自动将已核销的卡密存入 Redis 并标记失效，杜绝同一邀请码被多人转赠或二次注册；
4. **紧急口令兜底**：如有特殊活动或管理员自用，可在 `INVITATION_CODE` 中配置静态通行码（如 `SEEYJYS2026`）。
