document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURACIÓN ---
    const CONFIG = {
        API_PROXY_URL: 'https://proxy-g8a7cyeeeecsg5hc.mexicocentral-01.azurewebsites.net/api/ravens-proxy'
    };

    const SCREENS = {
        LOGIN: 'login-screen',
        MENU: 'menu-screen',
        PROVEEDOR: 'proveedor-screen'
    };
    
    let currentUser = {};

    // --- ELEMENTOS DEL DOM ---
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

    // --- PWA ---
    let deferredPrompt;
    const installPopup = document.getElementById('install-popup');
    const btnInstall = document.getElementById('btn-install');
    const btnCloseInstall = document.getElementById('btn-close-install');
    const installText = document.getElementById('install-text');

    // --- FUNCIÓN MÁGICA PARA QUITAR ACENTOS (ESTA ES LA SOLUCIÓN) ---
    // Convierte "Días de Trabajo" en "dias-de-trabajo" automáticamente
    const cleanId = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
                  .toLowerCase()
                  .replace(/\s+/g, '-'); // Espacios a guiones
    };

    // --- NAVEGACIÓN ---
    const showScreen = (screenId) => {
        screens.forEach(screen => screen.classList.remove('active'));
        const activeScreen = document.getElementById(screenId);
        if (activeScreen) {
            if (activeScreen.classList.contains('form-page')) {
                generateFormContent(activeScreen);
            }
            activeScreen.classList.add('active');
        }
    };

    // --- LOGIN ---
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser && usernameInput) {
        usernameInput.value = rememberedUser;
        rememberMeCheckbox.checked = true;
    }

    if (loginForm && togglePassword) {
        togglePassword.classList.remove('fa-eye', 'fa-eye-slash');
        togglePassword.classList.add('fa-eye');

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
                const loginData = { action: 'login', username, password };
                const response = await fetch(CONFIG.API_PROXY_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(loginData)
                });
                
                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || 'Credenciales inválidas');
                }
                
                currentUser = { 
                    username: username, 
                    condominio: data.condominio || (data.data && data.data.condominio) 
                };
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));     
                
                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('rememberedUser', username);
                } else {
                    localStorage.removeItem('rememberedUser');
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

    if (menuItems.length > 0) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                const screenId = item.dataset.screen;
                if (screenId) showScreen(screenId);
            });
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            currentUser = {};
            sessionStorage.removeItem('currentUser');
            passwordInput.value = '';
            showScreen(SCREENS.LOGIN);
        });
    }

    const checkSession = () => {
        const savedUser = sessionStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showScreen(SCREENS.MENU);
        } else {
            showScreen(SCREENS.LOGIN);
        }
    };

    // --- DEFINICIÓN DE FORMULARIOS (TUS CAMPOS ORIGINALES) ---
    const formDefinitions = {
        'Residente': [ { label: 'Nombre', type: 'text' }, { label: 'Torre', type: 'text' }, { label: 'Departamento', type: 'text' },{ label: 'Relación', type: 'text' } ],
        'Visita': [ { label: 'Nombre', type: 'text' }, { label: 'Torre', type: 'text' }, { label: 'Departamento', type: 'text' }, { label: 'Motivo', type: 'text' } ],
        'Evento': [
            { label: 'Nombre', type: 'text' }, 
            { label: 'Torre', type: 'text' }, 
            { label: 'Departamento', type: 'text' }, 
            { label: 'N QR', type: 'select', options: ['1', '5', '10'], field: 'Nqr' } 
        ],
        'Proveedor': [
            { label: 'Nombre', type: 'text' },
            { label: 'Torre', type: 'text' },
            { label: 'Departamento', type: 'text' },
            { label: 'Asunto', type: 'text' },
            { label: 'Empresa', type: 'text' }
        ],
        'Personal de servicio': [
            { label: 'Nombre', type: 'text' },
            { label: 'Torre', type: 'text' },
            { label: 'Departamento', type: 'text' },
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
        'Eliminar QR': [ { label: 'Nombre', type: 'text' }, { label: 'Torre', type: 'text' }, { label: 'Departamento', type: 'text' }, { label: 'Relación', type: 'text' }, { label: 'Nombre QR', type: 'text', field: 'Nombre_QR' } ],
        'Incidencias': [  
            { label: 'Nombre', type: 'text' },  
            { label: 'Torre', type: 'text' },  
            { label: 'Departamento', type: 'text' },  
            { label: 'Nivel de Urgencia', type: 'select', options: ['Baja', 'Media', 'Alta'] },  
            { label: 'Reportar a', type: 'select', options: ['Administración', 'Ravens Access'] },
            { label: 'Incidencia', type: 'textarea' }  
        ]
    };

    function generateFormContent(formPage) {
        formPage.innerHTML = '';  
        const formId = formPage.dataset.formId;
        const fields = formDefinitions[formId];
        let fieldsHtml = '';

        fields.forEach(field => {
            // USAMOS cleanId AQUI para generar IDs sin acentos
            const fieldId = field.id || `${cleanId(formId)}-${cleanId(field.label)}`;
            const dataField = field.field || field.label;
            
            let inputHtml = '';
            if (field.type === 'select') {
                const optionsHtml = field.options.map(opt => `<option>${opt}</option>`).join('');
                inputHtml = `<select id="${fieldId}" data-field="${dataField}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">${optionsHtml}</select>`;
            } else if (field.type === 'textarea') {
                inputHtml = `<textarea id="${fieldId}" data-field="${dataField}" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500" rows="4"></textarea>`;
            } else if (field.type === 'file') {
                inputHtml = `<input type="file" id="${fieldId}" data-field="${dataField}" accept="image/*" capture="environment" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100">`;
            } else if (field.type === 'checkbox-group') {
                inputHtml = `<div id="${fieldId}" data-field="${dataField}" class="mt-1 space-y-2">`;
                field.options.forEach((option, index) => {
                    const checkboxId = `${fieldId}-${index}`;
                    inputHtml += `
                        <div class="flex items-center">
                            <input type="checkbox" id="${checkboxId}" name="${fieldId}" value="${option}" class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500">
                            <label for="${checkboxId}" class="ml-2 block text-sm text-gray-900">${option}</label>
                        </div>
                    `;
                });
                inputHtml += `</div>`;
            } else {
                const placeholder = field.placeholder ? `placeholder="${field.placeholder}"` : '';
                const minAttr = field.min ? `min="${field.min}"` : '';
                const maxAttr = field.max ? `max="${field.max}"` : '';
                inputHtml = `<input type="${field.type}" id="${fieldId}" data-field="${dataField}" ${placeholder} ${minAttr} ${maxAttr} class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500">`;
            }
            
            const conditionalClass = field.isConditional ? 'conditional-field' : '';
            fieldsHtml += `<div class="${conditionalClass}"><label for="${fieldId}" class="block font-bold text-gray-700">${field.label}</label>${inputHtml}</div>`;
        });
        
        formPage.innerHTML = `
            <header class="header-app">
                <div class="header-logo">
                    <img src="./icons/logo.png" alt="Ravens Logo">
                    <span class="header-logo-text">RAVENS ACCESS</span>
                </div>
            </header>
            
            <div class="form-title-section"> 
                <h2 class="form-title">${formId}</h2> 
                <div class="home-icon cursor-pointer"> 
                    <i class="fa-solid fa-house" style="font-size: 1.5rem;"></i>
                </div> 
            </div>
            
            <div class="form-container"> 
                <form class="space-y-4" novalidate> 
                    ${fieldsHtml} 
                    <div class="mt-8"> 
                        <button type="submit" class="btn-save w-full py-3 rounded text-white font-bold shadow-lg" style="background-color: #16a34a !important;">
                            Guardar
                        </button> 
                    </div> 
                    <p class="form-error text-red-600 text-sm text-center hidden mt-2"></p> 
                </form> 
            </div>`;
        
        formPage.querySelector('.home-icon').addEventListener('click', () => showScreen(SCREENS.MENU));
        formPage.querySelector('form').addEventListener('submit', handleFormSubmit);
        setupConditionalFields(formPage);
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

    function readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
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
        
        // BLOQUE TRY-CATCH PARA EVITAR CONGELAMIENTO
        try {
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = 'Procesando...';
            }

            const data = {
                action: 'submit_form',
                formulario: formId,
                condominio: currentUser.condominio || 'No especificado',
                registradoPor: currentUser.username || 'No especificado'
            };

            let allFieldsValid = true;

            for (const fieldDefinition of formDefinitions[formId]) {
                const dataField = fieldDefinition.field || fieldDefinition.label;
                
                // USAMOS cleanId AQUI TAMBIÉN (ESTO EVITA EL ERROR DEL ACENTO)
                const fieldId = fieldDefinition.id || `${cleanId(formId)}-${cleanId(fieldDefinition.label)}`;
                
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
                    const file = element.files[0];
                    if (file) {
                        // Límite de 5MB para no saturar memoria
                        if (file.size > 5 * 1024 * 1024) {
                            throw new Error("La foto es muy grande (máx 5MB).");
                        }
                        data[dataField] = await readFileAsBase64(file);
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

            if (!allFieldsValid) {
                throw new Error("Por favor, rellena todos los campos obligatorios.");
            }
            
            const response = await fetch(CONFIG.API_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)    
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Error en el servidor');
            }
            
            // Mensajes originales
            switch (formId) {
                case 'Proveedor':
                    showConfirmationPopup('Acceso de Proveedor Registrado', '¡Guardado! La referencia de acceso se enviará vía WhatsApp.');
                    break;
                case 'Eliminar QR':
                    showConfirmationPopup('QR Eliminado', '¡Guardado! El acceso será eliminado.');
                    break;
                case 'Incidencias':
                    showConfirmationPopup('Incidencia Reportada', 'Gracias por tu reporte, le daremos seguimiento.');
                    break;
                case 'Personal de servicio':
                    showConfirmationPopup('Personal Registrado', '¡Guardado! Se envió el QR y los detalles por WhatsApp.');
                    break;
                default:
                    showConfirmationPopup('Acceso Registrado', '¡Guardado! El código QR se enviará vía WhatsApp.');
                    break;
            }

        } catch (error) {
            console.error("Error:", error);
            errorP.textContent = error.message;
            errorP.classList.remove('hidden');
            errorP.scrollIntoView({ behavior: 'smooth' });
        } finally {
            // ESTO ASEGURA QUE EL BOTÓN SE DESBLOQUEE SIEMPRE
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
                const trigger = activeForm.querySelector('#tipo-personal');
                if (trigger) trigger.dispatchEvent(new Event('change'));
                const checkboxGroups = activeForm.querySelectorAll('input[type="checkbox"]');
                checkboxGroups.forEach(checkbox => checkbox.checked = false);
                activeForm.querySelector('.form-error').classList.add('hidden');
            }
            showScreen(SCREENS.MENU);
        });
    }

    // --- PWA ---
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);

    if (window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode) {
        return; 
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if(installPopup) installPopup.style.display = 'block';
    });

    if (isIos && !isInStandaloneMode && installPopup) {
        installPopup.style.display = 'block';
        installText.innerHTML = "Para instalar en iPhone:<br>1. Pulsa el botón <b>Compartir</b> <i class='fa-solid fa-arrow-up-from-bracket'></i><br>2. Selecciona <b>'Agregar a Inicio'</b> ➕";
        if(btnInstall) btnInstall.style.display = 'none';
        if(btnCloseInstall) btnCloseInstall.textContent = "Entendido";
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
});
