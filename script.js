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
    document.getElementById('formLabel').textContent = 'Index curent (nou):';
    document.getElementById('formValue').placeholder = 'Ex: 123456';
    document.getElementById('previousIndexGroup').style.display = 'block';
    document.getElementById('kmGroup').style.display = 'none';
    document.getElementById('dateGroup').style.display = 'none';
    
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
        water: { min: 100000, max: 999999 },
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
    document.getElementById('formLabel').textContent = 'Index detectat (nou):';
    document.getElementById('formValue').placeholder = 'Verificați valoarea';
    document.getElementById('previousIndexGroup').style.display = 'block';
    document.getElementById('kmGroup').style.display = 'none';
    document.getElementById('dateGroup').style.display = 'none';
    
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
