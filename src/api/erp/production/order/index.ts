import request from '@/config/axios'

// ERP 生产订单 VO
export interface EprProductionOrderVO {
  id: number // 主键，自动递增
  orderNo: string // 订单编号，唯一标识
  productId: number // 产品ID，关联到 erp_product
  plannedQuantity: number // 计划生产数量
  plannedStartDate: Date // 计划开始日期
  plannedEndDate: Date // 计划结束日期
  actualStartDate: Date // 实际开始日期
  actualEndDate: Date // 实际结束日期
  warehouseId: number // 仓库ID，关联到 erp_warehouse
  priority: number // 优先级
  status: number // 订单状态（如草稿、进行中、完成）
  remark: string // 备注
  saleOrderId: number // 销售订单ID,关联到erp_sale_order
}

// ERP 生产订单 API
export const EprProductionOrderApi = {
  // 查询ERP 生产订单分页
  getEprProductionOrderPage: async (params: any) => {
    return await request.get({ url: `/erp-production/order/page`, params })
  },

  // 查询ERP 生产订单详情
  getEprProductionOrder: async (id: number) => {
    return await request.get({ url: `/erp-production/order/get?id=` + id })
  },

  // 新增ERP 生产订单
  createEprProductionOrder: async (data: EprProductionOrderVO) => {
    return await request.post({ url: `/erp-production/order/create`, data })
  },

  // 修改ERP 生产订单
  updateEprProductionOrder: async (data: EprProductionOrderVO) => {
    return await request.put({ url: `/erp-production/order/update`, data })
  },

  // 删除ERP 生产订单
  deleteEprProductionOrder: async (id: number) => {
    return await request.delete({ url: `/erp-production/order/delete?id=` + id })
  },

  // 导出ERP 生产订单 Excel
  exportEprProductionOrder: async (params) => {
    return await request.download({ url: `/erp-production/order/export-excel`, params })
  },

  // 更新ERP 生产订单状态
  updateEprProductionOrderStatus: async (id: number, status: number) => {
    return await request.put({ url: `/erp-production/order/update-status?id=${id}&status=${status}` })
  },

  // 获得客户销售订单项
  getSaleOrderItemList: async (customerId:number) => {
    if (customerId == null) {
      return null
    }
    return await request.get({ url: `/erp-production/order/sale-orderItem?customerId=` + customerId })
  },

  // 获取可用于生产的销售订单列表（包含订单项信息）
  getProductionEnableSaleOrders: async (params: {
    customerId: number
    orderNo?: string
    productName?: string
  }) => {
    return await request.get({ url: `/erp-production/order/sale-order/production-enable`, params })
  },

  // 根据销售订单ID，获取该订单的订单项列表
  getSaleOrderItemsByOrderId: async (orderId: number) => {
    return await request.get({ url: `/erp-production/order/sale-order/items?orderId=${orderId}` })
  }
}
