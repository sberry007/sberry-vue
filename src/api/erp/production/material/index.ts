import request from '@/config/axios'

// ERP 物料请求 VO
export interface MaterialRequestVO {
  id: number // 主键，自动递增
  orderId: number // 订单ID，关联到 erp_production_order
  materialId: number // 物料ID，关联到 erp_product
  requestedQuantity: number // 请求数量
  approvedQuantity: number // 批准数量
  actualQuantity: number // 实际领用数量
  status: string // 状态
  requestTime: Date // 请求时间
  approvalTime: Date // 批准时间
}

// ERP 物料请求 API
export const MaterialRequestApi = {
  // 查询ERP 物料请求分页
  getMaterialRequestPage: async (params: any) => {
    return await request.get({ url: `/erp-production/materialRequest/page`, params })
  },

  // 查询ERP 物料请求详情
  getMaterialRequest: async (id: number) => {
    return await request.get({ url: `/erp-production/materialRequest/get?id=` + id })
  },

  // 新增ERP 物料请求
  createMaterialRequest: async (data: MaterialRequestVO) => {
    return await request.post({ url: `/erp-production/materialRequest/create`, data })
  },

  // 修改ERP 物料请求
  updateMaterialRequest: async (data: MaterialRequestVO) => {
    return await request.put({ url: `/erp-production/materialRequest/update`, data })
  },

  // 删除ERP 物料请求
  deleteMaterialRequest: async (id: number) => {
    return await request.delete({ url: `/erp-production/materialRequest/delete?id=` + id })
  },

  // 导出ERP 物料请求 Excel
  exportMaterialRequest: async (params) => {
    return await request.download({ url: `/erp-production/materialRequest/export-excel`, params })
  },

  // 更新ERP 物料请求状态（审批/反审批）
  updateMaterialRequestStatus: async (id: number, status: number) => {
    return await request.put({ url: `/erp-production/materialRequest/update-status?id=${id}&status=${status}` })
  },
}
