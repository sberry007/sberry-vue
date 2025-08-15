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
      <el-form-item label="订单编号" prop="orderNo">
        <el-input
          v-model="queryParams.orderNo"
          placeholder="请输入订单编号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="产品" prop="productId">
        <el-select
          v-model="queryParams.productId"
          clearable
          filterable
          placeholder="请选择产品"
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


      <el-form-item label="仓库" prop="warehouseId">
        <el-select
          v-model="queryParams.warehouseId"
          clearable
          filterable
          placeholder="请选择仓库"
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
      <el-form-item label="订单状态" prop="status">
        <el-select
          v-model="queryParams.status"
          placeholder="请选择订单状态"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="item in statusOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          >
            <dict-tag :type="DICT_TYPE.ERP_PRODUCTION_ORDER_STATUS" :value="item.value" />
          </el-option>
        </el-select>
      </el-form-item>


      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="queryParams.remark"
          placeholder="请输入备注"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="daterange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          :default-time="[new Date('1 00:00:00'), new Date('1 23:59:59')]"
          class="!w-240px"
        />
      </el-form-item>
      <!--      <el-form-item label="版本号" prop="version">-->
      <!--        <el-input-->
      <!--          v-model="queryParams.version"-->
      <!--          placeholder="请输入版本号"-->
      <!--          clearable-->
      <!--          @keyup.enter="handleQuery"-->
      <!--          class="!w-240px"-->
      <!--        />-->
      <!--      </el-form-item>-->
      <el-form-item>
        <el-button @click="handleQuery">
          <Icon icon="ep:search" class="mr-5px" />
          搜索
        </el-button>
        <el-button @click="resetQuery">
          <Icon icon="ep:refresh" class="mr-5px" />
          重置
        </el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['erp-production:epr-production-order:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" />
          新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp-production:epr-production-order:export']"
        >
          <Icon icon="ep:download" class="mr-5px" />
          导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <!--      <el-table-column label="主键" align="center" prop="id" />-->
      <el-table-column label="订单编号" align="center" prop="orderNo" width="180" />
      <el-table-column label="产品信息" align="center" prop="productName" min-width="200" />
      <el-table-column
        label="计划生产数量"
        align="center"
        prop="plannedQuantity"
        :formatter="erpCountTableColumnFormatter"
        min-width="110"
      />
      <el-table-column label="仓库" align="center" prop="warehouseName" width="180" />
      <el-table-column label="优先级" align="center" prop="priority">
        <template #default="scope">
<!--          <span v-if="scope.row.priority === 0">低</span>-->
<!--          <span v-else-if="scope.row.priority === 1">普通</span>-->
<!--          <span v-else-if="scope.row.priority === 2">高</span>-->
<!--          <span v-else-if="scope.row.priority === 3">紧急</span>-->
<!--          <span v-else>{{ scope.row.priority }}</span>-->
          <dict-tag :type="DICT_TYPE.ERP_PRODUCTION_ORDER_PRIORITY" :value="scope.row.priority" />
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="状态" align="center" fixed="right" width="90" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.ERP_PRODUCTION_ORDER_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" fixed="right" width="220">
        <template #default="scope">
          <el-button
            link
            @click="openForm('detail', scope.row.id)"
            v-hasPermi="['erp-production:epr-production-order:query']"
          >
            详情
          </el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp-production:epr-production-order:update']"
            :disabled="scope.row.status === 20"
          >
            编辑
          </el-button>
          <el-button
            link
            type="primary"
            @click="handleUpdateStatus(scope.row.id, 20)"
            v-hasPermi="['erp-production:epr-production-order:update-status']"
            v-if="scope.row.status === 1"
          >
            审批
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleUpdateStatus(scope.row.id, 10)"
            v-hasPermi="['erp-production:epr-production-order:update-status']"
            v-if="scope.row.status === 2"
          >
            反审批
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete([scope.row.id])"
            v-hasPermi="['erp-production:epr-production-order:delete']"
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
  <EprProductionOrderForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { EprProductionOrderApi, EprProductionOrderVO } from '@/api/erp/production/order'
import EprProductionOrderForm from './EprProductionOrderForm.vue'
import { getDictListByType } from '@/api/system/dict/dict.data'
import { ProductVO } from '@/api/erp/product/product' // 引入字典数据API
import { ProductApi } from '@/api/erp/product/product' // 产品API
import { erpCountTableColumnFormatter } from '@/utils'
import { WarehouseApi } from '@/api/erp/stock/warehouse'
import { DICT_TYPE } from '@/utils/dict' // 产品仓库API

/** ERP 生产订单 列表 */
defineOptions({ name: 'EprProductionOrder' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化
const loading = ref(true) // 列表的加载中
const list = ref<EprProductionOrderVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数

const productList = ref<ProductVO[]>([]) // 产品列表
const warehouseList = ref<any[]>([]) // 仓库列表数据

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  orderNo: undefined,
  productId: undefined,
  warehouseId: undefined,
  priority: undefined,
  status: undefined,
  remark: undefined,
  createTime: []
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中
const statusOptions = ref<Array<{ value: string, label: string }>>([]) // 订单状态选项

/** 初始化 **/
onMounted(async () => {
  await getList()
  // 加载生产订单状态
  await loadStatusOptions()
  // 加载产品
  productList.value = await ProductApi.getProductSimpleList()
  // 加载仓库
  warehouseList.value = await WarehouseApi.getWarehouseSimpleList()
})


/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await EprProductionOrderApi.getEprProductionOrderPage(queryParams)
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
    await EprProductionOrderApi.deleteEprProductionOrder(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {
  }
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await EprProductionOrderApi.exportEprProductionOrder(queryParams)
    download.excel(data, 'ERP 生产订单.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 审批/反审批操作 */
const handleUpdateStatus = async (id: number, status: number) => {
  try {
    // 审批的二次确认
    await message.confirm(`确定${status === 20 ? '审批' : '反审批'}该订单吗？`)
    // 发起审批
    await EprProductionOrderApi.updateEprProductionOrderStatus(id, status)
    message.success(`${status === 20 ? '审批' : '反审批'}成功`)
    // 刷新列表
    await getList()
  } catch {}
}

/** 获取订单状态字典数据 */
const loadStatusOptions = async () => {
  try {
    // 根据字典类型获取字典数据
    const res = await getDictListByType(DICT_TYPE.ERP_PRODUCTION_ORDER_STATUS)

    // 从 res 中获取字典数据
    statusOptions.value = res.map(item => ({
      value: item.value,
      label: item.label
    }))
  } catch (err) {
    message.error('获取订单状态数据失败')
  }
}
</script>
