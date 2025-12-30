<script setup>
import { ref, computed, onMounted } from 'vue'

const props = defineProps({
  events: {
    type: Set, // Set of strings "YYYY-MM-DD"
    default: () => new Set()
  }
})

const emit = defineEmits(['dateClick'])

const currentDate = ref(new Date())
const currentMonth = ref(new Date().getMonth())
const currentYear = ref(new Date().getFullYear())

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
            hasEvent: props.events.has(dateStr),
            isToday: isToday(i),
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
    emit('dateClick', dayObj.dateStr)
}
</script>

<template>
  <div class="calendar-widget">
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
                'is-today': dayObj.isToday
            }"
            @click="dayObj.type !== 'empty' && handleDateClick(dayObj)"
          >
              <span v-if="dayObj.type !== 'empty'">{{ dayObj.day }}</span>
              <div v-if="dayObj.hasEvent" class="event-dot"></div>
          </div>
      </div>
  </div>
</template>

<style scoped>
.calendar-widget {
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    padding: 15px;
    width: 250px;
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
}

.day-cell {
    cursor: pointer;
}

.day-cell.has-event {
    font-weight: bold;
}

.day-cell.has-event:hover {
    background: #fff5f0;
    color: #fa7d3c;
}

.day-cell.is-today {
    border: 1px solid #fa7d3c;
}

.event-dot {
    position: absolute;
    bottom: 2px;
    width: 4px;
    height: 4px;
    background: #fa7d3c;
    border-radius: 50%;
}

.empty {
    visibility: hidden;
}
</style>
