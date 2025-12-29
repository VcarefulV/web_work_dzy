<script setup>
import { ref } from 'vue'
import api from '@/utils/http'
import { useRouter } from 'vue-router'

const title = ref('')
const content = ref('')
const router = useRouter()

const handleSubmit = async () => {
  try {
    await api.post('/posts', { title: title.value, content: content.value })
    router.push('/')
  } catch (e) {
    alert('发布失败')
  }
}
</script>

<template>
  <div class="create-wrapper">
    <div class="create-card">
      <div class="card-header">
        <h1>发布新文章</h1>
        <p>分享你的知识与见解</p>
      </div>
      <form @submit.prevent="handleSubmit" class="create-form">
        <div class="form-group">
          <label>标题</label>
          <input 
            v-model="title" 
            type="text" 
            placeholder="请输入文章标题" 
            required 
            class="input-field"
          />
        </div>
        <div class="form-group">
          <label>内容</label>
          <textarea 
            v-model="content" 
            rows="12" 
            placeholder="在此输入文章内容..." 
            required
            class="textarea-field"
          ></textarea>
        </div>
        <div class="form-actions">
          <button type="button" @click="$router.back()" class="btn-cancel">取消</button>
          <button type="submit" class="btn-submit">发布文章</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.create-wrapper {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.create-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.05);
  width: 100%;
  max-width: 800px;
  padding: 40px;
  border: 1px solid #eee;
}

.card-header h1 {
  font-size: 24px;
  color: #333;
  margin-bottom: 5px;
}
.card-header p {
  color: #999;
  font-size: 14px;
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 10px;
  color: #444;
}

.input-field, .textarea-field {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 15px;
  color: #333;
  background: #fafafa;
  transition: all 0.3s;
  box-sizing: border-box;
  font-family: inherit;
}

.input-field:focus, .textarea-field:focus {
  background: #fff;
  border-color: #fa7d3c;
  outline: none;
  box-shadow: 0 0 0 3px rgba(250, 125, 60, 0.1);
}

.textarea-field {
  resize: vertical;
  line-height: 1.6;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 10px;
}

.btn-cancel {
  padding: 10px 25px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.2s;
}
.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-submit {
  padding: 10px 30px;
  background: linear-gradient(135deg, #fa7d3c 0%, #ff5c00 100%);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  font-size: 15px;
  box-shadow: 0 4px 10px rgba(250, 125, 60, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-submit:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 15px rgba(250, 125, 60, 0.4);
}
</style>
