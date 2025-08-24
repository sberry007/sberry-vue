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
      <el-form-item label="生产订单" prop="orderNo">
        <el-input
          v-model="queryParams.orderNo"
          placeholder="请输入生产订单编号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="入库产品" prop="productId">
          <el-select
            v-model="queryParams.productId"
            placeholder="请选择入库产品"
            clearable
            filterable
            class="!w-240px"
          >
            <el-option
              v-for="item in productList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      <el-form-item label="入库数量" prop="quantity">
        <el-input
          v-model="queryParams.quantity"
          placeholder="请输入入库数量"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="入库仓库" prop="warehouseId">
        <el-select
          v-model="queryParams.warehouseId"
          placeholder="请选择入库仓库"
          clearable
          filterable
          class="!w-240px"
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
          v-model="queryParams.inDate"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
<!--      <el-form-item label="状态" prop="status">-->
<!--        <el-select-->
<!--          v-model="queryParams.status"-->
<!--          placeholder="请选择状态"-->
<!--          clearable-->
<!--          class="!w-240px"-->
<!--        >-->
<!--          <el-option-->
<!--            v-for="dict in getIntDictOptions(DICT_TYPE.ERP_PRODUCTION_IN_STOCK_PRIORITY)"-->
<!--            :key="dict.value"-->
<!--            :label="dict.label"-->
<!--            :value="dict.value"-->
<!--          />-->
<!--        </el-select>-->
<!--      </el-form-item>-->
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-220px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['erp:production-in:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:production-in:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="生产订单" align="center" prop="orderId" width="180">
        <template #default="{ row }">
          {{ getProductionOrderNo(row.orderId) }}
        </template>
      </el-table-column>
      <el-table-column label="入库产品" align="center" prop="productId" width="120">
        <template #default="{ row }">
          {{ getProductName(row.productId) }}
        </template>
      </el-table-column>
      <el-table-column label="入库数量" align="center" prop="quantity" width="120"/>
      <el-table-column label="入库仓库" align="center" prop="warehouseId" width="120">
        <template #default="{ row }">
          {{ getWarehouseName(row.warehouseId) }}
        </template>
      </el-table-column>
      <el-table-column
        label="入库日期"
        align="center"
        prop="inDate"
        :formatter="dateFormatter"
        width="200px"
      />
<!--      <el-table-column label="状态" align="center" prop="status" width="120">-->
<!--        <template #default="scope">-->
<!--          <dict-tag :type="DICT_TYPE.ERP_AUDIT_STATUS" :value="scope.row.status" />-->
<!--        </template>-->
<!--      </el-table-column>-->
      <el-table-column label="备注" align="center" prop="remark" width="120"/>
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />

      <el-table-column label="状态" align="center" fixed="right" width="90" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.ERP_AUDIT_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" min-width="220px" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="info"
            @click="openForm('detail', scope.row.id)"
            v-hasPermi="['erp:production-in:query']"
          >
            详情
          </el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:production-in:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="success"
            @click="handleUpdateStatus(scope.row.id, 20)"
            v-hasPermi="['erp:production-in:update-status']"
            v-if="scope.row.status == 10"
          >
            审批
          </el-button>
          <el-button
            link
            type="warning"
            @click="handleUpdateStatus(scope.row.id, 10)"
            v-hasPermi="['erp:production-in:update-status']"
            v-if="scope.row.status === 20"
          >
            反审批
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:production-in:delete']"
            :disabled="scope.row.status === 20"
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
  <ProductionStockInForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { ProductionStockInApi, ProductionStockInVO } from '@/api/erp/production/stockIn'
import ProductionStockInForm from './ProductionStockInForm.vue'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { WarehouseApi, WarehouseVO } from '@/api/erp/stock/warehouse'
import { EprProductionOrderApi, EprProductionOrderVO } from '@/api/erp/production/order'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { nextTick } from 'vue'

/** ERP 生产入库记录 列表 */
defineOptions({ name: 'ProductionStockIn' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<ProductionStockInVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  orderNo: undefined,
  productId: undefined,
  quantity: undefined,
  warehouseId: undefined,
  inDate: [],
  status: undefined,
  createTime: [],
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中
const warehouseList = ref<WarehouseVO[]>([]) // 仓库列表
const productionOrderList = ref<EprProductionOrderVO[]>([]) // 生产订单列表
const productList = ref<ProductVO[]>([]) // 产品列表

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProductionStockInApi.getProductionStockInPage(queryParams)
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
    await ProductionStockInApi.deleteProductionStockIn(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 更新状态操作 */
const handleUpdateStatus = async (id: number, status: number) => {
  try {
    // 状态更新的二次确认
    const statusText = status === 2 ? '审批' : '反审批'
    await message.confirm(`确定要${statusText}该入库记录吗？`)
    // 发起状态更新
    await ProductionStockInApi.updateProductionStockInStatus(id, status)
    message.success(`${statusText}成功`)
    // 刷新列表
    await getList()
  } catch {}
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await ProductionStockInApi.exportProductionStockIn(queryParams)
    download.excel(data, 'ERP 生产入库记录.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 获得仓库列表 */
const getWarehouseList = async () => {
  warehouseList.value = await WarehouseApi.getWarehouseSimpleList()
}

/** 根据仓库ID获取仓库名称 */
const getWarehouseName = (warehouseId: number) => {
  // 检查warehouseId是否有效
  if (!warehouseId || warehouseId === undefined || warehouseId === null) {
    return '未知仓库'
  }
  
  const warehouse = warehouseList.value.find(item => item.id === warehouseId)
  return warehouse ? warehouse.name : '未知仓库'
}

/** 获得已审批的生产订单列表 */
const getProductionOrderList = async () => {
  try {
    // 优先使用专门的已审批订单接口
    productionOrderList.value = await EprProductionOrderApi.getApprovedProductionOrders()
  } catch (error) {
    console.error('获取已审批生产订单失败，尝试使用分页查询:', error)
    // 如果专门接口失败，回退到分页查询
    try {
      const data = await EprProductionOrderApi.getEprProductionOrderPage({
        status: 20, // 已审批状态
        pageNo: 1,
        pageSize: 1000
      })
      productionOrderList.value = data.list
    } catch (fallbackError) {
      console.error('获取生产订单列表失败:', fallbackError)
      message.error('获取生产订单列表失败，请刷新页面重试')
      productionOrderList.value = []
    }
  }
}

/** 获取产品列表 */
const getProductList = async () => {
  try {
    const data = await ProductApi.getProductSimpleList()
    productList.value = data
  } catch (error) {
    console.error('获取产品列表失败:', error)
  }
}

/** 根据订单ID获取订单编号 */
const getProductionOrderNo = (orderId: number) => {
  // 检查orderId是否有效
  if (!orderId || orderId === undefined || orderId === null) {
    return '未知订单'
  }
  
  const order = productionOrderList.value.find(item => item.id === orderId)
  if (order) {
    return order.orderNo
  }
  
  // 如果在列表中找不到，尝试通过API获取订单详情
  // 这里使用异步方式，先返回加载中的提示
  EprProductionOrderApi.getEprProductionOrder(orderId)
    .then(orderDetail => {
      if (orderDetail && orderDetail.orderNo) {
        // 将获取到的订单添加到列表中，避免重复请求
        productionOrderList.value.push(orderDetail)
        // 触发页面更新
        nextTick(() => {
          // 强制更新表格
        })
      }
    })
    .catch(error => {
      console.error('获取生产订单详情失败:', error)
    })
  
  return `订单${orderId}` // 临时显示，等待异步加载完成
}

/** 根据产品ID获取产品名称 */
const getProductName = (productId: number) => {
  // 检查productId是否有效
  if (!productId || productId === undefined || productId === null) {
    return '未知产品'
  }
  
  const product = productList.value.find(item => item.id === productId)
  return product ? product.name : ''
}

/** 初始化 **/
onMounted(() => {
  getList()
  getWarehouseList()
  getProductionOrderList()
  getProductList()
})
</script>
