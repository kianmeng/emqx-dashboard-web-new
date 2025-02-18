<template>
  <div>
    <el-container>
      <el-aside :style="{ width: leftBarCollapse ? '80px' : '200px' }">
        <div :class="['logo', leftBarCollapse ? 'logo-colap' : '']">
          <img src="@/assets/img/emqx-logo.png" alt="emqx-logo" />
        </div>
        <left-bar></left-bar>
        <div class="footer-menu" :style="{ width: leftBarCollapse ? '79px' : '199px' }">
          <a
            :class="['footer-menu-item', leftBarCollapse ? 'rotate' : '']"
            @click="
              () => {
                store.dispatch('SET_LEFT_BAR_COLLAPSE', !leftBarCollapse)
              }
            "
          >
            <i class="iconfont icon-fold"></i>
          </a>
        </div>
      </el-aside>
      <el-container class="layout">
        <el-main :style="{ margin: 0, marginLeft: elMainStyle }">
          <el-header :style="{ left: elMainStyle, height: 'auto' }">
            <nav-header></nav-header>
            <el-menu
              v-if="hasSubMenu && showSubMenu"
              :default-active="defaultSubMenu"
              :key="defaultSubMenu"
              mode="horizontal"
              router
              class="top-submenu"
            >
              <template
                v-for="route in topLvRoute.children"
                :key="topLvRoute.path + '/' + route.path"
              >
                <el-menu-item
                  v-if="!route.meta?.hideInMenu"
                  :index="topLvRoute.path + '/' + route.path"
                >
                  {{ $t(`components.${kebab2pascal(route.path)}`) }}
                </el-menu-item>
              </template>
            </el-menu>
          </el-header>

          <div
            class="main-content"
            :style="{
              position: 'relative',
              marginTop: hasSubMenu && showSubMenu ? '120px' : '60px',
            }"
          >
            <router-view v-slot="{ Component, route }">
              <keep-alive>
                <component v-if="keepAlive" :is="Component" :key="route.fullPath" />
              </keep-alive>
            </router-view>
            <router-view v-if="!keepAlive" />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script lang="ts">
import LeftBar from './LeftBar.vue'
import NavHeader from './NavHeader.vue'
import { routes } from '@/router'
import { useStore } from 'vuex'
import { computed, defineComponent } from 'vue'
import { useRoute } from 'vue-router'
import { Expand, Fold } from '@element-plus/icons-vue'
import useChangePwdGuide from '@/hooks/useChangePwdGuide'

export default defineComponent({
  name: 'Layout',
  components: {
    NavHeader,
    LeftBar,
    Expand,
    Fold,
  },
  props: {
    keepAlive: {
      type: Boolean,
      default: false,
    },
  },
  setup() {
    const kebab2pascal = (s: string) => String(s).replace(/-([a-z])/g, (s, m1) => m1.toUpperCase())
    const store = useStore()
    const route = useRoute()
    useChangePwdGuide()

    const edition = computed(() => {
      return store.state.edition
    })
    const leftBarCollapse = computed(() => {
      return store.state.leftBarCollapse
    })
    const elMainStyle = computed(() => {
      return !leftBarCollapse.value ? '200px' : '80px'
    })
    const topLvRoute: any = computed(() => {
      const { path } = route
      const topLvRoute = routes.find((v) => {
        const rootPath = `/${path.split('/')[1]}`
        return v.path !== '/' && rootPath === v.path
      })
      return topLvRoute || {}
    })
    const defaultSubMenu = computed(() => {
      const { path } = route
      const pathItem = path.split('/')
      if (pathItem.length > 2) {
        return `${topLvRoute.value.path}/${pathItem[2]}`
      }
      return path
    })
    const hasSubMenu = computed(() => {
      const { meta } = topLvRoute.value
      return meta && meta.subMenu
    })
    const showSubMenu = computed(() => {
      const { meta, children, path } = topLvRoute.value
      const showSubMenuInFirstLevel = meta.showSubMenuInFirstLevel || false
      if (showSubMenuInFirstLevel) {
        return children.some(
          ({ path: childPath }: { path: any }) => `${path}/${childPath}` === route.path,
        )
      }
      return true
    })
    return {
      store,
      route,
      edition,
      elMainStyle,
      topLvRoute,
      defaultSubMenu,
      hasSubMenu,
      showSubMenu,
      leftBarCollapse,
      kebab2pascal,
    }
  },
})
</script>

<style lang="scss" scoped>
.el-aside {
  transition: all 0.3s;
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 100;
  overflow-x: hidden;
  border-right: 1px solid var(--color-border-menu);
  background-color: var(--color-bg-primary);
  height: 100vh;
  .footer-menu {
    transition: all 0.3s;
    position: fixed;
    bottom: 0;
    height: 48px;
    border-top: 1px solid var(--color-border-menu);
    background-color: var(--color-bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0 24px;
    z-index: 100;
    .footer-menu-item {
      transition: all 0.3s;
      .iconfont {
        color: var(--color-text-secondary);
      }
      &:hover {
        .iconfont {
          color: var(--color-primary);
        }
      }
      &.rotate {
        transform: rotate(180deg);
      }
    }
  }
}

.el-main {
  transition: margin-left 0.3s;
  background-color: var(--color-bg-main);
}

.el-container {
  min-height: 100vh;
}

.logo {
  position: fixed;
  width: 199px;
  background-color: var(--color-bg-primary);
  height: 60px;
  line-height: 60px;
  overflow: hidden;
  top: 0;
  left: 0;
  z-index: 100;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  padding-left: 24px;
  img {
    max-width: initial;
    width: 86px;
    height: 30px;
    transition: all 0.3s;
  }
}

.logo.logo-colap {
  width: 79px;
  padding-left: 27px;
  img {
    width: 200px;
    height: 43px;
  }
}

.el-header {
  padding: 0;
  right: 0;
  position: fixed;
  z-index: 101;
  transition: all 0.3s;
}

.top-submenu {
  transition: none;
  padding: 0 22px;
}
</style>
