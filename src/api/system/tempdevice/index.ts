import request from '@/config/axios'

// 温控设备 VO
export interface TempDeviceVO {
  id: number // 设备编号
  name: string // 设备名称
  sn: string // 设备序列号/唯一标识
  onlineStatus: number // 在线状态：0离线 1在线
  lastSeen?: Date // 最近心跳/上报时间
  activeStatus: number // 激活状态：0未激活 1已激活
  activeTime?: Date // 激活时间
  deviceSecret: string // 设备密钥
  warehouseId: number // 仓库id
  warehouseName?: string // 绑定的仓库名称
  clientId?: string // 客户端ID
  createTime?: Date // 创建时间
  updateTime?: Date // 更新时间
}

// 设备创建请求 VO
export interface TempDeviceCreateVO {
  name: string // 设备名称
}

// 温控设备 API
export const TempDeviceApi = {
  // 查询温控设备分页
  getTempDevicePage: async (params: any) => {
    return await request.get({ url: `/system/temp-device/page`, params })
  },

  // 查询温控设备详情
  getTempDevice: async (id: number) => {
    return await request.get({ url: `/system/temp-device/get?id=` + id })
  },

  // 新增温控设备
  createTempDevice: async (data: TempDeviceVO) => {
    return await request.post({ url: `/system/temp-device/create`, data })
  },

  // 修改温控设备
  updateTempDevice: async (data: TempDeviceVO) => {
    return await request.put({ url: `/system/temp-device/update`, data })
  },

  // 删除温控设备
  deleteTempDevice: async (id: number) => {
    return await request.delete({ url: `/system/temp-device/delete?id=` + id })
  },

  // 根据SN获取设备信息
  getTempDeviceBySn: async (sn: string) => {
    return await request.get({ url: `/system/temp-device/get-by-sn?sn=` + sn })
  },

  // 发送温度命令到设备
  sendTemperatureCommand: async (data: { deviceSn: string; minTemperature: number; maxTemperature: number }) => {
    return await request.post({ url: `/system/temp-device/send-temperature-command`, data })
  },

  // 导出温控设备 Excel
  exportTempDevice: async (params) => {
    return await request.download({ url: `/system/temp-device/export-excel`, params })
  },
}
