// --- DATA INTI APLIKASI ---

const PERIODE_SAAT_INI = new Date(); 
PERIODE_SAAT_INI.setDate(1); 

// === PENGAMANAN DAN ISOLASI DATA MULTI-NURSERY (FIREBASE) ===
let isSupervisorMode = true; 

let CURRENT_NURSERY_ID = 'DEFAULT'; 

function getURLNurseryID() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('nursery');
        return id ? id.toUpperCase() : 'DEFAULT'; 
    } catch (e) {
        return 'DEFAULT';
    }
}

CURRENT_NURSERY_ID = getURLNurseryID();

// Tampilkan ID Nursery di Judul Halaman dan Header
const titleElement = document.getElementById('page-title');
if (titleElement) {
    titleElement.innerText = `Monitoring Sandbed - Nursery ID: ${CURRENT_NURSERY_ID}`;
}
const h1Element = document.querySelector('header h1');
if (h1Element) {
    h1Element.innerText = `Monitoring Sandbed Stoolplant (Nursery ID: ${CURRENT_NURSERY_ID})`;
}

// Data inisial (akan ditimpa jika berhasil terhubung ke Firebase)
let masterSandbed = []; 
let dataPerawatan = []; 
let nurseryName = "";
let supervisorName = "";
let sortDirectionMaster = 1; 
let currentSortColumnMaster = -1;


// --- ELEMEN HTML YANG DIBUTUHKAN ---
const nurseryInput = document.getElementById('nursery-name');
const supervisorInput = document.getElementById('supervisor-name');
const formPerawatan = document.getElementById('form-perawatan');
const riwayatBody = document.querySelector('#table-riwayat-perawatan tbody');
const searchInput = document.getElementById('search-input'); 
const selectBlock = document.getElementById('Block');
const masterSandbedBody = document.querySelector('#table-sandbed-list tbody');
const formMasterSandbed = document.getElementById('form-master-sandbed');
const searchMasterInput = document.getElementById('search-master-input'); 
const bahanAktifInput = document.getElementById('bahan-aktif'); 
const btnDownloadFormat = document.getElementById('btn-download-format');
const importFile = document.getElementById('import-file');
const btnImportData = document.getElementById('btn-import-data');
const fileInfo = document.getElementById('file-info');


// --- FUNGSI FIREBASE (PENGGANTI LOCAL STORAGE) ---

function saveMasterSandbedToFirebase() {
    database.ref('MasterSandbed/' + CURRENT_NURSERY_ID).set(masterSandbed)
        .catch(error => console.error("Firebase Save Error (Master):", error));
}

function savePerawatanToFirebase() {
    database.ref('RiwayatPerawatan/' + CURRENT_NURSERY_ID).set(dataPerawatan)
        .catch(error => console.error("Firebase Save Error (Perawatan):", error));
}

function saveHeaderInfoToFirebase() {
    const info = { nurseryName: nurseryInput.value, supervisorName: supervisorInput.value };
    database.ref('NurseryInfo/' + CURRENT_NURSERY_ID).set(info)
        .catch(error => console.error("Firebase Save Error (Info):", error));
}


function loadDataFromFirebase() {
    // 1. Master Sandbed - LISTEN PERUBAHAN REALTIME
    database.ref('MasterSandbed/' + CURRENT_NURSERY_ID).on('value', (snapshot) => {
        const data = snapshot.val();
        // Mengkonversi objek Firebase menjadi Array jika diperlukan
        masterSandbed = (data && typeof data === 'object' && !Array.isArray(data)) ? Object.values(data) : data || [];
        
        renderMasterSandbedTable(searchMasterInput.value || '');
        updateBlockSelectOptions();
        
        // Disable Nursery Name input, tapi isi valuenya dengan ID Nursery
        nurseryInput.value = CURRENT_NURSERY_ID;
        nurseryName = CURRENT_NURSERY_ID;
    });

    // 2. Riwayat Perawatan - LISTEN PERUBAHAN REALTIME
    database.ref('RiwayatPerawatan/' + CURRENT_NURSERY_ID).on('value', (snapshot) => {
        const data = snapshot.val();
        dataPerawatan = (data && typeof data === 'object' && !Array.isArray(data)) ? Object.values(data) : data || [];
        renderTable(searchInput.value || '');
    });

    // 3. Header Info (Supervisor Name) - LOAD SEKALI
    database.ref('NurseryInfo/' + CURRENT_NURSERY_ID).once('value', (snapshot) => {
        const info = snapshot.val() || {};
        // Nursery Name sudah diisi dari CURRENT_NURSERY_ID
        supervisorName = info.supervisorName || '';
        supervisorInput.value = supervisorName;
    });
}


// --- FUNGSI UTILITY (RUMUS, UPDATE SELECT) ---

function hitungUmurMP(bulanTanamStr) {
    if (!bulanTanamStr) return 'N/A';
    const bulanTanam = new Date(bulanTanamStr + '-01'); 
    const diffYears = PERIODE_SAAT_INI.getFullYear() - bulanTanam.getFullYear();
    const diffMonths = PERIODE_SAAT_INI.getMonth() - bulanTanam.getMonth();
    const umur = (diffYears * 12) + diffMonths;
    return umur >= 0 ? umur : 0;
}
function hitungTotalStock(stdQty, afkir, sulam) { 
    return parseInt(stdQty) - parseInt(afkir) + parseInt(sulam); 
}
function hitungStockingRate(totalStock, stdQty) {
    if (stdQty === 0) return '0%';
    const rate = (totalStock / stdQty) * 100;
    return rate.toFixed(2) + '%'; 
}

function updateBlockSelectOptions() {
    // Memastikan tidak ada nilai null/undefined di masterSandbed
    const validMasterSandbed = masterSandbed.filter(item => item && item.block);
    
    // Mendapatkan Block unik dan mengurutkannya
    const uniqueBlocks = [...new Set(validMasterSandbed.map(item => item.block))].sort();
    
    // Kosongkan Select Block (kecuali opsi pertama)
    while (selectBlock.options.length > 1) {
        selectBlock.remove(1);
    }
    
    uniqueBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block;
        option.textContent = block;
        selectBlock.appendChild(option);
    });
}


// --- FUNGSI RENDER TABEL MASTER ---
let isEditing = false; 
let currentEditId = null;

function renderMasterSandbedTable(searchText = '') {
    masterSandbedBody.innerHTML = ''; 
    const filterText = searchText.toLowerCase().trim();

    const filteredMasterData = masterSandbed.filter(data => {
        const combinedString = `${data.block} ${data.id} ${data.clone}`.toLowerCase();
        return combinedString.includes(filterText);
    });
    const displayData = filteredMasterData; 

    if (displayData.length === 0) {
        masterSandbedBody.innerHTML = '<tr><td colspan="12" style="text-align: center;">Tidak ada Sandbed yang tercatat.</td></tr>';
        return;
    }

    displayData.forEach((data, index) => {
        const umurMp = hitungUmurMP(data.bulanTanam);
        const totalStock = hitungTotalStock(data.stdQty, data.afkir, data.sulam);
        const stockingRate = hitungStockingRate(totalStock, data.stdQty);

        const row = masterSandbedBody.insertRow();
        
        row.insertCell(0).innerText = index + 1; 
        row.insertCell(1).innerText = data.block; 
        row.insertCell(2).innerText = data.id; 
        row.insertCell(3).innerText = data.clone; 
        row.insertCell(4).innerText = data.bulanTanam || '-'; 
        row.insertCell(5).innerText = umurMp; 
        row.insertCell(6).innerText = data.stdQty;
        row.insertCell(7).innerText = data.afkir;
        row.insertCell(8).innerText = data.sulam;
        row.insertCell(9).innerText = totalStock; 
        row.insertCell(10).innerText = stockingRate; 

        const actionCell = row.insertCell(11); 
        
        // Mode Edit/Hapus Selalu Aktif
        const editButton = document.createElement('button');
        editButton.innerText = 'Edit';
        editButton.classList.add('btn-edit-master');
        editButton.dataset.sandbedId = data.id; 
        editButton.addEventListener('click', editSandbed);
        actionCell.appendChild(editButton);
        
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Hapus';
        deleteButton.classList.add('btn-hapus-master');
        deleteButton.dataset.sandbedId = data.id; 
        deleteButton.addEventListener('click', deleteSandbed);
        actionCell.appendChild(deleteButton);
    });
}


function editSandbed(event) { 
    const idToEdit = event.currentTarget.dataset.sandbedId;
    const sandbedData = masterSandbed.find(sandbed => sandbed.id === idToEdit);

    if (sandbedData) {
        isEditing = true;
        currentEditId = idToEdit;

        document.getElementById('master-block').value = sandbedData.block;
        document.getElementById('master-id').value = sandbedData.id;
        document.getElementById('master-id').disabled = true;
        document.getElementById('master-clone').value = sandbedData.clone;
        document.getElementById('master-bulan-tanam').value = sandbedData.bulanTanam;
        document.getElementById('master-std-qty').value = sandbedData.stdQty;
        document.getElementById('master-afkir').value = sandbedData.afkir;
        document.getElementById('master-sulam').value = sandbedData.sulam;

        document.getElementById('btn-tambah-sandbed').innerText = 'Update Data Sandbed';
        
        document.getElementById('master-data-sandbed').scrollIntoView({ behavior: 'smooth' });

        alert(`Anda sedang mengedit data Sandbed ID: ${idToEdit}`);
    }
}

function deleteSandbed(event) { 
    const idToDelete = event.currentTarget.dataset.sandbedId;
    if (confirm(`Apakah Anda yakin ingin menghapus Sandbed ID: ${idToDelete}?`)) {
        masterSandbed = masterSandbed.filter(sandbed => sandbed.id !== idToDelete);
        
        saveMasterSandbedToFirebase(); // <--- FIREBASE SAVE
        alert(`Sandbed ID ${idToDelete} berhasil dihapus.`);
        
        // Render ulang data akan dipicu oleh listener Firebase
    }
}

// FUNGSI RENDER TABLE RIWAYAT
function renderTable(searchText = '') {
    riwayatBody.innerHTML = ''; 
    const filterText = searchText.toLowerCase().trim();

    const filteredData = dataPerawatan.filter(data => {
        const combinedString = `${data.block} ${data.jenis} ${data.material} ${data.bahanAktif} ${data.catatan}`.toLowerCase();
        return combinedString.includes(filterText);
    });
    
    const displayData = filteredData; 

    if (displayData.length === 0) {
        riwayatBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada riwayat perawatan yang tercatat.</td></tr>';
        return;
    }

    displayData.slice().reverse().forEach(data => {
        const row = riwayatBody.insertRow();
        
        row.insertCell(0).innerText = data.tanggal; 
        row.insertCell(1).innerText = data.block; 
        row.insertCell(2).innerText = data.jenis; 
        row.insertCell(3).innerText = data.material; 
        row.insertCell(4).innerText = data.bahanAktif; 
        row.insertCell(5).innerText = data.dosis; 
        row.insertCell(6).innerText = data.catatan; 
    });
}

// --- FUNGSI SORTING MASTER SANDBED (TIDAK BERUBAH) ---
window.sortTableMaster = function(columnIndex) {
    if (currentSortColumnMaster === columnIndex) {
        sortDirectionMaster *= -1; 
    } else {
        currentSortColumnMaster = columnIndex;
        sortDirectionMaster = 1; 
    }

    let key;
    let isNumeric = false;
    
    switch (columnIndex) {
        case 1: key = 'block'; break;
        case 2: key = 'id'; break;
        case 3: key = 'clone'; break;
        case 4: key = 'bulanTanam'; break; 
        case 6: key = 'stdQty'; isNumeric = true; break;
        case 7: key = 'afkir'; isNumeric = true; break;
        case 8: key = 'sulam'; isNumeric = true; break;
        case 9: 
            masterSandbed.sort((a, b) => {
                const totalA = hitungTotalStock(a.stdQty, a.afkir, a.sulam);
                const totalB = hitungTotalStock(b.stdQty, b.afkir, b.sulam);
                return (totalA - totalB) * sortDirectionMaster;
            });
            renderMasterSandbedTable(searchMasterInput.value); 
            return; 
        default: 
            key = null; 
            if (columnIndex === 0) {
                key = 'id';
            } else {
                return; 
            }
    }

    masterSandbed.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (isNumeric) {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            return (valA - valB) * sortDirectionMaster;
        } 
        
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        return valA.toString().localeCompare(valB.toString()) * sortDirectionMaster;
    });

    renderMasterSandbedTable(searchMasterInput.value);
}


// --- EVENT LISTENERS ---

// Event Listeners untuk Header Info
// Nursery Name disabled, hanya Supervisor Name yang bisa diubah
supervisorInput.addEventListener('input', function() {
    supervisorName = this.value;
    saveHeaderInfoToFirebase(); // <--- FIREBASE SAVE
});


// EVENT LISTENER MASTER SANDBED (Tambah/Update) 
formMasterSandbed.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const block = document.getElementById('master-block').value;
    const id = document.getElementById('master-id').value.toUpperCase(); 
    const clone = document.getElementById('master-clone').value;
    const bulanTanam = document.getElementById('master-bulan-tanam').value;
    const stdQtyStr = document.getElementById('master-std-qty').value.trim();
    const afkirStr = document.getElementById('master-afkir').value.trim();
    const sulamStr = document.getElementById('master-sulam').value.trim();

    if (!block || !id || !bulanTanam || !stdQtyStr || !afkirStr || !sulamStr) {
        alert("VALIDASI GAGAL: Semua kolom Master Data wajib diisi.");
        return; 
    }
    
    const stdQty = parseInt(stdQtyStr);
    const afkir = parseInt(afkirStr);
    const sulam = parseInt(sulamStr);


    if (isEditing) {
        
        const index = masterSandbed.findIndex(sandbed => sandbed.id === currentEditId);
        if (index !== -1) {
            masterSandbed[index].block = block;
            masterSandbed[index].clone = clone;
            masterSandbed[index].bulanTanam = bulanTanam;
            masterSandbed[index].stdQty = stdQty;
            masterSandbed[index].afkir = afkir;
            masterSandbed[index].sulam = sulam;
            alert(`Data Sandbed ID ${id} berhasil diperbarui (Update)!`);
        }
        isEditing = false;
        currentEditId = null;
        document.getElementById('master-id').disabled = false;
        document.getElementById('btn-tambah-sandbed').innerText = 'Tambah Sandbed Baru';

    } else {
        const isDuplicate = masterSandbed.some(sandbed => sandbed.id === id);
        if (isDuplicate) {
            alert(`VALIDASI GAGAL: Sandbed ID ${id} sudah ada dalam daftar. Gunakan ID unik.`);
            return;
        }

        const newSandbed = { id: id, block: block, plot: 'N/A', clone: clone, bulanTanam: bulanTanam, stdQty: stdQty, afkir: afkir, sulam: sulam };
        masterSandbed.push(newSandbed);
        alert(`Sandbed ID ${id} berhasil ditambahkan!`);
    }

    saveMasterSandbedToFirebase(); // <--- FIREBASE SAVE
    formMasterSandbed.reset();
    
    // Render ulang data akan dipicu oleh listener Firebase
});


// EVENT LISTENER FORM PERAWATAN 
formPerawatan.addEventListener('submit', function(e) {
    e.preventDefault(); 
    
    const block = selectBlock.value; 
    const tglPerawatan = document.getElementById('tgl-perawatan').value;
    const jenisPerawatan = document.getElementById('jenis-perawatan').value;
    const materialDigunakan = document.getElementById('Material-yang-digunakan').value; 
    const bahanAktif = bahanAktifInput.value; 
    const dosis = document.getElementById('dosis').value;
    const catatan = document.getElementById('catatan').value;

    if (!block || !tglPerawatan || !jenisPerawatan || !materialDigunakan || !bahanAktif || !dosis) {
        alert("Mohon lengkapi semua kolom input yang diperlukan (kecuali Catatan)!");
        return;
    }

    const dataBaru = {
        block: block, tanggal: tglPerawatan, jenis: jenisPerawatan,
        material: materialDigunakan, bahanAktif: bahanAktif, dosis: dosis, catatan: catatan
    };

    dataPerawatan.push(dataBaru);
    savePerawatanToFirebase(); // <--- FIREBASE SAVE
    formPerawatan.reset();
    
    alert(`Perawatan ${jenisPerawatan} di ${block} berhasil direkam!`);
    
    // Render ulang data akan dipicu oleh listener Firebase
});


// EVENT LISTENER PENCARIAN RIWAYAT
searchInput.addEventListener('input', function() {
    renderTable(searchInput.value || ''); 
});

// EVENT LISTENER PENCARIAN MASTER SANDBED
searchMasterInput.addEventListener('input', function() {
    renderMasterSandbedTable(searchMasterInput.value || ''); 
});

// --- FUNGSI IMPORT/EXPORT ---

// Fungsi untuk mengunduh CSV (tetap pertahankan)
btnDownloadFormat.addEventListener('click', function() {
    const dataToExport = masterSandbed; 
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 

    // Header CSV (Ganti Plot dengan Clone jika perlu)
    const headers = ["Block", "ID Sandbed", "Clone", "Bulan Tanam", "Std Qty", "Afkir", "Sulam"];
    csvContent += headers.join(";") + "\r\n";

    // Data CSV
    dataToExport.forEach(item => {
        const row = [
            `"${item.block}"`, 
            `"${item.id}"`, 
            `"${item.clone}"`, 
            `"${item.bulanTanam}"`, 
            item.stdQty, 
            item.afkir, 
            item.sulam
        ].join(";"); 
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MasterSandbed_${CURRENT_NURSERY_ID}_Export.csv`);
    document.body.appendChild(link); // Diperlukan untuk Firefox
    link.click();
    document.body.removeChild(link);
});

// Fungsi Import (tetap pertahankan)
importFile.addEventListener('change', function() {
    if (this.files.length > 0) {
        btnImportData.disabled = false;
        fileInfo.innerText = `File terpilih: ${this.files[0].name}`;
    } else {
        btnImportData.disabled = true;
        fileInfo.innerText = '';
    }
});

btnImportData.addEventListener('click', function() {
    const file = importFile.files[0];
    if (!file) {
        alert("Pilih file CSV terlebih dahulu.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const csv = e.target.result;
        const lines = csv.split('\n').filter(line => line.trim() !== '');

        if (lines.length <= 1) {
            alert("File CSV kosong atau hanya berisi header.");
            return;
        }

        // Asumsi format CSV: Block;ID Sandbed;Clone;Bulan Tanam;Std Qty;Afkir;Sulam
        const importedData = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(';'); 
            if (values.length >= 7) { 
                importedData.push({
                    block: values[0].replace(/"/g, '').trim(),
                    id: values[1].replace(/"/g, '').trim().toUpperCase(),
                    clone: values[2].replace(/"/g, '').trim(),
                    bulanTanam: values[3].replace(/"/g, '').trim(),
                    stdQty: parseInt(values[4]) || 0,
                    afkir: parseInt(values[5]) || 0,
                    sulam: parseInt(values[6]) || 0,
                });
            }
        }

        if (confirm(`Akan mengimpor/menimpa ${importedData.length} data Master Sandbed. Lanjutkan? Data akan disimpan ke Firebase.`)) {
            masterSandbed = importedData; 
            saveMasterSandbedToFirebase(); // <--- FIREBASE SAVE
            
            // Render ulang data akan dipicu oleh listener Firebase
            
            alert(`${importedData.length} data berhasil diimpor dan disimpan ke Firebase.`);
        }
    };
    reader.readAsText(file);
});


// --- INITIAL CALLS ---
loadDataFromFirebase(); // Mulai memuat data dari Firebase
