<template>
  <div class="iot-form">
    <el-row class="editor-row">
      <el-col :span="15" class="sql-col">
        <el-form
          ref="formCom"
          :model="ruleValue"
          :rules="formRules"
          label-position="top"
          hide-required-asterisk
        >
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item required prop="id">
                <el-input v-model="ruleValue.id" placeholder="ID" :disabled="isEdit" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item prop="description">
                <el-input v-model="ruleValue.description" :placeholder="tl('note')" />
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-form-item required prop="sql" class="self-required">
                <template #label>
                  <span>{{ tl('sqlEditor') }}</span>
                  <InfoTooltip :content="tl('ruleSQLDesc')" />
                  <p class="sub-block-desc">
                    <span>{{ tl('sqlEdit') }}</span>
                    <a :href="docMap.sqlGrammar" target="_blank">{{ tl('sqlSyntaxAndTem') }}</a>
                  </p>
                </template>
                <div class="monaco-container sql">
                  <Monaco
                    :id="createRandomString()"
                    v-model="ruleValue.sql"
                    lang="sql"
                    @change="validate"
                  />
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="24">
              <el-button @click="openTemplateDrawer" type="primary" plain>
                {{ tl('SQLTemplates') }}
              </el-button>
            </el-col>
          </el-row>
        </el-form>
      </el-col>
      <el-col :span="9" class="action-col">
        <el-tabs v-model="rightBlockActiveTab">
          <el-tab-pane :label="tl('events')" :name="RightTab.Events">
            <EventsSelect
              :event-list="ruleEventsList"
              :ingress-bridge-list="ingressBridgeList"
              @use-event="addEvent"
            />
          </el-tab-pane>
          <el-tab-pane :label="tl('actions')" :name="RightTab.Actions">
            <RuleOutputs v-model="ruleValue" />
          </el-tab-pane>
        </el-tabs>
      </el-col>
    </el-row>
    <el-row class="test-row">
      <SQLTest
        ref="testSQLRef"
        :sql="ruleValue.sql"
        :ingress-bridge-list="ingressBridgeList"
        :event-list="ruleEventsList"
        :custom-payload="payloadForTest"
        @change-loading="handleTestLoadng"
        @save="saveSQLFromTest"
        @use-sql="useSQLTemplate"
      />
    </el-row>
    <el-row class="oper-row">
      <el-col :span="24">
        <el-button @click="$router.push({ name: 'iot' })">
          {{ $t('Base.cancel') }}
        </el-button>
        <el-button type="primary" plain @click="saveAsCopy" v-if="isEdit">
          {{ tl('saveAsCopy') }}
        </el-button>
        <el-button type="primary" :loading="submitLoading" @click="$emit('save')">
          {{ isEdit ? $t('Base.update') : $t('Base.create') }}
        </el-button>
      </el-col>
    </el-row>
  </div>
  <SQLTemplateDrawer v-model="showSQLTemplateDrawer" @use-sql="useSQLTemplate" />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  name: 'iot-form',
})
</script>

<script lang="ts" setup>
import { ref, Ref, onMounted, watch, defineEmits, defineProps, defineExpose } from 'vue'
import { getBridgeInfo, getBridgeList, getRuleEvents } from '@/api/ruleengine'
import { BridgeItem, RuleForm, BasicRule, RuleEvent } from '@/types/rule'
import { useI18n } from 'vue-i18n'
import { cloneDeep } from 'lodash'
import { MQTTBridgeDirection, RuleSQLKeyword } from '@/types/enum'
import SQLTest from './SQLTest.vue'
import SQLTemplateDrawer from './SQLTemplateDrawer.vue'
import RuleOutputs from './RuleOutputs.vue'
import Monaco from '@/components/Monaco.vue'
import InfoTooltip from '@/components/InfoTooltip.vue'
import {
  createRandomString,
  getKeywordsFromSQL,
  checkIsValidArr,
  handleSQLFromPartStatement,
  sortedUniq,
} from '@/common/tools'
import { useRuleUtils } from '@/hooks/Rule/topology/useRule'
import { DEFAULT_SELECT, DEFAULT_FROM } from '@/common/constants'
import useFormRules from '@/hooks/useFormRules'
import useDocLink from '@/hooks/useDocLink'
import EventsSelect from './EventsSelect.vue'

const prop = defineProps({
  modelValue: {
    type: Object,
    required: false,
    default: () => ({}),
  },
  submitLoading: {
    type: Boolean,
    default: false,
  },
  isEdit: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue', 'save', 'save-as-copy'])

const { t } = useI18n()
const route = useRoute()
const {
  transFromStrToFromArr,
  transFromDataArrToStr,
  transSQLFormDataToSQL,
  getSQLPart,
  replaceTargetPartInSQL,
} = useRuleUtils()
const tl = (key: string, moduleName = 'RuleEngine') => t(`${moduleName}.${key}`)
const bridgeList = ref([])
const ingressBridgeList: Ref<Array<BridgeItem>> = ref([])
const ruleEventsList: Ref<Array<RuleEvent>> = ref([])
const outputLoading = ref(false)
const briefEditType = ref(false)
const testSQLRef = ref()
const testLoading = ref(false)

const ruleValueDefault = {
  id: '',
  sql: transSQLFormDataToSQL(DEFAULT_SELECT, [DEFAULT_FROM]),
  actions: [],
  description: '',
}

let modelValueCache = ''
const ruleValue: Ref<BasicRule | RuleForm> = ref({
  ...cloneDeep(ruleValueDefault),
  ...cloneDeep(prop.modelValue),
})

const sqlPartValue = ref({
  from: [DEFAULT_FROM],
  select: DEFAULT_SELECT,
  where: '',
})
const sqlPartValueFormError = ref({
  from: '',
  select: '',
})
const fieldLabelMap = {
  from: tl('dataSource'),
  select: tl('select'),
}

const testSQL = ref('')
const payloadForTest = ref('')
const showSQLTemplateDrawer = ref(false)

enum RightTab {
  Events,
  Actions,
}
const rightBlockActiveTab = ref(RightTab.Actions)

const { createRequiredRule } = useFormRules()
const formCom = ref()
const formRules = {
  id: createRequiredRule('ID'),
  sql: createRequiredRule(tl('SQL')),
}

const { docMap } = useDocLink()

watch(
  () => JSON.stringify(ruleValue.value) + JSON.stringify(sqlPartValue.value),
  (val) => {
    syncData()
  },
)

watch(
  () => prop.modelValue,
  (val) => {
    if (JSON.stringify(val) !== modelValueCache) {
      setRuleValue()
    }
  },
)

const setRuleValue = () => {
  ruleValue.value = {
    ...cloneDeep(ruleValueDefault),
    ...cloneDeep(prop.modelValue),
  }
  if (briefEditType.value) {
    syncSQLDataToForm()
  }
}

const replaceSQLFrom = (from: string) => {
  const { fieldStr, whereStr } = getKeywordsFromSQL(ruleValue.value.sql)
  ruleValue.value.sql = transSQLFormDataToSQL(fieldStr, transFromStrToFromArr(from), whereStr)
}

const addBridgeToAction = (bridgeID: string) => {
  if (Array.isArray(ruleValue.value.actions)) {
    ruleValue.value.actions?.push(bridgeID)
  }
}

const handleBridgeDataFromQuery = async () => {
  const bridgeId = route.query.bridgeId?.toString()
  if (!bridgeId) {
    return
  }
  const { id, ingress, egress } = await getBridgeInfo(bridgeId)

  if (ingress || egress) {
    if (ingress) {
      replaceSQLFrom(`$bridges/${id}`)
    }
    if (egress) {
      addBridgeToAction(id)
    }
  } else {
    addBridgeToAction(id)
  }
}

const syncFormDataToSQL = () => {
  const sql = transformSQL()
  testSQL.value = sql
  ruleValue.value.sql = sql
  return sql
}
const syncSQLDataToForm = () => {
  let { sql = '' } = ruleValue.value
  const { fieldStr, fromStr, whereStr } = getKeywordsFromSQL(sql)
  sqlPartValue.value = {
    from: transFromStrToFromArr(fromStr),
    select: fieldStr,
    where: whereStr,
  }
}
const syncData = () => {
  let sql = ruleValue.value.sql
  if (briefEditType.value) {
    sql = syncFormDataToSQL()
  } else {
    syncSQLDataToForm()
    testSQL.value = sql
  }
  const value = { ...ruleValue.value, sql }
  modelValueCache = JSON.stringify(value)
  emit('update:modelValue', value)
}

/**
 * trans form(select, from, where) to SQL
 */
const transformSQL = () => {
  const { select, from, where } = sqlPartValue.value
  return transSQLFormDataToSQL(select, from, where)
}

const loadBridgeList = async () => {
  outputLoading.value = true
  try {
    const res = await getBridgeList()
    bridgeList.value = res
  } catch (error) {
    console.error(error)
  } finally {
    outputLoading.value = false
  }
}

const loadIngressBridgeList = async () => {
  await loadBridgeList()
  ingressBridgeList.value = bridgeList.value.filter((v: BridgeItem) => {
    const isIngress = 'direction' in v && v.direction === MQTTBridgeDirection.In
    // For MQTT
    const withIngressConfig = 'ingress' in v
    return isIngress || withIngressConfig
  })
}

const addEvent = (event: string) => {
  const fromStr = handleSQLFromPartStatement(getSQLPart(ruleValue.value.sql, RuleSQLKeyword.From))
  const fromArr = fromStr.trim() === '' ? [] : transFromStrToFromArr(fromStr)
  fromArr.push(event)
  const newFromStr = transFromDataArrToStr(sortedUniq(fromArr))
  ruleValue.value.sql = replaceTargetPartInSQL(ruleValue.value.sql, RuleSQLKeyword.From, newFromStr)
}

const useSQLTemplate = (SQLTemp: string) => {
  ruleValue.value.sql = SQLTemp
  syncSQLDataToForm()
}

// const testSQLTemplate = ({ sql, input }: { sql: string; input: string }) => {
//   testSQL.value = sql
//   payloadForTest.value = input
// }

const openTemplateDrawer = () => {
  showSQLTemplateDrawer.value = true
}

const saveSQLFromTest = useSQLTemplate

const handleTestLoadng = (val: boolean) => {
  testLoading.value = val
}

// const eventDoNotNeedInIoTForm = '$events/message_publish'
// const eventListForFromSelect = computed(() => {
//   return ruleEventsList.value.filter(({ event }) => event !== eventDoNotNeedInIoTForm)
// })
const loadRuleEvents = async () => {
  try {
    ruleEventsList.value = await getRuleEvents()
  } catch (error) {
    console.error(error)
  }
}

// const toggleTypeForEditSQL = () => {
//   if (briefEditType.value) {
//     syncFormDataToSQL()
//   } else {
//     syncSQLDataToForm()
//   }
//   briefEditType.value = !briefEditType.value
// }

const saveAsCopy = () => {
  emit('save-as-copy')
}

const selfValidate = () => {
  if (!briefEditType.value) {
    return Promise.resolve()
  }
  type Keys = Array<keyof typeof sqlPartValueFormError.value>
  const keys: Keys = Object.keys(sqlPartValueFormError.value) as Keys
  keys.forEach((key) => checkSQLPartValue(key))
  const pass = keys.every((key) => !sqlPartValueFormError.value[key])
  return pass ? Promise.resolve() : Promise.reject()
}

const checkSQLPartValue = (key: keyof typeof sqlPartValueFormError.value) => {
  const target = sqlPartValue.value[key]
  const isValid = !(
    (typeof target === 'string' && !target) ||
    (Array.isArray(target) && !checkIsValidArr(target))
  )
  sqlPartValueFormError.value[key] = isValid
    ? ''
    : t('Rule.inputFieldRequiredError', {
        name: fieldLabelMap[key],
      })
}

const validate = () => {
  return Promise.all([selfValidate(), formCom.value?.validate()])
}

onMounted(async () => {
  loadIngressBridgeList()
  setRuleValue()
  await loadRuleEvents()
  handleBridgeDataFromQuery()
})

defineExpose({ validate })
</script>

<style lang="scss">
@import '~@/style/rule.scss';
</style>

<style lang="scss">
.iot-form {
  .sql-col {
    padding: 24px;
    border-right: 1px solid var(--color-border-normal);
  }
  .action-col {
    padding: 12px 24px;
    height: 640px;
    .el-tabs {
      display: flex;
      flex-direction: column;
      max-height: 100%;
    }
    .el-tabs__content {
      padding: 4px;
      overflow-y: scroll;
    }
    .el-tabs__nav {
      width: 100%;
    }
    .el-tabs__item {
      text-align: center;
      width: 50%;
    }
  }
  .part-header {
    margin-top: 12px;
  }
  .sub-block-desc {
    margin: 12px 0 16px 0;
    line-height: 1.6;
  }
  .monaco-container.sql {
    height: 400px;
  }
  .editor-row {
    border-bottom: 1px solid var(--color-border-normal);
  }
  .oper-row {
    padding: 24px;
    border-top: 1px solid var(--color-border-normal);
  }
  .test-row {
    padding: 24px;
  }
}
</style>
