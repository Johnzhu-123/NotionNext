/**
 * 注册邀请码与 LDstore 销售相关配置
 */
module.exports = {
  // 是否开启注册邀请码校验（若为 false 则允许直接注册）
  ENABLE_INVITATION_CODE:
    process.env.NEXT_PUBLIC_ENABLE_INVITATION_CODE === 'false' ? false : true,

  // 邀请码算法签名密钥（私钥）
  // 生产环境推荐在 Vercel 环境变量中配置 INVITATION_SECRET，修改后所有老算法码失效
  INVITATION_SECRET:
    process.env.INVITATION_SECRET || 'notionnext-secret-key-yjys-2026',

  // 默认邀请码前缀
  INVITATION_CODE_PREFIX:
    process.env.NEXT_PUBLIC_INVITATION_CODE_PREFIX || 'YJYS',

  // 兜底静态通用邀请码：支持单个或多个，多个使用英文逗号隔开，例如 'VIP2026,SEEYJYS2026'
  INVITATION_CODE: process.env.INVITATION_CODE || 'SEEYJYS2026',

  // 邀请码提示文案
  INVITATION_TIPS:
    process.env.NEXT_PUBLIC_INVITATION_TIPS ||
    '本站实行专属邀请注册制，注册时必须填写有效邀请码。',

  // LDstore 购买邀请码的跳转链接（可在 Vercel 环境变量中配置上架后的商品直达链接）
  INVITATION_STORE_URL:
    process.env.NEXT_PUBLIC_INVITATION_STORE_URL || 'https://ldcstore.com',

  // LDstore 邀请码定价（LDC 积分）
  INVITATION_PRICE_LDC:
    process.env.NEXT_PUBLIC_INVITATION_PRICE_LDC || 99,

  // 获取邀请码的外部链接或联系方式（留空则优先使用 LDstore 链接）
  INVITATION_CONTACT_URL:
    process.env.NEXT_PUBLIC_INVITATION_CONTACT_URL || '',

  // 获取邀请码的按钮文案
  INVITATION_CONTACT_TEXT:
    process.env.NEXT_PUBLIC_INVITATION_CONTACT_TEXT || '前往 LDstore 购买邀请码',

  // 邀请码验证通过后的 Cookie 保持时长（秒），默认 1 天 (86400 秒)
  INVITATION_COOKIE_EXPIRE: 86400
}
