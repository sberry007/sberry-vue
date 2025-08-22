<template>
  <Dialog :title="'设备详情 - ' + deviceData.name" v-model="dialogVisible" width="600px">
    <div v-loading="loading" class="device-detail">
      <!-- 设备基本信息 -->
      <div class="detail-section">
        <h4 class="section-title">
          <Icon icon="ep:info-filled" class="mr-5px" />
          基本信息
        </h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">设备名称:</span>
            <span class="info-value">{{ deviceData.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">设备编号:</span>
            <span class="info-value">{{ deviceData.id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">激活状态:</span>
            <el-tag :type="deviceData.activeStatus === 1 ? 'success' : 'info'" size="small">
              {{ deviceData.activeStatus === 1 ? '已激活' : '未激活' }}
            </el-tag>
          </div>
          <div class="info-item" v-if="deviceData.activeStatus === 1">
            <span class="info-label">在线状态:</span>
            <el-tag :type="deviceData.onlineStatus === 1 ? 'success' : 'danger'" size="small">
              {{ deviceData.onlineStatus === 1 ? '在线' : '离线' }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 设备连接信息 -->
      <div class="detail-section">
        <h4 class="section-title">
          <Icon icon="ep:connection" class="mr-5px" />
          连接信息
        </h4>
        <div class="connection-info">
          <div class="connection-item">
            <div class="connection-header">
              <span class="connection-label">设备序列号 (SN)</span>
              <el-button
                type="primary"
                size="small"
                @click="copyToClipboard(deviceData.sn, '设备序列号')"
              >
                <Icon icon="ep:copy-document" class="mr-5px" />
                复制
              </el-button>
            </div>
            <div class="connection-value">
              <el-input
                :model-value="deviceData.sn"
                readonly
                class="copy-input"
              />
            </div>
          </div>

          <div class="connection-item">
            <div class="connection-header">
              <span class="connection-label">设备密钥 (Device Secret)</span>
              <el-button
                type="primary"
                size="small"
                @click="copyToClipboard(deviceData.deviceSecret, '设备密钥')"
              >
                <Icon icon="ep:copy-document" class="mr-5px" />
                复制
              </el-button>
            </div>
            <div class="connection-value">
              <el-input
                :model-value="deviceData.deviceSecret"
                readonly
                type="password"
                show-password
                class="copy-input"
              />
            </div>
          </div>

          <div class="connection-item" v-if="deviceData.clientId">
            <div class="connection-header">
              <span class="connection-label">客户端ID (Client ID)</span>
              <el-button
                type="primary"
                size="small"
                @click="copyToClipboard(deviceData.clientId, '客户端ID')"
              >
                <Icon icon="ep:copy-document" class="mr-5px" />
                复制
              </el-button>
            </div>
            <div class="connection-value">
              <el-input
                :model-value="deviceData.clientId"
                readonly
                class="copy-input"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 设备状态信息 -->
      <div class="detail-section">
        <h4 class="section-title">
          <Icon icon="ep:monitor" class="mr-5px" />
          状态信息
        </h4>
        <div class="info-grid">
          <div class="info-item" v-if="deviceData.lastSeen">
            <span class="info-label">最近上报时间:</span>
            <span class="info-value">{{ formatTime(deviceData.lastSeen) }}</span>
          </div>
          <div class="info-item" v-if="deviceData.activeTime">
            <span class="info-label">激活时间:</span>
            <span class="info-value">{{ formatTime(deviceData.activeTime) }}</span>
          </div>
          <div class="info-item" v-if="deviceData.warehouseName">
            <span class="info-label">绑定仓库:</span>
            <span class="info-value">{{ deviceData.warehouseName }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">创建时间:</span>
            <span class="info-value">{{ formatTime(deviceData.createTime) }}</span>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="detail-section">
        <h4 class="section-title">
          <Icon icon="ep:document" class="mr-5px" />
          使用说明
        </h4>
        <div class="usage-info">
          <el-alert
            title="设备连接说明"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>1. 使用上述<strong>设备序列号(SN)</strong>和<strong>设备密钥</strong>配置您的温控设备</p>
              <p>2. 设备首次连接成功后将自动激活</p>
              <p>3. 激活后设备将显示在线/离线状态</p>
              <p>4. 请妥善保管设备密钥，避免泄露</p>
            </template>
          </el-alert>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="dialogVisible = false">关闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { dateFormatter, formatDate } from '@/utils/formatTime'
import { TempDeviceVO } from '@/api/system/tempdevice'

/** 设备详情弹窗 */
defineOptions({ name: 'DeviceDetailDialog' })

const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const loading = ref(false) // 加载状态
const deviceData = ref<TempDeviceVO>({
  id: 0,
  name: '',
  sn: '',
  onlineStatus: 0,
  activeStatus: 0,
  deviceSecret: '',
  warehouseId: 0
})

/** 打开弹窗 */
const open = (device: TempDeviceVO) => {
  dialogVisible.value = true
  deviceData.value = { ...device }
}

/** 复制到剪贴板 */
const copyToClipboard = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    message.success(`${label}已复制到剪贴板`)
  } catch (err) {
    // 降级方案：使用传统方法复制
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
      message.success(`${label}已复制到剪贴板`)
    } catch (fallbackErr) {
      message.error('复制失败，请手动复制')
    }
    document.body.removeChild(textArea)
  }
}

/** 格式化时间 */
const formatTime = (time: any) => {
  if (!time) return '-'
  return formatDate(time)
}

// 暴露方法给父组件
defineExpose({
  open
})
</script>

<style scoped>
.device-detail {
  padding: 10px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  font-weight: 500;
  color: #606266;
  margin-right: 12px;
  min-width: 80px;
}

.info-value {
  color: #303133;
  word-break: break-all;
}

.connection-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.connection-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background-color: #fafafa;
}

.connection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.connection-label {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.connection-value {
  width: 100%;
}

.copy-input {
  font-family: 'Courier New', monospace;
}

.copy-input :deep(.el-input__inner) {
  background-color: #fff;
  border: 1px solid #dcdfe6;
}

.usage-info {
  margin-top: 8px;
}

.usage-info :deep(.el-alert__content) {
  line-height: 1.6;
}

.usage-info p {
  margin: 4px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .connection-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>