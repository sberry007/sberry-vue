<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1200px">
    <el-descriptions :column="3" border v-loading="loading">
      <el-descriptions-item label="BOM编码">
        <el-tag>{{ formData.bomCode }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="BOM名称">
        {{ formData.bomName }}
      </el-descriptions-item>
      <el-descriptions-item label="产品名称">
        {{ formData.productName }}
      </el-descriptions-item>
      <el-descriptions-item label="成本版本">
        <el-tag type="success">{{ formData.costVersion }}</el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="计算日期">
        {{ formatCalculationDate(formData.calculationDate) }}
      </el-descriptions-item>
      <el-descriptions-item label="当前版本">
        <dict-tag :type="DICT_TYPE.INFRA_BOOLEAN_STRING" :value="formData.isCurrent" />
      </el-descriptions-item>
      <el-descriptions-item label="计算人">
        {{ formData.calculatedByName }}
      </el-descriptions-item>
      <el-descriptions-item label="创建时间">
        {{ formatCreateTime(formData.createTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="">
        <!-- 空白占位 -->
      </el-descriptions-item>
    </el-descriptions>

    <el-divider content-position="left">
      <span style="font-weight: bold; color: #409eff">成本明细</span>
    </el-divider>

    <el-row :gutter="20" class="cost-summary">
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card material-cost">
          <div class="cost-item">
            <div class="cost-label">总材料成本</div>
            <div class="cost-value">{{formData.totalMaterialCost }} 元</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card labor-cost">
          <div class="cost-item">
            <div class="cost-label">总人工成本</div>
            <div class="cost-value">{{ formData.totalLaborCost }} 元</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card overhead-cost">
          <div class="cost-item">
            <div class="cost-label">总制造费用</div>
            <div class="cost-value">{{ formData.totalOverheadCost }} 元</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="cost-card total-cost">
          <div class="cost-item">
            <div class="cost-label">总成本</div>
            <div class="cost-value total">{{ formData.totalCost }} 元</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="unit-cost-row">
      <el-col :span="12" :offset="6">
        <el-card shadow="hover" class="cost-card unit-cost">
          <div class="cost-item">
            <div class="cost-label">单位成本</div>
            <div class="cost-value unit">{{ formData.unitCost }} 元</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-divider content-position="left">
      <span style="font-weight: bold; color: #409eff">BOM明细</span>
    </el-divider>

    <el-table :data="formData.bomItems" border style="width: 100%" v-loading="loading">
      <el-table-column prop="materialCode" label="物料编码" width="120" />
      <el-table-column prop="materialName" label="物料名称" min-width="150" />
      <el-table-column prop="materialSpec" label="规格型号" min-width="120" />
      <el-table-column prop="requiredQty" label="需求数量" width="100" align="right">
        <template #default="{ row }">
          {{ row.requiredQty }}
        </template>
      </el-table-column>
      <el-table-column prop="unitName" label="单位" width="80" />
      <el-table-column label="采购价格" width="100" align="right">
        <template #default="{ row }">
          {{ formatMaterialPrice(row) }}
        </template>
      </el-table-column>
      <el-table-column label="采购单位" width="80">
        <template #default="{ row }">
          {{ getMaterialPurchaseUnit(row) }}
        </template>
      </el-table-column>
      <el-table-column label="单位换算" width="150" align="center">
        <template #default="{ row }">
          <div v-if="needUnitConversion(row)">
            <el-tag type="warning" size="small" style="margin-bottom: 2px;">
              需要换算
            </el-tag>
            <div style="font-size: 11px; color: #666;">
              {{ getUnitConversionInfo(row) }}
            </div>
          </div>
          <el-tag v-else type="success" size="small">
            无需换算
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="材料成本" width="120" align="right">
        <template #default="{ row }">
          {{ calculateItemCost(row) }} 元
        </template>
      </el-table-column>
    </el-table>

    <el-divider content-position="left">
      <span style="font-weight: bold; color: #409eff">成本构成分析</span>
    </el-divider>

    <el-row :gutter="20">
      <el-col :span="12">
        <div class="chart-container">
          <div class="chart-title">成本构成饼图</div>
          <div ref="pieChartRef" class="chart"></div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="chart-container">
          <div class="chart-title">成本构成柱状图</div>
          <div ref="barChartRef" class="chart"></div>
        </div>
      </el-col>
    </el-row>

    <template #footer>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ProductBomCostApi, ProductBomCostVO } from '@/api/erp/product/bomCost'
import { DICT_TYPE } from '@/utils/dict'
import { formatDate as formatDateUtil } from '@/utils/formatTime'
import * as echarts from 'echarts'

/** BOM成本计算详情 */
defineOptions({ name: 'ProductBomCostDetail' })

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('BOM成本计算详情') // 弹窗的标题
const loading = ref(false) // 表单的加载中
const formData = ref<ProductBomCostVO>({
  id: 0,
  bomId: 0,
  bomCode: '',
  bomName: '',
  productName: '',
  calculationDate: '',
  totalMaterialCost: 0,
  totalLaborCost: 0,
  totalOverheadCost: 0,
  totalCost: 0,
  unitCost: 0,
  costVersion: '',
  calculatedBy: 0,
  calculatedByName: '',
  isCurrent: false,
  createTime: '',
  bomItems: []
})

// 图表引用
const pieChartRef = ref()
const barChartRef = ref()
let pieChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null

/** 打开弹窗 */
const open = async (id: number) => {
  dialogVisible.value = true
  resetForm()
  
  // 获取详情数据
  loading.value = true
  try {
    const data = await ProductBomCostApi.getProductBomCostDetail(id)
    formData.value = data
    
    // 等待DOM更新后初始化图表
    await nextTick()
    initCharts()
  } finally {
    loading.value = false
  }
}

/** 初始化图表 */
const initCharts = () => {
  initPieChart()
  initBarChart()
}

/** 初始化饼图 */
const initPieChart = () => {
  if (pieChart) {
    pieChart.dispose()
  }
  
  pieChart = echarts.init(pieChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} 元 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '成本构成',
        type: 'pie',
        radius: '50%',
        data: [
          { value: formData.value.totalMaterialCost, name: '材料成本' },
          { value: formData.value.totalLaborCost, name: '人工成本' },
          { value: formData.value.totalOverheadCost, name: '制造费用' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  pieChart.setOption(option)
}

/** 初始化柱状图 */
const initBarChart = () => {
  if (barChart) {
    barChart.dispose()
  }
  
  barChart = echarts.init(barChartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{b}: {c} 元'
    },
    xAxis: {
      type: 'category',
      data: ['材料成本', '人工成本', '制造费用', '总成本']
    },
    yAxis: {
      type: 'value',
      name: '金额(元)'
    },
    series: [
      {
        name: '成本',
        type: 'bar',
        data: [
          {
            value: formData.value.totalMaterialCost,
            itemStyle: { color: '#5470c6' }
          },
          {
            value: formData.value.totalLaborCost,
            itemStyle: { color: '#91cc75' }
          },
          {
            value: formData.value.totalOverheadCost,
            itemStyle: { color: '#fac858' }
          },
          {
            value: formData.value.totalCost,
            itemStyle: { color: '#ee6666' }
          }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  barChart.setOption(option)
}

/** 格式化计算日期 (date类型) */
const formatCalculationDate = (date: string) => {
  if (!date) return ''
  return formatDateUtil(new Date(date), 'YYYY-MM-DD')
}

/** 格式化创建时间 (datetime类型) */
const formatCreateTime = (date: string) => {
  if (!date) return ''
  return formatDateUtil(new Date(date), 'YYYY-MM-DD HH:mm:ss')
}

/** 格式化物料采购价格 */
const formatMaterialPrice = (row: any) => {
  if (!row.materialPurchasePrice) return '-'
  return row.materialPurchasePrice + ' 元'
}

/** 获取物料采购单位 */
const getMaterialPurchaseUnit = (row: any) => {
  return row.materialPurchaseUnitName || '-'
}

/** 判断是否需要单位换算 */
const needUnitConversion = (row: any) => {
  return row.unitId !== row.materialPurchaseUnitId
}

/** 获取单位换算信息 */
const getUnitConversionInfo = (row: any) => {
  if (!needUnitConversion(row)) return ''
  const bomUnit = row.unitName || '未知单位'
  const purchaseUnit = row.materialPurchaseUnitName || '未知单位'
  return `${bomUnit} → ${purchaseUnit}`
}

/** 计算单项材料成本 */
const calculateItemCost = (row: any) => {
  // 直接使用后端计算好的单项成本（已包含单位转换）
  if (row.itemCost !== undefined && row.itemCost !== null) {
    return row.itemCost.toFixed(2)
  }
  
  // 兜底逻辑：如果后端没有返回itemCost，使用原始计算
  if (!row.materialPurchasePrice || !row.requiredQty) return '0.00'
  
  let actualCost = row.materialPurchasePrice * row.requiredQty
  return actualCost.toFixed(2)
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: 0,
    bomId: 0,
    bomCode: '',
    bomName: '',
    productName: '',
    calculationDate: '',
    totalMaterialCost: 0,
    totalLaborCost: 0,
    totalOverheadCost: 0,
    totalCost: 0,
    unitCost: 0,
    costVersion: '',
    calculatedBy: 0,
    calculatedByName: '',
    isCurrent: false,
    createTime: '',
    bomItems: []
  }
}

/** 监听弹窗关闭，销毁图表 */
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    if (pieChart) {
      pieChart.dispose()
      pieChart = null
    }
    if (barChart) {
      barChart.dispose()
      barChart = null
    }
  }
})

/** 组件卸载时销毁图表 */
onUnmounted(() => {
  if (pieChart) {
    pieChart.dispose()
  }
  if (barChart) {
    barChart.dispose()
  }
})

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>

<style scoped>
.cost-summary {
  margin-bottom: 20px;
}

.unit-cost-row {
  margin-bottom: 20px;
}

.cost-card {
  text-align: center;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.cost-card:hover {
  transform: translateY(-2px);
}

.cost-item {
  padding: 10px;
}

.cost-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.cost-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.cost-value.total {
  font-size: 20px;
  color: #e74c3c;
}

.cost-value.unit {
  font-size: 20px;
  color: #27ae60;
}

.material-cost {
  border-left: 4px solid #5470c6;
}

.labor-cost {
  border-left: 4px solid #91cc75;
}

.overhead-cost {
  border-left: 4px solid #fac858;
}

.total-cost {
  border-left: 4px solid #e74c3c;
}

.unit-cost {
  border-left: 4px solid #27ae60;
}

.chart-container {
  text-align: center;
}

.chart-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}

.chart {
  width: 100%;
  height: 300px;
}
</style>
