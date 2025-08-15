<template>
  <el-form
    ref="formRef"
    :model="formData"
    v-loading="formLoading"
    label-width="0px"
    :inline-message="true"
    :disabled="disabled"
  >
    <el-table 
      :data="formData" 
      show-summary 
      :summary-method="getSummaries" 
      class="-mt-10px"
      style="width: 100%"
      :scroll-x="true"
    >
      <el-table-column label="序号" type="index" align="center" width="60" />
      <el-table-column label="条码" min-width="150">
      <template #default="{ row }">
        <el-form-item class="mb-0px!">
          <el-input disabled v-model="row.productBarCode" />
        </el-form-item>
      </template>
    </el-table-column>
      <el-table-column label="产品名称" min-width="180">
        <template #default="{ row }">
          <el-form-item class="mb-0px!">
            <el-input disabled v-model="row.productName" />
          </el-form-item>
        </template>
      </el-table-column>

      <el-table-column label="单位" min-width="80">
        <template #default="{ row }">
          <el-form-item class="mb-0px!">
            <el-input disabled v-model="row.productUnitName" />
          </el-form-item>
        </template>
      </el-table-column>
      <el-table-column label="订单数量" prop="count" min-width="120">
        <template #default="{ row }">
          <el-form-item class="mb-0px!">
            <el-input disabled v-model="row.count" :formatter="erpCountInputFormatter" />
          </el-form-item>
        </template>
      </el-table-column>
<!--      <el-table-column label="已出库数量" min-width="120">-->
<!--        <template #default="{ row }">-->
<!--          <el-form-item class="mb-0px!">-->
<!--            <el-input disabled v-model="row.outCount" :formatter="erpCountInputFormatter" />-->
<!--          </el-form-item>-->
<!--        </template>-->
<!--      </el-table-column>-->
      <el-table-column label="可生产数量" min-width="120">
        <template #default="{ row }">
          <el-form-item class="mb-0px!">
            <el-input disabled v-model="row.availableCount" :formatter="erpCountInputFormatter" />
          </el-form-item>
        </template>
      </el-table-column>
      <el-table-column label="产品单价" min-width="120">
        <template #default="{ row }">
          <el-form-item class="mb-0px!">
            <el-input disabled v-model="row.productPrice" :formatter="erpPriceInputFormatter" />
          </el-form-item>
        </template>
      </el-table-column>
      
      <!-- 固定列：仓库、优先级、计划生产数量、备注 -->
      <el-table-column label="仓库" min-width="150" fixed="right">
        <template #default>
          <el-form-item class="mb-0px!">
            <el-select
              v-model="warehouseId"
              placeholder="请选择仓库"
              clearable
              filterable
              :disabled="disabled"
              class="!w-1/1"
              @change="handleWarehouseChange"
            >
              <el-option
                v-for="item in warehouseList"
                :key="item.id"
                :value="item.id"
                :label="item.name"
              />
            </el-select>
          </el-form-item>
        </template>
      </el-table-column>
      
      <el-table-column label="优先级" min-width="120" fixed="right">
        <template #default>
          <el-form-item class="mb-0px!">
            <el-select
              v-model="priority"
              placeholder="请选择优先级"
              clearable
              :disabled="disabled"
              class="!w-1/1"
              @change="handlePriorityChange"
            >
              <el-option :value="0" label="低" />
              <el-option :value="1" label="普通" />
              <el-option :value="2" label="高" />
              <el-option :value="3" label="紧急" />
            </el-select>
          </el-form-item>
        </template>
      </el-table-column>
      
      <el-table-column label="计划生产数量" min-width="140" fixed="right">
        <template #default>
          <el-form-item class="mb-0px!">
            <el-input 
              v-model="plannedQuantity" 
              placeholder="请输入计划生产数量" 
              :disabled="disabled"
              @input="handlePlannedQuantityChange"
            />
          </el-form-item>
        </template>
      </el-table-column>
      
      <el-table-column label="备注" min-width="150" fixed="right">
        <template #default>
          <el-form-item class="mb-0px!">
            <el-input 
              v-model="remark" 
              placeholder="请输入备注" 
              :disabled="disabled"
              @input="handleRemarkChange"
            />
          </el-form-item>
        </template>
      </el-table-column>
<!--      <el-table-column label="金额" prop="totalProductPrice" min-width="100">-->
<!--        <template #default="{ row }">-->
<!--          <el-form-item class="mb-0px!">-->
<!--            <el-input disabled v-model="row.totalProductPrice" :formatter="erpPriceInputFormatter" />-->
<!--          </el-form-item>-->
<!--        </template>-->
<!--      </el-table-column>-->
<!--      <el-table-column label="税率（%）" min-width="115">-->
<!--        <template #default="{ row }">-->
<!--          <el-form-item class="mb-0px!">-->
<!--            <el-input disabled v-model="row.taxPercent" :formatter="erpPriceInputFormatter" />-->
<!--          </el-form-item>-->
<!--        </template>-->
<!--      </el-table-column>-->
<!--      <el-table-column label="税额" prop="taxPrice" min-width="120">-->
<!--        <template #default="{ row }">-->
<!--          <el-form-item class="mb-0px!">-->
<!--            <el-input disabled v-model="row.taxPrice" :formatter="erpPriceInputFormatter" />-->
<!--          </el-form-item>-->
<!--        </template>-->
<!--      </el-table-column>-->
<!--      <el-table-column label="税额合计" prop="totalPrice" min-width="100">-->
<!--        <template #default="{ row }">-->
<!--          <el-form-item class="mb-0px!">-->
<!--            <el-input disabled v-model="row.totalPrice" :formatter="erpPriceInputFormatter" />-->
<!--          </el-form-item>-->
<!--        </template>-->
<!--      </el-table-column>-->
<!--      <el-table-column label="备注" min-width="150">-->
<!--        <template #default="{ row }">-->
<!--          <el-form-item class="mb-0px!">-->
<!--            <el-input disabled v-model="row.remark" />-->
<!--          </el-form-item>-->
<!--        </template>-->
<!--      </el-table-column>-->
    </el-table>
  </el-form>
</template>
<script setup lang="ts">
import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  getSumValue
} from '@/utils'

const props = defineProps<{
  items: any[]
  disabled: boolean
  warehouseList?: any[]
  warehouseId?: number
  priority?: number
  plannedQuantity?: string
  remark?: string
}>()

const formLoading = ref(false) // 表单的加载中
const formData = ref([])
const formRef = ref([]) // 表单 Ref

// 表单字段的响应式数据
const warehouseId = ref(props.warehouseId)
const priority = ref(props.priority)
const plannedQuantity = ref(props.plannedQuantity)
const remark = ref(props.remark)

// 定义事件
const emit = defineEmits<{
  'update:warehouseId': [value: number | undefined]
  'update:priority': [value: number | undefined]
  'update:plannedQuantity': [value: string | undefined]
  'update:remark': [value: string | undefined]
}>()

// 处理仓库变化
const handleWarehouseChange = (value: number | undefined) => {
  emit('update:warehouseId', value)
}

// 处理优先级变化
const handlePriorityChange = (value: number | undefined) => {
  emit('update:priority', value)
}

// 处理计划生产数量变化
const handlePlannedQuantityChange = (value: string) => {
  emit('update:plannedQuantity', value)
}

// 处理备注变化
const handleRemarkChange = (value: string) => {
  emit('update:remark', value)
}

// 监听props变化
watch(() => props.warehouseId, (val) => {
  warehouseId.value = val
}, { immediate: true })

watch(() => props.priority, (val) => {
  priority.value = val
}, { immediate: true })

watch(() => props.plannedQuantity, (val) => {
  plannedQuantity.value = val
}, { immediate: true })

watch(() => props.remark, (val) => {
  remark.value = val
}, { immediate: true })

/** 初始化设置产品项 */
watch(
  () => props.items,
  async (val) => {
    if (val && val.length > 0) {
      // 处理数据，计算可生产数量
      formData.value = val.map(item => ({
        ...item,
        availableCount: (item.count || 0) - (item.outCount || 0)
      }))
    } else {
      formData.value = []
    }
  },
  { immediate: true }
)

/** 合计 */
const getSummaries = (param: SummaryMethodProps) => {
  const { columns, data } = param
  const sums: string[] = []
  columns.forEach((column, index: number) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    if (['count', 'outCount', 'availableCount', 'totalProductPrice', 'taxPrice', 'totalPrice'].includes(column.property)) {
      const sum = getSumValue(data.map((item) => Number(item[column.property])))
      sums[index] = ['count', 'outCount', 'availableCount'].includes(column.property) 
        ? erpCountInputFormatter(sum) 
        : erpPriceInputFormatter(sum)
    } else {
      sums[index] = ''
    }
  })

  return sums
}

/** 表单校验 */
const validate = () => {
  return formRef.value.validate()
}
defineExpose({ validate })
</script>