<script setup>
import { ref, onMounted } from 'vue'
import api from '@/utils/http'
import { useRouter } from 'vue-router'

const title = ref('')
const content = ref('')
const postImage = ref(null)
const fileInput = ref(null)
const router = useRouter()
const postStatus = ref('published')
const publishTime = ref('')
const tags = ref([])
const selectedTags = ref([])

onMounted(async () => {
    try {
        const res = await api.get('/tags')
        tags.value = res.data
    } catch (e) {
        console.error('Failed to fetch tags', e)
    }
})

const toggleTag = (tagId) => {
    if (selectedTags.value.includes(tagId)) {
        selectedTags.value = selectedTags.value.filter(id => id !== tagId)
    } 
    else {
        // Optional: Limit to e.g., 3 tags
        if (selectedTags.value.length >= 3) {
            alert('最多选择3个标签')
            return
        }
        selectedTags.value.push(tagId)
    }
}

const triggerFileInput = () => {
    fileInput.value.click()
}

const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
        alert('请上传图片文件')
        return
    }

    if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB')
        return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
        postImage.value = e.target.result
    }
    reader.readAsDataURL(file)
}

const clearImage = () => {
    postImage.value = null
    if (fileInput.value) {
        fileInput.value.value = ''
    }
}

const handleSubmit = async () => {
    // Basic validation
    if (postStatus.value === 'scheduled' && !publishTime.value) {
        alert('请选择定时发布时间')
        return
    }
    try {
        const payload = { 
        title: title.value, 
        content: content.value,
        image: postImage.value,
        status: postStatus.value,
        tags: selectedTags.value
    }
    
    if (postStatus.value === 'scheduled') {
        // Convert local time to ISO string or just send as is (backend expects timestamp friendly)
        // Let's send ISO string
        payload.publishAt = new Date(publishTime.value).toISOString()
    }

    await api.post('/posts', payload)
    
    if (postStatus.value === 'draft') {
        alert('已保存到草稿箱')
    } else if (postStatus.value === 'scheduled') {
        alert('已设置为定时发布')
    } else {
        alert('发布成功')
    }
    router.push('/') // Or maybe to profile? Let's stick to home for now, or profile if draft.
  } catch (e) {
    alert(e.response?.data?.message || '发布失败')
    console.error(e)
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

        <div class="form-group">
            <label>标签</label>
            <div class="tags-container">
                <div 
                    v-for="tag in tags" 
                    :key="tag.id" 
                    class="tag-chip" 
                    :class="{ active: selectedTags.includes(tag.id) }"
                    @click="toggleTag(tag.id)"
                >
                    {{ tag.name }}
                </div>
            </div>
            <div v-if="tags.length === 0" style="font-size: 13px; color: #999;">暂无标签可选</div>
        </div>

        <div class="form-group">
            <label>封面图片</label>
            <div class="image-upload-area">
                <input 
                    type="file" 
                    ref="fileInput" 
                    accept="image/*" 
                    style="display: none" 
                    @change="handleFileChange"
                >
                <div v-if="!postImage" class="upload-placeholder" @click="triggerFileInput">
                    <span class="icon">📷</span>
                    <span>点击上传图片</span>
                </div>
                <div v-else class="image-preview">
                    <img :src="postImage" alt="Preview" />
                    <button type="button" class="remove-image" @click="clearImage">×</button>
                </div>
    
        </div>
        </div>
        
        <!-- Publishing Options -->
        <div class="form-group options-group">
            <label>发布选项</label>
            <div class="radio-group">
                <label class="radio-label">
                    <input type="radio" v-model="postStatus" value="published"> 立即发布
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="postStatus" value="draft"> 存为草稿
                </label>
                <label class="radio-label">
                    <input type="radio" v-model="postStatus" value="scheduled"> 定时发布
                </label>
            </div>
            
            <div v-if="postStatus === 'scheduled'" class="schedule-input animated-fade">
                <label>选择发布时间：</label>
                <input type="datetime-local" v-model="publishTime" class="input-field date-input">
            </div>
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

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.tag-chip {
    padding: 6px 14px;
    background: #f0f2f5;
    border-radius: 20px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
}

.tag-chip:hover {
    background: #e1e4e8;
}

.tag-chip.active {
    background: #fff5f0;
    color: #fa7d3c;
    border-color: #fa7d3c;
    font-weight: 500;
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

/* Image Upload */
.image-upload-area {
    margin-top: 10px;
}

.upload-placeholder {
    border: 2px dashed #ddd;
    border-radius: 8px;
    padding: 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.3s;
    background: #fafafa;
    color: #999;
}

.upload-placeholder:hover {
    border-color: #fa7d3c;
    color: #fa7d3c;
    background: #fff5f0;
}

.upload-placeholder .icon {
    font-size: 24px;
    display: block;
    margin-bottom: 5px;
}

.image-preview {
    position: relative;
    display: inline-block;
    border: 1px solid #eee;
    padding: 5px;
    border-radius: 4px;
    max-width: 100%;
}

.image-preview img {
    max-width: 100%;
    max-height: 300px;
    display: block;
    border-radius: 4px;
}

.remove-image {
    position: absolute;
    top: -10px;
    right: -10px;
    background: #ff4d4f;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.options-group {
    background: #f9f9f9;
    padding: 15px;
    border-radius: 6px;
    border: 1px solid #eee;
}

.radio-group {
    display: flex;
    gap: 20px;
    margin-bottom: 10px;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: 5px;
    cursor: pointer;
    font-size: 14px;
    color: #555;
    padding: 5px 10px;
    border-radius: 4px;
    transition: background 0.2s;
}

.radio-label:hover {
    background: #eef;
}

.radio-label input {
    accent-color: #fa7d3c;
    width: 16px;
    height: 16px;
}

.schedule-input {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed #ddd;
    display: flex;
    align-items: center;
    gap: 10px;
}

.schedule-input label {
    margin: 0;
    font-size: 14px;
}

.date-input {
    width: auto;
    padding: 8px;
}

.animated-fade {
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
