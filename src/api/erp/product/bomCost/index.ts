import request from '@/config/axios'
import { ProductBomItemVO } from '@/api/erp/product/bomItem'

// BOM成本计算 VO
export interface ProductBomCostVO {
  id: number // 主键
  bomId: number // BOM主表ID
  bomCode: string // BOM编码
  bomName: string // BOM名称
  productName: string // 产品名称
  calculationDate: string // 计算日期
  totalMaterialCost: number // 总材料成本
  totalLaborCost: number // 总人工成本
  totalOverheadCost: number // 总制造费用
  totalCost: number // 总成本
  unitCost: number // 单位成本
  costVersion: string // 成本版本
  calculatedBy: number // 计算人ID
  calculatedByName: string // 计算人姓名
  isCurrent: boolean // 是否当前版本
  createTime: string // 创建时间
  bomItems?: ProductBomItemVO[] // BOM明细列表
}

// BOM成本计算请求 VO
export interface ProductBomCostSaveReqVO {
  id?: number // 主键
  bomId: number // BOM主表ID
  calculationDate: string // 计算日期
  totalMaterialCost: number // 总材料成本
  totalLaborCost: number // 总人工成本
  totalOverheadCost: number // 总制造费用
  totalCost: number // 总成本
  unitCost: number // 单位成本
  costVersion: string // 成本版本
  isCurrent: boolean // 是否当前版本
}

// BOM成本计算分页请求 VO
export interface ProductBomCostPageReqVO {
  pageNo: number
  pageSize: number
  bomId?: number // BOM主表ID
  bomCode?: string // BOM编码
  productName?: string // 产品名称
  calculationDate?: string[] // 计算日期范围
  costVersion?: string // 成本版本
  isCurrent?: boolean // 是否当前版本
  calculatedBy?: number // 计算人ID
}

// BOM成本计算请求 VO
export interface ProductBomCostCalculateReqVO {
  bomId: number // BOM主表ID
  calculationDate: string // 计算日期
  laborCostPerHour: number // 每小时人工成本
  estimatedHours: number // 预计工时
  overheadRate: number // 制造费用率
  costVersion: string // 成本版本
  setAsCurrent: boolean // 是否设为当前版本
}

// BOM成本计算 API
export const ProductBomCostApi = {
  // 查询BOM成本计算分页
  getProductBomCostPage: async (params: ProductBomCostPageReqVO) => {
    return await request.get({ url: `/erp-product/bomCost/page`, params })
  },

  // 查询BOM成本计算详情
  getProductBomCost: async (id: number) => {
    return await request.get({ url: `/erp-product/bomCost/get?id=` + id })
  },

  // 查询BOM成本计算详细信息
  getProductBomCostDetail: async (id: number) => {
    return await request.get({ url: `/erp-product/bomCost/detail?id=` + id })
  },

  // 根据BOM ID获取成本计算列表
  getProductBomCostListByBomId: async (bomId: number): Promise<ProductBomCostVO[]> => {
    return await request.get({ url: `/erp-product/bomCost/list-by-bom-id?bomId=` + bomId })
  },

  // 获取当前版本的BOM成本
  getCurrentProductBomCost: async (bomId: number) => {
    return await request.get({ url: `/erp-product/bomCost/current?bomId=` + bomId })
  },

  // 新增BOM成本计算
  createProductBomCost: async (data: ProductBomCostSaveReqVO) => {
    return await request.post({ url: `/erp-product/bomCost/create`, data })
  },

  // 修改BOM成本计算
  updateProductBomCost: async (data: ProductBomCostSaveReqVO) => {
    return await request.put({ url: `/erp-product/bomCost/update`, data })
  },

  // 删除BOM成本计算
  deleteProductBomCost: async (id: number) => {
    return await request.delete({ url: `/erp-product/bomCost/delete?id=` + id })
  },

  // 计算BOM成本
  calculateProductBomCost: async (data: ProductBomCostCalculateReqVO) => {
    return await request.post({ url: `/erp-product/bomCost/calculate`, data })
  },

  // 预览计算BOM成本（不保存）
  previewCalculateProductBomCost: async (data: ProductBomCostCalculateReqVO) => {
    return await request.post({ url: `/erp-product/bomCost/preview-calculate`, data })
  },

  // 设置当前版本
  setCurrentVersion: async (id: number) => {
    return await request.put({ url: `/erp-product/bomCost/set-current?id=` + id })
  },

  // 导出BOM成本计算 Excel
  exportProductBomCost: async (params: ProductBomCostPageReqVO) => {
    return await request.download({ url: '/erp-product/bomCost/export-excel', params })
  },

  // 获取指定BOM的下一个版本号
  getNextVersion: async (bomId: number): Promise<string> => {
    return await request.get({ url: '/erp-product/bomCost/next-version', params: { bomId } })
  }
}