<!-- ERP 仓库列表 -->
<template>

  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="仓库名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入仓库名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="仓库状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择仓库状态"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['erp:warehouse:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:warehouse:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="仓库名称" align="center" prop="name" />
      <el-table-column label="仓库地址" align="center" prop="address" />
      <el-table-column label="仓库类型" align="center" prop="warehouseType" width="100px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.ERP_WAREHOUSE_TYPE" :value="scope.row.warehouseType" />
        </template>
      </el-table-column>
      <el-table-column label="绑定设备" align="center" prop="deviceName" width="120px">
        <template #default="scope">
          <span v-if="scope.row.deviceName">{{ scope.row.deviceName }}</span>
          <el-button
             v-else-if="scope.row.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED"
             link
             type="success"
             @click="openBindDeviceDialog(scope.row)"
             v-hasPermi="['erp:warehouse:create']"
           >
             绑定设备
           </el-button>
          <span v-else class="text-red-500">无法绑定</span>
        </template>
      </el-table-column>
      <el-table-column
        label="仓储费"
        align="center"
        prop="warehousePrice"
        :formatter="erpPriceTableColumnFormatter"
      />
      <el-table-column
        label="搬运费"
        align="center"
        prop="truckagePrice"
        :formatter="erpPriceTableColumnFormatter"
      />
      <el-table-column label="负责人" align="center" prop="principal" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="排序" align="center" prop="sort" />
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="是否默认" align="center" prop="defaultStatus">
        <template #default="scope">
          <el-switch
            v-model="scope.row.defaultStatus"
            :active-value="true"
            :inactive-value="false"
            @change="handleDefaultStatusChange(scope.row)"
          />
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" width="200px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:warehouse:update']"
          >
            编辑
          </el-button>
          <el-button
            v-if="scope.row.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED && !scope.row.deviceId"
            link
            type="success"
            @click="openBindDeviceDialog(scope.row)"
            v-hasPermi="['erp:warehouse:bind-device']"
          >
            绑定设备
          </el-button>
          <el-button
            v-if="scope.row.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED && scope.row.deviceId"
            link
            type="warning"
            @click="openTempDetailDialog(scope.row)"
          >
            温控详情
          </el-button>
          <el-button
            v-if="scope.row.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED && scope.row.deviceId"
            link
            type="danger"
            @click="handleUnbindDevice(scope.row)"
            v-hasPermi="['erp:warehouse:unbind-device']"
          >
            解绑设备
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:warehouse:delete']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <WarehouseForm ref="formRef" @success="getList" />

  <!-- 设备绑定对话框 -->
  <el-dialog v-model="bindDeviceDialogVisible" title="绑定温控设备" width="800px">
    <div v-if="bindableDevices.length === 0" class="no-devices-tip">
      <el-empty description="暂无可绑定的设备" />
    </div>
    <div v-else>
      <!-- 设备选择区域 -->
      <div class="device-selection-area">
        <h4>选择设备</h4>
        <div class="device-list">
          <div 
            v-for="device in bindableDevices" 
            :key="device.id"
            class="device-card"
            :class="{ 'selected': bindDeviceForm.deviceId === device.id }"
            @click="selectDevice(device)"
          >
            <div class="device-info">
               <div class="device-name">{{ device.deviceName }}</div>
               <div class="device-details">
                 <span class="device-sn">设备编号: {{ device.deviceSn }}</span>
                 <span class="device-status" :class="device.activeStatus === 1 ? 'online' : 'offline'">
                   {{ device.activeStatus === 1 ? '在线' : '离线' }}
                 </span>
               </div>
             </div>
            <div class="device-select-icon">
              <el-icon v-if="bindDeviceForm.deviceId === device.id"><Check /></el-icon>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 温控参数配置 -->
      <div class="temp-config-area" v-if="bindDeviceForm.deviceId > 0">
        <h4>温控参数配置</h4>
        <el-form :model="bindDeviceForm" :rules="bindDeviceRules" ref="bindDeviceFormRef" label-width="120px">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="最低温度" prop="minTemp">
                <el-input-number v-model="bindDeviceForm.minTemp" :precision="1" :step="0.1" :min="-50" :max="50" style="width: 100%" />
                <span class="ml-2 text-gray-500">°C</span>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="最高温度" prop="maxTemp">
                <el-input-number v-model="bindDeviceForm.maxTemp" :precision="1" :step="0.1" :min="-50" :max="50" style="width: 100%" />
                <span class="ml-2 text-gray-500">°C</span>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="超时时间" prop="timeoutSeconds">
            <el-input-number v-model="bindDeviceForm.timeoutSeconds" :min="60" :max="3600" :step="60" style="width: 200px" />
            <span class="ml-2 text-gray-500">秒（设备离线超时时间）</span>
          </el-form-item>
        </el-form>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="bindDeviceDialogVisible = false">取消</el-button>
      <el-button 
        type="primary" 
        @click="handleBindDevice" 
        :loading="bindDeviceLoading"
        :disabled="bindDeviceForm.deviceId === 0"
      >
        确定绑定
      </el-button>
    </template>
  </el-dialog>

  <!-- 温控详情对话框 -->
  <WarehouseTempDetail v-model="tempDetailDialogVisible" :warehouse="selectedWarehouse" />
</template>

<script setup lang="ts">
import { getIntDictOptions, DICT_TYPE } from '@/utils/dict'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { WarehouseApi, WarehouseVO, TempDeviceVO, DeviceBindReqVO } from '@/api/erp/stock/warehouse'
import WarehouseForm from './WarehouseForm.vue'
import WarehouseTempDetail from './components/WarehouseTempDetail.vue'
import { erpPriceTableColumnFormatter } from '@/utils'
import { Check } from '@element-plus/icons-vue'

// 仓库类型常量
const WAREHOUSE_TYPE = {
  NORMAL: 0, // 常温仓库
  TEMP_CONTROLLED: 1 // 温控仓库
}

/** ERP 仓库列表 */
defineOptions({ name: 'ErpWarehouse' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<WarehouseVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  status: undefined
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

// 设备绑定相关
const bindDeviceDialogVisible = ref(false)
const bindDeviceForm = ref<DeviceBindReqVO>({
  warehouseId: 0,
  deviceId: 0,
  minTemp: 2,
  maxTemp: 8,
  timeoutSeconds: 300
})
const bindDeviceFormRef = ref()
const bindDeviceLoading = ref(false)
const bindableDevices = ref<TempDeviceVO[]>([])

// 温控详情相关
const tempDetailDialogVisible = ref(false)
const selectedWarehouse = ref<WarehouseVO | null>(null)

// 表单验证规则
const bindDeviceRules = {
  minTemp: [{ required: true, message: '请输入最低温度', trigger: 'blur' }],
  maxTemp: [{ required: true, message: '请输入最高温度', trigger: 'blur' }],
  timeoutSeconds: [{ required: true, message: '请输入超时时间', trigger: 'blur' }]
}

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await WarehouseApi.getWarehousePage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await WarehouseApi.deleteWarehouse(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 修改默认状态 */
const handleDefaultStatusChange = async (row: WarehouseVO) => {
  try {
    // 修改状态的二次确认
    const text = row.defaultStatus ? '设置' : '取消'
    await message.confirm('确认要' + text + '"' + row.name + '"默认吗?')
    // 发起修改状态
    await WarehouseApi.updateWarehouseDefaultStatus(row.id, row.defaultStatus)
    // 刷新列表
    await getList()
  } catch (e) {
    // 取消后，进行恢复按钮
    row.defaultStatus = !row.defaultStatus
  }
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await WarehouseApi.exportWarehouse(queryParams)
    download.excel(data, '仓库.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 打开设备绑定对话框 */
const openBindDeviceDialog = async (warehouse: WarehouseVO) => {
  // 重置表单
  bindDeviceForm.value = {
    warehouseId: warehouse.id,
    deviceId: 0,
    minTemp: 2,
    maxTemp: 8,
    timeoutSeconds: 300
  }
  
  // 先打开对话框
  bindDeviceDialogVisible.value = true
  
  try {
    // 获取可绑定的设备列表
    const devices = await WarehouseApi.getBindableDevices()
    bindableDevices.value = devices
  } catch (error) {
    message.error('获取可绑定设备列表失败')
    bindableDevices.value = [] // 设置为空数组，避免显示旧数据
  }
}

/** 选择设备 */
const selectDevice = (device: TempDeviceVO) => {
  bindDeviceForm.value.deviceId = device.id
}

/** 处理设备绑定 */
const handleBindDevice = async () => {
  try {
    // 验证是否选择了设备
    if (bindDeviceForm.value.deviceId === 0) {
      message.error('请选择要绑定的设备')
      return
    }
    
    await bindDeviceFormRef.value?.validate()
    
    // 验证温度范围
    if (bindDeviceForm.value.minTemp >= bindDeviceForm.value.maxTemp) {
      message.error('最低温度必须小于最高温度')
      return
    }
    
    bindDeviceLoading.value = true
    await WarehouseApi.bindDevice(bindDeviceForm.value)
    message.success('设备绑定成功')
    bindDeviceDialogVisible.value = false
    await getList()
  } catch (error) {
    message.error('设备绑定失败')
  } finally {
    bindDeviceLoading.value = false
  }
}

/** 处理设备解绑 */
const handleUnbindDevice = async (warehouse: WarehouseVO) => {
  try {
    await message.confirm(`确认要解绑仓库"${warehouse.name}"的温控设备吗？`)
    await WarehouseApi.unbindDevice(warehouse.id, warehouse.deviceId!)
    message.success('设备解绑成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel') {
      message.error('设备解绑失败')
    }
  }
}

/** 打开温控详情对话框 */
const openTempDetailDialog = (warehouse: WarehouseVO) => {
  selectedWarehouse.value = warehouse
  tempDetailDialogVisible.value = true
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>

<style scoped>
/* 设备绑定对话框样式 */
.no-devices-tip {
  text-align: center;
  padding: 40px 0;
}

.device-selection-area {
  margin-bottom: 24px;
}

.device-selection-area h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.device-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
}

.device-card {
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
}

.device-card:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.device-card.selected {
  border-color: #409eff;
  background: #f0f9ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.2);
}

.device-info {
  flex: 1;
}

.device-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.device-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.device-details span {
  font-size: 13px;
  color: #606266;
}

.device-sn {
  font-family: 'Courier New', monospace;
}

.device-status {
  font-weight: 600;
}

.device-status.online {
  color: #67c23a;
}

.device-status.offline {
  color: #f56c6c;
}

.device-select-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #409eff;
  font-size: 18px;
}

.temp-config-area {
  border-top: 1px solid #e4e7ed;
  padding-top: 24px;
}

.temp-config-area h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 温控详情对话框样式 */
.temp-detail-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.temp-info-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.temp-card {
  text-align: center;
}

.temp-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.temp-value .value {
  font-size: 32px;
  font-weight: bold;
  color: #409eff;
}

.temp-value .unit {
  font-size: 16px;
  color: #909399;
}

.temp-range {
  font-size: 18px;
  font-weight: 600;
  color: #606266;
}

.temp-chart-container {
  height: 400px;
}

.temp-chart {
  width: 100%;
  height: 100%;
}
</style>
