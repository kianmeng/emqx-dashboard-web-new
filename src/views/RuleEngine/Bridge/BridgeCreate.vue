<template>
  <div :class="[!isFromRule ? 'app-wrapper' : '', 'bridge-create']">
    <detail-header
      v-if="!isFromRule"
      :item="{ name: tl('createBridge'), routeName: backRoute.name }"
    />
    <div v-if="!isFromRule" class="data-bridge-create">
      <el-card class="app-card">
        <el-row>
          <el-col :span="12">
            <guide-bar
              :guide-list="[tl('bridgeType'), tl('configuration')]"
              :active-guide-index-list="activeGuidesIndex"
              :desc-list="guideDescList"
            ></guide-bar>
          </el-col>
        </el-row>
        <el-row class="config-body">
          <template v-if="step === 0">
            <el-radio-group class="bridge-type-select" v-model="chosenBridgeType">
              <el-row :gutter="28">
                <el-col v-for="item in bridgeTypeOptions" :key="item.label" :span="8">
                  <el-radio class="bridge-type-item" :label="item.valueForRadio" border>
                    <img
                      class="bridge-type-item-img"
                      height="64"
                      width="64"
                      :src="getBridgeIcon(item.value)"
                      :alt="item.label"
                    />
                    <div class="bridge-type-item-bd">
                      <div class="title">{{ item.label }}</div>
                      <span class="bridge-type-desc">{{ item.desc }}</span>
                    </div>
                  </el-radio>
                </el-col>
              </el-row>
            </el-radio-group>
          </template>
          <template v-if="step === 1">
            <div v-loading="targetLoading">
              <bridge-http-config
                v-if="chosenBridgeType === BridgeType.Webhook"
                v-model="bridgeData"
                ref="formCom"
                :copy="isCopy"
              />
              <bridge-mqtt-config
                v-else-if="chosenBridgeType === BridgeType.MQTT"
                v-model="bridgeData"
                ref="formCom"
                :copy="isCopy"
              />
            </div>
          </template>
        </el-row>
        <el-row class="config-btn">
          <el-button v-if="step === 0" @click="cancel">
            {{ $t('Base.cancel') }}
          </el-button>
          <el-button @click="goPreStep" v-if="step > 0" :disabled="submitLoading">
            {{ $t('Base.backStep') }}
          </el-button>
          <el-button type="primary" @click="goNextStep" v-if="step < 1" :disabled="submitLoading">
            {{ $t('Base.nextStep') }}
          </el-button>
          <el-button
            v-if="step === 1"
            type="primary"
            plain
            :loading="isTesting"
            @click="testConnection"
          >
            {{ tl('testTheConnection') }}
          </el-button>
          <el-button
            type="primary"
            v-if="step === 1"
            :loading="submitLoading"
            @click="submitCreateBridge"
          >
            {{ $t('Base.create') }}
          </el-button>
        </el-row>
        <div></div>
      </el-card>
    </div>
    <div v-else>
      <el-row :gutter="26">
        <el-col :span="12">
          <label>{{ tl('bridgeType') }}</label>
          <el-select class="bridge-select" v-model="chosenBridgeType" @change="handleTypeSelected">
            <el-option
              v-for="item in bridgeTypeOptions.filter(isBridgeTypeDisabled)"
              :key="item.label"
              :label="item.label"
              :value="item.valueForRadio"
            >
              <div class="option-content">
                <img :src="getBridgeIcon(item.value)" width="30" height="34" />
                <span>{{ item.label }}</span>
              </div>
            </el-option>
          </el-select>
        </el-col>
      </el-row>
      <el-divider />
      <bridge-http-config
        v-if="chosenBridgeType === BridgeType.Webhook"
        v-model="bridgeData"
        ref="formCom"
      />
      <bridge-mqtt-config
        v-else-if="chosenBridgeType === BridgeType.MQTT"
        v-model="bridgeData"
        ref="formCom"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BridgeHttpConfig from './Components/BridgeConfig/BridgeHttpConfig.vue'
import BridgeMqttConfig from './Components/BridgeConfig/BridgeMqttConfig.vue'
import { createBridge, getBridgeInfo, testConnect } from '@/api/ruleengine'
import _ from 'lodash'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  useBridgeTypeOptions,
  BridgeTypeOptions,
  useBridgeTypeIcon,
  useBridgeTypeValue,
} from '@/hooks/Rule/bridge/useBridgeTypeValue'
import { BridgeType, MQTTBridgeDirection } from '@/types/enum'
import useI18nTl from '@/hooks/useI18nTl'
import useBridgeDataHandler from '@/hooks/Rule/bridge/useBridgeDataHandler'
import DetailHeader from '@/components/DetailHeader.vue'
import { countDuplicationName, jumpToErrorFormItem } from '@/common/tools'
import GuideBar from '@/components/GuideBar.vue'
import useGuide from '@/hooks/useGuide'
import { BRIDGE_TYPES_NOT_USE_SCHEMA } from '@/common/constants'

export default defineComponent({
  name: 'BridgeCreate',
  components: { BridgeHttpConfig, BridgeMqttConfig, DetailHeader, GuideBar },
  setup() {
    const { tl } = useI18nTl('RuleEngine')
    const createBridgeData = () => ({})
    const router = useRouter()
    const route = useRoute()
    const { t } = useI18n()
    const { bridgeTypeOptions } = useBridgeTypeOptions()
    const { getBridgeLabelByTypeValue } = useBridgeTypeValue()
    const submitLoading = ref(false)
    const bridgeData: Ref<any> = ref(createBridgeData())
    const isTesting = ref(false)
    const { getBridgeIcon } = useBridgeTypeIcon()

    const formCom = ref()

    const isFromRule = computed(() => ['iot-detail', 'iot-create'].includes(route.name as string))

    const isCopy = computed(() => !!(route.query.action === 'copy' && route.query.target))

    const chosenBridgeType: Ref<BridgeType> = ref(
      isFromRule.value ? ('' as BridgeType) : bridgeTypeOptions[0].value,
    )

    const backRoute = computed(() => {
      let name = 'data-bridge'
      if (isFromRule.value) {
        name = route.params.from.indexOf('detail') > -1 ? 'iot-detail' : 'iot-create'
      }
      return { name }
    })

    const { step, activeGuidesIndex, guideDescList, handleNext, handleBack } = useGuide()

    const { handleBridgeDataBeforeSubmit, handleBridgeDataForCopy } = useBridgeDataHandler()

    const isBridgeTypeDisabled = (bridgeType: BridgeTypeOptions) => {
      if (
        isFromRule.value &&
        bridgeType.externalConfig &&
        'direction' in bridgeType.externalConfig
      ) {
        return bridgeType.externalConfig.direction !== MQTTBridgeDirection.In
      }
      return true
    }

    const handleTypeSelected = () => {
      bridgeData.value = createBridgeData()
    }

    const goPreStep = () => {
      bridgeData.value = createBridgeData()
      guideDescList.value.pop()
      handleBack()
    }

    const goNextStep = () => {
      if (step.value === 0) {
        handleTypeSelected()
        guideDescList.value.push(getBridgeLabelByTypeValue(chosenBridgeType.value) || '')
      }
      handleNext()
    }

    const cancel = () => {
      if (!isFromRule.value) {
        router.push({ name: 'data-bridge' })
      } else {
        router.push({ name: route.params.from as string })
      }
    }

    const targetLoading = ref(false)
    const checkBridgeClipStatus = async () => {
      if (!isCopy.value) {
        return
      }
      try {
        const currentType = route.query.target?.slice(0, route.query.target?.indexOf(':'))
        if (currentType && getBridgeLabelByTypeValue(currentType as BridgeType)) {
          chosenBridgeType.value = currentType as BridgeType
        }
        step.value = 1
        targetLoading.value = true
        const bridgeInfo = await getBridgeInfo(route.query.target as string)
        if (bridgeInfo) {
          bridgeData.value = {
            ...handleBridgeDataForCopy(bridgeInfo),
            name: countDuplicationName(bridgeInfo.name),
          }
          chosenBridgeType.value = bridgeInfo.type
        }
      } catch (error) {
        //
      } finally {
        targetLoading.value = false
      }
    }

    const getDataForSubmit = () => {
      let dataToSubmit = {}
      if (!BRIDGE_TYPES_NOT_USE_SCHEMA.includes(chosenBridgeType.value)) {
        dataToSubmit = _.cloneDeep(formCom.value.getFormRecord())
      } else {
        dataToSubmit = {
          type: chosenBridgeType.value,
          ..._.cloneDeep(bridgeData.value),
        }
      }
      return handleBridgeDataBeforeSubmit(dataToSubmit)
    }

    const testConnection = async () => {
      try {
        await formCom.value.validate()
      } catch (error) {
        jumpToErrorFormItem()
        return
      }

      try {
        isTesting.value = true
        const data = await getDataForSubmit()
        await testConnect(data)
        ElMessage.success(tl('connectionSuccessful'))
      } catch (error) {
        //
      } finally {
        isTesting.value = false
      }
    }

    const submitCreateBridge = async () => {
      try {
        await formCom.value.validate()
      } catch (error) {
        jumpToErrorFormItem()
        return
      }
      submitLoading.value = true
      let res = undefined

      try {
        const data = await getDataForSubmit()
        res = await createBridge(data)

        const bridgeId = res?.id
        if (!isFromRule.value) {
          ElMessageBox.confirm(tl('useBridgeCreateRule'), t('Base.createSuccess'), {
            confirmButtonText: tl('createRule'),
            cancelButtonText: tl('backBridgeList'),
            type: 'success',
          })
            .then(() => {
              router.push({ name: 'iot-create', query: { bridgeId } })
            })
            .catch(() => {
              router.push({ name: 'data-bridge' })
            })
        } else {
          return Promise.resolve(bridgeId)
        }
      } catch (error) {
        console.error(error)
      } finally {
        submitLoading.value = false
      }
    }

    checkBridgeClipStatus()

    return {
      tl,
      isFromRule,
      backRoute,
      step,
      activeGuidesIndex,
      guideDescList,
      goPreStep,
      goNextStep,
      bridgeTypeOptions,
      chosenBridgeType,
      targetLoading,
      submitLoading,
      isCopy,
      bridgeData,
      formCom,
      BridgeType,
      isBridgeTypeDisabled,
      cancel,
      submitCreateBridge,
      isTesting,
      testConnection,
      handleTypeSelected,
      getBridgeIcon,
    }
  },
})
</script>

<style lang="scss" scoped>
.el-col {
  margin-bottom: 16px;
}
.bridge-select {
  margin-top: 12px;
  :deep(.el-input) {
    &::before {
      background-image: url(~@/assets/img/mqtt.png);
      background-size: contain;
    }
  }
}
.option-content {
  display: flex;
  align-items: center;
  img {
    margin-right: 12px;
  }
}
.config-btn {
  margin-top: 24px;
}

.el-radio-group {
  .el-row {
    width: 100%;
  }
}

.el-radio.is-bordered {
  :deep(.el-radio__label) {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0 0 0 52px;
    min-height: 52px;
    .title {
      margin-bottom: 8px;
      font-weight: bold;
      font-size: 14px;
      color: var(--color-title-primary);
    }
    .bridge-type-desc {
      color: var(--color-title-primary);
      font-size: 12px;
      white-space: normal;
    }
    .bridge-type-item-bd {
      padding-left: 16px;
      padding-top: 12px;
      padding-bottom: 12px;
    }
  }
}

.config-body {
  flex-direction: column;
  width: 70%;
}
.bridge-type-select {
  width: 100%;
  margin-bottom: 24px;
}
.bridge-type-item {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 40%;
  margin-top: 16px;
  padding: 0 12px 0 2px;
  border: 2px solid var(--color-border-primary);
}
.bridge-type-item-img {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
}
</style>
