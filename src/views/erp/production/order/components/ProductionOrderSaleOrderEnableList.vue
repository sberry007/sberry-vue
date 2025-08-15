<!-- 可用于生产的销售订单列表 -->
<template>
  <Dialog
    title="选择销售订单（仅展示可生产）"
    v-model="dialogVisible"
    :appendToBody="true"
    :scroll="true"
    width="1080"
  >
    <ContentWrap>
      <!-- 搜索工作栏 -->
      <el-form
        class="-mb-15px"
        :model="queryParams"
        ref="queryFormRef"
        :inline="true"
        label-width="68px"
      >
        <el-form-item label="订单单号" prop="no">
          <el-input
            v-model="queryParams.no"
            placeholder="请输入订单单号"
            clearable
            @keyup.enter="handleQuery"
            class="!w-160px"
          />
        </el-form-item>
        <el-form-item label="产品" prop="productId">
          <el-select
            v-model="queryParams.productId"
            clearable
            filterable
            placeholder="请选择产品"
            class="!w-100px"
            @change="handleQuery"
          >
            <el-option
              v-for="item in productList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
<!--        <el-form-item label="订单时间" prop="orderTime">-->
<!--          <el-date-picker-->
<!--            v-model="queryParams.orderTime"-->
<!--            value-format="YYYY-MM-DD HH:mm:ss"-->
<!--            type="daterange"-->
<!--            start-placeholder="开始日期"-->
<!--            end-placeholder="结束日期"-->
<!--            :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"-->
<!--            class="!w-200px"-->
<!--          />-->
<!--        </el-form-item>-->
        <el-form-item>
          <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
          <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        </el-form-item>
      </el-form>
    </ContentWrap>

    <ContentWrap>
      <el-table v-loading="loading" :data="list" :show-overflow-tooltip="true" :stripe="true">
        <el-table-column align="center" width="65">
          <template #default="scope">
            <el-radio
              :value="scope.row.id"
              v-model="currentRowValue"
              @change="handleCurrentChange(scope.row)"
            >
              &nbsp;
            </el-radio>
          </template>
        </el-table-column>
        <el-table-column min-width="180" label="订单单号" align="center" prop="no" />
<!--        <el-table-column label="客户" align="center" prop="customerName" />-->
        <el-table-column label="产品名称" align="center" prop="productNames" min-width="200" />
        <el-table-column
          label="订单时间"
          align="center"
          prop="orderTime"
          :formatter="dateFormatter2"
          width="120px"
        />
        <el-table-column
          label="总数量"
          align="center"
          prop="totalCount"
          :formatter="erpCountTableColumnFormatter"
        />
<!--        <el-table-column-->
<!--          label="已生产数量"-->
<!--          align="center"-->
<!--          prop="productionCount"-->
<!--          :formatter="erpCountTableColumnFormatter"-->
<!--        />-->
        <el-table-column
          label="金额合计"
          align="center"
          prop="totalProductPrice"
          :formatter="erpPriceTableColumnFormatter"
        />
        <el-table-column
          label="含税金额"
          align="center"
          prop="totalPrice"
          :formatter="erpPriceTableColumnFormatter"
        />
      </el-table>
      <!-- 分页 -->
      <Pagination
        v-model:limit="queryParams.pageSize"
        v-model:page="queryParams.pageNo"
        :total="total"
        @pagination="getList"
      />
    </ContentWrap>
    <template #footer>
      <el-button :disabled="!currentRow" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script lang="ts" setup>
import { ElTable } from 'element-plus'
import { EprProductionOrderApi } from '@/api/erp/production/order'
import { SaleOrderVO } from '@/api/erp/sale/order'
import { dateFormatter2 } from '@/utils/formatTime'
import { erpCountTableColumnFormatter, erpPriceTableColumnFormatter } from '@/utils'
import { ProductApi, ProductVO } from '@/api/erp/product/product'

defineOptions({ name: 'ProductionOrderSaleOrderEnableList' })

const list = ref<SaleOrderVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const loading = ref(false) // 列表的加载中
const dialogVisible = ref(false) // 弹窗的是否展示
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  no: undefined,
  productId: undefined,
  orderTime: [],
  productionEnable: true, // 只查询可生产的订单
  customerId: undefined
})
const queryFormRef = ref() // 搜索的表单
const productList = ref<ProductVO[]>([]) // 产品列表

/** 选中行 */
const currentRowValue = ref(undefined) // 选中行的 value
const currentRow = ref() // 选中行
const handleCurrentChange = (row) => {
  currentRow.value = row
}

/** 打开弹窗 */
const open = async (customerId) => {
  dialogVisible.value = true
  await nextTick() // 等待，避免 queryFormRef 为空
  console.log('打开弹窗,customerId:', customerId)
  // 设置客户ID
  queryParams.customerId = customerId
  console.log('打开弹窗,queryParams.customerId:', queryParams.customerId)
  // 加载可生产的订单列表
  await resetQuery()
  // 加载产品列表
  productList.value = await ProductApi.getProductSimpleList()
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交选择 */
const emits = defineEmits<{
  (e: 'success', value: SaleOrderVO): void
}>()
const submitForm = () => {
  try {
    emits('success', currentRow.value)
  } finally {
    // 关闭弹窗
    dialogVisible.value = false
  }
}

/** 查询列表 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置查询 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  queryParams.pageNo = 1
  getList()
}

/** 加载列表 */
const getList = async () => {
  loading.value = true
  try {
    // 根据选择的productId获取产品名称
    let productName = undefined
    if (queryParams.productId) {
      const selectedProduct = productList.value.find(p => p.id === queryParams.productId)
      productName = selectedProduct?.name
    }
    
    const data = await EprProductionOrderApi.getProductionEnableSaleOrders({
      customerId: Number(queryParams.customerId),
      orderNo: queryParams.no,
      productName: productName
    })
    list.value = data || []
    total.value = data?.length || 0
  } finally {
    loading.value = false
  }
}
</script>
