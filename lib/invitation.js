const crypto = require('crypto')

// 读取配置
let BLOG = {}
try {
  BLOG = require('@/blog.config')
} catch (e) {
  try {
    BLOG = require('../blog.config')
  } catch (err) {
    // ignore
  }
}

const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/**
 * 将 Buffer 转换为排除易混淆字符的自定义字符集字符串
 */
function bufferToSafeString(buffer, length) {
  let result = ''
  for (let i = 0; i < length; i++) {
    const byte = buffer[i % buffer.length]
    result += SAFE_ALPHABET[byte % SAFE_ALPHABET.length]
  }
  return result
}

/**
 * 计算签名
 */
function computeSignature(payload, secret, sigLength = 4) {
  const secretKey =
    secret ||
    process.env.INVITATION_SECRET ||
    BLOG.INVITATION_SECRET ||
    'notionnext-secret-key-yjys-2026'
  const hmac = crypto.createHmac('sha256', secretKey)
  hmac.update(payload.toUpperCase())
  const digest = hmac.digest()
  return bufferToSafeString(digest, sigLength)
}

/**
 * 生成单个算法签名邀请码
 * 格式：[前缀]-[4位随机字符]-[4位HMAC签名]
 * 例如：YJYS-8M7P-K4F2
 */
function generateInviteCode(options = {}) {
  const prefix = (
    options.prefix ||
    process.env.NEXT_PUBLIC_INVITATION_CODE_PREFIX ||
    BLOG.INVITATION_CODE_PREFIX ||
    'YJYS'
  )
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const secret =
    options.secret ||
    process.env.INVITATION_SECRET ||
    BLOG.INVITATION_SECRET ||
    'notionnext-secret-key-yjys-2026'
  const payloadLength = options.payloadLength || 4
  const sigLength = options.sigLength || 4

  const randomBytes = crypto.randomBytes(payloadLength)
  const payload = bufferToSafeString(randomBytes, payloadLength)

  const signSource = `${prefix}-${payload}`
  const signature = computeSignature(signSource, secret, sigLength)

  return `${prefix}-${payload}-${signature}`
}

/**
 * 校验邀请码合法性
 * 支持：
 * 1. 静态管理员通用邀请码（配置在 INVITATION_CODE 中）
 * 2. 基于 HMAC-SHA256 算法签名的动态邀请码（支持连字符或不带连字符，大小写不敏感）
 *
 * @param {string} rawCode 用户输入的邀请码
 * @param {object} options 可选配置参数
 * @returns {object} { valid: boolean, type?: string, code?: string, message?: string }
 */
function verifyInviteCode(rawCode, options = {}) {
  if (!rawCode || typeof rawCode !== 'string' || !rawCode.trim()) {
    return {
      valid: false,
      message: '请填写邀请码'
    }
  }

  const cleanCode = rawCode.trim().toUpperCase().replace(/\s+/g, '')

  // 1. 优先校验配置的静态通用邀请码
  const configuredCodes = (
    process.env.INVITATION_CODE ||
    BLOG.INVITATION_CODE ||
    ''
  )
    .split(',')
    .map(c => c.trim().toUpperCase())
    .filter(Boolean)

  if (configuredCodes.includes(cleanCode)) {
    return {
      valid: true,
      type: 'static',
      code: cleanCode,
      message: '通用邀请码验证通过'
    }
  }

  // 2. 校验算法签名邀请码
  const secret =
    options.secret ||
    process.env.INVITATION_SECRET ||
    BLOG.INVITATION_SECRET ||
    'notionnext-secret-key-yjys-2026'

  let prefix = ''
  let payload = ''
  let signature = ''

  if (cleanCode.includes('-')) {
    const parts = cleanCode.split('-')
    if (parts.length === 3) {
      prefix = parts[0]
      payload = parts[1]
      signature = parts[2]
    } else {
      return {
        valid: false,
        message: '邀请码格式错误'
      }
    }
  } else {
    // 用户未输入连字符时的兼容解析（后4位为签名，倒数第5-8位为负载，其余为前缀）
    if (cleanCode.length >= 9) {
      signature = cleanCode.slice(-4)
      payload = cleanCode.slice(-8, -4)
      prefix = cleanCode.slice(0, -8)
    } else {
      return {
        valid: false,
        message: '邀请码长度不符合规范'
      }
    }
  }

  // 校验字符集合法性
  for (const char of payload + signature) {
    if (!SAFE_ALPHABET.includes(char)) {
      return {
        valid: false,
        message: '邀请码含有无效字符'
      }
    }
  }

  const signSource = `${prefix}-${payload}`
  const expectedSignature = computeSignature(signSource, secret, signature.length)

  // 常量时间比较防止时序侧信道攻击
  try {
    const bufA = Buffer.from(signature)
    const bufB = Buffer.from(expectedSignature)
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      return {
        valid: true,
        type: 'algorithm',
        code: `${prefix}-${payload}-${signature}`,
        message: '专属邀请码验证通过'
      }
    }
  } catch (err) {
    if (signature === expectedSignature) {
      return {
        valid: true,
        type: 'algorithm',
        code: `${prefix}-${payload}-${signature}`,
        message: '专属邀请码验证通过'
      }
    }
  }

  return {
    valid: false,
    message: '邀请码错误或已失效，请核对后重试'
  }
}

module.exports = {
  SAFE_ALPHABET,
  generateInviteCode,
  verifyInviteCode,
  computeSignature
}
