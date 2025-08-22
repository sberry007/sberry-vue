<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="500px">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="设备名称" prop="name">
        <el-input 
          v-model="formData.name" 
          placeholder="请输入设备名称" 
          maxlength="50"
          show-word-limit
        >
          <template #suffix>
            <el-tooltip content="点击快速填充设备名称" placement="top">
              <Icon 
                icon="ep:magic-stick" 
                class="quick-fill-icon" 
                @click="quickFillDeviceName"
              />
            </el-tooltip>
          </template>
        </el-input>
      </el-form-item>
      
      <!-- 添加设备说明 -->
      <div class="form-tips" v-if="!formData.id">
        <el-alert
          title="设备创建说明"
          type="info"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>• 设备序列号(SN)和密钥将由系统自动生成</p>
            <p>• 创建成功后可在设备详情中查看和复制连接信息</p>
            <p>• 设备首次连接后将自动激活</p>
          </template>
        </el-alert>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">
        <Icon icon="ep:plus" class="mr-5px" v-if="!formData.id" />
        <Icon icon="ep:edit" class="mr-5px" v-else />
        {{ formData.id ? '更新设备' : '创建设备' }}
      </el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { TempDeviceApi, TempDeviceVO } from '@/api/system/tempdevice'

/** 温控设备 表单 */
defineOptions({ name: 'TempDeviceForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  name: undefined as string | undefined
})
const formRules = reactive({
  name: [
    { required: true, message: '设备名称不能为空', trigger: 'blur' },
    { min: 2, max: 50, message: '设备名称长度应在2-50个字符之间', trigger: 'blur' }
  ]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number, presetName?: string) => {
  dialogVisible.value = true
  dialogTitle.value = type === 'create' ? '创建温控设备' : '编辑温控设备'
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      const deviceData = await TempDeviceApi.getTempDevice(id)
      // 编辑时只允许修改设备名称
      formData.value = {
        id: deviceData.id,
        name: deviceData.name
      }
    } finally {
      formLoading.value = false
    }
  } else if (presetName) {
    // 创建时设置预设名称
    formData.value.name = presetName
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
    const data = formData.value as unknown as TempDeviceVO
    if (formType.value === 'create') {
      await TempDeviceApi.createTempDevice(data)
      message.success(t('common.createSuccess'))
    } else {
      await TempDeviceApi.updateTempDevice(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 生成随机三位数 */
const generateRandomNumber = () => {
  return Math.floor(Math.random() * 900) + 100 // 生成100-999的随机数
}

/** 快速填充设备名称 */
const quickFillDeviceName = () => {
  const presetName = `温控设备${generateRandomNumber()}`
  formData.value.name = presetName
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    name: undefined
  }
  formRef.value?.resetFields()
}
</script>

<style scoped>
.form-tips {
  margin: 16px 0;
}

.quick-fill-icon {
  cursor: pointer;
  color: #909399;
  font-size: 16px;
  transition: all 0.3s ease;
  padding: 4px;
  border-radius: 4px;
}

.quick-fill-icon:hover {
  color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
  transform: scale(1.1);
}

.form-tips :deep(.el-alert__content) {
  line-height: 1.6;
}

.form-tips p {
  margin: 4px 0;
  font-size: 13px;
}
</style>