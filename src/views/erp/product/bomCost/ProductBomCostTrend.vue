<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1000px">
    <!-- BOM选择区域 -->
    <el-card class="mb-4">
      <template #header>
        <span>BOM选择</span>
      </template>
      <el-form :model="trendForm" :inline="true">
        <el-form-item label="BOM编码">
          <el-select v-model="trendForm.bomId" placeholder="请选择BOM" @change="handleBomChange" class="!w-200px">
            <el-option
              v-for="bom in bomList"
              :key="bom.id"
              :label="bom.bomName"
              :value="bom.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="trendForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="!w-240px"
          />
        </el-form-item>
        <el-form-item label="成本类型">
          <el-select v-model="trendForm.costTypes" multiple placeholder="请选择成本类型" class="!w-200px">
            <el-option label="材料成本" value="material" />
            <el-option label="人工成本" value="labor" />
            <el-option label="制造费用" value="overhead" />
            <el-option label="总成本" value="total" />
            <el-option label="单位成本" value="unit" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleLoadTrend" :disabled="!trendForm.bomId">
            生成趋势图
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 趋势图表展示 -->
    <div v-if="trendData.length > 0">
      <!-- 成本趋势图 -->
      <el-card class="mb-4">
        <template #header>
          <span>成本变化趋势</span>
        </template>
        <div class="chart-container">
          <div ref="trendChartRef" style="width: 100%; height: 400px;"></div>
        </div>
      </el-card>

      <!-- 版本列表 -->
      <el-card>
        <template #header>
          <span>版本详情列表</span>
        </template>
        <el-table :data="trendData" border>
          <el-table-column label="版本号" prop="costVersion" width="120" />
          <el-table-column label="计算日期" width="120">
            <template #default="scope">
              {{ formatCalculationDate(scope.row.calculationDate) }}
            </template>
          </el-table-column>
          <el-table-column label="材料成本" align="right" width="120">
            <template #default="scope">
              <span class="material-cost">{{ formatCurrency(scope.row.totalMaterialCost) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="人工成本" align="right" width="120">
            <template #default="scope">
              <span class="labor-cost">{{ formatCurrency(scope.row.totalLaborCost) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="制造费用" align="right" width="120">
            <template #default="scope">
              <span class="overhead-cost">{{ formatCurrency(scope.row.totalOverheadCost) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="总成本" align="right" width="120">
            <template #default="scope">
              <span class="total-cost">{{ formatCurrency(scope.row.totalCost) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="单位成本" align="right" width="120">
            <template #default="scope">
              <span class="unit-cost">{{ formatCurrency(scope.row.unitCost) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="当前版本" width="80" align="center">
            <template #default="scope">
              <el-tag :type="scope.row.isCurrent ? 'success' : 'info'" size="small">
                {{ scope.row.isCurrent ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="计算人" prop="calculatedByName" width="100" />
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { formatDate as formatDateUtil } from '@/utils/formatTime'
import { ProductBomCostApi, ProductBomCostVO } from '@/api/erp/product/bomCost'
import { ProductBomApi } from '@/api/erp/product/bom'
import * as echarts from 'echarts'

/** 成本趋势分析 */
defineOptions({ name: 'ProductBomCostTrend' })

const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('成本变化趋势分析')
const trendChartRef = ref()
let trendChart: echarts.ECharts | null = null

// 表单数据
const trendForm = reactive({
  bomId: undefined as number | undefined,
  dateRange: [] as string[],
  costTypes: ['material', 'labor', 'overhead', 'total'] as string[]
})

// 数据列表
const bomList = ref<any[]>([])
const trendData = ref<ProductBomCostVO[]>([])

/** 打开弹窗 */
const open = async (bomId?: number) => {
  dialogVisible.value = true
  await loadBomList()
  if (bomId) {
    trendForm.bomId = bomId
    await handleLoadTrend()
  }
}

/** 加载BOM列表 */
const loadBomList = async () => {
  try {
    const data = await ProductBomApi.getProductBomSimpleList()
    bomList.value = data
  } catch (error) {
    console.error('加载BOM列表失败:', error)
    message.error('加载BOM列表失败')
  }
}

/** BOM变化处理 */
const handleBomChange = () => {
  trendData.value = []
}

/** 加载趋势数据 */
const handleLoadTrend = async () => {
  if (!trendForm.bomId) {
    message.warning('请选择BOM')
    return
  }
  
  try {
    let data = await ProductBomCostApi.getProductBomCostListByBomId(trendForm.bomId)
    
    // 按日期范围过滤
    if (trendForm.dateRange && trendForm.dateRange.length === 2) {
      const [startDate, endDate] = trendForm.dateRange
      data = data.filter(item => {
        const itemDate = formatCalculationDate(item.calculationDate)
        return itemDate >= startDate && itemDate <= endDate
      })
    }
    
    // 按计算日期排序
    data.sort((a, b) => {
      const dateA = new Date(formatCalculationDate(a.calculationDate))
      const dateB = new Date(formatCalculationDate(b.calculationDate))
      return dateA.getTime() - dateB.getTime()
    })
    
    trendData.value = data
    
    // 渲染图表
    nextTick(() => {
      renderTrendChart()
    })
  } catch (error) {
    message.error('加载趋势数据失败')
  }
}

/** 格式化计算日期 */
const formatCalculationDate = (date: string) => {
  if (!date) return ''
  if (Array.isArray(date)) {
    const [year, month, day] = date
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return formatDateUtil(new Date(date), 'YYYY-MM-DD')
}

/** 格式化货币 */
const formatCurrency = (value: number) => {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 渲染趋势图表 */
const renderTrendChart = () => {
  if (!trendChartRef.value || trendData.value.length === 0) return
  
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  
  const xAxisData = trendData.value.map(item => {
    const date = formatCalculationDate(item.calculationDate)
    return `${item.costVersion}\n${date}`
  })
  
  const series: any[] = []
  
  // 根据选择的成本类型生成系列数据
  if (trendForm.costTypes.includes('material')) {
    series.push({
      name: '材料成本',
      type: 'line',
      data: trendData.value.map(item => item.totalMaterialCost),
      itemStyle: { color: '#5470c6' },
      lineStyle: { color: '#5470c6' }
    })
  }
  
  if (trendForm.costTypes.includes('labor')) {
    series.push({
      name: '人工成本',
      type: 'line',
      data: trendData.value.map(item => item.totalLaborCost),
      itemStyle: { color: '#91cc75' },
      lineStyle: { color: '#91cc75' }
    })
  }
  
  if (trendForm.costTypes.includes('overhead')) {
    series.push({
      name: '制造费用',
      type: 'line',
      data: trendData.value.map(item => item.totalOverheadCost),
      itemStyle: { color: '#fac858' },
      lineStyle: { color: '#fac858' }
    })
  }
  
  if (trendForm.costTypes.includes('total')) {
    series.push({
      name: '总成本',
      type: 'line',
      data: trendData.value.map(item => item.totalCost),
      itemStyle: { color: '#e74c3c' },
      lineStyle: { color: '#e74c3c', width: 3 }
    })
  }
  
  if (trendForm.costTypes.includes('unit')) {
    series.push({
      name: '单位成本',
      type: 'line',
      data: trendData.value.map(item => item.unitCost),
      itemStyle: { color: '#27ae60' },
      lineStyle: { color: '#27ae60', width: 3 }
    })
  }
  
  const option = {
    title: {
      text: '成本变化趋势',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params: any) {
        let result = `${params[0].axisValue.split('\n')[0]}<br/>`
        result += `日期: ${params[0].axisValue.split('\n')[1]}<br/>`
        params.forEach((param: any) => {
          result += `${param.seriesName}: ${formatCurrency(param.value)}<br/>`
        })
        return result
      }
    },
    legend: {
      top: 30,
      data: series.map(s => s.name)
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
      data: xAxisData,
      axisLabel: {
        interval: 0,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: function(value: number) {
          return formatCurrency(value)
        }
      }
    },
    series: series
  }
  
  trendChart.setOption(option)
}

/** 监听弹窗关闭，销毁图表 */
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    if (trendChart) {
      trendChart.dispose()
      trendChart = null
    }
    // 重置表单
    trendForm.bomId = undefined
    trendForm.dateRange = []
    trendForm.costTypes = ['material', 'labor', 'overhead', 'total']
    trendData.value = []
  }
})

/** 组件卸载时销毁图表 */
onUnmounted(() => {
  if (trendChart) {
    trendChart.dispose()
  }
})

defineExpose({ open })
</script>

<style scoped>
.material-cost {
  color: #5470c6;
  font-weight: 500;
}

.labor-cost {
  color: #91cc75;
  font-weight: 500;
}

.overhead-cost {
  color: #fac858;
  font-weight: 500;
}

.total-cost {
  color: #e74c3c;
  font-weight: bold;
}

.unit-cost {
  color: #27ae60;
  font-weight: bold;
}

.chart-container {
  width: 100%;
  height: 400px;
}
</style>