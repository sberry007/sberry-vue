<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1200px">
    <!-- 版本选择区域 -->
    <el-card class="mb-4">
      <template #header>
        <span>版本选择</span>
      </template>
      <el-form :model="compareForm" :inline="true">
        <el-form-item label="BOM编码">
          <el-select v-model="compareForm.bomId" placeholder="请选择BOM" @change="handleBomChange" class="!w-200px">
            <el-option
              v-for="bom in bomList"
              :key="bom.id"
              :label="bom.bomName"
              :value="bom.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="对比版本">
          <el-select
            v-model="compareForm.selectedVersions"
            multiple
            placeholder="请选择要对比的版本"
            class="!w-300px"
            :disabled="!compareForm.bomId"
          >
            <el-option
              v-for="version in versionList"
              :key="version.id"
              :label="`${version.costVersion} ${version.isCurrent ? '(当前)' : ''}`"
              :value="version.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCompare" :disabled="compareForm.selectedVersions.length < 2">
            开始对比
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 对比结果展示 -->
    <div v-if="compareData.length > 0">
      <!-- 基本信息对比 -->
      <el-card class="mb-4">
        <template #header>
          <span>基本信息对比</span>
        </template>
        <el-table :data="basicInfoCompare" border>
          <el-table-column label="项目" prop="item" width="120" />
          <el-table-column
            v-for="data in compareData"
            :key="data.id"
            :label="`${data.costVersion} ${data.isCurrent ? '(当前)' : ''}`"
            align="center"
          >
            <template #default="scope">
              <span v-if="scope.row.item === '版本号'">{{ data.costVersion }}</span>
              <span v-else-if="scope.row.item === '计算日期'">{{ formatCalculationDate(data.calculationDate) }}</span>
              <span v-else-if="scope.row.item === '计算人'">{{ data.calculatedByName }}</span>
              <span v-else-if="scope.row.item === '创建时间'">{{ formatCreateTime(data.createTime) }}</span>
              <el-tag v-else-if="scope.row.item === '当前版本'" :type="data.isCurrent ? 'success' : 'info'">
                {{ data.isCurrent ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 成本数据对比 -->
      <el-card class="mb-4">
        <template #header>
          <span>成本数据对比</span>
        </template>
        <el-table :data="costDataCompare" border>
          <el-table-column label="成本项目" prop="item" width="120" />
          <el-table-column
            v-for="(data, dataIndex) in compareData"
            :key="data.id"
            :label="`${data.costVersion} ${data.isCurrent ? '(当前)' : ''}`"
            align="center"
          >
            <template #default="scope">
              <span
                :class="getCostClass(scope.row.item)"
                class="cost-value"
              >
                {{ getCostValue(data, scope.row.item) }}
              </span>
              <!-- 显示与第一个版本的差异 -->
              <div v-if="dataIndex > 0" class="cost-diff">
                <span :class="getDiffClass(getCostDiff(data, compareData[0], scope.row.item))">
                  {{ formatDiff(getCostDiff(data, compareData[0], scope.row.item)) }}
                </span>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 成本对比图表 -->
      <el-card>
        <template #header>
          <span>成本对比图表</span>
        </template>
        <div class="chart-container">
          <div ref="compareChartRef" style="width: 100%; height: 400px;"></div>
        </div>
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

/** 成本版本对比 */
defineOptions({ name: 'ProductBomCostCompare' })

const message = useMessage()

const dialogVisible = ref(false)
const dialogTitle = ref('成本版本对比')
const compareChartRef = ref()
let compareChart: echarts.ECharts | null = null

// 表单数据
const compareForm = reactive({
  bomId: undefined as number | undefined,
  selectedVersions: [] as number[]
})

// 数据列表
const bomList = ref<any[]>([])
const versionList = ref<ProductBomCostVO[]>([])
const compareData = ref<ProductBomCostVO[]>([])

// 基本信息对比数据
const basicInfoCompare = ref([
  { item: '版本号' },
  { item: '计算日期' },
  { item: '计算人' },
  { item: '当前版本' },
  { item: '创建时间' }
])

// 成本数据对比
const costDataCompare = ref([
  { item: '材料成本' },
  { item: '人工成本' },
  { item: '制造费用' },
  { item: '总成本' },
  { item: '单位成本' }
])

/** 打开弹窗 */
const open = async (bomId?: number) => {
  dialogVisible.value = true
  await loadBomList()
  if (bomId) {
    compareForm.bomId = bomId
    await handleBomChange()
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
const handleBomChange = async () => {
  if (!compareForm.bomId) {
    versionList.value = []
    return
  }
  
  try {
    const data = await ProductBomCostApi.getProductBomCostListByBomId(compareForm.bomId)
    versionList.value = data
    compareForm.selectedVersions = []
    compareData.value = []
  } catch (error) {
    message.error('加载版本列表失败')
  }
}

/** 开始对比 */
const handleCompare = async () => {
  if (compareForm.selectedVersions.length < 2) {
    message.warning('请至少选择2个版本进行对比')
    return
  }
  
  try {
    const promises = compareForm.selectedVersions.map(id => 
      ProductBomCostApi.getProductBomCost(id)
    )
    const results = await Promise.all(promises)
    compareData.value = results
    
    // 渲染图表
    nextTick(() => {
      renderCompareChart()
    })
  } catch (error) {
    message.error('加载对比数据失败')
  }
}

/** 获取成本值 */
const getCostValue = (data: ProductBomCostVO, item: string) => {
  const value = {
    '材料成本': data.totalMaterialCost,
    '人工成本': data.totalLaborCost,
    '制造费用': data.totalOverheadCost,
    '总成本': data.totalCost,
    '单位成本': data.unitCost
  }[item] || 0
  
  return formatCurrency(value)
}

/** 获取成本差异 */
const getCostDiff = (current: ProductBomCostVO, base: ProductBomCostVO, item: string) => {
  const currentValue = {
    '材料成本': current.totalMaterialCost,
    '人工成本': current.totalLaborCost,
    '制造费用': current.totalOverheadCost,
    '总成本': current.totalCost,
    '单位成本': current.unitCost
  }[item] || 0
  
  const baseValue = {
    '材料成本': base.totalMaterialCost,
    '人工成本': base.totalLaborCost,
    '制造费用': base.totalOverheadCost,
    '总成本': base.totalCost,
    '单位成本': base.unitCost
  }[item] || 0
  
  return currentValue - baseValue
}

/** 获取成本样式类 */
const getCostClass = (item: string) => {
  const classMap = {
    '材料成本': 'material-cost',
    '人工成本': 'labor-cost',
    '制造费用': 'overhead-cost',
    '总成本': 'total-cost',
    '单位成本': 'unit-cost'
  }
  return classMap[item] || ''
}

/** 获取差异样式类 */
const getDiffClass = (diff: number) => {
  if (diff > 0) return 'diff-increase'
  if (diff < 0) return 'diff-decrease'
  return 'diff-equal'
}

/** 格式化差异 */
const formatDiff = (diff: number) => {
  if (diff === 0) return '±0.00'
  const sign = diff > 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(diff))}`
}

/** 格式化货币 */
const formatCurrency = (value: number) => {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
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

/** 格式化创建时间 */
const formatCreateTime = (date: string) => {
  return formatDateUtil(new Date(date), 'YYYY-MM-DD HH:mm:ss')
}

/** 渲染对比图表 */
const renderCompareChart = () => {
  if (!compareChartRef.value || compareData.value.length === 0) return
  
  if (compareChart) {
    compareChart.dispose()
  }
  
  compareChart = echarts.init(compareChartRef.value)
  
  const categories = ['材料成本', '人工成本', '制造费用', '总成本', '单位成本']
  const series = compareData.value.map(data => ({
    name: `${data.costVersion} ${data.isCurrent ? '(当前)' : ''}`,
    type: 'bar',
    data: [
      data.totalMaterialCost,
      data.totalLaborCost,
      data.totalOverheadCost,
      data.totalCost,
      data.unitCost
    ]
  }))
  
  const option = {
    title: {
      text: '成本版本对比',
      left: 'center'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        let result = `${params[0].axisValue}<br/>`
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
      data: categories
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
  
  compareChart.setOption(option)
}

/** 监听弹窗关闭，销毁图表 */
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    if (compareChart) {
      compareChart.dispose()
      compareChart = null
    }
    // 重置表单
    compareForm.bomId = undefined
    compareForm.selectedVersions = []
    compareData.value = []
  }
})

/** 组件卸载时销毁图表 */
onUnmounted(() => {
  if (compareChart) {
    compareChart.dispose()
  }
})

defineExpose({ open })
</script>

<style scoped>
.cost-value.material-cost {
  color: #5470c6;
  font-weight: 500;
}

.cost-value.labor-cost {
  color: #91cc75;
  font-weight: 500;
}

.cost-value.overhead-cost {
  color: #fac858;
  font-weight: 500;
}

.cost-value.total-cost {
  color: #e74c3c;
  font-weight: bold;
}

.cost-value.unit-cost {
  color: #27ae60;
  font-weight: bold;
}

.cost-diff {
  font-size: 12px;
  margin-top: 2px;
}

.diff-increase {
  color: #f56565;
}

.diff-decrease {
  color: #48bb78;
}

.diff-equal {
  color: #a0aec0;
}

.chart-container {
  width: 100%;
  height: 400px;
}
</style>