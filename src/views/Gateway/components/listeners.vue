<template>
  <div>
    <div class="section-header" v-if="!showIntegration">
      <div></div>
      <el-button type="primary" :icon="Plus" @click="addListener">
        {{ tl('addListener') }}
      </el-button>
    </div>
    <el-table :data="listenerTable" v-loading="listenerLoading">
      <el-table-column :label="'ID'" prop="id" />
      <el-table-column :label="tl('lType')" prop="type" />
      <el-table-column :label="tl('lAddress')" prop="bind">
        <template #default="{ row }">
          {{ transPort(row.bind) }}
        </template>
      </el-table-column>
      <el-table-column :label="tl('lMaxConn')" prop="max_connections" />
      <el-table-column :label="$t('BasicConfig.acceptors')" prop="acceptors">
        <template #default="{ row }">
          <span>{{ row.acceptors === '' ? '-' : row.acceptors }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('Base.operation')">
        <template #default="{ row, $index }">
          <el-button size="small" @click="editListener(row, $index)">
            {{ $t('Base.setting') }}
          </el-button>
          <el-button size="small" plain @click="delListener(row)">
            {{ $t('Base.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="not-standalone-btn" v-if="showIntegration">
      <el-button type="primary" :icon="Plus" @click="addListener">
        {{ tl('addListener') }}
      </el-button>
    </div>

    <ListenerDrawer
      v-model="opListener"
      :listener="currentListener"
      :gatewayName="gName"
      :doNotSubmitToBackend="integration"
      @submitted="loadListenerData"
      @submit="submitListener"
      @delete="delListener($event)"
    />
  </div>
</template>

<script setup>
import { onMounted, ref, watch, defineProps, defineEmits, computed } from 'vue'
import { getGatewayListeners, deleteGatewayListener } from '@/api/gateway'
import _ from 'lodash'
import { useRoute } from 'vue-router'
import { ElMessage as M, ElMessageBox as MB } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import useListenerUtils from '@/hooks/Config/useListenerUtils'
import ListenerDrawer from '@/components/ListenerDrawer/ListenerDrawer.vue'
import useI18nTl from '@/hooks/useI18nTl.ts'

const props = defineProps({
  integration: {
    type: Boolean,
    required: false,
    default: false,
  },
  gatewayName: {
    type: String,
    required: false,
    default: '',
  },
  list: {
    type: Array,
    required: false,
    default: () => [],
  },
})

const showIntegration = computed(() => props.integration)

const emit = defineEmits(['list'])

const route = useRoute()
const { t, tl } = useI18nTl('Gateway')
const gName = (route.params.name || props.gatewayName).toLowerCase()
const { normalizeStructure, deNormalizeStructure, transPort } = useListenerUtils()

let opListener = ref(false)
let listenerTable = ref([])
let listenerLoading = ref(false)
const currentListener = ref(undefined)

let editPos = 0

const addListener = () => {
  currentListener.value = undefined
  opListener.value = true
}

const editListener = (listener, index) => {
  currentListener.value = listener
  editPos = index
  opListener.value = true
}

const loadListenerData = async function () {
  listenerLoading.value = true
  try {
    let res = await getGatewayListeners(gName)
    listenerTable.value = res.map((v) => deNormalizeStructure(v, gName))
  } catch (error) {
    //
  } finally {
    listenerLoading.value = false
  }
}

const submitListener = async function (data) {
  const isEdit = !!currentListener.value
  if (isEdit) {
    listenerTable.value.splice(editPos, 1, data)
  } else {
    listenerTable.value.push(data)
  }
}

const delListener = async function (row) {
  await MB.confirm(t('Base.confirmDelete'), {
    confirmButtonText: t('Base.confirm'),
    cancelButtonText: t('Base.cancel'),
    type: 'warning',
  })
  if (props.integration) {
    listenerTable.value.splice(listenerTable.value.indexOf(row), 1)
  } else {
    try {
      await deleteGatewayListener(gName, row.id)
      M.success(t('Base.deleteSuccess'))
      loadListenerData()
      if (opListener.value === true) {
        opListener.value = false
      }
    } catch (error) {
      //
    }
  }
}

watch(
  () => _.cloneDeep(listenerTable.value),
  (v) => {
    if (props.integration) {
      emit(
        'update:list',
        v.map((v) => normalizeStructure(v)),
      )
    }
  },
)

onMounted(() => {
  if (props.integration) {
    listenerTable.value = props.list.map((v) => deNormalizeStructure(v, gName))
  } else {
    loadListenerData()
  }
})
</script>

<style lang="scss" scoped>
.not-standalone-btn {
  margin-top: 40px;
  margin-bottom: 20px;
}

.el-input-group--append :deep(.el-input-group__append) {
  width: 70px;
}
</style>
