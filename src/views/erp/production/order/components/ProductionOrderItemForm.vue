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
        <template #default="{ row, $index }">
          <el-form-item class="mb-0px!">
            <el-select 
              v-if="!disabled && props.addMode === 'manual'"
              v-model="row.productId" 
              placeholder="请选择产品" 
              filterable 
              clearable
              style="width: 100%"
              @change="(value) => handleProductChange($index, value)"
            >
              <el-option
                v-for="product in productList"
                :key="product.id"
                :label="product.name"
                :value="product.id"
              />
            </el-select>
            <el-input v-else disabled v-model="row.productName" />
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
        <template #default="{ row, $index }">
          <el-form-item 
            class="mb-0px!"
            :prop="`${$index}.count`"
            :rules="[
              { required: true, message: '请输入订单数量', trigger: 'blur' },
              { 
                validator: (rule, value, callback) => {
                  const count = parseFloat(value) || 0
                  if (count <= 0) {
                    callback(new Error('订单数量必须大于0'))
                    return
                  }
                  
                  // 手动添加模式下不限制可生产数量
                  if (props.addMode === 'manual') {
                    callback()
                    return
                  }
                  
                  // 关联订单模式下需要检查可生产数量
                  const availableCount = parseFloat(row.availableCount) || 0
                  if (count > availableCount) {
                    callback(new Error(`订单数量不能超过可生产数量(${availableCount})`))
                  } else {
                    callback()
                  }
                }, 
                trigger: 'blur' 
              }
            ]"
          >
            <el-input 
              :disabled="disabled || props.addMode !== 'manual'" 
              v-model="row.count" 
              :formatter="erpCountInputFormatter"
              @input="(value) => handleCountChange($index, value)"
              @blur="() => validateSingleField($index, 'count')"
            />
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
            <el-input 
              :disabled="disabled || props.addMode !== 'manual'" 
              v-model="row.productPrice" 
              :formatter="erpPriceInputFormatter" 
            />
          </el-form-item>
        </template>
      </el-table-column>
      
      <!-- 固定列：仓库、优先级、计划生产数量、备注 -->
      <el-table-column label="仓库" min-width="150" fixed="right">
        <template #default="{ row, $index }">
          <el-form-item class="mb-0px!">
            <el-select
              v-model="row.warehouseId"
              placeholder="请选择仓库"
              clearable
              filterable
              :disabled="disabled"
              class="!w-1/1"
              @change="(value) => handleWarehouseChange($index, value)"
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
        <template #default="{ row, $index }">
          <el-form-item class="mb-0px!">
            <el-select
              v-model="row.priority"
              placeholder="请选择优先级"
              clearable
              :disabled="disabled"
              class="!w-1/1"
              @change="(value) => handlePriorityChange($index, value)"
            >
              <el-option :value="0" label="低" />
              <el-option :value="1" label="普通" />
              <el-option :value="2" label="高" />
              <el-option :value="3" label="紧急" />
            </el-select>
          </el-form-item>
        </template>
      </el-table-column>
      

      
      <el-table-column label="备注" min-width="150" fixed="right">
        <template #default="{ row, $index }">
          <el-form-item class="mb-0px!">
            <el-input 
              v-model="row.remark" 
              placeholder="请输入备注" 
              :disabled="disabled"
              @input="(value) => handleRemarkChange($index, value)"
            />
          </el-form-item>
        </template>
      </el-table-column>
    </el-table>
  </el-form>
  <el-row justify="center" class="mt-3" v-if="!disabled && props.addMode === 'manual'">
    <el-button @click="addEmptyRow" round>+ 添加产品行</el-button>
  </el-row>

</template>
<script setup lang="ts">
import {
  erpCountInputFormatter,
  erpPriceInputFormatter,
  getSumValue
} from '@/utils'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { StockApi } from '@/api/erp/stock/stock'
import { useMessage } from '@/hooks/web/useMessage'

const message = useMessage()

// 在组件挂载时加载产品列表
onMounted(() => {
  getProductList()
})

const props = defineProps<{
  items: any[]
  disabled: boolean
  warehouseList?: any[]
  addMode?: string
}>()

const formLoading = ref(false) // 表单的加载中
const formData = ref([])
const formRef = ref([]) // 表单 Ref

// 产品列表
const productList = ref<ProductVO[]>([])

// 定义事件
const emit = defineEmits<{
  'update:items': [value: any[]]
}>()

// 处理仓库变化
const handleWarehouseChange = (index: number, value: number | undefined) => {
  const updatedItems = [...formData.value]
  updatedItems[index] = { ...updatedItems[index], warehouseId: value }
  formData.value = updatedItems
  emit('update:items', updatedItems)
}

// 处理优先级变化
const handlePriorityChange = (index: number, value: number | undefined) => {
  const updatedItems = [...formData.value]
  updatedItems[index] = { ...updatedItems[index], priority: value }
  formData.value = updatedItems
  emit('update:items', updatedItems)
}



// 处理备注变化
const handleRemarkChange = (index: number, value: string) => {
  const updatedItems = [...formData.value]
  updatedItems[index] = { ...updatedItems[index], remark: value }
  formData.value = updatedItems
  emit('update:items', updatedItems)
}

// 处理订单数量变化
const handleCountChange = (index: number, value: string) => {
  const updatedItems = [...formData.value]
  const count = parseFloat(value) || 0
  const availableCount = parseFloat(updatedItems[index].availableCount) || 0
  
  // 关联订单模式下：实时验证订单数量不能超过可生产数量
  if (props.addMode !== 'manual' && count > availableCount && availableCount > 0) {
    message.warning(`订单数量不能超过可生产数量(${availableCount})`)
  }
  
  // 手动添加模式下：可生产数量与订单数量保持一致
  if (props.addMode === 'manual') {
    updatedItems[index] = { ...updatedItems[index], count: value, availableCount: value }
  } else {
    // 关联订单模式下：只更新订单数量，不影响可生产数量
    updatedItems[index] = { ...updatedItems[index], count: value }
  }
  
  formData.value = updatedItems
  emit('update:items', updatedItems)
}

/** 初始化设置产品项 */
watch(
  () => props.items,
  async (val) => {
    if (val && val.length > 0) {
      // 处理数据，根据模式计算可生产数量
      formData.value = val.map(item => ({
        ...item,
        // 关联订单模式：可生产数量 = 订单数量 - 已出库数量
        // 手动添加模式：可生产数量保持原值（通过产品选择时更新为库存数量）
        availableCount: props.addMode === 'manual' ? (item.availableCount || 0) : ((item.count || 0) - (item.outCount || 0)),
        warehouseId: item.warehouseId || undefined,
        priority: item.priority !== undefined ? item.priority : undefined,
        remark: item.remark || ''
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

// 获取产品列表
const getProductList = async () => {
  try {
    const data = await ProductApi.getProductSimpleList()
    productList.value = data
  } catch (error) {
    console.error('获取产品列表失败:', error)
  }
}

// 添加空行
const addEmptyRow = () => {
  const newItem = {
    id: Date.now(), // 临时ID
    productId: undefined,
    productName: '',
    productBarCode: '',
    productUnitName: '',
    productPrice: 0,
    warehouseId: undefined,
    warehouseName: '',
    priority: 1,
    remark: '',
    count: 0,
    availableCount: 0 // 初始化为0，选择产品后会更新为实际库存
  }
  
  const updatedItems = [...formData.value, newItem]
  formData.value = updatedItems
  emit('update:items', updatedItems)
}

// 处理产品选择变化
const handleProductChange = async (index: number, productId: number) => {
  const selectedProduct = productList.value.find(p => p.id === productId)
  if (selectedProduct) {
    try {
      // 获取产品库存数量
      const stockCount = await StockApi.getStockCount(productId)
      
      // 获取产品单位名称
      let unitName = selectedProduct.unitName || ''
      if (!unitName && selectedProduct.unitId) {
        try {
          const { ProductUnitApi } = await import('@/api/erp/product/unit')
          const unit = await ProductUnitApi.getProductUnit(selectedProduct.unitId)
          unitName = unit?.name || ''
        } catch (error) {
          console.error('获取产品单位信息失败:', error)
        }
      }
      
      const updatedItems = [...formData.value]
      const currentCount = parseFloat(updatedItems[index].count) || 0
      
      // 手动添加模式下：如果已有订单数量，可生产数量与订单数量保持一致；否则设置为库存数量
      // 关联订单模式下：设置为实际库存数量
      let availableCount = stockCount || 0
      if (props.addMode === 'manual' && currentCount > 0) {
        availableCount = currentCount
      }
      
      updatedItems[index] = {
        ...updatedItems[index],
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        productBarCode: selectedProduct.barCode || '',
        productUnitName: unitName,
        productPrice: selectedProduct.salePrice || selectedProduct.purchasePrice || 0,
        availableCount: availableCount
      }
      formData.value = updatedItems
      emit('update:items', updatedItems)
    } catch (error) {
      console.error('获取产品库存失败:', error)
      message.error('获取产品库存失败')
    }
  }
}

// 单个字段验证
const validateSingleField = (index: number, field: string) => {
  const fieldName = `${index}.${field}`
  if (formRef.value && formRef.value.validateField) {
    formRef.value.validateField(fieldName)
  }
}

/** 表单校验 */
const validate = () => {
  return formRef.value.validate()
}

/** 验证所有订单数量是否符合要求 */
const validateCounts = () => {
  const errors = []
  formData.value.forEach((item, index) => {
    const count = parseFloat(item.count) || 0
    const availableCount = parseFloat(item.availableCount) || 0
    
    if (count <= 0) {
      errors.push(`第${index + 1}行：订单数量必须大于0`)
    } else if (count > availableCount && availableCount > 0) {
      errors.push(`第${index + 1}行：订单数量(${count})不能超过可生产数量(${availableCount})`)
    }
  })
  
  if (errors.length > 0) {
    message.error(errors.join('\n'))
    return false
  }
  return true
}

defineExpose({ validate, validateCounts })
</script>
