<template>
  <el-drawer
    :title="tl(isEdit ? 'editListener' : 'addListener')"
    v-model="showDialog"
    :lock-scroll="false"
    :close-on-click-modal="false"
    size="50%"
    :z-index="1999"
    custom-class="listener-drawer"
  >
    <el-form label-position="top" :rules="listenerFormRules" :model="listenerRecord" ref="formCom">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item :label="tl('name')" prop="name" required>
            <el-input v-model="listenerRecord.name" :disabled="isEdit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="tl('lType')" prop="type" required>
            <el-select v-model="listenerRecord.type" :disabled="isEdit">
              <el-option v-for="item in listenerTypeOptList" :key="item" :value="item" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="tl('lAddress')" prop="bind" required>
            <el-input v-model="listenerRecord.bind" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="tl('mountPoint')">
            <el-input v-model="listenerRecord.mountpoint" />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="!gatewayName">
          <el-form-item label="Zone">
            <ZoneSelect v-model="listenerRecord.zone" />
          </el-form-item>
        </el-col>
        <!-- <el-col :span="12" v-if="!gatewayName">
          <el-form-item :label="$t('BasicConfig.limiter')">
            <LimiterSelect v-model="listenerRecord.limiter" />
          </el-form-item>
        </el-col> -->
      </el-row>
      <el-row v-if="showWSConfig" :gutter="20">
        <el-col :span="12">
          <el-form-item label="MQTT Path">
            <el-input v-model="listenerRecord.websocket.mqtt_path" placeholder="/mqtt" />
          </el-form-item>
        </el-col>
      </el-row>
      <div class="part-header">{{ tl('listenerSetting') }}</div>
      <el-row :gutter="20">
        <el-col :span="12" v-if="!isUDP">
          <el-form-item :label="$t('BasicConfig.acceptors')">
            <el-input v-model.number="listenerRecord.acceptors" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item :label="tl('maxConn')">
            <el-input v-model.number="listenerRecord.max_connections" />
          </el-form-item>
        </el-col>
        <el-col :span="12" v-if="gatewayName">
          <el-form-item :label="tl('maxConnRate')">
            <el-input v-model.number="listenerRecord.max_conn_rate" />
          </el-form-item>
        </el-col>
        <template v-if="showProxyProtocolConfig">
          <el-col :span="12">
            <el-form-item :label="$t('BasicConfig.proxyProtocol')">
              <BooleanSelect v-model="listenerRecord.proxy_protocol" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('BasicConfig.proxyProtocolTimeout')">
              <TimeInputWithUnitSelect
                v-model="listenerRecord.proxy_protocol_timeout"
                number-placeholder="15"
                :enabled-units="['s']"
              />
            </el-form-item>
          </el-col>
        </template>
      </el-row>
      <!-- TCP Config -->
      <div v-if="showTCPConfig">
        <div class="part-header">
          {{ 'TCP ' + tl('configSetting') }}
        </div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="ActiveN">
              <el-input
                v-model.number="listenerRecord.tcp_options.active_n"
                :placeholder="String(defaultListener.tcp_options.active_n)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'Buffer'">
              <InputWithUnit
                v-model="listenerRecord.tcp_options.buffer"
                number-placeholder="4"
                :units="['KB']"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'TCP_NODELAY'">
              <BooleanSelect v-model="listenerRecord.tcp_options.nodelay" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'SO_REUSEADDR'">
              <BooleanSelect v-model="listenerRecord.tcp_options.reuseaddr" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="tl('sendTimeout')">
              <TimeInputWithUnitSelect
                v-model="listenerRecord.tcp_options.send_timeout"
                number-placeholder="15"
                :enabled-units="['s']"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="tl('sendTimeoutClose')">
              <BooleanSelect v-model="listenerRecord.tcp_options.send_timeout_close" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <!-- UDP -->
      <div v-else-if="showUDPConfig">
        <div class="part-header">
          {{ 'UDP ' + tl('configSetting') }}
        </div>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="'ActiveN'">
              <el-input
                v-model="listenerRecord.udp_options.active_n"
                :placeholder="String(defaultListener.udp_options.active_n)"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'Buffer'">
              <InputWithUnit
                v-model="listenerRecord.udp_options.buffer"
                number-placeholder="4"
                :units="['KB']"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="tl('recBuf')">
              <InputWithUnit
                v-model="listenerRecord.udp_options.recbuf"
                number-placeholder="2"
                :units="['KB']"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="tl('sendBuf')">
              <InputWithUnit
                v-model="listenerRecord.udp_options.sndbuf"
                number-placeholder="2"
                :units="['KB']"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'SO_REUSEADDR'">
              <BooleanSelect v-model="listenerRecord.udp_options.reuseaddr" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
      <!-- (like)SSL Config -->
      <div v-if="showSSLConfig">
        <div class="part-header">{{ `${isDTLS ? 'DTLS' : 'SSL'} ${tl('configSetting')}` }}</div>
        <el-row :gutter="20">
          <el-col :span="24">
            <!-- v-if is for refresh -->
            <TLSEnableConfig
              v-if="showDialog && !isLoading"
              class="TLS-config"
              v-model="listenerRecord[SSLConfigKey]"
              :show-sni="false"
              :is-edit="isEdit"
              :base-path="SSLConfigKey"
            />
          </el-col>
          <!-- Version of SSL/DTLS -->
          <el-col :span="12" v-if="isDTLS">
            <el-form-item :label="tl('dtlsversion')">
              <DTLSVersionSelect v-model="listenerRecord.dtls_options.versions" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-else>
            <el-form-item :label="tl('sslversion')">
              <SSLVersionSelect v-model="listenerRecord.ssl_options.versions" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item :label="'Verify'">
              <el-select v-model="listenerRecord[SSLConfigKey].verify">
                <el-option value="verify_none" />
                <el-option value="verify_peer" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'Fail If No Peer Cert'">
              <BooleanSelect v-model="listenerRecord[SSLConfigKey].fail_if_no_peer_cert" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'Intermediate Certificate Depth'">
              <el-input v-model.number="listenerRecord[SSLConfigKey].depth" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="'Key Password'">
              <el-input
                v-model="listenerRecord[SSLConfigKey].password"
                type="password"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="showDialog = false">
        {{ $t('Base.cancel') }}
      </el-button>
      <el-button v-if="isEdit" type="danger" plain @click="onDelete">
        {{ $t('Base.delete') }}
      </el-button>
      <el-button type="primary" @click="submit" :loading="isSubmitting">
        {{ isEdit ? $t('Base.update') : $t('Base.add') }}
      </el-button>
    </template>
  </el-drawer>
</template>

<script lang="ts" setup>
import { defineProps, defineEmits, PropType, computed } from 'vue'
import useI18nTl from '@/hooks/useI18nTl'
import { Listener } from '@/types/listener'
import { GatewayName, ListenerType, ListenerTypeForGateway } from '@/types/enum'
import useListenerDialog from '@/hooks/Config/useListenerDialog'
import BooleanSelect from '@/components/BooleanSelect.vue'
import SSLVersionSelect from './SSLVersionSelect.vue'
import DTLSVersionSelect from './DTLSVersionSelect.vue'
import InputWithUnit from '@/components/InputWithUnit.vue'
import TimeInputWithUnitSelect from '@/components/TimeInputWithUnitSelect.vue'
import ZoneSelect from '../ZoneSelect.vue'
// import LimiterSelect from '../LimiterSelect.vue'
import TLSEnableConfig from '@/components/TLSConfig/TLSEnableConfig.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  listener: {
    type: Object as PropType<Listener>,
  },
  gatewayName: {
    type: String as PropType<GatewayName>,
  },
  /**
   * when the dialog use in create gateway, the listener data handle by gateway
   */
  doNotSubmitToBackend: {
    type: Boolean,
    default: false,
  },
})
const emit = defineEmits(['update:modelValue', 'submit', 'submitted', 'delete'])

const { tl } = useI18nTl('Gateway')

const {
  showDialog,
  isEdit,
  isLoading,
  listenerRecord,
  formCom,
  listenerTypeOptList,
  defaultListener,
  isSubmitting,
  showProxyProtocolConfig,
  showTCPConfig,
  showUDPConfig,
  showSSLConfig,
  isDTLS,
  SSLConfigKey,
  showWSConfig,
  listenerFormRules,
  submit,
  onDelete,
} = useListenerDialog(props, emit)

const isUDP = computed(
  () =>
    listenerRecord.value.type === ListenerType.QUIC ||
    listenerRecord.value.type === ListenerTypeForGateway.UDP,
)
</script>

<style lang="scss">
.listener-drawer {
  .TLS-config {
    .TLS-input {
      width: 100%;
    }
  }
}
</style>
