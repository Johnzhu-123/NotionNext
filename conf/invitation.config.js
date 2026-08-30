/**
 * 注册邀请码相关配置
 */
module.exports = {
  // 是否开启注册邀请码校验（若为 false 则允许直接注册）
  ENABLE_INVITATION_CODE:
    process.env.NEXT_PUBLIC_ENABLE_INVITATION_CODE === 'false' ? false : true,

  // 算法邀请码签名密钥（生产环境建议在 Vercel 环境变量中配置 INVITATION_SECRET）
  INVITATION_SECRET:
    process.env.INVITATION_SECRET || 'notionnext-secret-key-yjys-2026',

  // 邀请码前缀（用于算法生成，例如 YJYS -> 生成 YJYS-8M7P-K4F2）
  INVITATION_CODE_PREFIX:
    process.env.NEXT_PUBLIC_INVITATION_CODE_PREFIX || 'YJYS',

  // 静态邀请码配置（兜底备用：支持单个或多个以逗号隔开，例如 'VIP2026,SEEYJYS'）
  INVITATION_CODE: process.env.INVITATION_CODE || 'SEEYJYS2026',

  // 邀请码提示文案
  INVITATION_TIPS:
    process.env.NEXT_PUBLIC_INVITATION_TIPS ||
    '本站实行专属邀请注册制，请输入有效邀请码开启注册。',

  // 获取邀请码的外部链接或联系方式（留空则不显示外链按钮）
  INVITATION_CONTACT_URL:
    process.env.NEXT_PUBLIC_INVITATION_CONTACT_URL || '',

  // 获取邀请码的按钮文案
  INVITATION_CONTACT_TEXT:
    process.env.NEXT_PUBLIC_INVITATION_CONTACT_TEXT || '获取邀请码',

  // 邀请码验证通过后的 Cookie 保持时长（秒），默认 1 天 (86400 秒)
  INVITATION_COOKIE_EXPIRE: 86400
}
