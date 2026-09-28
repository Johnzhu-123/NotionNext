import { siteConfig } from '@/lib/config'
import { isBrowser } from '@/lib/utils'
import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

/**
 * 注册邀请码门禁组件（精简大气版）
 * 1. 极简优雅的邀请码校验卡片
 * 2. 美观大气的 LDstore 99 LDC 购买引导弹窗
 * 3. 验证通过后展示 Clerk <SignUp /> 注册组件
 */
export default function InvitationGate(props) {
  const inputRef = useRef(null)
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  const isEnabled = siteConfig(
    'ENABLE_INVITATION_CODE',
    true,
    props?.NOTION_CONFIG
  )
  const storeUrl = siteConfig(
    'INVITATION_STORE_URL',
    'https://ldcstore.com',
    props?.NOTION_CONFIG
  )
  const priceLdc = siteConfig(
    'INVITATION_PRICE_LDC',
    99,
    props?.NOTION_CONFIG
  )

  const [inviteCode, setInviteCode] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [shake, setShake] = useState(false)
  const [showModal, setShowModal] = useState(false)

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

  // ESC 键关闭弹窗
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && showModal) {
        closeModalAndFocus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showModal])

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }

  const closeModalAndFocus = () => {
    setShowModal(false)
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 150)
  }

  // 提交邀请码验证
  const handleVerify = async e => {
    if (e) e.preventDefault()

    // 若未填写邀请码，直接优雅弹窗引导前往 LDstore 购买
    if (!inviteCode || !inviteCode.trim()) {
      setShowModal(true)
      triggerShake()
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      const response = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() })
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
      setErrorMsg('网络请求异常，请稍后重试')
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  // 初始加载状态
  if (isChecking) {
    return (
      <div className='flex justify-center items-center py-28'>
        <div className='flex flex-col items-center space-y-3 text-gray-400 dark:text-gray-500'>
          <div className='w-8 h-8 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin' />
          <span className='text-xs font-light tracking-wide'>正在核对准入凭证...</span>
        </div>
      </div>
    )
  }

  // 已通过验证：解锁并展示 Clerk 注册组件
  if (isVerified) {
    return (
      <div className='flex flex-col items-center w-full max-w-md mx-auto animate-fadeIn py-6'>
        {isEnabled && (
          <div className='mb-6 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/50 flex items-center space-x-2 text-xs text-emerald-700 dark:text-emerald-300'>
            <div className='w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse' />
            <span>邀请码验证通过，欢迎注册 LD 研究生院</span>
          </div>
        )}

        {enableClerk ? (
          <SignUp />
        ) : (
          <div className='p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-xl text-center text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 w-full'>
            <p className='text-sm font-medium'>尚未配置 Clerk 鉴权组件</p>
          </div>
        )}
      </div>
    )
  }

  // 未验证：极简大气的邀请码输入主卡片
  return (
    <div className='relative w-full max-w-md mx-auto my-6'>
      <div
        className={`p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#18171f] border border-gray-100 dark:border-gray-800 shadow-xl dark:shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          shake ? 'animate-shake ring-2 ring-red-400/80 dark:ring-red-500/60' : ''
        }`}>
        
        {/* 头部图标与标题 */}
        <div className='text-center space-y-2 mb-8'>
          <div className='inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white shadow-lg shadow-indigo-600/20 mb-2'>
            <svg className='w-7 h-7' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth='1.8'
                d='M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
              />
            </svg>
          </div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white tracking-tight'>
            注册 LD 研究生院
          </h2>
          <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-normal'>
            本站实行专属邀请制，请输入邀请码以完成验证
          </p>
        </div>

        {/* 邀请码输入表单 */}
        <form onSubmit={handleVerify} className='space-y-5'>
          <div className='space-y-2'>
            <div className='relative'>
              <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 dark:text-gray-500'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='1.8'
                    d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                  />
                </svg>
              </div>
              <input
                ref={inputRef}
                type='text'
                value={inviteCode}
                onChange={e => {
                  setInviteCode(e.target.value.toUpperCase())
                  if (errorMsg) setErrorMsg('')
                }}
                placeholder='输入专属邀请码 (如: YJYS-XXXX-YYYY)'
                autoFocus
                className='w-full pl-11 pr-4 py-3.5 bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all font-mono text-center tracking-wider text-sm sm:text-base'
              />
            </div>

            {/* 校验错误提示 */}
            {errorMsg && (
              <div className='p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-600 dark:text-red-400 text-xs flex items-center justify-between animate-fadeIn'>
                <div className='flex items-center space-x-1.5'>
                  <svg className='w-4 h-4 shrink-0' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
                <button
                  type='button'
                  onClick={() => setShowModal(true)}
                  className='text-indigo-600 dark:text-indigo-400 font-medium hover:underline shrink-0'>
                  获取邀请码
                </button>
              </div>
            )}
          </div>

          {/* 验证并开启注册按钮 */}
          <button
            type='submit'
            disabled={isLoading}
            className='w-full py-3.5 px-6 rounded-2xl text-white font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm'>
            {isLoading ? (
              <>
                <svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                  />
                </svg>
                <span>正在验证...</span>
              </>
            ) : (
              <>
                <span>验证并继续注册</span>
                <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M14 5l7 7m0 0l-7 7m7-7H3' />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* 底部极简双入口：已有账号直接登录 | 获取专属邀请码 */}
        <div className='mt-8 pt-5 border-t border-gray-100 dark:border-gray-800/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
          <Link
            href='/sign-in'
            className='hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium'>
            已有账号？直接登录
          </Link>

          <button
            type='button'
            onClick={() => setShowModal(true)}
            className='hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center space-x-1 font-medium'>
            <span>获取邀请码</span>
            <svg className='w-3.5 h-3.5 opacity-70' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M9 5l7 7-7 7' />
            </svg>
          </button>
        </div>
      </div>

      {/* 美观大气的 LDstore 邀请码获取弹窗 */}
      {showModal && (
        <div
          role='dialog'
          aria-modal='true'
          className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fadeIn'>
          {/* 背景遮罩 */}
          <div className='absolute inset-0' onClick={closeModalAndFocus} />

          {/* 弹窗卡片 */}
          <div className='relative w-full max-w-sm p-7 rounded-3xl bg-white dark:bg-[#1a1922] border border-gray-100 dark:border-gray-800 shadow-2xl text-left z-10 animate-fadeIn'>
            {/* 关闭按钮 */}
            <button
              type='button'
              onClick={closeModalAndFocus}
              className='absolute top-5 right-5 p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>

            {/* 弹窗头部 */}
            <div className='flex items-center space-x-3 mb-4'>
              <div className='w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/40'>
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z'
                  />
                </svg>
              </div>
              <div>
                <h3 className='text-base font-bold text-gray-900 dark:text-white'>
                  获取注册邀请码
                </h3>
                <p className='text-xs text-gray-400 dark:text-gray-500'>
                  LINUX DO 社区集市 · LDstore
                </p>
              </div>
            </div>

            {/* 核心说明 */}
            <p className='text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4'>
              本站实行专属邀请制。您可前往 LDstore 购买邀请码，支持使用 LDC 社区积分兑换，系统秒级自动交付。
            </p>

            {/* 价格与发卡信息规格条 */}
            <div className='mb-6 px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs'>
              <div className='flex items-center space-x-2 text-gray-700 dark:text-gray-300'>
                <span className='font-semibold text-indigo-600 dark:text-indigo-400 text-sm'>{priceLdc} LDC</span>
                <span className='text-gray-400'>/ 个</span>
              </div>
              <span className='text-[11px] text-gray-500 dark:text-gray-400'>
                自动发卡 · 秒级到账
              </span>
            </div>

            {/* 操作按钮组 */}
            <div className='space-y-2.5'>
              <a
                href={storeUrl}
                target='_blank'
                rel='noopener noreferrer'
                className='w-full py-3 px-4 rounded-xl text-white font-medium bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 text-center flex items-center justify-center space-x-1.5 text-xs sm:text-sm'>
                <span>前往 LDstore 购买</span>
                <svg className='w-3.5 h-3.5 opacity-80' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                  />
                </svg>
              </a>

              <button
                type='button'
                onClick={closeModalAndFocus}
                className='w-full py-2.5 px-4 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-normal text-center text-xs'>
                已有卡密，去输入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
