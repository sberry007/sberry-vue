<template>
  <el-dialog v-model="visible" title="温控详情" width="1000px" @close="handleClose">
    <div class="temp-detail-container">
      <!-- 实时数据显示区域 -->
      <el-card class="realtime-card" shadow="never">
        <template #header>
          <span class="font-semibold">实时数据</span>
        </template>
        <div class="realtime-content">
          <div class="realtime-data-display">
            <div v-if="realtimeData" class="realtime-data">
              <div class="temp-data">
                <el-icon class="data-icon temp-icon"><HotWater /></el-icon>
                <span>{{ realtimeData.temperature }}°C</span>
              </div>
              <div class="humidity-data">
                <el-icon class="data-icon humidity-icon"><Drizzling /></el-icon>
                <span>{{ realtimeData.humidity }}%</span>
              </div>
            </div>
            <div v-else class="no-data">
              <span class="text-gray-400">暂无数据</span>
            </div>
          </div>
          <div class="temp-range-info">
            <span class="range-label">温度范围：</span>
            <span class="range-value">{{ warehouse?.minTemp }}°C ~ {{ warehouse?.maxTemp }}°C</span>
          </div>
        </div>
      </el-card>
      
      <!-- 历史数据图表 -->
      <el-card class="chart-card" shadow="never">
        <template #header>
          <span class="font-semibold">近两小时温湿度变化趋势</span>
        </template>
        <div class="temp-chart-container">
          <div ref="tempChartRef" class="temp-chart"></div>
        </div>
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, nextTick, onUnmounted, computed, watch } from 'vue'
import { WarehouseApi, type WarehouseVO, type WarehouseTempDataVO } from '@/api/erp/stock/warehouse'
import type { WarehouseTempMessage } from '@/websocket/warehouseTempWebSocket'
import { HotWater, Drizzling } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

interface Props {
  modelValue: boolean
  warehouse: WarehouseVO | null
  realtimeTempData: { temperature: number; humidity: number; timestamp: number } | null
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

// 实时数据
const realtimeData = ref<{ temperature: number; humidity: number; timestamp: number } | null>(null)

// 查询表单
const queryForm = ref({
  startTime: '',
  endTime: ''
})

/** 打开温控详情 */
const openTempDetail = async () => {
  if (!props.warehouse) return
  
  try {
    // 清空之前的数据
    tempHistoryData.value = []
    realtimeData.value = null
    
    // 销毁之前的图表
    if (tempChart.value) {
      tempChart.value.dispose()
      tempChart.value = null
    }
    
    // 设置实时数据
    if (props.realtimeTempData) {
      realtimeData.value = {
        temperature: props.realtimeTempData.temperature,
        humidity: props.realtimeTempData.humidity,
        timestamp: props.realtimeTempData.timestamp
      }
    }
    
    // 设置默认查询时间范围为近两小时
    const now = new Date()
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
    
    // 获取历史数据 - 获取最近2小时的数据
    const historyData = await WarehouseApi.getWarehouseTempDataByTimeRange({
      warehouseId: props.warehouse.id,
      hours: 2 // 默认查询2小时
    })
    tempHistoryData.value = historyData || []
    
    // 初始化图表
    await nextTick()
    initTempChart()
  } catch (error) {
    console.error('获取温控数据失败:', error)
    message.error('获取温控数据失败')
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
  if (!tempChart.value) return
  
  // 如果没有历史数据，显示空数据提示
  if (!tempHistoryData.value.length) {
    const emptyOption = {
      title: {
        text: '近两小时温湿度变化趋势',
        left: 'center'
      },
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: '暂无历史数据',
          fontSize: 16,
          fill: '#999'
        }
      }
    }
    tempChart.value.setOption(emptyOption)
    return
  }
  
  const times = tempHistoryData.value.map(item => {
    // 使用timestamp作为时间戳
    return new Date(item.timestamp).toLocaleTimeString()
  })
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
  realtimeData.value = null
}

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    openTempDetail()
  }
})

// 监听实时数据变化
watch(() => props.realtimeTempData, (newData) => {
  if (newData) {
    realtimeData.value = {
      temperature: newData.temperature,
      humidity: newData.humidity,
      timestamp: newData.timestamp
    }
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

/* 实时数据卡片样式 */
.realtime-card {
  margin-bottom: 16px;
}

.realtime-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.realtime-data-display {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60px;
}

.realtime-data {
  display: flex;
  gap: 40px;
  align-items: center;
}

.temp-data, .humidity-data {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 500;
}

.data-icon {
  font-size: 20px;
}

.temp-icon {
  color: #f56c6c;
}

.humidity-icon {
  color: #409eff;
}

.no-data {
  text-align: center;
  font-size: 14px;
}

.temp-range-info {
  text-align: center;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 6px;
}

.range-label {
  font-size: 14px;
  color: #909399;
  margin-right: 8px;
}

.range-value {
  font-size: 16px;
  font-weight: 500;
  color: #606266;
}

/* 图表卡片样式 */
.chart-card {
  flex: 1;
}

.temp-chart-container {
  height: 400px;
}

.temp-chart {
  width: 100%;
  height: 100%;
}
</style>