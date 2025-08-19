<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="编码" prop="code">
        <el-input v-if="formData.level == 1" :disabled="formType == 'update'" v-model="formData.code" placeholder="请输入编码" />
        <el-input v-else v-model="formData.code" disabled placeholder="保存时自动生成" />
      </el-form-item>
      <el-form-item label="分类层级" prop="level">
        <el-select
          v-model="formData.level"
          placeholder="请选择分类层级"
          @change="getProductCategoryListByLevel(formData.level)"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.ERP_PRODUCT_CATEGORY_LEVEL)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="父级分类" prop="parentId" v-show="formData.level != 1">
        <el-select v-model="formData.parentId" placeholder="请选择父级分类">
          <el-option
            v-for="item in categoryList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="产品类型" prop="productType" v-show="formData.level == 1">
        <el-select v-model="formData.productType" placeholder="请选择关联的产品类型" clearable class="w-1/1">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.ERP_PRODUCT_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="名称" prop="name">
        <el-input v-model="formData.name" placeholder="请输入名称" />
      </el-form-item>
      <el-form-item label="排序" prop="sort">
        <el-input-number v-model="formData.sort" placeholder="请输入排序" :min="0" class="!w-1/1"/>
      </el-form-item>
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
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { getIntDictOptions, DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { ProductCategoryApi, ProductCategoryVO } from '@/api/erp/product/category'
// import { handleTree } from '@/utils/tree'
import { CommonStatusEnum } from '@/utils/constants'

/** ERP 产品分类 表单 */
defineOptions({ name: 'ProductCategoryForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  level: 1,
  parentId: undefined,
  productType: undefined,
  name: undefined,
  code: undefined,
  sort: undefined,
  status: CommonStatusEnum.ENABLE
})
const formRules = reactive({
  code: [{ required: true, message: '编码不能为空', trigger: 'blur' }],
  level: [{ required: true, message: '分类层级不能为空', trigger: 'blur' }],
  parentId: [ { required: false, message: '父级分类不能为空', trigger: 'blur'}],
  productType: [ { required: true, message: '关联的产品类型不能为空', trigger: 'blur'}],
  name: [{ required: true, message: '名称不能为空', trigger: 'blur' }],
  sort: [{ required: true, message: '排序不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref
// const productCategoryTree = ref() // 树形结构
const categoryList = ref<ProductCategoryVO[]>([])

const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await ProductCategoryApi.getProductCategory(id)
      if (formData.value.parentId == 0) {
        formData.value.parentId = undefined
      }
    } finally {
      formLoading.value = false
    }
  }
  await getProductCategoryListByLevel(formData.value.level)
}
/** 打开弹窗 */
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

// /** 根据分类层级，获得分类列表 */
const getProductCategoryListByLevel = async (level: number) => {
  if (formData.value.parentId == 0) {
    formData.value.parentId = undefined
  }
  categoryList.value = await ProductCategoryApi.getProductCategoryListByLevel(level)
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ProductCategoryVO
    if (formType.value === 'create') {
      await ProductCategoryApi.createProductCategory(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProductCategoryApi.updateProductCategory(data)
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
    level: 1,
    parentId: undefined,
    productType: undefined,
    name: undefined,
    code: undefined,
    sort: undefined,
    status: CommonStatusEnum.ENABLE
  }
  formRef.value?.resetFields()
}

/** 获得产品分类树 */
// const getProductCategoryTree = async () => {
//   productCategoryTree.value = []
//   const data = await ProductCategoryApi.getProductCategoryList()
//   const root: Tree = { id: 0, name: '顶级产品分类', children: [] }
//   root.children = handleTree(data, 'id', 'parentId')
//   productCategoryTree.value.push(root)
// }

// 动态添加非空验证
watch(() => formData.value.level, (level) => {
  // 如果选择的是根节点，则判断分类编码是否为空
  formRules.code[0].required = level == 1
  // 如果选择的是根节点，则判断关联的产品类型是否为空
  formRules.productType[0].required = level == 1

  // 如果选择的是根节点，则不判断父分类是否为空
  formRules.parentId[0].required = level != 1
})
</script>
