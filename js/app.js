// ==========================================
// APP LOGIC UNTUK ADMIN DASHBOARD
// ==========================================

// TODO: Ganti URL ini dengan URL Web App hasil Deploy dari Clovertees_P3_AdminGAS.js
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyuHyzj3UC4qRsIaraV9JmVT61ScRUVdtwa2BTncFJH6p1aKsZCedZ6F6mGcJK8-Gv0WQ/exec';

window.ordersData = []; // Menyimpan data master
window.currentMonthFilter = ''; // Filter bulan aktif (YYYY-MM)

const tbody = document.getElementById('ordersBody');
const searchInput = document.getElementById('searchInput');
const filterBulan = document.getElementById('filterBulan');
const rekapFilterBulan = document.getElementById('rekapFilterBulan');
const refreshBtn = document.getElementById('refreshBtn');

window.currentStatusFilter = 'Pending'; // Default tab

// Navigasi Tabs
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
        e.preventDefault();

        // Hapus active class
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));

        // Tambah active class ke yg diklik
        this.classList.add('active');
        const target = this.getAttribute('data-tab');
        document.getElementById(target + '-section').classList.add('active');

        if (target === 'pesanan') {
            window.currentStatusFilter = this.getAttribute('data-status');
            document.querySelector('#pesanan-section header h1').innerText = 'Pesanan ' + window.currentStatusFilter;
            renderTable();
        } else if (target === 'rekap') {
            updateRekapBulanan();
        }
    });
});

// Event Listeners Filter
searchInput.addEventListener('input', renderTable);
filterBulan.addEventListener('change', (e) => {
    window.currentMonthFilter = e.target.value;
    renderTable();
});
rekapFilterBulan.addEventListener('change', (e) => {
    window.currentMonthFilter = e.target.value;
    updateRekapBulanan();
});
refreshBtn.addEventListener('click', fetchOrders);

// Format Tanggal
function getMonthYear(dateString) {
    // Expect DD/MM/YYYY HH:mm:ss atau object Date
    try {
        let parts = dateString.split(' ')[0].split('/'); // asumsikan format indo: DD/MM/YYYY
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}`; // YYYY-MM
        }
        // Fallback jika format standard ISO
        let d = new Date(dateString);
        let mm = String(d.getMonth() + 1).padStart(2, '0');
        let yy = d.getFullYear();
        return `${yy}-${mm}`;
    } catch (e) {
        return '';
    }
}

// Extract unique months dari data
function populateMonthFilter() {
    const months = new Set();
    window.ordersData.forEach(o => {
        let m = getMonthYear(o.timestamp);
        if (m) months.add(m);
    });

    const sortedMonths = Array.from(months).sort().reverse();

    // Set options untuk filter tabel
    let optionsHtml = '<option value="">Semua Bulan</option>';

    // Set options untuk filter rekap (default ke bulan terbaru)
    let rekapOptionsHtml = '';

    sortedMonths.forEach((m, index) => {
        // m format YYYY-MM
        let label = m; // bisa diformat lebih bagus misal April 2026
        optionsHtml += `<option value="${m}">${label}</option>`;
        rekapOptionsHtml += `<option value="${m}">${label}</option>`;

        if (index === 0 && !window.currentMonthFilter) {
            window.currentMonthFilter = m; // default active month untuk rekap
        }
    });

    filterBulan.innerHTML = optionsHtml;
    rekapFilterBulan.innerHTML = rekapOptionsHtml;

    if (window.currentMonthFilter) {
        rekapFilterBulan.value = window.currentMonthFilter;
        filterBulan.value = window.currentMonthFilter;
    }
}

// Render Data ke Table
function renderTable() {
    const sTerm = searchInput.value.toLowerCase();
    const sStatus = window.currentStatusFilter;
    const sBulan = filterBulan.value;

    let filtered = window.ordersData.filter(o => {
        const matchNameOrId = o.nama.toLowerCase().includes(sTerm) || o.idPesanan.toLowerCase().includes(sTerm);
        const matchStatus = sStatus ? o.status === sStatus : true;
        const matchBulan = sBulan ? getMonthYear(o.timestamp) === sBulan : true;

        return matchNameOrId && matchStatus && matchBulan;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada pesanan yang sesuai filter.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach(o => {
        let actionBtns = `<button class="btn btn-sm btn-outline" onclick="printOrder('${o.idPesanan}')">Print Slip</button>`;

        if (o.status === 'Pending') {
            actionBtns = `<button class="btn btn-sm btn-primary" onclick="approveOrder('${o.idPesanan}')" style="margin-right:8px;">✅ Approve</button>` + actionBtns;
        }

        html += `
            <tr>
                <td><strong>${o.idPesanan}</strong></td>
                <td>${o.timestamp.split(' ')[0]}</td>
                <td>${o.nama}</td>
                <td>${o.totalPcs}</td>
                <td><span class="status-badge" data-status="${o.status}">${o.status}</span></td>
                <td>${actionBtns}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Fitur Approve (Modal Modern)
let pendingApproveId = null;

function approveOrder(idPesanan) {
    pendingApproveId = idPesanan;
    document.getElementById('approveOrderIdText').innerText = idPesanan;
    
    // Pre-fill if exists
    const orderIndex = window.ordersData.findIndex(o => o.idPesanan === idPesanan);
    if (orderIndex > -1) {
        document.getElementById('approveOngkir').value = window.ordersData[orderIndex].ongkir || '';
        document.getElementById('approveTotalHarga').value = window.ordersData[orderIndex].totalHarga || '';
    } else {
        document.getElementById('approveOngkir').value = '';
        document.getElementById('approveTotalHarga').value = '';
    }
    
    document.getElementById('approveModal').classList.add('active');
}

// Event Listeners Modal Approve
document.getElementById('btnCancelApprove').addEventListener('click', () => {
    document.getElementById('approveModal').classList.remove('active');
    pendingApproveId = null;
});

document.getElementById('btnConfirmApprove').addEventListener('click', async () => {
    if (!pendingApproveId) return;

    const idPesanan = pendingApproveId;
    const btnConfirm = document.getElementById('btnConfirmApprove');
    const ongkirVal = document.getElementById('approveOngkir').value.trim();
    const totalHargaVal = document.getElementById('approveTotalHarga').value.trim();

    // Set UI to loading
    btnConfirm.innerText = 'Tunggu sebentar...';
    btnConfirm.disabled = true;
    btnConfirm.style.opacity = '0.7';

    // Optimistic UI update
    const orderIndex = window.ordersData.findIndex(o => o.idPesanan === idPesanan);
    if (orderIndex > -1) {
        window.ordersData[orderIndex].status = 'Approved';
        if (ongkirVal) window.ordersData[orderIndex].ongkir = ongkirVal;
        if (totalHargaVal) window.ordersData[orderIndex].totalHarga = totalHargaVal;
        renderTable();
    }

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'approveOrder', 
                idPesanan: idPesanan,
                ongkir: ongkirVal,
                totalHarga: totalHargaVal
            }),
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        const data = await response.json();

        if (data.result !== 'success') {
            throw new Error(data.message || 'Gagal approve');
        }

        // Tutup modal jika sukses
        document.getElementById('approveModal').classList.remove('active');
    } catch (err) {
        alert('Terjadi kesalahan saat approve: ' + err.message);
        // Revert optimistic update
        if (orderIndex > -1) {
            window.ordersData[orderIndex].status = 'Pending';
            renderTable();
        }
    } finally {
        // Reset UI
        btnConfirm.innerText = 'Ya, Approve';
        btnConfirm.disabled = false;
        btnConfirm.style.opacity = '1';
        pendingApproveId = null;
    }
});

// Rekap Bulanan Logic
function updateRekapBulanan() {
    const sBulan = rekapFilterBulan.value;

    let totalOrders = 0;
    let totalPcsAll = 0;
    let totalCustom = 0;
    let totalPolos = 0;

    let rekapTableHtml = '';

    window.ordersData.forEach(o => {
        if (getMonthYear(o.timestamp) === sBulan) {
            totalOrders++;
            totalPcsAll += parseInt(o.totalPcs) || 0;

            let pcsCustomOrder = 0;
            let pcsPolosOrder = 0;

            if (o.items && o.items.length > 0) {
                // Kalkulasi dari tab Desain (Items)
                o.items.forEach(item => {
                    let pcs = parseInt(item.pcs) || 0;
                    // Cek apakah ada file desain (indikasi custom)
                    if (item.fileDepan || item.fileBelakang || item.fileLengan) {
                        pcsCustomOrder += pcs;
                    } else {
                        pcsPolosOrder += pcs;
                    }
                });
            } else {
                // Jika tidak ada detail item, asumsikan semua adalah dari total PCS (biasanya ini kasus data lama yg ga masuk tab desain)
                // Default ke Custom aja biar aman, atau bisa dicek dari text Detail Pesanan.
                pcsCustomOrder += parseInt(o.totalPcs) || 0;
            }

            totalCustom += pcsCustomOrder;
            totalPolos += pcsPolosOrder;

            rekapTableHtml += `
                <tr>
                    <td>${o.idPesanan}</td>
                    <td>${pcsCustomOrder} Pcs</td>
                    <td>${pcsPolosOrder} Pcs</td>
                    <td><strong>${o.totalPcs}</strong></td>
                </tr>
            `;
        }
    });

    document.getElementById('valTotalOrders').innerText = totalOrders;
    document.getElementById('valTotalPcs').innerText = totalPcsAll;
    document.getElementById('valCustom').innerText = totalCustom;
    document.getElementById('valPolos').innerText = totalPolos;

    if (!rekapTableHtml) rekapTableHtml = `<tr><td colspan="4" class="text-center">Tidak ada data di bulan ini.</td></tr>`;
    document.getElementById('rekapDetailBody').innerHTML = rekapTableHtml;
}

// Fetch Data via API
async function fetchOrders() {
    if (GAS_URL === 'URL_WEB_APP_GAS_ANDA_DISINI') {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:#ef4444;">Error: Konfigurasi URL Google Apps Script belum diset di app.js</td></tr>`;
        return;
    }

    tbody.innerHTML = `<tr><td colspan="6" class="text-center loading">🔄 Mengambil data dari Google Sheets...</td></tr>`;

    try {
        const response = await fetch(`${GAS_URL}?action=getOrders`);
        const data = await response.json();

        if (data.result === 'success') {
            window.ordersData = data.orders;
            populateMonthFilter();
            renderTable();
            if (document.getElementById('rekap-section').classList.contains('active')) {
                updateRekapBulanan();
            }
        } else {
            throw new Error(data.message || 'Gagal mengambil data');
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="color:#ef4444;">Terjadi kesalahan saat fetch data. Pastikan Web App CORS mengizinkan. Error: ${err.message}</td></tr>`;

        // --- MOCK DATA UNTUK DEMO UI KALAU FETCH GAGAL (opsional) ---
        // Jika error, pasang data dummy untuk memperlihatkan UI bekerja
        window.ordersData = [
            {
                idPesanan: 'CLV-0426-0001',
                timestamp: '21/04/2026 10:00:00',
                nama: 'Budi Santoso',
                whatsapp: '0812345678',
                alamat: 'Jl. Merdeka No 1\nJakarta',
                totalPcs: 25,
                status: 'Pending',
                detailPesanan: 'Kaos Hitam\nDewasa: M:10, L:15',
                items: [
                    { jenisBaju: 'Kaos', warna: 'Hitam', ukuranDewasa: 'M:10, L:15', pcs: 25, fileDepan: 'http://drive.com/depan' }
                ]
            },
            {
                idPesanan: 'CLV-0426-0002',
                timestamp: '21/04/2026 12:30:00',
                nama: 'Siti Aminah',
                whatsapp: '0898765432',
                alamat: 'Jl. Sudirman 55\nBandung',
                totalPcs: 10,
                status: 'Approved',
                detailPesanan: 'Kaos Putih (Polos)\nDewasa: S:5, M:5',
                items: [
                    { jenisBaju: 'Kaos', warna: 'Putih', ukuranDewasa: 'S:5, M:5', pcs: 10, fileDepan: '' }
                ]
            }
        ];
        populateMonthFilter();
        renderTable();
    }
}

// Init
document.addEventListener('DOMContentLoaded', fetchOrders);
