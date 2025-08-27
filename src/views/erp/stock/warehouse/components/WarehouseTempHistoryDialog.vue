<template>
  <el-dialog
    v-model="dialogVisible"
    :title="`${warehouse?.name} - 温控详情`"
    width="1200px"
    :before-close="handleClose"
  >
    <div v-if="warehouse">
      <!-- 基本信息 -->
      <el-card class="mb-4" shadow="never">
        <template #header>
          <span class="font-semibold">设备信息</span>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="设备名称">{{ warehouse.deviceName || '未知设备' }}</el-descriptions-item>
          <el-descriptions-item label="温度范围">{{ warehouse.minTemp }}°C ~ {{ warehouse.maxTemp }}°C</el-descriptions-item>
          <el-descriptions-item label="锁库超时">{{ warehouse.lockTimeoutS }}秒</el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 实时数据 -->
      <el-card class="mb-4" shadow="never">
        <template #header>
          <span class="font-semibold">实时数据</span>
          <el-button 
            type="primary" 
            size="small" 
            @click="fetchLatestData"
            :loading="latestDataLoading"
            class="float-right"
          >
            刷新
          </el-button>
        </template>
        <div v-if="latestData" class="grid grid-cols-2 gap-4">
          <el-statistic
            title="当前温度"
            :value="latestData.temperature"
            suffix="°C"
            :value-style="{ color: getTemperatureColor(latestData.temperature) }"
          />
          <el-statistic
            title="当前湿度"
            :value="latestData.humidity"
            suffix="%"
            :value-style="{ color: '#409eff' }"
          />
        </div>
        <el-empty v-else description="暂无实时数据" />
      </el-card>

      <!-- 历史数据查询 -->
      <el-card shadow="never">
        <template #header>
          <span class="font-semibold">历史数据</span>
        </template>
        
        <!-- 查询条件 -->
        <el-form :model="queryParams" :inline="true" class="mb-4">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
              @change="handleDateRangeChange"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="fetchHistoryData" :loading="historyDataLoading">
              查询
            </el-button>
          </el-form-item>
        </el-form>

        <!-- 图表展示 -->
        <div v-if="historyData.length > 0">
          <div ref="chartContainer" style="width: 100%; height: 400px;"></div>
          
          <!-- 数据表格 -->
          <el-table 
            :data="historyData" 
            style="width: 100%; margin-top: 20px;"
            max-height="300px"
          >
            <el-table-column prop="recordTime" label="记录时间" width="180px" />
            <el-table-column prop="temperature" label="温度(°C)" width="120px">
              <template #default="scope">
                <span :style="{ color: getTemperatureColor(scope.row.temperature) }">
                  {{ scope.row.temperature }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="humidity" label="湿度(%)" width="120px" />
            <el-table-column prop="deviceName" label="设备名称" />
          </el-table>
          
          <!-- 分页 -->
          <Pagination
            :total="total"
            v-model:page="queryParams.pageNo"
            v-model:limit="queryParams.pageSize"
            @pagination="fetchHistoryData"
            class="mt-4"
          />
        </div>
        <el-empty v-else description="暂无历史数据" />
      </el-card>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { WarehouseApi, WarehouseVO } from '@/api/erp/stock/warehouse'
import * as echarts from 'echarts'
import { formatDate } from '@/utils/formatTime'
import Pagination from '@/components/Pagination/index.vue'

interface Props {
  modelValue: boolean
  warehouse: WarehouseVO | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const { t } = useI18n()
const message = useMessage()

// 对话框显示状态
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 实时数据
const latestData = ref<any>(null)
const latestDataLoading = ref(false)

// 历史数据
const historyData = ref<any[]>([])
const historyDataLoading = ref(false)
const total = ref(0)

// 查询参数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 20,
  warehouseId: 0,
  startTime: '',
  endTime: ''
})

// 日期范围
const dateRange = ref<[string, string]>()

// 图表容器
const chartContainer = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

/** 获取温度颜色 */
const getTemperatureColor = (temperature: number) => {
  if (!props.warehouse) return '#409eff'
  
  const { minTemp = 0, maxTemp = 10 } = props.warehouse
  
  if (temperature < minTemp) {
    return '#409eff' // 蓝色 - 低温
  } else if (temperature > maxTemp) {
    return '#f56c6c' // 红色 - 高温
  } else {
    return '#67c23a' // 绿色 - 正常
  }
}

/** 处理日期范围变化 */
const handleDateRangeChange = (dates: [string, string] | undefined) => {
  if (dates && dates.length === 2) {
    queryParams.startTime = dates[0]
    queryParams.endTime = dates[1]
  } else {
    queryParams.startTime = ''
    queryParams.endTime = ''
  }
}

/** 获取最新数据 */
const fetchLatestData = async () => {
  if (!props.warehouse?.id) return
  
  latestDataLoading.value = true
  try {
    const data = await WarehouseApi.getWarehouseLatestTempData(props.warehouse.id)
    latestData.value = data
  } catch (error) {
    message.error('获取最新数据失败')
  } finally {
    latestDataLoading.value = false
  }
}

/** 获取历史数据 */
const fetchHistoryData = async () => {
  if (!props.warehouse?.id) return
  
  historyDataLoading.value = true
  try {
    const params = {
      ...queryParams,
      warehouseId: props.warehouse.id
    }
    const result = await WarehouseApi.getWarehouseTempDataPage(params)
    historyData.value = result.list
    total.value = result.total
    
    // 更新图表
    updateChart()
  } catch (error) {
    message.error('获取历史数据失败')
  } finally {
    historyDataLoading.value = false
  }
}

/** 更新图表 */
const updateChart = () => {
  if (!chartContainer.value || historyData.value.length === 0) return
  
  if (!chartInstance) {
    chartInstance = echarts.init(chartContainer.value)
  }
  
  const times = historyData.value.map(item => item.recordTime)
  const temperatures = historyData.value.map(item => item.temperature)
  const humidities = historyData.value.map(item => item.humidity)
  
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
      top: '15%',
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
        itemStyle: {
          color: '#f56c6c'
        },
        lineStyle: {
          color: '#f56c6c'
        }
      },
      {
        name: '湿度',
        type: 'line',
        yAxisIndex: 1,
        data: humidities,
        itemStyle: {
          color: '#409eff'
        },
        lineStyle: {
          color: '#409eff'
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

/** 关闭对话框 */
const handleClose = () => {
  dialogVisible.value = false
  // 清理数据
  latestData.value = null
  historyData.value = []
  dateRange.value = undefined
  queryParams.pageNo = 1
  queryParams.startTime = ''
  queryParams.endTime = ''
  
  // 销毁图表
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}

// 监听对话框打开
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.warehouse) {
    queryParams.warehouseId = props.warehouse.id
    
    // 设置默认时间范围为最近7天
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    dateRange.value = [
      formatDate(startTime, 'YYYY-MM-DD HH:mm:ss'),
      formatDate(endTime, 'YYYY-MM-DD HH:mm:ss')
    ]
    
    handleDateRangeChange(dateRange.value)
    
    // 获取数据
    fetchLatestData()
    fetchHistoryData()
  }
})

// 监听窗口大小变化，重新调整图表
const resizeChart = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', resizeChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart)
  if (chartInstance) {
    chartInstance.dispose()
  }
})
</script>

<style scoped>
.grid {
  display: grid;
}

.grid-cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.gap-4 {
  gap: 1rem;
}

.mb-4 {
  margin-bottom: 1rem;
}

.mt-4 {
  margin-top: 1rem;
}

.font-semibold {
  font-weight: 600;
}

.float-right {
  float: right;
}
</style>