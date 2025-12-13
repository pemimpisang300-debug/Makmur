
// --- DATA INTI APLIKASI ---

const PERIODE_SAAT_INI = new Date(); 
PERIODE_SAAT_INI.setDate(1); 

// START: SETUP MULTI-NURSERY (KRITIS UNTUK ISOLASI DATA)
let CURRENT_NURSERY_ID = 'DEFAULT'; 

function getURLNurseryID() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('nursery');
        // Mengembalikan ID dalam huruf kapital (misal: 'A'), atau 'DEFAULT' jika tidak ada parameter
        return id ? id.toUpperCase() : 'DEFAULT'; 
    } catch (e) {
        return 'DEFAULT';
    }
}

CURRENT_NURSERY_ID = getURLNurseryID();

// FUNGSI PENGAMBIL DATA MASTER (DIPERLUKAN UNTUK VALIDASI ID UNIK)
function getDataMasterSandbed() {
    // Key penyimpanan sekarang unik per nursery
    const storageKey = 'masterSandbedData_' + CURRENT_NURSERY_ID; 
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
}
// END: SETUP MULTI-NURSERY

function tambahSandbedBaru() {
    // Fungsi ini tidak dipakai langsung, validasi dipindahkan ke event listener
}

// DATA MASTER (akan ditimpa jika ada data di LocalStorage)
let masterSandbed = [
    { block: "Block B", id: "MKRUS001", plot: "N/A", clone: "AC00065AA", bulanTanam: "2023-12", stdQty: 2352, afkir: 352, sulam: 2 },
    { block: "Block B", id: "MKRUS002", plot: "N/A", clone: "AC00065AA", bulanTanam: "2023-12", stdQty: 2352, afkir: 317, sulam: 0 },
    { block: "Block C", id: "MKRUS101", plot: "N/A", clone: "AC00088AA", bulanTanam: "2024-03", stdQty: 2352, afkir: 150, sulam: 5 },
    { block: "Block D", id: "MKRUS201", plot: "N/A", clone: "AC00354AA", bulanTanam: "2024-05", stdQty: 2352, afkir: 0, sulam: 0 },
];

// Data Riwayat Perawatan 
let dataPerawatan = [
    { block: "Block B", tanggal: "2024-12-01", jenis: "Insektisida", material: "Endure", bahanAktif: "Spinetoram", dosis: "2 ml", catatan: "" },
    { block: "Block C", tanggal: "2024-12-04", jenis: "Pemupukan", material: "N Tinggi", bahanAktif: "NPK 29,10,10", dosis: "3 gr", catatan: "Aplikasi Manual" },
];

// NEW: Variabel untuk Header Info
let nurseryName = "";
let supervisorName = "";


// --- VARIABEL SORTING GLOBAL ---
let sortDirectionMaster = 1; 
let currentSortColumnMaster = -1;


// --- ELEMEN HTML YANG DIBUTUHKAN ---

// NEW: Elemen Input Header
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

// --- ELEMEN UNTUK IMPORT MASTER SANDBED ---
const btnDownloadFormat = document.getElementById('btn-download-format');
const importFile = document.getElementById('import-file');
const btnImportData = document.getElementById('btn-import-data');
const fileInfo = document.getElementById('file-info');


// --- FUNGSI LOCAL STORAGE (PENYIMPANAN DATA PERMANEN) ---
// MODIFIED: Menggunakan CURRENT_NURSERY_ID untuk isolasi data
function loadDataFromLocalStorage() {
    // Kunci penyimpanan sekarang unik per nursery
    const sandbedKey = 'masterSandbedData_' + CURRENT_NURSERY_ID;
    const perawatanKey = 'dataPerawatanData_' + CURRENT_NURSERY_ID;
    
    // Header Info tetap global, agar Anda tidak perlu mengisi Supervisor/Nursery berulang
    const storedNursery = localStorage.getItem('nurseryName');
    const storedSupervisor = localStorage.getItem('supervisorName');

    // Jika ada data di browser, timpa data inisial
    const storedSandbed = localStorage.getItem(sandbedKey);
    const storedPerawatan = localStorage.getItem(perawatanKey);
    
    if (storedSandbed) {
        masterSandbed = JSON.parse(storedSandbed);
    } else {
        // Jika tidak ada data tersimpan, gunakan data inisial (hardcoded)
        masterSandbed = [
            { block: "Block B", id: "MKRUS001", plot: "N/A", clone: "AC00065AA", bulanTanam: "2023-12", stdQty: 2352, afkir: 352, sulam: 2 },
            // ... (sisanya sama dengan data inisial anda)
        ];
    }
    if (storedPerawatan) {
        dataPerawatan = JSON.parse(storedPerawatan);
    }
    
    // Tampilkan data Nursery dan Supervisor
    if (storedNursery) {
        nurseryName = storedNursery;
        nurseryInput.value = nurseryName;
    }
    if (storedSupervisor) {
        supervisorName = storedSupervisor;
        supervisorInput.value = supervisorName;
    }
}

// MODIFIED: Menggunakan CURRENT_NURSERY_ID untuk isolasi data
function saveDataToLocalStorage() {
    // Simpan data Master dan Riwayat Perawatan menggunakan key unik
    const sandbedKey = 'masterSandbedData_' + CURRENT_NURSERY_ID;
    const perawatanKey = 'dataPerawatanData_' + CURRENT_NURSERY_ID;
    
    localStorage.setItem(sandbedKey, JSON.stringify(masterSandbed));
    localStorage.setItem(perawatanKey, JSON.stringify(dataPerawatan));
    
    // Simpan data Nursery dan Supervisor (Key ini tetap global)
    localStorage.setItem('nurseryName', nurseryName);
    localStorage.setItem('supervisorName', supervisorName);
}


// --- FUNGSI RUMUS OTOMATIS (Tidak ada perubahan) ---
function hitungUmurMP(bulanTanamStr) {
    if (!bulanTanamStr) return 'N/A';
    const bulanTanam = new Date(bulanTanamStr + '-01'); 
    const diffYears = PERIODE_SAAT_INI.getFullYear() - bulanTanam.getFullYear();
    const diffMonths = PERIODE_SAAT_INI.getMonth() - bulanTanam.getMonth();
    const umur = (diffYears * 12) + diffMonths;
    return umur >= 0 ? umur : 0;
}
function hitungTotalStock(stdQty, afkir, sulam) { return stdQty - afkir + sulam; }
function hitungStockingRate(totalStock, stdQty) {
    if (stdQty === 0) return '0%';
    const rate = (totalStock / stdQty) * 100;
    return rate.toFixed(2) + '%'; 
}


// --- FUNGSI SORTING MASTER SANDBED (Tidak ada perubahan) ---
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
        case 9: // Total Stock (dihitung, sorting khusus)
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


// --- FUNGSI UNTUK MENGATUR TABEL MASTER (Tidak ada perubahan) ---
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
        masterSandbedBody.innerHTML = '<tr><td colspan="12" style="text-align: center;">Tidak ada Sandbed yang cocok dengan kriteria pencarian.</td></tr>';
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
        saveDataToLocalStorage(); 
        renderMasterSandbedTable();
        alert(`Sandbed ID ${idToDelete} berhasil dihapus.`);
    }
}

// FUNGSI RENDER TABLE RIWAYAT (Tidak ada perubahan)
function renderTable(searchText = '') {
    riwayatBody.innerHTML = ''; 
    const filterText = searchText.toLowerCase().trim();

    const filteredData = dataPerawatan.filter(data => {
        const combinedString = `${data.block} ${data.jenis} ${data.material} ${data.bahanAktif} ${data.catatan}`.toLowerCase();
        return combinedString.includes(filterText);
    });
    
    const displayData = filteredData; 

    if (displayData.length === 0) {
        riwayatBody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data yang cocok dengan kriteria pencarian.</td></tr>';
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


// --- FUNGSI IMPORT DAN EXPORT MASTER SANDBED (Tidak ada perubahan) ---

function downloadCsvTemplate() {
    const headers = ["Block", "id", "clone", "bulanTanam", "stdQty", "afkir", "sulam"];
    const exampleData = [
        "Block E", "MKRUS501", "AC00555AA", "2024-06", "2352", "0", "0",
        "Block F", "MKRUS601", "AC00666AA", "2024-06", "2352", "100", "5"
    ];
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(";") + "\n"; 
    csvContent += exampleData.join(";") + "\n"; 
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "format_import_sandbed_semicolon.csv"); 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importCsvData() {
    const file = importFile.files[0];
    if (!file) {
        alert("Pilih file CSV terlebih dahulu.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const csvText = e.target.result;
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length <= 1) {
            alert("File kosong atau hanya berisi header.");
            return;
        }

        const delimiter = ';'; 
        const headers = ["Block", "id", "clone", "bulanTanam", "stdQty", "afkir", "sulam"];
        let importedCount = 0;
        let failedCount = 0;
        let updatedCount = 0;

        // Ambil data dari LocalStorage yang terisolasi
        masterSandbed = getDataMasterSandbed(); 

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(delimiter).map(v => v.trim().replace(/"/g, '')); 
            
            if (values.length < headers.length) {
                console.error(`Gagal memproses baris ${i + 1}: Kolom kurang atau delimiter salah. Baris: ${lines[i]}`);
                failedCount++;
                continue;
            }

            const data = {
                block: values[0] || 'N/A',
                id: values[1].toUpperCase(),
                clone: values[2] || 'N/A',
                bulanTanam: values[3] || '',
                stdQty: parseInt(values[4]) || 0, 
                afkir: parseInt(values[5]) || 0,
                sulam: parseInt(values[6]) || 0,
                plot: 'N/A'
            };
            
            if (!data.id) {
                console.error(`Gagal memproses baris ${i + 1}: Kolom ID Sandbed kosong. Baris: ${lines[i]}`);
                failedCount++;
                continue;
            }

            const existingIndex = masterSandbed.findIndex(sandbed => sandbed.id === data.id);

            if (existingIndex !== -1) {
                masterSandbed[existingIndex] = data;
                updatedCount++;
            } else {
                masterSandbed.push(data);
                importedCount++;
            }
        }

        importFile.value = '';
        btnImportData.disabled = true;
        fileInfo.innerText = '';
        
        saveDataToLocalStorage(); 
        renderMasterSandbedTable(); 
        
        alert(`Import Master Sandbed Selesai! (Delimiter: ${delimiter})
        - Data Baru Ditambahkan: ${importedCount}
        - Data Diperbarui: ${updatedCount}
        - Data Gagal: ${failedCount}
        
        Jika ada kegagalan, pastikan file CSV menggunakan TITIK KOMA (;) sebagai pemisah.`);
    };

    reader.onerror = function() {
        alert("Gagal membaca file.");
    };

    reader.readAsText(file);
}


// --- EVENT LISTENERS ---

// NEW: Event Listeners untuk Header Info
nurseryInput.addEventListener('input', function() {
    nurseryName = this.value;
    saveDataToLocalStorage();
});

supervisorInput.addEventListener('input', function() {
    supervisorName = this.value;
    saveDataToLocalStorage();
});

// EVENT LISTENERS IMPORT MASTER SANDBED
btnDownloadFormat.addEventListener('click', downloadCsvTemplate);

importFile.addEventListener('change', function() {
    if (this.files.length > 0) {
        btnImportData.disabled = false;
        fileInfo.innerText = `File terpilih: ${this.files[0].name}`;
    } else {
        btnImportData.disabled = true;
        fileInfo.innerText = '';
    }
});

btnImportData.addEventListener('click', importCsvData);


// EVENT LISTENER MASTER SANDBED (Tambah/Update) 
formMasterSandbed.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // --- START: VALIDASI INPUT KERAS (diulang di sini untuk fungsi utama) ---
    const block = document.getElementById('master-block').value;
    const id = document.getElementById('master-id').value.toUpperCase(); 
    const clone = document.getElementById('master-clone').value;
    const bulanTanam = document.getElementById('master-bulan-tanam').value;
    const stdQtyStr = document.getElementById('master-std-qty').value.trim();
    const afkirStr = document.getElementById('master-afkir').value.trim();
    const sulamStr = document.getElementById('master-sulam').value.trim();

    // 1. Cek Wajib Diisi (Required Check)
    if (!block || !id || !bulanTanam || !stdQtyStr || !afkirStr || !sulamStr) {
        alert("VALIDASI GAGAL: Semua kolom Master Data wajib diisi.");
        return; 
    }

    // 2. Cek Hanya Angka (Numeric Check)
    if (isNaN(stdQtyStr) || isNaN(afkirStr) || isNaN(sulamStr)) {
        alert("VALIDASI GAGAL: Kolom Jumlah Standar MP, Afkir, dan Sulam hanya boleh diisi dengan angka.");
        return; 
    }
    
    const stdQty = parseInt(stdQtyStr);
    const afkir = parseInt(afkirStr);
    const sulam = parseInt(sulamStr);
    
    // --- END: VALIDASI INPUT KERAS ---

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
        // 3. Cek ID Unik (Uniqueness Check) saat menambah baru
        const isDuplicate = masterSandbed.some(sandbed => sandbed.id === id);
        if (isDuplicate) {
            alert(`VALIDASI GAGAL: Sandbed ID ${id} sudah ada dalam daftar. Gunakan ID unik.`);
            return;
        }

        const newSandbed = { block, id, plot: 'N/A', clone, bulanTanam, stdQty, afkir, sulam };
        masterSandbed.push(newSandbed);
        alert(`Sandbed ID ${id} berhasil ditambahkan!`);
    }

    saveDataToLocalStorage(); 
    formMasterSan
