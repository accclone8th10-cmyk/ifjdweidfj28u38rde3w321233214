const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- 1. TÀI NGUYÊN & CẤU HÌNH ---
const mapImg = new Image(); 
mapImg.src = 'map.png'; 

const realms = [
    { name: "Luyện Khí", need: 100, absorb: 1.2, color: "#4facfe", atk: 25 },
    { name: "Trúc Cơ", need: 800, absorb: 3.5, color: "#00ff88", atk: 65 },
    { name: "Kim Đan", need: 4000, absorb: 8.0, color: "#f6d365", atk: 160 }
];

let player = {
    x: 1250, y: 1250, size: 40, speed: 300,
    linhKhi: 0, realm: 0, hp: 100, maxHp: 100,
    mode: "BE_QUAN",
    lastShot: 0, shootDelay: 200 // Hồi chiêu 0.2s
};

let bullets = [];
let mobs = [];
const keys = {};
const WORLD_SIZE = 2500; // Độ rộng bản đồ map.png

// --- 2. HỆ THỐNG ĐIỀU KHIỂN ---
window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if (e.code === "Space") tryBreakthrough(); // Nhấn Space để đột phá
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

function switchMode(mode) {
    player.mode = mode;
    document.getElementById('tab-be-quan').className = (mode === 'BE_QUAN' ? 'active' : '');
    document.getElementById('tab-hanh-tau').className = (mode === 'HANH_TAU' ? 'active' : '');

    if (mode === "BE_QUAN") {
        mobs = []; 
    } else {
        spawnMobs(15); // Sinh quái khi ra thế giới
    }
}

function spawnMobs(count) {
    mobs = [];
    for(let i=0; i<count; i++) {
        mobs.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            hp: 50 + (player.realm * 100),
            maxHp: 50 + (player.realm * 100),
            size: 30
        });
    }
}

// Chiêu thức vệt sáng (Click chuột)
canvas.addEventListener("mousedown", (e) => {
    const now = Date.now();
    if (player.mode === "HANH_TAU" && now - player.lastShot > player.shootDelay) {
        // Tính toán tọa độ chuột dựa trên Camera
        const camX = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD_SIZE - canvas.width));
        const camY = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD_SIZE - canvas.height));
        const targetX = e.clientX + camX;
        const targetY = e.clientY + camY;
        
        const angle = Math.atan2(targetY - player.y, targetX - player.x);
        bullets.push({
            x: player.x, y: player.y,
            vx: Math.cos(angle) * 900, vy: Math.sin(angle) * 900,
            life: 60, // Thời gian tồn tại của vệt sáng
            color: realms[player.realm].color
        });
        player.lastShot = now;
    }
});

// --- 3. LOGIC XỬ LÝ (UPDATE) ---
function updateLogic(dt) {
    const r = realms[player.realm];
    
    // Nạp Linh khí & Hồi HP
    let gain = r.absorb * (player.mode === "BE_QUAN" ? 10 : 1);
    player.linhKhi += gain * dt;
    if (player.mode === "BE_QUAN" && player.hp < player.maxHp) player.hp += 5 * dt;

    // Di chuyển & Chặn biên (Chỉ ở Hành tẩu)
    if (player.mode === "HANH_TAU") {
        let dx = 0, dy = 0;
        if (keys["w"]) dy--; if (keys["s"]) dy++;
        if (keys["a"]) dx--; if (keys["d"]) dx++;
        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy);
            player.x = Math.max(0, Math.min(WORLD_SIZE, player.x + (dx/mag) * player.speed * dt));
            player.y = Math.max(0, Math.min(WORLD_SIZE, player.y + (dy/mag) * player.speed * dt));
        }
    }

    // Xử lý Vệt sáng & Va chạm quái
    bullets.forEach((b, i) => {
        b.x += b.vx * dt; b.y += b.vy * dt; b.life--;
        if (b.life <= 0) bullets.splice(i, 1);

        mobs.forEach((m, mi) => {
            if (Math.hypot(b.x - m.x, b.y - m.y) < m.size) {
                m.hp -= r.atk;
                bullets.splice(i, 1); // Đạn chạm quái thì biến mất
                if (m.hp <= 0) {
                    mobs.splice(mi, 1);
                    player.linhKhi += 20; // Giết quái được thêm linh khí
                    spawnMobs(mobs.length + 1); // Sinh quái mới bù vào
                }
            }
        });
    });

    // Cập nhật giao diện HTML
    document.getElementById("display-realm").innerText = r.name;
    document.getElementById("progress-bar").style.width = Math.min(100, (player.linhKhi / r.need * 100)) + "%";
    document.getElementById("hp-bar").style.width = (player.hp / player.maxHp * 100) + "%";
    document.getElementById("speed-tag").innerText = `Tốc độ: +${gain.toFixed(1)}/s`;
}

function tryBreakthrough() {
    if (player.linhKhi >= realms[player.realm].need) {
        player.linhKhi = 0;
        player.realm = Math.min(player.realm + 1, realms.length - 1);
        player.maxHp += 200;
        player.hp = player.maxHp;
        // Hiệu ứng nháy màn hình khi lên cấp
        canvas.style.filter = "brightness(3)";
        setTimeout(() => canvas.style.filter = "none", 150);
    }
}

// --- 4. HỆ THỐNG VẼ (RENDER) ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (player.mode === "HANH_TAU") {
        ctx.save();
        // Camera thông minh (không nhìn ra ngoài biên map)
        let camX = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD_SIZE - canvas.width));
        let camY = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD_SIZE - canvas.height));
        ctx.translate(-camX, -camY);

        // Vẽ bản đồ
        if (mapImg.complete) ctx.drawImage(mapImg, 0, 0, WORLD_SIZE, WORLD_SIZE);
        else { ctx.fillStyle = "#111"; ctx.fillRect(0,0,WORLD_SIZE,WORLD_SIZE); }

        // Vẽ quái & thanh máu quái
        mobs.forEach(m => {
            ctx.fillStyle = "#ff4757";
            ctx.beginPath(); ctx.arc(m.x, m.y, m.size, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = "white"; ctx.fillRect(m.x - 15, m.y - 40, (m.hp/m.maxHp)*30, 4);
        });

        // Vẽ nhân vật (Hành tẩu)
        ctx.shadowBlur = 15; ctx.shadowColor = realms[player.realm].color;
        ctx.fillStyle = "white"; ctx.fillRect(player.x - 20, player.y - 20, 40, 40);
        ctx.restore();

    } else {
        // --- GIAO DIỆN BẾ QUAN ---
        ctx.fillStyle = "#02040a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Vẽ hiệu ứng trận pháp xoay
        ctx.strokeStyle = realms[player.realm].color; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(canvas.width/2, canvas.height/2, 110 + Math.sin(Date.now()/250)*8, 0, Math.PI*2);
        ctx.stroke();

        // Vẽ nhân vật tĩnh tọa (Giữa màn hình)
        ctx.shadowBlur = 25; ctx.shadowColor = realms[player.realm].color;
        ctx.fillStyle = "white";
        ctx.fillRect(canvas.width/2 - 20, canvas.height/2 - 20, 40, 40);
    }

    // Vẽ vệt sáng (Dùng chung cho cả 2 nếu cần, nhưng chủ yếu ở hành tẩu)
    bullets.forEach(b => {
        ctx.save();
        if(player.mode === "HANH_TAU") {
            let camX = Math.max(0, Math.min(player.x - canvas.width / 2, WORLD_SIZE - canvas.width));
            let camY = Math.max(0, Math.min(player.y - canvas.height / 2, WORLD_SIZE - canvas.height));
            ctx.translate(-camX, -camY);
        }
        ctx.shadowBlur = 10; ctx.shadowColor = b.color;
        ctx.strokeStyle = "white"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - b.vx*0.05, b.y - b.vy*0.05); ctx.stroke();
        ctx.restore();
    });

    updateLogic(1/60);
    requestAnimationFrame(draw);
}

// --- KHỞI CHẠY ---
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
});
canvas.width = window.innerWidth; canvas.height = window.innerHeight;
switchMode("BE_QUAN");
draw();
