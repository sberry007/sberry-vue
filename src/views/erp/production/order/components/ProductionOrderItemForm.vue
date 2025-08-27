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
              <el-option 
                v-for="option in PRIORITY_OPTIONS" 
                :key="option.value" 
                :label="option.label" 
                :value="option.value" 
              />
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

// 类型定义
interface ProductionOrderItem {
  id?: number
  productId?: number
  productName: string
  productBarCode: string
  productUnitName: string
  productPrice: number
  warehouseId?: number
  warehouseName: string
  priority?: number
  remark: string
  count: number | string
  availableCount: number | string
  outCount?: number
}

interface WarehouseItem {
  id: number
  name: string
}

// 优先级选项常量
const PRIORITY_OPTIONS = [
  { value: 0, label: '低' },
  { value: 1, label: '普通' },
  { value: 2, label: '高' },
  { value: 3, label: '紧急' }
] as const

const message = useMessage()

// 在组件挂载时加载产品列表
onMounted(() => {
  getProductList()
})

const props = defineProps<{
  items: ProductionOrderItem[]
  disabled: boolean
  warehouseList?: WarehouseItem[]
  addMode?: 'manual' | 'order'
}>()

const formLoading = ref(false)
const formData = ref<ProductionOrderItem[]>([])
const formRef = ref()

// 产品列表
const productList = ref<ProductVO[]>([])

// 定义事件
const emit = defineEmits<{
  'update:items': [value: any[]]
}>()

// 计算属性：格式化后的表单数据
const formattedFormData = computed(() => {
  return formData.value.map(item => ({
    ...item,
    count: typeof item.count === 'string' ? item.count : String(item.count || 0),
    availableCount: typeof item.availableCount === 'string' ? item.availableCount : String(item.availableCount || 0)
  }))
})

// 计算属性：是否有有效的产品行
const hasValidItems = computed(() => {
  return formData.value.some(item => item.productId && parseFloat(String(item.count)) > 0)
})

// 计算属性：总计数量
const totalCount = computed(() => {
  return formData.value.reduce((sum, item) => {
    const count = parseFloat(String(item.count)) || 0
    return sum + count
  }, 0)
})

// 计算属性：总计金额
const totalAmount = computed(() => {
  return formData.value.reduce((sum, item) => {
    const count = parseFloat(String(item.count)) || 0
    const price = parseFloat(String(item.productPrice)) || 0
    return sum + (count * price)
  }, 0)
})

// 创建新行的工厂函数
const createNewRow = (): ProductionOrderItem => ({
  id: undefined,
  productId: undefined,
  productName: '',
  productBarCode: '',
  productUnitName: '',
  productPrice: 0,
  warehouseId: undefined,
  warehouseName: '',
  priority: 1,
  remark: '',
  count: '0',
  availableCount: '0',
  outCount: 0
})

// 通用数据更新函数
const updateFormData = (index: number, updates: Partial<ProductionOrderItem>) => {
  try {
    if (index < 0 || index >= formData.value.length) {
      console.error('Invalid index for updateFormData:', index)
      return
    }
    
    const updatedItems = [...formData.value]
     updatedItems[index] = syncItemData({ ...updatedItems[index], ...updates })
     formData.value = updatedItems
     emit('update:items', updatedItems.map(syncItemData))
  } catch (error) {
    console.error('Error updating form data:', error)
    message.error('更新数据失败')
  }
}

// 处理仓库变化
const handleWarehouseChange = (index: number, value: number | undefined) => {
  updateFormData(index, { warehouseId: value })
}

// 处理优先级变化
const handlePriorityChange = (index: number, value: number | undefined) => {
  updateFormData(index, { priority: value })
}

// 处理备注变化
const handleRemarkChange = (index: number, value: string) => {
  updateFormData(index, { remark: value })
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
      formData.value = val.map(item => syncItemData({
        ...item,
        // 确保 count 字段被正确保留并转换为字符串类型
        count: String(item.count || 0),
        // 关联订单模式：可生产数量 = 订单数量 - 已出库数量
        // 手动添加模式：可生产数量保持原值
        availableCount: String(props.addMode === 'manual' ? (item.availableCount || 0) : ((item.count || 0) - (item.outCount || 0))),
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

// 表单验证规则
const getValidationRules = () => ({
  productId: [{ required: true, message: '请选择产品', trigger: 'change' }],
  warehouseId: [{ required: true, message: '请选择仓库', trigger: 'change' }],
  count: [
    { required: true, message: '请输入订单数量', trigger: 'blur' },
    { 
      validator: (rule: any, value: any, callback: any) => {
        const numValue = parseFloat(value)
        if (isNaN(numValue) || numValue <= 0) {
          callback(new Error('订单数量必须大于0'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
})

// 数据同步工具函数
const syncItemData = (item: ProductionOrderItem): ProductionOrderItem => ({
  ...item,
  count: String(item.count || 0), // 显式保留 count 字段并确保为字符串类型
  availableCount: String(item.availableCount || 0) // 显式保留 availableCount 字段并确保为字符串类型
})

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
  try {
    const newItem = createNewRow()
    newItem.id = Date.now() // 临时ID
    
    const updatedItems = [...formData.value, newItem]
     formData.value = updatedItems
     emit('update:items', updatedItems.map(syncItemData))
  } catch (error) {
    console.error('Error adding new row:', error)
    message.error('添加新行失败')
  }
}

// 删除行
const deleteRow = (index: number) => {
  try {
    if (index < 0 || index >= formData.value.length) {
      console.error('Invalid index for deleteRow:', index)
      return
    }
    
    const updatedItems = [...formData.value]
     updatedItems.splice(index, 1)
     formData.value = updatedItems
     emit('update:items', updatedItems.map(syncItemData))
  } catch (error) {
    console.error('Error deleting row:', error)
    message.error('删除行失败')
  }
}

// 处理产品选择变化
const handleProductChange = async (index: number, productId: number) => {
  const selectedProduct = productList.value.find(p => p.id === productId)
  if (!selectedProduct) return
  
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
    
    const currentCount = parseFloat(formData.value[index].count) || 0
    
    // 手动添加模式下：如果已有订单数量，可生产数量与订单数量保持一致；否则设置为库存数量
    // 关联订单模式下：设置为实际库存数量
    let availableCount = stockCount || 0
    if (props.addMode === 'manual' && currentCount > 0) {
      availableCount = currentCount
    }
    
    updateFormData(index, {
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      productBarCode: selectedProduct.barCode || '',
      productUnitName: unitName,
      productPrice: selectedProduct.salePrice || selectedProduct.purchasePrice || 0,
      availableCount: String(availableCount)
    })
  } catch (error) {
    console.error('获取产品库存失败:', error)
    message.error('获取产品库存失败')
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

defineExpose({ 
  validate, 
  validateCounts, 
  formattedFormData, 
  hasValidItems, 
  totalCount, 
  totalAmount,
  addEmptyRow,
  deleteRow
})
</script>
