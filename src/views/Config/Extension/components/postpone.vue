<template>
  <div class="postpone">
    <el-tabs>
      <el-tab-pane :label="t('Base.setting')" v-loading="configPending">
        <div class="part-header">{{ tl('enable') }}</div>
        <el-row class="enable-row" align="middle">
          <el-col :span="16">{{ tl('enableDescDelay') }}</el-col>
          <el-col :span="16">
            <el-switch v-model="delayedConfig.enable" @change="toggleStatus()" />
          </el-col>
        </el-row>
        <el-form
          ref="delayedForm"
          :rules="delayedRules"
          :model="delayedConfig"
          :disabled="!configEnable"
          label-position="top"
          @keyup.enter="updateDelayedConfig()"
        >
          <el-row>
            <el-col :span="10">
              <el-form-item :label="tl('maxDelayedMsg')" prop="max_delayed_messages">
                <el-input
                  v-model.number="delayedConfig.max_delayed_messages"
                  :readonly="delayedOption == 'unlimited'"
                  maxlength="6"
                >
                  <template #append>
                    <el-select v-model="delayedOption">
                      <el-option value="unlimited" :label="tl('unlimited')" />
                      <el-option value="custom" :label="tl('custom')" />
                    </el-select>
                  </template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
        <el-row>
          <el-button
            type="primary"
            :disabled="!delayedConfig.enable"
            @click="updateDelayedConfig()"
          >
            {{ $t('Base.save') }}
          </el-button>
        </el-row>
      </el-tab-pane>
      <el-tab-pane :label="tl('dataManage')" v-loading="tbLoading">
        <el-table :data="delayedTbData" class="shadow-none postpone-table">
          <el-table-column :label="$t('Base.topic')" prop="topic" :min-width="92" />
          <el-table-column :label="'QoS'" prop="qos" :min-width="84" />
          <el-table-column :label="'Payload'" :min-width="84">
            <template #default="{ row }">
              <el-button size="small" @click="checkPayload(row)">{{ tl('openPayload') }}</el-button>
            </template>
          </el-table-column>
          <el-table-column :label="$t('Base.clientid')" prop="from_clientid" :min-width="146" />
          <el-table-column :label="tl('delayedTime')" prop="delayed_interval" :min-width="92" />
          <el-table-column :label="tl('remainTime')" prop="delayed_remaining" :min-width="124" />
          <el-table-column :label="tl('publishTime')" :min-width="132">
            <template #default="{ row }">
              {{ row.publish_at && dateFormat(row.publish_at) }}
            </template>
          </el-table-column>

          <el-table-column :label="$t('Base.operation')" :min-width="92">
            <template #default="{ row }">
              <el-button size="small" plain @click="deleteDelayedInfo(row)">
                {{ $t('Base.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="emq-table-footer">
          <common-pagination @loadPage="loadDelayedList" v-model:metaData="pageMeta" />
        </div>
      </el-tab-pane>
    </el-tabs>
    <el-dialog class="payload-dialog" v-model="payloadDialog" :title="'Payload'">
      <el-row v-loading="payloadLoading">
        <el-input
          type="textarea"
          :rows="10"
          resize="none"
          placeholder="Payload"
          v-model="payloadForShow"
          readonly
        />
      </el-row>
      <template #footer>
        <div class="payload-dialog-ft" v-if="!(payloadDetail === null)">
          <el-select v-model="payloadShowBy">
            <el-option
              v-for="item in payloadShowByOptions"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
          <div>
            <span v-if="isCopyShow" class="payload-copied">{{ $t('Base.copied') }}</span>

            <el-button @click="copyText(payloadForShow)">
              {{ $t('Base.copy') }}
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  getDelayedConfig,
  editDelayedConfig,
  getDelayedList,
  getDelayedInfo,
  delDelayedInfo,
} from '@/api/extension'
import CommonPagination from '@/components/commonPagination.vue'
import useShowTextByDifferent from '@/hooks/useShowTextByDifferent'
import { dateFormat } from '@/common/utils'
import { ElMessageBox as MB, ElMessage } from 'element-plus'
import useI18nTl from '@/hooks/useI18nTl'
import useCopy from '@/hooks/useCopy'
import useDataNotSaveConfirm, { useCheckDataChanged } from '@/hooks/useDataNotSaveConfirm'
import usePaginationWithHasNext from '@/hooks/usePaginationWithHasNext'

export default defineComponent({
  name: 'Postpone',
  components: {
    CommonPagination,
  },
  setup() {
    const { tl, t } = useI18nTl('Extension')
    const { copyText } = useCopy(copySuccess)

    let delayedConfig = reactive({
      enable: false,
      max_delayed_messages: 0,
    })
    let delayedTbData = ref([])
    let configPending = ref(true)
    let tbLoading = ref(false)
    let configEnable = ref(false)
    let delayedOption = ref('custom')
    let delayedForm = ref(null)
    let delayedRules = {
      max_delayed_messages: [
        {
          required: true,
          message: tl('required'),
          trigger: 'blur',
        },
        {
          type: 'number',
          message: tl('needNumber'),
          trigger: 'blur',
        },
      ],
    }
    let payloadDialog = ref(false)
    let payloadLoading = ref(false)
    let payloadDetail = ref('')
    let isCopyShow = ref(false)
    const { pageMeta, pageParams, initPageMeta, setPageMeta } = usePaginationWithHasNext()

    const { payloadForShow, payloadShowBy, payloadShowByOptions, setRawText } =
      useShowTextByDifferent()

    const { setRawData, checkDataIsChanged } = useCheckDataChanged(ref(delayedConfig))
    useDataNotSaveConfirm(checkDataIsChanged)

    watch(delayedOption, (newOption) => {
      if (newOption == 'unlimited') {
        delayedConfig.max_delayed_messages = 0
      }
    })

    const getDelayedOption = () => {
      if (delayedConfig?.max_delayed_messages == 0) {
        return 'unlimited'
      } else {
        return 'custom'
      }
    }
    const getConfigFormEnable = () => {
      if (delayedConfig?.enable === true) {
        configEnable.value = true
      } else {
        configEnable.value = false
      }
    }

    const loadDelayedConfig = async () => {
      try {
        configPending.value = true
        delayedForm.value?.resetFields()

        let res = await getDelayedConfig()
        Object.assign(delayedConfig, res)
        setRawData(delayedConfig)
        getConfigFormEnable()
        delayedOption.value = getDelayedOption()
      } catch (error) {
        //
      } finally {
        configPending.value = false
      }
    }

    const loadDelayedList = async (params = {}) => {
      tbLoading.value = true
      let sendParams = { ...pageParams.value, ...params }
      try {
        const { data, meta } = await getDelayedList(sendParams)
        delayedTbData.value = data
        setPageMeta(meta)
      } catch (error) {
        delayedTbData.value = []
        initPageMeta()
      } finally {
        tbLoading.value = false
      }
    }

    const deleteDelayedInfo = async function (row) {
      await MB.confirm(t('Base.confirmDelete'), {
        confirmButtonText: t('Base.confirm'),
        cancelButtonText: t('Base.cancel'),
        confirmButtonClass: 'confirm-danger',
        type: 'warning',
      })
      const { msgid, node } = row
      if (!msgid || !node) {
        return
      }
      try {
        await delDelayedInfo(node, msgid)
        loadDelayedList()
      } catch (error) {
        console.error(error)
      }
    }

    const checkPayload = async function (row) {
      payloadDialog.value = true
      payloadLoading.value = true
      payloadDetail.value = ''
      const { msgid, node } = row
      try {
        let res = await getDelayedInfo(node, msgid)
        if (res) {
          payloadDetail.value = res?.payload
          setRawText(payloadDetail.value)
        }
      } catch (error) {
        console.error(error)
      } finally {
        payloadLoading.value = false
      }
    }

    const toggleStatus = async () => {
      let valid = await delayedForm.value?.validate().catch(() => {})
      if (!valid) {
        delayedConfig.enable = !delayedConfig.enable
        return
      }
      updateDelayedConfig()
    }

    const updateDelayedConfig = async function () {
      try {
        await delayedForm.value?.validate()
        configPending.value = true
        await editDelayedConfig(delayedConfig)
        getConfigFormEnable()
        ElMessage({ type: 'success', message: t('Base.updateSuccess') })
      } catch (error) {
        //
      } finally {
        loadDelayedConfig()
        configPending.value = false
      }
    }

    const reloading = function () {
      loadDelayedConfig()
      loadDelayedList()
      // p.value.$emit("loadPage");
    }

    onMounted(reloading)

    let copyShowTimeout = ref(null)
    const copySuccess = () => {
      isCopyShow.value = true
      clearTimeout(copyShowTimeout.value)
      copyShowTimeout.value = setTimeout(() => {
        isCopyShow.value = false
      }, 2000)
    }

    onUnmounted(() => {
      copyShowTimeout.value && clearTimeout(copyShowTimeout.value)
    })

    return {
      t,
      tl,
      delayedTbData,
      delayedConfig,
      toggleStatus,
      updateDelayedConfig,
      configPending,
      deleteDelayedInfo,
      delayedOption,
      reloading,
      tbLoading,
      delayedForm,
      delayedRules,
      configEnable,
      loadDelayedList,
      checkPayload,
      payloadDialog,
      payloadLoading,
      payloadDetail,
      payloadForShow,
      payloadShowBy,
      payloadShowByOptions,
      dateFormat,
      isCopyShow,
      copySuccess,
      copyText,
      pageMeta,
    }
  },
})
</script>

<style lang="scss" scoped>
.postpone {
  :deep(.el-row) {
    margin-bottom: 24px;
  }
}
.payload-copied {
  padding-right: 10px;
}
.payload-dialog {
  .payload-dialog-ft {
    display: flex;
    justify-content: space-between;
    .el-select {
      width: 200px;
    }
  }
}
.postpone-table {
  :deep(.el-table__cell > .cell) {
    padding: 0 12px;
  }
}
</style>
