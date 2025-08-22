import request from '@/config/axios'

// 产品单位换算 VO
export interface ProductUnitConversionVO {
  id: number // 主键
  productId: number // 产品ID
  productName?: string // 产品名称
  fromUnitId: number // 源单位ID
  fromUnitName?: string // 源单位名称
  toUnitId: number // 目标单位ID
  toUnitName?: string // 目标单位名称
  conversionFactor: number | string // 换算系数，支持BigDecimal类型
  isActive: boolean // 是否启用
}

// 产品单位换算 API
export const ProductUnitConversionApi = {
  // 查询产品单位换算分页
  getProductUnitConversionPage: async (params: any) => {
    return await request.get({ url: `/erp-product/unitConvert/page`, params })
  },

  // 查询产品单位换算详情
  getProductUnitConversion: async (id: number) => {
    return await request.get({ url: `/erp-product/unitConvert/get?id=` + id })
  },

  // 新增产品单位换算
  createProductUnitConversion: async (data: ProductUnitConversionVO) => {
    return await request.post({ url: `/erp-product/unitConvert/create`, data })
  },

  // 修改产品单位换算
  updateProductUnitConversion: async (data: ProductUnitConversionVO) => {
    return await request.put({ url: `/erp-product/unitConvert/update`, data })
  },

  // 删除产品单位换算
  deleteProductUnitConversion: async (id: number) => {
    return await request.delete({ url: `/erp-product/unitConvert/delete?id=` + id })
  },

  // 导出产品单位换算 Excel
  exportProductUnitConversion: async (params) => {
    return await request.download({ url: `/erp-product/unitConvert/export-excel`, params })
  },

  // 获取换算系数
  getConversionFactor: async (productId: number, fromUnitId: number, toUnitId: number) => {
    return await request.get({ 
      url: `/erp-product/unitConvert/get-conversion-factor`,
      params: { productId, fromUnitId, toUnitId }
    })
  },
}
