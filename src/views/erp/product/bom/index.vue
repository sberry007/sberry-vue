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
      <el-form-item label="成品" prop="productId">
        <el-select
          v-model="queryParams.productId"
          placeholder="请选择成品"
          clearable
          filterable
          class="!w-240px"
        >
          <el-option
            v-for="product in finishedProductList"
            :key="product.id"
            :label="product.name"
            :value="product.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="版本号" prop="version">
        <el-input
          v-model="queryParams.version"
          placeholder="请输入版本号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="BOM名称" prop="bomName" label-width="120">
        <el-input
          v-model="queryParams.bomName"
          placeholder="请输入BOM名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择BOM状态" class="!w-240px">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.ERP_PRODUCT_BOM_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
            width="120"
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
          @click="openForm('create',null,null)"
          v-hasPermi="['erp:product-bom:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:product-bom:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="BOM编码" align="center" prop="bomCode" width="200px" />
      <el-table-column label="产品名称" align="center" prop="productName" width="160px" />
      <el-table-column label="BOM名称" align="center" prop="bomName" width="160px" />
      <el-table-column
        label="版本号"
        align="center"
        prop="version"
        width="100px"
        sortable
        :sort-method="sortVersion"
      />
      <el-table-column label="产出数量" align="center" prop="outputQty" width="100px" />
      <el-table-column label="产出单位" align="center" prop="outputUnitName" width="120px" />
      <el-table-column label="是否默认BOM" align="center" prop="isDefault" width="130px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.INFRA_BOOLEAN_STRING" :value="scope.row.isDefault" />
        </template>
      </el-table-column>
      <el-table-column label="BOM描述" align="center" prop="description" width="200px">
        <template #default="scope">
          <div
            v-html="scope.row.description"
            style="max-height: 60px; overflow: hidden; text-overflow: ellipsis"
          ></div>
        </template>
      </el-table-column>
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="状态" align="center" prop="status" fixed="right" width="100px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.ERP_PRODUCT_BOM_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" fixed="right" width="200px">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('detail', scope.row.id, null)"
            v-hasPermi="['erp:product-bom:query']"
          >
            详情
          </el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id,null)"
            v-hasPermi="['erp:product-bom:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="success"
            @click="openForm('copy',null,scope.row)"
            v-hasPermi="['erp:product-bom:create']"
          >
            复制
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:product-bom:delete']"
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
  <ProductBomForm ref="formRef" @success="getList" />
  

</template>

<script setup lang="ts">
import { onActivated } from 'vue'
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { ProductBomApi, ProductBomVO } from '@/api/erp/product/bom'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import ProductBomForm from './ProductBomForm.vue'

import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'

/** BOM主表 列表 */
defineOptions({ name: 'ProductBom' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<ProductBomVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数

const finishedProductList = ref<ProductVO[]>([]) // 成品列表

const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  productId: undefined,
  version: undefined,
  bomName: undefined,
  status: undefined,
  createTime: []
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProductBomApi.getProductBomPage(queryParams)
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

const openForm = async (type: string, id?: number,row: ProductBomVO) => {
  if (type == 'copy') {
    try {
      // 获取完整的BOM数据（包含明细列表）
      const bomData = await ProductBomApi.getProductBomDetail(row.id)
      // 打开复制表单弹窗
      formRef.value.open('copy',null,bomData)
    } catch (error) {
      console.error('获取BOM数据失败:', error)
      message.error('获取BOM数据失败，请重试')
    }
  }else {
    formRef.value.open(type, id, null)
  }
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await ProductBomApi.deleteProductBom(id)
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
    const data = await ProductBomApi.exportProductBom(queryParams)
    download.excel(data, 'BOM主表.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}



/** 加载成品列表 */
const loadFinishedProductList = async () => {
  finishedProductList.value = await ProductApi.getProductSimpleListByType('FP')
}

/** 初始化 **/
onMounted(async () => {
  await getList()
  await loadFinishedProductList()
})

/** 版本号排序方法 */
const sortVersion = (a: ProductBomVO, b: ProductBomVO) => {
  const parseVersion = (version: string) => {
    const parts = version.split('.').map(Number)
    return {
      major: parts[0] || 0,
      minor: parts[1] || 0,
      patch: parts[2] || 0
    }
  }

  const versionA = parseVersion(a.version || '0.0.0')
  const versionB = parseVersion(b.version || '0.0.0')

  // 先比较主版本号
  if (versionA.major !== versionB.major) {
    return versionA.major - versionB.major
  }

  // 再比较次版本号
  if (versionA.minor !== versionB.minor) {
    return versionA.minor - versionB.minor
  }

  // 最后比较修订号
  return versionA.patch - versionB.patch
}

/** 页面激活时刷新数据 */
onActivated(async () => {
  // 刷新成品列表，确保显示最新数据
  await loadFinishedProductList()
})
</script>
