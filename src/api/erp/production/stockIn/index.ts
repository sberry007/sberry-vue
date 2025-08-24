import request from '@/config/axios'

// ERP 生产入库记录 VO
export interface ProductionStockInVO {
  id: number // 主键，自动递增
  orderId: number // 关联生产订单ID
  productId: number // 入库产品ID
  quantity: number // 入库数量
  warehouseId: number // 入库仓库ID
  inDate: Date // 入库日期
  status: string // 状态
  remark: string // 备注
}

// ERP 生产入库记录 API
export const ProductionStockInApi = {
  // 查询ERP 生产入库记录分页
  getProductionStockInPage: async (params: any) => {
    return await request.get({ url: `/erp-production/in/page`, params })
  },

  // 查询ERP 生产入库记录详情
  getProductionStockIn: async (id: number) => {
    return await request.get({ url: `/erp-production/in/get?id=` + id })
  },

  // 新增ERP 生产入库记录
  createProductionStockIn: async (data: ProductionStockInVO) => {
    return await request.post({ url: `/erp-production/in/create`, data })
  },

  // 修改ERP 生产入库记录
  updateProductionStockIn: async (data: ProductionStockInVO) => {
    return await request.put({ url: `/erp-production/in/update`, data })
  },

  // 删除ERP 生产入库记录
  deleteProductionStockIn: async (id: number) => {
    return await request.delete({ url: `/erp-production/in/delete?id=` + id })
  },

  // 导出ERP 生产入库记录 Excel
  exportProductionStockIn: async (params) => {
    return await request.download({ url: `/erp-production/in/export-excel`, params })
  },

  // 获取已使用的生产订单ID列表
  getUsedProductionOrderIds: async () => {
    return await request.get({ url: `/erp-production/in/used-order-ids` })
  },

  // 更新ERP 生产入库记录状态
  updateProductionStockInStatus: async (id: number, status: number) => {
    return await request.put({ url: `/erp-production/in/update-status?id=${id}&status=${status}` })
  },
}
