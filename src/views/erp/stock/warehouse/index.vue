<!-- ERP 仓库列表 -->
<template>

  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="仓库名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入仓库名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="仓库状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择仓库状态"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['erp:warehouse:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:warehouse:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="仓库名称" align="center" prop="name" />
      <el-table-column label="绑定设备" align="center" prop="deviceName" width="120px">
        <template #default="scope">
          <span v-if="scope.row.deviceName">{{ scope.row.deviceName }}</span>
          <el-button
             v-else-if="scope.row.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED"
             link
             type="success"
             @click="openBindDeviceDialog(scope.row)"
             v-hasPermi="['erp:warehouse:create']"
           >
             绑定设备
           </el-button>
          <span v-else class="text-gray-400">--</span>
        </template>
      </el-table-column>
      <el-table-column label="仓库类型" align="center" prop="warehouseType" width="100px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.ERP_WAREHOUSE_TYPE" :value="scope.row.warehouseType" />
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="是否默认" align="center" prop="defaultStatus">
        <template #default="scope">
          <el-switch
            v-model="scope.row.defaultStatus"
            :active-value="true"
            :inactive-value="false"
            @change="handleDefaultStatusChange(scope.row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="实时数据" align="center" width="180px">
        <template #default="scope">
          <div v-if="scope.row.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED && scope.row.deviceId">
            <div v-if="realtimeData[scope.row.id]" class="realtime-data">
              <div class="temp-data">
                <el-icon class="data-icon temp-icon"><HotWater /></el-icon>
                <span>{{ realtimeData[scope.row.id].temperature }}°C</span>
              </div>
              <div class="humidity-data">
                <el-icon class="data-icon humidity-icon"><Drizzling /></el-icon>
                <span>{{ realtimeData[scope.row.id].humidity }}%</span>
              </div>
            </div>
            <div v-else class="no-data">
              <span class="text-gray-400">暂无数据</span>
            </div>
          </div>
          <span v-else class="text-gray-400">--</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="240px">
        <template #default="scope">
          <el-button
            link
            type="info"
            @click="handleViewDetail(scope.row.id)"
          >
            <Icon icon="ep:view" class="mr-5px" /> 详情
          </el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:warehouse:update']"
          >
            <Icon icon="ep:edit" class="mr-5px" /> 编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:warehouse:delete']"
          >
            <Icon icon="ep:delete" class="mr-5px" /> 删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <WarehouseForm ref="formRef" @success="getList" />

  <!-- 设备绑定对话框 -->
  <el-dialog v-model="bindDeviceDialogVisible" title="绑定温控设备" width="800px">
    <div v-if="bindableDevices.length === 0" class="no-devices-tip">
      <el-empty description="暂无可绑定的设备" />
    </div>
    <div v-else>
      <!-- 设备选择区域 -->
      <div class="device-selection-area">
        <h4>选择设备</h4>
        <div class="device-list">
          <div 
            v-for="device in bindableDevices" 
            :key="device.id"
            class="device-card"
            :class="{ 'selected': bindDeviceForm.deviceId === device.id }"
            @click="selectDevice(device)"
          >
            <div class="device-info">
               <div class="device-name">{{ device.name }}</div>
               <div class="device-details">
                 <span class="device-sn">设备编号: {{ device.sn }}</span>
                 <span class="device-status" :class="device.activeStatus === 1 ? 'online' : 'offline'">
                   {{ device.activeStatus === 1 ? '在线' : '离线' }}
                 </span>
               </div>
             </div>
            <div class="device-select-icon">
              <el-icon v-if="bindDeviceForm.deviceId === device.id"><Check /></el-icon>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 温控参数配置 -->
      <div class="temp-config-area" v-if="bindDeviceForm.deviceId > 0">
        <h4>温控参数配置</h4>
        <el-form :model="bindDeviceForm" :rules="bindDeviceRules" ref="bindDeviceFormRef" label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最低温度" prop="minTemp">
                <el-input-number v-model="bindDeviceForm.minTemp" :precision="1" :step="0.1" :min="-50" :max="50" style="width: 100%" />
                <span class="ml-2 text-gray-500">°C</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最高温度" prop="maxTemp">
                <el-input-number v-model="bindDeviceForm.maxTemp" :precision="1" :step="0.1" :min="-50" :max="50" style="width: 100%" />
                <span class="ml-2 text-gray-500">°C</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="超时锁库时间" prop="lockTimeoutS">
            <el-input-number v-model="bindDeviceForm.lockTimeoutS" :min="60" :max="3600" :step="60" style="width: 200px" />
            <span class="ml-2 text-gray-500">秒（超时锁单时间）</span>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="bindDeviceDialogVisible = false">取消</el-button>
      <el-button 
        type="primary" 
        @click="handleBindDevice" 
        :loading="bindDeviceLoading"
        :disabled="bindDeviceForm.deviceId === 0"
      >
        确定绑定
      </el-button>
    </template>
  </el-dialog>

  <!-- 仓库详情对话框 -->
  <WarehouseDetailDialog 
    v-model="detailDialogVisible" 
    :warehouse="selectedWarehouse" 
    @edit="handleEditFromDetail"
  />

</template>

<script setup lang="ts">
import { getIntDictOptions, DICT_TYPE } from '@/utils/dict'
import download from '@/utils/download'
import { WarehouseApi, WarehouseVO, TempDeviceVO, DeviceBindReqVO } from '@/api/erp/stock/warehouse'
import WarehouseForm from './WarehouseForm.vue'
import WarehouseDetailDialog from './components/WarehouseDetailDialog.vue'
import { Check, HotWater, Drizzling } from '@element-plus/icons-vue'

// 仓库类型常量
const WAREHOUSE_TYPE = {
  NORMAL: 0, // 常温仓库
  TEMP_CONTROLLED: 1 // 温控仓库
}

/** ERP 仓库列表 */
defineOptions({ name: 'ErpWarehouse' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<WarehouseVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  status: undefined
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

// 设备绑定相关
const bindDeviceDialogVisible = ref(false)
const bindDeviceForm = ref<DeviceBindReqVO>({
  warehouseId: 0,
  deviceId: 0,
  minTemp: 2,
  maxTemp: 8,
  lockTimeoutS: 300
})
const bindDeviceFormRef = ref()
const bindDeviceLoading = ref(false)
const bindableDevices = ref<TempDeviceVO[]>([])

// 详情对话框相关
const detailDialogVisible = ref(false)
const selectedWarehouse = ref<WarehouseVO | null>(null)

// WebSocket 和实时数据相关
const realtimeData = ref<Record<number, { temperature: number; humidity: number; timestamp: number }>>({})
let websocket: WebSocket | null = null

// 表单验证规则
const bindDeviceRules = {
  minTemp: [{ required: true, message: '请输入最低温度', trigger: 'blur' }],
  maxTemp: [{ required: true, message: '请输入最高温度', trigger: 'blur' }],
  lockTimeoutS: [{ required: true, message: '请输入超时锁单时间', trigger: 'blur' }]
}

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await WarehouseApi.getWarehousePage(queryParams)
    list.value = data.list
    total.value = data.total
    
    // 获取温控仓库的设备绑定状态
    await updateWarehouseDeviceBindings()
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await WarehouseApi.deleteWarehouse(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 修改默认状态 */
const handleDefaultStatusChange = async (row: WarehouseVO) => {
  try {
    // 修改状态的二次确认
    const text = row.defaultStatus ? '设置' : '取消'
    await message.confirm('确认要' + text + '"' + row.name + '"默认吗?')
    // 发起修改状态
    await WarehouseApi.updateWarehouseDefaultStatus(row.id, row.defaultStatus)
    // 刷新列表
    await getList()
  } catch (e) {
    // 取消后，进行恢复按钮
    row.defaultStatus = !row.defaultStatus
  }
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await WarehouseApi.exportWarehouse(queryParams)
    download.excel(data, '仓库.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 打开设备绑定对话框 */
const openBindDeviceDialog = async (warehouse: WarehouseVO) => {
  // 重置表单
  bindDeviceForm.value = {
    warehouseId: warehouse.id,
    deviceId: 0,
    minTemp: 2,
    maxTemp: 8,
    lockTimeoutS: 300
  }
  
  // 先打开对话框
  bindDeviceDialogVisible.value = true
  
  try {
    // 获取可绑定的设备列表
    const devices = await WarehouseApi.getBindableDevices()
    bindableDevices.value = devices
  } catch (error) {
    message.error('获取可绑定设备列表失败')
    bindableDevices.value = [] // 设置为空数组，避免显示旧数据
  }
}

/** 选择设备 */
const selectDevice = (device: TempDeviceVO) => {
  bindDeviceForm.value.deviceId = device.id
}

/** 处理设备绑定 */
const handleBindDevice = async () => {
  try {
    // 验证是否选择了设备
    if (bindDeviceForm.value.deviceId === 0) {
      message.error('请选择要绑定的设备')
      return
    }
    
    await bindDeviceFormRef.value?.validate()
    
    // 验证温度范围
    if (bindDeviceForm.value.minTemp >= bindDeviceForm.value.maxTemp) {
      message.error('最低温度必须小于最高温度')
      return
    }
    
    bindDeviceLoading.value = true
    await WarehouseApi.bindDevice(bindDeviceForm.value)
    message.success('设备绑定成功')
    bindDeviceDialogVisible.value = false
    await getList()
  } catch (error) {
    message.error('设备绑定失败')
  } finally {
    bindDeviceLoading.value = false
  }
}

/** 处理设备解绑 */
const handleUnbindDevice = async (warehouse: WarehouseVO) => {
  try {
    await message.confirm(`确认要解绑仓库"${warehouse.name}"的温控设备吗？`)
    await WarehouseApi.unbindDevice(warehouse.id, warehouse.deviceId!)
    message.success('设备解绑成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel') {
      message.error('设备解绑失败')
    }
  }
}

/** 查看仓库详情 */
const handleViewDetail = async (warehouseId: number) => {
  try {
    const warehouse = await WarehouseApi.getWarehouse(warehouseId)
    selectedWarehouse.value = warehouse
    
    // 如果是温控仓库，获取设备绑定信息
    if (warehouse.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED) {
      await updateSingleWarehouseDeviceBinding(warehouse)
    }
    
    detailDialogVisible.value = true
  } catch (error) {
    message.error('获取仓库详情失败')
  }
}

/** 从详情对话框编辑仓库 */
const handleEditFromDetail = (warehouseId: number) => {
  detailDialogVisible.value = false
  openForm('update', warehouseId)
}



/** 更新仓库设备绑定状态 */
const updateWarehouseDeviceBindings = async () => {
  // 遍历所有温控仓库，获取设备绑定状态
  const tempControlledWarehouses = list.value.filter(warehouse => warehouse.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED)
  
  for (const warehouse of tempControlledWarehouses) {
    await updateSingleWarehouseDeviceBinding(warehouse)
  }
}

/** 更新单个仓库设备绑定信息 */
const updateSingleWarehouseDeviceBinding = async (warehouse: WarehouseVO) => {
  try {
    const bindings = await WarehouseApi.getWarehouseDeviceBindings(warehouse.id)
    if (bindings && bindings.length > 0) {
      // 如果有绑定设备，更新设备信息
      const binding = bindings[0] // 假设一个仓库只绑定一个设备
      warehouse.deviceId = binding.deviceId
      warehouse.deviceName = binding.deviceName // 直接使用后端返回的设备名称
      warehouse.minTemp = binding.minTemp
      warehouse.maxTemp = binding.maxTemp
      warehouse.lockTimeoutS = binding.lockTimeoutS
    } else {
      // 如果没有绑定设备，清空设备信息
      warehouse.deviceId = undefined
      warehouse.deviceName = undefined
      warehouse.minTemp = undefined
      warehouse.maxTemp = undefined
      warehouse.lockTimeoutS = undefined
    }
  } catch (error) {
    console.error(`获取仓库 ${warehouse.name} 的设备绑定状态失败:`, error)
    // 出错时清空设备信息，避免显示错误的绑定状态
    warehouse.deviceId = undefined
    warehouse.deviceName = undefined
  }
}

/** WebSocket 连接管理 */
const connectWebSocket = () => {
  if (websocket) {
    websocket.close()
  }
  
  const wsUrl = `ws://localhost:48080/app-api/erp/warehouse/temp-data/ws`
  websocket = new WebSocket(wsUrl)
  
  websocket.onopen = () => {
    console.log('WebSocket 连接已建立')
  }
  
  websocket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.warehouseId && data.temperature !== undefined && data.humidity !== undefined) {
        realtimeData.value[data.warehouseId] = {
          temperature: parseFloat(data.temperature.toFixed(1)),
          humidity: parseFloat(data.humidity.toFixed(1)),
          timestamp: data.timestamp || Date.now()
        }
      }
    } catch (error) {
      console.error('解析 WebSocket 数据失败:', error)
    }
  }
  
  websocket.onerror = (error) => {
    console.error('WebSocket 连接错误:', error)
  }
  
  websocket.onclose = () => {
    console.log('WebSocket 连接已关闭')
    // 5秒后尝试重连
    setTimeout(() => {
      if (!websocket || websocket.readyState === WebSocket.CLOSED) {
        connectWebSocket()
      }
    }, 5000)
  }
}

/** 断开 WebSocket 连接 */
const disconnectWebSocket = () => {
  if (websocket) {
    websocket.close()
    websocket = null
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
  connectWebSocket()
})

/** 组件卸载时断开连接 */
onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<style scoped>
.device-selection-area {
  margin-bottom: 20px;
  
  h4 {
    margin-bottom: 12px;
    color: #303133;
    font-size: 14px;
    font-weight: 600;
  }
  
  .device-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 12px;
    
    .device-card {
      border: 1px solid #dcdfe6;
      border-radius: 8px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      &:hover {
        border-color: #409eff;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
      }
      
      &.selected {
        border-color: #409eff;
        background-color: #f0f9ff;
      }
      
      .device-info {
        flex: 1;
        
        .device-name {
          font-weight: 600;
          color: #303133;
          margin-bottom: 8px;
        }
        
        .device-details {
          display: flex;
          flex-direction: column;
          gap: 4px;
          
          .device-sn {
            font-size: 12px;
            color: #909399;
          }
          
          .device-status {
            font-size: 12px;
            
            &.online {
              color: #67c23a;
            }
            
            &.offline {
              color: #f56c6c;
            }
          }
        }
      }
      
      .device-select-icon {
        color: #409eff;
        font-size: 18px;
      }
    }
  }
}

.temp-config-area {
  h4 {
    margin-bottom: 16px;
    color: #303133;
    font-size: 14px;
    font-weight: 600;
  }
}

.no-devices-tip {
  text-align: center;
  padding: 40px 0;
}

/* 实时数据样式 */
.realtime-data {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .temp-data, .humidity-data {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    
    .data-icon {
      font-size: 14px;
    }
    
    .temp-icon {
      color: #f56c6c;
    }
    
    .humidity-icon {
      color: #409eff;
    }
  }
}

.no-data {
  font-size: 12px;
}
</style>
