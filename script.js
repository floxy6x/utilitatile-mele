// Date globale
let indexData = JSON.parse(localStorage.getItem('indexData') || '{}');
let currentFormType = null;
let currentFormId = null;

// Funcții pentru tabs
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(section).classList.add('active');
    
    const tabs = document.querySelectorAll('.tab');
    if (section === 'utilities') {
        tabs[0].classList.add('active');
    } else if (section === 'car') {
        tabs[1].classList.add('active');
    } else if (section === 'stats') {
        tabs[2].classList.add('active');
    }
    
    console.log('📂 Secțiunea ' + section + ' activată');
}

// Funcții pentru formulare
function showIndexForm(type, name) {
    currentFormType = 'index';
    currentFormId = type;
    
    document.getElementById('formTitle').textContent = '📊 ' + name;
    
    // Specifică tipul de index pentru apă
    if (type === 'waterBath' || type === 'waterKitchen') {
        document.getElementById('formLabel').textContent = 'Index curent (cifrele negre):';
        document.getElementById('formValue').placeholder = 'Ex: 47223 (doar cifrele negre, nu roșiile)';
    } else {
        document.getElementById('formLabel').textContent = 'Index curent (nou):';
        document.getElementById('formValue').placeholder = 'Ex: 123456';
    }
    
    document.getElementById('previousIndexGroup').style.display = 'block';
    document.getElementById('kmGroup').style.display = 'none';
    document.getElementById('dateGroup').style.display = 'none';
    
    // Pentru apă, label-ul pentru indexul anterior
    const prevLabel = document.querySelector('#previousIndexGroup label');
    if (type === 'waterBath' || type === 'waterKitchen') {
        prevLabel.textContent = 'Index anterior (cifrele negre):';
        document.getElementById('formPrevious').placeholder = 'Ex: 47200 (doar cifrele negre)';
    } else {
        prevLabel.textContent = 'Index anterior (luna trecută):';
        document.getElementById('formPrevious').placeholder = 'Ex: 123000';
    }
    
    const lastValue = indexData[type] ? indexData[type].current : 0;
    document.getElementById('formValue').value = lastValue > 0 ? lastValue + 1 : '';
    document.getElementById('formPrevious').value = lastValue > 0 ? lastValue : '';
    
    document.getElementById('formOverlay').style.display = 'flex';
    document.getElementById('formValue').focus();
}

function showPaymentForm(type, name) {
    currentFormType = 'payment';
    currentFormId = type;
    
    document.getElementById('formTitle').textContent = '💰 ' + name;
    document.getElementById('formLabel').textContent = 'Suma plătită (RON):';
    document.getElementById('formValue').placeholder = 'Ex: 250';
    document.getElementById('previousIndexGroup').style.display = 'none';
    document.getElementById('kmGroup').style.display = 'none';
    document.getElementById('dateGroup').style.display = 'block';
    
    document.getElementById('formOverlay').style.display = 'flex';
    document.getElementById('formValue').focus();
}

function showCarForm(type, name) {
    currentFormType = 'car';
    currentFormId = type;
    
    document.getElementById('formTitle').textContent = '🚗 ' + name;
    document.getElementById('previousIndexGroup').style.display = 'none';
    
    if (type === 'oil') {
        document.getElementById('formLabel').textContent = 'Kilometri actuali:';
        document.getElementById('formValue').placeholder = 'Ex: 125000';
        document.getElementById('kmGroup').style.display = 'none';
        document.getElementById('dateGroup').style.display = 'block';
    } else {
        document.getElementById('formLabel').textContent = 'Data expirării:';
        document.getElementById('formValue').type = 'date';
        document.getElementById('formValue').placeholder = '';
        document.getElementById('kmGroup').style.display = 'none';
        document.getElementById('dateGroup').style.display = 'none';
    }
    
    document.getElementById('formOverlay').style.display = 'flex';
    document.getElementById('formValue').focus();
}

function hideForm() {
    document.getElementById('formOverlay').style.display = 'none';
    document.getElementById('formValue').type = 'number';
    document.getElementById('previousIndexGroup').style.display = 'none';
    currentFormType = null;
    currentFormId = null;
}

function saveForm() {
    const value = document.getElementById('formValue').value;
    const previousValue = document.getElementById('formPrevious').value;
    const date = document.getElementById('formDate').value;

    if (!value) {
        alert('❌ Vă rugăm să completați valoarea!');
        return;
    }

    if (!indexData[currentFormId]) {
        indexData[currentFormId] = {};
    }

    const now = new Date().toISOString();
    
    if (currentFormType === 'index') {
        const numValue = parseFloat(value);
        const numPrevious = previousValue ? parseFloat(previousValue) : 0;
        
        if (previousValue && numValue <= numPrevious) {
            if (!confirm('⚠️ Indexul curent (' + numValue + ') este mai mic sau egal cu cel anterior (' + numPrevious + ').\n\nContinuați?')) {
                return;
            }
        }
        
        const consumption = previousValue ? numValue - numPrevious : 0;
        
        indexData[currentFormId] = {
            current: numValue,
            previous: numPrevious || 0,
            consumption: consumption,
            lastUpdate: now,
            history: (indexData[currentFormId].history || []).concat([{
                current: numValue,
                previous: numPrevious || 0,
                consumption: consumption,
                date: now,
                sent: false
            }])
        };
        
        console.log('📊 Index ' + currentFormId + ' actualizat: ' + numValue + ' (consum: ' + consumption + ')');
        
    } else if (currentFormType === 'payment') {
        indexData[currentFormId] = {
            amount: parseFloat(value),
            lastPayment: date || now.split('T')[0],
            history: (indexData[currentFormId].history || []).concat([{
                amount: parseFloat(value),
                date: date || now.split('T')[0]
            }])
        };
        
        console.log('💰 Plată ' + currentFormId + ' înregistrată: ' + value + ' RON');
        
    } else if (currentFormType === 'car') {
        if (currentFormId === 'oil') {
            indexData[currentFormId] = {
                km: parseFloat(value),
                lastChange: date || now.split('T')[0],
                history: (indexData[currentFormId].history || []).concat([{
                    km: parseFloat(value),
                    date: date || now.split('T')[0]
                }])
            };
        } else {
            indexData[currentFormId] = {
                expiryDate: value,
                lastUpdate: now
            };
        }
        
        console.log('🚗 ' + currentFormId + ' actualizat');
    }

    localStorage.setItem('indexData', JSON.stringify(indexData));
    updateAllDisplays();
    hideForm();
    
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
    
    const typeName = getTypeName(currentFormId);
    const consumptionText = currentFormType === 'index' && previousValue ? 
        '\n📊 Consum calculat: ' + (parseFloat(value) - parseFloat(previousValue)) + ' unități' : '';
    
    alert('✅ ' + typeName + ' a fost actualizat cu succes!' + consumptionText);
}

// ========== FUNCȚII PENTRU ȘTERGERE ==========

function showDeleteOptions(type, name) {
    const data = indexData[type];
    if (!data) {
        alert('❌ Nu există date de șters pentru ' + name);
        return;
    }

    document.getElementById('deleteTitle').textContent = '🗑️ Ștergere ' + name;
    
    let content = '<p>Ce doriți să ștergeți?</p>';
    content += '<div style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">';
    
    // Opțiuni pentru indexuri (apă, gaz, electricitate)
    if (data.current !== undefined && (type === 'waterBath' || type === 'waterKitchen' || type === 'gas' || type === 'electric')) {
        content += '<button class="btn btn-danger" onclick="deleteCurrentIndex(\'' + type + '\', \'' + name + '\')">🔢 Index curent (' + (data.current || '---') + ')</button>';
        if (data.previous !== undefined && data.previous > 0) {
            content += '<button class="btn btn-danger" onclick="deletePreviousIndex(\'' + type + '\', \'' + name + '\')">📊 Index anterior (' + data.previous + ')</button>';
        }
        content += '<button class="btn" onclick="showEditIndexForm(\'' + type + '\', \'' + name + '\')">✏️ Editează indexuri</button>';
    }
    
    if (data.history && data.history.length > 0) {
        content += '<button class="btn btn-danger" onclick="deleteLastEntry(\'' + type + '\', \'' + name + '\')">📝 Ultima înregistrare completă</button>';
        content += '<button class="btn btn-danger" onclick="showHistoryForDelete(\'' + type + '\', \'' + name + '\')">📋 Din istoric</button>';
    }
    
    content += '<button class="btn btn-danger" onclick="deleteAllData(\'' + type + '\', \'' + name + '\')">🗑️ Toate datele</button>';
    content += '</div>';
    
    document.getElementById('deleteContent').innerHTML = content;
    document.getElementById('deleteOverlay').style.display = 'flex';
}

function hideDeleteOptions() {
    document.getElementById('deleteOverlay').style.display = 'none';
}

function deleteCurrentIndex(type, name) {
    const data = indexData[type];
    if (!data || data.current === undefined) {
        alert('❌ Nu există index curent pentru ' + name);
        return;
    }

    if (confirm('⚠️ Sigur doriți să ștergeți indexul curent (' + data.current + ') pentru ' + name + '?\n\nIndexul anterior va rămâne ca index curent.')) {
        if (data.previous !== undefined && data.previous > 0) {
            // Indexul anterior devine indexul curent
            data.current = data.previous;
            data.previous = 0;
            data.consumption = 0;
        } else {
            // Dacă nu există index anterior, resetează totul
            data.current = 0;
            data.previous = 0;
            data.consumption = 0;
        }
        
        data.lastUpdate = new Date().toISOString();
        
        // Actualizează istoricul
        if (data.history && data.history.length > 0) {
            data.history[data.history.length - 1].current = data.current;
            data.history[data.history.length - 1].consumption = data.consumption;
        }
        
        localStorage.setItem('indexData', JSON.stringify(indexData));
        updateAllDisplays();
        hideDeleteOptions();
        alert('✅ Indexul curent pentru ' + name + ' a fost șters!');
    }
}

function deletePreviousIndex(type, name) {
    const data = indexData[type];
    if (!data || data.previous === undefined || data.previous === 0) {
        alert('❌ Nu există index anterior pentru ' + name);
        return;
    }

    if (confirm('⚠️ Sigur doriți să ștergeți indexul anterior (' + data.previous + ') pentru ' + name + '?\n\nConsumul va fi recalculat sau resetat.')) {
        // Caută în istoric un index anterior dacă există
        let newPrevious = 0;
        if (data.history && data.history.length > 1) {
            // Ia indexul din penultima înregistrare
            newPrevious = data.history[data.history.length - 2].current || 0;
        }
        
        data.previous = newPrevious;
        data.consumption = data.current - newPrevious;
        data.lastUpdate = new Date().toISOString();
        
        // Actualizează istoricul
        if (data.history && data.history.length > 0) {
            data.history[data.history.length - 1].previous = newPrevious;
            data.history[data.history.length - 1].consumption = data.consumption;
        }
        
        localStorage.setItem('indexData', JSON.stringify(indexData));
        updateAllDisplays();
        hideDeleteOptions();
        alert('✅ Indexul anterior pentru ' + name + ' a fost șters!\nConsumul recalculat: ' + data.consumption);
    }
}

function showEditIndexForm(type, name) {
    const data = indexData[type];
    if (!data) return;
    
    hideDeleteOptions();
    
    // Modifică formularul pentru editare
    let content = '<h3>✏️ Editează ' + name + '</h3>';
    content += '<div class="form-group">';
    content += '<label>Index curent:</label>';
    content += '<input type="number" id="editCurrentIndex" value="' + (data.current || '') + '" placeholder="Index curent">';
    content += '</div>';
    
    content += '<div class="form-group">';
    content += '<label>Index anterior:</label>';
    content += '<input type="number" id="editPreviousIndex" value="' + (data.previous || '') + '" placeholder="Index anterior">';
    content += '</div>';
    
    content += '<div class="form-group">';
    content += '<label>Consum calculat:</label>';
    content += '<input type="number" id="editConsumption" value="' + (data.consumption || '') + '" placeholder="Se calculează automat" readonly style="background-color: #f0f0f0;">';
    content += '</div>';
    
    content += '<div class="form-buttons">';
    content += '<button class="btn btn-full" style="background: #666;" onclick="hideEditForm()">❌ Anulează</button>';
    content += '<button class="btn btn-success btn-full" onclick="saveEditedIndexes(\'' + type + '\', \'' + name + '\')">💾 Salvează</button>';
    content += '</div>';
    
    // Înlocuiește conținutul formularului
    document.querySelector('#formOverlay .form-popup').innerHTML = content;
    
    // Adaugă event listener pentru calcularea automată
    document.getElementById('editCurrentIndex').addEventListener('input', calculateConsumption);
    document.getElementById('editPreviousIndex').addEventListener('input', calculateConsumption);
    
    document.getElementById('formOverlay').style.display = 'flex';
}

function calculateConsumption() {
    const current = parseFloat(document.getElementById('editCurrentIndex').value) || 0;
    const previous = parseFloat(document.getElementById('editPreviousIndex').value) || 0;
    const consumption = current - previous;
    document.getElementById('editConsumption').value = consumption;
}

function saveEditedIndexes(type, name) {
    const current = parseFloat(document.getElementById('editCurrentIndex').value) || 0;
    const previous = parseFloat(document.getElementById('editPreviousIndex').value) || 0;
    const consumption = current - previous;
    
    if (current < previous && current > 0) {
        if (!confirm('⚠️ Indexul curent (' + current + ') este mai mic decât cel anterior (' + previous + ').\n\nContinuați?')) {
            return;
        }
    }
    
    const data = indexData[type];
    data.current = current;
    data.previous = previous;
    data.consumption = consumption;
    data.lastUpdate = new Date().toISOString();
    
    // Actualizează ultima înregistrare din istoric
    if (data.history && data.history.length > 0) {
        const lastEntry = data.history[data.history.length - 1];
        lastEntry.current = current;
        lastEntry.previous = previous;
        lastEntry.consumption = consumption;
        lastEntry.date = data.lastUpdate;
    }
    
    localStorage.setItem('indexData', JSON.stringify(indexData));
    updateAllDisplays();
    hideEditForm();
    alert('✅ Indexurile pentru ' + name + ' au fost actualizate!\nConsum: ' + consumption);
}

function hideEditForm() {
    // Restaurează formularul original
    const originalForm = `
        <h3 id="formTitle">Adaugă Index</h3>
        <div class="form-group">
            <label id="formLabel">Index curent:</label>
            <input type="number" id="formValue" placeholder="Introduceți valoarea">
        </div>
        <div class="form-group" id="previousIndexGroup" style="display: none;">
            <label>Index anterior (luna trecută):</label>
            <input type="number" id="formPrevious" placeholder="Ex: 123000">
        </div>
        <div class="form-group" id="kmGroup" style="display: none;">
            <label>Kilometri parcurși:</label>
            <input type="number" id="formKm" placeholder="Ex: 125000">
        </div>
        <div class="form-group" id="dateGroup" style="display: none;">
            <label>Data:</label>
            <input type="date" id="formDate">
        </div>
        <div class="form-buttons">
            <button class="btn btn-success btn-full" onclick="saveForm()">💾 Salvează</button>
            <button class="btn btn-full" style="background: #666;" onclick="hideForm()">❌ Anulează</button>
        </div>
    `;
    
    document.querySelector('#formOverlay .form-popup').innerHTML = originalForm;
    document.getElementById('formOverlay').style.display = 'none';
}

function deleteLastEntry(type, name) {
    const data = indexData[type];
    if (!data || !data.history || data.history.length === 0) {
        alert('❌ Nu există înregistrări de șters pentru ' + name);
        return;
    }

    if (confirm('⚠️ Sigur doriți să ștergeți ultima înregistrare pentru ' + name + '?')) {
        data.history.pop();
        
        // Actualizează datele curente cu penultima înregistrare
        if (data.history.length > 0) {
            const lastEntry = data.history[data.history.length - 1];
            if (lastEntry.current !== undefined) {
                data.current = lastEntry.current;
                data.consumption = lastEntry.consumption;
                data.lastUpdate = lastEntry.date;
            } else if (lastEntry.amount !== undefined) {
                data.amount = lastEntry.amount;
                data.lastPayment = lastEntry.date;
            } else if (lastEntry.km !== undefined) {
                data.km = lastEntry.km;
                data.lastChange = lastEntry.date;
            }
        } else {
            // Dacă nu mai sunt înregistrări, resetează datele
            if (data.current !== undefined) {
                data.current = 0;
                data.consumption = 0;
                data.lastUpdate = null;
            } else if (data.amount !== undefined) {
                data.amount = 0;
                data.lastPayment = null;
            } else if (data.km !== undefined) {
                data.km = 0;
                data.lastChange = null;
            }
        }

        localStorage.setItem('indexData', JSON.stringify(indexData));
        updateAllDisplays();
        hideDeleteOptions();
        alert('✅ Ultima înregistrare pentru ' + name + ' a fost ștearsă!');
    }
}

function showHistoryForDelete(type, name) {
    const data = indexData[type];
    if (!data || !data.history || data.history.length === 0) {
        alert('❌ Nu există istoric pentru ' + name);
        return;
    }

    let content = '<p>Selectați înregistrarea de șters:</p>';
    content += '<div style="max-height: 200px; overflow-y: auto; margin: 10px 0;">';
    
    data.history.forEach((entry, index) => {
        const date = new Date(entry.date).toLocaleDateString('ro-RO');
        let entryText = '';
        
        if (entry.current !== undefined) {
            entryText = `Index: ${entry.current} (consum: ${entry.consumption})`;
        } else if (entry.amount !== undefined) {
            entryText = `Plată: ${entry.amount} RON`;
        } else if (entry.km !== undefined) {
            entryText = `Kilometri: ${entry.km}`;
        }
        
        content += `<div style="display: flex; justify-content: space-between; align-items: center; padding: 5px; margin: 5px 0; background: #f0f0f0; border-radius: 5px;">
            <span style="font-size: 12px;">${date} - ${entryText}</span>
            <button class="btn btn-danger" style="padding: 3px 8px; font-size: 12px;" onclick="deleteHistoryEntry('${type}', '${name}', ${index})">🗑️</button>
        </div>`;
    });
    
    content += '</div>';
    
    document.getElementById('deleteContent').innerHTML = content;
}

function deleteHistoryEntry(type, name, index) {
    if (confirm('⚠️ Sigur doriți să ștergeți această înregistrare?')) {
        const data = indexData[type];
        data.history.splice(index, 1);
        
        // Actualizează datele curente cu ultima înregistrare rămasă
        if (data.history.length > 0) {
            const lastEntry = data.history[data.history.length - 1];
            if (lastEntry.current !== undefined) {
                data.current = lastEntry.current;
                data.consumption = lastEntry.consumption;
                data.lastUpdate = lastEntry.date;
            } else if (lastEntry.amount !== undefined) {
                data.amount = lastEntry.amount;
                data.lastPayment = lastEntry.date;
            } else if (lastEntry.km !== undefined) {
                data.km = lastEntry.km;
                data.lastChange = lastEntry.date;
            }
        } else {
            // Resetează datele dacă nu mai sunt înregistrări
            if (data.current !== undefined) {
                data.current = 0;
                data.consumption = 0;
                data.lastUpdate = null;
            }
        }

        localStorage.setItem('indexData', JSON.stringify(indexData));
        updateAllDisplays();
        showHistoryForDelete(type, name); // Reîmprospătează lista
        alert('✅ Înregistrarea a fost ștearsă!');
    }
}

function deleteAllData(type, name) {
    if (confirm('⚠️ ATENȚIE: Aceasta va șterge TOATE datele pentru ' + name + '!\n\nSigur doriți să continuați?')) {
        if (confirm('🚨 Ultima confirmare: Toate datele pentru ' + name + ' vor fi pierdute definitiv!')) {
            delete indexData[type];
            localStorage.setItem('indexData', JSON.stringify(indexData));
            updateAllDisplays();
            hideDeleteOptions();
            alert('✅ Toate datele pentru ' + name + ' au fost șterse!');
        }
    }
}

function clearAllData() {
    if (confirm('⚠️ ATENȚIE: Aceasta va șterge TOATE datele din aplicație!\n\nSigur doriți să continuați?')) {
        if (confirm('🚨 Ultima confirmare: TOATE datele vor fi pierdute definitiv!')) {
            indexData = {};
            localStorage.setItem('indexData', JSON.stringify(indexData));
            updateAllDisplays();
            alert('✅ Toate datele au fost șterse!');
        }
    }
}

// ========== RESTUL FUNCȚIILOR ORIGINALE ==========

// Funcții pentru scanare
function scanIndexFromImage(file) {
    if (!file) return;
    
    showLoading('📷 Scanez imaginea...', 'Caut numere pe contor');
    
    setTimeout(() => {
        const detectedNumber = simulateOCR(file);
        hideLoading();
        
        if (detectedNumber) {
            const today = new Date();
            const day = today.getDate();
            
            let suggestedType = 'waterBath';
            let suggestedName = 'Apometru Baie';
            
            if (day >= 13 && day <= 15) {
                suggestedType = 'waterBath';
                suggestedName = 'Apometru Baie';
            } else if (day >= 18 && day <= 20) {
                suggestedType = 'gas';
                suggestedName = 'Contor Gaz';
            }
            
            const choice = confirm('📷 Am detectat numărul: ' + detectedNumber + '\n\n🏷️ Sugerez să fie pentru: ' + suggestedName + '\n\nDoriți să folosiți această valoare?');
            
            if (choice) {
                showIndexFormWithValue(suggestedType, suggestedName, detectedNumber);
            }
        } else {
            alert('❌ Nu am putut detecta un număr valid în imagine.\n\n💡 Sfaturi:\n• Asigurați-vă că numărul este clar\n• Folosiți lumină bună\n• Țineți telefonul drept');
        }
    }, 2000);
}

function scanSpecificIndex(file, type, name) {
    if (!file) return;
    
    showLoading('📷 Scanez ' + name + '...', 'Extrag indexul din imagine');
    
    setTimeout(() => {
        const detectedNumber = simulateOCR(file);
        hideLoading();
        
        if (detectedNumber) {
            const choice = confirm('📷 Am detectat indexul: ' + detectedNumber + '\n\n🏷️ Pentru: ' + name + '\n\nDoriți să folosiți această valoare?');
            
            if (choice) {
                showIndexFormWithValue(type, name, detectedNumber);
            }
        } else {
            alert('❌ Nu am putut citi indexul pentru ' + name + '.\n\n💡 Încercați să:\n• Faceți poza mai aproape de cifre\n• Asigurați-vă că numerele sunt clare\n• Folosiți lumină bună');
        }
    }, 2000);
}

function simulateOCR(file) {
    const fileName = file.name.toLowerCase();
    
    const baseNumbers = {
        water: { min: 10000, max: 99999 },    // Doar 5 cifre pentru apă (00472)
        gas: { min: 10000, max: 99999 },      // 5 cifre pentru gaz
        electric: { min: 100000, max: 999999 } // 6 cifre pentru electricitate
    };
    
    let range = baseNumbers.water;
    
    if (fileName.includes('gaz') || fileName.includes('gas')) {
        range = baseNumbers.gas;
    } else if (fileName.includes('electric') || fileName.includes('curent')) {
        range = baseNumbers.electric;
    }
    
    const detectedNumber = Math.floor(Math.random() * (range.max - range.min) + range.min);
    return Math.random() > 0.1 ? detectedNumber : null;
}

function showIndexFormWithValue(type, name, value) {
    currentFormType = 'index';
    currentFormId = type;
    
    document.getElementById('formTitle').textContent = '📊 ' + name;
    
    // Specifică tipul de index pentru apă
    if (type === 'waterBath' || type === 'waterKitchen') {
        document.getElementById('formLabel').textContent = 'Index detectat (cifrele negre):';
        document.getElementById('formValue').placeholder = 'Ex: 47223 (verificați că sunt doar cifrele negre)';
    } else {
        document.getElementById('formLabel').textContent = 'Index detectat (nou):';
        document.getElementById('formValue').placeholder = 'Verificați valoarea';
    }
    
    document.getElementById('previousIndexGroup').style.display = 'block';
    document.getElementById('kmGroup').style.display = 'none';
    document.getElementById('dateGroup').style.display = 'none';
    
    // Pentru apă, label-ul pentru indexul anterior
    const prevLabel = document.querySelector('#previousIndexGroup label');
    if (type === 'waterBath' || type === 'waterKitchen') {
        prevLabel.textContent = 'Index anterior (cifrele negre):';
        document.getElementById('formPrevious').placeholder = 'Ex: 47200 (doar cifrele negre)';
    } else {
        prevLabel.textContent = 'Index anterior (luna trecută):';
        document.getElementById('formPrevious').placeholder = 'Ex: 123000';
    }
    
    document.getElementById('formValue').value = value;
    
    const lastValue = indexData[type] ? indexData[type].current : 0;
    document.getElementById('formPrevious').value = lastValue > 0 ? lastValue : '';
    
    document.getElementById('formOverlay').style.display = 'flex';
    
    setTimeout(() => {
        document.getElementById('formValue').select();
    }, 100);
}

function showLoading(title, subtitle) {
    document.getElementById('loadingOverlay').style.display = 'block';
    document.getElementById('loading').style.display = 'block';
    document.querySelector('#loading h3').textContent = title;
    document.querySelector('#loading p').textContent = subtitle;
}

function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('loading').style.display = 'none';
}

// Export/Import prin link
function exportToLink() {
    if (Object.keys(indexData).length === 0) {
        alert('❌ Nu aveți date de partajat!\n\nAdăugați câteva indexuri mai întâi.');
        return;
    }

    try {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: indexData,
            summary: generateDataSummary()
        };

        const jsonData = JSON.stringify(exportData);
        const compressed = btoa(encodeURIComponent(jsonData));
        
        const currentUrl = window.location.href.split('?')[0];
        const shareUrl = currentUrl + '?import=' + compressed;
        
        showShareOptions(shareUrl, exportData.summary);
        
        console.log('📤 Date exportate cu succes');
        
    } catch (error) {
        console.error('❌ Eroare la export:', error);
        alert('❌ Eroare la crearea link-ului de partajare.\n\nÎncercați din nou.');
    }
}

function generateDataSummary() {
    const summary = {
        totalIndexes: 0,
        lastUpdate: null,
        indexTypes: []
    };

    ['waterBath', 'waterKitchen', 'gas', 'electric'].forEach(type => {
        const data = indexData[type];
        if (data && data.current) {
            summary.totalIndexes++;
            summary.indexTypes.push(getTypeName(type));
            
            if (data.lastUpdate) {
                const updateDate = new Date(data.lastUpdate);
                if (!summary.lastUpdate || updateDate > new Date(summary.lastUpdate)) {
                    summary.lastUpdate = data.lastUpdate;
                }
            }
        }
    });

    return summary;
}

function showShareOptions(shareUrl, summary) {
    const message = '📤 Partajare date indexuri\n\n' +
                   '📊 Rezumat:\n' +
                   '• ' + summary.totalIndexes + ' indexuri înregistrate\n' +
                   '• Tipuri: ' + summary.indexTypes.join(', ') + '\n' +
                   '• Ultima actualizare: ' + (summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleDateString('ro-RO') : 'N/A') + '\n\n' +
                   '🔗 Link pentru import:\n' + shareUrl + '\n\n' +
                   '💡 Instrucțiuni pentru soție:\n' +
                   '1. Deschide link-ul pe telefonul ei\n' +
                   '2. Apasă "📥 Importă date" din Statistici\n' +
                   '3. Confirmă importul\n\n' +
                   'Dorești să:';

    if (navigator.share) {
        navigator.share({
            title: 'Indexuri Utilități - Date',
            text: 'Date indexuri pentru import',
            url: shareUrl
        }).catch(error => {
            console.log('Share cancelled sau eroare:', error);
            fallbackShare(shareUrl, message);
        });
    } else {
        fallbackShare(shareUrl, message);
    }
}

function fallbackShare(shareUrl, message) {
    const choice = prompt(message + '\n\n1. Copiez link-ul (pentru WhatsApp/SMS)\n2. Trimit prin email\n3. Anulează\n\nIntroduceți 1, 2 sau 3:');
    
    switch(choice) {
        case '1':
            copyToClipboard(shareUrl);
            alert('✅ Link copiat!\n\nLipește-l în WhatsApp/SMS și trimite-l soției tale.');
            break;
        case '2':
            const emailSubject = encodeURIComponent('Date indexuri utilități');
            const emailBody = encodeURIComponent('Salut!\n\nÎți trimit datele cu indexurile de utilități.\n\nDeschide link-ul de mai jos pe telefonul tău și importă datele:\n\n' + shareUrl + '\n\nInstrucțiuni:\n1. Deschide link-ul\n2. Mergi la Statistici\n3. Apasă "📥 Importă date"\n4. Confirmă importul\n\nSă ai o zi frumoasă! 😊');
            window.open('mailto:?subject=' + emailSubject + '&body=' + emailBody);
            break;
        case '3':
            break;
        default:
            if (choice !== null) {
                alert('❌ Opțiune invalidă. Link-ul este pregătit, dar nu a fost partajat.');
            }
    }
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
            fallbackCopyToClipboard(text);
        });
    } else {
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
    } catch (err) {
        console.error('Eroare la copiere:', err);
    }
    
    document.body.removeChild(textArea);
}

function showImportFromLink() {
    const importUrl = prompt('📥 Importă date din link\n\nLipește link-ul primit de la soțul/soția ta:\n\n(Link-ul începe cu: https://...)');
    
    if (!importUrl) return;
    
    try {
        const url = new URL(importUrl);
        const importParam = url.searchParams.get('import');
        
        if (!importParam) {
            alert('❌ Link invalid!\n\nLink-ul nu conține date de import. Verificați că ați copiat link-ul complet.');
            return;
        }
        
        importFromData(importParam);
        
    } catch (error) {
        alert('❌ Link invalid!\n\nVă rugăm să verificați că ați introdus link-ul corect.');
        console.error('Eroare import URL:', error);
    }
}

function importFromData(compressedData) {
    try {
        const jsonData = decodeURIComponent(atob(compressedData));
        const importData = JSON.parse(jsonData);
        
        if (!importData.version || !importData.data) {
            throw new Error('Format de date invalid');
        }
        
        const summary = importData.summary;
        const confirmMessage = '📥 Confirmare import\n\n' +
                             '📊 Date de importat:\n' +
                             '• ' + summary.totalIndexes + ' indexuri\n' +
                             '• Tipuri: ' + summary.indexTypes.join(', ') + '\n' +
                             '• Data: ' + (summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleDateString('ro-RO') : 'N/A') + '\n\n' +
                             '⚠️ ATENȚIE: Aceasta va înlocui toate datele existente!\n\n' +
                             'Continuați cu importul?';
        
        if (confirm(confirmMessage)) {
            const backup = JSON.stringify(indexData);
            
            try {
                indexData = importData.data;
                localStorage.setItem('indexData', JSON.stringify(indexData));
                
                updateAllDisplays();
                checkReminders();
                
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100, 50, 100]);
                }
                
                alert('✅ Import realizat cu succes!\n\n📊 ' + summary.totalIndexes + ' indexuri importate\n\nMergeți la secțiunea Utilități pentru a vedea datele.');
                
                console.log('📥 Import realizat cu succes:', summary);
                
            } catch (error) {
                indexData = JSON.parse(backup);
                localStorage.setItem('indexData', JSON.stringify(indexData));
                throw error;
            }
        }
        
    } catch (error) {
        console.error('❌ Eroare la import:', error);
        alert('❌ Eroare la importul datelor!\n\nVerificați că link-ul este corect și complet.');
    }
}

function checkForImportData() {
    const urlParams = new URLSearchParams(window.location.search);
    const importParam = urlParams.get('import');
    
    if (importParam) {
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => {
            const autoImport = confirm('📥 Link cu date de import detectat!\n\nDoriți să importați datele automat?');
            if (autoImport) {
                importFromData(importParam);
            }
        }, 1000);
    }
}

// Funcții utilitare
function getTypeName(id) {
    const names = {
        'waterBath': 'Apometru Baie',
        'waterKitchen': 'Apometru Bucătărie',
        'gas': 'Contor Gaz',
        'electric': 'Contor Electricitate',
        'association': 'Plată Asociație',
        'oil': 'Schimb Ulei',
        'vignette': 'Rovinietă',
        'insurance': 'Asigurare',
        'itp': 'ITP'
    };
    return names[id] || id;
}

// Actualizare afișaje
function updateAllDisplays() {
    updateUtilitiesDisplay();
    updateCarDisplay();
    updateStatsDisplay();
    updateStatusBadges();
}

function updateUtilitiesDisplay() {
    const waterBath = indexData.waterBath || {};
    document.getElementById('waterBathCurrent').textContent = waterBath.current || '---';
    document.getElementById('waterBathLast').textContent = waterBath.lastUpdate ? 
        'Ultimul: ' + new Date(waterBath.lastUpdate).toLocaleDateString('ro-RO') : 'Ultimul: -';

    const waterKitchen = indexData.waterKitchen || {};
    document.getElementById('waterKitchenCurrent').textContent = waterKitchen.current || '---';
    document.getElementById('waterKitchenLast').textContent = waterKitchen.lastUpdate ? 
        'Ultimul: ' + new Date(waterKitchen.lastUpdate).toLocaleDateString('ro-RO') : 'Ultimul: -';

    const gas = indexData.gas || {};
    document.getElementById('gasCurrent').textContent = gas.current || '---';
    document.getElementById('gasLast').textContent = gas.lastUpdate ? 
        'Ultimul: ' + new Date(gas.lastUpdate).toLocaleDateString('ro-RO') : 'Ultimul: -';

    const electric = indexData.electric || {};
    document.getElementById('electricCurrent').textContent = electric.current || '---';
    document.getElementById('electricLast').textContent = electric.lastUpdate ? 
        'Ultimul: ' + new Date(electric.lastUpdate).toLocaleDateString('ro-RO') : 'Ultimul: -';

    const association = indexData.association || {};
    document.getElementById('associationCurrent').textContent = association.amount ? 
        association.amount + ' RON' : '--- RON';
    document.getElementById('associationLast').textContent = association.lastPayment ? 
        'Ultima plată: ' + new Date(association.lastPayment).toLocaleDateString('ro-RO') : 'Ultima plată: -';
}

function updateCarDisplay() {
    const oil = indexData.oil || {};
    document.getElementById('oilCurrent').textContent = oil.km ? oil.km + ' km' : '--- km';
    document.getElementById('oilLast').textContent = oil.lastChange ? 
        'Ultima dată: ' + new Date(oil.lastChange).toLocaleDateString('ro-RO') : 'Ultima dată: -';

    const vignette = indexData.vignette || {};
    document.getElementById('vignetteExpiry').textContent = vignette.expiryDate ? 
        new Date(vignette.expiryDate).toLocaleDateString('ro-RO') : '--/--/----';
    document.getElementById('vignetteStatus').textContent = getExpiryStatus(vignette.expiryDate);

    const insurance = indexData.insurance || {};
    document.getElementById('insuranceExpiry').textContent = insurance.expiryDate ? 
        new Date(insurance.expiryDate).toLocaleDateString('ro-RO') : '--/--/----';
    document.getElementById('insuranceStatus').textContent = getExpiryStatus(insurance.expiryDate);

    const itp = indexData.itp || {};
    document.getElementById('itpExpiry').textContent = itp.expiryDate ? 
        new Date(itp.expiryDate).toLocaleDateString('ro-RO') : '--/--/----';
    document.getElementById('itpStatus').textContent = getExpiryStatus(itp.expiryDate);
}

function updateStatsDisplay() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let sentThisMonth = 0;

    ['waterBath', 'waterKitchen', 'gas', 'electric'].forEach(type => {
        const data = indexData[type];
        if (data && data.history) {
            const thisMonthEntries = data.history.filter(entry => 
                entry.date.startsWith(currentMonth) && entry.sent
            );
            if (thisMonthEntries.length > 0) sentThisMonth++;
        }
    });

    document.getElementById('statIndexesSent').textContent = sentThisMonth + '/4';

    const activeReminders = getActiveReminders().length;
    document.getElementById('statActiveReminders').textContent = activeReminders;

    updateConsumptionList();
    updateHistoryDisplay();
}

function updateConsumptionList() {
    const container = document.getElementById('consumptionList');
    let html = '';

    ['waterBath', 'waterKitchen', 'gas', 'electric'].forEach(type => {
        const data = indexData[type];
        if (data && data.consumption !== undefined && data.consumption > 0) {
            const typeName = getTypeName(type);
            const consumption = data.consumption;

            html += '<div class="consumption-item">' +
                   '<span class="consumption-period">' + typeName + '</span>' +
                   '<span class="consumption-value">+' + consumption + '</span>' +
                   '</div>';
        } else if (data && data.current && data.previous) {
            const typeName = getTypeName(type);
            const consumption = data.current - data.previous;

            html += '<div class="consumption-item">' +
                   '<span class="consumption-period">' + typeName + '</span>' +
                   '<span class="consumption-value">' + (consumption > 0 ? '+' : '') + consumption + '</span>' +
                   '</div>';
        }
    });

    if (html === '') {
        html = '<div class="consumption-item">' +
              '<span style="color: #666;">Adăugați indexul curent și cel anterior pentru a calcula consumul</span>' +
              '</div>';
    }

    container.innerHTML = html;
}

function updateHistoryDisplay() {
    const historyContainer = document.getElementById('historyList');
    let html = '';
    
    Object.keys(indexData).forEach(type => {
        const data = indexData[type];
        if (data && data.history && data.history.length > 0) {
            const typeName = getTypeName(type);
            html += `<h4 style="margin: 10px 0; color: #333;">${typeName}</h4>`;
            
            data.history.slice(-3).reverse().forEach((entry, index) => {
                const date = new Date(entry.date).toLocaleDateString('ro-RO');
                let entryText = '';
                
                if (entry.current !== undefined) {
                    entryText = `Index: ${entry.current}`;
                } else if (entry.amount !== undefined) {
                    entryText = `Plată: ${entry.amount} RON`;
                } else if (entry.km !== undefined) {
                    entryText = `${entry.km} km`;
                }
                
                html += `<div style="display: flex; justify-content: space-between; padding: 5px; margin: 3px 0; background: #f9f9f9; border-radius: 3px; font-size: 12px;">
                    <span>${date} - ${entryText}</span>
                </div>`;
            });
        }
    });
    
    if (html === '') {
        html = '<p style="color: #666; text-align: center; padding: 20px;">Nu există înregistrări</p>';
    }
    
    historyContainer.innerHTML = html;
}

function updateStatusBadges() {
    const today = new Date();
    const day = today.getDate();

    const waterBadge = document.getElementById('waterStatus');
    if (day <= 15) {
        waterBadge.className = 'status-badge status-ok';
        waterBadge.textContent = '📅 Până pe 15 (' + (15 - day) + ' zile)';
    } else {
        waterBadge.className = 'status-badge status-danger';
        waterBadge.textContent = '🚨 Întârziat!';
    }

    const gasElectricBadge = document.getElementById('gasElectricStatus');
    if (day <= 20) {
        gasElectricBadge.className = 'status-badge status-ok';
        gasElectricBadge.textContent = '📅 Până pe 20 (' + (20 - day) + ' zile)';
    } else {
        gasElectricBadge.className = 'status-badge status-danger';
        gasElectricBadge.textContent = '🚨 Întârziat!';
    }
}

function getExpiryStatus(expiryDate) {
    if (!expiryDate) return 'Status: -';

    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'Status: 🚨 Expirat';
    } else if (diffDays <= 30) {
        return 'Status: ⚠️ ' + diffDays + ' zile';
    } else {
        return 'Status: ✅ Valid';
    }
}

// Sistem de reminder-uri
function checkReminders() {
    const today = new Date();
    const day = today.getDate();
    const alerts = [];

    if (day >= 13 && day <= 15) {
        const waterBathSent = isIndexSentThisMonth('waterBath');
        const waterKitchenSent = isIndexSentThisMonth('waterKitchen');

        if (!waterBathSent || !waterKitchenSent) {
            alerts.push({
                type: day === 15 ? 'urgent' : 'warning',
                title: day === 15 ? '🚨 URGENT: Trimiteți indexurile de apă ASTĂZI!' : 
                       '⚠️ Reminder: Trimiteți indexurile de apă până pe 15',
                items: [
                    !waterBathSent ? 'Apometru Baie' : null,
                    !waterKitchenSent ? 'Apometru Bucătărie' : null
                ].filter(Boolean)
            });
        }
    }

    if (day >= 18 && day <= 20) {
        const gasSent = isIndexSentThisMonth('gas');
        const electricSent = isIndexSentThisMonth('electric');

        if (!gasSent || !electricSent) {
            alerts.push({
                type: day === 20 ? 'urgent' : 'warning',
                title: day === 20 ? '🚨 URGENT: Trimiteți indexurile de gaz/electricitate ASTĂZI!' : 
                       '⚠️ Reminder: Trimiteți indexurile de gaz/electricitate până pe 20',
                items: [
                    !gasSent ? 'Contor Gaz' : null,
                    !electricSent ? 'Contor Electricitate' : null
                ].filter(Boolean)
            });
        }
    }

    ['vignette', 'insurance', 'itp'].forEach(type => {
        const data = indexData[type];
        if (data && data.expiryDate) {
            const expiry = new Date(data.expiryDate);
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            const typeName = getTypeName(type);

            if (diffDays < 0) {
                alerts.push({
                    type: 'urgent',
                    title: '🚨 ' + typeName + ' a expirat cu ' + Math.abs(diffDays) + ' zile în urmă!',
                    items: ['Reînnoiți urgent documentul']
                });
            } else if (diffDays <= 7) {
                alerts.push({
                    type: 'urgent',
                    title: '🚨 ' + typeName + ' expiră în ' + diffDays + ' zile!',
                    items: ['Programați reînnoirea urgent']
                });
            } else if (diffDays <= 30) {
                alerts.push({
                    type: 'warning',
                    title: '⚠️ ' + typeName + ' expiră în ' + diffDays + ' zile',
                    items: ['Planificați reînnoirea']
                });
            }
        }
    });

    displayAlerts(alerts);
    updateRemindersList(alerts);
}

function isIndexSentThisMonth(type) {
    const data = indexData[type];
    if (!data || !data.history) return false;

    const currentMonth = new Date().toISOString().slice(0, 7);
    return data.history.some(entry => 
        entry.date.startsWith(currentMonth) && entry.sent
    );
}

function displayAlerts(alerts) {
    const container = document.getElementById('alerts');
    
    if (alerts.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = alerts.map(alert => 
        '<div class="alert ' + alert.type + '">' +
        '<div>' + alert.title + '</div>' +
        (alert.items.length > 0 ? '<div style="margin-top: 5px; font-size: 13px;">📋 ' + alert.items.join(', ') + '</div>' : '') +
        '</div>'
    ).join('');
}

function updateRemindersList(alerts) {
    const container = document.getElementById('remindersList');
    
    if (alerts.length === 0) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Nu există reminder-uri active</p>';
        return;
    }

    container.innerHTML = alerts.map(alert => 
        '<div class="reminder-item ' + alert.type + '">' +
        '<div class="reminder-title">' + alert.title + '</div>' +
        (alert.items.length > 0 ? '<div class="reminder-date">' + alert.items.join(', ') + '</div>' : '') +
        '</div>'
    ).join('');
}

function getActiveReminders() {
    const today = new Date();
    const day = today.getDate();
    const reminders = [];

    if (day >= 13 && day <= 15) {
        if (!isIndexSentThisMonth('waterBath') || !isIndexSentThisMonth('waterKitchen')) {
            reminders.push('water');
        }
    }

    if (day >= 18 && day <= 20) {
        if (!isIndexSentThisMonth('gas') || !isIndexSentThisMonth('electric')) {
            reminders.push('gasElectric');
        }
    }

    ['vignette', 'insurance', 'itp'].forEach(type => {
        const data = indexData[type];
        if (data && data.expiryDate) {
            const expiry = new Date(data.expiryDate);
            const diffTime = expiry - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 30) {
                reminders.push(type);
            }
        }
    });

    return reminders;
}

// Acțiuni rapide
function markAllIndexesSent() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let updated = 0;

    ['waterBath', 'waterKitchen', 'gas', 'electric'].forEach(type => {
        const data = indexData[type];
        if (data && data.history) {
            const lastEntry = data.history[data.history.length - 1];
            if (lastEntry && lastEntry.date.startsWith(currentMonth) && !lastEntry.sent) {
                lastEntry.sent = true;
                updated++;
            }
        }
    });

    if (updated > 0) {
        localStorage.setItem('indexData', JSON.stringify(indexData));
        updateAllDisplays();
        checkReminders();
        
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100, 50, 100]);
        }
        
        alert('✅ ' + updated + ' indexuri marcate ca trimise!');
    } else {
        alert('ℹ️ Nu există indexuri noi de marcat ca trimise.');
    }
}

function showBulkIndexForm() {
    const today = new Date();
    const day = today.getDate();
    let message = '📝 Index rapid - Ce doriți să faceți?\n\n';
    
    if (day <= 15) {
        message += '💧 1. Citesc indexurile de apă\n';
    }
    if (day <= 20) {
        message += '🔥 2. Citesc indexurile de gaz/electricitate\n';
    }
    message += '🏢 3. Înregistrez plata la asociație\n';
    message += '🚗 4. Actualizez datele mașinii\n\n';
    message += 'Introduceți numărul opțiunii:';

    const choice = prompt(message);
    
    switch(choice) {
        case '1':
            if (day <= 15) {
                showIndexForm('waterBath', 'Apometru Baie');
            } else {
                alert('❌ Perioada pentru indexurile de apă a trecut (până pe 15).');
            }
            break;
        case '2':
            if (day <= 20) {
                showIndexForm('gas', 'Contor Gaz');
            } else {
                alert('❌ Perioada pentru indexurile de gaz/electricitate a trecut (până pe 20).');
            }
            break;
        case '3':
            showPaymentForm('association', 'Plată Asociație');
            break;
        case '4':
            showCarForm('oil', 'Schimb Ulei');
            break;
        default:
            if (choice !== null) {
                alert('❌ Opțiune invalidă. Vă rugăm să alegeți 1, 2, 3 sau 4.');
            }
    }
}

// Event listeners
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showBulkIndexForm();
    }
    
    if (e.key === 'Escape' && document.getElementById('formOverlay').style.display === 'flex') {
        hideForm();
    }
    
    if (e.key === 'Escape' && document.getElementById('deleteOverlay').style.display === 'flex') {
        hideDeleteOptions();
    }
    
    if (e.key === 'Enter' && document.getElementById('formOverlay').style.display === 'flex') {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName !== 'BUTTON') {
            e.preventDefault();
            saveForm();
        }
    }
});

// Inițializare aplicație
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicația de indexuri s-a încărcat!');
    
    document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
    
    checkForImportData();
    
    updateAllDisplays();
    checkReminders();
    
    setInterval(checkReminders, 60000);
    
    console.log('📊 Date încărcate:', Object.keys(indexData).length, 'categorii');
});

window.addEventListener('load', function() {
    console.log('🎉 Aplicația Indexuri & Reminder-uri este gata!');
    setTimeout(checkReminders, 1000);
});
