// ============================================================
//  CLOVERTEES — Proyek 3: Admin Dashboard Backend
//  GAS Project Terpisah untuk Admin Dashboard (Read Only)
//
//  Sheets ID : 133ENleDfF5-8Tt2c5bFHSIPKmjtYtSR89vCaFua7v-c
// ============================================================

var CFG = {
  SPREADSHEET_ID: '133ENleDfF5-8Tt2c5bFHSIPKmjtYtSR89vCaFua7v-c',
  SHEET_ORDER: 'Orderan',
  SHEET_DESIGN: 'Desain',
};

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === 'getOrders') {
    return ContentService.createTextOutput(JSON.stringify(getOrdersData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);
    if (p.action === 'approveOrder') {
      return ContentService.createTextOutput(JSON.stringify(approveOrder(p.idPesanan, p.ongkir, p.totalHarga)))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function approveOrder(idPesanan, ongkir, totalHarga) {
  try {
    var ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(CFG.SHEET_ORDER);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim() === String(idPesanan).trim()) {
        
        if (ongkir !== undefined && ongkir !== '') {
          sheet.getRange(i + 1, 9).setValue(ongkir);
          data[i][8] = ongkir;
        }
        if (totalHarga !== undefined && totalHarga !== '') {
          sheet.getRange(i + 1, 10).setValue(totalHarga);
          data[i][9] = totalHarga;
        }

        // Status ada di kolom K (indeks 10, Kolom ke-11)
        sheet.getRange(i + 1, 11).setValue('Approved');
        
        // --- AUTO-CREATE TASK KANBAN ---
        try {
          autoCreateTaskInKanban(ss, data[i], idPesanan);
        } catch(kanbanErr) {
          // Log error tapi jangan gagalkan proses approve
          Logger.log("Gagal buat task kanban: " + kanbanErr.toString());
        }
        
        return { result: 'success' };
      }
    }
    return { result: 'error', message: 'Pesanan tidak ditemukan' };
  } catch (err) {
    return { result: 'error', message: err.toString() };
  }
}

// Enable CORS for testing (Preflight)
function doOptions(e) {
  return ContentService.createTextOutput("OK")
    .setMimeType(ContentService.MimeType.TEXT);
}

function getOrdersData() {
  try {
    var ss = SpreadsheetApp.openById(CFG.SPREADSHEET_ID);
    var orderSheet = ss.getSheetByName(CFG.SHEET_ORDER);
    var designSheet = ss.getSheetByName(CFG.SHEET_DESIGN);
    
    // Get Orderan
    var orderData = orderSheet.getDataRange().getValues();
    if (orderData.length < 2) return { result: 'success', orders: [] }; // Empty
    
    var orderHeaders = orderData[0];
    var ordersList = [];
    
    for (var i = 1; i < orderData.length; i++) {
      var row = orderData[i];
      if (!row[0]) continue; // Skip empty rows
      
      ordersList.push({
        idPesanan: row[0],
        timestamp: row[1],
        nama: row[2],
        whatsapp: row[3],
        instagram: row[4],
        alamat: row[5],
        detailPesanan: row[6],
        totalPcs: row[7],
        ongkir: row[8],
        totalHarga: row[9],
        status: row[10] || 'Pending',
        items: [] // Akan diisi dari tab Desain
      });
    }
    
    // Get Desain
    var designData = designSheet.getDataRange().getValues();
    if (designData.length >= 2) {
      for (var j = 1; j < designData.length; j++) {
        var dRow = designData[j];
        var dIdPesanan = dRow[0];
        
        if (!dIdPesanan) continue;
        
        var itemDetail = {
          jenisBaju: dRow[2],
          warna: dRow[3],
          ukuranDewasa: dRow[4],
          ukuranAnak: dRow[5],
          pcs: dRow[6],
          desainDepan: dRow[7],
          desainBelakang: dRow[8],
          desainLengan: dRow[9],
          fileDepan: dRow[10],
          fileBelakang: dRow[11],
          fileLengan: dRow[12]
        };
        
        // Find matching order
        var matchOrder = ordersList.find(function(o) { return o.idPesanan === dIdPesanan; });
        if (matchOrder) {
          matchOrder.items.push(itemDetail);
        }
      }
    }
    
    // Urutkan dari yang terbaru (bisa di frontend juga, tapi amannya dari backend)
    ordersList.reverse();
    
    return {
      result: 'success',
      orders: ordersList
    };
    
  } catch (err) {
    return { result: 'error', message: err.toString() };
  }
}

// ============================================================
// FUNGSI AUTO-CREATE KANBAN (PROYEK 4)
// ============================================================

function autoCreateTaskInKanban(ss, orderRow, idPesanan) {
  var pSheet = ss.getSheetByName('P4_Projects');
  if(!pSheet) return; // Kanban belum diinisialisasi
  
  var projects = _readSheet(ss, 'P4_Projects', ['id','name','color','createdAt','month']);
  if (!projects.length) return; // Belum ada project
  
  // Ambil project terbaru (berdasarkan baris terakhir)
  var latestProject = projects[projects.length - 1];
  var projectId = latestProject.id;
  
  var cols = _readSheet(ss, 'P4_Columns', ['id','projectId','name','color','pos']).filter(function(c){return c.projectId===projectId;});
  cols.sort(function(a,b){return parseInt(a.pos)-parseInt(b.pos);});
  if(!cols.length) return;
  var firstColId = cols[0].id;
  
  var existingTasks = _readSheet(ss, 'P4_Tasks', ['id','projectId','columnId','title','notes','priority','dueDate','assignee','createdAt','updatedAt','sourceId']);
  var alreadyExists = existingTasks.some(function(t) { return String(t.sourceId) === String(idPesanan) && t.projectId === projectId; });
  if (alreadyExists) return; // Task sudah ada
  
  var dRows = ss.getSheetByName(CFG.SHEET_DESIGN) ? ss.getSheetByName(CFG.SHEET_DESIGN).getDataRange().getValues() : [];
  var dMap = {};
  for(var i=1;i<dRows.length;i++){
    var dk=String(dRows[i][0]).trim();
    if(dk !== String(idPesanan).trim()) continue;
    if(!dMap[dk]) dMap[dk]=[];
    dMap[dk].push({
      jenisBaju:dRows[i][2], warna:dRows[i][3], ukuranDewasa:dRows[i][4], ukuranAnak:dRows[i][5], pcsItem:dRows[i][6],
      desainDepan:dRows[i][7], desainBelakang:dRows[i][8], desainLengan:dRows[i][9],
      fileDepan:dRows[i][10], fileBelakang:dRows[i][11], fileLengan:dRows[i][12]
    });
  }
  
  var r = orderRow;
  var no = idPesanan;
  var nama = String(r[2]||'');
  var designs = dMap[no] || [];
  
  var nl=['━━ DATA PENGIRIMAN ━━','Nama    : '+nama,'HP      : '+r[3],'Alamat  : '+r[5],'Ongkir  : Rp '+r[8],'','━━ DETAIL ORDER ━━','No. Pesanan : '+no,'Nama    : '+nama,''];
  designs.forEach(function(d){
    if(d.jenisBaju)nl.push(String(d.jenisBaju).toUpperCase());
    if(d.warna)nl.push(d.warna);
    if(d.ukuranDewasa&&String(d.ukuranDewasa).trim()&&d.ukuranDewasa!=='-')nl.push('Dewasa : '+d.ukuranDewasa);
    if(d.ukuranAnak&&String(d.ukuranAnak).trim()&&d.ukuranAnak!=='-')nl.push('Kids   : '+d.ukuranAnak);
    nl.push('');
  });
  nl.push('Total PCS   : '+r[7]);nl.push('Total Harga : Rp '+r[9]);
  
  var tid = _generateUid();
  var now = new Date();
  
  var ts = ss.getSheetByName('P4_Tasks');
  var act = ss.getSheetByName('P4_Activity');
  var cms = ss.getSheetByName('P4_Comments');
  
  if(!ts || !act || !cms) return;
  
  ts.appendRow([tid, projectId, firstColId, no+' — '+nama, nl.join('\n'), '', '', '', now, now, no]);
  act.appendRow([_generateUid(), tid, 'created', 'system', 'Order '+no+' otomatis disinkron setelah Approve di Admin', now]);
  
  designs.forEach(function(d){
    var lines=[nama,(d.warna||'')+' - '+(d.jenisBaju||'')];
    if(d.ukuranDewasa&&d.ukuranDewasa!=='-')lines.push('Dewasa : '+d.ukuranDewasa);
    if(d.ukuranAnak&&d.ukuranAnak!=='-')lines.push('Anak   : '+d.ukuranAnak);
    if(d.pcsItem)lines.push('PCS    : '+d.pcsItem);
    if(d.desainDepan){lines.push('');lines.push('Desain Depan :');lines.push(String(d.desainDepan));}
    if(d.desainBelakang){lines.push('Desain Belakang :');lines.push(String(d.desainBelakang));}
    if(d.desainLengan){lines.push('Desain Lengan :');lines.push(String(d.desainLengan));}
    if(d.fileDepan){lines.push('');lines.push('File Depan :');lines.push(String(d.fileDepan));}
    if(d.fileBelakang){lines.push('File Belakang :');lines.push(String(d.fileBelakang));}
    if(d.fileLengan){lines.push('File Lengan :');lines.push(String(d.fileLengan));}
    cms.appendRow([_generateUid(), tid, lines.join('\n'), 'system', 'TRUE', now]);
  });
}

function _readSheet(ss, name, keys) {
  var s=ss.getSheetByName(name);
  if(!s)return[];
  var rows=s.getDataRange().getValues(),out=[];
  for(var i=1;i<rows.length;i++){
    if(!rows[i][0])continue;
    var o={};
    keys.forEach(function(k,j){o[k]=rows[i][j]===undefined?'':rows[i][j];});
    out.push(o);
  }
  return out;
}

function _generateUid() {
  return 'T'+Date.now().toString(36)+Math.random().toString(36).slice(2,5);
}
