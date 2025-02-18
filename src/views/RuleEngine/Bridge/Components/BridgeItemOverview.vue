<template>
  <div class="resource-item-overview">
    <div class="overview-header">
      <p class="block-title">{{ tl('statistics') }}</p>
      <div>
        <el-button type="primary" @click="handleRefresh">
          {{ $t('Base.refresh') }}
        </el-button>
        <el-button type="primary" plain @click="resetStatistics">
          {{ tl('resetStatistics') }}
        </el-button>
      </div>
    </div>
    <div class="overview-sub-block">
      <!-- <p class="card-sub-desc">{{ tl('lastResetTime') }}: TODO:</p> -->
      <TargetDetailMetrics class="rule-statistic" :metrics="statisticsData" />
    </div>
    <div class="overview-sub-block">
      <div class="overview-header">
        <p class="vertical-align-center">
          {{ tl('nodeStatus') }}
          <InfoTooltip :content="tl('nodeStatusBridgeDesc')" />
        </p>
      </div>
      <el-table :data="nodeStatusTableData">
        <el-table-column prop="node" :label="tl('name')" />

        <el-table-column prop="metrics.matched" :label="tl('matched')" />
        <el-table-column v-if="showReceived" prop="metrics.received" :label="tl('received')" />
        <el-table-column prop="metrics.dropped" :label="tl('dropped')" />

        <el-table-column prop="metrics.rate">
          <template #header>
            <p>{{ t('Base.rate') }}</p>
            <p>({{ t('RuleEngine.rateUnit', 0) }})</p>
          </template>
        </el-table-column>
        <el-table-column prop="metrics.rate_last5m">
          <template #header>
            <p>{{ tl('rateLast5M') }}</p>
            <p>({{ t('RuleEngine.rateUnit', 0) }})</p>
          </template>
        </el-table-column>
        <el-table-column prop="metrics.rate_max" :label="tl('rateMax')">
          <template #header>
            <p>{{ tl('rateMax') }}</p>
            <p>({{ t('RuleEngine.rateUnit', 0) }})</p>
          </template>
        </el-table-column>

        <el-table-column :label="tl('status')" :width="230">
          <template #default="{ row }">
            <span class="text-status" :class="getStatusClass(row.status)">
              {{ getLabelByStatusValue(row.status) }}
            </span>
            <el-button
              size="small"
              type="primary"
              v-if="row.status === ConnectionStatus.Disconnected"
              @click="reconnect(row)"
              :loading="nodeConnectingStatusMap[row.node]"
            >
              {{ tl('reconnect') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'BridgeItemOverview',
})
</script>

<script setup lang="ts">
import { defineProps, PropType, defineEmits, computed, ComputedRef, ref, Ref, watch } from 'vue'
import { BridgeType, ConnectionStatus } from '@/types/enum'
import { BridgeMetricsData, NodeMetrics, NodeStatus, BridgeItem } from '@/types/rule'
import useCommonConnectionStatus from '@/hooks/useCommonConnectionStatus'
import { queryBridgeMetrics, reconnectBridgeForNode, resetBridgeMetrics } from '@/api/ruleengine'
import { ElMessage, ElMessageBox } from 'element-plus'
import useI18nTl from '@/hooks/useI18nTl'
import TargetDetailMetrics from '@/components/TargetDetailMetrics.vue'
import InfoTooltip from '@/components/InfoTooltip.vue'

const props = defineProps({
  /**
   * get node status
   */
  bridgeMsg: {
    type: Object as PropType<BridgeItem>,
    required: true,
  },
  bridgeId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['reset', 'reconnect', 'refresh'])
const bridgeMetrics: Ref<BridgeMetricsData> = ref({ metrics: {}, node_metrics: [] })
const { getStatusLabel: getLabelByStatusValue, getStatusClass } = useCommonConnectionStatus()

const nodeConnectingStatusMap: Ref<Record<string, boolean>> = ref({})

const showReceived = computed(() => {
  const isMQTT = props.bridgeMsg.type === BridgeType.MQTT
  const withIngress = 'ingress' in props.bridgeMsg && props.bridgeMsg.ingress?.remote?.topic
  return isMQTT && withIngress
})

const nodeStatus: ComputedRef<Array<NodeStatus>> = computed(() => {
  const nodeStatusData = props.bridgeMsg?.node_status
  return Array.isArray(nodeStatusData) ? nodeStatusData : []
})

const nodeMetrics: ComputedRef<Array<NodeMetrics>> = computed(() => {
  const nodeMetricsData = bridgeMetrics.value.node_metrics
  return Array.isArray(nodeMetricsData) ? nodeMetricsData : []
})

const nodeStatusTableData: ComputedRef<Array<NodeMetrics & NodeStatus>> = computed(() => {
  return nodeMetrics.value.map(({ node, metrics }) => {
    const status =
      nodeStatus.value.find((item) => item.node === node)?.status || ConnectionStatus.Disconnected
    return {
      node,
      metrics,
      status,
    }
  })
})

const { tl, t } = useI18nTl('RuleEngine')

const statisticsData = computed(() => {
  const ret = [
    {
      label: tl('matched'),
      desc: tl('bridgeMatchedDesc'),
      value: bridgeMetrics.value.metrics.matched,
      className: 'matched-bg',
    },
    {
      label: tl('sentSuccessfully'),
      desc: tl('sentSuccessfullyDesc'),
      value: bridgeMetrics.value.metrics.success,
      className: 'last-five-rate-bg',
    },
    {
      label: tl('sentFailed'),
      desc: tl('sentFailedDesc'),
      value: bridgeMetrics.value.metrics.failed,
      className: 'failed-bg',
    },
    {
      label: tl('sentInflight'),
      desc: tl('sentInflightDesc'),
      value: bridgeMetrics.value.metrics.inflight,
      className: 'no-result-bg',
    },
    {
      label: tl('lateReply'),
      desc: tl('lateReplyDesc'),
      value: bridgeMetrics.value.metrics.late_reply,
      className: 'no-result-bg',
    },

    {
      label: tl('dropped'),
      desc: tl('droppedDesc'),
      value: bridgeMetrics.value.metrics.dropped,
      className: 'failed-bg',
    },
    {
      label: tl('queuing'),
      desc: tl('queuingDesc'),
      value: bridgeMetrics.value.metrics.queuing,
      className: 'max-rate-bg',
    },
    {
      label: tl('retried'),
      desc: tl('retriedDesc'),
      value: bridgeMetrics.value.metrics.retried,
      className: 'success-bg',
    },
    {
      label: tl('rateNow'),
      value: bridgeMetrics.value.metrics.rate,
      unit: t('RuleEngine.rateUnit', bridgeMetrics.value.metrics.rate),
      className: 'rate-bg',
    },
  ]
  if (showReceived.value) {
    ret.splice(4, 0, {
      label: tl('received'),
      desc: tl('receivedDesc'),
      value: bridgeMetrics.value.metrics.received,
      className: 'max-rate-bg',
    })
  }
  return ret
})

const getBridgeMetrics = async () => {
  try {
    if (!props.bridgeId) {
      return
    }
    bridgeMetrics.value = await queryBridgeMetrics(props.bridgeId)
  } catch (error) {
    //
  }
}

const handleRefresh = () => {
  getBridgeMetrics()
  emit('refresh')
}

const resetStatistics = async () => {
  if (!props.bridgeId) {
    return
  }
  await ElMessageBox.confirm(t('RuleEngine.resetMetricsConfirm', { target: tl('rule') }))
  await resetBridgeMetrics(props.bridgeId)
  ElMessage.success(tl('resetSuccessfully'))
  getBridgeMetrics()
  emit('reset')
}

const setNodeConnectingStatusMap = () => {
  nodeConnectingStatusMap.value = props.bridgeMsg.node_status?.reduce(
    (
      obj: Record<string, ConnectionStatus>,
      nodeStatusItem: {
        node: string
        status: ConnectionStatus
      },
    ) => {
      return {
        ...obj,
        [nodeStatusItem.node]: false,
      }
    },
    {},
  )
}

const reconnect = async ({ node }: NodeMetrics) => {
  try {
    nodeConnectingStatusMap.value[node] = true
    await reconnectBridgeForNode(node, props.bridgeMsg.id)
    emit('reconnect')
  } catch (error) {
    //
  } finally {
    nodeConnectingStatusMap.value[node] = false
  }
}

watch(() => props.bridgeMsg, setNodeConnectingStatusMap)

getBridgeMetrics()
</script>
