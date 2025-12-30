<script setup>
import AIChatWidget from '@/components/AIChatWidget.vue'
</script>

<template>
  <div class="chat-view-container">
      <AIChatWidget />
  </div>
</template>

<style scoped>
.chat-view-container {
    /* background: #fff; */ 
    /* border-radius: 8px; */
    /* box-shadow: 0 2px 12px rgba(0,0,0,0.08); Typical card shadow */
    /* box-shadow: 0 2px 12px rgba(0,0,0,0.08); Typical card shadow */
    height: calc(100vh - 100px); /* Taller height to fill screen */
    width: 100%; /* Ensure full width */
}
</style>
