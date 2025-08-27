import request from '@/config/axios'

// ERP 仓库 VO
export interface WarehouseVO {
  id: number // 仓库编号
  name: string // 仓库名称
  address: string // 仓库地址
  sort: number // 排序
  remark: string // 备注
  principal: string // 负责人
  warehousePrice: number // 仓储费，单位：元
  truckagePrice: number // 搬运费，单位：元
  status: number // 开启状态
  defaultStatus: boolean // 是否默认
  warehouseType: number // 温控状态：0-未开启，1-已开启
  deviceId?: number // 绑定的温控设备ID
  deviceName?: string // 绑定的温控设备名称
  minTemp?: number // 最低温度阈值
  maxTemp?: number // 最高温度阈值
  lockTimeoutS?: number // 超时锁单时间（秒）
}

// 温控设备 VO
export interface TempDeviceVO {
  id: number // 设备ID
  name: string // 设备名称
  sn: string // 设备序列号
  activeStatus: number // 激活状态：0-未激活，1-已激活
  onlineStatus?: number // 在线状态：0-离线，1-在线
  warehouseId?: number // 绑定的仓库ID
  clientId?: string // 客户端ID
}

// 设备绑定请求 VO
export interface DeviceBindReqVO {
  warehouseId: number // 仓库ID
  deviceId: number // 设备ID
  minTemp: number // 最低温度阈值
  maxTemp: number // 最高温度阈值
  lockTimeoutS: number // 超时锁单时间（秒）
}

// 温控数据 VO
export interface WarehouseTempDataVO {
  id: number
  warehouseId: number
  deviceSn: string // 设备序列号
  temperature: number // 温度
  humidity: number // 湿度
  createTime: string // 记录时间
}

// 仓库温控设备绑定响应 VO
export interface WarehouseTempBindingVO {
  id: number // 绑定编号
  deviceId: number // 管理设备ID
  deviceName: string // 设备名称
  warehouseId: number // 关联仓库ID
  minTemp: number // 最小温度范围
  maxTemp: number // 最大温度范围
  lockTimeoutS: number // 超时锁单时间(秒)
  bindTime: string // 绑定时间
  createTime: string // 创建时间
  updateTime: string // 更新时间
}

// ERP 仓库 API
export const WarehouseApi = {
  // 查询仓库分页
  getWarehousePage: async (params: any) => {
    return await request.get({ url: `/erp-stock/warehouse/page`, params })
  },

  // 查询仓库精简列表
  getWarehouseSimpleList: async () => {
    return await request.get({ url: `/erp-stock/warehouse/simple-list` })
  },

  // 查询仓库详情
  getWarehouse: async (id: number) => {
    return await request.get({ url: `/erp-stock/warehouse/get?id=` + id })
  },

  // 新增仓库
  createWarehouse: async (data: WarehouseVO) => {
    return await request.post({ url: `/erp-stock/warehouse/create`, data })
  },

  // 修改仓库
  updateWarehouse: async (data: WarehouseVO) => {
    return await request.put({ url: `/erp-stock/warehouse/update`, data })
  },

  // 修改仓库默认状态
  updateWarehouseDefaultStatus: async (id: number, defaultStatus: boolean) => {
    return await request.put({
      url: `/erp-stock/warehouse/update-default-status`,
      params: {
        id,
        defaultStatus
      }
    })
  },

  // 删除仓库
  deleteWarehouse: async (id: number) => {
    return await request.delete({ url: `/erp-stock/warehouse/delete?id=` + id })
  },

  // 导出仓库 Excel
  exportWarehouse: async (params) => {
    return await request.download({ url: `/erp-stock/warehouse/export-excel`, params })
  },

  // 获取可绑定的温控设备列表
  getBindableDevices: async () => {
    return await request.get({ url: `/erp-stock/warehouse-temp/bindable-devices` })
  },

  // 绑定温控设备
  bindDevice: async (data: DeviceBindReqVO) => {
    return await request.post({ url: `/erp-stock/warehouse-temp/bind-device`, data })
  },

  // 解绑温控设备
  unbindDevice: async (warehouseId: number, deviceId: number) => {
    return await request.delete({ url: `/erp-stock/warehouse-temp/unbind-device?warehouseId=${warehouseId}&deviceId=${deviceId}` })
  },

  // 获取仓库温控历史数据
  getWarehouseTempData: async (warehouseId: number, params?: any) => {
    return await request.get({ url: `/erp-stock/warehouse-temp/temp-data/page`, params: { ...params, warehouseId } })
  },

  // 获取仓库绑定的设备列表
  getWarehouseDeviceBindings: async (warehouseId: number) => {
    return await request.get({ url: `/erp-stock/warehouse-temp/device-bindings?warehouseId=${warehouseId}` })
  }
}
