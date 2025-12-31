<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  events: {
    type: Set, // Set of strings "YYYY-MM-DD"
    default: () => new Set()
  },
  showTime: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['dateClick', 'confirm'])

const currentDate = ref(new Date())
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

// Time selection state
const selectedDateStr = ref('') // "YYYY-MM-DD"
const selectedHour = ref(new Date().getHours())
const selectedMinute = ref(new Date().getMinutes())

const hours = Array.from({ length: 24 }, (_, i) => i)
const minutes = Array.from({ length: 60 }, (_, i) => i)

const daysOfWeek = ['日', '一', '二', '三', '四', '五', '六']

const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
}

const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
}

const calendarDays = computed(() => {
    const days = []
    const daysInMonth = getDaysInMonth(currentYear.value, currentMonth.value)
    const firstDay = getFirstDayOfMonth(currentYear.value, currentMonth.value)

    // Previous month filler
    for (let i = 0; i < firstDay; i++) {
        days.push({ day: '', type: 'empty' })
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
        days.push({
            day: i,
            dateStr: dateStr,
            hasEvent: props.events ? props.events.has(dateStr) : false,
            isToday: isToday(i),
            isSelected: dateStr === selectedDateStr.value,
            type: 'day'
        })
    }

    return days
})

const isToday = (day) => {
    const today = new Date()
    return day === today.getDate() && 
           currentMonth.value === today.getMonth() && 
           currentYear.value === today.getFullYear()
}

const prevMonth = () => {
    if (currentMonth.value === 0) {
        currentMonth.value = 11
        currentYear.value--
    } else {
        currentMonth.value--
    }
}

const nextMonth = () => {
    if (currentMonth.value === 11) {
        currentMonth.value = 0
        currentYear.value++
    } else {
        currentMonth.value++
    }
}

const handleDateClick = (dayObj) => {
    if (props.showTime) {
        selectedDateStr.value = dayObj.dateStr
    } else {
        emit('dateClick', dayObj.dateStr)
    }
}

const handleConfirm = () => {
    if (!selectedDateStr.value) {
        // Default to today if nothing selected
        const now = new Date()
        selectedDateStr.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    }
    
    // Create ISO string
    const datePart = selectedDateStr.value
    const h = String(selectedHour.value).padStart(2, '0')
    const m = String(selectedMinute.value).padStart(2, '0')
    const isoString = `${datePart}T${h}:${m}:00.000Z` // Simple ISO construction
    
    // Improve native date construction to handle timezone correctly if needed
    // But for simplicity, let's return a constructed Date string local to user
    const finalDate = new Date(`${datePart}T${h}:${m}:00`)
    // emit('confirm', finalDate.toISOString()) 
    // Return localized format or Date object? Let's return Date object to be flexible
    emit('confirm', finalDate)
}
</script>

<template>
  <div class="calendar-widget" :class="{ 'with-time': showTime }">
      <div class="calendar-header">
          <button @click="prevMonth">&lt;</button>
          <span>{{ currentYear }}年 {{ currentMonth + 1 }}月</span>
          <button @click="nextMonth">&gt;</button>
      </div>
      <div class="calendar-grid">
          <div v-for="day in daysOfWeek" :key="day" class="weekday">{{ day }}</div>
          <div 
            v-for="(dayObj, index) in calendarDays" 
            :key="index" 
            class="day-cell"
            :class="{ 
                'empty': dayObj.type === 'empty', 
                'has-event': dayObj.hasEvent,
                'is-today': dayObj.isToday,
                'selected': dayObj.isSelected
            }"
            @click="dayObj.type !== 'empty' && handleDateClick(dayObj)"
          >
              <span v-if="dayObj.type !== 'empty'">{{ dayObj.day }}</span>
              <div v-if="dayObj.hasEvent" class="event-dot"></div>
          </div>
      </div>
      
      <!-- Time Selection Section -->
      <div v-if="showTime" class="time-picker-section">
          <div class="time-selectors">
              <div class="time-col">
                  <label>时</label>
                  <select v-model="selectedHour">
                      <option v-for="h in hours" :key="h" :value="h">{{ String(h).padStart(2, '0') }}</option>
                  </select>
              </div>
              <div class="time-col">
                  <label>分</label>
                  <select v-model="selectedMinute">
                      <option v-for="m in minutes" :key="m" :value="m">{{ String(m).padStart(2, '0') }}</option>
                  </select>
              </div>
          </div>
          <button class="confirm-btn" @click="handleConfirm">确定</button>
      </div>
  </div>
</template>

<style scoped>
.calendar-widget {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 15px;
    width: 280px; /* Slightly wider for time */
    user-select: none;
}

.calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-weight: bold;
    color: #333;
}

.calendar-header button {
    background: none;
    border: none;
    cursor: pointer;
    font-weight: bold;
    padding: 5px;
    color: #666;
}
.calendar-header button:hover {
    color: #fa7d3c;
}

.calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 5px;
    text-align: center;
}

.weekday {
    font-size: 12px;
    color: #999;
    margin-bottom: 5px;
}

.day-cell {
    position: relative;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 13px;
    color: #333;
    cursor: pointer;
}

.day-cell.has-event {
    font-weight: bold;
}

.day-cell:hover {
    background: #f5f5f5;
}

.day-cell.selected {
    background: #fa7d3c !important;
    color: #fff !important;
}

.day-cell.is-today {
    border: 1px solid #fa7d3c;
}

/* Override selected today style */
.day-cell.selected.is-today {
    border: 1px solid white;
}

.event-dot {
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    background: #fa7d3c;
    border-radius: 50%;
}
.day-cell.selected .event-dot {
    background: #fff;
}

.empty {
    visibility: hidden;
}

/* Time Picker Styles */
.time-picker-section {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid #eee;
}

.time-selectors {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-bottom: 15px;
}

.time-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
}

.time-col label {
    font-size: 12px;
    color: #999;
}

.time-col select {
    padding: 5px;
    border: 1px solid #ddd;
    border-radius: 4px;
    width: 60px;
    text-align: center;
    outline: none;
}
.time-col select:focus {
    border-color: #fa7d3c;
}

.confirm-btn {
    width: 100%;
    padding: 8px;
    background: #fa7d3c;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}
.confirm-btn:hover {
    background: #e06d30;
}
</style>
