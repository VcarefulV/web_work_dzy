<script setup>
import { ref, nextTick, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/utils/http'

const authStore = useAuthStore()
const user = computed(() => authStore.user)

const messages = ref([
    { role: 'assistant', content: '你好呀！我是你的情绪搭子。今天过得怎么样？如果不开心，可以跟我说说哦~' }
])
// const emit = defineEmits(['close']) // No longer needed
const inputBox = ref('')
const isLoading = ref(false)
const messagesContainer = ref(null)

const scrollToBottom = async () => {
    await nextTick()
    if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
}

const sendMessage = async () => {
    const content = inputBox.value.trim()
    if (!content || isLoading.value) return

    // User Message
    messages.value.push({ role: 'user', content })
    inputBox.value = ''
    scrollToBottom()

    // Loading State
    isLoading.value = true
    
    try {
        // Send previous context (last 6 messages) to maintain history without overloading token limit
        const history = messages.value.slice(-6).map(m => ({ role: m.role, content: m.content }))
        
        const res = await api.post('/ai/chat', { messages: history })
        const aiMsg = res.data

        messages.value.push(aiMsg)
    } catch (e) {
        messages.value.push({ role: 'assistant', content: '抱歉，我稍微有点累了，请稍后再试...' })
        console.error(e)
    } finally {
        isLoading.value = false
        scrollToBottom()
    }
}
</script>

<template>
  <div class="ai-widget">
      <div class="widget-header">
          <span><i class="iconfont icon-heart"></i> 情绪搭子</span>
          <!-- <span class="close-btn" @click="$emit('close')">×</span> -->
      </div>
      <div class="messages-area" ref="messagesContainer">
          <div 
            v-for="(msg, index) in messages" 
            :key="index" 
            class="message-wrapper"
            :class="msg.role"
          >
              <!-- Avatar -->
              <div class="avatar" v-if="msg.role === 'assistant'">
                <i class="iconfont icon-heart" style="font-size: 20px; color: white;"></i>
              </div>
              
              <div class="bubble">
                  {{ msg.content }}
              </div>

              <div class="avatar" v-if="msg.role === 'user'">
                 <img :src="user?.avatar || 'https://via.placeholder.com/40'" alt="User" v-if="user?.avatar">
                 <span v-else>{{ user?.username?.charAt(0).toUpperCase() }}</span>
              </div>
          </div>

          <div v-if="isLoading" class="message-wrapper assistant">
             <div class="avatar">
                <i class="iconfont icon-heart" style="font-size: 20px; color: white;"></i>
             </div>
              <div class="bubble loading-bubble">
                  <span class="dot"></span><span class="dot"></span><span class="dot"></span>
              </div>
          </div>
      </div>
      <div class="input-area">
          <input 
            v-model="inputBox" 
            type="text" 
            placeholder="说点什么..." 
            @keyup.enter="sendMessage"
            :disabled="isLoading"
          />
          <button @click="sendMessage" :disabled="isLoading || !inputBox.trim()">
              发送
          </button>
      </div>
  </div>
</template>

<style scoped>
.ai-widget {
    background: #fff;
    border-radius: 8px;
    border: 1px solid #eee;
    display: flex;
    flex-direction: column;
    display: flex;
    flex-direction: column;
    height: 100%; /* Fill container */
    overflow: hidden;
    margin-top: 0; /* Remove margin */
    border: none; /* Let container handle border if needed, or keep it */
    box-shadow: none; /* Remove shadow to blend in */
}

.widget-header {
    background: #fff5f0;
    color: #fa7d3c;
    padding: 10px 15px;
    font-size: 14px;
    font-weight: bold;
    font-weight: bold;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #ffe4db;
}

/*
.close-btn {
    cursor: pointer;
    font-size: 18px;
    line-height: 1;
    color: #fa7d3c;
    opacity: 0.7;
}
.close-btn:hover {
    opacity: 1;
}
*/

.messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f4f6f8; /* Softer background */
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Scrollbar styling */
.messages-area::-webkit-scrollbar {
    width: 6px;
}
.messages-area::-webkit-scrollbar-track {
    background: transparent; 
}
.messages-area::-webkit-scrollbar-thumb {
    background: #ddd; 
    border-radius: 3px;
}

.message-wrapper {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    max-width: 80%;
}
.message-wrapper.user {
    align-self: flex-end;
    flex-direction: row; /* Avatar on right */
    justify-content: flex-end;
}
.message-wrapper.assistant {
    align-self: flex-start;
    flex-direction: row;
}

.avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-shrink: 0;
    overflow: hidden;
    font-weight: bold;
    font-size: 16px;
}

.assistant .avatar {
    background: linear-gradient(135deg, #fa7d3c 0%, #ff9a6a 100%);
    box-shadow: 0 2px 6px rgba(250, 125, 60, 0.3);
}

.user .avatar {
    background: #e0e0e0;
    color: #666;
}
.user .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.bubble {
    padding: 12px 16px;
    border-radius: 12px;
    font-size: 15px;
    line-height: 1.6;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    position: relative;
    max-width: 92%;
}

.user .bubble {
    background: #fa7d3c;
    color: #fff;
    border-top-right-radius: 2px; /* Chat bubble effect */
}

.assistant .bubble {
    background: #fff;
    color: #333;
    border-top-left-radius: 2px;
}

.loading-bubble {
    display: flex;
    gap: 4px;
    padding: 15px;
}
.dot {
    width: 8px;
    height: 8px;
    background: #ccc;
    border-radius: 50%;
    animation: bounce 1.4s infinite ease-in-out both;
}
.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
    0%, 80%, 100% { transform: scale(0); }
    40% { transform: scale(1); }
}

.input-area {
    padding: 20px;
    border-top: 1px solid #eee;
    display: flex;
    gap: 12px;
    background: #fff;
    align-items: center;
}

.input-area input {
    flex: 1;
    border: 1px solid #e1e4e8;
    border-radius: 24px;
    padding: 12px 20px;
    font-size: 15px;
    outline: none;
    transition: all 0.2s;
    background: #f9f9f9;
}
.input-area input:focus {
    border-color: #fa7d3c;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(250, 125, 60, 0.1);
}

.input-area button {
    background: linear-gradient(135deg, #fa7d3c 0%, #ff9a6a 100%);
    color: #fff;
    border: none;
    border-radius: 24px;
    padding: 10px 24px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 6px rgba(250, 125, 60, 0.3);
}
.input-area button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(250, 125, 60, 0.4);
}
.input-area button:active {
    transform: translateY(0);
}
.input-area button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    background: #ccc;
}
</style>
