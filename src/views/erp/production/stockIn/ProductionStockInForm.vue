<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="生产订单" prop="orderId">
        <!-- 详情和编辑模式下显示订单编号 -->
        <el-input 
          v-if="formType === 'update' || formType === 'detail'"
          v-model="currentOrderNo" 
          placeholder="生产订单编号" 
          readonly 
        />
        <!-- 新增模式下显示选择框 -->
        <el-select
          v-else
          v-model="formData.orderId"
          placeholder="请选择生产订单"
          clearable
          filterable
          class="!w-1/1"
          @change="handleProductionOrderChange"
        >
          <el-option
          v-for="item in productionOrderList"
          :key="item.id"
          :label="item.orderNo"
          :value="item.id"
        />
        </el-select>
      </el-form-item>
      <el-form-item label="入库产品" prop="productId">
        <el-input v-model="productName" placeholder="产品名称" readonly />
        <el-input v-model="formData.productId" type="hidden" />
      </el-form-item>
      <el-form-item label="入库数量" prop="quantity">
        <el-input v-model="formData.quantity" placeholder="请输入入库数量" :readonly="formType === 'detail'" />
      </el-form-item>
      <el-form-item label="入库仓库" prop="warehouseId">
        <el-select
          v-model="formData.warehouseId"
          placeholder="请选择入库仓库"
          clearable
          filterable
          class="!w-1/1"
          :disabled="formType === 'detail'"
        >
          <el-option
            v-for="item in warehouseList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="入库日期" prop="inDate">
        <el-date-picker
          v-model="formData.inDate"
          type="date"
          value-format="x"
          placeholder="选择入库日期"
          :disabled="formType === 'detail'"
        />
      </el-form-item>
      <!-- 状态字段已隐藏，创建时默认设置为10（待生产） -->
      <el-form-item label="备注" prop="remark">
        <el-input v-model="formData.remark" placeholder="请输入备注" :readonly="formType === 'detail'" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button v-if="formType !== 'detail'" @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">{{ formType === 'detail' ? '关 闭' : '取 消' }}</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { ProductionStockInApi, ProductionStockInVO } from '@/api/erp/production/stockIn'
import { WarehouseApi, WarehouseVO } from '@/api/erp/stock/warehouse'
import { EprProductionOrderApi, EprProductionOrderVO } from '@/api/erp/production/order'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'

/** ERP 生产入库记录 表单 */
defineOptions({ name: 'ProductionStockInForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref({
  id: undefined,
  orderId: undefined,
  productId: undefined,
  quantity: undefined,
  warehouseId: undefined,
  inDate: undefined,
  status: undefined,
  remark: undefined,
})
const formRules = reactive({
  orderId: [{ required: true, message: '生产订单不能为空', trigger: 'blur' }],
  productId: [{ required: true, message: '入库产品不能为空', trigger: 'blur' }],
  quantity: [{ required: true, message: '入库数量不能为空', trigger: 'blur' }],
  warehouseId: [{ required: true, message: '入库仓库不能为空', trigger: 'blur' }],
  inDate: [{ required: true, message: '入库日期不能为空', trigger: 'blur' }],
  // status: [{ required: true, message: '状态不能为空', trigger: 'blur' }], // 状态字段已隐藏
})
const formRef = ref() // 表单 Ref
const warehouseList = ref<WarehouseVO[]>([]) // 仓库列表
const productionOrderList = ref<EprProductionOrderVO[]>([]) // 已审批的生产订单列表
const productName = ref('') // 产品名称

/** 获取当前选中的生产订单编号 */
const currentOrderNo = ref('')

/** 获取生产订单编号 */
const getOrderNo = async (orderId: number) => {
  if (!orderId) {
    currentOrderNo.value = ''
    return
  }
  
  // 先在列表中查找
  const order = productionOrderList.value.find(item => item.id === orderId)
  if (order) {
    currentOrderNo.value = order.orderNo
    return
  }
  
  // 如果列表中没有，通过API获取
  try {
    const orderDetail = await EprProductionOrderApi.getEprProductionOrder(orderId)
    currentOrderNo.value = orderDetail.orderNo || `订单${orderId}`
  } catch (error) {
    console.error('获取生产订单详情失败:', error)
    currentOrderNo.value = `订单${orderId}`
  }
}

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = type === 'detail' ? '查看详情' : t('action.' + type)
  formType.value = type
  resetForm()
  // 加载仓库列表
  await getWarehouseList()
  // 加载已审批的生产订单列表
  await getProductionOrderList()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await ProductionStockInApi.getProductionStockIn(id)
      // 设置产品名称
      if (formData.value.productId) {
        try {
          const product = await ProductApi.getProduct(formData.value.productId)
          productName.value = product.name || ''
        } catch (error) {
          console.error('获取产品信息失败:', error)
          productName.value = ''
        }
      }
      // 获取生产订单编号
      if (formData.value.orderId) {
        await getOrderNo(formData.value.orderId)
      }
    } finally {
      formLoading.value = false
    }
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
    const data = formData.value as unknown as ProductionStockInVO
    if (formType.value === 'create') {
      await ProductionStockInApi.createProductionStockIn(data)
      message.success(t('common.createSuccess'))
    } else {
      await ProductionStockInApi.updateProductionStockIn(data)
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
    productId: undefined,
    quantity: undefined,
    warehouseId: undefined,
    inDate: undefined,
    status: undefined,
    remark: undefined,
  }
  productName.value = ''
  currentOrderNo.value = ''
  formRef.value?.resetFields()
}

/** 获得仓库列表 */
const getWarehouseList = async () => {
  warehouseList.value = await WarehouseApi.getWarehouseSimpleList()
}

/** 获得已审批的生产订单列表 */
const getProductionOrderList = async () => {
  try {
    const [orderData, usedOrderIds] = await Promise.all([
      EprProductionOrderApi.getApprovedProductionOrders(),
      ProductionStockInApi.getUsedProductionOrderIds()
    ])
    
    // 过滤掉已使用的生产订单（编辑模式下保留当前订单）
    if (formType.value === 'update' && formData.value.orderId) {
      productionOrderList.value = orderData.filter(order => 
        !usedOrderIds.includes(order.id) || order.id === formData.value.orderId
      )
    } else {
      productionOrderList.value = orderData.filter(order => 
        !usedOrderIds.includes(order.id)
      )
    }
  } catch (error) {
    console.error('获取生产订单列表失败:', error)
  }
}

/** 处理生产订单选择变化 */
const handleProductionOrderChange = async (orderId: number) => {
  if (orderId) {
    const selectedOrder = productionOrderList.value.find(order => order.id === orderId)
    if (selectedOrder) {
      formData.value.productId = selectedOrder.productId
      
      // 通过产品ID获取产品名称
      if (selectedOrder.productId) {
        try {
          const product = await ProductApi.getProduct(selectedOrder.productId)
          productName.value = product.name || ''
        } catch (error) {
          console.error('获取产品信息失败:', error)
          productName.value = ''
        }
      } else {
        productName.value = ''
      }
      
      // 可以根据需要设置其他默认值，比如仓库
      if (selectedOrder.warehouseId) {
        formData.value.warehouseId = selectedOrder.warehouseId
      }
    }
  } else {
    formData.value.productId = undefined
    productName.value = ''
  }
}
</script>
