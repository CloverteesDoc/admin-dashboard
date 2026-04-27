// ==========================================
// PRINT LOGIC UNTUK ADMIN DASHBOARD
// ==========================================

function printOrder(orderId) {
    if (!window.ordersData) return;
    
    // Cari data pesanan berdasarkan ID
    const order = window.ordersData.find(o => o.idPesanan === orderId);
    if (!order) {
        alert("Pesanan tidak ditemukan!");
        return;
    }

    const container = document.getElementById('print-container');
    
    // Generate HTML untuk print
    let html = `
        <div class="print-page">
            
            <!-- LABEL PENGIRIMAN -->
            <div class="shipping-label">
                <div class="shipping-header">
                    <div class="brand">CLOVERTEES</div>
                    <div><strong>LABEL PENGIRIMAN</strong><br>ID: ${order.idPesanan}</div>
                </div>
                
                <div class="shipping-details">
                    <div class="shipping-box">
                        <h4>PENGIRIM:</h4>
                        <p class="name">Clovertees</p>
                        <p>Telp: 0823-6356-0267</p>
                    </div>
                    <div class="shipping-box">
                        <h4>PENERIMA:</h4>
                        <p class="name">${order.nama}</p>
                        <p>Telp: ${order.whatsapp}</p>
                        <p>${order.alamat.replace(/\n/g, '<br>')}</p>
                    </div>
                </div>
                <div style="margin-top: 15px; font-size: 12px; border-top: 1px solid #ccc; padding-top: 10px;">
                    <strong>Isi Paket:</strong> ${order.totalPcs} Pcs Kaos<br>
                    <strong>Ongkir:</strong> ${order.ongkir || '-'}
                </div>
            </div>

            <!-- GUNTING DISINI -->
            <div class="cut-line">
                <span>✂ Gunting Disini ✂</span>
            </div>

            <!-- SLIP PRODUKSI -->
            <div class="production-slip">
                <div class="prod-header">
                    <h2>SLIP PRODUKSI CLOVERTEES</h2>
                    <p>Tanggal Masuk: ${order.timestamp.substring(0, 10)}</p>
                </div>
                
                <div class="prod-info">
                    <div><strong>No. Pesanan:</strong> ${order.idPesanan}</div>
                    <div><strong>Nama:</strong> ${order.nama}</div>
                    <div><strong>Total Pcs:</strong> ${order.totalPcs}</div>
                </div>

                <table class="prod-items">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Jenis/Warna</th>
                            <th>Ukuran</th>
                            <th>Qty</th>
                            <th>Desain (Link Drive)</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    // Looping item desain (jika ada)
    if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
            
            // Format link desain
            let links = [];
            if(item.fileDepan) links.push(`<a href="${item.fileDepan.split('\\n')[0]}" target="_blank">Depan</a>`);
            if(item.fileBelakang) links.push(`<a href="${item.fileBelakang.split('\\n')[0]}" target="_blank">Blkng</a>`);
            if(item.fileLengan) links.push(`<a href="${item.fileLengan.split('\\n')[0]}" target="_blank">Lengan</a>`);
            
            let linksHtml = links.length > 0 ? links.join(' | ') : 'Polos / Tanpa Desain';

            html += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.jenisBaju || '-'} / ${item.warna || '-'}</td>
                    <td>
                        Dws: ${item.ukuranDewasa || '-'}<br>
                        Ank: ${item.ukuranAnak || '-'}
                    </td>
                    <td>${item.pcs}</td>
                    <td>${linksHtml}</td>
                </tr>
            `;
        });
    } else {
        html += `
            <tr>
                <td colspan="5" style="text-align:center;">
                    Data desain per item tidak ditemukan. (Mungkin murni custom dari teks detail pesanan)
                    <br><small>${order.detailPesanan.replace(/\\n/g, '<br>')}</small>
                </td>
            </tr>
        `;
    }

    html += `
                    </tbody>
                </table>
                <div style="margin-top:15px; font-size:10px;">
                    * Pastikan selalu cek link Drive untuk melihat mockup asli.
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;

    // Tunggu DOM update, lalu panggil print dialog
    setTimeout(() => {
        window.print();
    }, 500);
}
