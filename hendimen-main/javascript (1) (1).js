// ========== Data Global ==========
let currentUser = null;
let jobs = [];
let walletTransactions = [];
let walletBalance = 0;
let reviews = [];
let notifications = [];
let referralCount = 0;

// Koordinat untuk peta Pekanbaru
const pekanbaruCoords = [0.5071, 101.4478];

// ========== Loading Animation ==========
function showLoading(ms = 1200) {
    document.getElementById('loadingBackdrop').style.display = 'flex';
    return new Promise(resolve => {
        setTimeout(() => {
            document.getElementById('loadingBackdrop').style.display = 'none';
            resolve();
        }, ms);
    });
}

// ========== Navigasi & Sidebar ==========
document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        setActiveMenu(this.dataset.page);
        if (window.innerWidth <= 992) toggleMobileMenu();
    });
});

document.querySelectorAll('.bottom-nav-item').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        setActiveMenu(this.dataset.page);
        if (window.innerWidth <= 992) toggleMobileMenu();
    });
});

function setActiveMenu(pageId) {
    document.querySelectorAll('.sidebar-link').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.bottom-nav-item').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.page-main').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    document.querySelectorAll(`[data-page="${pageId}"]`).forEach(el => el.classList.add('active'));
    
    if (currentUser && currentUser.role === 'requester' && pageId === 'analyticsPage') {
        document.getElementById('analyticsPage').style.display = 'none';
        setActiveMenu('homePage');
        alert('Halaman analitik hanya tersedia untuk Helper');
    }
}

setActiveMenu('homePage');

document.querySelectorAll('.cat-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('categoryFilter').value = this.dataset.cat;
        setActiveMenu('homePage');
        filterJobs();
    });
});

// Mobile menu
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');

function toggleMobileMenu() {
    sidebar.classList.toggle('mobile-visible');
    mobileOverlay.style.display = sidebar.classList.contains('mobile-visible') ? 'block' : 'none';
    document.body.style.overflow = sidebar.classList.contains('mobile-visible') ? 'hidden' : 'auto';
}

mobileMenuBtn.addEventListener('click', toggleMobileMenu);
mobileOverlay.addEventListener('click', toggleMobileMenu);

document.querySelectorAll('.sidebar-menu a').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 992) toggleMobileMenu();
    });
});

// ========== Authentication dengan Database ==========
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.querySelector(`.auth-tab:nth-child(${tab === 'login' ? 1 : 2})`).classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');
}

document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    let role = document.getElementById('userType').value;
    let nama_lengkap = document.getElementById('regName').value.trim();
    let email = document.getElementById('regEmail').value.trim();
    let no_telepon = document.getElementById('regPhone').value.trim();
    let password = document.getElementById('regPassword').value;
    let confirmPassword = document.getElementById('regConfirmPassword').value;
    let ktpFile = document.getElementById('regId').files[0];
    
    if (password !== confirmPassword) {
        alert('Password dan konfirmasi password tidak cocok!');
        return;
    }
    
    showLoading();
    
    let dbRole = role === 'requester' ? 'Requester' : 'Helper';
    
    let formData = new FormData();
    formData.append('role', dbRole);
    formData.append('nama_lengkap', nama_lengkap);
    formData.append('email', email);
    formData.append('no_telepon', no_telepon);
    formData.append('password', password);
    if (ktpFile) {
        formData.append('ktp_file', ktpFile);
    }
    
    try {
        let response = await fetch('register.php', {
            method: 'POST',
            body: formData
        });
        
        let result = await response.json();
        
        await showLoading();
        
        if (result.success) {
            currentUser = result.user;
            afterLogin();
            alert('Registrasi berhasil! Selamat datang di Hendimen.');
        } else {
            alert('Registrasi gagal: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat registrasi');
    }
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    let email = document.getElementById('loginEmail').value.trim();
    let password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert('Email/No Telepon dan password harus diisi!');
        return;
    }
    
    showLoading();
    
    let formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    
    try {
        let response = await fetch('login.php', {
            method: 'POST',
            body: formData
        });
        
        let result = await response.json();
        
        await showLoading();
        
        if (result.success) {
            currentUser = result.user;
            afterLogin();
            alert('Login berhasil! Selamat datang kembali.');
        } else {
            alert('Login gagal: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat login');
    }
});

async function afterLogin() {
    document.getElementById('authPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileAvatar').textContent = currentUser.avatar;
    
    // Load wallet dari database
    await loadWalletFromDB();
    
    if (currentUser.role === "requester") {
        document.getElementById('requesterBtn').classList.add('active');
        document.getElementById('helperBtn').classList.remove('active');
        document.getElementById('requesterView').style.display = 'block';
        document.getElementById('helperView').style.display = 'none';
        document.querySelectorAll('.helper-only').forEach(el => {
            el.style.display = 'none';
        });
    } else {
        document.getElementById('helperBtn').classList.add('active');
        document.getElementById('requesterBtn').classList.remove('active');
        document.getElementById('helperView').style.display = 'block';
        document.getElementById('requesterView').style.display = 'none';
        document.querySelectorAll('.helper-only').forEach(el => {
            el.style.display = 'flex';
        });
    }
    
    await loadJobsFromDB();
    updateNotificationBadge();
}

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        currentUser = null;
        document.getElementById('dashboardPage').classList.remove('active');
        document.getElementById('authPage').classList.add('active');
        document.getElementById('loginForm').reset();
        document.getElementById('registerForm').reset();
    }
}

document.getElementById('requesterBtn').addEventListener('click', function() {
    document.getElementById('requesterView').style.display = 'block';
    document.getElementById('helperView').style.display = 'none';
    document.getElementById('requesterBtn').classList.add('active');
    document.getElementById('helperBtn').classList.remove('active');
    document.querySelectorAll('.helper-only').forEach(el => {
        el.style.display = 'none';
    });
    loadRequesterJobs();
});

document.getElementById('helperBtn').addEventListener('click', function() {
    document.getElementById('requesterView').style.display = 'none';
    document.getElementById('helperView').style.display = 'block';
    document.getElementById('helperBtn').classList.add('active');
    document.getElementById('requesterBtn').classList.remove('active');
    document.querySelectorAll('.helper-only').forEach(el => {
        el.style.display = 'flex';
    });
    loadHelperJobs();
});

// ========== Modal ==========
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

// ========== WALLET FUNCTIONS ==========
// Fungsi format Rupiah
function formatRupiah(angka) {
    if (angka === undefined || angka === null) return '0';
    return angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Load wallet dari database
async function loadWalletFromDB() {
    if (!currentUser) return;
    
    try {
        let response = await fetch(`get_wallet.php?user_id=${currentUser.id}`);
        let result = await response.json();
        
        if (result.success) {
            walletBalance = result.balance;
            walletTransactions = result.transactions || [];
            
            // Update tampilan
            document.getElementById('walletBalance').textContent = 'Rp ' + formatRupiah(walletBalance);
            loadWallet(); // Tampilkan riwayat
        }
    } catch (error) {
        console.error('Error loading wallet:', error);
    }
}

// Tampilkan wallet
function loadWallet() {
    document.getElementById('walletBalance').textContent = 'Rp ' + formatRupiah(walletBalance);
    
    let e = document.getElementById('walletHistory');
    e.innerHTML = '';
    
    if (walletTransactions.length === 0) {
        e.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;">Belum ada transaksi</td></tr>';
        return;
    }
    
    walletTransactions.forEach(wal => {
        let row = document.createElement('tr');
        let amountClass = wal.amount.startsWith('+') ? 'text-success' : 'text-danger';
        row.innerHTML = `
            <td style="padding:8px 6px;">${wal.date}</td>
            <td>${wal.desc}</td>
            <td style="text-align:right;font-weight:600;" class="${amountClass}">${wal.amount}</td>
            <td style="text-align:right;"><span class="badge ${wal.status === 'Sukses' ? 'badge-success' : 'badge-warning'}">${wal.status}</span></td>
        `;
        e.appendChild(row);
    });
}

// ========== TOPUP ==========
let selectedTopupMethod = null;

document.querySelectorAll('.topup-method').forEach(el => {
    el.onclick = function() {
        document.querySelectorAll('.topup-method').forEach(m => m.classList.remove('selected'));
        this.classList.add('selected');
        selectedTopupMethod = this.dataset.method;
        document.getElementById('topupVALIST').style.display = (selectedTopupMethod === 'va') ? 'block' : 'none';
    };
});

document.getElementById('topupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Anda harus login terlebih dahulu');
        return;
    }
    
    if (!selectedTopupMethod) {
        alert('Pilih metode top up!');
        return;
    }
    
    let nominal = parseInt(document.getElementById('topupNominal').value);
    if (isNaN(nominal) || nominal < 10000) {
        alert('Minimal top up Rp 10.000');
        return;
    }
    
    let method = selectedTopupMethod;
    if (selectedTopupMethod === 'va') {
        let bank = document.getElementById('vaBank').value;
        method = 'va_' + bank;
    }
    
    showLoading();
    
    let formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('nominal', nominal);
    formData.append('method', method);
    
    try {
        let response = await fetch('topup.php', {
            method: 'POST',
            body: formData
        });
        
        let result = await response.json();
        
        if (result.success) {
            walletBalance = result.new_balance;
            if (result.transaction) {
                walletTransactions.unshift(result.transaction);
            }
            
            loadWallet();
            closeModal('topupModal');
            alert('Top up berhasil! Saldo Anda sekarang Rp ' + formatRupiah(walletBalance));
        } else {
            alert('Top up gagal: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat top up');
    } finally {
        document.getElementById('loadingBackdrop').style.display = 'none';
    }
});

// ========== BERANDA (homePage) ==========
document.getElementById('createJobForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const title = document.getElementById('jobTitle').value;
    const category = document.getElementById('jobCategory').value;
    const description = document.getElementById('jobDescription').value;
    const location = document.getElementById('jobLocation').value;
    let price = parseInt(document.getElementById('jobPrice').value);
    const emergency = document.getElementById('emergencyJob').checked;
    
    if (!title || !category || !description || !location || !price) {
        alert('Semua field harus diisi!');
        return;
    }
    
    if (price < 10000) {
        alert('Minimal upah Rp 10.000');
        return;
    }
    
    if (emergency) {
        price = Math.round(price * 1.25);
    }
    
    if (walletBalance < 2500) {
        if (confirm('Saldo Anda tidak cukup untuk biaya layanan Rp 2.500. Apakah ingin top up sekarang?')) {
            closeModal('createJobModal');
            openModal('topupModal');
        }
        return;
    }
    
    const jobData = {
        id: Date.now(),
        title: title,
        category: category,
        description: description,
        location: location,
        price: price,
        emergency: emergency
    };
    
    closeModal('createJobModal');
    openPaymentModal(jobData);
});

function loadRequesterJobs() {
    const jobList = document.getElementById('requesterJobList');
    jobList.innerHTML = '';
    
    let filteredJobs = jobs.filter(job => job.user_id === currentUser?.id);
    const statusFilter = document.getElementById('statusFilter').value;
    const catFilter = document.getElementById('categoryFilter').value;
    const sort = document.getElementById('sortFilter').value;
    
    if (statusFilter !== 'all') filteredJobs = filteredJobs.filter(job => job.status === statusFilter);
    if (catFilter !== 'all') filteredJobs = filteredJobs.filter(job => job.category === catFilter);
    
    if (sort === 'newest') filteredJobs = filteredJobs.slice().reverse();
    if (sort === 'oldest') filteredJobs = filteredJobs.slice();
    if (sort === 'price-high') filteredJobs = filteredJobs.slice().sort((a, b) => b.price - a.price);
    if (sort === 'price-low') filteredJobs = filteredJobs.slice().sort((a, b) => a.price - b.price);
    
    document.getElementById('activeJobsCount').textContent = filteredJobs.length;
    
    if (filteredJobs.length === 0) {
        jobList.innerHTML = `<div class="empty-state"><i class="fas fa-inbox"></i><h3>Tidak ada permintaan bantuan</h3><p>Belum ada permintaan bantuan yang dibuat. Buat permintaan pertama Anda!</p></div>`;
        return;
    }
    
    filteredJobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = `job-card ${job.emergency ? 'emergency' : ''}`;
        jobCard.innerHTML = `
            ${job.emergency ? '<div class="emergency-badge">Emergency</div>' : ''}
            <h3>${job.title}</h3>
            <div class="job-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="far fa-clock"></i> ${job.date}</span>
            </div>
            <div class="job-price">Rp ${job.price.toLocaleString('id-ID')}</div>
            <div class="job-description">${job.description}</div>
            <div class="job-tags">
                <span class="job-tag">${getCategoryName(job.category)}</span>
                <span class="job-tag">${job.location.split(',')[0]}</span>
                ${job.emergency ? '<span class="job-tag">Emergency</span>' : ''}
            </div>
            <div class="job-actions requester-actions">
                <button class="btn btn-outline" onclick="viewJobDetail(${job.id})">Lihat Detail</button>
                <button class="btn btn-primary" onclick="editJob(${job.id})">Edit</button>
                <button class="favorite-btn ${job.favorite ? 'active' : ''}" onclick="toggleFavorite(${job.id})">
                    <i class="${job.favorite ? 'fas' : 'far'} fa-heart"></i>
                </button>
            </div>
        `;
        jobList.appendChild(jobCard);
    });
}

function loadHelperJobs() {
    const jobList = document.getElementById('helperJobList');
    jobList.innerHTML = '';
    
    let openJobs = jobs.filter(job => job.status === 'open');
    const cat = document.getElementById('helperCategoryFilter').value;
    const dist = document.getElementById('distanceFilter').value;
    const sort = document.getElementById('helperSortFilter').value;
    
    if (cat !== 'all') openJobs = openJobs.filter(job => job.category === cat);
    
    if (dist !== 'all') {
        let maxDist = parseInt(dist.replace('km', ''));
        openJobs = openJobs.filter(job => parseFloat(job.distance) <= maxDist);
    }
    
    if (sort === 'newest') openJobs = openJobs.slice().reverse();
    if (sort === 'price-high') openJobs = openJobs.slice().sort((a, b) => b.price - a.price);
    if (sort === 'price-low') openJobs = openJobs.slice().sort((a, b) => a.price - b.price);
    if (sort === 'distance') openJobs = openJobs.slice().sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    
    if (openJobs.length === 0) {
        jobList.innerHTML = `<div class="empty-state"><i class="fas fa-search"></i><h3>Tidak ada pekerjaan tersedia</h3><p>Saat ini tidak ada pekerjaan yang tersedia di sekitar Anda.</p></div>`;
        return;
    }
    
    openJobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = `job-card ${job.emergency ? 'emergency' : ''}`;
        jobCard.innerHTML = `
            ${job.emergency ? '<div class="emergency-badge">Emergency</div>' : ''}
            <h3>${job.title}</h3>
            <div class="job-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${job.distance}</span>
                <span><i class="far fa-clock"></i> ${job.date}</span>
            </div>
            <div class="job-price">Rp ${job.price.toLocaleString('id-ID')}</div>
            <div class="job-description">${job.description}</div>
            <div class="job-tags">
                <span class="job-tag">${getCategoryName(job.category)}</span>
                <span class="job-tag">${job.location.split(',')[0]}</span>
                ${job.emergency ? '<span class="job-tag">Emergency</span>' : ''}
            </div>
            <button class="btn btn-primary" onclick="takeJob(${job.id})">Ambil Pekerjaan</button>
            <button class="favorite-btn ${job.favorite ? 'active' : ''}" onclick="toggleFavorite(${job.id})" style="margin-top:10px;">
                <i class="${job.favorite ? 'fas' : 'far'} fa-heart"></i> ${job.favorite ? 'Favorit' : 'Tambahkan ke Favorit'}
            </button>
        `;
        jobList.appendChild(jobCard);
    });
}

function viewJobDetail(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    document.getElementById('detailJobTitle').textContent = job.title;
    document.getElementById('detailJobCategory').textContent = getCategoryName(job.category);
    document.getElementById('detailJobLocation').textContent = job.location;
    document.getElementById('detailJobPrice').textContent = `Rp ${job.price.toLocaleString('id-ID')}`;
    document.getElementById('detailJobDescription').textContent = job.description;
    document.getElementById('detailJobDate').textContent = job.date;
    document.getElementById('detailJobStatus').textContent = getStatusName(job.status);
    document.getElementById('detailJobBadge').innerHTML = job.emergency ? '<div class="emergency-badge">Emergency</div>' : '';
    
    const mapContainer = document.getElementById('detailJobMap');
    mapContainer.innerHTML = '<div id="jobMap" style="height:100%;"></div>';
    
    setTimeout(() => {
        const map = L.map('jobMap').setView(pekanbaruCoords, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
        
        const randomOffset = () => (Math.random() - 0.5) * 0.1;
        const jobCoords = [pekanbaruCoords[0] + randomOffset(), pekanbaruCoords[1] + randomOffset()];
        
        L.marker(jobCoords).addTo(map)
            .bindPopup(job.location)
            .openPopup();
    }, 100);
    
    const actionBtn = document.getElementById('detailActionBtn');
    const favoriteBtn = document.getElementById('detailFavoriteBtn');
    
    if (document.getElementById('requesterView').style.display !== 'none') {
        actionBtn.textContent = 'Edit';
        actionBtn.onclick = function() { editJob(jobId); };
        actionBtn.style.display = "inline-block";
    } else {
        actionBtn.textContent = 'Ambil Pekerjaan';
        actionBtn.onclick = function() { takeJob(jobId); };
        actionBtn.style.display = "inline-block";
    }
    
    favoriteBtn.innerHTML = job.favorite ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    favoriteBtn.className = `btn btn-outline favorite-btn ${job.favorite ? 'active' : ''}`;
    favoriteBtn.onclick = function() { toggleFavorite(jobId); };
    favoriteBtn.style.display = "inline-block";
    
    openModal('jobDetailModal');
}

async function takeJob(jobId) {
    if (!currentUser) {
        alert('Anda harus login terlebih dahulu');
        return;
    }
    
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    if (!confirm(`Apakah Anda yakin ingin mengambil pekerjaan "${job.title}"?`)) {
        return;
    }
    
    showLoading();
    
    let formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('action', 'take');
    formData.append('user_id', currentUser.id);
    
    try {
        let response = await fetch('update_job.php', {
            method: 'POST',
            body: formData
        });
        
        let result = await response.json();
        
        if (result.success) {
            job.status = 'in-progress';
            alert(`Anda berhasil mengambil pekerjaan "${job.title}"!`);
            loadRequesterJobs();
            loadHelperJobs();
            closeModal('jobDetailModal');
            loadMyJobs();
        } else {
            alert('Gagal: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan');
    } finally {
        document.getElementById('loadingBackdrop').style.display = 'none';
    }
}

function editJob(jobId) {
    if (currentUser && currentUser.role === 'helper') {
        alert('Maaf, Helper tidak dapat mengedit pekerjaan. Fitur ini hanya tersedia untuk Requester.');
        return;
    }
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    alert(`Fitur edit untuk pekerjaan "${job.title}" akan segera tersedia!`);
    closeModal('jobDetailModal');
}

function filterJobs() { loadRequesterJobs(); }
function filterHelperJobs() { loadHelperJobs(); }

function getCategoryName(category) {
    const categories = { 
        'moving': 'Pindahan', 
        'delivery': 'Pengiriman', 
        'transport': 'Antar Jemput', 
        'event': 'Jaga Acara', 
        'other': 'Lainnya', 
        'tools': 'Perbaikan' 
    };
    return categories[category] || category;
}

function getStatusName(status) {
    const statuses = { 
        'open': 'Terbuka', 
        'in-progress': 'Dalam Proses', 
        'completed': 'Selesai' 
    };
    return statuses[status] || status;
}

// Load jobs dari database
async function loadJobsFromDB() {
    if (!currentUser) return;
    
    try {
        let response = await fetch(`get_jobs.php?type=requester&user_id=${currentUser.id}`);
        let result = await response.json();
        
        if (result.success) {
            jobs = result.jobs;
        }
        
        let openResponse = await fetch('get_jobs.php?type=open');
        let openResult = await openResponse.json();
        
        if (openResult.success) {
            jobs = [...jobs, ...openResult.jobs.filter(j => !jobs.some(existing => existing.id === j.id))];
        }
        
        loadRequesterJobs();
        loadHelperJobs();
        loadMyJobs();
        loadHistory();
        loadFavorites();
        
    } catch (error) {
        console.error('Error loading jobs:', error);
    }
}

window.addEventListener('resize', function() {
    if (window.innerWidth > 992) {
        sidebar.classList.remove('mobile-visible');
        mobileOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// ========== Pekerjaan Saya ==========
function loadMyJobs() {
    let active = jobs.filter(j => (j.status === 'open' || j.status === 'in-progress') && j.user_id === currentUser?.id);
    let complete = jobs.filter(j => j.status === 'completed' && j.user_id === currentUser?.id);
    
    let q1 = (document.getElementById('myJobSearch') || { value: "" }).value.toLowerCase();
    let q2 = (document.getElementById('myJobDoneSearch') || { value: "" }).value.toLowerCase();
    
    if (q1) active = active.filter(j => j.title.toLowerCase().includes(q1));
    if (q2) complete = complete.filter(j => j.title.toLowerCase().includes(q2));
    
    let activeDiv = document.getElementById('activeJobList');
    activeDiv.innerHTML = '';
    
    if (active.length === 0) {
        activeDiv.innerHTML = `<div class="empty-state"><i class="fas fa-briefcase"></i><h3>Belum ada pekerjaan aktif</h3></div>`;
    } else {
        active.forEach(job => {
            let card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <h3>${job.title}</h3>
                <div class="job-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    <span><i class="far fa-clock"></i> ${job.date}</span>
                </div>
                <div class="job-price">Rp ${job.price.toLocaleString('id-ID')}</div>
                <div class="job-description">${job.description}</div>
                <div class="job-tags">
                    <span class="job-tag">${getCategoryName(job.category)}</span>
                    <span class="job-tag">${getStatusName(job.status)}</span>
                </div>
                <div class="job-actions requester-actions">
                    <button class="btn btn-outline" onclick="viewJobDetail(${job.id})">Lihat Detail</button>
                    ${currentUser && currentUser.role === 'requester' ?
                        '<button class="btn btn-primary" onclick="editJob(' + job.id + ')">Edit</button>' :
                        '<button class="btn btn-primary" onclick="completeJob(' + job.id + ')">Selesaikan</button>'
                    }
                    <button class="favorite-btn ${job.favorite ? 'active' : ''}" onclick="toggleFavorite(${job.id})">
                        <i class="${job.favorite ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                </div>
            `;
            activeDiv.appendChild(card);
        });
    }
    
    let compDiv = document.getElementById('completedJobList');
    compDiv.innerHTML = '';
    
    if (complete.length === 0) {
        compDiv.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><h3>Belum ada pekerjaan selesai</h3></div>`;
    } else {
        complete.forEach(job => {
            let card = document.createElement('div');
            card.className = 'job-card';
            card.innerHTML = `
                <h3>${job.title}</h3>
                <div class="job-meta">
                    <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                    <span><i class="far fa-clock"></i> ${job.date}</span>
                </div>
                <div class="job-price">Rp ${job.price.toLocaleString('id-ID')}</div>
                <div class="job-description">${job.description}</div>
                <div class="job-tags">
                    <span class="job-tag">${getCategoryName(job.category)}</span>
                    <span class="job-tag">${getStatusName(job.status)}</span>
                </div>
                <div class="job-actions requester-actions">
                    <button class="btn btn-outline" onclick="viewJobDetail(${job.id})">Lihat Detail</button>
                    <button class="btn btn-primary" onclick="giveRating(${job.id})">Beri Rating</button>
                </div>
            `;
            compDiv.appendChild(card);
        });
    }
}

function filterMyJobs() { loadMyJobs(); }

function switchTab(tabId, el) {
    document.querySelectorAll('.tab-page').forEach(tab => tab.style.display = 'none');
    document.getElementById(tabId).style.display = 'block';
    document.querySelectorAll('.tabbed-btn').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
}

async function completeJob(jobId) {
    if (!currentUser) return;
    
    let job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    showLoading();
    
    let formData = new FormData();
    formData.append('job_id', jobId);
    formData.append('action', 'complete');
    formData.append('user_id', currentUser.id);
    
    try {
        let response = await fetch('update_job.php', {
            method: 'POST',
            body: formData
        });
        
        let result = await response.json();
        
        if (result.success) {
            job.status = 'completed';
            alert('Pekerjaan telah ditandai selesai!');
            loadMyJobs();
            loadRequesterJobs();
            loadHistory();
        } else {
            alert('Gagal: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan');
    } finally {
        document.getElementById('loadingBackdrop').style.display = 'none';
    }
}

function giveRating(jobId) {
    let job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    openModal('ratingModal');
    
    document.getElementById('ratingForm').onsubmit = function(e) {
        e.preventDefault();
        const rating = document.querySelector('input[name="rating"]:checked');
        const reviewText = document.getElementById('reviewText').value;
        
        if (!rating) {
            alert('Pilih rating terlebih dahulu!');
            return;
        }
        
        alert('Terima kasih atas rating dan ulasan Anda!');
        closeModal('ratingModal');
    };
}

// ========== Favorit ==========
function toggleFavorite(jobId) {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    
    job.favorite = !job.favorite;
    loadRequesterJobs();
    loadHelperJobs();
    loadMyJobs();
    loadFavorites();
}

function loadFavorites() {
    const favoritesList = document.getElementById('favoriteJobList');
    favoritesList.innerHTML = '';
    
    const favoriteJobs = jobs.filter(job => job.favorite);
    
    if (favoriteJobs.length === 0) {
        favoritesList.innerHTML = `<div class="empty-state"><i class="fas fa-heart"></i><h3>Belum ada pekerjaan favorit</h3><p>Simpan pekerjaan yang menarik dengan menekan ikon hati pada kartu pekerjaan.</p></div>`;
        return;
    }
    
    favoriteJobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
            <h3>${job.title}</h3>
            <div class="job-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="far fa-clock"></i> ${job.date}</span>
            </div>
            <div class="job-price">Rp ${job.price.toLocaleString('id-ID')}</div>
            <div class="job-description">${job.description}</div>
            <div class="job-tags">
                <span class="job-tag">${getCategoryName(job.category)}</span>
                <span class="job-tag">${getStatusName(job.status)}</span>
            </div>
            <div class="job-actions requester-actions">
                <button class="btn btn-outline" onclick="viewJobDetail(${job.id})">Lihat Detail</button>
                <button class="favorite-btn active" onclick="toggleFavorite(${job.id})">
                    <i class="fas fa-heart"></i> Hapus dari Favorit
                </button>
            </div>
        `;
        favoritesList.appendChild(jobCard);
    });
}

// ========== Ulasan ==========
function loadReviews() {
    let e = document.getElementById('reviewList');
    e.innerHTML = '';
    
    reviews.forEach(r => {
        let div = document.createElement('div');
        div.style = "display:flex;align-items:flex-start;margin-bottom:18px;";
        div.innerHTML = `
            <div class="avatar" style="margin-right:12px;">${r.avatar}</div>
            <div>
                <div style="font-weight:600;font-size:1rem;">${r.name} <span style="color:var(--gray);font-size:0.9rem;font-weight:400;">(${r.date})</span></div>
                <div style="color:orange;margin-bottom:5px;">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                <div>${r.text}</div>
            </div>
        `;
        e.appendChild(div);
    });
}

// ========== Riwayat ==========
function loadHistory() {
    let e = document.getElementById('historyList');
    let q = (document.getElementById('historySearch') || { value: "" }).value.toLowerCase();
    let sort = (document.getElementById('historySort') || { value: 'newest' }).value;
    
    let hist = jobs.filter(j => j.status === 'completed' && j.user_id === currentUser?.id);
    
    if (q) hist = hist.filter(j => j.title.toLowerCase().includes(q) || j.location.toLowerCase().includes(q));
    
    if (sort === 'newest') hist = hist.slice().reverse();
    if (sort === 'oldest') hist = hist.slice();
    if (sort === 'price-high') hist = hist.slice().sort((a, b) => b.price - a.price);
    if (sort === 'price-low') hist = hist.slice().sort((a, b) => a.price - b.price);
    
    e.innerHTML = '';
    
    if (hist.length === 0) {
        e.innerHTML = `<div class="empty-state"><i class="fas fa-history"></i><h3>Belum ada histori pekerjaan</h3></div>`;
        return;
    }
    
    hist.forEach(job => {
        let card = document.createElement('div');
        card.className = 'job-card';
        card.innerHTML = `
            <h3>${job.title}</h3>
            <div class="job-meta">
                <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                <span><i class="far fa-clock"></i> ${job.date}</span>
            </div>
            <div class="job-price">Rp ${job.price.toLocaleString('id-ID')}</div>
            <div class="job-description">${job.description}</div>
            <div class="job-tags">
                <span class="job-tag">${getCategoryName(job.category)}</span>
                <span class="job-tag">Selesai</span>
            </div>
            <div class="job-actions requester-actions">
                <button class="btn btn-outline" onclick="viewJobDetail(${job.id})">Lihat Detail</button>
            </div>
        `;
        e.appendChild(card);
    });
}

function filterHistory() { loadHistory(); }

// ========== Notifikasi ==========
function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
    
    document.querySelectorAll('.notification-badge').forEach(badge => {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    });
}

document.getElementById('notificationIcon').addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('notificationDropdown');
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    
    if (dropdown.style.display === 'block') {
        notifications.forEach(n => n.read = true);
        updateNotificationBadge();
    }
});

document.addEventListener('click', function() {
    document.getElementById('notificationDropdown').style.display = 'none';
});

// ========== Referral ==========
function copyReferralCode() {
    const code = "HENDI123";
    navigator.clipboard.writeText(code).then(function() {
        referralCount++;
        document.getElementById('referralCount').textContent = referralCount;
        alert('Kode referral berhasil disalin: ' + code);
    }, function(err) {
        console.error('Gagal menyalin kode: ', err);
        alert('Gagal menyalin kode referral');
    });
}

// ========== Dark Mode ==========
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (darkModeToggle) {
        darkModeToggle.checked = document.body.classList.contains('dark-mode');
    }
    
    const darkModeIcon = document.querySelector('.dark-mode-toggle i');
    if (document.body.classList.contains('dark-mode')) {
        darkModeIcon.className = 'fas fa-sun';
    } else {
        darkModeIcon.className = 'fas fa-moon';
    }
    
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    if (darkModeToggle) {
        darkModeToggle.checked = true;
    }
    
    const darkModeIcon = document.querySelector('.dark-mode-toggle i');
    darkModeIcon.className = 'fas fa-sun';
}

// ========== Chat ==========
function sendMessage() {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (!msg) return;
    
    const messagesDiv = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message sent';
    msgDiv.textContent = msg;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    input.value = '';
}

document.getElementById('chatInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

// ========== Fungsi Pembayaran QRIS ==========
let pendingJobData = null;
let paymentTimer = null;
let paymentTimeLeft = 300;

function openPaymentModal(jobData) {
    console.log('Membuka modal payment dengan data:', jobData);
    
    pendingJobData = jobData;
    
    const serviceFee = 2500;
    const total = jobData.price + serviceFee;
    
    document.getElementById('paymentTotal').textContent = 'Rp ' + jobData.price.toLocaleString('id-ID');
    document.getElementById('serviceFee').textContent = 'Rp 2.500';
    document.getElementById('totalPayment').textContent = 'Rp ' + total.toLocaleString('id-ID');
    
    generateQRIS(jobData);
    resetPaymentTimer();
    openModal('paymentModal');
}

function generateQRIS(jobData) {
    const qrData = `HENDIMEN|${jobData.id}|${jobData.price}|${Date.now()}`;
    const qrImg = document.getElementById('qrisImage');
    
    if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
    }
}

function resetPaymentTimer() {
    if (paymentTimer) {
        clearInterval(paymentTimer);
    }
    
    paymentTimeLeft = 300;
    updateTimerDisplay();
    
    paymentTimer = setInterval(function() {
        paymentTimeLeft--;
        updateTimerDisplay();
        
        if (paymentTimeLeft <= 0) {
            clearInterval(paymentTimer);
            paymentTimer = null;
            handlePaymentExpired();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(paymentTimeLeft / 60);
    const seconds = paymentTimeLeft % 60;
    const timerElement = document.getElementById('paymentTimer');
    
    if (timerElement) {
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (paymentTimeLeft <= 60) {
            timerElement.style.color = 'var(--danger)';
        } else {
            timerElement.style.color = 'var(--primary)';
        }
    }
}

function handlePaymentExpired() {
    const statusDiv = document.getElementById('paymentStatus');
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.innerHTML = '<span style="color: var(--danger);"><i class="fas fa-times-circle"></i> Waktu pembayaran habis. Silakan ulangi proses.</span>';
    }
    
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
    }
    
    setTimeout(function() {
        closeModal('paymentModal');
        
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
        }
        
        if (statusDiv) {
            statusDiv.style.display = 'none';
        }
    }, 3000);
}

function confirmPayment() {
    showLoading(800);
    
    setTimeout(function() {
        const statusDiv = document.getElementById('paymentStatus');
        
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.innerHTML = '<span style="color: var(--success);"><i class="fas fa-check-circle"></i> Pembayaran berhasil! Memposting permintaan...</span>';
        }
        
        const confirmBtn = document.getElementById('confirmPaymentBtn');
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
        }
        
        if (paymentTimer) {
            clearInterval(paymentTimer);
            paymentTimer = null;
        }
        
        setTimeout(function() {
            postJobAfterPayment();
        }, 1500);
    }, 800);
}

async function postJobAfterPayment() {
    if (!pendingJobData || !currentUser) {
        alert('Error: Data pekerjaan tidak ditemukan atau Anda belum login');
        closeModal('paymentModal');
        return;
    }
    
    showLoading();
    
    let formData = new FormData();
    formData.append('user_id', currentUser.id);
    formData.append('title', pendingJobData.title);
    formData.append('category', pendingJobData.category);
    formData.append('description', pendingJobData.description);
    formData.append('location', pendingJobData.location);
    formData.append('price', pendingJobData.price);
    
    if (pendingJobData.emergency) {
        formData.append('emergency', '1');
    }
    
    try {
        let response = await fetch('save_job.php', {
            method: 'POST',
            body: formData
        });
        
        let result = await response.json();
        
        if (result.success) {
            // Reload wallet dan jobs dari database
            await loadWalletFromDB();
            await loadJobsFromDB();
            
            closeModal('paymentModal');
            document.getElementById('createJobForm').reset();
            
            alert('Permintaan berhasil diposting! Pekerjaan Anda sudah aktif.');
        } else {
            alert('Gagal posting: ' + result.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Terjadi kesalahan saat memposting pekerjaan');
    } finally {
        pendingJobData = null;
        document.getElementById('loadingBackdrop').style.display = 'none';
    }
}

// ========== Init ==========
// Jangan panggil loadJobs() langsung karena currentUser masih null
// loadJobs(); - HAPUS BARIS INI
updateNotificationBadge();