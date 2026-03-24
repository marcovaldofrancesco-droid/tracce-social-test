const S_URL = 'https://gdsrmowtzcahbtagxoft.supabase.co';
const S_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdkc3Jtb3d0emNhaGJ0YWd4b2Z0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTgzNDEsImV4cCI6MjA4OTQ5NDM0MX0.Ep-DcUjW1FnZduH-QIWUxyI0juRSLJS_K2TDM56DkCk';
const sb = supabase.createClient(S_URL, S_KEY);

const idTag = new URLSearchParams(window.location.search).get('id');
let profile = JSON.parse(localStorage.getItem('tracce_v4')) || { name: "Esploratore" };
let mediaRecorder, chunks = [], audioBase64 = null;

// Sblocco audio per iOS
const unlockAudio = () => {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    if (context.state === 'suspended') context.resume();
    window.removeEventListener('click', unlockAudio);
};
window.addEventListener('click', unlockAudio);

if(idTag) { loadFeed(); goTo(1); }
document.getElementById('u-name').innerText = "Ciao, " + profile.name;

async function loadFeed() {
    const { data } = await sb.from('spots').select('*').eq('id_tag', idTag).order('created_at', {ascending: false});
    const feed = document.getElementById('gallery-feed');
    if(data) {
        feed.innerHTML = data.map(t => `
            <div class="spot-card">
                <img src="${t.foto_url}" class="spot-img">
                <div class="info">
                    <p>${t.nome_posto}</p>
                    <h3>@${idTag}</h3>
                    ${t.audio_url ? `<button class="btn-audio" onclick="playAudio('${t.audio_url}', this)">🔊 ASCOLTA</button>` : ''}
                </div>
            </div>
        `).join('');
    }
}

function playAudio(url, btn) {
    const audio = new Audio(url);
    btn.innerText = "🎵 IN RIPRODUZIONE...";
    audio.play().catch(e => alert("Tocca lo schermo per attivare l'audio"));
    audio.onended = () => btn.innerText = "🔊 ASCOLTA";
}

async function toggleRec() {
    const btn = document.getElementById('rec-btn');
    const status = document.getElementById('rec-status');
    const ring = document.getElementById('chrono-ring');

    if(!mediaRecorder || mediaRecorder.state === 'inactive') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        chunks = [];
        
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/mp4' }); // Formato universale
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
                audioBase64 = reader.result;
                btn.style.background = "#4cd964"; // Diventa verde se ha registrato
                btn.innerText = "✅";
                status.style.display = 'none';
                ring.style.display = 'none';
            };
        };

        mediaRecorder.start();
        btn.innerText = "⏹️";
        status.style.display = 'block';
        ring.style.display = 'block';
    } else {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
    }
}

async function capture() {
    document.getElementById('loader').style.display = 'flex';
    const v = document.getElementById('video');
    const c = document.getElementById('canvas');
    c.width = 720; c.height = (v.videoHeight / v.videoWidth) * 720;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    const foto = c.toDataURL('image/jpeg', 0.6);

    await sb.from('spots').insert([{ 
        id_tag: idTag, 
        nome_posto: profile.name, 
        foto_url: foto, 
        audio_url: audioBase64 
    }]);
    location.reload();
}

function openCam() { 
    document.getElementById('cam-modal').style.display = 'block'; 
    navigator.mediaDevices.getUserMedia({video: {facingMode:'environment'}}).then(s => document.getElementById('video').srcObject = s);
}
function closeCam() { document.getElementById('cam-modal').style.display = 'none'; }
function goTo(p) { 
    document.getElementById('main-slider').style.transform = `translateX(-${p * 100}vw)`;
    document.getElementById('btn-p').classList.toggle('active', p===0);
    document.getElementById('btn-f').classList.toggle('active', p===1);
}
function editName() { const n = prompt("Tuo nome:"); if(n) { profile.name = n; localStorage.setItem('tracce_v4', JSON.stringify(profile)); location.reload(); }}
function genQR() { 
    const n = document.getElementById('place-name').value; 
    const url = window.location.origin + window.location.pathname + "?id=" + encodeURIComponent(n);
    const qr = document.getElementById('qrcode');
    qr.style.display = 'flex'; qr.innerHTML = "";
    new QRCode(qr, {text: url, width: 200, height: 200});
}
