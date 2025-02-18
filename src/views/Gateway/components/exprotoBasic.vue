<template>
  <div>
    <el-form label-position="top">
      <div>
        <el-row :gutter="30">
          <el-col :span="12">
            <el-form-item :label="tl('useLog')">
              <el-select v-model="eValue.enable_stats">
                <el-option :value="true" label="true" />
                <el-option :value="false" label="false" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="tl('idleTime')">
              <TimeInputWithUnitSelect
                v-model="eValue.idle_timeout"
                number-placeholder="3"
                :enabled-units="['s']"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- Mount Setting -->
      <div>
        <el-row :gutter="30">
          <el-col :span="12">
            <el-form-item :label="tl('mountPoint')">
              <el-input v-model="eValue.mountpoint" :placeholder="eValueDefault.mountpoint" />
            </el-form-item>
          </el-col>
        </el-row>
      </div>

      <!-- Adapter -->
      <div>
        <div class="part-header">{{ tl('grpcListener') }}</div>
        <el-row :gutter="30">
          <el-col :span="12">
            <el-form-item :label="tl('lAddress')">
              <el-input v-model="eValue.server.bind" :placeholder="eValueDefault.server.bind" />
            </el-form-item>
          </el-col>
        </el-row>
        <div class="tls-config-form">
          <TLSEnableConfig
            v-model="eValue.server.ssl_options"
            :is-edit="isEdit"
            :show-sni="false"
            :verify-label="tl('tlsVerifyClient', 'Base')"
          />
        </div>
      </div>

      <!-- Handler -->
      <div>
        <div class="part-header">{{ tl('grpcConnection') }}</div>
        <el-row :gutter="30">
          <el-col :span="12">
            <el-form-item :label="'Server'">
              <el-input
                v-model="eValue.handler.address"
                :placeholder="eValueDefault.handler.address"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <CommonTLSConfig
          class="tls-config-form"
          v-model="eValue.handler.ssl_options"
          :is-edit="isEdit"
        />
      </div>
    </el-form>
  </div>
</template>

<script>
import { defineComponent, reactive, watch, onMounted } from 'vue'
import _ from 'lodash'
import { transformUnitArrayToStr } from '@/common/utils'
import { useI18n } from 'vue-i18n'
import CommonTLSConfig from '@/components/TLSConfig/CommonTLSConfig.vue'
import TLSEnableConfig from '@/components/TLSConfig/TLSEnableConfig.vue'
import TimeInputWithUnitSelect from '@/components/TimeInputWithUnitSelect.vue'

export default defineComponent({
  name: 'ExprotoBasic',
  components: {
    CommonTLSConfig,
    TLSEnableConfig,
    TimeInputWithUnitSelect,
  },
  props: {
    value: {
      type: Object,
      required: false,
      default: () => ({}),
    },
    isEdit: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, context) {
    let eValueDefault = {
      enable_stats: true,
      idle_timeout: '30s',
      mountpoint: '',
      handler: {
        address: 'http://127.0.0.1:9001',
        ssl_options: {
          certfile: '',
          keyfile: '',
          cacertfile: '',
          enable: false,
        },
      },
      server: {
        bind: '127.0.0.1:9100',
        ssl_options: {
          certfile: '',
          keyfile: '',
          cacertfile: '',
        },
      },
    }
    const { t } = useI18n()

    let eValue = reactive(_.merge(eValueDefault, props.value))

    watch(
      () => _.cloneDeep(eValue),
      (v) => {
        context.emit('update:value', transformUnitArrayToStr(v))
      },
    )
    onMounted(() => {
      context.emit('update:value', transformUnitArrayToStr(eValue))
    })

    return {
      tl: (key, collection = 'Gateway') => t(collection + '.' + key),
      eValueDefault,
      eValue,
    }
  },
})
</script>

<style lang="scss" scoped>
.sole-chkbox {
  margin-bottom: 20px;
  margin-top: 20px;
}

.tls-config-form {
  margin-top: 20px;

  :deep(.TLS-base-config) .TLS-base-config-title {
    color: var(--el-text-color-regular);
    font-size: 16px;
  }
  :deep(.TLS-enable-config) {
    .TLS-input {
      width: 75%;
    }
  }
}
</style>
