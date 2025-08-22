<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="产品" prop="productId">
        <el-select v-model="formData.productId" placeholder="请选择产品" clearable class="!w-240px">
          <el-option
            v-for="product in productList"
            :key="product.id"
            :label="product.name"
            :value="product.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="源单位" prop="fromUnitId">
        <el-select
          v-model="formData.fromUnitId"
          placeholder="请选择源单位"
          clearable
          class="!w-240px"
        >
          <el-option v-for="unit in unitList" :key="unit.id" :label="unit.name" :value="unit.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="目标单位" prop="toUnitId">
        <el-select
          v-model="formData.toUnitId"
          placeholder="请选择目标单位"
          clearable
          class="!w-240px"
        >
          <el-option v-for="unit in unitList" :key="unit.id" :label="unit.name" :value="unit.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="换算系数" prop="conversionFactor">
        <el-input v-model="formData.conversionFactor" placeholder="请输入换算系数" />
      </el-form-item>
      <el-form-item label="是否启用" prop="isActive">
        <el-radio-group v-model="formData.isActive">
          <el-radio-group v-model="formData.isActive" :disabled="formType === 'detail'">
            <el-radio
              v-for="dict in getBoolDictOptions(DICT_TYPE.INFRA_BOOLEAN_STRING)"
              :key="dict.value"
              :label="dict.value"
            >
              {{ dict.label }}
            </el-radio>
          </el-radio-group>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { ProductUnitConversionApi, ProductUnitConversionVO } from '@/api/erp/product/unitConvert'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { ProductUnitApi, ProductUnitVO } from '@/api/erp/product/unit'
import { DICT_TYPE, getBoolDictOptions } from '@/utils/dict'
import { watch } from 'vue'

/** 产品单位换算 表单 */
defineOptions({ name: 'ProductUnitConversionForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const productList = ref<ProductVO[]>([]) // 产品列表
const unitList = ref<ProductUnitVO[]>([]) // 单位列表
const formData = ref({
  id: undefined as number | undefined,
  productId: undefined as number | undefined,
  fromUnitId: undefined as number | undefined,
  toUnitId: undefined as number | undefined,
  conversionFactor: undefined as number | undefined,
  isActive: undefined as boolean | undefined
})
const formRules = reactive({
  productId: [{ required: true, message: '产品不能为空', trigger: 'blur' }],
  fromUnitId: [{ required: true, message: '源单位不能为空', trigger: 'blur' }],
  toUnitId: [{ required: true, message: '目标单位不能为空', trigger: 'blur' }],
  conversionFactor: [{ required: true, message: '换算系数不能为空', trigger: 'blur' }],
  isActive: [{ required: true, message: '是否启用不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref

/** 获取产品列表 */
const getProductList = async () => {
  try {
    const data = await ProductApi.getProductSimpleList()
    productList.value = data
  } catch {}
}

/** 获取单位列表 */
const getUnitList = async () => {
  try {
    unitList.value = await ProductUnitApi.getProductUnitSimpleList()
  } catch {}
}

/** 获取换算系数 */
const getConversionFactor = async () => {
  const { productId, fromUnitId, toUnitId } = formData.value
  if (productId && fromUnitId && toUnitId && fromUnitId !== toUnitId) {
    try {
      formData.value.conversionFactor = await ProductUnitConversionApi.getConversionFactor(
        productId,
        fromUnitId,
        toUnitId
      )
    } catch (error) {
      // 清空换算系数，让用户手动输入
      formData.value.conversionFactor = undefined
    }
  }
}

/** 监听产品、源单位、目标单位的变化，自动获取换算系数 */
watch(
  () => [formData.value.productId, formData.value.fromUnitId, formData.value.toUnitId],
  () => {
      getConversionFactor()
  },
  { deep: true }
)

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 获取产品和单位列表
  await getProductList()
  await getUnitList()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await ProductUnitConversionApi.getProductUnitConversion(id)
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ProductUnitConversionVO
    if (formType.value === 'create') {
      await ProductUnitConversionApi.createProductUnitConversion(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProductUnitConversionApi.updateProductUnitConversion(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    productId: undefined,
    fromUnitId: undefined,
    toUnitId: undefined,
    conversionFactor: undefined,
    isActive: true
  }
  formRef.value?.resetFields()
}
</script>
