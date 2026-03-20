async function fetchData() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.stats) {
            animateValue("total-guilds", data.stats.total_guilds);
            animateValue("total-users", data.stats.total_users);
            animateValue("total-vouches", data.stats.total_vouches);
            animateValue("weekly-vouches", data.stats.vouches_7d);
        }
    } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
    }
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    if (!obj) return;
    
    const start = parseInt(obj.innerHTML.replace(/[^\d]/g, '')) || 0;
    if (start === end) return;
    
    const duration = 1500;
    let startTimestamp = null;
    
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        obj.innerHTML = id === 'weekly-vouches' ? `+ ${current}` : current;
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    
    window.requestAnimationFrame(step);
}

// Polling for live data
if (window.location.pathname === '/' || window.location.pathname === '/index') {
    setInterval(fetchData, 30000); // Update every 30s
    fetchData();
}

// Smooth transitions for profile cards
document.querySelectorAll('.side-link').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href.startsWith('#')) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
        }
    });
});
