import request from '@/config/axios'

// BOM明细 VO
export interface ProductBomItemVO {
  id: number // 主键
  bomId: number // BOM主表ID
  materialId: number // 物料ID
  sequenceNo: number // 序号
  requiredQty: number // 需求数量
  unitId: number // 单位ID
  wastageRate: number // 损耗率
  isKeyMaterial: boolean // 是否关键物料
  substituteGroup: string // 替代组
  notes: string // 备注
  materialName?: string
  materialCode?: string
  materialSpec?: string
  unitName?: string
  materialPurchasePrice?: number
  materialPurchaseUnitId?: number
  materialPurchaseUnitName?: string
}

// BOM明细 API
export const ProductBomItemApi = {
  // 查询BOM明细分页
  getProductBomItemPage: async (params: any) => {
    return await request.get({ url: `/erp-product/bomItem/page`, params })
  },

  // 根据BOM ID查询明细列表
  getProductBomItemListByBomId: async (bomId: number) => {
    return await request.get({ url: `/erp-product/bomItem/list-by-bom-id?bomId=` + bomId })
  },

  // 查询BOM明细详情
  getProductBomItem: async (id: number) => {
    return await request.get({ url: `/erp-product/bomItem/get?id=` + id })
  },

  // 新增BOM明细
  createProductBomItem: async (data: ProductBomItemVO) => {
    return await request.post({ url: `/erp-product/bomItem/create`, data })
  },

  // 修改BOM明细
  updateProductBomItem: async (data: ProductBomItemVO) => {
    return await request.put({ url: `/erp-product/bomItem/update`, data })
  },

  // 删除BOM明细
  deleteProductBomItem: async (id: number) => {
    return await request.delete({ url: `/erp-product/bomItem/delete?id=` + id })
  },

  // 导出BOM明细 Excel
  exportProductBomItem: async (params) => {
    return await request.download({ url: `/erp-product/bomItem/export-excel`, params })
  },

  // 批量保存BOM明细（先删除原有明细，再插入新明细）
  saveBomItemsBatch: async (bomId: number, bomItems: ProductBomItemVO[]) => {
    return await request.post({ url: `/erp-product/bomItem/save-batch?bomId=` + bomId, data: bomItems })
  },
}
