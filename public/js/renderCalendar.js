const calendarTitle = document.getElementById('calendar-title');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const dayViewBtn = document.getElementById('day-view-btn');
const weekViewBtn = document.getElementById('week-view-btn');
const monthViewBtn = document.getElementById('month-view-btn');
const calendarView = document.getElementById('calendar-view');

let currentDate = new Date();
let currentView = 'month';

function renderCalendar() {
    if (currentView === 'month') {
        renderMonthView();
    } else if (currentView === 'week') {
        renderWeekView();
    } else if (currentView === 'day') {
        renderDayView();
    }
}

function renderMonthView() {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDay = firstDayOfMonth.getDay();

    calendarTitle.textContent = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    let calendarHTML = '<div class="grid grid-cols-7 gap-2">';
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(day => {
        calendarHTML += `<div class="text-center font-semibold">${day}</div>`;
    });

    let dayCounter = 1;
    for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 7; j++) {
            if (i === 0 && j < startingDay) {
                calendarHTML += '<div></div>';
            } else if (dayCounter <= daysInMonth) {
                const isToday = currentDate.getFullYear() === new Date().getFullYear() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    dayCounter === new Date().getDate();

                const isSelected = currentDate.getFullYear() === new Date().getFullYear() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    dayCounter === new Date().getDate();

                calendarHTML += `<div class="p-2 text-center rounded-md cursor-pointer ${isToday ? 'calendar-today' : ''} ${isSelected ? 'calendar-day-selected' : ''}" data-day="${dayCounter}">${dayCounter}</div>`;
                dayCounter++;
            } else {
                calendarHTML += '<div></div>';
            }
        }
    }

    calendarHTML += '</div>';
    calendarView.innerHTML = calendarHTML;

    //Day selector event listener
    document.querySelectorAll('#calendar-view div[data-day]').forEach(dayDiv=>{
      dayDiv.addEventListener('click', function(){
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(this.dataset.day));
        renderCalendar();
      });
    });
}

function renderWeekView() {
    const dayOfWeek = currentDate.getDay();
    const firstDayOfWeek = new Date(currentDate);
    firstDayOfWeek.setDate(currentDate.getDate() - dayOfWeek);

    calendarTitle.textContent = `${firstDayOfWeek.toLocaleString('default', { month: 'long', day: 'numeric' })} - ${new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate() + 6).toLocaleString('default', { month: 'long', day: 'numeric' })}`;

    let calendarHTML = '<div class="grid grid-cols-7 gap-2">';
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(firstDayOfWeek.getFullYear(), firstDayOfWeek.getMonth(), firstDayOfWeek.getDate() + i);
        const isToday = currentDay.getFullYear() === new Date().getFullYear() &&
            currentDay.getMonth() === new Date().getMonth() &&
            currentDay.getDate() === new Date().getDate();

        const isSelected = currentDay.getFullYear() === currentDate.getFullYear() &&
            currentDay.getMonth() === currentDate.getMonth() &&
            currentDay.getDate() === currentDate.getDate();

        calendarHTML += `<div class="p-2 text-center rounded-md cursor-pointer ${isToday ? 'calendar-today' : ''} ${isSelected ? 'calendar-day-selected' : ''}" data-day="${currentDay.getDate()}">${currentDay.getDate()}</div>`;
    }
    calendarHTML += '</div>';
    calendarView.innerHTML = calendarHTML;
    //Day selector event listener
    document.querySelectorAll('#calendar-view div[data-day]').forEach(dayDiv=>{
      dayDiv.addEventListener('click', function(){
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), parseInt(this.dataset.day));
        renderCalendar();
      });
    });

}

function renderDayView() {
    calendarTitle.textContent = currentDate.toLocaleString('default', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    calendarView.innerHTML = `<div class="p-4 text-center">Day View - ${currentDate.toLocaleString()}</div>`;
}

prevBtn.addEventListener('click', () => {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() - 1);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() - 7);
    } else if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() - 1);
    }
    renderCalendar();
});

nextBtn.addEventListener('click', () => {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + 1);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + 7);
    } else if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + 1);
    }
    renderCalendar();
});

dayViewBtn.addEventListener('click', () => {

    currentView = 'day';
    dayViewBtn.classList.replace('bg-stone-200', 'bg-sky-400');
    dayViewBtn.classList.add('text-white');
    weekViewBtn.classList.replace('bg-sky-400', 'bg-stone-200');
    weekViewBtn.classList.remove('text-white');
    monthViewBtn.classList.replace('bg-sky-400', 'bg-stone-200');
    monthViewBtn.classList.remove('text-white');
    renderCalendar();
});

weekViewBtn.addEventListener('click', () => {
    currentView = 'week';
    weekViewBtn.classList.replace('bg-stone-200', 'bg-sky-400');
    weekViewBtn.classList.add('text-white');
    dayViewBtn.classList.replace('bg-sky-400', 'bg-stone-200');
    dayViewBtn.classList.remove('text-white');
    monthViewBtn.classList.replace('bg-sky-400', 'bg-stone-200');
    monthViewBtn.classList.remove('text-white');
    renderCalendar();
});

monthViewBtn.addEventListener('click', () => {
    currentView = 'month';
    monthViewBtn.classList.replace('bg-stone-200', 'bg-sky-400');
    monthViewBtn.classList.add('text-white');
    dayViewBtn.classList.replace('bg-sky-400', 'bg-stone-200');
    dayViewBtn.classList.remove('text-white');
    weekViewBtn.classList.replace('bg-sky-400', 'bg-stone-200');
    weekViewBtn.classList.remove('text-white');
    renderCalendar();
});

 renderCalendar(); // Initial render





async function addEvent(date, category, content) {
    await db.events.add({ date, category, content });
}

async function getEvents(startDate, endDate) {
    return await db.events
        .where('date')
        .between(startDate, endDate, true, true)
        .toArray();
}

async function syncSupabaseData() {
    if (confirm('Sync data from Supabase? This will overwrite local data.')) {
        try {
            const { data, error } = await supabase
                .from('events') // Replace 'events' with your Supabase table name
                .select('*');

            if (error) {
                console.error('Error fetching Supabase data:', error);
                return;
            }

            if (data && data.length > 0) {
                await db.events.clear(); // Clear existing Dexie data
                for (const event of data) {
                    await addEvent(new Date(event.date), event.category, event.content);
                }
                renderCalendar(); // Re-render calendar with new data
            }
        } catch (error) {
            console.error('Error syncing Supabase data:', error);
        }
    }
}


const supabaseSyncBtn = document.getElementById('supabase-sync-btn');
supabaseSyncBtn.addEventListener('click', syncSupabaseData);

renderCalendar();
