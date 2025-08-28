<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="1200">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="120px"
      v-loading="formLoading"
    >


      <el-row :gutter="15">
        <el-col :span="8">
          <el-form-item label="订单编号" prop="orderNo">
            <el-input disabled v-model="formData.orderNo" placeholder="保存时自动生成" />
          </el-form-item>
        </el-col>

        <!-- 关联销售订单 -->
        <el-col :span="8" v-if="formType !== 'detail'">
          <el-form-item label="关联订单" prop="saleOrderNo">
            <el-input v-model="formData.saleOrderNo" readonly :disabled="addMode === 'manual'">
              <template #append v-if="formType !== 'detail' && addMode === 'order'">
                <el-button @click="openSaleOrderEnableList">
                  <Icon icon="ep:search" /> 选择
                </el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
        
        <!-- 添加方式选择 -->
        <el-col :span="8" v-if="formType === 'create'">
          <el-form-item label="添加方式">
            <el-radio-group v-model="addMode" @change="handleAddModeChange">
              <el-radio value="order">关联订单</el-radio>
              <el-radio value="manual">手动添加</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-col>
        <el-col :span="8" v-if="addMode === 'manual' && (!formData.items || formData.items.length === 0)">
          <el-form-item label="计划生产数量" prop="plannedQuantity">
            <el-input-number
              v-model="formData.plannedQuantity"
              :min="1"
              :precision="2"
              placeholder="请输入计划生产数量"
              :disabled="formType === 'detail'"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="计划开始日期" prop="plannedStartDate">
            <el-date-picker
              v-model="formData.plannedStartDate"
              type="date"
              value-format="x"
              placeholder="选择计划开始日期"
              :disabled="formType === 'detail'"
              class="!w-110"
              @change="handlePlannedStartDateChange"
            />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="计划结束日期" prop="plannedEndDate">
            <el-date-picker
              v-model="formData.plannedEndDate"
              type="date"
              value-format="x"
              placeholder="选择计划结束日期"
              :disabled="formType === 'detail'"
              class="!w-1/1"
              @change="handlePlannedEndDateChange"
            />
          </el-form-item>
        </el-col>




        <!-- 订单状态字段已隐藏 -->
        <!-- <el-col :span="8">
          <el-form-item label="订单状态" prop="status">
            <template v-if="formType === 'detail'">
              <dict-tag :type="DICT_TYPE.ERP_PRODUCTION_ORDER_STATUS" :value="formData.status" />
            </template>
            <el-select
              v-else
              v-model="formData.status"
              placeholder="请选择订单状态"
              clearable
              :disabled="formType === 'create'"
              class="!w-1/1"
            >
              <el-option
                v-for="item in statusOptions"
                :key="item.value"
                :value="item.value"
                :label="item.label"
              />
            </el-select>
          </el-form-item>
        </el-col> -->


        <!--        <el-col :span="8">-->
        <!--          <el-form-item label="附件" prop="fileUrl">-->
        <!--            <UploadFile :is-show-tip="false" v-model="formData.fileUrl" :limit="1" />-->
        <!--          </el-form-item>-->
        <!--        </el-col>-->
      </el-row>

      <!-- 子表的表单 -->
      <ContentWrap>
        <el-tabs v-model="subTabsName" class="-mt-15px -mb-10px">
          <el-tab-pane label="订单产品清单" name="item">
            <ProductionOrderItemForm 
              ref="itemFormRef" 
              :items="formData.items || []" 
              :disabled="formType === 'detail'"
              :warehouse-list="warehouseList"
              :add-mode="addMode"
              @update:items="handleItemsUpdate"
            />
          </el-tab-pane>
        </el-tabs>
      </ContentWrap>

    </el-form>
    <template #footer>
      <el-button v-if="formType !== 'detail'" @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">{{ formType === 'detail' ? '关 闭' : '取 消' }}</el-button>
    </template>
  </Dialog>
  
  <!-- 可生产的销售订单列表弹窗 -->
  <ProductionOrderSaleOrderEnableList ref="saleOrderEnableListRef" @success="handleSaleOrderChange" />
</template>
<script setup lang="ts">
import { EprProductionOrderApi, EprProductionOrderVO } from '@/api/erp/production/order'
import { getDictListByType } from '@/api/system/dict/dict.data' // 引入字典数据API
import { ProductApi, ProductVO } from '@/api/erp/product/product' // 引入产品API
import { ProductUnitApi } from '@/api/erp/product/unit' // 引入产品单位API
import { DICT_TYPE } from '@/utils/dict'
import { WarehouseApi, WarehouseVO } from '@/api/erp/stock/warehouse' // 引入仓库API
import { CustomerApi, CustomerVO } from '@/api/erp/sale/customer'
import { SaleOrderApi } from '@/api/erp/sale/order' // 引入销售订单API
import ProductionOrderSaleOrderEnableList from './components/ProductionOrderSaleOrderEnableList.vue'
import ProductionOrderItemForm from './components/ProductionOrderItemForm.vue'
// DictTag组件通过auto-import自动导入，无需手动导入




/** ERP 生产订单 表单 */
defineOptions({ name: 'EprProductionOrderForm' })

const productList = ref<ProductVO[]>([]) // 产品列表
let warehouseList = ref<WarehouseVO[]>([]) // 仓库列表

const customerList = ref<CustomerVO[]>([]) // 客户列表

const statusOptions = ref<Array<{ value: string; label: string }>>([]) // 订单状态字典数据

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗
const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref<{
  id?: number
  orderNo?: string
  saleOrderNo?: string
  productId?: number
  plannedQuantity?: number
  plannedStartDate?: Date
  plannedEndDate?: Date
  actualStartDate?: Date
  actualEndDate?: Date
  warehouseId?: number
  priority?: number
  status?: number
  remark?: string
  saleOrderId?: number
  customerId?: number
  items?: any[]
}>({
  id: undefined,
  orderNo: undefined, // 订单编号，唯一标识
  saleOrderNo: undefined, // 销售订单编号
  productId: undefined, // 产品ID，关联到 erp_product
  plannedQuantity: undefined, // 计划生产数量
  plannedStartDate: undefined, // 计划开始日期
  plannedEndDate: undefined, // 计划结束日期
  actualStartDate: undefined, // 实际开始日期
  actualEndDate: undefined, // 实际结束日期
  warehouseId: undefined, // 仓库ID，关联到 erp_warehouse
  priority: undefined, // 优先级
  status: undefined, // 订单状态（如草稿、进行中、完成）
  remark: undefined, // 备注
  saleOrderId: undefined, // 销售订单ID,关联到erp_sale_order
  customerId: undefined,
  items: [] // 添加子表项数组
})
const formRules = reactive({
  // orderNo: [{ required: true, message: '订单编号，唯一标识不能为空', trigger: 'blur' }],
  plannedStartDate: [
    { required: true, message: '计划开始日期不能为空', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && formData.value.plannedEndDate) {
          const startDate = new Date(value)
          const endDate = new Date(formData.value.plannedEndDate)
          if (startDate > endDate) {
            callback(new Error('计划开始时间不能超过计划结束时间'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  plannedEndDate: [
    { required: true, message: '计划结束日期不能为空', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value && formData.value.plannedStartDate) {
          const startDate = new Date(formData.value.plannedStartDate)
          const endDate = new Date(value)
          if (startDate > endDate) {
            callback(new Error('计划结束时间不能早于计划开始时间'))
          } else {
            callback()
          }
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  warehouseId: [{ required: true, message: '仓库ID，不能为空', trigger: 'blur' }],
  // status: [{ required: true, message: '订单状态（进行中、完成、取消）不能为空', trigger: 'blur' }]
})

// 添加方式：order-关联订单，manual-手动添加
const addMode = ref('order')

// 处理添加方式变更
const handleAddModeChange = (mode: string) => {
  // 切换模式时清空相关数据
  if (mode === 'manual') {
    // 切换到手动添加模式，清空关联订单信息
    formData.value.saleOrderNo = undefined
    formData.value.saleOrderId = undefined
    formData.value.customerId = undefined
    // 添加一个空行供用户选择产品
    formData.value.items = [{
      id: Date.now(),
      productId: undefined,
      productName: '',
      productBarCode: '',
      productUnitName: '',
      productPrice: 0,
      warehouseId: undefined,
      warehouseName: '',
      priority: 1,
      remark: '',
      count: 0,
      availableCount: 0
    }]
    message.info('已切换到手动添加模式，请手动添加产品')
  } else {
    // 切换到关联订单模式，清空手动添加的产品
    formData.value.items = []
    message.info('已切换到关联订单模式，请选择销售订单')
  }
}
const formRef = ref() // 表单 Ref

/** 子表的表单 */
const subTabsName = ref('item')
const itemFormRef = ref()

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  await loadStatusOptions() // 加载订单状态字典数据
  await loadProductList() // 加载产品列表

  await loadCustomerList() // 加载客户列表


  warehouseList = await WarehouseApi.getWarehouseSimpleList() // 加载仓库列表
  
  // 在创建模式下，设置默认状态为"待生产"（值为10）
  if (type === 'create') {
    formData.value.status = 10
    // 如果是手动添加模式，添加一个空行
    if (addMode.value === 'manual') {
      formData.value.items = [{
        id: Date.now(),
        productId: undefined,
        productName: '',
        productBarCode: '',
        productUnitName: '',
        productPrice: 0,
        warehouseId: undefined,
        warehouseName: '',
        priority: 1,
        remark: '',
        count: 0,
        availableCount: 0
      }]
    }
  }

  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await EprProductionOrderApi.getEprProductionOrder(id)
      
      // 在详情或编辑模式下，如果有关联的销售订单，只获取订单号
      if ((type === 'detail' || type === 'update') && formData.value.saleOrderId) {
        try {
          const saleOrder = await SaleOrderApi.getSaleOrder(formData.value.saleOrderId)
          formData.value.saleOrderNo = saleOrder.no
        } catch (error) {
          console.error('获取销售订单信息失败:', error)
        }
      }
      
      // 在详情或编辑模式下，只显示当前生产订单对应的产品信息
      if ((type === 'detail' || type === 'update') && formData.value.productId) {
        try {
          // 获取当前生产订单的产品信息
          const product = await ProductApi.getProduct(formData.value.productId)
          
          // 获取产品单位名称
          let unitName = product?.unitName || ''
          if (!unitName && product?.unitId) {
            try {
              const unit = await ProductUnitApi.getProductUnit(product.unitId)
              unitName = unit?.name || ''
            } catch (error) {
              console.error('获取产品单位信息失败:', error)
            }
          }
          
          // 获取订单数量和可生产数量
          let orderCount = 0
          let availableCount = 0
          
          // 如果有关联的销售订单，从销售订单项中获取数量信息
            if (formData.value.saleOrderId) {
              try {
                const saleOrderItems = await EprProductionOrderApi.getSaleOrderItemsByOrderId(formData.value.saleOrderId)
                if (saleOrderItems && saleOrderItems.length > 0) {
                  const orderItem = saleOrderItems.find(item => item.productId === formData.value.productId)
                  if (orderItem) {
                    orderCount = parseFloat(orderItem.count) || 0
                    availableCount = orderCount - (parseFloat(orderItem.outCount) || 0)
                  }
                }
              } catch (error) {
                console.error('获取销售订单项信息失败:', error)
              }
            }
          
          // 构建当前生产订单的产品项
          formData.value.items = [{
            productId: formData.value.productId,
            productName: product?.name || '未知产品',
            productBarCode: product?.barCode || '',
            productUnitName: unitName,
            productPrice: product?.salePrice || 0, // 产品单价字段
            count: orderCount, // 订单数量字段
            availableCount: availableCount, // 可生产数量字段
            warehouseId: formData.value.warehouseId,
            priority: formData.value.priority || 1,
            remark: formData.value.remark || ''
          }]
        } catch (error) {
          console.error('获取产品信息失败:', error)
          // 如果获取产品信息失败，至少显示基本信息
          formData.value.items = [{
            productId: formData.value.productId,
            productName: '未知产品',
            productBarCode: '',
            productUnitName: '',
            productPrice: 0, // 产品单价字段
            count: 0, // 订单数量字段
            availableCount: 0, // 可生产数量字段
            warehouseId: formData.value.warehouseId,
            priority: formData.value.priority || 1,
            remark: formData.value.remark || ''
          }]
        }
      }
      
      // 在详情或编辑模式下，确保客户列表中包含当前订单的客户
      if ((type === 'detail' || type === 'update') && formData.value.customerId) {
        const existingCustomer = customerList.value.find(customer => customer.id === formData.value.customerId)
        if (!existingCustomer) {
          try {
            const customer = await CustomerApi.getCustomer(formData.value.customerId)
            customerList.value.push(customer)
          } catch (error) {
            console.error('获取客户信息失败:', error)
          }
        }
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
  // 提交请求
  formLoading.value = true
  try {
    // 验证子表单的订单数量
    if (itemFormRef.value && itemFormRef.value.validateCounts) {
      const isCountsValid = itemFormRef.value.validateCounts()
      if (!isCountsValid) {
        formLoading.value = false
        return
      }
    }
    
    if (formType.value === 'create') {
      // 检查是否有关联销售订单且包含多个产品
      if (formData.value.saleOrderId && formData.value.items && formData.value.items.length > 1) {
        // 一对一拆分：为每个产品创建一个独立的生产订单
        const createdOrders = []
        for (const item of formData.value.items) {
          // 验证必填字段
          if (!item.warehouseId) {
            message.error(`产品 ${item.productName} 的仓库不能为空`)
            return
          }
          if (!item.count || item.count <= 0) {
            message.error(`产品 ${item.productName} 的订单数量不能为空且必须大于0`)
            return
          }
          // 验证订单数量不能超过可生产数量
          const count = parseFloat(item.count) || 0
          const availableCount = parseFloat(item.availableCount) || 0
          if (count > availableCount && availableCount > 0) {
            message.error(`产品 ${item.productName} 的订单数量(${count})不能超过可生产数量(${availableCount})`)
            return
          }
          
          const orderData = {
            saleOrderId: formData.value.saleOrderId,
            productId: item.productId,
            warehouseId: item.warehouseId,
            plannedQuantity: item.count, // 计划生产数量
            priority: item.priority || 1, // 默认普通优先级
            status: formData.value.status || 10, // 默认待生产状态
            plannedStartDate: formData.value.plannedStartDate,
            plannedEndDate: formData.value.plannedEndDate,
            remark: item.remark || formData.value.remark
          }
          
          try {
            const orderId = await EprProductionOrderApi.createEprProductionOrder(orderData)
            createdOrders.push(orderId)
          } catch (error) {
            console.error(`创建产品 ${item.productName} 的生产订单失败:`, error)
            message.error(`创建产品 ${item.productName} 的生产订单失败`)
            return
          }
        }
        message.success(`成功创建 ${createdOrders.length} 个生产订单`)
      } else {
        // 单个产品或无关联销售订单的情况，按原逻辑处理
        // 校验表单
        await formRef.value.validate()
        
        // 如果有子表单数据且只有一个产品，从子表单中获取产品和仓库信息
        if (formData.value.items && formData.value.items.length === 1) {
          const item = formData.value.items[0]
          if (item.productId) {
            formData.value.productId = item.productId
          }
          if (item.warehouseId) {
            formData.value.warehouseId = item.warehouseId
          }
          if (item.priority !== undefined) {
            formData.value.priority = item.priority
          }
          if (item.count !== undefined) {
            formData.value.plannedQuantity = item.count
          }
        }
        
        const data = formData.value as unknown as EprProductionOrderVO
        await EprProductionOrderApi.createEprProductionOrder(data)
        message.success(t('common.createSuccess'))
      }
    } else {
      // 更新逻辑：确保备注字段正确同步
      // 如果有产品项且只有一个产品，将产品项的备注同步到主表单
      if (formData.value.items && formData.value.items.length === 1) {
        const item = formData.value.items[0]
        if (item.remark) {
          formData.value.remark = item.remark
        }
      }
      
      const data = formData.value as unknown as EprProductionOrderVO
      await EprProductionOrderApi.updateEprProductionOrder(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 获取订单状态字典数据 */
const loadStatusOptions = async () => {
  try {
    // 根据字典类型获取字典数据
    const res = await getDictListByType(DICT_TYPE.ERP_PRODUCTION_ORDER_STATUS)

    // 从 res 中获取字典数据
    statusOptions.value = res.map((item) => ({
      value: Number(item.value),
      label: item.label
    }))
  } catch (err) {
    message.error('获取订单状态数据失败')
  }
}

/** 获取产品列表 */
const loadProductList = async () => {
  try {
    productList.value = await ProductApi.getProductSimpleList()
  } catch (err) {
    message.error('获取产品列表失败')
  }
}

/** 获取客户列表 */
const loadCustomerList = async () => {
  try {
    customerList.value = await CustomerApi.getCustomerSimpleList()
  } catch (err) {
    message.error('获取客户列表失败')
  }
}

/** 打开【可生产的销售订单列表】弹窗 */
const saleOrderEnableListRef = ref() // 可生产的销售订单列表 Ref
const openSaleOrderEnableList = () => {

  saleOrderEnableListRef.value.open()
}

/** 处理产品项数据更新 */
const handleItemsUpdate = (updatedItems: any[]) => {
  formData.value.items = updatedItems
}

/** 处理销售订单选择 */
const handleSaleOrderChange = async (order: any) => {


  // 将订单设置到生产订单
  formData.value.saleOrderId = order.id
  formData.value.saleOrderNo = order.no
  formData.value.customerId = order.customerId

  // 设置默认状态为"待生产"（值为10）
  formData.value.status = 10

  // 填充产品清单
  if (order.items && order.items.length > 0) {
    // 获取所有产品ID
    const productIds = order.items.map(item => item.productId)

    // 从产品列表中获取产品详细信息
    const productMap = new Map()
    for (const product of productList.value) {
      if (productIds.includes(product.id)) {
        productMap.set(product.id, product)
      }
    }

    // 填充产品清单，包含产品详细信息，并为每个产品项初始化独立的字段
    formData.value.items = await Promise.all(order.items.map(async item => {
      const product = productMap.get(item.productId)
      
      // 获取产品单位名称
      let unitName = product?.unitName || ''
      if (!unitName && product?.unitId) {
        try {
          const unit = await ProductUnitApi.getProductUnit(product.unitId)
          unitName = unit?.name || ''
        } catch (error) {
          console.error('获取产品单位信息失败:', error)
        }
      }
      
      return {
        ...item,
        productName: product?.name || '未知产品',
        productBarCode: product?.barCode || '',
        productUnitName: unitName,
        productPrice: product?.salePrice || product?.price || 0, // 添加产品单价
        availableCount: (item.count || 0) - (item.outCount || 0),
        warehouseId: undefined,
        priority: undefined,
        remark: item.remark || '' // 保留销售订单中的备注内容
      }
    }))
  
  }
  
  // 如果订单只有一个产品，自动填充产品信息
  if (order.items && order.items.length === 1) {
    const item = order.items[0]
    formData.value.productId = item.productId
    // 计划数量 = 订单数量 - 已出库数量（可用于生产的数量）
    const availableQuantity = item.count - (item.outCount || 0)
    // 设置仓库ID，如果销售订单项中有仓库信息则使用，否则保持当前选择
    if (item.warehouseId) {
      formData.value.warehouseId = item.warehouseId
    }
  } else if (order.items && order.items.length > 1) {
    // 如果有多个产品，清空产品选择，系统将自动为每个产品创建独立的生产订单
    formData.value.productId = undefined
  }
  
  message.success('已关联销售订单：' + order.no)
}


/** 处理计划开始日期变更 */
const handlePlannedStartDateChange = () => {
  // 触发计划结束日期的验证
  nextTick(() => {
    formRef.value?.validateField('plannedEndDate')
  })
}

/** 处理计划结束日期变更 */
const handlePlannedEndDateChange = () => {
  // 触发计划开始日期的验证
  nextTick(() => {
    formRef.value?.validateField('plannedStartDate')
  })
}

/** 重置表单 */
const resetForm = () => {
  formData.value = {
    id: undefined,
    orderNo: undefined,
    saleOrderNo: undefined,
    productId: undefined,
    plannedQuantity: undefined,
    plannedStartDate: undefined,
    plannedEndDate: undefined,
    actualStartDate: undefined,
    actualEndDate: undefined,
    warehouseId: undefined,
    priority: undefined,
    status: undefined,
    remark: undefined,
    saleOrderId: undefined,
    customerId: undefined,
    items: []
  } as typeof formData.value
  formRef.value?.resetFields()
}
</script>
