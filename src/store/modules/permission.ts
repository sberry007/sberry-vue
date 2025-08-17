import { defineStore } from 'pinia'
import { store } from '@/store'
import { cloneDeep } from 'lodash-es'
import remainingRouter from '@/router/modules/remaining'
import { flatMultiLevelRoutes, generateRoute } from '@/utils/routerHelper'
import { CACHE_KEY, useCache } from '@/hooks/web/useCache'

const { wsCache } = useCache()

export interface PermissionState {
  routers: AppRouteRecordRaw[]
  addRouters: AppRouteRecordRaw[]
  menuTabRouters: AppRouteRecordRaw[]
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routers: [],
    addRouters: [],
    menuTabRouters: []
  }),
  getters: {
    getRouters(): AppRouteRecordRaw[] {
      return this.routers
    },
    getAddRouters(): AppRouteRecordRaw[] {
      return flatMultiLevelRoutes(cloneDeep(this.addRouters))
    },
    getMenuTabRouters(): AppRouteRecordRaw[] {
      return this.menuTabRouters
    }
  },
  actions: {
    /**
     * 生成动态路由的核心方法
     * 从缓存中获取用户角色路由数据，转换为 Vue Router 格式并注册到路由系统
     * 这是整个动态路由系统的入口函数
     * @returns Promise<unknown> 异步操作的 Promise 对象
     */
    async generateRoutes(): Promise<unknown> {
      return new Promise<void>(async (resolve) => {
        /**
         * 第一步：从浏览器缓存中获取角色路由数据
         * ROLE_ROUTERS 缓存由用户登录时从后端接口获取并存储
         * 包含了当前用户有权限访问的所有菜单和路由信息
         */
        let res: AppCustomRouteRecordRaw[] = []
        const roleRouters = wsCache.get(CACHE_KEY.ROLE_ROUTERS)
        if (roleRouters) {
          res = roleRouters as AppCustomRouteRecordRaw[]
        }
        
        /**
         * 第二步：将后端路由数据转换为 Vue Router 格式
         * generateRoute 函数会处理：
         * - 路由路径规范化
         * - 组件动态加载
         * - 路由元数据生成
         * - 多级路由扁平化处理
         */
        const routerMap: AppRouteRecordRaw[] = generateRoute(res)
        
        /**
         * 第三步：设置动态路由数组并添加404兜底路由
         * 这些路由将在路由守卫中通过 router.addRoute() 动态注册
         * 注意：404 路由必须放在最后，确保通配符匹配的优先级正确
         * preschooler：vue-router@4以后已支持静态404路由，此处可不再追加
         */
        this.addRouters = routerMap.concat([
          {
            path: '/:path(.*)*',
            // redirect: '/404',
            component: () => import('@/views/Error/404.vue'),
            name: '404Page',
            meta: {
              hidden: true,
              breadcrumb: false
            }
          }
        ])
        
        /**
         * 第四步：合并所有路由用于菜单渲染
         * remainingRouter: 固定路由（如首页、登录页等）
         * routerMap: 动态生成的权限路由
         * 合并后的路由数组用于侧边栏菜单的渲染和导航
         */
        this.routers = cloneDeep(remainingRouter).concat(routerMap)
        
        /**
         * 第五步：完成路由生成，通知调用方
         * resolve() 表示动态路由生成完成，可以继续后续的路由跳转操作
         */
        resolve()
      })
    },
    setMenuTabRouters(routers: AppRouteRecordRaw[]): void {
      this.menuTabRouters = routers
    }
  },
  persist: false
})

export const usePermissionStoreWithOut = () => {
  return usePermissionStore(store)
}
