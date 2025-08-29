<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="1200px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="120px"
    >
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="BOM编码" prop="bomCode">
                <el-input v-model="formData.bomCode" disabled placeholder="保存时自动生成" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="BOM名称" prop="bomName">
                <el-input v-model="formData.bomName" placeholder="请输入BOM名称" :disabled="formType === 'detail'" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="产品" prop="productId">
                <el-select
                  v-model="formData.productId"
                  clearable
                  filterable
                  placeholder="请选择产品"
                  style="width: 100%"
                  :disabled="formType === 'detail'"
                >
                  <el-option
                    v-for="product in finishedProductList"
                    :key="product.id"
                    :label="product.name"
                    :value="product.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="版本号" prop="version">
                <el-input
                  v-model="formData.version"
                  placeholder="请输入版本号"
                  @blur="handleVersionBlur"
                  :disabled="!formData.productId || formType === 'detail'"
                >
                  <template #append>
                    <el-button :disabled="!formData.productId || formType === 'detail'" size="small" @click="generateNextVersion">
                      自动生成
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="产出数量" prop="outputQty">
                <el-input-number 
                  v-model="formData.outputQty" 
                  :min="0.001" 
                  :precision="3"
                  placeholder="请输入产出数量" 
                  style="width: 100%"
                  :disabled="formType === 'detail'"
                />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="产出单位" prop="outputUnitId">
                <el-select
                  v-model="formData.outputUnitId"
                  clearable
                  filterable
                  placeholder="请选择产出单位"
                  style="width: 100%"
                  :disabled="formType === 'detail'"
                >
                  <el-option
                    v-for="unit in productUnitList"
                    :key="unit.id"
                    :label="unit.name"
                    :value="unit.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="是否默认BOM" prop="isDefault">
                <el-switch v-model="formData.isDefault" :disabled="formType === 'detail'" />
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row>
            <el-col :span="24">
              <el-form-item label="状态" prop="status">
                <el-radio-group v-model="formData.status" :disabled="formType === 'detail'">
                  <el-radio
                    v-for="dict in getStrDictOptions(DICT_TYPE.ERP_PRODUCT_BOM_STATUS)"
                    :key="dict.value"
                    :label="dict.value"
                  >
                    {{ dict.label }}
                  </el-radio>
                </el-radio-group>
              </el-form-item>
            </el-col>
          </el-row>
          
          <el-row>
            <el-col :span="24">
              <el-form-item label="BOM描述" prop="description">
                <el-input
                  type="textarea"
                  v-model="formData.description"
                  placeholder="请输入BOM描述"
                  :rows="3"
                />
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>
        
        <!-- BOM明细标签页 -->
        <el-tab-pane label="BOM明细" name="items">
          <ProductBomItemList
            ref="bomItemListRef"
            v-model="formData.bomItems"
            :disabled="formType === 'detail'"
          />
        </el-tab-pane>
       </el-tabs>
     </el-form>
    <template #footer>
      <el-button v-if="formType !== 'detail'" :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">{{ formType === 'detail' ? '关 闭' : '取 消' }}</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { ProductBomApi, ProductBomVO } from '@/api/erp/product/bom'
import { ProductBomItemApi } from '@/api/erp/product/bomItem'
import { DICT_TYPE, getBoolDictOptions, getStrDictOptions } from '@/utils/dict'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { ProductUnitApi, ProductUnitVO } from '@/api/erp/product/unit'
import ProductBomItemList from './components/ProductBomItemList.vue'

/** BOM主表 表单 */
defineOptions({ name: 'ProductBomForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单地加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  bomCode: '',
  bomName: '',
  productId: undefined,
  version: '',
  outputQty: 1,
  outputUnitId: undefined,
  status: '1',
  isDefault: false,
  description: '',
  bomItems: []
})
const formRules = reactive({
  // bomCode: [{ required: true, message: 'BOM编码不能为空', trigger: 'blur' }],
  productId: [{ required: true, message: '产品不能为空', trigger: 'change' }],
  bomName: [{ required: true, message: 'BOM名称不能为空', trigger: 'blur' }],
  outputQty: [{ required: true, message: '产出数量不能为空', trigger: 'blur' }],
  outputUnitId: [{ required: true, message: '产出单位不能为空', trigger: 'change' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }],

  version: [
    { required: true, message: '版本号不能为空', trigger: 'blur' },
    {
      pattern: /^V\d+\.\d+\.\d+$/,
      message: '版本号格式应为：以V开头，后跟主版本.次版本.修订号（如：1.0.0）',
      trigger: 'blur'
    },
    {
      validator: async (rule, value, callback) => {
        if (value && formData.value.productId) {
          try {
            // 检查版本号唯一性（编辑时排除自身）
            const isUnique = await ProductBomApi.checkVersionUniqueness({
              productId: formData.value.productId,
              version: value,
              excludeId: formData.value.id
            })
      
            console.log('isUnique', isUnique)
            if (!isUnique) {
              callback(new Error('该产品的版本号已存在，请使用其他版本号'))
            } else {
              callback()
            }
          } catch (e) {
            callback(new Error('版本号已存在'))
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})
const formRef = ref() // 表单 Ref
const bomItemListRef = ref() // BOM明细列表 Ref
const activeTab = ref('basic') // 当前激活的标签页

const finishedProductList = ref<ProductVO[]>([]) // 成品列表
const productUnitList = ref<ProductUnitVO[]>([]) // 产品单位列表

/** 打开弹窗 */
const open = async (type: string, id?: number, sourceData: ProductBomVO) => {
  dialogVisible.value = true
  if (type === 'detail') {
    dialogTitle.value = 'BOM详情'
  } else {
    dialogTitle.value = t('action.' + type)
  }
  formType.value = type
  resetForm()
  // 修改或查看详情时，设置数据
  if (id) {
    formLoading.value = true
    try {
      if (type === 'detail') {
        // 详情模式使用getProductBomDetail获取完整数据
        formData.value = await ProductBomApi.getProductBomDetail(id)
      } else {
        formData.value = await ProductBomApi.getProductBom(id)
        // 加载BOM明细数据
        const bomItems = await ProductBomItemApi.getProductBomItemListByBomId(id)
        formData.value.bomItems = bomItems || []
      }
    } finally {
      console.log('finally,关闭加载动画')
      formLoading.value = false
    }
  }
  // 复制BOM时
  if (type === 'copy') {
    dialogTitle.value = '复制BOM'
    // 复制源数据并生成新版本号
    formData.value = {
      id: undefined, // 清空ID，表示新建
      bomCode: undefined, // 清空编码，保存时自动生成
      productId: sourceData.productId,
      version: undefined, // 稍后自动生成
      bomName: sourceData.bomName + '_复制',
      outputQty: sourceData.outputQty,
      outputUnitId: sourceData.outputUnitId,
      status: 'DRAFT', // 复制的BOM默认为草稿状态
      isDefault: false, // 复制的BOM默认不是 默认的BOM
      description: sourceData.description,
      // 复制BOM明细数据
      bomItems: sourceData.bomItems ? sourceData.bomItems.map(item => ({
        ...item,
        id: undefined, // 清空明细ID，表示新建
        bomId: undefined // 清空BOM ID，保存时会自动设置
      })) : []
    }

    // 自动生成新版本号
    await generateNextVersion()
  }

  await loadFinishedProductList() // 加载成品列表
  await loadProductUnitList() // 加载产品单位列表
}
defineExpose({ open }) // 提供 open 和 openCopy 方法，用于打开弹窗

/** 加载成品列表 */
const loadFinishedProductList = async () => {
  try {
    finishedProductList.value = await ProductApi.getProductSimpleListByType('FP')
  } catch (error) {
    console.error('加载成品列表失败:', error)
    message.error('加载成品列表失败，请检查网络连接')
    finishedProductList.value = []
  }
}

/** 加载产品单位列表 */
const loadProductUnitList = async () => {
  try {
    productUnitList.value = await ProductUnitApi.getProductUnitSimpleList()
  } catch (error) {
    console.error('加载产品单位列表失败:', error)
    message.error('加载产品单位列表失败，请检查网络连接')
    productUnitList.value = []
  }
}

/** 生成下一个版本号 */
const generateNextVersion = async () => {
  if (!formData.value.productId) {
    message.warning('请先选择产品')
    return
  }

  try {
    const latestVersion = await ProductBomApi.getLatestVersion(formData.value.productId)
    let newVersion;
    if (latestVersion) {
      const versionParts = latestVersion.split('.')
      const major = parseInt(versionParts[0] || '0')
      const minor = parseInt(versionParts[1] || '0')
      const patch = parseInt(versionParts[2] || '0')

      // 默认递增修订号
      newVersion = `${major}.${minor}.${patch + 1}`
    } else {
      // 如果没有历史版本，从1.0.0开始
      newVersion = '1.0.0'
    }

    formData.value.version = 'V' + newVersion
    // 触发验证
    handleVersionBlur()
  } catch (error) {
    console.error('获取最新版本号失败:', error)
    message.error('获取最新版本号失败')
  }
}

/** 处理版本号失焦事件 */
const handleVersionBlur = () => {
  // 触发表单验证
  formRef.value?.validateField('version')
}



/** 重置表单 */
const resetForm = () => {
  activeTab.value = 'basic' // 重置到基本信息页
  formData.value = {
    id: undefined,
    bomCode: '',
    bomName: '',
    productId: undefined,
    version: '',
    outputQty: 1,
    outputUnitId: undefined,
    status: '1',
    isDefault: false,
    description: '',
    bomItems: []
  }
  formRef.value?.resetFields()
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 校验BOM明细
  if (bomItemListRef.value && !(await bomItemListRef.value.validate())) {
    message.error('请完善BOM明细信息')
    return
  }
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ProductBomVO
    if (formType.value === 'create' || formType.value === 'copy') {
      await ProductBomApi.createProductBom(data)
      message.success(formType.value === 'copy' ? '复制BOM成功' : t('common.createSuccess'))
    } else {
      await ProductBomApi.updateProductBom(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}
</script>
