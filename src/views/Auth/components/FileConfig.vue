<template>
  <div class="file-config config">
    <div class="create-form-title">ACL File</div>
    <el-form
      class="create-form"
      ref="formCom"
      :rules="rules"
      :model="fileConfig"
      label-position="top"
    >
      <el-row :gutter="20">
        <el-col :span="24">
          <el-form-item prop="rules" required>
            <div class="viewer-container" ref="monacoContainer">
              <monaco id="acl-file-editor" v-model="fileConfig.rules" lang="plaintext"></monaco>
            </div>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch, ref } from 'vue'
import Monaco from '@/components/Monaco.vue'
import useFormRules from '@/hooks/useFormRules'
import { isEqual } from 'lodash'

export default defineComponent({
  name: 'FileConfig',
  components: {
    Monaco,
  },
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
  },
  setup(props, ctx) {
    const fileConfig = ref(props.modelValue)
    const { createRequiredRule } = useFormRules()

    const formCom = ref()
    const rules = {
      rules: createRequiredRule('ACL File'),
    }

    const validate = () => {
      return formCom.value.validate()
    }

    watch(fileConfig.value, (value) => {
      ctx.emit('update:modelValue', value)
    })

    watch(
      () => props.modelValue,
      (val) => {
        if (!isEqual(val, fileConfig.value)) {
          fileConfig.value = val
        }
      },
    )

    return {
      fileConfig,
      formCom,
      rules,
      validate,
    }
  },
})
</script>

<style lang="scss">
@import '../style/authConfig.scss';
.file-config {
  .viewer-container {
    height: 480px;
  }
}
</style>
