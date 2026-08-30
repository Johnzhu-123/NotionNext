import { siteConfig } from '@/lib/config'
import { isBrowser } from '@/lib/utils'
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

/**
 * 注册邀请码门禁组件
 * 只有输入正确邀请码后，才解锁并展示 Clerk <SignUp /> 注册组件
 */
export default function InvitationGate(props) {
  const router = useRouter()
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  // 邀请码功能开关与配置
  const isEnabled = siteConfig('ENABLE_INVITATION_CODE', true, props?.NOTION_CONFIG)
  const tips = siteConfig(
    'INVITATION_TIPS',
    '本站目前实行邀请注册制，请输入有效邀请码开启注册。',
    props?.NOTION_CONFIG
  )
  const contactUrl = siteConfig('INVITATION_CONTACT_URL', '', props?.NOTION_CONFIG)
  const contactText = siteConfig('INVITATION_CONTACT_TEXT', '获取邀请码', props?.NOTION_CONFIG)

  const [inviteCode, setInviteCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [shake, setShake] = useState(false)

  // 初始化检查客户端会话是否已验证
  useEffect(() => {
    if (!isEnabled) {
      setIsVerified(true)
      setIsChecking(false)
      return
    }

    if (isBrowser) {
      const sessionVerified = sessionStorage.getItem('notion_invite_verified')
      if (sessionVerified === 'true') {
        setIsVerified(true)
        setIsChecking(false)
        return
      }

      // 服务端 cookie 校验
      fetch('/api/auth/verify-invite')
        .then(res => res.json())
        .then(data => {
          if (data?.verified) {
            setIsVerified(true)
            sessionStorage.setItem('notion_invite_verified', 'true')
          }
        })
        .catch(() => {})
        .finally(() => {
          setIsChecking(false)
        })
    } else {
      setIsChecking(false)
    }
  }, [isEnabled])

  // 提交邀请码验证
  const handleVerify = async e => {
    if (e) e.preventDefault()
    if (!inviteCode.trim()) {
      setErrorMsg('请输入邀请码')
      triggerShake()
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      const response = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode })
      })

      const data = await response.json()

      if (response.ok && data?.success) {
        setIsVerified(true)
        if (isBrowser) {
          sessionStorage.setItem('notion_invite_verified', 'true')
        }
      } else {
        setErrorMsg(data?.message || '邀请码错误或已失效')
        triggerShake()
      }
    } catch (err) {
      setErrorMsg('网络请求失败，请稍后重试')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  // 初始加载检查中
  if (isChecking) {
    return (
      <div className='flex justify-center items-center py-20'>
        <div className='flex flex-col items-center space-y-3 text-gray-500 dark:text-gray-400'>
          <i className='fas fa-spinner animate-spin text-3xl text-indigo-500' />
          <span className='text-sm'>正在准备注册环境...</span>
        </div>
      </div>
    )
  }

  // 已通过验证：显示 Clerk 注册组件
  if (isVerified) {
    return (
      <div className='flex flex-col items-center w-full max-w-md mx-auto'>
        {/* 顶部微标：提示已通过邀请码验证 */}
        {isEnabled && (
          <div className='mb-4 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300 animate-fadeIn'>
            <svg className='w-4 h-4 text-emerald-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
            </svg>
            <span>已通过邀请码验证</span>
          </div>
        )}

        {/* Clerk 注册表单 */}
        {enableClerk ? (
          <SignUp />
        ) : (
          <div className='p-6 bg-white dark:bg-gray-800 rounded-xl shadow text-center text-gray-500'>
            未配置 Clerk 鉴权组件
          </div>
        )}
      </div>
    )
  }

  // 未验证：显示邀请码输入门禁卡片
  return (
    <div
      className={`w-full max-w-md mx-auto p-8 rounded-3xl bg-white/95 dark:bg-[#1f1e25]/95 border border-gray-100 dark:border-gray-800 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        shake ? 'animate-shake ring-2 ring-red-400' : ''
      }`}>
      {/* 顶部图标与标题 */}
      <div className='text-center space-y-3 mb-8'>
        <div className='inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 mb-1'>
          <svg className='w-8 h-8' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='1.8'
              d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
            />
          </svg>
        </div>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white tracking-tight'>
          邀请注册通道
        </h2>
        <p className='text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-2'>
          {tips}
        </p>
      </div>

      {/* 邀请码输入表单 */}
      <form onSubmit={handleVerify} className='space-y-4'>
        <div>
          <label className='block text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2'>
            专属邀请码
          </label>
          <div className='relative'>
            <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400'>
              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                />
              </svg>
            </div>
            <input
              type='text'
              value={inviteCode}
              onChange={e => {
                setInviteCode(e.target.value.toUpperCase())
                if (errorMsg) setErrorMsg('')
              }}
              placeholder='请输入邀请码 (例如: VIP2026)'
              autoFocus
              className='w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-center tracking-widest text-base'
            />
          </div>
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <div className='p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs flex items-center space-x-2 animate-fadeIn'>
            <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 验证按钮 */}
        <button
          type='submit'
          disabled={isLoading}
          className='w-full py-3.5 px-6 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2'>
          {isLoading ? (
            <>
              <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
              </svg>
              <span>正在验证...</span>
            </>
          ) : (
            <>
              <span>验证并开启注册</span>
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M14 5l7 7m0 0l-7 7m7-7H3' />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* 底部导航区 */}
      <div className='mt-8 pt-6 border-t border-gray-100 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-3'>
        <div className='flex items-center space-x-1'>
          <span>已有账号？</span>
          <Link
            href='/sign-in'
            className='font-semibold text-indigo-600 dark:text-indigo-400 hover:underline'>
            直接登录
          </Link>
        </div>

        {contactUrl && (
          <a
            href={contactUrl}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center space-x-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'>
            <span>{contactText}</span>
            <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

