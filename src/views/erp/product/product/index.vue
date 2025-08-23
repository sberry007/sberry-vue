<!-- ERP 产品列表 -->
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
      <el-form-item label="名称" prop="name" label-width="90">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="分类" prop="categoryId">
        <el-tree-select
          v-model="queryParams.categoryId"
          :data="categoryList"
          :props="defaultProps"
          filterable
          check-strictly
          default-expand-all
          placeholder="请选择分类"
          class="!w-240px"
          @change="handleCategoryChange"
        />
      </el-form-item>
      <el-form-item label="产品类型" prop="productType" label-width="100">
        <el-select v-model="queryParams.productType" placeholder="请选择产品类型" clearable class="!w-240px">
          <el-option
            v-for="dict in getStrDictOptions(DICT_TYPE.ERP_PRODUCT_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="创建时间" prop="createTime" label-width="90">
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
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['erp:product:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="success"
          plain
          @click="handleExport"
          :loading="exportLoading"
          v-hasPermi="['erp:product:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="条码" align="center" prop="barCode" width="200"/>
      <el-table-column label="名称" align="center" prop="name"  width="100"/>
      <el-table-column label="分类" align="center" prop="categoryName"  width="100"/>
      <el-table-column label="类型" align="center" prop="productType" width="100" >
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.ERP_PRODUCT_TYPE" :value="scope.row.productType" />
        </template>
      </el-table-column>
      <el-table-column label="规格" align="center" prop="standard"  width="100"/>
      <el-table-column label="单位" align="center" prop="unitName"  width="100"/>
      <el-table-column
        label="采购价格"
        align="center"
        prop="purchasePrice"
        :formatter="erpPriceTableColumnFormatter" width="100"
      />
      <el-table-column
        label="销售价格"
        align="center"
        prop="salePrice"
        :formatter="erpPriceTableColumnFormatter" width="100"
      />
      <el-table-column
        label="最低价格"
        align="center"
        prop="minPrice"
        :formatter="erpPriceTableColumnFormatter" width="100"
      />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="220px"
      />
      <el-table-column label="状态" align="center" prop="status" width="70" fixed="right">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.COMMON_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="200" fixed="right">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('view', scope.row.id)"
            v-hasPermi="['erp:product:query']"
          >
            查看详情
          </el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['erp:product:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['erp:product:delete']"
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
  <ProductForm ref="formRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import download from '@/utils/download'
import { ProductApi, ProductVO } from '@/api/erp/product/product'
import { ProductCategoryApi, ProductCategoryVO } from '@/api/erp/product/category'
import ProductForm from './ProductForm.vue'
import { DICT_TYPE, getStrDictOptions } from '@/utils/dict'
import { defaultProps, handleTree } from '@/utils/tree'
import { erpPriceTableColumnFormatter } from '@/utils'

/** ERP 产品列表 */
defineOptions({ name: 'ErpProduct' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<ProductVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  categoryId: undefined,
  productType: undefined,
  createTime: undefined
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中
const categoryList = ref<ProductCategoryVO[]>([]) // 产品分类列表
const previousSearchCategoryId = ref<number | undefined>() // 保存之前选择的搜索分类ID

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ProductApi.getProductPage(queryParams)
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
  // 重置之前的分类ID
  previousSearchCategoryId.value = undefined
  handleQuery()
}

/** 处理搜索分类选择变化 */
const handleCategoryChange = (categoryId: number) => {
  if (categoryId && !checkSelectedCategoryIsLeaf(categoryId)) {
    // 恢复到之前的选择，不改变当前选择
    nextTick(() => {
      queryParams.categoryId = previousSearchCategoryId.value
    })
  } else {
    // 如果是叶子节点，更新之前的值
    previousSearchCategoryId.value = categoryId
  }
}

/** 校验所选分类是否为叶子节点分类 */
const checkSelectedCategoryIsLeaf = (categoryId: number) => {
  if (!categoryId) return true

  // 查找选中的节点
  const selectedNode = findNodeInTree(categoryList.value, categoryId)
  if (!selectedNode) {
    message.warning('所选分类不存在')
    return false
  }

  // 检查是否为叶子节点（没有子节点或子节点数组为空）
  const isLeaf = !selectedNode.children || selectedNode.children.length === 0
  if (!isLeaf) {
    message.warning('请选择叶子节点分类')
    return false
  }

  return true
}

/** 在树形结构中查找指定节点 */
const findNodeInTree = (tree: any[], nodeId: any): any => {
  for (const node of tree) {
    if (node.id === nodeId) {
      return node
    }
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, nodeId)
      if (found) {
        return found
      }
    }
  }
  return null
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
    await ProductApi.deleteProduct(id)
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
    const data = await ProductApi.exportProduct(queryParams)
    download.excel(data, '产品.xls')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 初始化 **/
onMounted(async () => {
  await getList()
  // 产品分类
  const categoryData = await ProductCategoryApi.getProductCategorySimpleList()
  categoryList.value = handleTree(categoryData, 'id', 'parentId')
  // 初始化之前的分类ID
  previousSearchCategoryId.value = queryParams.categoryId
})
</script>
