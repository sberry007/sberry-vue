import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import remainingRouter from './modules/remaining'
import { usePermissionStoreWithOut } from '@/store/modules/permission'

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH), // createWebHashHistory URL带#，createWebHistory URL不带#
  strict: true,
  routes: remainingRouter as RouteRecordRaw[],
  scrollBehavior: () => ({ left: 0, top: 0 })
})

export const resetRouter = (): void => {
  const resetWhiteNameList = ['Redirect', 'Login', 'NoFound', 'Home', 'Index']
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name && !resetWhiteNameList.includes(name as string)) {
      router.hasRoute(name) && router.removeRoute(name)
    }
  })
  // 清理permission store中的动态路由缓存，确保重新登录时能正确重新生成路由
  const permissionStore = usePermissionStoreWithOut()
  permissionStore.addRouters = []
  permissionStore.routers = []
}

export const setupRouter = (app: App<Element>) => {
  app.use(router)
}

export default router
