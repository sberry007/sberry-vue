<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="订单ID" prop="orderId">
        <el-input v-model="formData.orderId" placeholder="请输入订单ID" :readonly="isReadonly" />
      </el-form-item>
      <el-form-item label="物料ID" prop="materialId">
        <el-select
            v-model="formData.materialId"
            clearable
            filterable
            placeholder="请选择物料"
            class="!w-240px"
        >
          <el-option
              v-for="item in materialList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="请求数量" prop="requestedQuantity">
        <el-input v-model="formData.requestedQuantity" placeholder="请输入请求数量" :readonly="isReadonly" />
      </el-form-item>
      <el-form-item label="批准数量" prop="approvedQuantity">
        <el-input v-model="formData.approvedQuantity" placeholder="请输入批准数量" :readonly="isReadonly" />
      </el-form-item>
<!--      <el-form-item label="实际领用数量" prop="actualQuantity">-->
<!--        <el-input v-model="formData.actualQuantity" placeholder="请输入实际领用数量" :readonly="isReadonly" />-->
<!--      </el-form-item>-->
<!--      <el-form-item label="状态" prop="status" v-if="formType !== 'create'">-->
<!--        <el-radio-group v-model="formData.status" :disabled="isReadonly">-->
<!--          <el-radio value="1">请选择字典生成</el-radio>-->
<!--        </el-radio-group>-->
<!--      </el-form-item>-->
      <el-form-item label="请求时间" prop="requestTime">
        <el-date-picker
          v-model="formData.requestTime"
          type="date"
          value-format="x"
          placeholder="选择请求时间"
          :readonly="isReadonly"
        />
      </el-form-item>
      <el-form-item label="批准时间" prop="approvalTime">
        <el-date-picker
          v-model="formData.approvalTime"
          type="date"
          value-format="x"
          placeholder="选择批准时间"
          :readonly="isReadonly"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button v-if="!isReadonly" @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">{{ isReadonly ? '关 闭' : '取 消' }}</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { MaterialRequestApi, MaterialRequestVO } from '@/api/erp/production/material'
import {ProductApi, ProductVO} from "@/api/erp/product/product";

/** ERP 物料请求 表单 */
defineOptions({ name: 'MaterialRequestForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改；detail - 查看详情
const isReadonly = computed(() => formType.value === 'detail') // 是否只读模式
const formData = ref({
  id: undefined,
  orderId: undefined,
  materialId: undefined,
  requestedQuantity: undefined,
  approvedQuantity: undefined,
  actualQuantity: undefined,
  status: undefined,
  requestTime: undefined,
  approvalTime: undefined,
})
const formRules = reactive({
  orderId: [{ required: true, message: '订单ID不能为空', trigger: 'blur' }],
  materialId: [{ required: true, message: '物料ID不能为空', trigger: 'blur' }],
  requestedQuantity: [{ required: true, message: '请求数量不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'blur' }],
  requestTime: [{ required: true, message: '请求时间不能为空', trigger: 'blur' }],
})
const formRef = ref() // 表单 Ref

const materialList = ref<ProductVO[]>([]) // 物料列表（使用产品作为物料）

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
      formData.value = await MaterialRequestApi.getMaterialRequest(id)
    } finally {
      formLoading.value = false
    }
  }
  // 加载物料列表（只显示原材料类型的产品）
  materialList.value = await ProductApi.getProductSimpleListByType('RM')
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
    const data = formData.value as unknown as MaterialRequestVO
    if (formType.value === 'create') {
      await MaterialRequestApi.createMaterialRequest(data)
      message.success(t('common.createSuccess'))
    } else {
      await MaterialRequestApi.updateMaterialRequest(data)
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
    orderId: undefined,
    materialId: undefined,
    requestedQuantity: undefined,
    approvedQuantity: undefined,
    actualQuantity: undefined,
    status: formType.value === 'create' ? 10 : undefined, // 创建时默认为未审批状态
    requestTime: undefined,
    approvalTime: undefined,
  }
  formRef.value?.resetFields()
}
</script>
