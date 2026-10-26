if (typeof self === 'undefined') {
  global.self = globalThis
}

import BLOG from '@/blog.config'
import { verifyInviteCode, signUserActivation, verifyUserActivation } from '@/lib/invitation'

/**
 * 开图通行证用户激活 API
 * 规则：
 * 1. 2026年9月23日之前注册的老用户免除激活，自动放行。
 * 2. 2026年9月23日之后新注册的用户必须校验邀请码并绑定签名。
 */
export default async function handler(req, res) {
  // 跨域支持 (支持 openlib.seeyjys.eu.org)
  const origin = req.headers.origin || ''
  if (
    origin === 'https://openlib.seeyjys.eu.org' ||
    origin.endsWith('.seeyjys.eu.org')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const isEnabled =
    process.env.NEXT_PUBLIC_ENABLE_INVITATION_CODE !== 'false' &&
    BLOG.ENABLE_INVITATION_CODE !== false

  const storeUrl =
    process.env.NEXT_PUBLIC_INVITATION_STORE_URL ||
    BLOG.INVITATION_STORE_URL ||
    'https://ldcstore.com/product/12974'

  const priceLdc =
    process.env.NEXT_PUBLIC_INVITATION_PRICE_LDC ||
    BLOG.INVITATION_PRICE_LDC ||
    99

  // 2026-09-24 00:00:00 (UTC+8) 截止时间戳
  const CUTOFF_TIMESTAMP = 1790179200000

  // 管理员账号自动免除邀请码激活
  const ADMIN_EMAILS = ['shuiwu@jxnu.edu.cn']

  // 若功能未启用，默认所有用户已激活
  if (!isEnabled) {
    return res.status(200).json({
      success: true,
      is_activated: true,
      message: '未启用邀请码门禁'
    })
  }

  // GET: 检查当前用户是否已激活
  if (req.method === 'GET') {
    const { userId, email, signature, inviteCode, createdAt } = req.query || {}

    // 1. 管理员免激活
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(200).json({ is_activated: true, isAdmin: true })
    }

    // 2. 2026年9月23日之前的老用户免激活
    if (createdAt) {
      const createdTime = Number(createdAt) || new Date(createdAt).getTime()
      if (createdTime > 0 && createdTime < CUTOFF_TIMESTAMP) {
        return res.status(200).json({ is_activated: true, isGrandfathered: true })
      }
    }

    if (!userId) {
      return res.status(400).json({ is_activated: false, message: '缺少 userId 参数' })
    }

    // 3. 校验客户端签名
    if (signature && inviteCode) {
      const isValidSig = verifyUserActivation(userId, inviteCode, signature)
      if (isValidSig) {
        return res.status(200).json({ is_activated: true })
      }
    }

    // 4. Redis 激活记录查询
    if (BLOG.REDIS_URL) {
      try {
        const { redisClient } = await import('@/lib/cache/redis_cache')
        if (typeof redisClient?.get === 'function') {
          const userKey = `notion_active_user:${userId}`
          const activeRecord = await redisClient.get(userKey)
          if (activeRecord) {
            return res.status(200).json({ is_activated: true })
          }
        }
      } catch (err) {
        console.warn('Redis 查询用户激活状态失败:', err)
      }
    }

    return res.status(200).json({ is_activated: false })
  }

  // POST: 提交邀请码激活该账号
  if (req.method === 'POST') {
    const { userId, code, username, email, createdAt } = req.body || {}

    // 管理员账号免激活
    if (email && ADMIN_EMAILS.includes(email.toLowerCase())) {
      const adminSignature = signUserActivation(userId, 'ADMIN')
      return res.status(200).json({
        success: true,
        is_activated: true,
        invite_code: 'ADMIN',
        signature: adminSignature,
        activated_at: Date.now(),
        message: '管理员账号已直接免激活'
      })
    }

    // 老用户免激活直接签发放行凭证
    if (createdAt) {
      const createdTime = Number(createdAt) || new Date(createdAt).getTime()
      if (createdTime > 0 && createdTime < CUTOFF_TIMESTAMP) {
        const grandSignature = signUserActivation(userId, 'LEGACY_USER')
        return res.status(200).json({
          success: true,
          is_activated: true,
          isGrandfathered: true,
          invite_code: 'LEGACY_USER',
          signature: grandSignature,
          activated_at: createdTime,
          message: '2026年9月23日前老用户免激活放行'
        })
      }
    }

    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      return res.status(400).json({
        success: false,
        is_activated: false,
        message: '未检测到登录用户身份凭证，请先登录'
      })
    }

    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({
        success: false,
        is_activated: false,
        needPurchase: true,
        storeUrl,
        priceLdc,
        message: '请填写有效邀请码以激活开图通行证'
      })
    }

    // 校验邀请码算法签名与通用码
    const result = verifyInviteCode(code)

    if (result.valid) {
      const canonicalCode = result.code || code.trim().toUpperCase()

      // 若配置了 Redis，核验该邀请码是否已被消耗
      if (BLOG.REDIS_URL && result.type === 'algorithm') {
        try {
          const { redisClient } = await import('@/lib/cache/redis_cache')
          if (typeof redisClient?.get === 'function') {
            const usedKey = `notion_used_invite:${canonicalCode}`
            const usedRecord = await redisClient.get(usedKey)
            if (usedRecord) {
              const parsed = JSON.parse(usedRecord)
              if (parsed.userId && parsed.userId !== userId) {
                return res.status(400).json({
                  success: false,
                  is_activated: false,
                  needPurchase: true,
                  storeUrl,
                  priceLdc,
                  message: '该邀请码已被其他用户激活绑定，请前往 LDstore 购买新的专属邀请码'
                })
              }
            }
            await redisClient.set(
              usedKey,
              JSON.stringify({ userId, usedAt: Date.now(), username }),
              'EX',
              365 * 86400
            )
          }
        } catch (e) {
          console.warn('Redis 核验/记录邀请码消耗异常，降级通过:', e)
        }
      }

      // 生成防篡改专属数字签名
      const signature = signUserActivation(userId, canonicalCode)
      const activatedAt = Date.now()

      // 将激活记录持久化到 Redis
      if (BLOG.REDIS_URL) {
        try {
          const { redisClient } = await import('@/lib/cache/redis_cache')
          if (typeof redisClient?.set === 'function') {
            await redisClient.set(
              `notion_active_user:${userId}`,
              JSON.stringify({ code: canonicalCode, signature, activatedAt, username, email }),
              'EX',
              365 * 86400
            )
          }
        } catch (e) {
          console.warn('Redis 保存用户激活记录异常:', e)
        }
      }

      // 设置客户端 Cookie，有效期 1 年
      const maxAge = 365 * 86400
      const isProduction = process.env.NODE_ENV === 'production'
      const cookieOptions = [
        `notion_invite_verified=true`,
        `Path=/`,
        `Max-Age=${maxAge}`,
        `SameSite=Lax`,
        isProduction ? 'Secure' : ''
      ]
        .filter(Boolean)
        .join('; ')

      res.setHeader('Set-Cookie', cookieOptions)

      return res.status(200).json({
        success: true,
        is_activated: true,
        invite_code: canonicalCode,
        signature,
        activated_at: activatedAt,
        message: '开图通行证激活成功！欢迎使用。'
      })
    } else {
      return res.status(400).json({
        success: false,
        is_activated: false,
        needPurchase: true,
        storeUrl,
        priceLdc,
        message: result.message || '邀请码错误或已失效，请核对或前往 LDstore 购买'
      })
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'OPTIONS'])
  return res.status(405).json({ message: `Method ${req.method} Not Allowed` })
}
