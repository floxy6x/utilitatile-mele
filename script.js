// Date globale
let indexData = JSON.parse(localStorage.getItem('indexData') || '{}');
let syncSettings = JSON.parse(localStorage.getItem('syncSettings') || '{}');
let currentFormType = null;
let currentFormId = null;

// Inițializare robustă setări sincronizare
function initializeSyncSettings() {
    // Verifică și păstrează setările existente
    const existingSettings = localStorage.getItem('syncSettings');
    
    if (!existingSettings || !syncSettings.version) {
        // Doar dacă nu există setări sau sunt vechi
        const defaultSettings = {
            version: '1.1', // Versiune pentru tracking
            partnerName: syncSettings.partnerName || '',
            autoSync: syncSettings.autoSync !== false, // Default true
            lastSyncTime: syncSettings.lastSyncTime || null,
            syncNotifications: syncSettings.syncNotifications !== false, // Default true
            setupCompleted: syncSettings.setupCompleted || false
        };
        
        // Păstrează valorile existente dacă există
        syncSettings = { ...defaultSettings, ...syncSettings };
        localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
        console.log('🔧 Setări sincronizare inițializate:', syncSettings);
    } else {
        // Actualizează versiunea dar păstrează setările
        syncSettings.version = '1.1';
        localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
        console.log('🔄 Setări sincronizare păstrate:', syncSettings);
    }
}

// Funcție pentru salvare sigură setări
function saveSyncSettings() {
    try {
        localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
        console.log('💾 Setări sincronizare salvate:', syncSettings);
        return true;
    } catch (error) {
        console.error('❌ Eroare la salvarea setărilor:', error);
        return false;
    }
}

// Verifică periodic setările (anti-pierdere)
function validateSyncSettings() {
    const stored = localStorage.getItem('syncSettings');
    if (!stored) {
        console.warn('⚠️ Setări sincronizare lipsă - restaurez...');
        initializeSyncSettings();
        return false;
    }
    
    try {
        const parsed = JSON.parse(stored);
        if (!parsed.version) {
            console.warn('⚠️ Setări sincronizare fără versiune - actualizez...');
            initializeSyncSettings();
            return false;
        }
        return true;
    } catch (error) {
        console.error('❌ Setări sincronizare corupte - reinițializez...');
        initializeSyncSettings();
        return false;
    }
}

// Apelează inițializarea
initializeSyncSettings();

// ========== FUNCȚII PENTRU SINCRONIZARE BILATERALĂ ==========

function setupPartner() {
    const partnerName = prompt('🤝 Cum se numește partenerul tău?\n\n(Ex: "Soția", "Ana", "Mihai")\n\nAceasta va personaliza mesajele de sincronizare:');
    
    if (partnerName && partnerName.trim()) {
        // Actualizează setările
        syncSettings.partnerName = partnerName.trim();
        syncSettings.autoSync = true;
        syncSettings.syncNotifications = true;
        syncSettings.setupCompleted = true;
        syncSettings.configuredAt = new Date().toISOString();
        
        // Salvare robustă
        if (saveSyncSettings()) {
            // Verifică că s-a salvat corect
            setTimeout(() => {
                const verification = JSON.parse(localStorage.getItem('syncSettings') || '{}');
                if (verification.partnerName === partnerName.trim()) {
                    console.log('✅ Partener configurat și verificat:', partnerName.trim());
                    updateSyncStatus();
                    alert('✅ Perfect! Acum aplicația va sugera automat să partajezi datele cu ' + partnerName + ' când adaugi ceva nou!');
                } else {
                    console.error('❌ Verificarea configurării a eșuat');
                    alert('⚠️ S-a configurat dar nu s-a salvat corect. Încearcă din nou.');
                }
            }, 500);
        } else {
            alert('❌ Eroare la salvarea setărilor. Încearcă din nou.');
        }
    }
}

function updateSyncStatus() {
    // Verifică setările înainte de actualizare
    if (!validateSyncSettings()) {
        console.warn('⚠️ Setări invalide în updateSyncStatus');
        return;
    }
    
    // Adaugă indicatori vizuali pentru statusul sincronizării
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        if (syncSettings.partnerName && syncSettings.partnerName.trim()) {
            syncIndicator.innerHTML = '🤝 Sincronizat cu ' + syncSettings.partnerName;
            syncIndicator.className = 'sync-indicator connected';
        } else {
            syncIndicator.innerHTML = '⚠️ Nu e configurat partenerul';
            syncIndicator.className = 'sync-indicator disconnected';
        }
    } else {
        console.warn('⚠️ Element syncIndicator nu există în DOM');
    }
}

// Funcție de debug pentru setări
function debugSyncSettings() {
    console.log('🔍 Debug setări sincronizare:');
    console.log('📦 localStorage syncSettings:', localStorage.getItem('syncSettings'));
    console.log('🔧 Obiect syncSettings:', syncSettings);
    console.log('👤 Partner Name:', syncSettings.partnerName);
    console.log('🔄 Auto Sync:', syncSettings.autoSync);
    console.log('📝 Setup Completed:', syncSettings.setupCompleted);
    
    // Testează și afișează în UI
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
        console.log('🎯 Sync Indicator în DOM:', indicator.textContent);
    }
    
    return syncSettings;
}

// Funcție pentru resetare setări (în caz de probleme)
function resetSyncSettings() {
    if (confirm('⚠️ Sigur vrei să resetezi toate setările de sincronizare?\n\nVei pierde configurația partenerului.')) {
        localStorage.removeItem('syncSettings');
        syncSettings = {};
        initializeSyncSettings();
        updateSyncStatus();
        alert('✅ Setări resetate! Reconfigurează partenerul.');
    }
}

function checkForAutoSync() {
    // Nu mai verific dacă partenerul e configurat - permite sync chiar și fără
    if (!syncSettings.autoSync) return;
    
    const lastDataUpdate = getLastDataUpdateTime();
    const lastSync = syncSettings.lastSyncTime;
    
    // Dacă datele sunt mai noi decât ultima sincronizare
    if (!lastSync || new Date(lastDataUpdate) > new Date(lastSync)) {
        // Așteaptă 3 secunde după salvare, apoi întreabă
        setTimeout(() => {
            showSyncPrompt();
        }, 3000);
    }
}

function getLastDataUpdateTime() {
    let latestTime = null;
    
    Object.keys(indexData).forEach(type => {
        const data = indexData[type];
        if (data.lastUpdate) {
            const updateTime = new Date(data.lastUpdate);
            if (!latestTime || updateTime > latestTime) {
                latestTime = updateTime;
            }
        }
    });
    
    return latestTime ? latestTime.toISOString() : null;
}

function showSyncPrompt() {
    if (!syncSettings.syncNotifications) return;
    
    const partnerName = syncSettings.partnerName || 'partenerul tău';
    const message = '🔄 Ai adăugat date noi!\n\n' +
                   '📤 Vrei să sincronizezi cu ' + partnerName + '?\n\n' +
                   '✅ Da - trimite acum\n' +
                   '⏰ Mai târziu\n' +
                   '❌ Nu întreba azi';
    
    // Folosim o notificare non-intruzivă
    showSyncNotification(message);
}

function showSyncNotification(message) {
    // Creează o notificare în aplicație (nu popup)
    const notification = document.createElement('div');
    notification.className = 'sync-notification';
    const partnerName = syncSettings.partnerName || 'partenerul tău';
    
    notification.innerHTML = `
        <div class="sync-notification-content">
            <h4>🔄 Sincronizare Disponibilă</h4>
            <p>Ai adăugat date noi! Vrei să sincronizezi cu ${partnerName}?</p>
            <div class="sync-notification-buttons">
                <button class="btn btn-success" onclick="quickSync(); hideSyncNotification();">📤 Trimite Acum</button>
                <button class="btn" onclick="hideSyncNotification();">⏰ Mai Târziu</button>
                <button class="btn" onclick="snoozeSync(); hideSyncNotification();" style="font-size: 11px;">❌ Nu azi</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-hide după 15 secunde
    setTimeout(() => {
        if (document.body.contains(notification)) {
            hideSyncNotification();
        }
    }, 15000);
}

function hideSyncNotification() {
    const notification = document.querySelector('.sync-notification');
    if (notification) {
        notification.remove();
    }
}

function snoozeSync() {
    // Nu întreba până mâine
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    syncSettings.snoozeUntil = tomorrow.toISOString();
    localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
}

function quickSync() {
    // Sincronizare rapidă cu mesaj pre-completat
    if (Object.keys(indexData).length === 0) {
        alert('❌ Nu ai date de sincronizat!');
        return;
    }

    try {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: indexData,
            summary: generateDataSummary(),
            syncInfo: {
                from: 'Auto-Sync',
                partnerName: syncSettings.partnerName,
                syncTime: new Date().toISOString()
            }
        };

        const jsonData = JSON.stringify(exportData);
        const compressed = btoa(encodeURIComponent(jsonData));
        
        const currentUrl = window.location.href.split('?')[0];
        const shareUrl = currentUrl + '?import=' + compressed;
        
        // Mesaj personalizat pentru partener
        const personalizedMessage = generatePersonalizedShareMessage(shareUrl, exportData.summary);
        
        // Încearcă native share mai întâi
        if (navigator.share) {
            navigator.share({
                title: 'Indexuri Actualizate - ' + syncSettings.partnerName,
                text: 'Date noi de indexuri pentru sincronizare',
                url: shareUrl
            }).then(() => {
                markSyncCompleted();
            }).catch(() => {
                fallbackQuickShare(shareUrl, personalizedMessage);
            });
        } else {
            fallbackQuickShare(shareUrl, personalizedMessage);
        }
        
    } catch (error) {
        console.error('❌ Eroare la sincronizare:', error);
        alert('❌ Eroare la sincronizarea datelor.\n\nÎncearcă din nou.');
    }
}

function generatePersonalizedShareMessage(shareUrl, summary) {
    const partnerName = syncSettings.partnerName;
    const lastTypes = summary.indexTypes.length > 0 ? summary.indexTypes.join(', ') : 'date noi';
    
    return `🔄 Salut ${partnerName}!\n\n` +
           `Am adăugat date noi la indexuri:\n` +
           `📊 ${summary.totalIndexes} indexuri actualizate\n` +
           `🏷️ Tipuri: ${lastTypes}\n` +
           `🕐 ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'})}\n\n` +
           `🔗 Link pentru sincronizare:\n${shareUrl}\n\n` +
           `📱 Instrucțiuni:\n` +
           `1. Deschide link-ul\n` +
           `2. Aplicația va detecta automat datele\n` +
           `3. Confirmă importul\n\n` +
           `✨ Gata! Datele noastre sunt sincronizate!`;
}

function fallbackQuickShare(shareUrl, message) {
    // Copiază automat link-ul și afișează mesajul
    copyToClipboard(shareUrl);
    
    alert('📤 Link copiat!\n\n' + 
          '📝 Mesaj pregătit pentru ' + syncSettings.partnerName + ':\n\n' +
          message.substring(0, 200) + '...\n\n' +
          '💡 Lipește link-ul în WhatsApp/SMS și trimite mesajul!');
    
    markSyncCompleted();
}

function markSyncCompleted() {
    syncSettings.lastSyncTime = new Date().toISOString();
    localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
    console.log('✅ Sincronizare marcată ca completată');
}

// ========== DETECTARE AUTOMATĂ IMPORT ==========

function enhancedImportDetection() {
    const urlParams = new URLSearchParams(window.location.search);
    const importParam = urlParams.get('import');
    
    if (importParam) {
        // Curăță URL-ul
        window.history.replaceState({}, document.title, window.location.pathname);
        
        setTimeout(() => {
            // Analizează datele înainte de import
            try {
                const jsonData = decodeURIComponent(atob(importParam));
                const importData = JSON.parse(jsonData);
                
                let fromPartner = 'cineva';
                let partnerConfigPrompt = '';
                
                if (importData.syncInfo && importData.syncInfo.partnerName) {
                    fromPartner = importData.syncInfo.partnerName;
                    
                    // Verifică dacă trebuie să configureze partenerul
                    if (!syncSettings.partnerName) {
                        partnerConfigPrompt = `\n🤝 Partenerul "${fromPartner}" va fi configurat automat!`;
                    } else if (syncSettings.partnerName !== fromPartner) {
                        partnerConfigPrompt = `\n🔄 Partenerul va fi actualizat la "${fromPartner}"`;
                    }
                }
                
                const autoImport = confirm(
                    '📥 Date de sincronizare detectate!\n\n' +
                    '👤 De la: ' + fromPartner + '\n' +
                    '📊 Indexuri: ' + importData.summary.totalIndexes + '\n' +
                    '🕐 Data: ' + new Date(importData.timestamp).toLocaleDateString('ro-RO') + 
                    partnerConfigPrompt + '\n\n' +
                    '🔄 Doriți să sincronizați automat?'
                );
                
                if (autoImport) {
                    importFromData(importParam, true);
                }
            } catch (error) {
                // Fallback la detectarea normală
                const autoImport = confirm('📥 Link cu date de import detectat!\n\nDoriți să importați datele automat?');
                if (autoImport) {
                    importFromData(importParam, false);
                }
            }
        }, 1000);
    }
}

// ========== FUNCȚII PENTRU TABS ==========

function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    document.getElementById(section).classList.add('active');
    
    const tabs = document.querySelectorAll('.tab');
    if (section === 'indexuri') {
        tabs[0].classList.add('active');
    } else if (section === 'auto') {
        tabs[1].classList.add('active');
    } else if (section === 'setari') {
        tabs[2].classList.add('active');
    }
    
    console.log('📂 Secțiunea ' + section + ' activată');
}

// ========== FUNCȚII PENTRU FORMULARE ==========

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
    
    // Verifică sincronizarea după salvare
    setTimeout(() => {
        checkForAutoSync();
    }, 500);
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

// ========== FUNCȚII PENTRU SCANARE ==========

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
        water: { min: 10000, max: 99999 },    
        gas: { min: 10000, max: 99999 },      
        electric: { min: 100000, max: 999999 } 
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

// ========== EXPORT/IMPORT FUNCTIONS ==========

function exportToLink() {
    if (Object.keys(indexData).length === 0) {
        alert('❌ Nu aveți date de partajat!\n\nAdăugați câteva indexuri mai întâi.');
        return;
    }

    try {
        // Determină numele expeditorului
        let senderName = syncSettings.partnerName || 'Necunoscut';
        
        // Dacă nu e configurat partenerul, întreabă numele
        if (!syncSettings.partnerName) {
            const userName = prompt('👤 Cum te numești?\n\n(Pentru ca destinatarul să știe de la cine primește datele)\n\nEx: "Mihai", "Soțul", "Ana"');
            if (userName && userName.trim()) {
                senderName = userName.trim();
            }
        }
        
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: indexData,
            summary: generateDataSummary(),
            syncInfo: {
                from: 'Manual Export',
                partnerName: senderName, // Numele expeditorului (pentru configurare automată)
                syncTime: new Date().toISOString(),
                senderConfigured: !!syncSettings.partnerName // Dacă expeditorul are partener configurat
            }
        };

        const jsonData = JSON.stringify(exportData);
        const compressed = btoa(encodeURIComponent(jsonData));
        
        const currentUrl = window.location.href.split('?')[0];
        const shareUrl = currentUrl + '?import=' + compressed;
        
        if (syncSettings.partnerName) {
            const personalizedMessage = generatePersonalizedShareMessage(shareUrl, exportData.summary);
            showShareOptionsPersonalized(shareUrl, personalizedMessage);
        } else {
            // Mesaj pentru utilizatori neconfigurați
            const basicMessage = generateBasicShareMessage(shareUrl, exportData.summary, senderName);
            showShareOptions(shareUrl, exportData.summary, basicMessage);
        }
        
        markSyncCompleted();
        console.log('📤 Date exportate cu succes de la:', senderName);
        
    } catch (error) {
        console.error('❌ Eroare la export:', error);
        alert('❌ Eroare la crearea link-ului de partajare.\n\nÎncercați din nou.');
    }
}

function generateBasicShareMessage(shareUrl, summary, senderName) {
    return `📤 Date Indexuri de la ${senderName}\n\n` +
           `📊 ${summary.totalIndexes} indexuri actualizate\n` +
           `🏷️ Tipuri: ${summary.indexTypes.join(', ')}\n` +
           `🕐 ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'})}\n\n` +
           `🔗 Link pentru import:\n${shareUrl}\n\n` +
           `📱 Instrucțiuni:\n` +
           `1. Deschide link-ul\n` +
           `2. Aplicația va detecta automat datele\n` +
           `3. Confirmă importul\n` +
           `4. ${senderName} va fi configurat automat ca partener de sincronizare\n\n` +
           `✨ Gata! Sincronizarea bilaterală va fi activă!`;
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

function showShareOptions(shareUrl, summary, customMessage = null) {
    const message = customMessage || ('📤 Partajare date indexuri\n\n' +
                   '📊 Rezumat:\n' +
                   '• ' + summary.totalIndexes + ' indexuri înregistrate\n' +
                   '• Tipuri: ' + summary.indexTypes.join(', ') + '\n' +
                   '• Ultima actualizare: ' + (summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleDateString('ro-RO') : 'N/A') + '\n\n' +
                   '🔗 Link pentru import:\n' + shareUrl + '\n\n' +
                   '💡 Instrucțiuni pentru soție:\n' +
                   '1. Deschide link-ul pe telefonul ei\n' +
                   '2. Apasă "📥 Importă date" din Statistici\n' +
                   '3. Confirmă importul\n\n' +
                   'Dorești să:');

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

function showShareOptionsPersonalized(shareUrl, personalizedMessage) {
    if (navigator.share) {
        navigator.share({
            title: 'Indexuri Actualizate - ' + syncSettings.partnerName,
            text: personalizedMessage.substring(0, 100) + '...',
            url: shareUrl
        }).catch(error => {
            console.log('Share cancelled sau eroare:', error);
            fallbackSharePersonalized(shareUrl, personalizedMessage);
        });
    } else {
        fallbackSharePersonalized(shareUrl, personalizedMessage);
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

function fallbackSharePersonalized(shareUrl, personalizedMessage) {
    copyToClipboard(shareUrl);
    
    const recipientName = syncSettings.partnerName || 'destinatarul';
    
    alert('📤 Link copiat!\n\n' + 
          '📝 Mesaj pregătit pentru ' + recipientName + ':\n\n' +
          personalizedMessage.substring(0, 200) + '...\n\n' +
          '💡 Lipește în WhatsApp/SMS și trimite!');
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

function importFromData(compressedData, isAutoSync = false) {
    try {
        const jsonData = decodeURIComponent(atob(compressedData));
        const importData = JSON.parse(jsonData);
        
        if (!importData.version || !importData.data) {
            throw new Error('Format de date invalid');
        }
        
        const summary = importData.summary;
        
        // ========== CONFIGURARE AUTOMATĂ PARTENER ==========
        let autoConfiguredPartner = false;
        
        // Dacă nu am partener configurat și primesc de la cineva
        if (!syncSettings.partnerName && importData.syncInfo && importData.syncInfo.partnerName) {
            const senderName = importData.syncInfo.partnerName;
            
            if (confirm(`🤝 Ai primit date de la "${senderName}"!\n\n` +
                       `Vrei să configurez automat "${senderName}" ca partenerul tău de sincronizare?\n\n` +
                       `✅ Da - configurez automat\n` +
                       `❌ Nu - import doar datele`)) {
                
                // Configurează automat partenerul
                syncSettings.partnerName = senderName;
                syncSettings.autoSync = true;
                syncSettings.syncNotifications = true;
                syncSettings.setupCompleted = true;
                syncSettings.configuredAt = new Date().toISOString();
                syncSettings.autoConfiguredFrom = 'import';
                
                if (saveSyncSettings()) {
                    autoConfiguredPartner = true;
                    console.log('🤝 Partener configurat automat:', senderName);
                }
            }
        }
        
        // Verifică dacă partenerul actual match-uie cu sender-ul
        else if (syncSettings.partnerName && importData.syncInfo && importData.syncInfo.partnerName) {
            const senderName = importData.syncInfo.partnerName;
            const currentPartner = syncSettings.partnerName;
            
            // Dacă nu match-uie, întreabă dacă vrea să actualizeze
            if (senderName !== currentPartner) {
                if (confirm(`🔄 Ai primit date de la "${senderName}"!\n\n` +
                           `Partenerul tău curent: "${currentPartner}"\n\n` +
                           `Vrei să actualizez partenerul la "${senderName}"?\n\n` +
                           `✅ Da - actualizez partenerul\n` +
                           `❌ Nu - păstrez "${currentPartner}"`)) {
                    
                    syncSettings.partnerName = senderName;
                    syncSettings.configuredAt = new Date().toISOString();
                    syncSettings.autoConfiguredFrom = 'import_update';
                    
                    if (saveSyncSettings()) {
                        autoConfiguredPartner = true;
                        console.log('🔄 Partener actualizat:', senderName);
                    }
                }
            }
        }
        
        // ========== MESAJ DE CONFIRMARE ÎMBUNĂTĂȚIT ==========
        let confirmMessage = '📥 Confirmare import\n\n' +
                           '📊 Date de importat:\n' +
                           '• ' + summary.totalIndexes + ' indexuri\n' +
                           '• Tipuri: ' + summary.indexTypes.join(', ') + '\n' +
                           '• Data: ' + (summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleDateString('ro-RO') : 'N/A') + '\n\n';
        
        if (importData.syncInfo && importData.syncInfo.partnerName) {
            confirmMessage += '👤 Sincronizare de la: ' + importData.syncInfo.partnerName + '\n';
            if (autoConfiguredPartner) {
                confirmMessage += '🤝 Partener configurat automat!\n';
            }
            confirmMessage += '\n';
        }
        
        confirmMessage += '⚠️ ATENȚIE: Aceasta va înlocui toate datele existente!\n\n' +
                         'Continuați cu importul?';
        
        if (confirm(confirmMessage)) {
            const backup = JSON.stringify(indexData);
            
            try {
                indexData = importData.data;
                localStorage.setItem('indexData', JSON.stringify(indexData));
                
                // Marchează timpul de sincronizare
                if (isAutoSync && importData.syncInfo) {
                    syncSettings.lastSyncTime = importData.syncInfo.syncTime;
                    saveSyncSettings();
                }
                
                updateAllDisplays();
                
                // Actualizează statusul sincronizării dacă s-a configurat partenerul
                if (autoConfiguredPartner) {
                    updateSyncStatus();
                }
                
                checkReminders();
                
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100, 50, 100]);
                }
                
                let successMessage = '✅ Import realizat cu succes!\n\n📊 ' + summary.totalIndexes + ' indexuri importate';
                
                if (importData.syncInfo && importData.syncInfo.partnerName) {
                    successMessage += '\n🤝 Sincronizat cu ' + importData.syncInfo.partnerName;
                }
                
                if (autoConfiguredPartner) {
                    successMessage += '\n🎉 Partener configurat automat pentru sincronizări viitoare!';
                }
                
                alert(successMessage + '\n\nMergeți la secțiunea Utilități pentru a vedea datele.');
                
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

// ========== FUNCȚII UTILITARE ==========

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

// ========== ACTUALIZARE AFIȘAJE ==========

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

// ========== SISTEM DE REMINDER-URI ==========

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

// ========== ACȚIUNI RAPIDE ==========

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

// Funcție pentru grupuri de sincronizare
function showSyncGroups() {
    const groups = syncSettings.groups || [];
    
    let message = '👥 Grupuri de Sincronizare\n\n';
    
    if (groups.length === 0) {
        message += '📝 Nu ai grupuri configurate.\n\n';
    } else {
        message += '📋 Grupurile tale:\n';
        groups.forEach((group, index) => {
            message += `${index + 1}. ${group.name} (${group.members.join(', ')})\n`;
        });
        message += '\n';
    }
    
    message += 'Ce vrei să faci?\n\n';
    message += '1. Adaugă grup nou (ex: Familie)\n';
    message += '2. Trimite la grup specific\n';
    message += '3. Configurează partener principal\n';
    message += '4. Anulează\n\n';
    message += 'Alege opțiunea (1-4):';
    
    const choice = prompt(message);
    
    switch(choice) {
        case '1':
            createSyncGroup();
            break;
        case '2':
            if (groups.length > 0) {
                selectGroupToSync();
            } else {
                alert('❌ Nu ai grupuri create. Creează unul mai întâi.');
            }
            break;
        case '3':
            setupPartner();
            break;
        case '4':
        default:
            break;
    }
}

function createSyncGroup() {
    const groupName = prompt('👥 Numele grupului:\n\n(Ex: "Familie", "Părinți", "Casa Mare")\n\nScrie numele:');
    
    if (!groupName || !groupName.trim()) return;
    
    const members = prompt('👤 Membrii grupului:\n\n(Ex: "Mama, Tata", "Ana, Mihai, Mama")\n\nScrie numele membrilor (separate prin virgulă):');
    
    if (!members || !members.trim()) return;
    
    const memberList = members.split(',').map(m => m.trim()).filter(m => m);
    
    if (memberList.length === 0) {
        alert('❌ Trebuie să adaugi cel puțin un membru!');
        return;
    }
    
    // Inițializează grupurile dacă nu există
    if (!syncSettings.groups) {
        syncSettings.groups = [];
    }
    
    // Adaugă grupul nou
    syncSettings.groups.push({
        name: groupName.trim(),
        members: memberList,
        createdAt: new Date().toISOString()
    });
    
    saveSyncSettings();
    
    alert(`✅ Grupul "${groupName}" a fost creat cu succes!\n\nMembri: ${memberList.join(', ')}\n\nAcum poți trimite date către acest grup din meniul de sincronizare.`);
}

function selectGroupToSync() {
    const groups = syncSettings.groups || [];
    
    if (groups.length === 0) {
        alert('❌ Nu ai grupuri create.');
        return;
    }
    
    let message = '👥 Alege grupul pentru sincronizare:\n\n';
    groups.forEach((group, index) => {
        message += `${index + 1}. ${group.name} (${group.members.join(', ')})\n`;
    });
    message += '\nIntroduceți numărul grupului:';
    
    const choice = prompt(message);
    const groupIndex = parseInt(choice) - 1;
    
    if (groupIndex >= 0 && groupIndex < groups.length) {
        const selectedGroup = groups[groupIndex];
        syncToGroup(selectedGroup);
    } else {
        alert('❌ Selecție invalidă!');
    }
}

function syncToGroup(group) {
    if (Object.keys(indexData).length === 0) {
        alert('❌ Nu ai date de sincronizat!');
        return;
    }

    try {
        const exportData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: indexData,
            summary: generateDataSummary(),
            syncInfo: {
                from: 'Group Sync',
                partnerName: 'Grupul ' + group.name,
                groupName: group.name,
                groupMembers: group.members,
                syncTime: new Date().toISOString(),
                isGroupSync: true
            }
        };

        const jsonData = JSON.stringify(exportData);
        const compressed = btoa(encodeURIComponent(jsonData));
        
        const currentUrl = window.location.href.split('?')[0];
        const shareUrl = currentUrl + '?import=' + compressed;
        
        // Mesaj pentru grup
        const groupMessage = generateGroupShareMessage(shareUrl, exportData.summary, group);
        
        // Copiază link-ul
        copyToClipboard(shareUrl);
        
        alert(`📤 Link copiat pentru grupul "${group.name}"!\n\n` + 
              `📝 Mesaj pregătit pentru ${group.members.join(', ')}:\n\n` +
              groupMessage.substring(0, 200) + '...\n\n' +
              `💡 Trimite în grupul WhatsApp "${group.name}"!`);
        
        markSyncCompleted();
        
    } catch (error) {
        console.error('❌ Eroare la sincronizarea grupului:', error);
        alert('❌ Eroare la sincronizarea cu grupul.\n\nÎncearcă din nou.');
    }
}

function generateGroupShareMessage(shareUrl, summary, group) {
    return `👥 Date Indexuri pentru ${group.name}\n\n` +
           `📊 ${summary.totalIndexes} indexuri actualizate\n` +
           `🏷️ Tipuri: ${summary.indexTypes.join(', ')}\n` +
           `🕐 ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO', {hour: '2-digit', minute: '2-digit'})}\n\n` +
           `🔗 Link pentru vizualizare:\n${shareUrl}\n\n` +
           `📱 Pentru ${group.members.join(', ')}:\n` +
           `1. Deschideți link-ul\n` +
           `2. Vedeți indexurile actualizate\n` +
           `3. Opțional: importați datele în aplicația voastră\n\n` +
           `💡 Acum toată familia poate vedea indexurile!`;
}

// ========== EVENT LISTENERS ==========

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

// ========== FUNCȚIA DE RESET PENTRU TESTARE ==========

function resetAllData() {
    // Prima confirmare - Adaptată pentru aplicația cu sincronizare bilaterală
    const confirmed = confirm(
        '⚠️ ATENȚIE - FUNCȚIE DE TESTARE!\n\n' +
        'Această acțiune va șterge datele de utilizator:\n\n' +
        '💧 Indexuri Apă (baie, bucătărie)\n' +
        '🔥 Gaz & Electricitate\n' +
        '🏢 Plăți Asociație de Proprietari\n' +
        '🚗 Întreținere Mașină & Documente\n' +
        '📊 Statistici și istoric\n\n' +
        '✅ SE PĂSTREAZĂ:\n' +
        '🤝 Sincronizarea cu ' + (syncSettings.partnerName || 'partenerul') + '\n' +
        '⚙️ Setările aplicației\n' +
        '🔄 Configurația sincronizării bilaterale\n\n' +
        'Ideal pentru ca prietenii să poată testa aplicația cu interfața goală.\n' +
        'Sunteți sigur că vreți să continuați?'
    );
    
    if (!confirmed) {
        console.log('📋 Reset anulat de utilizator la prima confirmare');
        return;
    }
    
    // A doua confirmare pentru siguranță
    const doubleCheck = confirm(
        '🚨 ULTIMA CONFIRMARE!\n\n' +
        'Resetul va șterge doar datele de utilizator.\n' +
        'Sincronizarea cu ' + (syncSettings.partnerName || 'partenerul') + ' rămâne activă.\n' +
        'Aplicația va reveni la starea inițială goală.\n\n' +
        'Continuați cu resetarea pentru testare?'
    );
    
    if (!doubleCheck) {
        console.log('📋 Reset anulat de utilizator la a doua confirmare');
        return;
    }
    
    try {
        console.log('🧹 Începe resetarea pentru testare...');
        console.log('📊 Date înainte de reset:', localStorage.length, 'elemente în localStorage');
        
        // PĂSTREAZĂ setările critice de sincronizare
        const setariCritice = {
            // Setări de sincronizare bilaterală - FOARTE IMPORTANTE
            syncSettings: localStorage.getItem('syncSettings'),
            
            // Backup suplimentar pentru siguranță
            partnerName: syncSettings.partnerName,
            autoSync: syncSettings.autoSync,
            syncNotifications: syncSettings.syncNotifications,
            setupCompleted: syncSettings.setupCompleted,
            configuredAt: syncSettings.configuredAt,
            lastSyncTime: syncSettings.lastSyncTime,
            version: syncSettings.version
        };
        
        console.log('🔒 Setări critice păstrate pentru restaurare:');
        console.log('👤 Partner:', setariCritice.partnerName);
        console.log('🔄 Auto-sync:', setariCritice.autoSync);
        console.log('📝 Setup completat:', setariCritice.setupCompleted);
        
        // Notifică partenerul despre reset (simulare pentru testare)
        if (syncSettings.partnerName) {
            console.log('📢 Simul notificare partener despre reset de testare pentru:', syncSettings.partnerName);
        }
        
        // Identifică cheile care trebuie șterse (DOAR datele utilizatorului)
        const cheiDeSterg = [];
        const cheiDeProtejat = [
            'sync', 'Sync', 'Settings', 'settings', 'Config', 'config'
        ];
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // Verifică dacă cheia trebuie protejată
            const esteProtejata = cheiDeProtejat.some(protectedKey => 
                key.toLowerCase().includes(protectedKey.toLowerCase())
            );
            
            if (!esteProtejata) {
                cheiDeSterg.push(key);
            }
        }
        
        console.log('🗑️ Chei identificate pentru ștergere:', cheiDeSterg);
        console.log('🔒 Chei protejate (NU se șterg):', 
            Array.from({length: localStorage.length}, (_, i) => localStorage.key(i))
                .filter(key => !cheiDeSterg.includes(key))
        );
        
        // Șterge doar datele utilizatorului
        cheiDeSterg.forEach(key => {
            localStorage.removeItem(key);
            console.log(`✅ Șters: ${key}`);
        });
        
        // Restaurează setările critice (în caz că au fost șterse accidental)
        if (setariCritice.syncSettings) {
            localStorage.setItem('syncSettings', setariCritice.syncSettings);
            console.log('🔄 Restaurat: syncSettings');
        }
        
        // Resetează variabila globală indexData
        indexData = {};
        
        // Verifică că sincronizarea a rămas intactă
        const verificareSyncSettings = localStorage.getItem('syncSettings');
        if (verificareSyncSettings) {
            const parsed = JSON.parse(verificareSyncSettings);
            console.log('✅ Verificare sincronizare după reset:');
            console.log('👤 Partner verificat:', parsed.partnerName);
            console.log('🔄 Auto-sync verificat:', parsed.autoSync);
        }
        
        console.log('✅ Reset pentru testare finalizat cu succes!');
        console.log('📊 Date după reset:', localStorage.length, 'elemente în localStorage');
        console.log('🤝 Sincronizarea a fost păstrată intactă');
        
        // Afișează mesaj de succes
        alert(
            '✅ Reset pentru testare finalizat!\n\n' +
            '🗑️ Datele de utilizator au fost șterse\n' +
            '🤝 Sincronizarea cu ' + (syncSettings.partnerName || 'partenerul') + ' funcționează\n' +
            '⚙️ Toate setările de sistem au fost păstrate\n' +
            '🎯 Aplicația este acum goală și gata pentru testare\n\n' +
            '🔄 Aplicația se va reîncărca...'
        );
        
        // Reîncarcă aplicația cu un delay pentru a permite utilizatorului să vadă mesajul
        setTimeout(() => {
            console.log('🔄 Reîncărcare aplicație cu sincronizare păstrată...');
            window.location.reload();
        }, 2000); // 2 secunde pentru a citi mesajul
        
    } catch (error) {
        console.error('❌ Eroare la reset pentru testare:', error);
        
        alert(
            '❌ Eroare la resetarea datelor!\n\n' +
            'A apărut o problemă tehnică.\n' +
            'Sincronizarea a rămas intactă.\n' +
            'Încercați să reîncărcați pagina manual (Ctrl+F5).'
        );
        
        if (confirm('Vreți să reîncărcați pagina acum pentru a rezolva problema?')) {
            window.location.reload();
        }
    }
}

// Funcții helper pentru debugging (opționale pentru dezvoltare)
function debugResetFunction() {
    console.log('🔍 DEBUG RESET FUNCTION:');
    console.log('📊 Total localStorage keys:', localStorage.length);
    console.log('🤝 Partner configurat:', syncSettings.partnerName);
    console.log('🔄 Auto-sync activ:', syncSettings.autoSync);
    console.log('📝 Setup completat:', syncSettings.setupCompleted);
    
    const allKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        allKeys.push(localStorage.key(i));
    }
    console.log('🔑 Toate cheile din localStorage:', allKeys);
    
    return {
        totalKeys: localStorage.length,
        partnerName: syncSettings.partnerName,
        autoSync: syncSettings.autoSync,
        allKeys: allKeys
    };
}

// Expune funcția de debug pentru development (opțional)
window.debugResetFunction = debugResetFunction;

// ========== INIȚIALIZARE APLICAȚIE ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicația de indexuri s-a încărcat cu sincronizare bilaterală!');
    
    // Verifică și validează setările la pornire
    validateSyncSettings();
    
    document.getElementById('formDate').value = new Date().toISOString().split('T')[0];
    
    // Verifică dacă e prima rulare pentru configurare partener
    if (!syncSettings.partnerName && Object.keys(indexData).length === 0) {
        setTimeout(() => {
            if (confirm('🤝 Bună! Pentru a folosi sincronizarea automată,\nvrei să configurezi partenerul de sincronizare?\n\n(Poți configura mai târziu din Setări)')) {
                setupPartner();
            }
        }, 2000);
    }
    
    enhancedImportDetection();
    updateAllDisplays();
    updateSyncStatus();
    checkReminders();
    
    // Verifică setările periodic (la fiecare minut)
    setInterval(() => {
        validateSyncSettings();
        updateSyncStatus();
        checkReminders();
    }, 60000);
    
    // Debug info la pornire
    console.log('📊 Date încărcate:', Object.keys(indexData).length, 'categorii');
    console.log('🤝 Sincronizare cu:', syncSettings.partnerName || 'Neconfigurat');
    console.log('🔧 Versiune setări:', syncSettings.version || 'Necunoscută');
    
    // Verifică consistența setărilor după 5 secunde
    setTimeout(() => {
        const verification = JSON.parse(localStorage.getItem('syncSettings') || '{}');
        if (!verification.partnerName && syncSettings.partnerName) {
            console.warn('⚠️ Detectată inconsistență în setări - restaurez...');
            saveSyncSettings();
            updateSyncStatus();
        }
    }, 5000);
});

window.addEventListener('load', function() {
    console.log('🎉 Aplicația Indexuri & Reminder-uri cu Sincronizare Bilaterală este gata!');
    setTimeout(() => {
        checkReminders();
        // Verificare finală setări
        updateSyncStatus();
    }, 1000);
    
    // Log final pentru confirmare că resetul e disponibil
    console.log('🔧 Funcția de reset pentru testare a fost încărcată și este gata de folosit!');
});
