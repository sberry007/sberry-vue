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
      <el-table-column label="仓库地址" align="center" prop="address" />
      <el-table-column label="仓库类型" align="center" prop="tempEnabled" width="100px">
        <template #default="scope">
          <el-tag :type="scope.row.tempEnabled === 1 ? 'success' : 'info'">
            {{ scope.row.tempEnabled === 1 ? '温控仓库' : '普通仓库' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="绑定设备" align="center" prop="deviceName" width="120px">
        <template #default="scope">
          <span v-if="scope.row.deviceName">{{ scope.row.deviceName }}</span>
          <span v-else class="text-gray-400">未绑定</span>
        </template>
      </el-table-column>
      <el-table-column
        label="仓储费"
        align="center"
        prop="warehousePrice"
        :formatter="erpPriceTableColumnFormatter"
      />
      <el-table-column
        label="搬运费"
        align="center"
        prop="truckagePrice"
        :formatter="erpPriceTableColumnFormatter"
      />
      <el-table-column label="负责人" align="center" prop="principal" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="排序" align="center" prop="sort" />
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
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" width="200px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:warehouse:update']"
          >
            编辑
          </el-button>
          <el-button
            v-if="scope.row.tempEnabled === 1 && !scope.row.deviceId"
            link
            type="success"
            @click="openBindDeviceDialog(scope.row)"
            v-hasPermi="['erp:warehouse:bind-device']"
          >
            绑定设备
          </el-button>
          <el-button
            v-if="scope.row.tempEnabled === 1 && scope.row.deviceId"
            link
            type="warning"
            @click="openTempDetailDialog(scope.row)"
          >
            温控详情
          </el-button>
          <el-button
            v-if="scope.row.tempEnabled === 1 && scope.row.deviceId"
            link
            type="danger"
            @click="handleUnbindDevice(scope.row)"
            v-hasPermi="['erp:warehouse:unbind-device']"
          >
            解绑设备
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:warehouse:delete']"
          >
            删除
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
  <el-dialog v-model="bindDeviceDialogVisible" title="绑定温控设备" width="600px">
    <el-form :model="bindDeviceForm" :rules="bindDeviceRules" ref="bindDeviceFormRef" label-width="120px">
      <el-form-item label="选择设备" prop="deviceId">
        <el-select v-model="bindDeviceForm.deviceId" placeholder="请选择温控设备" style="width: 100%">
          <el-option
            v-for="device in bindableDevices"
            :key="device.id"
            :label="`${device.deviceName} (${device.deviceSn})`"
            :value="device.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="最低温度" prop="minTemp">
        <el-input-number v-model="bindDeviceForm.minTemp" :precision="1" :step="0.1" :min="-50" :max="50" />
        <span class="ml-2 text-gray-500">°C</span>
      </el-form-item>
      <el-form-item label="最高温度" prop="maxTemp">
        <el-input-number v-model="bindDeviceForm.maxTemp" :precision="1" :step="0.1" :min="-50" :max="50" />
        <span class="ml-2 text-gray-500">°C</span>
      </el-form-item>
      <el-form-item label="超时时间" prop="timeoutSeconds">
        <el-input-number v-model="bindDeviceForm.timeoutSeconds" :min="60" :max="3600" :step="60" />
        <span class="ml-2 text-gray-500">秒</span>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="bindDeviceDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleBindDevice" :loading="bindDeviceLoading">确定</el-button>
    </template>
  </el-dialog>

  <!-- 温控详情对话框 -->
  <el-dialog v-model="tempDetailDialogVisible" title="温控详情" width="1000px">
    <div class="temp-detail-container">
      <div class="temp-info-cards">
        <el-card class="temp-card">
          <template #header>
            <span>当前温度</span>
          </template>
          <div class="temp-value">
            <span class="value">{{ currentTempData?.temperature || '--' }}</span>
            <span class="unit">°C</span>
          </div>
        </el-card>
        <el-card class="temp-card">
          <template #header>
            <span>当前湿度</span>
          </template>
          <div class="temp-value">
            <span class="value">{{ currentTempData?.humidity || '--' }}</span>
            <span class="unit">%</span>
          </div>
        </el-card>
        <el-card class="temp-card">
          <template #header>
            <span>温度范围</span>
          </template>
          <div class="temp-range">
            <span>{{ selectedWarehouse?.minTemp }}°C ~ {{ selectedWarehouse?.maxTemp }}°C</span>
          </div>
        </el-card>
      </div>
      <div class="temp-chart-container">
        <div ref="tempChartRef" class="temp-chart"></div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { getIntDictOptions, DICT_TYPE } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { WarehouseApi, WarehouseVO, TempDeviceVO, DeviceBindReqVO, WarehouseTempDataVO } from '@/api/erp/stock/warehouse'
import WarehouseForm from './WarehouseForm.vue'
import { erpPriceTableColumnFormatter } from '@/utils'
import { warehouseTempWebSocket, type WarehouseTempMessage } from '@/websocket/warehouseTempWebSocket'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

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
  timeoutSeconds: 300
})
const bindDeviceFormRef = ref()
const bindDeviceLoading = ref(false)
const bindableDevices = ref<TempDeviceVO[]>([])

// 温控详情相关
const tempDetailDialogVisible = ref(false)
const selectedWarehouse = ref<WarehouseVO | null>(null)
const currentTempData = ref<WarehouseTempMessage | null>(null)
const tempChartRef = ref<HTMLDivElement>()
const tempChart = ref<ECharts | null>(null)
const tempHistoryData = ref<WarehouseTempDataVO[]>([])

// 表单验证规则
const bindDeviceRules = {
  deviceId: [{ required: true, message: '请选择温控设备', trigger: 'change' }],
  minTemp: [{ required: true, message: '请输入最低温度', trigger: 'blur' }],
  maxTemp: [{ required: true, message: '请输入最高温度', trigger: 'blur' }],
  timeoutSeconds: [{ required: true, message: '请输入超时时间', trigger: 'blur' }]
}

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await WarehouseApi.getWarehousePage(queryParams)
    list.value = data.list
    total.value = data.total
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
  try {
    // 获取可绑定的设备列表
    const devices = await WarehouseApi.getBindableDevices()
    bindableDevices.value = devices
    
    // 重置表单
    bindDeviceForm.value = {
      warehouseId: warehouse.id,
      deviceId: 0,
      minTemp: 2,
      maxTemp: 8,
      timeoutSeconds: 300
    }
    
    bindDeviceDialogVisible.value = true
  } catch (error) {
    message.error('获取可绑定设备列表失败')
  }
}

/** 处理设备绑定 */
const handleBindDevice = async () => {
  try {
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
    await WarehouseApi.unbindDevice(warehouse.id)
    message.success('设备解绑成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel') {
      message.error('设备解绑失败')
    }
  }
}

/** 打开温控详情对话框 */
const openTempDetailDialog = async (warehouse: WarehouseVO) => {
  selectedWarehouse.value = warehouse
  tempDetailDialogVisible.value = true
  
  try {
    // 获取历史数据
    const historyData = await WarehouseApi.getWarehouseTempData(warehouse.id, {
      pageNo: 1,
      pageSize: 100
    })
    tempHistoryData.value = historyData.list || []
    
    // 初始化图表
    await nextTick()
    initTempChart()
    
    // 订阅实时数据
    warehouseTempWebSocket.setCallbacks({
      onTempData: handleRealtimeTempData,
      onAlarm: handleTempAlarm
    })
    
    if (!warehouseTempWebSocket.isConnected()) {
      warehouseTempWebSocket.connect()
    }
    
    warehouseTempWebSocket.subscribe([warehouse.id])
  } catch (error) {
    message.error('获取温控数据失败')
  }
}

/** 处理实时温控数据 */
const handleRealtimeTempData = (data: WarehouseTempMessage) => {
  if (selectedWarehouse.value && data.warehouseId === selectedWarehouse.value.id) {
    currentTempData.value = data
    
    // 更新图表数据
    if (tempChart.value) {
      const newDataPoint = {
        id: Date.now(),
        warehouseId: data.warehouseId,
        deviceSn: data.deviceSn,
        temperature: data.temperature,
        humidity: data.humidity,
        createTime: new Date(data.timestamp).toISOString()
      }
      
      tempHistoryData.value.push(newDataPoint)
      // 保持最新100条数据
      if (tempHistoryData.value.length > 100) {
        tempHistoryData.value.shift()
      }
      
      updateTempChart()
    }
  }
}

/** 处理温控报警 */
const handleTempAlarm = (data: WarehouseTempMessage) => {
  if (data.alarmMessage) {
    message.warning(`仓库温控报警: ${data.alarmMessage}`)
  }
}

/** 初始化温控图表 */
const initTempChart = () => {
  if (!tempChartRef.value) return
  
  tempChart.value = echarts.init(tempChartRef.value)
  updateTempChart()
}

/** 更新温控图表 */
const updateTempChart = () => {
  if (!tempChart.value || !tempHistoryData.value.length) return
  
  const times = tempHistoryData.value.map(item => 
    new Date(item.createTime).toLocaleTimeString()
  )
  const temperatures = tempHistoryData.value.map(item => item.temperature)
  const humidities = tempHistoryData.value.map(item => item.humidity)
  
  const option = {
    title: {
      text: '温湿度变化趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['温度', '湿度'],
      top: 30
    },
    xAxis: {
      type: 'category',
      data: times,
      axisLabel: {
        rotate: 45
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '温度(°C)',
        position: 'left',
        axisLabel: {
          formatter: '{value}°C'
        }
      },
      {
        type: 'value',
        name: '湿度(%)',
        position: 'right',
        axisLabel: {
          formatter: '{value}%'
        }
      }
    ],
    series: [
      {
        name: '温度',
        type: 'line',
        yAxisIndex: 0,
        data: temperatures,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        },
        markLine: selectedWarehouse.value ? {
          data: [
            { yAxis: selectedWarehouse.value.minTemp, name: '最低温度' },
            { yAxis: selectedWarehouse.value.maxTemp, name: '最高温度' }
          ],
          lineStyle: {
            color: '#F56C6C',
            type: 'dashed'
          }
        } : undefined
      },
      {
        name: '湿度',
        type: 'line',
        yAxisIndex: 1,
        data: humidities,
        smooth: true,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ],
    grid: {
      top: 80,
      bottom: 80
    }
  }
  
  tempChart.value.setOption(option)
}

/** 初始化 **/
onMounted(() => {
  getList()
})

/** 组件卸载时清理 */
onUnmounted(() => {
  if (tempChart.value) {
    tempChart.value.dispose()
  }
  warehouseTempWebSocket.disconnect()
})
</script>

<style scoped>
.temp-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.temp-info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.temp-card {
  text-align: center;
}

.temp-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
  margin-top: 8px;
}

.temp-value .value {
  font-size: 32px;
  font-weight: bold;
  color: #409EFF;
}

.temp-value .unit {
  font-size: 16px;
  color: #909399;
}

.temp-range {
  font-size: 18px;
  font-weight: 500;
  color: #67C23A;
  margin-top: 8px;
}

.temp-chart-container {
  width: 100%;
  height: 400px;
  border: 1px solid #EBEEF5;
  border-radius: 4px;
}

.temp-chart {
  width: 100%;
  height: 100%;
}
</style>
