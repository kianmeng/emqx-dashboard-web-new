<template>
  <div class="help app-wrapper">
    <el-row :gutter="28">
      <el-col :span="6" v-for="{ link, icon, title } in platformList" :key="link">
        <el-card class="card-link" shadow="never">
          <a :href="link" target="_blank">
            <img :src="icon" />
            <p class="text-title">{{ title }}</p>
          </a>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="28" class="row-middle">
      <el-col :span="12" class="flex-column">
        <el-card shadow="never" class="card-doc">
          <template v-for="({ link, title }, $index) in level1DocumentList" :key="link">
            <div class="text-large">
              <a :href="link" target="_blank" class="vertical-align-center space-between">
                <span>{{ title }}</span>
                <el-icon :size="20"><Right /></el-icon>
              </a>
            </div>
            <el-divider v-if="$index !== level1DocumentList.length - 1" />
          </template>
        </el-card>
        <DocListCard :doc-list="level2DocumentList" v-if="!IS_ENTERPRISE" />
      </el-col>
      <el-col :span="12" class="flex-column">
        <template v-if="!IS_ENTERPRISE">
          <el-card
            shadow="never"
            class="card-product top-border enterprise"
            :span="24"
            v-for="item in productList"
            :key="item.title"
          >
            <img class="img-product" :src="item.icon" />
            <div class="card-product-bd">
              <p class="card-product-name text-title">{{ item.title }}</p>
              <p class="card-product-desc tip">{{ item.desc }}</p>
              <a :href="item.link" target="_blank" class="link-product">
                <span>{{ item.linkText }}</span>
                <el-icon><Right /></el-icon>
              </a>
            </div>
          </el-card>
        </template>
        <DocListCard :doc-list="level2DocumentList" v-else />
      </el-col>
    </el-row>
    <el-row :gutter="28">
      <el-col :span="24">
        <el-card class="card-follow" shadow="never">
          <p class="label-follow text-title">Follow us</p>
          <ul class="list-icon">
            <li class="item-icon" v-for="{ link, icon } in followUsList" :key="link">
              <a :href="link" target="_blank">
                <i class="iconfont" :class="icon"></i>
              </a>
            </li>
          </ul>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import useI18nTl from '@/hooks/useI18nTl'
import { Right } from '@element-plus/icons-vue'
import useDocLink from '@/hooks/useDocLink'
import { IS_ENTERPRISE } from '@/common/constants'
import DocListCard from './components/DocListCard.vue'

const { t, tl } = useI18nTl('Base')
const { docMap } = useDocLink()

const platformList = [
  {
    link: docMap.documentation,
    icon: require('@/assets/img/help-doc.png'),
    title: tl('documentation'),
  },
  {
    link: docMap.forum,
    icon: require('@/assets/img/help-forum.png'),
    title: tl('forum'),
  },
  {
    link: docMap.gitHub,
    icon: require('@/assets/img/help-github.png'),
    title: tl('gitHub'),
  },
  {
    link: docMap.blog,
    icon: require('@/assets/img/help-blog.png'),
    title: tl('blog'),
  },
]

const level1DocumentList = [
  { link: docMap.emqxGettingStarted, title: t('Settings.gettingStarted') },
  { link: docMap.dashboard, title: t('Settings.dashboardIntro') },
  { link: docMap.accessControl, title: t('Settings.howAccessControl') },
  { link: docMap.dataIntegration, title: t('Settings.howDataIntegration') },
]

const level2DocumentList = [
  { link: docMap.mqttStudy, title: t('Settings.mqttStudy') },
  { link: docMap.mqttV5, title: t('Settings.mqttV5Intro') },
  { link: docMap.mqttClient, title: t('Settings.findMQTTClient') },
]

const productList = [
  {
    title: `EMQX Enterprise`,
    desc: tl('eeDesc'),
    linkText: t('Settings.tryEnterprise'),
    link: docMap.emqxEnterprise,
    icon: require('@/assets/img/emqx-enterprise.png'),
  },
  {
    title: `EMQX Cloud`,
    desc: tl('cloudDesc'),
    linkText: t('Settings.tryCloud'),
    link: docMap.cloudHome,
    icon: require('@/assets/img/cloud.png'),
  },
]

const followUsList = [
  { link: docMap.githubHome, icon: 'icon-github' },
  { link: docMap.twitterHome, icon: 'icon-twitter' },
  { link: docMap.youtubeHome, icon: 'icon-youtube' },
  { link: docMap.linkedInHome, icon: 'icon-linkedin' },
]
</script>

<style lang="scss">
.help {
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  p {
    margin: 0;
  }
  a:not(.link-product) {
    color: unset;
    transition: none;
    &:hover,
    &:hover .iconfont {
      color: var(--color-primary);
    }
  }
  .text-title {
    font-size: 16px;
    font-weight: bold;
  }
  .el-row:not(:last-child),
  .el-col-12 .el-card:not(:last-child) {
    margin-bottom: 24px;
  }

  .flex-column {
    display: flex;
    flex-direction: column;
  }
  .card-second-doc {
    flex-grow: 1;
  }
  .card-link {
    .el-card__body {
      display: flex;
      justify-content: center;
    }
    a {
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: 16px;
      font-weight: bold;
    }
    img {
      height: 40px;
      margin-right: 24px;
    }
  }
  .card-doc {
    &:not(:last-child) {
      margin-bottom: 24px;
    }
  }
  .text-large {
    position: relative;
    display: flex;
    padding-left: 10px + 2px;
    line-height: 22px;
    color: var(--color-text-primary);
    @extend .text-title;
    span {
      margin-right: 8px;
    }
    a {
      width: 100%;
    }
    .el-icon {
      font-weight: bold;
    }
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 2px;
      height: 16px;
      background: linear-gradient(135deg, #0ad18e 0%, #03a4a5 100%);
    }
  }
  p.text-large {
    margin-bottom: 16px;
  }
  .el-divider--horizontal {
    margin: 20px;
  }
  .item-link {
    display: flex;
    line-height: 32px;
    color: var(--color-text-secondary);

    span {
      margin-right: 8px;
    }
  }
  .card-product {
    flex-grow: 1;
    .el-card__body {
      display: flex;
      align-items: center;
      padding: 28px;
    }
    &.enterprise {
      &:before {
        background: linear-gradient(317deg, #866dff 0%, #4d6bff 100%);
      }
    }
    &.cloud {
      &:before {
        background: linear-gradient(135deg, #00b173 0%, #23c0aa 100%);
      }
    }
  }
  .img-product {
    height: 64px;
    margin-right: 20px;
  }
  .card-product-name {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    line-height: 1.6;
    margin-bottom: 8px;
  }
  .card-product-desc {
    line-height: 1.8;
    margin-bottom: 12px;
  }
  .link-product {
    display: flex;
    align-items: center;
    span {
      margin-right: 8px;
    }
  }
  .card-follow {
    .el-card__body {
      display: flex;
      justify-content: flex-start;
      align-items: center;
    }
    .label-follow {
      margin-right: 92px;
    }
  }
  .list-icon {
    display: flex;
  }
  .item-icon {
    margin-right: 48px;
    font-size: 20px;
    .iconfont {
      color: var(--color-text-secondary);
    }
  }
}
</style>
