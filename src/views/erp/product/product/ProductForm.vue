<!-- ERP 产品的新增/修改 -->
<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="900px">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="100px"
    >
      <el-row :gutter="15">
        <el-col :span="12">
          <el-form-item label="条码" prop="barCode">
            <el-input v-model="formData.barCode" disabled placeholder="保存时自动生成" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="名称" prop="name">
            <el-input v-model="formData.name" :disabled="formType === 'view'" placeholder="请输入名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="类型" prop="productType">
            <el-select
              v-model="formData.productType"
              class="w-1/1"
              :disabled="formType === 'view'"
              clearable
              placeholder="请选择产品类型"
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
              v-model="formData.categoryId"
              :data="categoryList"
              :disabled="formType === 'view' || categoryList.length == 0"
              :placeholder="categoryList.length == 0 ? '请先选择产品类型' : '请选择分类'"
              :props="defaultProps"
              check-strictly
              class="w-1/1"
              default-expand-all
              filterable
              @change="handleCategoryChange"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="单位" prop="unitId">
            <el-select v-model="formData.unitId" class="w-1/1" :disabled="formType === 'view'" clearable placeholder="请选择单位">
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
            <el-radio-group v-model="formData.status" :disabled="formType === 'view'">
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
            <el-input v-model="formData.standard" :disabled="formType === 'view'" placeholder="请输入规格" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="保质期天数" prop="expiryDay">
            <el-input-number
              v-model="formData.expiryDay"
              :min="0"
              :precision="0"
              :disabled="formType === 'view'"
              class="!w-1/1"
              placeholder="请输入保质期天数"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="重量（kg）" prop="weight">
            <el-input-number
              v-model="formData.weight"
              :min="0"
              :disabled="formType === 'view'"
              class="!w-1/1"
              placeholder="请输入重量（kg）"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="采购价格" prop="purchasePrice">
            <el-input-number
              v-model="formData.purchasePrice"
              :min="0"
              :precision="2"
              :disabled="formType === 'view'"
              class="!w-1/1"
              placeholder="请输入采购价格，单位：元"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="销售价格" prop="salePrice">
            <el-input-number
              v-model="formData.salePrice"
              :min="0"
              :precision="2"
              :disabled="formType === 'view'"
              class="!w-1/1"
              placeholder="请输入销售价格，单位：元"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="最低价格" prop="minPrice">
            <el-input-number
              v-model="formData.minPrice"
              :min="0"
              :precision="2"
              :disabled="formType === 'view'"
              class="!w-1/1"
              placeholder="请输入最低价格，单位：元"
            />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注" prop="remark">
            <el-input v-model="formData.remark" :disabled="formType === 'view'" placeholder="请输入备注" type="textarea" />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- BOM信息区域 - 只在产品类型为成品时显示 -->
      <div v-if="formData.productType === 'FP'" class="bom-section">
        <el-divider content-position="left">
          <span style="font-weight: bold; color: #409eff">BOM信息</span>
        </el-divider>

        <el-tabs v-model="activeTab" type="border-card">
          <!-- BOM基本信息标签页 - 只在新增模式下显示 -->
          <el-tab-pane v-if="formType === 'create'" label="BOM基本信息" name="basic">
            <el-row :gutter="15">
              <el-col :span="12">
                <el-form-item label="BOM编码" prop="bomCode">
                  <el-input v-model="formData.bomCode" disabled placeholder="保存时自动生成" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="BOM名称" prop="bomName">
                  <el-input v-model="formData.bomName" :disabled="formType === 'view'" placeholder="请输入BOM名称" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="版本号" prop="version">
                  <el-input v-model="formData.version" :disabled="formType === 'view'" placeholder="请输入版本号" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="产出数量" prop="outputQty">
                  <el-input-number
                    v-model="formData.outputQty"
                    :min="0.001"
                    :precision="3"
                    :disabled="formType === 'view'"
                    class="!w-1/1"
                    placeholder="请输入产出数量"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="产出单位" prop="outputUnitId">
                  <el-select
                    v-model="formData.outputUnitId"
                    class="w-1/1"
                    :disabled="formType === 'view'"
                    clearable
                    placeholder="请选择产出单位"
                  >
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
                <el-form-item label="BOM状态" prop="bomStatus">
                  <el-select
                    v-model="formData.bomStatus"
                    class="w-1/1"
                    :disabled="formType === 'view'"
                    placeholder="请选择BOM状态"
                  >
                    <el-option
                      v-for="dict in getStrDictOptions(DICT_TYPE.ERP_PRODUCT_BOM_STATUS)"
                      :key="dict.value"
                      :label="dict.label"
                      :value="dict.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="是否默认BOM" prop="isDefault" label-width="120px">
                  <el-switch v-model="formData.isDefault" :disabled="formType === 'view'" />
                </el-form-item>
              </el-col>
              <el-col :span="24">
                <el-form-item label="BOM描述" prop="description">
                  <el-input
                    v-model="formData.description"
                    :rows="3"
                    :disabled="formType === 'view'"
                    placeholder="请输入BOM描述"
                    type="textarea"
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
              :disabled="formType === 'view'"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-form>
    <template #footer>
      <el-button v-if="formType !== 'view'" :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">{{ formType === 'view' ? '关 闭' : '取 消' }}</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { ProductCategoryApi, ProductCategoryVO } from '@/api/erp/product/category'
import { ProductUnitApi, ProductUnitVO } from '@/api/erp/product/unit'
import { ProductBomApi, ProductBomVO } from '@/api/erp/product/bom'
// import { ProductBomItemApi } from '@/api/erp/product/bomItem'
import ProductBomItemList from '@/views/erp/product/bom/components/ProductBomItemList.vue'
import { CommonStatusEnum } from '@/utils/constants'
import { defaultProps, handleTree } from '@/utils/tree'
import { DICT_TYPE, getIntDictOptions, getStrDictOptions } from '@/utils/dict'
import { ProductBomItemApi } from '@/api/erp/product/bomItem'

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
  productType: undefined,
  unitId: undefined,
  status: undefined,
  standard: undefined,
  remark: undefined,
  expiryDay: undefined,
  weight: undefined,
  purchasePrice: undefined,
  salePrice: undefined,
  minPrice: undefined,
  // BOM相关字段
  bomId: undefined, // BOM ID，用于编辑时更新BOM明细
  bomCode: undefined,
  bomName: undefined,
  version: undefined,
  outputQty: 1,
  outputUnitId: undefined,
  isDefault: false,
  description: undefined,
  bomStatus: 'DRAFT', // BOM状态，默认为草稿
  bomItems: []
})
const formRules = reactive({
  name: [{ required: true, message: '产品名称不能为空', trigger: 'blur' }],
  // barCode: [{ required: true, message: '产品条码不能为空', trigger: 'blur' }],
  categoryId: [{ required: true, message: '产品分类编号不能为空', trigger: 'blur' }],
  productType: [{ required: true, message: '产品类型不能为空', trigger: 'blur' }],
  unitId: [{ required: true, message: '单位编号不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '产品状态不能为空', trigger: 'blur' }],
  // BOM相关验证规则（仅在产品类型为成品时生效）
  bomName: [
    {
      validator: (rule: any, value: any, callback: any) => {
        // 编辑模式下忽略BOM名称验证
        if (formType.value === 'update') {
          callback()
          return
        }
        if (formData.value.productType === 'FP' && !value) {
          callback(new Error('BOM名称不能为空'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  version: [
    {
      validator: (rule: any, value: any, callback: any) => {
        // 编辑模式下忽略版本号验证
        if (formType.value === 'update') {
          callback()
          return
        }
        if (formData.value.productType === 'FP' && !value) {
          callback(new Error('版本号不能为空'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  outputQty: [
    {
      validator: (rule: any, value: any, callback: any) => {
        // 编辑模式下忽略产出数量验证
        if (formType.value === 'update') {
          callback()
          return
        }
        if (formData.value.productType === 'FP' && (!value || value <= 0)) {
          callback(new Error('产出数量必须大于0'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  outputUnitId: [
    {
      validator: (rule: any, value: any, callback: any) => {
        // 编辑模式下忽略产出单位验证
        if (formType.value === 'update') {
          callback()
          return
        }
        if (formData.value.productType === 'FP' && !value) {
          callback(new Error('产出单位不能为空'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  bomStatus: [
    {
      validator: (rule: any, value: any, callback: any) => {
        // 编辑模式下忽略BOM状态验证
        if (formType.value === 'update') {
          callback()
          return
        }
        if (formData.value.productType === 'FP' && !value) {
          callback(new Error('BOM状态不能为空'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
})
const formRef = ref() // 表单 Ref
const categoryList = ref<ProductCategoryVO[]>([]) // 产品分类列表
const unitList = ref<ProductUnitVO[]>([]) // 产品单位列表
const previousCategoryId = ref<number | undefined>() // 保存之前选择的分类ID
const activeTab = ref('basic') // 当前激活的标签页
const bomItemListRef = ref() // BOM明细列表组件引用

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = type === 'view' ? '查看产品详情' : t('action.' + type)
  formType.value = type
  resetForm()
  // 根据表单类型设置默认标签页
  activeTab.value = type === 'create' ? 'basic' : 'items'
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await ProductApi.getProduct(id)
      // 初始化之前的分类ID
      previousCategoryId.value = formData.value.categoryId

      // 如果是成品，加载BOM信息
      if (formData.value.productType === 'FP') {
        try {
          // 获取该产品的默认BOM
          const bomList = await ProductBomApi.getProductBomListByProductId(id)
          if (bomList && bomList.length > 0) {
            // 优先选择默认BOM，如果没有默认BOM则选择第一个
            const defaultBom = bomList.find((bom) => bom.isDefault) || bomList[0]

            // 设置BOM基本信息
            formData.value.bomId = defaultBom.id // 设置BOM ID，用于编辑时更新BOM明细
            formData.value.bomCode = defaultBom.bomCode
            formData.value.bomName = defaultBom.bomName
            formData.value.version = defaultBom.version
            formData.value.outputQty = defaultBom.outputQty
            formData.value.outputUnitId = defaultBom.outputUnitId
            formData.value.isDefault = defaultBom.isDefault
            formData.value.description = defaultBom.description
            formData.value.bomStatus = defaultBom.status || 'DRAFT'

            // 加载BOM明细数据
            const bomItems = await ProductBomItemApi.getProductBomItemListByBomId(defaultBom.id)
            formData.value.bomItems = bomItems || []
          }
        } catch (bomError) {
          console.error('加载BOM信息失败:', bomError)
          // BOM加载失败不影响产品信息的显示，只是清空BOM相关字段
          formData.value.bomCode = undefined
          formData.value.bomName = undefined
          formData.value.version = undefined
          formData.value.outputQty = 1
          formData.value.outputUnitId = undefined
          formData.value.isDefault = false
          formData.value.description = undefined
          formData.value.bomStatus = 'DRAFT'
          formData.value.bomItems = []
        }
      }
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
const getProductCategoryListByProductType = async (productType?: string) => {
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

  // 如果是成品，还需要校验BOM明细
  if (formData.value.productType === 'FP') {
    if (bomItemListRef.value) {
      await bomItemListRef.value.validate()
    }
    // 检查BOM明细是否为空
    if (!formData.value.bomItems || formData.value.bomItems.length === 0) {
      message.error('成品必须添加BOM明细信息')
      activeTab.value = 'items' // 切换到BOM明细标签页
      return
    }
    // 检查BOM明细是否有有效数据
    const validItems = formData.value.bomItems.filter(
      (item) => item.materialId && item.requiredQty > 0
    )
    if (validItems.length === 0) {
      message.error('请添加有效的BOM明细信息')
      activeTab.value = 'items' // 切换到BOM明细标签页
      return
    }
  }

  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as ProductVO
    let productId: number

    if (formType.value === 'create') {
      productId = await ProductApi.createProduct(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProductApi.updateProduct(data)
      productId = data.id
      message.success(t('common.updateSuccess'))
    }

    // 如果是成品，保存BOM信息
    if (formData.value.productType === 'FP') {
      try {
        // 清理和验证BOM明细数据
        const cleanedBomItems = (formData.value.bomItems || [])
          .map((item, index) => ({
            id: item.id || undefined,
            bomId: undefined, // 将在后端设置
            materialId: item.materialId,
            sequenceNo: item.sequenceNo || index + 1,
            requiredQty: item.requiredQty || 0,
            unitId: item.unitId,
            wastageRate: item.wastageRate || 0,
            isKeyMaterial: item.isKeyMaterial || false,
            substituteGroup: item.substituteGroup || undefined,
            notes: item.notes || undefined
          }))
          .filter((item) => item.materialId && item.requiredQty > 0) // 过滤掉无效项

        if (formType.value === 'create') {
          // 新增模式：创建新的BOM
          const bomData: ProductBomVO = {
            id: undefined,
            bomCode: formData.value.bomCode,
            bomName: formData.value.bomName,
            productId: productId,
            version: formData.value.version,
            outputQty: formData.value.outputQty,
            outputUnitId: formData.value.outputUnitId,
            isDefault: formData.value.isDefault,
            description: formData.value.description,
            status: formData.value.bomStatus,
            bomItems: cleanedBomItems
          }

          console.log('准备保存BOM数据:', bomData)
          await ProductBomApi.createProductBom(bomData)
          console.log('BOM数据保存成功')
        } else {
          // 编辑模式：只更新BOM明细，忽略BOM基本信息
          if (formData.value.bomId) {
            // 为每个BOM明细项设置bomId
            const bomItemsWithBomId = cleanedBomItems.map(item => ({
              ...item,
              bomId: formData.value.bomId
            }))
            console.log('准备更新BOM明细数据:', bomItemsWithBomId)
            await ProductBomItemApi.saveBomItemsBatch(formData.value.bomId, bomItemsWithBomId)
            console.log('BOM明细数据更新成功')
          }
        }
      } catch (bomError) {
        console.error('BOM保存失败:', bomError)
        message.error('BOM信息保存失败: ' + (bomError.message || bomError))
        throw bomError // 重新抛出错误，阻止后续操作
      }
    }

    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } catch (error) {
    console.error('表单提交失败:', error)
    message.error('保存失败: ' + (error.message || error))
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
    productType: undefined,
    unitId: undefined,
    status: CommonStatusEnum.ENABLE,
    standard: undefined,
    remark: undefined,
    expiryDay: undefined,
    weight: undefined,
    purchasePrice: undefined,
    salePrice: undefined,
    minPrice: undefined,
    // BOM相关字段重置
    bomId: undefined,
    bomCode: undefined,
    bomName: undefined,
    version: undefined,
    outputQty: 1,
    outputUnitId: undefined,
    isDefault: false,
    description: undefined,
    bomStatus: 'DRAFT',
    bomItems: []
  }
  // 重置之前的分类ID
  previousCategoryId.value = undefined
  formRef.value?.resetFields()
}
</script>
