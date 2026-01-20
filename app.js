document.addEventListener('DOMContentLoaded', () => {
    const CONFIG = {
        // Asegúrate de que esta URL sea la de tu PROXY
        API_PROXY_URL: 'https://proxy-g8a7cyeeeecsg5hc.mexicocentral-01.azurewebsites.net/api/ravens-proxy'
    };

    const SCREENS = { LOGIN: 'login-screen', MENU: 'menu-screen', PROVEEDOR: 'proveedor-screen' };
    let currentUser = {};
    let readyToSendPhoto = null; 

    // DOM Elements
    const screens = document.querySelectorAll('.screen');
    const loginForm = document.getElementById('login-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const loginButton = document.getElementById('login-button');
    const togglePassword = document.getElementById('togglePassword');
    const loginError = document.getElementById('login-error');
    const menuItems = document.querySelectorAll('.menu-item');
    const popup = document.getElementById('confirmation-popup');
    const okBtn = document.getElementById('popup-ok-btn');
    const logoutButton = document.getElementById('logout-button');
    
    // PWA Elements
    const installPopup = document.getElementById('install-popup');
    const btnInstall = document.getElementById('btn-install');
    const btnCloseInstall = document.getElementById('btn-close-install');
    const installText = document.getElementById('install-text');
    let deferredPrompt;

    const normalizeId = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '-');

    const showScreen = (screenId) => {
        screens.forEach(screen => screen.classList.remove('active'));
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) {
            if (activeScreen.classList.contains('form-page')) {
                // Obtenemos el ID del formulario actual
                const formId = activeScreen.dataset.formId;

                // --- MODIFICACIÓN: DETECTAR EL MÓDULO DE ELIMINAR/ACCESOS ---
                // Si el ID es "Eliminar QR" o "Accesos Activos", cargamos la libreta en lugar del formulario
                if (formId === 'Eliminar QR' || formId === 'Accesos Activos') {
                    renderAccesosActivos(activeScreen);
                } else {
                    readyToSendPhoto = null;
                    generateFormContent(activeScreen);
                }
            }
            activeScreen.classList.add('active');
            window.scrollTo(0, 0);
        }
    };

    // --- CHECK SESSION ---
    const checkSession = () => {
        const savedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            if (!currentUser.condominio || currentUser.condominio === 'No especificado') {
                console.warn("Sesión inválida (sin condominio), forzando logout.");
                doLogout();
            } else {
                showScreen(SCREENS.MENU);
            }
        } else {
            showScreen(SCREENS.LOGIN);
        }
    };

    const doLogout = () => {
        currentUser = {};
        sessionStorage.removeItem('currentUser');
        localStorage.removeItem('currentUser');
        if(passwordInput) passwordInput.value = '';
        showScreen(SCREENS.LOGIN);
    };

    checkSession();

    // --- LOGIN ---
    if (loginForm && togglePassword) {
        togglePassword.addEventListener('click', function () {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            loginError.classList.add('hidden');
            loginButton.disabled = true;
            loginButton.textContent = 'Verificando...';

            try {
                const response = await fetch(CONFIG.API_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'login', username, password })
                });
                
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Credenciales inválidas');
                }
                
                currentUser = { 
                    username: username, 
                    condominio: data.condominioId || data.condominio || (data.data && data.data.condominioId) || (data.data && data.data.condominio)
                };
                
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    sessionStorage.removeItem('currentUser');
                } else {
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    localStorage.removeItem('currentUser');
                }
                
                showScreen(SCREENS.MENU);

            } catch (error) {
                loginError.textContent = error.message;
                loginError.classList.remove('hidden');
            } finally {
                loginButton.disabled = false;
                loginButton.textContent = 'Entrar';
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', doLogout);
    }

    if (menuItems.length > 0) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => showScreen(item.dataset.screen));
        });
    }

    // --- PWA LOGIC ---
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    if (!(window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode)) {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if(installPopup) installPopup.style.display = 'block';
        });

        if (isIos && installPopup) {
            setTimeout(() => {
                installPopup.style.display = 'block';
                installText.innerHTML = "Para instalar en iPhone:<br>1. Pulsa <b>Compartir</b> <i class='fa-solid fa-arrow-up-from-bracket'></i><br>2. Selecciona <b>'Agregar a Inicio'</b> ➕";
                if(btnInstall) btnInstall.style.display = 'none'; 
                if(btnCloseInstall) btnCloseInstall.textContent = "Entendido";
            }, 2000);
        }
    }

    if (btnInstall) {
        btnInstall.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Usuario decidió: ${outcome}`);
                deferredPrompt = null;
                installPopup.style.display = 'none';
            }
        });
    }

    if (btnCloseInstall) {
        btnCloseInstall.addEventListener('click', () => {
            installPopup.style.display = 'none';
        });
    }

    // --- FORMS CONFIG ---
    // NOTA: Se eliminó 'Eliminar QR' de aquí porque ahora se maneja con renderAccesosActivos
    const formDefinitions = {
        'Residente': [ 
            { label: 'Nombre', type: 'text' }, 
            { label: 'Relación', type: 'text' } 
        ],
        'Visita': [ 
            { label: 'Nombre', type: 'text' }, 
            { label: 'Motivo', type: 'text' } 
        ],
        'Evento': [ 
            { label: 'Nombre del evento o del residente', type: 'text', field: 'Nombre' }, 
            { label: 'N QR', type: 'select', options: ['1', '5', '10'], field: 'Nqr' } 
        ],
        'Proveedor': [ 
            { label: 'Nombre', type: 'text' }, 
            { label: 'Asunto', type: 'text' }, 
            { label: 'Empresa', type: 'text' } 
        ],
        'Personal de servicio': [
            { label: 'Nombre', type: 'text' }, 
            { label: 'Cargo', type: 'text' },
            { label: 'Foto', type: 'file', field: 'Foto' }, 
            { label: 'Hora de Entrada', type: 'time', field: 'Hora_Entrada' }, 
            { label: 'Hora de Salida', type: 'time', field: 'Hora_Salida' },
            { label: 'Días de Trabajo', type: 'checkbox-group', options: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'], field: 'Dias_Trabajo' },
            { label: 'Requiere Revisión', type: 'select', options: ['SÍ', 'NO'], field: 'Requiere_Revision' },
            { label: 'Puede Salir Con', type: 'checkbox-group', options: ['Perros', 'Autos', 'Niños'], field: 'Puede_Salir_Con' },
            { label: 'Tipo', type: 'select', options: ['Fijo/Planta', 'Eventual'], id: 'tipo-personal' },
            { label: 'Fecha Inicio', type: 'date', isConditional: true }, 
            { label: 'Fecha Fin', type: 'date', isConditional: true }
        ],
        'Incidencias': [ 
            { label: 'Nivel de Urgencia', type: 'select', options: ['Baja', 'Media', 'Alta'] }, 
            { label: 'Incidencia', type: 'textarea' } 
        ]
    };

    // --- NUEVA LÓGICA: ACCESOS ACTIVOS (LIBRETA) ---
    async function renderAccesosActivos(container) {
        // Estructura Base de la Pantalla
        container.innerHTML = `
            <header class="header-app">
                <div class="header-logo">
                    <img src="./icons/logo.png" alt="Ravens Logo">
                    <span class="header-logo-text">RAVENS ACCESS</span>
                </div>
            </header>
            <div class="form-title-section" style="justify-content: space-between;">
                <h2 class="form-title">Accesos Activos</h2>
                <div style="display:flex; align-items:center; gap:15px;">
                    <i class="fas fa-sync-alt fa-lg cursor-pointer" id="btn-refresh-access" style="color: #4ade80;"></i>
                    <div class="home-icon cursor-pointer"><i class="fa-solid fa-house" style="font-size: 1.5rem;"></i></div>
                </div>
            </div>
            <div class="form-container" style="background-color: #f8fafc;">
                <div id="access-list-container">
                    <div class="loader"></div>
                    <p style="text-align:center; color:#666;">Cargando accesos...</p>
                </div>
            </div>`;

        // Eventos de navegación
        container.querySelector('.home-icon').addEventListener('click', () => showScreen(SCREENS.MENU));
        container.querySelector('#btn-refresh-access').addEventListener('click', () => loadAccessList());

        // Carga inicial de datos
        await loadAccessList();
    }

    async function loadAccessList() {
        const listContainer = document.getElementById('access-list-container');
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="loader"></div>';

        try {
            // Petición al Proxy: Acción 'get_active_accesses'
            const response = await fetch(CONFIG.API_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'get_active_accesses', 
                    condominio: currentUser.condominio,
                    registradoPor: currentUser.username // <--- AQUÍ ESTABA EL ERROR, AHORA YA SE ENVÍA EL USUARIO
                })
            });

            const result = await response.json();
            
            // Si falla o no hay data
            if (!result.success || !result.data || result.data.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-clipboard-check fa-3x" style="color:#d1d5db; margin-bottom:15px;"></i>
                        <p>No tienes accesos activos o QRs vigentes registrados.</p>
                    </div>`;
                return;
            }

            // Renderizar Tarjetas
            let html = '';
            result.data.forEach(item => {
                // Ajusta estos campos según lo que devuelva tu API (ej. item.Nombre, item.Tipo, item.ID)
                const nombre = item.Nombre || item.Visitante || "Sin nombre";
                const tipo = item.Tipo || "Acceso";
                const fecha = item.Fecha || item.Created || "";
                // Formatear fecha simple
                const dateStr = fecha ? new Date(fecha).toLocaleDateString() : "";

                html += `
                    <div class="access-card">
                        <div class="access-info">
                            <h4>${nombre}</h4>
                            <p>${tipo} • ${dateStr}</p>
                            ${item.Codigo ? `<p style="font-size:0.8rem; color:#9ca3af;">Code: ${item.Codigo}</p>` : ''}
                        </div>
                        <div class="access-actions">
                            <button class="btn-delete-access" onclick="window.confirmDeleteAccess('${item.ID}', '${nombre}')">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            listContainer.innerHTML = html;

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = `<div class="empty-state"><p style="color:#dc2626;">Error al conectar con el servidor.</p></div>`;
        }
    }

    // Función Global para poder llamarla desde el onclick del HTML inyectado
    window.confirmDeleteAccess = (id, nombre) => {
        if(confirm(`¿Estás seguro que deseas eliminar el acceso de: ${nombre}? \nEl código QR dejará de funcionar.`)) {
            deleteAccess(id);
        }
    };

    async function deleteAccess(id) {
        // Mostrar estado de carga visual simple
        const listContainer = document.getElementById('access-list-container');
        
        try {
            const response = await fetch(CONFIG.API_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'delete_access', // Acción para eliminar
                    id_eliminacion: id,
                    condominio: currentUser.condominio,
                    registradoPor: currentUser.username // <--- AQUÍ TAMBIÉN SE ENVÍA EL USUARIO
                })
            });

            const result = await response.json();

            if (result.success) {
                alert("Acceso eliminado correctamente.");
                loadAccessList(); // Recargar lista
            } else {
                alert("Error al eliminar: " + (result.message || "Desconocido"));
            }

        } catch (error) {
            console.error(error);
            alert("Error de conexión al intentar eliminar.");
        }
    }

    // --- FIN NUEVA LÓGICA ---

    function generateFormContent(formPage) {
        formPage.innerHTML = '';  
        const formId = formPage.dataset.formId;
        const fields = formDefinitions[formId];
        
        // Si no hay definición (ej. caso raro), salir
        if (!fields) return;

        let fieldsHtml = '';

        fields.forEach(field => {
            const fieldId = field.id || `${normalizeId(formId)}-${normalizeId(field.label)}`;
            const dataField = field.field || field.label;
            let inputHtml = '';
            
            if (field.type === 'select') {
                const optionsHtml = field.options.map(opt => `<option>${opt}</option>`).join('');
                inputHtml = `<select id="${fieldId}" data-field="${dataField}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">${optionsHtml}</select>`;
            } else if (field.type === 'textarea') {
                inputHtml = `<textarea id="${fieldId}" data-field="${dataField}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" rows="4"></textarea>`;
            } else if (field.type === 'file') {
                inputHtml = `<div class="flex flex-col"><input type="file" id="${fieldId}" data-field="${dataField}" accept="image/*" capture="environment" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"><span id="${fieldId}-status" class="text-xs text-gray-500 mt-1"></span></div>`;
            } else if (field.type === 'checkbox-group') {
                inputHtml = `<div id="${fieldId}" data-field="${dataField}" class="mt-1 space-y-2">`;
                field.options.forEach((option, index) => {
                    const checkboxId = `${fieldId}-${index}`;
                    inputHtml += `<div class="flex items-center"><input type="checkbox" id="${checkboxId}" name="${fieldId}" value="${option}" class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"><label for="${checkboxId}" class="ml-2 block text-sm text-gray-900">${option}</label></div>`;
                });
                inputHtml += `</div>`;
            } else {
                const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                inputHtml = `<input type="${field.type}" id="${fieldId}" data-field="${dataField}" ${placeholder} class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">`;
            }
            const conditionalClass = field.isConditional ? 'conditional-field' : '';
            fieldsHtml += `<div class="${conditionalClass}"><label for="${fieldId}" class="block font-bold text-gray-700">${field.label}</label>${inputHtml}</div>`;
        });
        
        formPage.innerHTML = `<br>
            <header class="header-app"><div class="header-logo"><img src="./icons/logo.png" alt="Ravens Logo"><span class="header-logo-text">RAVENS ACCESS</span></div></header><br>
            <div class="form-title-section"><h2 class="form-title">${formId}</h2><div class="home-icon cursor-pointer"><i class="fa-solid fa-house" style="font-size: 1.5rem;"></i></div></div><br>
            <div class="form-container"><br>
                <form class="space-y-4" novalidate><br>
                    ${fieldsHtml}<br>
                    <div class="mt-8"><button type="submit" class="btn-save w-full py-3 rounded text-white font-bold shadow-lg" style="background-color: #16a34a !important;">Guardar</button></div><br>
                    <p class="form-error text-red-600 text-sm text-center hidden mt-2"></p><br>
                </form><br>
            </div>`;
        
        formPage.querySelector('.home-icon').addEventListener('click', () => showScreen(SCREENS.MENU));
        formPage.querySelector('form').addEventListener('submit', handleFormSubmit);
        
        setupConditionalFields(formPage);
        setupFileInputListeners(formPage);

        if (formId === 'Evento') {
            const nQrSelect = formPage.querySelector('select[data-field="Nqr"]');
            if (nQrSelect) {
                nQrSelect.addEventListener('change', function() {
                    const cantidad = this.value;
                    alert(`⚠️ ATENCIÓN: El número que seleccionó (${cantidad}) será la cantidad de QRs que se enviarán. Asegúrese de generar esto SOLO si realmente va a tener un evento.`);
                });
            }
        }
    }
    
    function setupConditionalFields(formPage) {
        const trigger = formPage.querySelector('#tipo-personal');
        const conditionalFields = formPage.querySelectorAll('.conditional-field');
        if (!trigger || conditionalFields.length === 0) return;
        
        const updateVisibility = () => {
            const shouldBeVisible = trigger.value === 'Eventual';
            conditionalFields.forEach(field => {
                if (shouldBeVisible) {
                    field.classList.add('visible');
                } else {
                    field.classList.remove('visible');
                    const input = field.querySelector('input');
                    if (input) input.value = ''; 
                }
            });
        };
        trigger.addEventListener('change', updateVisibility);
        updateVisibility();
    }

    function setupFileInputListeners(formPage) {
        const fileInputs = formPage.querySelectorAll('input[type="file"]');
        
        fileInputs.forEach(input => {
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                const statusSpan = document.getElementById(`${input.id}-status`);
                if (!file) {
                    readyToSendPhoto = null;
                    if(statusSpan) statusSpan.textContent = "";
                    return;
                }
                if(statusSpan) statusSpan.textContent = "Comprimiendo foto... espera un momento.";
                try {
                    readyToSendPhoto = await compressImage(file);
                    if(statusSpan) {
                        statusSpan.textContent = "✅ Foto lista.";
                        statusSpan.classList.add("text-green-600");
                    }
                } catch (error) {
                    console.error(error);
                    if(statusSpan) statusSpan.textContent = "❌ Error en la foto. Intenta con otra.";
                    readyToSendPhoto = null;
                }
            });
        });
    }

    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                const scaleSize = MAX_WIDTH / img.width;
                if (scaleSize >= 1) { canvas.width = img.width; canvas.height = img.height; } 
                else { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; }
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                resolve(dataUrl);
            };
            img.onerror = () => reject("Error al procesar imagen");
        });
    }

    async function handleFormSubmit(event) {
        event.preventDefault();
        const form = event.target;
        const formPage = form.closest('.form-page');
        const formId = formPage.dataset.formId;
        const saveButton = form.querySelector('.btn-save');
        const errorP = form.querySelector('.form-error');
        errorP.classList.add('hidden');
        
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Enviando...';
        }

        await new Promise(r => setTimeout(r, 50));

        try {
            const data = {
                action: 'submit_form',
                formulario: formId,
                condominio: currentUser.condominio || 'No especificado',
                registradoPor: currentUser.username || 'No especificado'
            };

            let allFieldsValid = true;

            for (const fieldDefinition of formDefinitions[formId]) {
                const dataField = fieldDefinition.field || fieldDefinition.label;
                const fieldId = fieldDefinition.id || `${normalizeId(formId)}-${normalizeId(fieldDefinition.label)}`;
                const element = document.getElementById(fieldId);
                if (!element) continue;

                let isVisible = true;
                const container = element.closest('.conditional-field');
                if (container && !container.classList.contains('visible')) isVisible = false;
                if (!isVisible) continue;

                if (fieldDefinition.type === 'checkbox-group') {
                    const checkboxes = element.querySelectorAll('input[type="checkbox"]:checked');
                    const selectedOptions = Array.from(checkboxes).map(cb => cb.value);
                    if (dataField === 'Puede_Salir_Con') {
                        data[dataField] = selectedOptions.length > 0 ? selectedOptions.join(', ') : 'Ninguno';
                    } else {
                        const val = selectedOptions.join(', ');
                        data[dataField] = val;
                        if (!val) allFieldsValid = false;
                    }
                } else if (fieldDefinition.type === 'file') {
                    if (readyToSendPhoto) {
                        data[dataField] = readyToSendPhoto;
                    } else {
                        data[dataField] = "";
                        if(isVisible) allFieldsValid = false;
                    }   
                } else {
                    const val = element.value.trim();
                    data[dataField] = val;
                    if (!val) allFieldsValid = false;
                }
            }

            if (!allFieldsValid) throw new Error("Faltan campos obligatorios (Foto, Días, Fechas, etc).");
            
            const response = await fetch(CONFIG.API_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)    
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Error en el servidor');
            }
            
            readyToSendPhoto = null;

            switch (formId) {
                case 'Proveedor':
                    showConfirmationPopup('Guardado', 'Se envio el acceso por WhatsApp.');
                    break;
                case 'Personal de servicio':
                    showConfirmationPopup('Personal Registrado', '¡Guardado! Se envio el acceso por WhatsApp.');
                    break;
                default:
                    showConfirmationPopup('Guardado', 'Se envio el acceso por WhatsApp.');
                    break;
            }

        } catch (error) {
            console.error("Error:", error);
            errorP.textContent = error.message;
            errorP.classList.remove('hidden');
            errorP.scrollIntoView({ behavior: 'smooth' });
        } finally {
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.textContent = 'Guardar';
            }
        }
    }

    function showConfirmationPopup(title, message) {
        if (popup) {
            popup.querySelector('h3').textContent = title;
            popup.querySelector('p').textContent = message;
            popup.style.display = 'flex';
        }
    }

    if (okBtn) {
        okBtn.addEventListener('click', () => {
            if (popup) popup.style.display = 'none';
            const activeForm = document.querySelector('.form-page.active form');
            if (activeForm) {
                activeForm.reset();
                readyToSendPhoto = null;
                const statusSpans = activeForm.querySelectorAll('span[id$="-status"]');
                statusSpans.forEach(s => s.textContent = "");
                const trigger = activeForm.querySelector('#tipo-personal');
                if (trigger) trigger.dispatchEvent(new Event('change'));
                const checkboxGroups = activeForm.querySelectorAll('input[type="checkbox"]');
                checkboxGroups.forEach(checkbox => checkbox.checked = false);
                activeForm.querySelector('.form-error').classList.add('hidden');
            }
            showScreen(SCREENS.MENU);
        });
    }
});
