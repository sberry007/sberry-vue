import request from '@/config/axios'

// BOM主表 VO
export interface ProductBomVO {
  id: number // 主键
  bomCode: string // BOM编码
  productId: number // 成品ID
  version: string // 版本号
  bomName: string // BOM名称
  outputQty: number // 产出数量
  outputUnitId: number // 产出单位ID
  status: string // 状态
  isDefault: boolean // 是否默认BOM
  description: string // BOM描述
  bomItems?: any[] // BOM明细列表
}

// BOM主表 API
export const ProductBomApi = {
  // 查询BOM主表分页
  getProductBomPage: async (params: any) => {
    return await request.get({ url: `/erp-product/bom/page`, params })
  },

  // 查询BOM主表详情
  getProductBom: async (id: number) => {
    return await request.get({ url: `/erp-product/bom/get?id=` + id })
  },

  // 查询BOM详情（包含明细列表）
  getProductBomDetail: async (id: number) => {
    return await request.get({ url: `/erp-product/bom/detail?id=` + id })
  },

  // 新增BOM主表
  createProductBom: async (data: ProductBomVO) => {
    return await request.post({ url: `/erp-product/bom/create`, data })
  },

  // 修改BOM主表
  updateProductBom: async (data: ProductBomVO) => {
    return await request.put({ url: `/erp-product/bom/update`, data })
  },

  // 删除BOM主表
  deleteProductBom: async (id: number) => {
    return await request.delete({ url: `/erp-product/bom/delete?id=` + id })
  },

  // 导出BOM主表 Excel
  exportProductBom: async (params) => {
    return await request.download({ url: `/erp-product/bom/export-excel`, params })
  },

  // 检查版本号唯一性
  checkVersionUniqueness: async (params: {
    productId: number
    version: string
    excludeId?: number
  }) => {
    return await request.get({ url: `/erp-product/bom/check-version-uniqueness`, params })
  },

  // 获取产品的最新版本号
  getLatestVersion: async (productId: number) => {
    return await request.get({ url: `/erp-product/bom/latest-version?productId=${productId}` })
  },

  // 查询BOM主表精简列表
  getProductBomSimpleList: async () => {
    return await request.get({ url: `/erp-product/bom/simple-list` })
  },

  // 根据产品ID获取BOM列表
  getProductBomListByProductId: async (productId: number) => {
    return await request.get({ url: `/erp-product/bom/list-by-product-id?productId=${productId}` })
  },
}
