<template>
  <el-dialog v-model="visible" title="仓库详情" width="1000px" :close-on-click-modal="false" @close="handleClose">
    <div v-if="warehouse" class="warehouse-detail">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3>基本信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="仓库名称">{{ warehouse.name }}</el-descriptions-item>
          <el-descriptions-item label="仓库地址">{{ warehouse.address }}</el-descriptions-item>
          <el-descriptions-item label="仓库类型">
            <el-tag :type="warehouse.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED ? 'warning' : 'info'">
              {{ warehouse.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED ? '温控仓库' : '常温仓库' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="负责人">{{ warehouse.principal }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="warehouse.status === 0 ? 'success' : 'danger'">
              {{ warehouse.status === 0 ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="默认仓库">
            <el-tag :type="warehouse.defaultStatus ? 'success' : 'info'">
              {{ warehouse.defaultStatus ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="排序">{{ warehouse.sort }}</el-descriptions-item>

          <el-descriptions-item label="备注" :span="2">{{ warehouse.remark || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 费用信息 -->
      <div class="detail-section" style="margin-top: 20px;">
        <h3>费用信息</h3>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="仓储费">{{ erpPriceTableColumnFormatter({}, {}, warehouse.warehousePrice, 0) }}</el-descriptions-item>
          <el-descriptions-item label="搬运费">{{ erpPriceTableColumnFormatter({}, {}, warehouse.truckagePrice, 0) }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 温控设备信息（仅温控仓库显示） -->
      <div v-if="warehouse.warehouseType === WAREHOUSE_TYPE.TEMP_CONTROLLED" class="detail-section" style="margin-top: 20px;">
        <h3>温控设备信息</h3>
        <div v-if="warehouse.deviceId">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="绑定设备">{{ warehouse.deviceName }}</el-descriptions-item>
            <el-descriptions-item label="设备ID">{{ warehouse.deviceId }}</el-descriptions-item>
            <el-descriptions-item label="温度范围">{{ warehouse.minTemp }}°C ~ {{ warehouse.maxTemp }}°C</el-descriptions-item>
            <el-descriptions-item label="超时锁库时间">{{ warehouse.lockTimeoutS }}秒</el-descriptions-item>
          </el-descriptions>
        </div>
        <div v-else>
          <el-empty description="未绑定温控设备" />
        </div>
      </div>
    </div>
    
    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
      <el-button type="primary" @click="handleEdit">编辑</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { WarehouseVO } from '@/api/erp/stock/warehouse'
import { erpPriceTableColumnFormatter } from '@/utils'

// 仓库类型常量
const WAREHOUSE_TYPE = {
  NORMAL: 0, // 常温仓库
  TEMP_CONTROLLED: 1 // 温控仓库
}

interface Props {
  modelValue: boolean
  warehouse: WarehouseVO | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', warehouseId: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 控制对话框显示
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

/** 关闭对话框 */
const handleClose = () => {
  visible.value = false
}

/** 编辑仓库 */
const handleEdit = () => {
  if (props.warehouse?.id) {
    emit('edit', props.warehouse.id)
  }
}


</script>

<style scoped>
.warehouse-detail {
  .detail-section {
    h3 {
      margin-bottom: 16px;
      color: #303133;
      font-size: 16px;
      font-weight: 600;
    }
  }
}
</style>