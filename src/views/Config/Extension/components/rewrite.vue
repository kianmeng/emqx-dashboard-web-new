<template>
  <div class="no-tab-wrapper rewrite">
    <div class="section-header">
      <div></div>
      <el-button type="primary" @click="openOpDialog()" :icon="Plus">{{
        $t('Base.add')
      }}</el-button>
    </div>

    <el-table :data="rewriteTbData" class="shadow-none" v-loading="tbDataLoading">
      <el-table-column :label="tl('action')" prop="action" :min-width="108">
        <template #default="{ row }">
          {{ getLabelFromValueInOptionList(row.action, actionOpts) }}
        </template>
      </el-table-column>
      <el-table-column :label="tl('sTopic')" prop="source_topic" :min-width="146" />
      <el-table-column :label="tl('re')" prop="re" :min-width="120" />
      <el-table-column :label="tl('dTopic')" prop="dest_topic" :min-width="128" />
      <el-table-column :label="$t('Base.operation')" :min-width="146">
        <template #default="{ row }">
          <el-button size="small" @click="openOpDialog(true, row)">
            {{ $t('Base.edit') }}
          </el-button>
          <el-button size="small" plain @click="deleteRewrite(row)">
            {{ $t('Base.delete') }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="opRewrite"
      :title="(isEdit ? $t('Base.edit') : $t('Base.add')) + ' ' + tl('rewrite')"
      @close="initForm"
    >
      <el-form
        ref="rewriteForm"
        :model="rewriteInput"
        :rules="rewriteRules"
        label-position="top"
        @keyup.enter="submitRewrite(isEdit)"
      >
        <el-form-item :label="tl('action')" prop="action">
          <el-select v-model="rewriteInput.action">
            <el-option
              v-for="{ value, label } in actionOpts"
              :key="value"
              :value="value"
              :label="label"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="tl('sTopic')" prop="source_topic">
          <el-input v-model="rewriteInput.source_topic" />
        </el-form-item>
        <el-form-item :label="tl('re')" prop="re">
          <el-input v-model="rewriteInput.re" />
        </el-form-item>
        <el-form-item :label="tl('dTopic')" prop="dest_topic">
          <el-input v-model="rewriteInput.dest_topic" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="opRewrite = false">{{ $t('Base.cancel') }}</el-button>
        <el-button type="primary" @click="submitRewrite(isEdit)" :loading="submitLoading">
          {{ isEdit ? $t('Base.update') : $t('Base.add') }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, nextTick, onMounted, reactive, ref } from 'vue'
import { getTopicRewrite, editTopicRewrite } from '@/api/extension'
import { ElMessageBox as MB } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'
import useI18nTl from '@/hooks/useI18nTl'
import { Plus } from '@element-plus/icons-vue'
import { getLabelFromValueInOptionList } from '@/common/tools'

export default defineComponent({
  name: 'Rewrite',
  setup() {
    const { t } = useI18n()
    const { tl } = useI18nTl('Extension')

    let opRewrite = ref(false)
    let rewriteTbData = ref([])
    let isEdit = ref(false)
    const actionOpts = [
      { value: 'publish', label: 'Publish' },
      { value: 'subscribe', label: 'Subscribe' },
      { value: 'all', label: 'Publish & Subscribe' },
    ]
    let rewriteInput = reactive({
      action: '',
      source_topic: '',
      re: '',
      dest_topic: '',
    })
    let editPos = ref(undefined)
    let submitLoading = ref(false)
    let tbDataLoading = ref(true)
    let rewriteForm = ref(null)

    let validatorRules = [
      {
        required: true,
        message: tl('required'),
        trigger: ['blur', 'change'],
      },
    ]
    let rewriteRules = {
      action: validatorRules,
      source_topic: validatorRules,
      re: validatorRules,
      dest_topic: validatorRules,
    }

    const openOpDialog = async (edit = false, originData) => {
      opRewrite.value = true
      isEdit.value = !!edit
      Object.keys(rewriteInput).forEach((k) => {
        rewriteInput[k] = edit && originData[k] ? originData[k] : ''
      })
      edit && (editPos.value = rewriteTbData.value.findIndex((e) => e === originData))
      await nextTick(rewriteForm.value?.clearValidate)
    }

    const initForm = () => {
      Object.keys(rewriteInput).forEach((k) => {
        rewriteInput[k] = ''
      })
    }

    const submitRewrite = async function (edit = false) {
      let valid = await rewriteForm.value?.validate().catch(() => {})
      if (!valid) return

      let pendingTbData = [...rewriteTbData.value]

      if (!edit) {
        pendingTbData.push({ ...rewriteInput })
      } else {
        if (editPos.value === undefined) {
          return
        }
        pendingTbData.splice(editPos.value, 1, { ...rewriteInput })
      }

      submitLoading.value = true
      let res = await editTopicRewrite(pendingTbData).catch(() => {})
      if (res) {
        ElMessage({
          type: 'success',
          message: edit ? t('Base.updateSuccess') : t('Base.createSuccess'),
        })
        loadData()
      } else {
        ElMessage({
          type: 'error',
          message: t('Base.opErr'),
        })
      }
      submitLoading.value = false
      opRewrite.value = false
      editPos.value = undefined
    }

    const deleteRewrite = async function (row) {
      MB.confirm(t('Base.confirmDelete'), {
        confirmButtonText: t('Base.confirm'),
        cancelButtonText: t('Base.cancel'),
        confirmButtonClass: 'confirm-danger',
        type: 'warning',
      })
        .then(async () => {
          let pendingTbData = [...rewriteTbData.value]
          const pos = pendingTbData.findIndex((e) => e === row)
          pendingTbData.splice(pos, 1)
          let res = await editTopicRewrite(pendingTbData).catch(() => {})
          if (res) {
            ElMessage({
              type: 'success',
              message: t('Base.deleteSuccess'),
            })
            rewriteTbData.value = pendingTbData
          } else {
            ElMessage({
              type: 'error',
              message: t('Base.opErr'),
            })
          }
        })
        .catch(() => {})
    }

    const loadData = async () => {
      tbDataLoading.value = true
      let res = await getTopicRewrite().catch(() => {})
      if (res) {
        rewriteTbData.value = res
      }
      tbDataLoading.value = false
    }
    onMounted(loadData)

    const reloading = () => {
      loadData()
    }
    return {
      tl,
      Plus,
      isEdit,
      opRewrite,
      rewriteTbData,
      actionOpts,
      rewriteInput,
      openOpDialog,
      initForm,
      submitRewrite,
      deleteRewrite,
      submitLoading,
      tbDataLoading,
      reloading,
      rewriteForm,
      rewriteRules,
      getLabelFromValueInOptionList,
    }
  },
})
</script>
<style lang="scss" scoped></style>
