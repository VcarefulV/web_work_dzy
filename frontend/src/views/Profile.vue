<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import api from '@/utils/http'
import { useAuthStore } from '@/stores/auth'
import { useRoute, useRouter } from 'vue-router'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const myPosts = ref([])
const activeTab = ref('posts') // posts, likes, favorites

// Tabs configuration
const tabs = [
  { key: 'posts', label: '我的文章' },
  { key: 'favorites', label: '我的收藏' },
  { key: 'likes', label: '我的赞' }
]

// Mock data for other tabs since backend doesn't support them yet
const likedPosts = ref([
    { id: 999, title: 'Vue 3 Deep Dive', content: 'Understanding the reactivity system...', createdAt: new Date() },
    { id: 998, title: 'CSS Grid Mastery', content: 'Layout made easy...', createdAt: new Date() }
])
const favoritePosts = ref([])

onMounted(async () => {
  if (route.query.tab) {
      activeTab.value = route.query.tab
  }
  
  if (authStore.user) {
    try {
      // Fetch user posts (using general fetch for now and filtering)
      const response = await api.get('/posts') 
      // Filter client side to ensure it works without backend changes
      myPosts.value = response.data.filter(p => p.author && p.author.username === authStore.user.username)
      
      // Refresh user info to get latest stats
      const userRes = await api.get('/users/me')
      console.log('User stats:', userRes.data)
      if (userRes.data.stats) {
          authStore.user = { ...authStore.user, ...userRes.data, stats: userRes.data.stats }
      }
    } catch (e) {
      console.error(e)
    }
  }
})

watch(() => route.query.tab, (newTab) => {
    if (newTab) activeTab.value = newTab
    else activeTab.value = 'posts'
})

const changeTab = (tabKey) => {
    activeTab.value = tabKey
    router.replace({ query: { ...route.query, tab: tabKey } })
}

const currentList = computed(() => {
    if (activeTab.value === 'posts') return myPosts.value
    if (activeTab.value === 'favorites') return favoritePosts.value
    if (activeTab.value === 'likes') return likedPosts.value
    return []
})

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}
</script>

<template>
  <div class="profile-layout">
    <!-- Header / Cover -->
    <div class="profile-header">
       <div class="user-info-large">
           <div class="avatar-large">{{ authStore.user?.username?.charAt(0).toUpperCase() }}</div>
           <div class="info-text">
               <h1>{{ authStore.user?.username }}</h1>
               <p class="bio">Web Developer | Tech Enthusiast</p>
               <div class="stats-row">
                   <span><strong>{{ authStore.user?.stats?.post_count || myPosts.length }}</strong> 文章</span>
                   <span><strong>{{ authStore.user?.stats?.following_count || 0 }}</strong> 关注</span>
                   <span><strong>{{ authStore.user?.stats?.followers_count || 0 }}</strong> 粉丝</span>
               </div>
           </div>
           <button class="edit-btn">编辑资料</button>
       </div>
    </div>

    <!-- Content Area -->
    <div class="profile-body">
        <!-- Tabs -->
        <div class="profile-tabs">
            <div 
                v-for="tab in tabs" 
                :key="tab.key"
                class="tab-item"
                :class="{ active: activeTab === tab.key }"
                @click="changeTab(tab.key)"
            >
                {{ tab.label }}
            </div>
        </div>

        <!-- List -->
        <div class="content-list">
            <div v-for="post in currentList" :key="post.id" class="list-item">
                <div class="item-main">
                    <h3><RouterLink :to="'/posts/' + post.id">{{ post.title }}</RouterLink></h3>
                    <p class="excerpt">{{ post.content.substring(0, 100) }}...</p>
                    <div class="meta">
                        <span>{{ formatDate(post.createdAt) }}</span>
                        <span v-if="activeTab !== 'posts'">By {{ post.author?.username || 'Unknown' }}</span>
                    </div>
                </div>
            </div>
            <div v-if="currentList.length === 0" class="empty-state">
                <div class="empty-icon">📂</div>
                <p>暂无内容</p>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.profile-layout {
    width: 100%;
}

.profile-header {
    background: #fff;
    padding: 30px;
    border-radius: 8px;
    margin-bottom: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    display: flex;
    align-items: center;
}

.user-info-large {
    display: flex;
    align-items: center;
    gap: 30px;
    width: 100%;
}

.avatar-large {
    width: 100px;
    height: 100px;
    background: #fa7d3c;
    color: #fff;
    border-radius: 50%;
    font-size: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    box-shadow: 0 4px 10px rgba(250, 125, 60, 0.3);
}

.info-text h1 {
    font-size: 24px;
    margin: 0 0 5px 0;
    color: #333;
}

.info-text .bio {
    color: #999;
    margin-bottom: 15px;
    font-size: 14px;
}

.stats-row {
    display: flex;
    gap: 20px;
    color: #555;
    font-size: 14px;
}

.edit-btn {
    margin-left: auto;
    padding: 8px 20px;
    border: 1px solid #fa7d3c;
    color: #fa7d3c;
    background: #fff;
    border-radius: 20px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.3s;
}
.edit-btn:hover {
    background: #fa7d3c;
    color: #fff;
}

.profile-body {
    background: #fff;
    border-radius: 8px;
    min-height: 500px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
}

.profile-tabs {
    display: flex;
    border-bottom: 1px solid #eee;
    margin-bottom: 20px;
}

.tab-item {
    padding: 15px 25px;
    font-size: 16px;
    color: #666;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    transition: all 0.2s;
    font-weight: 500;
}
.tab-item:hover {
    color: #fa7d3c;
}
.tab-item.active {
    color: #fa7d3c;
    border-bottom-color: #fa7d3c;
}

.list-item {
    padding: 20px;
    border-bottom: 1px solid #f5f5f5;
    transition: background 0.2s;
}
.list-item:hover {
    background: #f9f9f9;
}
.list-item h3 {
    margin: 0 0 10px 0;
    font-size: 18px;
}
.list-item h3 a {
    color: #333;
    text-decoration: none;
}
.list-item h3 a:hover {
    color: #fa7d3c;
}
.excerpt {
    color: #888;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 10px;
}
.meta {
    font-size: 12px;
    color: #bbb;
}

.empty-state {
    text-align: center;
    padding: 60px 0;
    color: #ccc;
}
.empty-icon {
    font-size: 48px;
    margin-bottom: 10px;
}
</style>
