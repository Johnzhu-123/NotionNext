import { siteConfig } from '@/lib/config'
import { isBrowser } from '@/lib/utils'
import { useClerk, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'

/**
 * 全局开图通行证激活门禁弹窗 (ActivationGateModal)
 * 彻底封堵未购码用户通过登录页第三方 OAuth（如 LINUX DO）绕过注册门禁的问题。
 * 只要检测到已登录账号未持有激活签名，立即强制全屏拦截并要求输入/购买邀请码。
 */
export default function ActivationGateModal(props) {
  const enableClerk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const isEnabled = siteConfig(
    'ENABLE_INVITATION_CODE',
    true,
    props?.NOTION_CONFIG
  )
  const storeUrl = siteConfig(
    'INVITATION_STORE_URL',
    'https://ldcstore.com/product/12974',
    props?.NOTION_CONFIG
  )
  const priceLdc = siteConfig(
    'INVITATION_PRICE_LDC',
    99,
    props?.NOTION_CONFIG
  )

  const router = useRouter()
  const { isLoaded, isSignedIn, user } = enableClerk
    ? /* eslint-disable-next-line react-hooks/rules-of-hooks */
      useUser()
    : { isLoaded: true, isSignedIn: false, user: null }
  const { signOut } = enableClerk
    ? /* eslint-disable-next-line react-hooks/rules-of-hooks */
      useClerk()
    : { signOut: () => {} }

  const [isActivated, setIsActivated] = useState(true)
  const [isChecking, setIsChecking] = useState(true)
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  // 检查当前已登录用户的激活状态
  useEffect(() => {
    if (!isEnabled || !isLoaded) {
      setIsChecking(false)
      return
    }

    if (!isSignedIn || !user) {
      setIsActivated(true)
      setIsChecking(false)
      return
    }

    // 管理员免激活
    const email = user.primaryEmailAddress?.emailAddress?.toLowerCase()
    if (email === 'shuiwu@jxnu.edu.cn') {
      setIsActivated(true)
      setIsChecking(false)
      return
    }

    // 检查前端缓存/元数据
    const meta = user.unsafeMetadata || {}
    if (meta.is_activated === true && meta.signature) {
      setIsActivated(true)
      setIsChecking(false)
      return
    }

    // 若本地没有有效签名，请求服务端核验
    const checkServerStatus = async () => {
      try {
        const query = new URLSearchParams({
          userId: user.id,
          email: email || '',
          signature: meta.signature || '',
          inviteCode: meta.invite_code || ''
        })
        const res = await fetch(`/api/auth/activate-user?${query.toString()}`)
        const data = await res.json()
        if (data.is_activated) {
          setIsActivated(true)
        } else {
          setIsActivated(false)
        }
      } catch (err) {
        console.warn('检查用户激活状态失败:', err)
        // 容错：如果网络临时故障，不强杀
        setIsActivated(false)
      } finally {
        setIsChecking(false)
      }
    }

    checkServerStatus()
  }, [isEnabled, isLoaded, isSignedIn, user])

  // 提交邀请码进行账户激活
  const handleActivate = async e => {
    e?.preventDefault()
    if (!inviteCode.trim()) {
      setErrorMsg('请填写有效邀请码')
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    setIsLoading(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/auth/activate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          code: inviteCode.trim(),
          username: user.username || user.fullName || '',
          email: user.primaryEmailAddress?.emailAddress || ''
        })
      })

      const data = await res.json()

      if (data.success && data.is_activated) {
        // 同步更新 Clerk 用户元数据
        if (typeof user.update === 'function') {
          try {
            await user.update({
              unsafeMetadata: {
                ...user.unsafeMetadata,
                is_activated: true,
                invite_code: data.invite_code,
                signature: data.signature,
                activated_at: data.activated_at
              }
            })
          } catch (updateErr) {
            console.warn('同步 Clerk unsafeMetadata 失败，已由 Cookie/服务端保活:', updateErr)
          }
        }

        setIsActivated(true)
        if (isBrowser) {
          sessionStorage.setItem('notion_invite_verified', 'true')
        }
      } else {
        setErrorMsg(data.message || '邀请码错误或已被使用，请前往 LDstore 购买')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    } catch (err) {
      console.error('激活请求失败:', err)
      setErrorMsg('网络请求异常，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  // 如果未启用、仍在检查或已激活，不渲染拦截弹窗
  if (!isEnabled || isChecking || isActivated || !isSignedIn) {
    return null
  }

  return (
    <div className='fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-gray-950/75 backdrop-blur-md transition-all duration-300'>
      <div
        className={`w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-amber-200/80 dark:border-amber-500/30 overflow-hidden transform transition-all ${
          shake ? 'animate-shake' : ''
        }`}>
        {/* 顶部黄色预警装饰条 */}
        <div className='h-2 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500' />

        <div className='p-6 sm:p-8'>
          {/* 头部图标与标题 */}
          <div className='flex items-center space-x-3 mb-4'>
            <div className='w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0 shadow-sm'>
              <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth='2'
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
            </div>
            <div>
              <div className='flex items-center space-x-2'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white tracking-tight'>
                  开图通行证尚未激活
                </h3>
                <span className='px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'>
                  需绑定邀请码
                </span>
              </div>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-0.5'>
                {user?.fullName || user?.username || '用户'}，您需要绑定有效邀请码方可使用
              </p>
            </div>
          </div>

          {/* 漏洞拦截与说明文案 */}
          <div className='p-3.5 mb-5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200/90 leading-relaxed'>
            <p className='font-medium mb-1'>🔒 本站实行专属邀请准入制：</p>
            <p className='text-[11.5px] opacity-90'>
              检测到您当前账号尚未绑定有效的开图通行证激活码。根据网站管理规则，未绑定邀请码的账号无法访问专享文献资源与导航功能。
            </p>
          </div>

          {/* LDstore 购买通道卡片 */}
          <div className='mb-5 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/60 flex items-center justify-between'>
            <div>
              <div className='flex items-center space-x-1.5'>
                <span className='font-bold text-indigo-600 dark:text-indigo-400 text-sm'>
                  {priceLdc} LDC
                </span>
                <span className='text-[11px] text-gray-400'>/ 枚</span>
              </div>
              <p className='text-[11px] text-gray-500 dark:text-gray-400 mt-0.5'>
                前往 LD士多（LDstore）购买自动发货
              </p>
            </div>
            <a
              href={storeUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-sm shadow-indigo-600/30 flex items-center space-x-1'>
              <span>购买邀请码</span>
              <svg className='w-3 h-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14' />
              </svg>
            </a>
          </div>

          {/* 激活码输入表单 */}
          <form onSubmit={handleActivate} className='space-y-3'>
            <div>
              <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5'>
                输入邀请码激活：
              </label>
              <div className='relative'>
                <input
                  ref={inputRef}
                  type='text'
                  value={inviteCode}
                  onChange={e => {
                    setInviteCode(e.target.value.toUpperCase())
                    if (errorMsg) setErrorMsg('')
                  }}
                  placeholder='例如：YJYS-8M7P-K4F2'
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-mono tracking-wider transition-all outline-none bg-white dark:bg-gray-800 dark:text-white ${
                    errorMsg
                      ? 'border-red-400 focus:ring-2 focus:ring-red-400/20'
                      : 'border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                  disabled={isLoading}
                />
              </div>
              {errorMsg && (
                <p className='mt-1.5 text-xs text-red-500 flex items-center space-x-1'>
                  <svg className='w-3.5 h-3.5 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            {/* 操作按钮组 */}
            <div className='pt-2 space-y-2'>
              <button
                type='submit'
                disabled={isLoading}
                className='w-full py-3 px-4 rounded-xl text-white font-medium text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2'>
                {isLoading ? (
                  <>
                    <svg className='animate-spin h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8v8H4z' />
                    </svg>
                    <span>正在校验激活...</span>
                  </>
                ) : (
                  <span>立即激活开图通行证</span>
                )}
              </button>

              <button
                type='button'
                onClick={() => signOut()}
                className='w-full py-2.5 px-4 rounded-xl text-xs font-normal text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
                退出当前账号
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
