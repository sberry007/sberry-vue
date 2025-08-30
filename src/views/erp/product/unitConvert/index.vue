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
      <el-form-item label="产品" prop="productId">
        <el-select
          v-model="queryParams.productId"
          placeholder="请选择产品"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="product in productList"
            :key="product.id"
            :label="product.name"
            :value="product.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="源单位" prop="fromUnitId" label-width="80">
        <el-select
          v-model="queryParams.fromUnitId"
          placeholder="请选择源单位"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="unit in unitList"
            :key="unit.id"
            :label="unit.name"
            :value="unit.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="目标单位" prop="toUnitId" label-width="100">
        <el-select
          v-model="queryParams.toUnitId"
          placeholder="请选择目标单位"
          clearable
          class="!w-240px"
        >
          <el-option
            v-for="unit in unitList"
            :key="unit.id"
            :label="unit.name"
            :value="unit.id"
          />
        </el-select>
      </el-form-item>
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
          v-hasPermi="['erp:product-unit-conversion:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:product-unit-conversion:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
<!--      <el-table-column label="主键" align="center" prop="id" />-->
      <el-table-column label="产品名称" align="center" prop="productName" />
        <el-table-column label="源单位" align="center" prop="fromUnitName" />
        <el-table-column label="目标单位" align="center" prop="toUnitName" />
      <el-table-column label="换算系数" align="center" prop="conversionFactor" />
      <el-table-column label="是否启用" align="center" prop="isActive" >
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.INFRA_BOOLEAN_STRING" :value="scope.row.isActive" />
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" min-width="120px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:product-unit-conversion:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:product-unit-conversion:delete']"
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
  <ProductUnitConversionForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { ProductUnitConversionApi, ProductUnitConversionVO } from '@/api/erp/product/unitConvert'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { ProductUnitApi, ProductUnitVO } from '@/api/erp/product/unit'
import ProductUnitConversionForm from './ProductUnitConversionForm.vue'
import { DICT_TYPE } from '@/utils/dict'

/** 产品单位换算 列表 */
defineOptions({ name: 'ProductUnitConversion' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<ProductUnitConversionVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const productList = ref<ProductVO[]>([]) // 产品列表
const unitList = ref<ProductUnitVO[]>([]) // 单位列表
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  productId: undefined,
  fromUnitId: undefined,
  toUnitId: undefined,
  createTime: [],
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProductUnitConversionApi.getProductUnitConversionPage(queryParams)
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
    await ProductUnitConversionApi.deleteProductUnitConversion(id)
    message.success(t('common.delSuccess'))
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
    const data = await ProductUnitConversionApi.exportProductUnitConversion(queryParams)
    download.excel(data, '产品单位换算.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 获取产品列表 */
const getProductList = async () => {
  try {
    const data = await ProductApi.getProductSimpleList()
    productList.value = data
  } catch {}
}

/** 获取单位列表 */
const getUnitList = async () => {
  try {
    const data = await ProductUnitApi.getProductUnitSimpleList()
    unitList.value = data
  } catch {}
}

/** 初始化 **/
onMounted(() => {
  getList()
  getProductList()
  getUnitList()
})
</script>
