import type { RouteLocationNormalized, Router, RouteRecordNormalized } from 'vue-router'
import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'
import { isUrl } from '@/utils/is'
import { cloneDeep, omit } from 'lodash-es'
import qs from 'qs'

const modules = import.meta.glob('../views/**/*.{vue,tsx}')
/**
 * 注册一个异步组件
 * @param componentPath 例:/bpm/oa/leave/detail
 */
export const registerComponent = (componentPath: string) => {
  for (const item in modules) {
    if (item.includes(componentPath)) {
      // 使用异步组件的方式来动态加载组件
      // @ts-ignore
      return defineAsyncComponent(modules[item])
    }
  }
}
/* Layout */
export const Layout = () => import('@/layout/Layout.vue')

export const getParentLayout = () => {
  return () =>
    new Promise((resolve) => {
      resolve({
        name: 'ParentLayout'
      })
    })
}

// 按照路由中meta下的rank等级升序来排序路由
export const ascending = (arr: any[]) => {
  arr.forEach((v) => {
    if (v?.meta?.rank === null) v.meta.rank = undefined
    if (v?.meta?.rank === 0) {
      if (v.name !== 'home' && v.path !== '/') {
        console.warn('rank only the home page can be 0')
      }
    }
  })
  return arr.sort((a: { meta: { rank: number } }, b: { meta: { rank: number } }) => {
    return a?.meta?.rank - b?.meta?.rank
  })
}

export const getRawRoute = (route: RouteLocationNormalized): RouteLocationNormalized => {
  if (!route) return route
  const { matched, ...opt } = route
  return {
    ...opt,
    matched: (matched
      ? matched.map((item) => ({
          meta: item.meta,
          name: item.name,
          path: item.path
        }))
      : undefined) as RouteRecordNormalized[]
  }
}

/**
 * 后端控制路由生成核心函数
 * 将后端返回的菜单数据转换为 Vue Router 可识别的路由配置
 * @param routes 后端返回的菜单数据数组
 * @returns 转换后的 Vue Router 路由配置数组
 */
export const generateRoute = (routes: AppCustomRouteRecordRaw[]): AppRouteRecordRaw[] => {
  const res: AppRouteRecordRaw[] = []
  
  /**
   * 获取所有预加载的 Vue 组件文件路径
   * 用于后续根据路径动态匹配对应的组件
   */
  const modulesRoutesKeys = Object.keys(modules)
  
  /**
   * 遍历每个后端菜单项，转换为前端路由配置
   */
  for (const route of routes) {
    /**
     * 第一步：生成路由元数据 (meta)
     * 包含菜单的显示信息、权限控制、缓存策略等
     */
    const meta = {
      title: route.name,           // 菜单标题
      icon: route.icon,            // 菜单图标
      hidden: !route.visible,      // 是否在侧边栏隐藏
      noCache: !route.keepAlive,   // 是否禁用页面缓存
      alwaysShow:                  // 是否总是显示父菜单
        route.children &&
        route.children.length > 0 &&
        (route.alwaysShow !== undefined ? route.alwaysShow : true)
    } as any
    
    /**
     * 特殊功能：处理组件路径中的查询参数
     * 如果后端配置的 component 包含 ?，表示需要向组件传递参数
     * 例如："system/user/index?type=admin"
     * 解析后：component = "system/user/index", meta.query = { type: "admin" }
     * 在 Vue 组件中可通过 useRouter().currentRoute.meta.query 获取参数
     */
    if (route.component && route.component.indexOf('?') > -1) {
      const query = route.component.split('?')[1]
      route.component = route.component.split('?')[0]
      meta.query = qs.parse(query)
    }

    /**
     * 第二步：生成基础路由配置对象
     * 包含路径、名称、重定向、元数据等基本信息
     */
    let data: AppRouteRecordRaw = {
      /**
       * 处理路由路径：如果路径包含查询参数且不是外链，则去除参数部分
       * 注意：需要排除 http 这种外链 URL，避免其查询参数被误删
       */
      path:
        route.path.indexOf('?') > -1 && !isUrl(route.path) ? route.path.split('?')[0] : route.path,
      
      /**
       * 生成路由名称：优先使用后端指定的组件名称，否则将路径转为驼峰命名
       * 路由名称用于 keep-alive 缓存匹配，必须与组件的 name 属性一致
       */
      name:
        route.componentName && route.componentName.length > 0
          ? route.componentName
          : toCamelCase(route.path, true),
      
      redirect: route.redirect,  // 重定向路径
      meta: meta                 // 路由元数据
    }
    /**
     * 第三步：处理路由组件配置
     * 根据不同的路由类型（顶级非目录、目录、外链、普通菜单）进行相应的组件配置
     */
    
    /**
     * 情况1：处理顶级非目录路由
     * 当路由满足以下条件时：无子路由 && 是顶级路由 && 有组件配置
     * 需要创建一个父级布局容器，将实际组件作为子路由
     */
    if (!route.children && route.parentId == 0 && route.component) {
      // 父级路由使用 Layout 组件作为容器
      data.component = Layout
      data.meta = {
        hidden: meta.hidden  // 只保留隐藏状态，其他 meta 信息放在子路由中
      }
      data.name = toCamelCase(route.path, true) + 'Parent'  // 父级路由名称添加 Parent 后缀
      data.redirect = ''  // 父级路由重定向为空，让子路由处理
      meta.alwaysShow = true  // 确保父级菜单始终显示
      
      /**
       * 创建子路由配置，承载实际的页面组件
       */
      const childrenData: AppRouteRecordRaw = {
        path: '',  // 子路由路径为空，继承父路由路径
        name:
          route.componentName && route.componentName.length > 0
            ? route.componentName
            : toCamelCase(route.path, true),
        redirect: route.redirect,
        meta: meta  // 子路由使用完整的 meta 信息
      }
      
      /**
       * 为子路由匹配对应的 Vue 组件
       * 优先使用后端指定的 component 路径，否则使用 path 路径
       */
      const index = route?.component
        ? modulesRoutesKeys.findIndex((ev) => ev.includes(route.component))
        : modulesRoutesKeys.findIndex((ev) => ev.includes(route.path))
      childrenData.component = modules[modulesRoutesKeys[index]]
      data.children = [childrenData]
    } else {
      /**
       * 情况2：处理其他类型的路由
       */
      
      /**
       * 情况2.1：目录类型路由
       * 有子路由的情况，使用 Layout 组件作为容器
       */
      if (route.children?.length) {
        data.component = Layout
        data.redirect = getRedirect(route.path, route.children)  // 设置重定向到第一个可访问的子路由
        
      /**
       * 情况2.2：外链类型路由
       * 路径是 URL 格式的外部链接
       */
      } else if (isUrl(route.path)) {
        data = {
          path: '/external-link',  // 统一的外链路由路径
          component: Layout,       // 使用 Layout 作为外链容器
          meta: {
            name: route.name       // 保留外链名称
          },
          children: [data]         // 将原路由配置作为子路由
        } as AppRouteRecordRaw
        
      /**
       * 情况2.3：普通菜单页面路由
       * 叶子节点，直接对应具体的页面组件
       */
      } else {
        /**
         * 组件路径兼容性处理：
         * - 如果后端传递了 component 路径，优先使用该路径匹配组件
         * - 如果未传递 component，则使用 path 路径匹配组件
         * 这样设计的好处是 path 可以与实际文件路径不完全一致，提供更大的灵活性
         */
        const index = route?.component
          ? modulesRoutesKeys.findIndex((ev) => ev.includes(route.component))
          : modulesRoutesKeys.findIndex((ev) => ev.includes(route.path))
        data.component = modules[modulesRoutesKeys[index]]
      }
      
      /**
       * 递归处理子路由
       * 如果当前路由有子路由，递归调用 generateRoute 处理
       */
      if (route.children) {
        data.children = generateRoute(route.children)
      }
    }
    
    /**
     * 将处理完成的路由配置添加到结果数组中
     */
    res.push(data as AppRouteRecordRaw)
  }
  
  /**
   * 返回最终的路由配置数组
   * 1. 先按 rank 字段排序路由（ascending 函数）
   * 2. 然后添加 404 通配符路由作为兜底
   */
  return ascending(res).concat([
    {
      path: '/:path(.*)*',    // Vue Router 4.x 的通配符语法
      redirect: '/404',        // 重定向到 404 页面
      name: '404Page',         // 路由名称
      meta: {
        hidden: true,          // 在菜单中隐藏
        breadcrumb: false      // 不显示在面包屑中
      }
    }
  ])
}
/**
 * 获取路由重定向路径
 * 用于多级菜单的重定向，自动重定向到第一个可访问的叶子节点
 * @param parentPath 父级路径
 * @param children 子路由数组
 * @returns 重定向的目标路径
 */
export const getRedirect = (parentPath: string, children: AppCustomRouteRecordRaw[]) => {
  // 如果没有子路由，直接返回父路径
  if (!children || children.length == 0) {
    return parentPath
  }
  
  // 生成第一个子路由的完整路径
  const path = generateRoutePath(parentPath, children[0].path)
  
  // 如果第一个子路由还有子路由，递归查找最深层的叶子节点
  if (children[0].children) return getRedirect(path, children[0].children)
  
  // 返回叶子节点路径作为重定向目标
  return path
}
/**
 * 生成完整的路由路径
 * 将父路径和子路径正确拼接，处理路径分隔符的规范化
 * @param parentPath 父级路径
 * @param path 子路径
 * @returns 拼接后的完整路径
 */
const generateRoutePath = (parentPath: string, path: string) => {
  // 移除父路径末尾的斜杠，避免重复
  if (parentPath.endsWith('/')) {
    parentPath = parentPath.slice(0, -1)
  }
  
  // 确保子路径以斜杠开头
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  
  // 拼接父路径和子路径
  return parentPath + path
}
/**
 * 解析和拼接路由路径
 * 智能处理各种路径格式，包括绝对路径、相对路径、外链等
 * @param parentPath 父级路径
 * @param path 当前路径
 * @returns 解析后的完整路径
 */
export const pathResolve = (parentPath: string, path: string) => {
  // 如果是外链 URL，直接返回
  if (isUrl(path)) return path
  
  // 如果路径为空，返回父路径（避免拼接错误）
  if (!path) return parentPath
  
  // 确保子路径以斜杠开头
  const childPath = path.startsWith('/') ? path : `/${path}`
  
  // 拼接路径并去除多余的斜杠
  return `${parentPath}${childPath}`.replace(/\/+/g, '/')
}

/**
 * 路由降级处理
 * 将多层嵌套的路由结构扁平化为二级结构，提升路由性能
 * 适用于复杂的多级菜单场景，避免过深的路由嵌套影响渲染性能
 * @param routes 原始路由配置数组
 * @returns 扁平化后的路由配置数组
 */
export const flatMultiLevelRoutes = (routes: AppRouteRecordRaw[]) => {
  // 深拷贝路由配置，避免修改原始数据
  const modules: AppRouteRecordRaw[] = cloneDeep(routes)
  
  // 遍历所有路由，对多级路由进行降级处理
  for (let index = 0; index < modules.length; index++) {
    const route = modules[index]
    
    // 检查是否为多级路由（层级大于2）
    if (!isMultipleRoute(route)) {
      continue
    }
    
    // 执行路由降级，将多级结构转为二级结构
    promoteRouteLevel(route)
  }
  
  return modules
}

/**
 * 检查路由层级是否大于2级
 * 判断路由是否需要进行扁平化处理
 * @param route 路由配置对象
 * @returns 如果路由层级大于2级返回 true，否则返回 false
 */
const isMultipleRoute = (route: AppRouteRecordRaw) => {
  // 检查路由是否存在且有子路由
  if (!route || !Reflect.has(route, 'children') || !route.children?.length) {
    return false
  }

  const children = route.children

  // 检查子路由中是否还有子路由（即第三级路由）
  let flag = false
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (child.children?.length) {
      flag = true  // 发现第三级路由，标记为多级路由
      break
    }
  }
  return flag
}

/**
 * 将多级路由提升为二级路由
 * 通过创建临时路由器来解析嵌套路由，然后将所有子路由提升到第二级
 * @param route 需要处理的路由配置
 */
const promoteRouteLevel = (route: AppRouteRecordRaw) => {
  // 创建临时路由器来解析嵌套路由结构
  let router: Router | null = createRouter({
    routes: [route as RouteRecordRaw],
    history: createWebHashHistory()
  })

  // 获取解析后的所有路由记录
  const routes = router.getRoutes()
  
  // 将所有子路由添加到顶级路由的 children 中
  addToChildren(routes, route.children || [], route)
  
  // 清理临时路由器，释放内存
  router = null

  // 移除原有子路由的 children 属性，实现扁平化
  route.children = route.children?.map((item) => omit(item, 'children'))
}

/**
 * 递归添加所有子菜单到顶级路由
 * 将深层嵌套的子路由全部提升到同一级别，实现路由扁平化
 * @param routes 解析后的路由记录数组
 * @param children 当前处理的子路由数组
 * @param routeModule 目标路由模块（用于存放扁平化后的子路由）
 */
const addToChildren = (
  routes: RouteRecordNormalized[],
  children: AppRouteRecordRaw[],
  routeModule: AppRouteRecordRaw
) => {
  // 遍历当前层级的所有子路由
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    
    // 在解析后的路由记录中查找对应的路由
    const route = routes.find((item) => item.name === child.name)
    if (!route) {
      continue
    }
    
    // 确保目标路由模块有 children 数组
    routeModule.children = routeModule.children || []
    
    // 避免重复添加相同名称的路由
    if (!routeModule.children.find((item) => item.name === route.name)) {
      routeModule.children?.push(route as unknown as AppRouteRecordRaw)
    }
    
    // 如果当前子路由还有子路由，递归处理
    if (child.children?.length) {
      addToChildren(routes, child.children, routeModule)
    }
  }
}
/**
 * 将字符串转换为驼峰命名格式
 * 主要用于将路由路径转换为符合 Vue 组件命名规范的路由名称
 * @param str 需要转换的字符串（通常是路由路径）
 * @param upperCaseFirst 是否将首字母大写（PascalCase）
 * @returns 转换后的驼峰命名字符串
 * @example
 * toCamelCase('/user-management', true) => 'UserManagement'
 * toCamelCase('/user-profile', false) => 'userProfile'
 */
const toCamelCase = (str: string, upperCaseFirst: boolean) => {
  // 处理连字符，将连字符后的字母转为大写
  str = (str || '')
    .replace(/-(.)/g, function (group1: string) {
      return group1.toUpperCase()
    })
    .replaceAll('-', '')  // 移除所有连字符

  // 根据参数决定是否将首字母大写
  if (upperCaseFirst && str) {
    str = str.charAt(0).toUpperCase() + str.slice(1)
  }

  return str
}
