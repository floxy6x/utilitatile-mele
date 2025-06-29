// Date globale
let indexData = JSON.parse(localStorage.getItem('indexData') || '{}');
let syncSettings = JSON.parse(localStorage.getItem('syncSettings') || '{}');
let currentFormType = null;
let currentFormId = null;

// Inițializare setări sincronizare
if (!syncSettings.partnerName) {
    syncSettings = {
        partnerName: '',
        autoSync: true,
        lastSyncTime: null,
        syncNotifications: true
    };
}

// ========== FUNCȚII PENTRU SINCRONIZARE BILATERALĂ ==========

function setupPartner() {
    const partnerName = prompt('🤝 Cum se numește partenerul tău?\n\n(Ex: "Soția", "Ana", "Mihai")\n\nAceasta va personaliza mesajele de sincronizare:');
    
    if (partnerName && partnerName.trim()) {
        syncSettings.partnerName = partnerName.trim();
        syncSettings.autoSync = true;
        syncSettings.syncNotifications = true;
        localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
        
        alert('✅ Perfect! Acum aplicația va sugera automat să partajezi datele cu ' + partnerName + ' când adaugi ceva nou!');
        updateSyncStatus();
    }
}

function updateSyncStatus() {
    // Adaugă indicatori vizuali pentru statusul sincronizării
    const syncIndicator = document.getElementById('syncIndicator');
    if (syncIndicator) {
        if (syncSettings.partnerName) {
            syncIndicator.innerHTML = '🤝 Sincronizat cu ' + syncSettings.partnerName;
            syncIndicator.className = 'sync-indicator connected';
        } else {
            syncIndicator.innerHTML = '⚠️ Nu e configurat partenerul';
            syncIndicator.className = 'sync-indicator disconnected';
        }
    }
}

function checkForAutoSync() {
    if (!syncSettings.partnerName || !syncSettings.autoSync) return;
    
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
    
    const partnerName = syncSettings.partnerName;
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
    notification.innerHTML = `
        <div class="sync-notification-content">
            <h4>🔄 Sincronizare Disponibilă</h4>
            <p>Ai adăugat date noi! Vrei să sincronizezi cu ${syncSettings.partnerName}?</p>
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
                if (importData.syncInfo && importData.syncInfo.partnerName) {
                    fromPartner = importData.syncInfo.partnerName;
                }
                
                const autoImport = confirm(
                    '📥 Date de sincronizare detectate!\n\n' +
                    '👤 De la: ' + fromPartner + '\n' +
                    '📊 Indexuri: ' + importData.summary.totalIndexes + '\n' +
                    '🕐 Data: ' + new Date(importData.timestamp).toLocaleDateString('ro-RO') + '\n\n' +
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

// ========== ÎMBUNĂTĂȚIRI FUNCȚII EXISTENTE ==========

// Modifică saveForm pentru a include notificări de sincronizare
const originalSaveForm = window.saveForm;
window.saveForm = function() {
    originalSaveForm.call(this);
    
    // După salvare, verifică dacă trebuie să sincronizeze
    setTimeout(() => {
        checkForAutoSync();
    }, 500);
};

// Modifică importFromData pentru a include info de sincronizare
function importFromData(compressedData, isAutoSync = false) {
    try {
        const jsonData = decodeURIComponent(atob(compressedData));
        const importData = JSON.parse(jsonData);
        
        if (!importData.version || !importData.data) {
            throw new Error('Format de date invalid');
        }
        
        const summary = importData.summary;
        let confirmMessage = '📥 Confirmare import\n\n' +
                           '📊 Date de importat:\n' +
                           '• ' + summary.totalIndexes + ' indexuri\n' +
                           '• Tipuri: ' + summary.indexTypes.join(', ') + '\n' +
                           '• Data: ' + (summary.lastUpdate ? new Date(summary.lastUpdate).toLocaleDateString('ro-RO') : 'N/A') + '\n\n';
        
        if (importData.syncInfo && importData.syncInfo.partnerName) {
            confirmMessage += '👤 Sincronizare de la: ' + importData.syncInfo.partnerName + '\n\n';
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
                    localStorage.setItem('syncSettings', JSON.stringify(syncSettings));
                }
                
                updateAllDisplays();
                checkReminders();
                
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100, 50, 100]);
                }
                
                let successMessage = '✅ Import realizat cu succes!\n\n📊 ' + summary.totalIndexes + ' indexuri importate';
                
                if (importData.syncInfo && importData.syncInfo.partnerName) {
                    successMessage += '\n🤝 Sincronizat cu ' + importData.syncInfo.partnerName;
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

// ========== FUNCȚII ORIGINALE MODIFICATE ==========

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
    
    // Verifică sincronizarea după salvare
    setTimeout(() => {
        checkForAutoSync();
    }, 500);
}

// ========== RESTUL FUNCȚIILOR ORIGINALE (încorporate din codul anterior) ==========

// [Aici ar urma toate celelalte funcții din script.js original - funcții pentru ștergere, 
//  scanare, export/import, actualizare afișaje, etc. - toate rămân la fel]

// Funcții pentru ștergere (toate rămân ca în versiunea anterioară)
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

// [Toate celelalte funcții de ștergere rămân identice cu versiunea anterioară]

// Export/Import cu sincronizare îmbunătățită
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
            summary: generateDataSummary(),
            syncInfo: {
                from: 'Manual Export',
                partnerName: syncSettings.partnerName || 'Necunoscut',
                syncTime: new Date().toISOString()
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
            showShareOptions(shareUrl, exportData.summary);
        }
        
        markSyncCompleted();
        console.log('📤 Date exportate cu succes');
        
    } catch (error) {
        console.error('❌ Eroare la export:', error);
        alert('❌ Eroare la crearea link-ului de partajare.\n\nÎncercați din nou.');
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

function fallbackSharePersonalized(shareUrl, personalizedMessage) {
    copyToClipboard(shareUrl);
    alert('📤 Link copiat!\n\n' + 
          '📝 Mesaj pregătit pentru ' + syncSettings.partnerName + ':\n\n' +
          personalizedMessage.substring(0, 200) + '...\n\n' +
          '💡 Lipește în WhatsApp/SMS și trimite!');
}

// [Toate celelalte funcții - getTypeName, updateAllDisplays, etc. rămân identice]

// Funcții utilitare (toate rămân la fel)
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

// [Restul funcțiilor pentru actualizare afișaje, reminder-uri, etc. rămân identice]

// Inițializare aplicație cu sincronizare
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Aplicația de indexuri s-a încărcat cu sincronizare bilaterală!');
    
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
    
    setInterval(checkReminders, 60000);
    
    console.log('📊 Date încărcate:', Object.keys(indexData).length, 'categorii');
    console.log('🤝 Sincronizare cu:', syncSettings.partnerName || 'Neconfigurat');
});

window.addEventListener('load', function() {
    console.log('🎉 Aplicația Indexuri & Reminder-uri cu Sincronizare Bilaterală este gata!');
    setTimeout(checkReminders, 1000);
});
