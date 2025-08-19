<!-- ERP 产品的新增/修改 -->
<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="900px">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-row :gutter="15">
        <el-col :span="12">
          <el-form-item label="条码" prop="barCode">
            <el-input v-model="formData.barCode" placeholder="保存时自动生成" disabled/>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="类型" prop="productType">
            <el-select
              v-model="formData.productType"
              placeholder="请选择产品类型"
              clearable class="w-1/1"
              @change="getProductCategoryListByProductType(formData.productType)"
            >
              <el-option
                v-for="dict in getStrDictOptions(DICT_TYPE.ERP_PRODUCT_TYPE)"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="分类" prop="categoryId">
            <el-tree-select
              :disabled="categoryList.length == 0"
              v-model="formData.categoryId"
              :data="categoryList"
              :props="defaultProps"
              check-strictly
              filterable
              default-expand-all
              :placeholder="categoryList.length == 0 ? '请先选择产品类型' : '请选择分类'"
              class="w-1/1"
              @change="handleCategoryChange"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="单位" prop="unitId">
            <el-select v-model="formData.unitId" clearable placeholder="请选择单位" class="w-1/1">
              <el-option
                v-for="unit in unitList"
                :key="unit.id"
                :label="unit.name"
                :value="unit.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-radio-group v-model="formData.status">
              <el-radio
                v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
                :key="dict.value"
                :value="dict.value"
              >
                {{ dict.label }}
              </el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规格" prop="standard">
            <el-input v-model="formData.standard" placeholder="请输入规格" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="保质期天数" prop="expiryDay">
            <el-input-number
              v-model="formData.expiryDay"
              placeholder="请输入保质期天数"
              :min="0"
              :precision="0"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="重量（kg）" prop="weight">
            <el-input-number
              v-model="formData.weight"
              placeholder="请输入重量（kg）"
              :min="0"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="采购价格" prop="purchasePrice">
            <el-input-number
              v-model="formData.purchasePrice"
              placeholder="请输入采购价格，单位：元"
              :min="0"
              :precision="2"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="销售价格" prop="salePrice">
            <el-input-number
              v-model="formData.salePrice"
              placeholder="请输入销售价格，单位：元"
              :min="0"
              :precision="2"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最低价格" prop="minPrice">
            <el-input-number
              v-model="formData.minPrice"
              placeholder="请输入最低价格，单位：元"
              :min="0"
              :precision="2"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input type="textarea" v-model="formData.remark" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { ProductCategoryApi, ProductCategoryVO } from '@/api/erp/product/category'
import { ProductUnitApi, ProductUnitVO } from '@/api/erp/product/unit'
import { CommonStatusEnum } from '@/utils/constants'
import { defaultProps, handleTree } from '@/utils/tree'
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'

/** ERP 产品 表单 */
defineOptions({ name: 'ProductForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  name: undefined,
  barCode: undefined,
  categoryId: undefined,
  productType:undefined,
  unitId: undefined,
  status: undefined,
  standard: undefined,
  remark: undefined,
  expiryDay: undefined,
  weight: undefined,
  purchasePrice: undefined,
  salePrice: undefined,
  minPrice: undefined
})
const formRules = reactive({
  name: [{ required: true, message: '产品名称不能为空', trigger: 'blur' }],
  // barCode: [{ required: true, message: '产品条码不能为空', trigger: 'blur' }],
  categoryId: [{ required: true, message: '产品分类编号不能为空', trigger: 'blur' }],
  productType: [{ required: true, message: '产品类型不能为空', trigger: 'blur' }],
  unitId: [{ required: true, message: '单位编号不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '产品状态不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref
const categoryList = ref<ProductCategoryVO[]>([]) // 产品分类列表
const unitList = ref<ProductUnitVO[]>([]) // 产品单位列表
const previousCategoryId = ref<number | undefined>() // 保存之前选择的分类ID

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await ProductApi.getProduct(id)
      // 初始化之前的分类ID
      previousCategoryId.value = formData.value.categoryId
    } finally {
      formLoading.value = false
    }
  }
  // 产品分类
  await getProductCategoryListByProductType(formData.value.productType)
  // 产品单位
  unitList.value = await ProductUnitApi.getProductUnitSimpleList()
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/**
 * 根据产品类型获取分类列表
 */
const getProductCategoryListByProductType = async (productType?:string) => {
  if (!productType) {
    // 如果产品分类为空，清除分类列表
    categoryList.value = []
    return
  }
  const categoryData = await ProductCategoryApi.getProductCategoryListByProductType(productType)
  categoryList.value = handleTree(categoryData, 'id', 'parentId')
}

/** 处理分类选择变化 */
const handleCategoryChange = (categoryId: number) => {
  if (categoryId && !checkSelectedCategoryIsLeaf(categoryId)) {
    // 恢复到之前的选择，不改变当前选择
    nextTick(() => {
      formData.value.categoryId = previousCategoryId.value
    })
  } else {
    // 如果是叶子节点，更新之前的值
    previousCategoryId.value = categoryId
  }
}

/** 校验所选分类是否为叶子节点分类 */
const checkSelectedCategoryIsLeaf = (categoryId: number) => {
  // 如果没有选择分类，则返回 true
  if (!categoryId) return true
  
  // 查找选中的节点
  const selectedNode = findNodeInTree(categoryList.value, categoryId)
  if (!selectedNode) {
    message.warning('所选分类不存在')
    return false
  }
  
  // 检查是否为叶子节点（没有子节点或子节点数组为空）
  const isLeaf = !selectedNode.children || selectedNode.children.length === 0
  if (!isLeaf) {
    message.warning('请选择叶子节点分类')
    return false
  }
  
  return true
}

/** 在树形结构中查找指定节点 */
const findNodeInTree = (tree: any[], nodeId: any): any => {
  for (const node of tree) {
    if (node.id === nodeId) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, nodeId)
      if (found) {
        return found
      }
    }
  }
  return null
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  
  // 校验分类是否为叶子节点
  if (formData.value.categoryId && !checkSelectedCategoryIsLeaf(formData.value.categoryId)) {
    return
  }
  
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ProductVO
    if (formType.value === 'create') {
      await ProductApi.createProduct(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProductApi.updateProduct(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 监听产品分类的改变 */
// watch(() => formData.value.productType, async (value) => {
//   await getProductCategoryListByProductType(value)
// })

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    name: undefined,
    barCode: undefined,
    categoryId: undefined,
    unitId: undefined,
    status: CommonStatusEnum.ENABLE,
    standard: undefined,
    remark: undefined,
    expiryDay: undefined,
    weight: undefined,
    purchasePrice: undefined,
    salePrice: undefined,
    minPrice: undefined
  }
  // 重置之前的分类ID
  previousCategoryId.value = undefined
  formRef.value?.resetFields()
}
</script>
