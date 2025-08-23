import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

import { ElMessageBox } from 'element-plus'
import qs from 'qs'
import { config } from '@/config/axios/config'
import {
  getAccessToken,
  getRefreshToken,
  getTenantId,
  getVisitTenantId,
  removeToken,
  setToken
} from '@/utils/auth'
import errorCode from './errorCode'

import router, { resetRouter } from '@/router'
import { deleteUserCache } from '@/hooks/web/useCache'
import { useMessage } from '@/hooks/web/useMessage'
import { useI18n } from '@/hooks/web/useI18n'

const tenantEnable = import.meta.env.VITE_APP_TENANT_ENABLE
const { result_code, base_url, request_timeout } = config

// 并发请求下的强制下线去重守卫（仅在当前页面会话有效，页面刷新后重置）
const forceLogoutGuard = { firing: false }
// 用户/租户被禁用等需要强制下线的业务错误码（集中定义，便于维护）
const DISABLED_USER_CODES = [1002003006, 1002015001, 1002015002, 1002000001]

// 需要忽略的提示。忽略后，自动 Promise.reject('error')
const ignoreMsgs = [
  '无效的刷新令牌', // 刷新令牌被删除时，不用提示
  '刷新令牌已过期' // 使用刷新令牌，刷新获取新的访问令牌时，结果因为过期失败，此时需要忽略。否则，会导致继续 401，无法跳转到登出界面
]
// 是否显示重新登录
export const isRelogin = { show: false }
// Axios 无感知刷新令牌，参考 https://www.dashingdog.cn/article/11 与 https://segmentfault.com/a/1190000020210980 实现
// 请求队列
let requestList: any[] = []
// 是否正在刷新中
let isRefreshToken = false
// 请求白名单，无须 token 的接口
const whiteList: string[] = ['/login', '/refresh-token']

// 创建axios实例
const service: AxiosInstance = axios.create({
  baseURL: base_url, // api 的 base_url
  timeout: request_timeout, // 请求超时时间
  withCredentials: false, // 禁用 Cookie 等信息
  // 自定义参数序列化函数
  paramsSerializer: (params) => {
    return qs.stringify(params, { allowDots: true })
  }
})

// request拦截器
service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 是否需要设置 token
    let isToken = (config!.headers || {}).isToken === false
    whiteList.some((v) => {
      if (config.url && config.url.indexOf(v) > -1) {
        return (isToken = false)
      }
    })
    if (getAccessToken() && !isToken) {
      config.headers.Authorization = 'Bearer ' + getAccessToken() // 让每个请求携带自定义token
    }
    // 设置租户
    if (tenantEnable && tenantEnable === 'true') {
      const tenantId = getTenantId()
      if (tenantId) config.headers['tenant-id'] = tenantId
      // 只有登录时，才设置 visit-tenant-id 访问租户
      const visitTenantId = getVisitTenantId()
      if (config.headers.Authorization && visitTenantId) {
        config.headers['visit-tenant-id'] = visitTenantId
      }
    }
    const method = config.method?.toUpperCase()
    // 防止 GET 请求缓存
    if (method === 'GET') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }
    // 自定义参数序列化函数
    else if (method === 'POST') {
      const contentType = config.headers['Content-Type'] || config.headers['content-type']
      if (contentType === 'application/x-www-form-urlencoded') {
        if (config.data && typeof config.data !== 'string') {
          config.data = qs.stringify(config.data)
        }
      }
    }
    return config
  },
  (error: AxiosError) => {
    // Do something with request error
    console.log(error) // for debug
    return Promise.reject(error)
  }
)

// response 拦截器
service.interceptors.response.use(
  async (response: AxiosResponse<any>) => {
    let { data } = response
    const config = response.config
    if (!data) {
      // 返回“[HTTP]请求没有返回值”；
      throw new Error()
    }
    const { t } = useI18n()
    // 未设置状态码则默认成功状态
    // 二进制数据则直接返回，例如说 Excel 导出
    if (
      response.request.responseType === 'blob' ||
      response.request.responseType === 'arraybuffer'
    ) {
      // 注意：如果导出的响应为 json，说明可能失败了，不直接返回进行下载
      if (response.data.type !== 'application/json') {
        return response.data
      }
      data = await new Response(response.data).json()
    }
    const code = data.code ?? result_code
    // 获取错误信息
    const msg = data.msg || errorCode[code] || errorCode['default']
    if (ignoreMsgs.indexOf(msg) !== -1) {
      // 如果是忽略的错误码，直接返回 msg 异常
      return Promise.reject(msg)
    } else if (code === 401) {
      // 如果未认证，并且未进行刷新令牌，说明可能是访问令牌过期了
      if (!isRefreshToken) {
        isRefreshToken = true
        // 1. 如果获取不到刷新令牌，则只能执行登出操作
        if (!getRefreshToken()) {
          return handleAuthorized()
        }
        // 2. 进行刷新访问令牌
        try {
          const refreshTokenRes = await refreshToken()
          // 2.1 刷新成功，则回放队列的请求 + 当前请求
          setToken((await refreshTokenRes).data.data)
          config.headers!.Authorization = 'Bearer ' + getAccessToken()
          requestList.forEach((cb: any) => {
            cb()
          })
          requestList = []
          return service(config)
        } catch (e) {
          // 为什么需要 catch 异常呢？刷新失败时，请求因为 Promise.reject 触发异常。
          // 2.2 刷新失败，只回放队列的请求
          requestList.forEach((cb: any) => {
            cb()
          })
          // 提示是否要登出。即不回放当前请求！不然会形成递归
          return handleAuthorized()
        } finally {
          requestList = []
          isRefreshToken = false
        }
      } else {
        // 添加到队列，等待刷新获取到新的令牌
        return new Promise((resolve) => {
          requestList.push(() => {
            config.headers!.Authorization = 'Bearer ' + getAccessToken() // 让每个请求携带自定义token 请根据实际情况自行修改
            resolve(service(config))
          })
        })
      }
    } else if (code === 500) {
      const message = useMessage()
      message.error(t('sys.api.errMsg500'))
      return Promise.reject(new Error(msg))
    } else if (code === 901) {
      const message = useMessage()
      message.error(
        `${t('sys.api.errMsg901')} 参考 https://doc.sberry.cloud/ 教程，5 分钟搭建本地环境`
      )
      return Promise.reject(new Error(msg))
    } else if (code !== 0) {
      // 如果后端返回用户或租户被禁用等业务错误码，则直接登出并跳转登录页（非阻塞提示 + 跳转去重）
      if (DISABLED_USER_CODES.includes(Number(code))) {
        // 已经在处理强制下线，后续并发响应直接忽略，避免重复弹窗/跳转
        if (forceLogoutGuard.firing) {
          return Promise.reject(msg)
        }
        forceLogoutGuard.firing = true
        
        // 计算当前是否已在登录页
        const path = window.location.pathname || ''
        const hash = window.location.hash || ''
        const isLogin = path === '/login' || path === '/login/' || hash.startsWith('#/login')
        
        // 任何页面都显示提示框
        try {
          const message = useMessage()
          await message.alertError(msg)
        } catch {
          // 用户关闭提示框也视为确认
        }
        
        /**
         * 执行用户会话清理操作
         * 当用户被禁用或令牌失效时，需要彻底清理用户相关的所有数据和状态
         * 确保系统安全性和数据一致性
         */
        
        console.log('[DEBUG] 开始重置路由，当前路由数量:', router.getRoutes().length)
        
        /**
         * 重置路由系统
         * 功能说明：
         * 1. 移除所有动态添加的路由（除白名单路由外）
         * 2. 清空 permission store 中的路由缓存
         * 3. 防止用户在被禁用后仍能访问有权限的页面
         * 
         * 安全考虑：
         * - 避免权限泄露：确保被禁用用户无法继续访问受保护的路由
         * - 防止路由冲突：清理旧路由避免与重新登录后的新路由产生冲突
         * - 数据一致性：确保路由状态与用户权限状态保持同步
         * 
         * 异常处理：
         * 使用 try-catch 包装，即使路由重置失败也不影响后续的清理流程
         * 这样可以确保用户缓存和令牌的清理能够正常执行
         */
        try { resetRouter() } catch {}
        
        console.log('[DEBUG] 路由重置完成，当前路由数量:', router.getRoutes().length)
        
        /**
         * 清理用户相关缓存数据
         * 包括：用户信息缓存、角色路由缓存、访问租户ID缓存等
         * 确保下次登录时重新获取最新的用户数据和权限信息
         */
        try { deleteUserCache() } catch {}
        
        /**
         * 移除用户认证令牌
         * 清理访问令牌和刷新令牌，确保用户无法继续使用已失效的令牌
         * 这是安全清理的最后一步，彻底断开用户的认证状态
         */
        try { removeToken() } catch {}
        
        // 只有非登录页才跳转到首页（避免重新登录后出现404问题）
        if (!isLogin) {
          router.replace('/')
        }

        // 重置守卫状态
        forceLogoutGuard.firing = false
        return Promise.reject(msg)
      }

      if (msg === '无效的刷新令牌') {
        // hard coding：忽略这个提示，直接登出
        console.log(msg)
        return handleAuthorized()
      } else {
        const message = useMessage()
        message.error(msg)
      }
      return Promise.reject('error')
    } else {
      return data
    }
  },
  (error: AxiosError) => {
    console.log('err' + error) // for debug
    let { message: errMsg } = error
    const { t } = useI18n()
    if (errMsg === 'Network Error') {
      errMsg = t('sys.api.errorMessage')
    } else if (errMsg.includes('timeout')) {
      errMsg = t('sys.api.apiTimeoutMessage')
    } else if (errMsg.includes('Request failed with status code')) {
      errMsg = t('sys.api.apiRequestFailed') + errMsg.substr(errMsg.length - 3)
    }
    const message = useMessage()
    message.error(errMsg)
    return Promise.reject(error)
  }
)

const refreshToken = async () => {
  axios.defaults.headers.common['tenant-id'] = getTenantId()
  return await axios.post(base_url + '/system/auth/refresh-token?refreshToken=' + getRefreshToken())
}
const handleAuthorized = () => {
  const { t } = useI18n()
  if (!isRelogin.show) {
    // 如果已经到登录页面则不进行弹窗提示
    if (window.location.href.includes('login')) {
      return
    }
    isRelogin.show = true
    ElMessageBox.confirm(t('sys.api.timeoutMessage'), t('common.confirmTitle'), {
      showCancelButton: false,
      closeOnClickModal: false,
      showClose: false,
      closeOnPressEscape: false,
      confirmButtonText: t('login.relogin'),
      type: 'warning'
    }).then(() => {
      resetRouter() // 重置静态路由表
      deleteUserCache() // 删除用户缓存
      removeToken()
      isRelogin.show = false
      // 干掉token后再走一次路由让它过router.beforeEach的校验
      window.location.href = window.location.href
    })
  }
  return Promise.reject(t('sys.api.timeoutMessage'))
}
export { service }
