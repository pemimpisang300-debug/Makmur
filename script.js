// --- DATA INTI APLIKASI ---

const PERIODE_SAAT_INI = new Date(); 
PERIODE_SAAT_INI.setDate(1); 

// === START: PENGAMANAN DAN ISOLASI DATA MULTI-NURSERY ===
const SUPERVISOR_KEY = "makmur2025"; 
let isSupervisorMode = false; // Mode terkunci secara default

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

// Tetapkan ID Nursery Saat Ini
CURRENT_NURSERY_ID = getURLNURSERY_ID();
// === END: PENGAMANAN DAN ISOLASI DATA MULTI-NURSERY ===

// Variabel data kini kosong, data akan langsung dimuat dari Firebase
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

// Fungsi yang dipanggil saat data berubah di database
function startDataListener() {
    // Path: /MASTER_SANDBED/[NURSERY_ID]
    const masterRef = database.ref('MASTER_SANDBED/' + CURRENT_NURSERY_ID);
    
    // Membaca data Sandbed
    masterRef.on('value', (snapshot) => {
        const dataObject = snapshot.val();
        masterSandbed = [];
        
        if (dataObject) {
            // Konversi object Firebase ke array
            Object.keys(dataObject).forEach(key => {
                masterSandbed.push(dataObject[key]);
            });
        }
        console.log("Data Master Sandbed dimuat dari Firebase. Jumlah data:", masterSandbed.length);
        renderMasterSandbedTable(searchMasterInput.value);
        // Memastikan Block options untuk Form Perawatan diperbarui
        updateBlockSelectOptions(); 
    });

    // Path: /RIWAYAT_PERAWATAN/[NURSERY_ID]
    const perawatanRef = database.ref('RIWAYAT_PERAWATAN/' + CURRENT_NURSERY_ID);
    
    // Membaca data Perawatan
    perawatanRef.on('value', (snapshot) => {
        const dataObject = snapshot.val();
        dataPerawatan = [];
        
        if (dataObject) {
            Object.keys(dataObject).forEach(key => {
                dataPerawatan.push(dataObject[key]);
            });
        }
        console.log("Data Perawatan dimuat dari Firebase. Jumlah data:", dataPerawatan.length);
        renderTable(searchInput.value); 
    });
    
    // Memuat Header Info (tetap pakai LocalStorage karena ini non-kritis)
    nurseryName = localStorage.getItem('nurseryName_' + CURRENT_NURSERY_ID) || '';
    supervisorName = localStorage.getItem('supervisorName_' + CURRENT_NURSERY_ID) || '';
    nurseryInput.value = nurseryName;
    supervisorInput.value = supervisorName;
}


// Menyimpan Data Master Sandbed ke Firebase
function saveMasterSandbedToFirebase(dataArray) {
    const dataObject = {};
    dataArray.forEach(item => {
        dataObject[item.id] = item; // Menggunakan ID sebagai kunci di Firebase
    });
    return database.ref('MASTER_SANDBED/' + CURRENT_NURSERY_ID).set(dataObject)
        .then(() => {
            console.log("Master Sandbed berhasil disimpan ke Firebase.");
        })
        .catch(error => {
            console.error("Gagal menyimpan Master Sandbed ke Firebase:", error);
            alert("Error: Gagal menyimpan Master Sandbed ke Database!");
        });
}

// Menyimpan Data Perawatan ke Firebase
function savePerawatanToFirebase(dataArray) {
    // Perawatan disimpan sebagai list, menggunakan push untuk kunci unik otomatis
    const dataObject = {};
    // Karena kita hanya PUSH data baru, fungsi ini hanya mengupdate semua data
    dataArray.forEach((item, index) => {
        dataObject['record_' + index] = item;
    });
    
    return database.ref('RIWAYAT_PERAWATAN/' + CURRENT_NURSERY_ID).set(dataObject)
        .then(() => {
            console.log("Data Perawatan berhasil disimpan ke Firebase.");
        })
        .catch(error => {
            console.error("Gagal menyimpan Perawatan ke Firebase:", error);
            alert("Error: Gagal menyimpan Riwayat Perawatan ke Database!");
        });
}

function saveHeaderInfoToLocalStorage() {
    localStorage.setItem('nurseryName_' + CURRENT_NURSERY_ID, nurseryName);
    localStorage.setItem('supervisorName_' + CURRENT_NURSERY_ID, supervisorName);
}


// --- FUNGSI UTILITY (RUMUS, SORTING, RENDER) ---

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

function updateBlockSelectOptions() {
    const uniqueBlocks = [...new Set(masterSandbed.map(item => item.block))].sort();
    
    // Hapus semua opsi lama (kecuali opsi default)
    while (selectBlock.options.length > 1) {
        selectBlock.remove(1);
    }
    
    // Tambahkan opsi baru
    uniqueBlocks.forEach(block => {
        const option = document.createElement('option');
        option.value = block;
        option.textContent = block;
        selectBlock.appendChild(option);
    });
}

// --- FUNGSI KEAMANAN (Kunci Supervisor) ---

window.verifySupervisorKey = function() {
    const inputKey = document.getElementById('supervisorKeyInput').value;
    if (inputKey === SUPERVISOR_KEY) {
        toggleSupervisorMode(true);
        alert("Akses Supervisor Dibuka. Anda dapat mengedit/menghapus data Master.");
        document.getElementById('supervisorKeyInput').value = ''; 
    } else {
        alert("Kunci Rahasia Salah! Akses ditolak.");
        toggleSupervisorMode(false); 
    }
}

window.toggleSupervisorMode = function(mode) {
    isSupervisorMode = mode;
    const btnLockUnlock = document.getElementById('btnLockUnlock');
    const securityStatus = document.getElementById('securityStatus');
    
    if (isSupervisorMode) {
        securityStatus.innerText = 'AKSES TERBUKA (Supervisor)';
        securityStatus.style.color = 'green';
        btnLockUnlock.innerText = 'Kunci Kembali';
        btnLockUnlock.classList.remove('btn-danger');
        btnLockUnlock.classList.add('btn-success');
        btnLockUnlock.setAttribute('onclick', 'toggleSupervisorMode(false)'); 
    } else {
        securityStatus.innerText = 'AKSES TERKUNCI';
        securityStatus.style.color = 'red';
        btnLockUnlock.innerText = 'Buka Kunci';
        btnLockUnlock.classList.remove('btn-success');
        btnLockUnlock.classList.add('btn-danger');
        btnLockUnlock.setAttribute('onclick', 'verifySupervisorKey()');
        document.getElementById('supervisorKeyInput').value = ''; 
    }
    
    // Render ulang tabel untuk menampilkan/menyembunyikan tombol aksi
    renderMasterSandbedTable(searchMasterInput ? searchMasterInput.value : ''); 
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
        
        if (isSupervisorMode) { 
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
        } else {
             actionCell.innerText = 'Terkunci'; 
        }
    });
}


function editSandbed(event) { 
    if (!isSupervisorMode) return alert('Akses ditolak. Masuk mode Supervisor untuk mengedit.');
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
    if (!isSupervisorMode) return alert('Akses ditolak. Masuk mode Supervisor untuk menghapus.');
    const idToDelete = event.currentTarget.dataset.sandbedId;
    if (confirm(`Apakah Anda yakin ingin menghapus Sandbed ID: ${idToDelete}?`)) {
        masterSandbed = masterSandbed.filter(sandbed => sandbed.id !== idToDelete);
        
        // Simpan perubahan ke Firebase
        saveMasterSandbedToFirebase(masterSandbed); 
        alert(`Sandbed ID ${idToDelete} berhasil dihapus.`);
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

// --- FUNGSI SORTING MASTER SANDBED ---
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
nurseryInput.addEventListener('input', function() {
    nurseryName = this.value;
    saveHeaderInfoToLocalStorage();
});

supervisorInput.addEventListener('input', function() {
    supervisorName = this.value;
    saveHeaderInfoToLocalStorage();
});


// EVENT LISTENER MASTER SANDBED (Tambah/Update) 
formMasterSandbed.addEventListener('submit', function(e) {
    e.preventDefault();
    
    // --- VALIDASI INPUT KERAS ULANG ---
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

    if (isNaN(stdQtyStr) || isNaN(afkirStr) || isNaN(sulamStr)) {
        alert("VALIDASI GAGAL: Kolom Jumlah Standar MP, Afkir, dan Sulam hanya boleh diisi dengan angka.");
        return; 
    }
    
    const stdQty = parseInt(stdQtyStr);
    const afkir = parseInt(afkirStr);
    const sulam = parseInt(sulamStr);


    if (isEditing) {
        if (!isSupervisorMode) {
             alert('Akses ditolak. Masuk mode Supervisor untuk mengubah Master Data.');
             return;
        }
        
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
        if (!isSupervisorMode) {
             alert('Akses ditolak. Masuk mode Supervisor untuk menambah Master Data baru.');
             return;
        }

        const isDuplicate = masterSandbed.some(sandbed => sandbed.id === id);
        if (isDuplicate) {
            alert(`VALIDASI GAGAL: Sandbed ID ${id} sudah ada dalam daftar. Gunakan ID unik.`);
            return;
        }

        const newSandbed = { block, id, plot: 'N/A', clone, bulanTanam, stdQty, afkir, sulam };
        masterSandbed.push(newSandbed);
        alert(`Sandbed ID ${id} berhasil ditambahkan!`);
    }

    // --- FUNGSI BARU UNTUK SAVE KE FIREBASE ---
    saveMasterSandbedToFirebase(masterSandbed); 
    formMasterSandbed.reset();
    // renderMasterSandbedTable() akan dipanggil otomatis oleh listener Firebase
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
    savePerawatanToFirebase(dataPerawatan); 
    formPerawatan.reset();
    
    alert(`Perawatan ${jenisPerawatan} di ${block} berhasil direkam!`);
    
    // renderTable() akan dipanggil otomatis oleh listener Firebase
});


// EVENT LISTENER PENCARIAN RIWAYAT
searchInput.addEventListener('input', function() {
    renderTable(searchInput.value); 
});

// EVENT LISTENER PENCARIAN MASTER SANDBED
searchMasterInput.addEventListener('input', function() {
    renderMasterSandbedTable(searchMasterInput.value); 
});

// --- FUNGSI IMPO
