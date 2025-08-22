<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1080px">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="formLoading"
    >
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息标签页 -->
        <el-tab-pane label="基本信息" name="basic">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="BOM" prop="bomId">
                <el-select
                  v-model="formData.bomId"
                  placeholder="请选择BOM"
                  clearable
                  filterable
                  class="!w-240px"
                  :disabled="formType !== 'create'"
                >
                  <el-option
                    v-for="bom in bomList"
                    :key="bom.id"
                    :label="`${bom.bomCode} - ${bom.bomName}`"
                    :value="bom.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="计算日期" prop="calculationDate">
                <el-date-picker
                  v-model="formData.calculationDate"
                  type="date"
                  value-format="YYYY-MM-DD"
                  placeholder="选择计算日期"
                  class="!w-240px"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="成本版本" prop="costVersion">
                <el-input
                  v-model="formData.costVersion"
                  placeholder="请输入成本版本"
                  class="!w-240px"
                  :disabled="!formData.bomId"
                >
                  <template #append>
                    <el-button 
                      :disabled="!formData.bomId" 
                      size="small" 
                      @click="generateNextVersion"
                      :loading="versionGenerating"
                    >
                      自动生成
                    </el-button>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="设为当前版本" prop="isCurrent">
                <el-switch v-model="formData.isCurrent" />
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 成本计算标签页 -->
        <el-tab-pane label="成本计算" name="cost">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="每小时人工成本" prop="laborCostPerHour">
                <el-input-number
                  v-model="formData.laborCostPerHour"
                  :min="0"
                  :precision="2"
                  placeholder="请输入每小时人工成本"
                  class="!w-240px"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预计工时" prop="estimatedHours">
                <el-input-number
                  v-model="formData.estimatedHours"
                  :min="0"
                  :precision="2"
                  placeholder="请输入预计工时"
                  class="!w-240px"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="制造费用率(%)" prop="overheadRate">
                <el-input-number
                  v-model="formData.overheadRate"
                  :min="0"
                  :max="100"
                  :precision="2"
                  placeholder="请输入制造费用率"
                  class="!w-240px"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item>
                <el-button type="primary" @click="handleCalculate" :loading="calculateLoading">
                  <Icon icon="ep:refresh" class="mr-5px" /> 重新计算成本
                </el-button>
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">成本明细</el-divider>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-form-item label="总材料成本">
                <el-input
                  :value=" formData.totalMaterialCost "
                  readonly
                  class="!w-240px"
                >
                  <template #suffix>元</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="总人工成本">
                <el-input
                  :value=" formData.totalLaborCost "
                  readonly
                  class="!w-240px"
                >
                  <template #suffix>元</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="总制造费用">
                <el-input
                  :value=" formData.totalOverheadCost "
                  readonly
                  class="!w-240px"
                >
                  <template #suffix>元</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="总成本">
                <el-input
                  :value=" formData.totalCost "
                  readonly
                  class="!w-240px"
                  style="font-weight: bold;"
                >
                  <template #suffix>元</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="单位成本">
                <el-input
                  :value=" formData.unitCost "
                  readonly
                  class="!w-240px"
                  style="font-weight: bold;"
                >
                  <template #suffix>元</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-tab-pane>
      </el-tabs>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ProductBomCostApi, ProductBomCostSaveReqVO, ProductBomCostCalculateReqVO } from '@/api/erp/product/bomCost'
import { ProductBomApi, ProductBomVO } from '@/api/erp/product/bom'
import { formatDate } from '@/utils/formatTime'

/** BOM成本计算 表单 */
defineOptions({ name: 'ProductBomCostForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  bomId: undefined,
  calculationDate: undefined,
  costVersion: undefined,
  isCurrent: false,
  laborCostPerHour: 0,
  estimatedHours: 0,
  overheadRate: 0,
  totalMaterialCost: 0,
  totalLaborCost: 0,
  totalOverheadCost: 0,
  totalCost: 0,
  unitCost: 0
})
const formRules = reactive({
  bomId: [{ required: true, message: '请选择BOM', trigger: 'change' }],
  calculationDate: [{ required: true, message: '请选择计算日期', trigger: 'change' }],
  costVersion: [
    { required: true, message: '请输入成本版本', trigger: 'blur' },
    {
      validator: async (rule: any, value: any, callback: any) => {
        if (!value || !formData.value.bomId) {
          callback()
          return
        }
        try {
          // 检查版本号是否重复
          const existingList = await ProductBomCostApi.getProductBomCostListByBomId(formData.value.bomId)
          const duplicateVersion = existingList.find(item => 
            item.costVersion === value && 
            (formType.value === 'create' || item.id !== formData.value.id)
          )
          if (duplicateVersion) {
            callback(new Error('该BOM已存在相同版本的成本计算记录'))
          } else {
            callback()
          }
        } catch (error) {
          console.error('版本号校验失败:', error)
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  laborCostPerHour: [{ required: true, message: '请输入每小时人工成本', trigger: 'blur' }],
  estimatedHours: [{ required: true, message: '请输入预计工时', trigger: 'blur' }],
  overheadRate: [{ required: true, message: '请输入制造费用率', trigger: 'blur' }]
})
const formRef = ref() // 表单 Ref
const activeTab = ref('basic') // 当前激活的标签页
const calculateLoading = ref(false) // 计算按钮加载状态
const versionGenerating = ref(false) // 版本号生成加载状态

// BOM列表
const bomList = ref<ProductBomVO[]>([])

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = type === 'create' ? '新增BOM成本计算' : '修改BOM成本计算'
  formType.value = type
  resetForm()
  activeTab.value = 'basic'
  
  // 加载BOM列表
  await loadBomList()
  
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      const data = await ProductBomCostApi.getProductBomCost(id)
      formData.value = {
        ...data,
        calculationDate: data.calculationDate ? 
          (Array.isArray(data.calculationDate) ? 
            `${data.calculationDate[0]}-${String(data.calculationDate[1]).padStart(2, '0')}-${String(data.calculationDate[2]).padStart(2, '0')}` : 
            String(data.calculationDate)) : '', // 处理LocalDate数组格式[year, month, day]
        // laborCostPerHour: 0, // 这些字段在编辑时需要重新输入
        // estimatedHours: 0,
        // overheadRate: 0
      }
    } finally {
      formLoading.value = false
    }
  } else {
    // 新增时设置默认值
    // 当前日期
    formData.value.calculationDate = formatDate(new Date(), 'YYYY-MM-DD')
    formData.value.costVersion = 'V1.0'
  }
}

/** 加载BOM列表 */
const loadBomList = async () => {
  try {
    bomList.value = await ProductBomApi.getProductBomSimpleList()
  } catch (error) {
    console.error('加载BOM列表失败:', error)
    message.error('加载BOM列表失败')
  }
}

/** 生成下一个版本号 */
const generateNextVersion = async () => {
  if (!formData.value.bomId) {
    message.warning('请先选择BOM')
    return
  }
  
  versionGenerating.value = true
  try {
    const nextVersion = await ProductBomCostApi.getNextVersion(formData.value.bomId)
    formData.value.costVersion = nextVersion
    // 触发版本号字段的验证
    formRef.value?.validateField('costVersion')
    message.success('版本号生成成功')
  } catch (error) {
    console.error('生成版本号失败:', error)
    message.error('生成版本号失败')
  } finally {
    versionGenerating.value = false
  }
}

/** 计算成本 */
const handleCalculate = async () => {
  if (!formData.value.bomId) {
    message.warning('请先选择BOM')
    return
  }
  
  if (!formData.value.laborCostPerHour || !formData.value.estimatedHours || formData.value.overheadRate === undefined) {
    message.warning('请填写完整的成本计算参数')
    return
  }
  
  calculateLoading.value = true
  try {
    const calculateReq: ProductBomCostCalculateReqVO = {
      bomId: formData.value.bomId,
      calculationDate: formData.value.calculationDate,
      laborCostPerHour: formData.value.laborCostPerHour,
      estimatedHours: formData.value.estimatedHours,
      overheadRate: formData.value.overheadRate,
      costVersion: formData.value.costVersion,
      setAsCurrent: formData.value.isCurrent
    }
    
    // 使用预览计算接口，不保存数据
    const result = await ProductBomCostApi.previewCalculateProductBomCost(calculateReq)
    
    // 更新表单数据
    formData.value.totalMaterialCost = result.totalMaterialCost
    formData.value.totalLaborCost = result.totalLaborCost
    formData.value.totalOverheadCost = result.totalOverheadCost
    formData.value.totalCost = result.totalCost
    formData.value.unitCost = result.unitCost
    
    message.success('成本计算完成')
    activeTab.value = 'cost' // 切换到成本计算标签页
  } catch (error) {
    console.error('成本计算失败:', error)
    message.error('成本计算失败，请检查参数')
  } finally {
    calculateLoading.value = false
  }
}

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  await formRef.value.validate()
  
  // 检查是否已计算成本
  if (formData.value.totalCost <= 0) {
    message.warning('请先计算成本')
    return
  }

  await handleCalculate() // 提交时计算成本
  // 提交请求
  formLoading.value = true
  try {
    const data: ProductBomCostSaveReqVO = {
      id: formData.value.id,
      bomId: formData.value.bomId,
      calculationDate: formData.value.calculationDate,
      totalMaterialCost: formData.value.totalMaterialCost,
      totalLaborCost: formData.value.totalLaborCost,
      totalOverheadCost: formData.value.totalOverheadCost,
      totalCost: formData.value.totalCost,
      unitCost: formData.value.unitCost,
      costVersion: formData.value.costVersion,
      isCurrent: formData.value.isCurrent
    }
    
    if (formType.value === 'create') {
      await ProductBomCostApi.createProductBomCost(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProductBomCostApi.updateProductBomCost(data)
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
    bomId: undefined,
    calculationDate: undefined,
    costVersion: undefined,
    isCurrent: false,
    laborCostPerHour: 0,
    estimatedHours: 0,
    overheadRate: 0,
    totalMaterialCost: 0,
    totalLaborCost: 0,
    totalOverheadCost: 0,
    totalCost: 0,
    unitCost: 0
  }
  formRef.value?.resetFields()
}

defineExpose({ open }) // 提供 open 方法，用于打开弹窗
</script>
