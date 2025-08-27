<!-- ERP 仓库表单 -->
<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1200px">
    <div class="warehouse-form-container">
      <!-- 左侧：仓库基本信息 -->
      <div class="warehouse-basic-section">
        <div class="section-header">
          <h3>仓库基本信息</h3>
        </div>
        <el-form
          ref="formRef"
          :model="formData"
          :rules="formRules"
          label-width="100px"
          v-loading="formLoading"
        >
          <el-form-item label="仓库名称" prop="name">
            <el-input v-model="formData.name" placeholder="请输入仓库名称" />
          </el-form-item>
          <el-form-item label="仓库地址" prop="address">
            <el-input v-model="formData.address" placeholder="请输入仓库地址" />
          </el-form-item>
          <el-form-item label="仓库类型" prop="warehouseType">
            <el-select v-model="formData.warehouseType" placeholder="请选择仓库类型" class="!w-1/1" @change="handleWarehouseTypeChange">
              <el-option
                  v-for="dict in getIntDictOptions(DICT_TYPE.ERP_WAREHOUSE_TYPE)"
                  :key="dict.value"
                  :label="dict.label"
                  :value="dict.value"
                />
            </el-select>
          </el-form-item>
          <el-form-item label="仓库状态" prop="status">
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
          <el-form-item label="仓储费" prop="warehousePrice">
            <el-input-number
              v-model="formData.warehousePrice"
              placeholder="请输入仓储费，单位：元/天/KG"
              :min="0"
              :precision="2"
              class="!w-1/1"
            />
          </el-form-item>
          <el-form-item label="搬运费" prop="truckagePrice">
            <el-input-number
              v-model="formData.truckagePrice"
              placeholder="请输入搬运费，单位：元"
              :min="0"
              :precision="2"
              class="!w-1/1"
            />
          </el-form-item>
          <el-form-item label="负责人" prop="principal">
            <el-input v-model="formData.principal" placeholder="请输入负责人" />
          </el-form-item>
          <el-form-item label="排序" prop="sort">
            <el-input-number
              v-model="formData.sort"
              placeholder="请输入排序"
              :precision="0"
              class="!w-1/1"
            />
          </el-form-item>
          <el-form-item label="备注" prop="remark">
            <el-input type="textarea" v-model="formData.remark" placeholder="请输入备注" />
          </el-form-item>
        </el-form>
        
        <!-- 仓库信息提交按钮 -->
        <div class="section-footer">
          <el-button @click="submitWarehouseForm" type="primary" :loading="formLoading">
            {{ formType === 'create' ? '创建仓库' : '更新仓库信息' }}
          </el-button>
        </div>
      </div>
      
      <!-- 右侧：设备管理 -->
      <div class="device-management-section" v-if="formType === 'update' && formData.warehouseType === 1">
        <div class="section-header">
          <h3><el-icon><Monitor /></el-icon> 温控设备管理</h3>
        </div>
        
        <div v-if="deviceBinding" class="device-config-card">
          <div class="device-info-header">
            <span class="device-name">{{ deviceBinding.deviceName }}</span>
            <div class="device-actions">
              <el-button 
                type="primary" 
                size="small" 
                :loading="deviceFormLoading"
                @click="updateDeviceConfig"
              >
                更新配置
              </el-button>
              <el-button 
                type="danger" 
                size="small" 
                :loading="unbindLoading"
                @click="handleUnbindDevice"
              >
                解除绑定
              </el-button>
            </div>
          </div>
          
          <div class="device-bind-info">
             <div class="info-row">
               <span class="bind-time">绑定时间：{{ formatBindTime(deviceBinding.bindTime) }}</span>
             </div>
             <div class="info-row">
               <span class="update-time">更新时间：{{ formatBindTime(deviceBinding.updateTime) }}</span>
             </div>
           </div>
          
          <!-- 设备配置表单 -->
          <el-form 
            ref="deviceFormRef" 
            :model="deviceFormData" 
            :rules="deviceFormRules" 
            label-width="120px"
            class="device-form"
          >
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="最低温度" prop="minTemp">
                  <el-input-number 
                    v-model="deviceFormData.minTemp" 
                    :min="-50" 
                    :max="50" 
                    :precision="0"
                    controls-position="right"
                    style="width: 100%"
                  >
                    <template #append>°C</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="最高温度" prop="maxTemp">
                  <el-input-number 
                    v-model="deviceFormData.maxTemp" 
                    :min="-50" 
                    :max="50" 
                    :precision="0"
                    controls-position="right"
                    style="width: 100%"
                  >
                    <template #append>°C</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row>
              <el-col :span="12">
                <el-form-item label="锁单超时时间" prop="lockTimeoutS">
                  <el-input-number 
                    v-model="deviceFormData.lockTimeoutS" 
                    :min="1" 
                    :max="3600" 
                    :precision="0"
                    controls-position="right"
                    style="width: 100%"
                  >
                    <template #append>秒</template>
                  </el-input-number>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
        
        <div v-else class="no-device">
          <el-empty description="暂无绑定设备" />
        </div>
      </div>
      
      <!-- 非温控仓库的占位区域 -->
      <div class="placeholder-section" v-else>
        <el-empty description="常温仓库无需设备管理" :image-size="100" />
      </div>
    </div>
    
    <template #footer>
      <el-button @click="dialogVisible = false">取 消</el-button>
      <el-button @click="submitWarehouseForm" :loading="formLoading" type="primary">
        {{ formType === 'create' ? '创 建' : '确 定' }}
      </el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { getIntDictOptions, DICT_TYPE } from '@/utils/dict'
import { WarehouseApi, WarehouseVO, WarehouseTempBindingVO } from '@/api/erp/stock/warehouse'
import { CommonStatusEnum } from '@/utils/constants'
import { formatDate } from '@/utils/formatTime'
import { Monitor } from '@element-plus/icons-vue'

/** ERP 仓库表单 */
defineOptions({ name: 'WarehouseForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const deviceBinding = ref<WarehouseTempBindingVO | null>(null) // 设备绑定信息
const unbindLoading = ref(false) // 解绑按钮加载状态

// 设备配置表单相关
const deviceFormRef = ref() // 设备表单 Ref
const deviceFormLoading = ref(false) // 设备表单加载状态
const deviceFormData = ref({
  minTemp: 2,
  maxTemp: 8,
  lockTimeoutS: 300
})
const formData = ref({
  id: undefined,
  name: undefined,
  address: undefined,
  warehouseType: undefined,
  sort: undefined,
  remark: undefined,
  principal: undefined,
  warehousePrice: undefined,
  truckagePrice: undefined,
  status: CommonStatusEnum.ENABLE
})
const formRules = reactive({
  name: [{ required: true, message: '仓库名称不能为空', trigger: 'blur' }],
  warehouseType: [{ required: true, message: '仓库类型不能为空', trigger: 'change' }],
  sort: [{ required: true, message: '排序不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '开启状态不能为空', trigger: 'blur' }]
})

// 设备表单验证规则
const deviceFormRules = reactive({
  minTemp: [
    { required: true, message: '请输入最低温度', trigger: 'blur' }
  ],
  maxTemp: [
    { required: true, message: '请输入最高温度', trigger: 'blur' }
  ],
  lockTimeoutS: [
    { required: true, message: '请输入锁单超时时间', trigger: 'blur' },
    { min: 1, message: '超时时间必须大于0', trigger: 'blur' }
  ]
})
const formRef = ref() // 表单 Ref

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
      formData.value = await WarehouseApi.getWarehouse(id)
      // 如果是温控仓库，获取设备绑定信息
      if (formData.value.warehouseType === 1) {
        await loadDeviceBinding(id)
      }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交仓库表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitWarehouseForm = async () => {
  // 校验表单
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value as unknown as WarehouseVO
    if (formType.value === 'create') {
      await WarehouseApi.createWarehouse(data)
      message.success(t('common.createSuccess'))
    } else {
      await WarehouseApi.updateWarehouse(data)
      message.success('仓库信息更新成功')
    }
    // 关闭对话框
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
    name: undefined,
    address: undefined,
    warehouseType: undefined,
    sort: undefined,
    remark: undefined,
    principal: undefined,
    warehousePrice: undefined,
    truckagePrice: undefined,
    status: CommonStatusEnum.ENABLE
  }
  deviceBinding.value = null
  formRef.value?.resetFields()
}

/** 处理仓库类型变化 */
const handleWarehouseTypeChange = async (warehouseType: number) => {
  // 如果切换为温控仓库且是编辑模式，加载设备绑定信息
  if (warehouseType === 1 && formType.value === 'update' && formData.value.id) {
    await loadDeviceBinding(formData.value.id)
  } else {
    deviceBinding.value = null
  }
}

/** 加载设备绑定信息 */
const loadDeviceBinding = async (warehouseId: number) => {
  try {
    const bindings = await WarehouseApi.getWarehouseDeviceBindings(warehouseId)
    if (bindings && bindings.length > 0) {
      deviceBinding.value = bindings[0]
      // 同步设备配置数据到表单
      deviceFormData.value = {
        minTemp: bindings[0].minTemp,
        maxTemp: bindings[0].maxTemp,
        lockTimeoutS: bindings[0].lockTimeoutS
      }
    } else {
      deviceBinding.value = null
      // 重置设备表单数据
      deviceFormData.value = {
        minTemp: 2,
        maxTemp: 8,
        lockTimeoutS: 300
      }
    }
  } catch (error) {
    console.error('获取设备绑定信息失败:', error)
    deviceBinding.value = null
  }
}

/** 处理设备解绑 */
const handleUnbindDevice = async () => {
  if (!deviceBinding.value || !formData.value.id) return
  
  try {
    await message.confirm(`确认要解绑设备"${deviceBinding.value.deviceName}"吗？`)
    unbindLoading.value = true
    await WarehouseApi.unbindDevice(formData.value.id, deviceBinding.value.deviceId)
    message.success('设备解绑成功')
    deviceBinding.value = null
    // 通知父组件刷新数据
    emit('success')
  } catch (error) {
    if (error !== 'cancel') {
      message.error('设备解绑失败')
    }
  } finally {
    unbindLoading.value = false
  }
}

/** 更新设备配置 */
const updateDeviceConfig = async () => {
  if (!deviceBinding.value || !formData.value.id) return
  
  try {
    // 校验设备表单
    await deviceFormRef.value?.validate()
    
    // 验证温度范围
    if (deviceFormData.value.minTemp >= deviceFormData.value.maxTemp) {
      message.error('最低温度必须小于最高温度')
      return
    }
    
    deviceFormLoading.value = true
    
    // 构建更新请求数据
    const updateData = {
      warehouseId: formData.value.id,
      deviceId: deviceBinding.value.deviceId,
      minTemp: deviceFormData.value.minTemp,
      maxTemp: deviceFormData.value.maxTemp,
      lockTimeoutS: deviceFormData.value.lockTimeoutS
    }
    
    // 先解绑再重新绑定（实现更新效果）
    await WarehouseApi.unbindDevice(formData.value.id, deviceBinding.value.deviceId)
    await WarehouseApi.bindDevice(updateData)
    
    message.success('设备配置更新成功')
    
    // 重新加载设备绑定信息
    await loadDeviceBinding(formData.value.id)
    
    // 通知父组件刷新数据
    emit('success')
  } catch (error) {
    message.error('设备配置更新失败')
  } finally {
    deviceFormLoading.value = false
  }
}

/** 格式化绑定时间 */
const formatBindTime = (time: string) => {
  return formatDate(new Date(time), 'YYYY-MM-DD HH:mm:ss')
}
</script>

<style scoped>
.warehouse-form-container {
  display: flex;
  gap: 24px;
  min-height: 600px;
}

.warehouse-basic-section,
.device-management-section,
.placeholder-section {
  flex: 1;
  padding: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background-color: #fafafa;
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #409eff;
}

.section-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-footer {
  margin-top: 20px;
  text-align: center;
}

/* 设备配置卡片样式 */
.device-config-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.device-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.device-name {
  font-weight: 600;
  color: #303133;
  font-size: 16px;
}

.device-actions {
  display: flex;
  gap: 8px;
}

.device-bind-info {
  margin-bottom: 20px;
  padding: 12px 16px;
  background-color: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #409eff;
}

.info-row {
  margin-bottom: 6px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.bind-time,
.update-time {
  color: #606266;
  font-size: 13px;
  display: inline-block;
}

.device-form {
  margin-top: 16px;
}

.device-form .el-form-item {
  margin-bottom: 18px;
}

.no-device {
  text-align: center;
  padding: 40px 20px;
}

.placeholder-section {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .warehouse-form-container {
    flex-direction: column;
  }
  
  .warehouse-basic-section,
  .device-management-section,
  .placeholder-section {
    flex: none;
  }
}
</style>
