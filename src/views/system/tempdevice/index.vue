<template>
  <!-- 设备状态统计卡片 -->
  <ContentWrap>
    <div class="stats-cards">
      <div 
        class="stat-card" 
        :class="{ active: selectedStatus === 'all' }"
        @click="handleStatusFilter('all')"
      >
        <div class="stat-icon all">
          <Icon icon="ep:monitor" />
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStats.total }}</div>
          <div class="stat-label">全部设备</div>
        </div>
      </div>
      
      <div 
        class="stat-card" 
        :class="{ active: selectedStatus === 'active' }"
        @click="handleStatusFilter('active')"
      >
        <div class="stat-icon active">
          <Icon icon="ep:check" />
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStats.active }}</div>
          <div class="stat-label">激活设备</div>
          <div class="stat-percentage">{{ deviceStats.activePercentage }}%</div>
        </div>
      </div>
      
      <div 
        class="stat-card" 
        :class="{ active: selectedStatus === 'online' }"
        @click="handleStatusFilter('online')"
      >
        <div class="stat-icon online">
          <Icon icon="ep:connection" />
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStats.online }}</div>
          <div class="stat-label">在线设备</div>
          <div class="stat-percentage">{{ deviceStats.onlinePercentage }}%</div>
        </div>
      </div>
      
      <div 
        class="stat-card" 
        :class="{ active: selectedStatus === 'offline' }"
        @click="handleStatusFilter('offline')"
      >
        <div class="stat-icon offline">
          <Icon icon="ep:close" />
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStats.offline }}</div>
          <div class="stat-label">离线设备</div>
          <div class="stat-percentage">{{ deviceStats.offlinePercentage }}%</div>
        </div>
      </div>
      
      <div 
        class="stat-card" 
        :class="{ active: selectedStatus === 'inactive' }"
        @click="handleStatusFilter('inactive')"
      >
        <div class="stat-icon inactive">
          <Icon icon="ep:warning" />
        </div>
        <div class="stat-content">
          <div class="stat-number">{{ deviceStats.inactive }}</div>
          <div class="stat-label">未激活设备</div>
          <div class="stat-percentage">{{ deviceStats.inactivePercentage }}%</div>
        </div>
      </div>
    </div>
  </ContentWrap>

  <!-- 搜索工作栏 -->
  <ContentWrap>
    <div class="search-container">
      <!-- WebSocket 连接状态指示器 -->
      <div class="ws-status-indicator">
        <el-tag 
          :type="wsConnected ? 'success' : 'danger'" 
          size="small"
          effect="dark"
        >
          <Icon :icon="wsConnected ? 'ep:connection' : 'ep:close'" class="mr-5px" />
          {{ wsConnected ? '实时推送已连接' : '实时推送已断开' }}
        </el-tag>
      </div>
      
      <el-form
        class="search-form"
        :model="queryParams"
        ref="queryFormRef"
        :inline="true"
        label-width="68px"
      >
        <div class="search-row">
           <div class="search-inputs">
             <el-form-item label="设备名称" prop="name" class="search-item">
               <el-input
                 v-model="queryParams.name"
                 placeholder="请输入设备名称"
                 clearable
                 @keyup.enter="handleQuery"
                 class="search-input"
                 prefix-icon="Search"
               />
             </el-form-item>
             <el-form-item label="创建时间" prop="createTime" class="search-item">
               <el-date-picker
                 v-model="queryParams.createTime"
                 value-format="YYYY-MM-DD HH:mm:ss"
                 type="datetimerange"
                 start-placeholder="开始日期"
                 end-placeholder="结束日期"
                 :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
                 class="search-date-picker"
               />
             </el-form-item>
           </div>
           <div class="search-actions">
            <el-button class="search-btn" @click="handleQuery">
              <Icon icon="ep:search" class="mr-5px" /> 搜索
            </el-button>
            <el-button class="reset-btn" @click="resetQuery">
              <Icon icon="ep:refresh" class="mr-5px" /> 重置
            </el-button>
            <el-button
              type="primary"
              class="add-btn"
              @click="openForm('create')"
              v-hasPermi="['system:temp-device:create']"
            >
              <Icon icon="ep:plus" class="mr-5px" /> 新增设备
            </el-button>
          </div>
        </div>
      </el-form>
    </div>
  </ContentWrap>

  <!-- 设备卡片列表 -->
  <ContentWrap>
    <div v-loading="loading" class="device-grid">
      <div v-if="list.length === 0" class="empty-state">
        <el-empty description="暂无设备数据" />
      </div>
      <div
          v-for="device in list"
          :key="device.id"
          class="device-card"
          :class="{
            'device-active': device.activeStatus === 1,
            'device-inactive': device.activeStatus === 0
          }"
        >
          <!-- 设备类型图标 -->
          <div class="device-type-icon">
            <Icon icon="ep:cpu" />
          </div>
          
          <!-- 设备状态指示器 -->
          <div class="device-status-indicator">
            <div class="status-dot" :class="getStatusClass(device)"></div>
          </div>

        <!-- 设备信息 -->
        <div class="device-info">
          <div class="device-header">
            <h3 class="device-name">{{ device.name }}</h3>
            <div class="device-badges">
              <el-tag
                :type="device.activeStatus === 1 ? 'success' : 'info'"
                size="small"
              >
                {{ device.activeStatus === 1 ? '已激活' : '未激活' }}
              </el-tag>
              <el-tag
                v-if="device.activeStatus === 1"
                :type="device.onlineStatus === 1 ? 'success' : 'danger'"
                size="small"
              >
                {{ device.onlineStatus === 1 ? '在线' : '离线' }}
              </el-tag>
            </div>
          </div>

          <div class="device-details">
            <div class="detail-item">
              <Icon icon="ep:cpu" class="detail-icon" />
              <span class="detail-label">序列号:</span>
              <span class="detail-value">{{ device.sn }}</span>
            </div>
            <div class="detail-item" v-if="device.lastSeen">
              <Icon icon="ep:clock" class="detail-icon" />
              <span class="detail-label">最近上报:</span>
              <span class="detail-value">{{ formatTime(device.lastSeen) }}</span>
            </div>
            <div class="detail-item" v-if="device.warehouseName">
              <Icon icon="ep:office-building" class="detail-icon" />
              <span class="detail-label">绑定仓库:</span>
              <span class="detail-value">{{ device.warehouseName }}</span>
            </div>
            <div class="detail-item">
              <Icon icon="ep:calendar" class="detail-icon" />
              <span class="detail-label">创建时间:</span>
              <span class="detail-value">{{ formatTime(device.createTime) }}</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="device-actions">
          <el-button
            type="primary"
            size="small"
            @click="openDeviceDetail(device)"
            v-hasPermi="['system:temp-device:details']"
          >
            <Icon icon="ep:view" class="mr-5px" /> 详情
          </el-button>
          <el-button
            type="warning"
            size="small"
            @click="openForm('update', device.id)"
            v-hasPermi="['system:temp-device:update']"
          >
            <Icon icon="ep:edit" class="mr-5px" /> 编辑
          </el-button>
          <el-button
            type="danger"
            size="small"
            @click="handleDelete(device.id)"
            v-hasPermi="['system:temp-device:delete']"
          >
            <Icon icon="ep:delete" class="mr-5px" /> 删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <TempDeviceForm ref="formRef" @success="getList" />

  <!-- 设备详情弹窗 -->
  <DeviceDetailDialog ref="detailRef" />
</template>

<script setup lang="ts">
import { formatDate } from '@/utils/formatTime'
import { TempDeviceApi, TempDeviceVO } from '@/api/system/tempdevice'
import { getAccessToken } from '@/utils/auth'
import TempDeviceForm from './TempDeviceForm.vue'
import DeviceDetailDialog from './DeviceDetailDialog.vue'

/** 温控设备 列表 */
defineOptions({ name: 'TempDevice' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

// WebSocket 连接
let websocket: WebSocket | null = null
const wsConnected = ref(false)

const loading = ref(true) // 列表的加载中
const list = ref<TempDeviceVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const selectedStatus = ref('all') // 当前选中的状态过滤
const queryParams = reactive({
  pageNo: 1,
  pageSize: 12, // 卡片布局适合较少的每页数量
  name: undefined as string | undefined,
  createTime: undefined as string | undefined,
  activeStatus: undefined as number | undefined,
  onlineStatus: undefined as number | undefined
})

// 设备统计数据
const deviceStats = computed(() => {
  const stats = {
    total: list.value.length,
    active: 0,
    inactive: 0,
    online: 0,
    offline: 0,
    activePercentage: 0,
    inactivePercentage: 0,
    onlinePercentage: 0,
    offlinePercentage: 0
  }
  
  list.value.forEach(device => {
    if (device.activeStatus === 1) {
      stats.active++
      if (device.onlineStatus === 1) {
        stats.online++
      } else {
        stats.offline++
      }
    } else {
      stats.inactive++
    }
  })
  
  if (stats.total > 0) {
    stats.activePercentage = Math.round((stats.active / stats.total) * 100)
    stats.inactivePercentage = Math.round((stats.inactive / stats.total) * 100)
    stats.onlinePercentage = Math.round((stats.online / stats.total) * 100)
    stats.offlinePercentage = Math.round((stats.offline / stats.total) * 100)
  }
  
  return stats
})
const queryFormRef = ref() // 搜索的表单
const formRef = ref() // 表单 Ref
const detailRef = ref() // 详情弹窗 Ref

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await TempDeviceApi.getTempDevicePage(queryParams)
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
  selectedStatus.value = 'all'
  handleQuery()
}

/** 状态卡片点击处理 */
const handleStatusFilter = (status: string) => {
  selectedStatus.value = status
  queryParams.pageNo = 1
  
  // 根据选中状态设置查询参数
  switch (status) {
    case 'all':
      queryParams.activeStatus = undefined
      queryParams.onlineStatus = undefined
      break
    case 'active':
      queryParams.activeStatus = 1
      queryParams.onlineStatus = undefined
      break
    case 'inactive':
      queryParams.activeStatus = 0
      queryParams.onlineStatus = undefined
      break
    case 'online':
      queryParams.activeStatus = 1
      queryParams.onlineStatus = 1
      break
    case 'offline':
      queryParams.activeStatus = 1
      queryParams.onlineStatus = 0
      break
  }
  
  getList()
}

/** 添加/修改操作 */
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 打开设备详情 */
const openDeviceDetail = (device: TempDeviceVO) => {
  detailRef.value.open(device)
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await TempDeviceApi.deleteTempDevice(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 获取设备状态样式类 */
const getStatusClass = (device: TempDeviceVO) => {
  if (device.activeStatus === 0) {
    return 'status-inactive' // 未激活
  }
  return device.onlineStatus === 1 ? 'status-online' : 'status-offline'
}

/** 格式化时间 */
const formatTime = (time: any) => {
  if (!time) return '-'
  return formatDate(time)
}

// WebSocket 连接函数
const connectWebSocket = () => {
  try {
    // 获取当前用户的访问令牌
    const token = getAccessToken()
    if (!token) {
      console.warn('未获取到访问令牌，无法建立WebSocket连接')
      return
    }
    const wsUrl = `ws://localhost:58080/system/ws?token=${token}`
    websocket = new WebSocket(wsUrl)
    
    websocket.onopen = () => {
      console.log('WebSocket 连接已建立')
      wsConnected.value = true
      message.success('实时推送已连接')
    }
    
    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        handleWebSocketMessage(data)
      } catch (error) {
        console.error('解析WebSocket消息失败:', error)
      }
    }
    
    websocket.onclose = () => {
      console.log('WebSocket 连接已关闭')
      wsConnected.value = false
      // 尝试重连
      setTimeout(() => {
        if (!wsConnected.value) {
          connectWebSocket()
        }
      }, 5000)
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket 连接错误:', error)
      wsConnected.value = false
    }
  } catch (error) {
    console.error('创建WebSocket连接失败:', error)
  }
}

// 处理WebSocket消息
const handleWebSocketMessage = (data: any) => {
  if (data.type === 'temp_device_status') {
    const deviceStatus = data.content
    console.log('收到设备状态变更:', deviceStatus)
    
    // 显示通知消息
    let statusText = ''
    switch (deviceStatus.statusType) {
      case 'ONLINE':
        statusText = '上线'
        message.success(`设备 ${deviceStatus.deviceName} 已上线`)
        break
      case 'OFFLINE':
        statusText = '下线'
        message.warning(`设备 ${deviceStatus.deviceName} 已下线`)
        break
      case 'ACTIVATED':
        statusText = '激活'
        message.success(`设备 ${deviceStatus.deviceName} 已激活`)
        break
      case 'DEACTIVATED':
        statusText = '停用'
        message.warning(`设备 ${deviceStatus.deviceName} 已停用`)
        break
    }
    
    // 更新设备列表中对应设备的状态
    const deviceIndex = list.value.findIndex(device => device.id === deviceStatus.deviceId)
    if (deviceIndex !== -1) {
      list.value[deviceIndex].activeStatus = deviceStatus.activeStatus
      list.value[deviceIndex].onlineStatus = deviceStatus.onlineStatus
      list.value[deviceIndex].lastSeen = deviceStatus.lastSeen
    } else {
      // 如果设备不在当前列表中，刷新列表
      getList()
    }
  }
}

// 断开WebSocket连接
const disconnectWebSocket = () => {
  if (websocket) {
    websocket.close()
    websocket = null
    wsConnected.value = false
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
  connectWebSocket()
})

// 组件卸载时断开WebSocket连接
onUnmounted(() => {
  disconnectWebSocket()
})
</script>

<style scoped>
/* 统计卡片样式 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #e2e8f0, #cbd5e1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: #3b82f6;
}

.stat-card.active {
  border-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.15);
}

.stat-card.active::before {
  background: linear-gradient(90deg, #3b82f6, #1d4ed8);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
  flex-shrink: 0;
}

.stat-icon.all {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
}

.stat-icon.active {
  background: linear-gradient(135deg, #10b981, #059669);
}

.stat-icon.online {
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
}

.stat-icon.offline {
  background: linear-gradient(135deg, #ef4444, #dc2626);
}

.stat-icon.inactive {
  background: linear-gradient(135deg, #f59e0b, #d97706);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.stat-percentage {
  font-size: 12px;
  color: #3b82f6;
  font-weight: 600;
  background: rgba(59, 130, 246, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
}

.device-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 24px;
  padding: 24px 0;
}

.device-card {
  background: linear-gradient(135deg, #ffffff 0%, #fafbfc 100%);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e4e7ed;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.device-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409eff 0%, #67c23a 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.device-card:hover {
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.12);
  transform: translateY(-4px);
  border-color: #409eff;
}

.device-card:hover::before {
  opacity: 1;
}

.device-card.device-active {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%);
}

.device-card.device-active::before {
  background: linear-gradient(90deg, #67c23a 0%, #10b981 100%);
}

.device-card.device-inactive {
  border-color: #d1d5db;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
}

.device-card.device-inactive::before {
  background: linear-gradient(90deg, #9ca3af 0%, #6b7280 100%);
}

.device-status-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 2;
}

.status-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  position: relative;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
}

.status-dot::after {
  content: '';
  position: absolute;
  top: -4px;
  left: -4px;
  right: -4px;
  bottom: -4px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0;
  animation: statusPulse 2s infinite;
}

.status-dot.status-online {
  background-color: #10b981;
  color: #10b981;
}

.status-dot.status-online::after {
  opacity: 0.6;
}

.status-dot.status-offline {
  background-color: #ef4444;
  color: #ef4444;
}

.status-dot.status-offline::after {
  opacity: 0.4;
  animation: statusPulse 1s infinite;
}

.status-dot.status-inactive {
  background-color: #6b7280;
  color: #6b7280;
}

.status-dot.status-inactive::after {
  display: none;
}

@keyframes statusPulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.2;
  }
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
}

.device-info {
  margin-bottom: 24px;
}

.device-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  position: relative;
}

.device-name {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
  line-height: 1.3;
  max-width: 65%;
  word-break: break-word;
}

.device-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.device-badges .el-tag {
  border-radius: 8px;
  font-weight: 500;
  font-size: 12px;
  padding: 4px 8px;
}

.device-details {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8px;
  border: 1px solid rgba(229, 231, 235, 0.8);
  transition: all 0.2s ease;
}

.detail-item:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: #d1d5db;
}

.detail-icon {
  margin-right: 10px;
  color: #9ca3af;
  font-size: 16px;
  min-width: 16px;
}

.detail-label {
  font-weight: 600;
  margin-right: 8px;
  min-width: 80px;
  color: #374151;
}

.detail-value {
  color: #1f2937;
  word-break: break-all;
  font-weight: 500;
}

.device-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  border-top: 1px solid rgba(229, 231, 235, 0.8);
  padding-top: 20px;
}

.device-actions .el-button {
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.device-actions .el-button:hover {
  transform: translateY(-1px);
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  border: 2px dashed #cbd5e1;
}

/* IOT设备类型图标 */
.device-type-icon {
  position: absolute;
  top: 24px;
  left: 24px;
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
  opacity: 0.15;
  transition: all 0.3s ease;
}

.device-card:hover .device-type-icon {
  opacity: 0.25;
  transform: scale(1.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .device-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 20px 0;
  }
  
  .device-card {
    padding: 20px;
  }
  
  .device-header {
    flex-direction: column;
    gap: 12px;
  }
  
  .device-name {
    max-width: 100%;
    font-size: 18px;
  }
  
  .device-actions {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .detail-item {
    padding: 6px 10px;
  }
}

@media (max-width: 480px) {
  .device-actions {
    flex-direction: column;
  }
  
  .device-actions .el-button {
    width: 100%;
  }
  
  .device-card {
    padding: 16px;
  }
}

/* 搜索框样式优化 */
.search-container {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  transition: all 0.3s ease;
  position: relative;
}

/* WebSocket 状态指示器样式 */
.ws-status-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
}

.search-container:hover {
  box-shadow: 0 8px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  border-color: rgba(99, 102, 241, 0.2);
}

.search-form {
  margin: 0;
}

.search-row {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  flex-wrap: wrap;
}

.search-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 0;
  align-items: flex-end;
}

.search-item {
  margin-bottom: 0 !important;
  margin-right: 0 !important;
}

.search-item .el-form-item__label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  margin-bottom: 8px;
}

.search-input {
  width: 280px;
}

.search-input .el-input__wrapper {
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  background: white;
}

.search-input .el-input__wrapper:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.search-input .el-input__wrapper.is-focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1), 0 4px 8px rgba(0, 0, 0, 0.08);
}

.search-date-picker {
  width: 320px;
}

.search-date-picker .el-input__wrapper {
  border-radius: 12px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  background: white;
}

.search-date-picker .el-input__wrapper:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
}

.search-date-picker .el-input__wrapper.is-focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1), 0 4px 8px rgba(0, 0, 0, 0.08);
}

.search-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-start;
  align-items: flex-end;
  padding-top: 0;
  border-top: none;
}

.search-btn {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border: none;
  color: white;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
}

.search-btn:hover {
  background: linear-gradient(135deg, #5855eb 0%, #7c3aed 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  color: white;
}

.reset-btn {
  background: white;
  border: 2px solid #e5e7eb;
  color: #6b7280;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
  transform: translateY(-1px);
}

.add-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
}

.add-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

/* 响应式搜索框 */
@media (max-width: 1200px) {
  .search-row {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-inputs {
    flex-direction: column;
    gap: 16px;
    margin-bottom: 0;
  }
  
  .search-input,
  .search-date-picker {
    width: 100%;
    max-width: 400px;
  }
  
  .search-actions {
    justify-content: flex-start;
    align-items: center;
  }
}

@media (max-width: 768px) {
  .search-container {
    padding: 20px;
    border-radius: 12px;
  }
  
  .search-actions {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  
  .search-btn,
  .reset-btn,
  .add-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .search-container {
    padding: 16px;
  }
  
  .search-inputs {
    gap: 12px;
  }
  
  .search-item .el-form-item__label {
    font-size: 13px;
  }
}
</style>
