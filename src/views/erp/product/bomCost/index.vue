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
      <el-form-item label="BOM编码" prop="bomCode">
        <el-input
          v-model="queryParams.bomCode"
          placeholder="请输入BOM编码"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="产品名称" prop="productName">
        <el-input
          v-model="queryParams.productName"
          placeholder="请输入产品名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="成本版本" prop="costVersion">
        <el-input
          v-model="queryParams.costVersion"
          placeholder="请输入成本版本（支持模糊搜索）"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        >
          <template #prepend>
            <el-select v-model="versionSearchType" style="width: 80px">
              <el-option label="包含" value="like" />
              <el-option label="等于" value="eq" />
              <el-option label="开头" value="start" />
              <el-option label="结尾" value="end" />
            </el-select>
          </template>
        </el-input>
      </el-form-item>
      <el-form-item label="版本范围" prop="versionRange">
        <el-input
          v-model="queryParams.versionStart"
          placeholder="起始版本"
          clearable
          style="width: 110px"
        />
        <span style="margin: 0 8px">至</span>
        <el-input
          v-model="queryParams.versionEnd"
          placeholder="结束版本"
          clearable
          style="width: 110px"
        />
      </el-form-item>
      <el-form-item label="计算日期" prop="calculationDate">
        <el-date-picker
          v-model="queryParams.calculationDate"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="datetimerange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="当前版本" prop="isCurrent">
        <el-select v-model="queryParams.isCurrent" placeholder="请选择" clearable class="!w-240px">
          <el-option label="是" :value="true" />
          <el-option label="否" :value="false" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['erp:product-bom-cost:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="openCompare()"
          v-hasPermi="['erp:product-bom-cost:query']"
        >
          <Icon icon="ep:data-analysis" class="mr-5px" /> 版本对比
        </el-button>
        <el-button
          type="warning"
          plain
          @click="openTrend()"
          v-hasPermi="['erp:product-bom-cost:query']"
        >
          <Icon icon="ep:trend-charts" class="mr-5px" /> 趋势分析
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:product-bom-cost:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true" class="cost-table">
      <el-table-column label="BOM编码" align="center" prop="bomCode" width="180" show-overflow-tooltip />
      <el-table-column label="BOM名称" align="center" prop="bomName" width="160" show-overflow-tooltip />
      <el-table-column label="产品名称" align="center" prop="productName" width="160" show-overflow-tooltip />
      <el-table-column label="成本版本" align="center" prop="costVersion" width="140">
        <template #default="scope">
          <div class="version-container">
            <el-tag 
              :type="scope.row.isCurrent ? 'success' : 'primary'"
              :effect="scope.row.isCurrent ? 'dark' : 'light'"
              size="small"
              class="version-tag"
            >
              {{ scope.row.costVersion }}
            </el-tag>
            <el-icon v-if="scope.row.isCurrent" class="current-icon">
              <StarFilled />
            </el-icon>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="材料成本" align="center" prop="totalMaterialCost" width="110">
        <template #default="scope">
          <span class="cost-value material-cost">{{ formatCurrency(scope.row.totalMaterialCost) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="人工成本" align="center" prop="totalLaborCost" width="110">
        <template #default="scope">
          <span class="cost-value labor-cost">{{ formatCurrency(scope.row.totalLaborCost) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="制造费用" align="center" prop="totalOverheadCost" width="110">
        <template #default="scope">
          <span class="cost-value overhead-cost">{{ formatCurrency(scope.row.totalOverheadCost) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="总成本" align="center" prop="totalCost" width="120">
        <template #default="scope">
          <span class="cost-value total-cost">{{ formatCurrency(scope.row.totalCost) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="单位成本" align="center" prop="unitCost" width="120">
        <template #default="scope">
          <span class="cost-value unit-cost">{{ formatCurrency(scope.row.unitCost) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="计算人" align="center" prop="calculatedByName" width="100" />
      <el-table-column label="计算日期" align="center" prop="calculationDate" width="120">
        <template #default="scope">
          <span>{{ formatCalculationDate(scope.row.calculationDate) }}</span>
        </template>
      </el-table-column>
<!--      <el-table-column label="当前版本" align="center" prop="isCurrent" width="100">-->
<!--        <template #default="scope">-->
<!--          <el-tag -->
<!--            :type="scope.row.isCurrent ? 'success' : 'info'"-->
<!--            :effect="scope.row.isCurrent ? 'dark' : 'plain'"-->
<!--            size="small"-->
<!--          >-->
<!--            <el-icon class="mr-1">-->
<!--              <Check v-if="scope.row.isCurrent" />-->
<!--              <Close v-else />-->
<!--            </el-icon>-->
<!--            {{ scope.row.isCurrent ? '当前' : '历史' }}-->
<!--          </el-tag>-->
<!--        </template>-->
<!--      </el-table-column>-->
      <el-table-column label="创建时间" align="center" prop="createTime" width="180">
        <template #default="scope">
          <span>{{ formatCreateTime(scope.row.createTime) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="320" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:product-bom-cost:update']"
          >
            编辑
          </el-button>
          <el-button
              link
              type="primary"
              @click="openDetail(scope.row.id)"
              v-hasPermi="['erp:product-bom-cost:query']"
            >
              详情
            </el-button>
            <el-button
               link
               type="success"
               @click="openCompare(scope.row.bomId)"
               v-hasPermi="['erp:product-bom-cost:query']"
             >
               对比
             </el-button>
             <el-button
               link
               type="warning"
               @click="openTrend(scope.row.bomId)"
               v-hasPermi="['erp:product-bom-cost:query']"
             >
               趋势
             </el-button>
            <el-button
              link
              type="primary"
              @click="handleSetCurrent(scope.row)"
              :disabled="scope.row.isCurrent"
              v-hasPermi="['erp:product-bom-cost:update']"
            >
              设为当前
            </el-button>
            <el-button
              link
              type="danger"
              @click="handleDelete(scope.row.id)"
              v-hasPermi="['erp:product-bom-cost:delete']"
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
  <ProductBomCostForm ref="formRef" @success="getList" />
  <!-- 表单弹窗：详情 -->
  <ProductBomCostDetail ref="detailRef" />
  <!-- 版本对比弹窗 -->
  <ProductBomCostCompare ref="compareRef" />
  <!-- 趋势分析弹窗 -->
  <ProductBomCostTrend ref="trendRef" />
</template>

<script setup lang="ts">
import { formatDate as formatDateUtil } from '@/utils/formatTime'
import download from '@/utils/download'
import { ProductBomCostApi, ProductBomCostVO } from '@/api/erp/product/bomCost'
import ProductBomCostForm from './ProductBomCostForm.vue'
import ProductBomCostDetail from './ProductBomCostDetail.vue'
import ProductBomCostCompare from './ProductBomCostCompare.vue'
import ProductBomCostTrend from './ProductBomCostTrend.vue'
import { StarFilled } from '@element-plus/icons-vue'

/** BOM成本计算 列表 */
defineOptions({ name: 'ErpProductBomCost' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<ProductBomCostVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  bomCode: undefined,
  productName: undefined,
  costVersion: undefined,
  versionStart: undefined,
  versionEnd: undefined,
  calculationDate: undefined,
  isCurrent: undefined,
  calculatedBy: undefined
})

// 版本搜索类型
const versionSearchType = ref('like')
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProductBomCostApi.getProductBomCostPage(queryParams)
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
  queryParams.pageNo = 1
  queryParams.bomCode = undefined
  queryParams.productName = undefined
  queryParams.costVersion = undefined
  queryParams.versionStart = undefined
  queryParams.versionEnd = undefined
  queryParams.calculationDate = undefined
  queryParams.isCurrent = undefined
  queryParams.calculatedBy = undefined
  versionSearchType.value = 'like'
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 详情操作 */
const detailRef = ref()
const openDetail = (id: number) => {
  detailRef.value.open(id)
}

/** 版本对比操作 */
const compareRef = ref()
const openCompare = (bomId?: number) => {
  compareRef.value.open(bomId)
}

/** 趋势分析操作 */
const trendRef = ref()
const openTrend = (bomId?: number) => {
  trendRef.value.open(bomId)
}

/** 设置当前版本操作 */
const handleSetCurrent = async (row: ProductBomCostVO) => {
  try {
    // 二次确认
    await message.confirm(`确认设置成本版本"${row.costVersion}"为当前版本吗？`)
    // 发起设置
    await ProductBomCostApi.setCurrentVersion(row.id)
    message.success('设置成功')
    // 刷新列表
    await getList()
  } catch {}
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ProductBomCostApi.deleteProductBomCost(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await ProductBomCostApi.exportProductBomCost(queryParams)
    download.excel(data, 'BOM成本计算.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 格式化计算日期 (date类型) */
const formatCalculationDate = (date: string) => {
  if (!date) return ''
  // 处理数组格式的日期 [2025, 8, 22]
  if (Array.isArray(date)) {
    const [year, month, day] = date
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return formatDateUtil(new Date(date), 'YYYY-MM-DD')
}

/** 格式化创建时间 (datetime类型) */
const formatCreateTime = (date: string) => {
  return formatDateUtil(new Date(date), 'YYYY-MM-DD HH:mm:ss')
}

/** 格式化货币 */
const formatCurrency = (value: number) => {
  if (value === null || value === undefined) return '0.00'
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>

<style scoped>
.cost-value.material-cost {
  color: #5470c6;
}

.cost-value.labor-cost {
  color: #91cc75;
}

.cost-value.overhead-cost {
  color: #fac858;
}

.cost-value.total-cost {
  color: #e74c3c;
  font-weight: bold;
}

.cost-value.unit-cost {
  color: #27ae60;
  font-weight: bold;
}

.version-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.version-tag {
  font-weight: 500;
}

.current-icon {
  color: #f39c12;
  font-size: 14px;
}
</style>
