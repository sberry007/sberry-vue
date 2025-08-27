<template>
  <el-dialog v-model="visible" title="温控详情" width="1000px" @close="handleClose">
    <div class="temp-detail-container">
      <div class="temp-info-cards">
        <el-card class="temp-card">
          <template #header>
            <span>当前温度</span>
          </template>
          <div class="temp-value">
            <span class="value">{{ props.realtimeTempData?.temperature || '--' }}</span>
            <span class="unit">°C</span>
          </div>
        </el-card>
        <el-card class="temp-card">
          <template #header>
            <span>当前湿度</span>
          </template>
          <div class="temp-value">
            <span class="value">{{ props.realtimeTempData?.humidity || '--' }}</span>
            <span class="unit">%</span>
          </div>
        </el-card>
        <el-card class="temp-card">
          <template #header>
            <span>温度范围</span>
          </template>
          <div class="temp-range">
            <span>{{ warehouse?.minTemp }}°C ~ {{ warehouse?.maxTemp }}°C</span>
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
import { ref, nextTick, onUnmounted } from 'vue'
import { WarehouseApi, type WarehouseVO, type WarehouseTempDataVO } from '@/api/erp/stock/warehouse'
import type { WarehouseTempMessage } from '@/websocket/warehouseTempWebSocket'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

interface Props {
  modelValue: boolean
  warehouse: WarehouseVO | null
  realtimeTempData: WarehouseTempMessage | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const message = useMessage()
const tempChartRef = ref<HTMLDivElement>()
const tempChart = ref<ECharts | null>(null)
const tempHistoryData = ref<WarehouseTempDataVO[]>([])

/** 打开温控详情 */
const openTempDetail = async () => {
  if (!props.warehouse) return
  
  try {
    // 清空之前的数据
    tempHistoryData.value = []
    
    // 销毁之前的图表
    if (tempChart.value) {
      tempChart.value.dispose()
      tempChart.value = null
    }
    
    // 获取历史数据 - 获取最近24小时的数据
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000)
    
    const historyData = await WarehouseApi.getWarehouseTempDataPage({
      pageNo: 1,
      pageSize: 100,
      warehouseId: props.warehouse.id,
      startTime: startTime.toISOString().slice(0, 19).replace('T', ' '),
      endTime: endTime.toISOString().slice(0, 19).replace('T', ' ')
    })
    tempHistoryData.value = historyData.list || []
    
    // 如果有实时数据，添加到历史数据中
    if (props.realtimeTempData && props.realtimeTempData.warehouseId === props.warehouse.id) {
      const realtimeDataPoint = {
        id: Date.now(),
        warehouseId: props.realtimeTempData.warehouseId,
        deviceSn: props.realtimeTempData.deviceSn,
        temperature: props.realtimeTempData.temperature,
        humidity: props.realtimeTempData.humidity,
        createTime: new Date(props.realtimeTempData.timestamp).toISOString()
      }
      tempHistoryData.value.push(realtimeDataPoint)
    }
    
    // 初始化图表
    await nextTick()
    initTempChart()
  } catch (error) {
    message.error('获取温控数据失败')
  }
}

/** 处理实时温控数据更新 */
const handleRealtimeDataUpdate = (data: WarehouseTempMessage) => {
  if (!data || !props.warehouse || data.warehouseId !== props.warehouse.id) return
  
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
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times
    },
    yAxis: [
      {
        type: 'value',
        name: '温度(°C)',
        position: 'left',
        axisLabel: {
          formatter: '{value} °C'
        }
      },
      {
        type: 'value',
        name: '湿度(%)',
        position: 'right',
        axisLabel: {
          formatter: '{value} %'
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
        }
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
    ]
  }
  
  tempChart.value.setOption(option)
}

/** 关闭对话框 */
const handleClose = () => {
  // 销毁图表
  if (tempChart.value) {
    tempChart.value.dispose()
    tempChart.value = null
  }
  
  // 清空数据
  tempHistoryData.value = []
}

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    openTempDetail()
  }
})

// 监听实时数据变化
watch(() => props.realtimeTempData, (newData) => {
  if (newData && props.modelValue) {
    handleRealtimeDataUpdate(newData)
  }
}, { deep: true })

// 组件卸载时清理
onUnmounted(() => {
  handleClose()
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
}

.temp-value .value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
}

.temp-value .unit {
  font-size: 16px;
  color: #909399;
}

.temp-range {
  font-size: 18px;
  font-weight: 600;
  color: #606266;
}

.temp-chart-container {
  height: 400px;
}

.temp-chart {
  width: 100%;
  height: 100%;
}
</style>