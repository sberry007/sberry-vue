<template>
  <div class="bom-item-list">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :disabled="disabled"
      :inline-message="true"
      :model="{ items: formData }"
      :rules="formRules"
      label-width="0px"
    >
      <el-table
        :data="formData"
        :max-height="500"
        :summary-method="getSummaries"
        show-summary
        style="width: 100%"
      >
        <el-table-column align="center" label="序号" type="index" width="60" />
        <el-table-column label="物料名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row, $index }">
            <el-form-item
              :prop="`items.${$index}.materialId`"
              :rules="formRules.materialId"
              class="mb-0px!"
            >
              <el-select
                v-model="row.materialId"
                clearable
                filterable
                placeholder="请选择物料"
                style="width: 100%"
                @change="onChangeMaterial($event, row)"
              >
                <el-option
                  v-for="item in materialList"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="物料编码" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <el-form-item class="mb-0px!">
              <el-input v-model="row.materialCode" disabled style="width: 100%" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="规格型号" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-form-item class="mb-0px!">
              <el-input v-model="row.materialSpec" disabled style="width: 100%" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="单位" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <el-form-item class="mb-0px!">
              <el-input v-model="row.unitName" disabled style="width: 100%" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="需求数量" min-width="120" prop="requiredQty">
          <template #default="{ row, $index }">
            <el-form-item
              :prop="`items.${$index}.requiredQty`"
              :rules="formRules.requiredQty"
              class="mb-0px!"
            >
              <el-input-number
                v-model="row.requiredQty"
                :min="0.001"
                :precision="3"
                class="!w-100%"
                controls-position="right"
              />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="损耗率(%)" min-width="100">
          <template #default="{ row, $index }">
            <el-form-item :prop="`items.${$index}.wastageRate`" class="mb-0px!">
              <el-input-number
                v-model="row.wastageRate"
                :max="100"
                :min="0"
                :precision="2"
                class="!w-100%"
                controls-position="right"
              />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column fixed="right" label="关键物料" min-width="100">
          <template #default="{ row, $index }">
            <el-form-item :prop="`items.${$index}.isKeyMaterial`" class="mb-0px!">
              <el-switch v-model="row.isKeyMaterial" :disabled="disabled" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="替代组" min-width="120" show-overflow-tooltip>
          <template #default="{ row, $index }">
            <el-form-item :prop="`items.${$index}.substituteGroup`" class="mb-0px!">
              <el-input v-model="row.substituteGroup" placeholder="请输入替代组" style="width: 100%" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column label="备注" min-width="200" show-overflow-tooltip>
          <template #default="{ row, $index }">
            <el-form-item :prop="`items.${$index}.notes`" class="mb-0px!">
              <el-input v-model="row.notes" placeholder="请输入备注" style="width: 100%" />
            </el-form-item>
          </template>
        </el-table-column>
        <el-table-column align="center" fixed="right" label="操作" width="60">
          <template #default="{ $index }">
            <el-button link @click="handleDelete($index)">—</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-form>
  </div>
  <el-row v-if="!disabled" class="mt-3" justify="center">
    <el-button round @click="handleAdd">+ 添加BOM明细</el-button>
  </el-row>
</template>

<script lang="ts" setup>
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { erpCountInputFormatter, getSumValue } from '@/utils'

interface BomItemRow {
  id?: number
  bomId?: number
  materialId?: number
  materialCode?: string
  materialName?: string
  materialSpec?: string
  unitId?: number
  unitName?: string
  sequenceNo?: number
  requiredQty?: number
  wastageRate?: number
  isKeyMaterial?: boolean
  substituteGroup?: string
  notes?: string
}

const props = defineProps<{
  modelValue: BomItemRow[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: BomItemRow[]]
}>()

const formLoading = ref(false) // 表单的加载中
const formData = ref<BomItemRow[]>([])
const formRules = reactive({
  materialId: [{ required: true, message: '物料不能为空', trigger: 'blur' }],
  requiredQty: [{ required: true, message: '需求数量不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref
const materialList = ref<ProductVO[]>([]) // 物料列表（使用产品作为物料）

/** 初始化设置BOM明细项 */
watch(
  () => props.modelValue,
  async (val) => {
    formData.value = val || []
  },
  { immediate: true }
)

/** 监听BOM明细变化，同步到父组件 */
watch(
  () => formData.value,
  (val) => {
    emit('update:modelValue', val)
  },
  { deep: true }
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
    if (['requiredQty'].includes(column.property)) {
      const sum = getSumValue(data.map((item) => Number(item[column.property])))
      sums[index] = erpCountInputFormatter(sum)
    } else {
      sums[index] = ''
    }
  })

  return sums
}

/** 新增按钮操作 */
const handleAdd = () => {
  const row: BomItemRow = {
    id: undefined,
    bomId: undefined,
    materialId: undefined,
    materialCode: undefined,
    materialName: undefined,
    materialSpec: undefined,
    unitId: undefined,
    unitName: undefined,
    sequenceNo: formData.value.length + 1,
    requiredQty: 1,
    wastageRate: 0,
    isKeyMaterial: false,
    substituteGroup: undefined,
    notes: undefined
  }
  formData.value.push(row)
}

/** 删除按钮操作 */
const handleDelete = (index: number) => {
  formData.value.splice(index, 1)
  // 重新排序
  formData.value.forEach((item, idx) => {
    item.sequenceNo = idx + 1
  })
}

/** 处理物料变更 */
const onChangeMaterial = (materialId: number, row: BomItemRow) => {
  const material = materialList.value.find((item) => item.id === materialId)
  if (material) {
    row.materialName = material.name
    row.materialCode = material.barCode
    row.materialSpec = material.standard
    row.unitId = material.unitId
    row.unitName = material.unitName
  }
}

/** 表单校验 */
const validate = () => {
  return formRef.value.validate()
}

/** 获取表单数据 */
const getFormData = () => {
  return formData.value
}

defineExpose({ validate, getFormData })

/** 初始化 */
onMounted(async () => {
  // 加载物料列表（只显示原材料类型的产品）
  materialList.value = await ProductApi.getProductSimpleListByType('RM')

  // 如果没有数据，默认添加一个
  if (formData.value.length === 0) {
    handleAdd()
  }
})
</script>
