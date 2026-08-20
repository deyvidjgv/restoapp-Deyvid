// RestoApp - Autenticación (Firebase Auth) + control de acceso por rol
//
// Modelo de acceso:
//   Firebase Auth  -> identidad (¿quién eres?)
//   /usuarios/{uid} -> rol (¿qué puedes hacer?): 'admin' | 'mesero'
//
// Reglas de navegación:
//   index.html  -> pública
//   login.html  -> pública (se elige ingresar como Mesero o Administrador)
//   pedido.html -> panel del mesero (rol mesero o admin)
//   admin.html  -> panel de administración (solo rol admin)
//
// TODO(seguridad): estos guards son de UX, no de seguridad. Un usuario podría
// saltárselos editando el DOM. La barrera real son las reglas de Realtime
// Database (ver database.rules.json), que validan el rol del uid en el
// servidor antes de permitir cada escritura.
(function () {
    'use strict';

    // El estado solo es confiable DESPUÉS de que onAuthStateChanged dispare
    // por primera vez (authReady = true): Firebase tarda un instante en
    // restaurar la sesión al recargar la página, y leer currentUser antes de
    // eso puede devolver null aunque el usuario sí esté autenticado.
    var currentUser = null;
    var currentRole = null;
    var currentRecord = null;
    var authReady = false;

    // Mientras se crea una cuenta (bootstrap de admin) el usuario existe en
    // Auth pero todavía no tiene registro de rol. Sin esta bandera, el guard
    // lo interpretaría como "cuenta sin permisos" y lo cerraría a mitad del
    // proceso.
    var suspendGuards = false;

    var readyQueue = [];

    var MSG_KEY = 'restoapp:authMsg';

    // --- Utilidades de estado ---

    function isLogged() { return !!currentUser; }
    function getRole() { return currentRole; }
    function isAdmin() { return currentRole === window.RestoRoles.ADMIN; }

    function onReady(fn) {
        if (authReady) fn(currentUser, currentRole, currentRecord);
        else readyQueue.push(fn);
    }

    function flushReadyQueue() {
        var pendientes = readyQueue.slice();
        readyQueue = [];
        pendientes.forEach(function (fn) {
            try {
                fn(currentUser, currentRole, currentRecord);
            } catch (err) {
                console.error('Error en callback onReady:', err);
            }
        });
    }

    // --- Mensajes entre páginas (p. ej. "sesión expirada" al redirigir) ---

    function guardarMensaje(texto) {
        try {
            sessionStorage.setItem(MSG_KEY, texto);
        } catch (err) {
            console.warn('No se pudo guardar el mensaje de sesión:', err);
        }
    }

    function tomarMensaje() {
        try {
            var texto = sessionStorage.getItem(MSG_KEY);
            sessionStorage.removeItem(MSG_KEY);
            return texto;
        } catch (err) {
            return null;
        }
    }

    function redirigirALogin(motivo) {
        if (motivo) guardarMensaje(motivo);
        window.location.replace('login.html');
    }

    // --- Operaciones de Firebase Auth ---

    function login(email, password) {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    }

    function logout() {
        return firebase.auth().signOut();
    }

    function mensajeError(err) {
        switch (err && err.code) {
            case 'auth/email-already-in-use': return 'Ese correo ya está registrado.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/invalid-email': return 'Correo inválido.';
            case 'auth/missing-password': return 'Ingresa una contraseña.';
            case 'auth/missing-email': return 'Ingresa un correo.';
            case 'auth/too-many-requests': return 'Demasiados intentos fallidos. Espera unos minutos.';
            case 'auth/network-request-failed': return 'Sin conexión con el servidor. Revisa tu internet.';
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Credenciales inválidas.';
            case 'PERMISSION_DENIED': return 'No tienes permisos para esta operación.';
            default: return 'Ocurrió un error. Intenta de nuevo.';
        }
    }

    function validarCredenciales(email, password) {
        if (!email) return 'Ingresa tu correo.';
        if (email.indexOf('@') === -1) return 'Correo inválido.';
        if (!password) return 'Ingresa tu contraseña.';
        if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
        return null;
    }

    // --- Navegación compartida por todas las páginas ---

    function marcarPaginaActiva() {
        var page = document.body.getAttribute('data-page');
        var link = document.querySelector('.site-nav a[data-nav="' + page + '"]');
        if (link) link.classList.add('active');
    }

    function renderNav(user, rol, record) {
        var navPedido = document.getElementById('navPedidoLink');
        var navAdmin = document.getElementById('navAdminLink');
        var navLogin = document.getElementById('navLoginLink');
        var navLogout = document.getElementById('navLogoutBtn');
        var navUser = document.getElementById('navUser');

        function mostrar(el, visible) {
            if (el) el.classList.toggle('hidden', !visible);
        }

        mostrar(navPedido, !!rol);
        mostrar(navAdmin, rol === window.RestoRoles.ADMIN);
        mostrar(navLogin, !user);
        mostrar(navLogout, !!user);

        if (navUser) {
            if (user && rol) {
                var nombre = (record && record.nombre) || user.email;
                navUser.innerText = nombre + ' · ' + (rol === window.RestoRoles.ADMIN ? 'Admin' : 'Mesero');
                navUser.classList.remove('hidden');
            } else {
                navUser.innerText = '';
                navUser.classList.add('hidden');
            }
        }
    }

    function initNavLogout() {
        var navLogout = document.getElementById('navLogoutBtn');
        if (!navLogout) return;
        navLogout.addEventListener('click', function () {
            logout()
                .then(function () { window.location.href = 'index.html'; })
                .catch(function (err) {
                    console.error('Error al cerrar sesión:', err);
                    window.location.href = 'index.html';
                });
        });
    }

    // --- Página de login ---

    var rolSeleccionado = window.RestoRoles ? window.RestoRoles.MESERO : 'mesero';

    function mostrarMensajeLogin(texto, esError) {
        var authMsg = document.getElementById('authMsg');
        if (!authMsg) return;
        authMsg.innerText = texto || '';
        authMsg.classList.toggle('error', esError !== false);
    }

    function initSelectorRol() {
        var botones = document.querySelectorAll('.role-option');
        if (!botones.length) return;

        Array.prototype.forEach.call(botones, function (btn) {
            btn.addEventListener('click', function () {
                rolSeleccionado = btn.getAttribute('data-role');
                Array.prototype.forEach.call(botones, function (otro) {
                    var activo = otro === btn;
                    otro.classList.toggle('active', activo);
                    otro.setAttribute('aria-pressed', activo ? 'true' : 'false');
                });
                actualizarAyudaRol();
                mostrarMensajeLogin('');
            });
        });
    }

    function actualizarAyudaRol() {
        var ayuda = document.getElementById('roleHelp');
        var bootstrapBox = document.getElementById('bootstrapBox');
        if (ayuda) {
            ayuda.innerText = rolSeleccionado === window.RestoRoles.ADMIN
                ? 'Acceso al panel de administración: productos, stock y meseros.'
                : 'Acceso al panel del mesero: tomar pedidos del menú.';
        }
        if (bootstrapBox) {
            bootstrapBox.classList.toggle('hidden', rolSeleccionado !== window.RestoRoles.ADMIN);
        }
    }

    // Tras autenticar, el rol real vive en la base de datos: si no coincide
    // con el que el usuario eligió en el selector, se cierra la sesión para
    // no dejarlo en un estado ambiguo.
    function verificarRolYRedirigir(user) {
        return window.RestoRoles.getUserRecord(user.uid).then(function (record) {
            if (!record || !record.rol) {
                return logout().then(function () {
                    mostrarMensajeLogin('Esta cuenta no tiene un rol asignado. Pide a un administrador que la registre.');
                });
            }
            if (record.activo === false) {
                return logout().then(function () {
                    mostrarMensajeLogin('Esta cuenta está desactivada. Contacta al administrador.');
                });
            }
            if (record.rol !== rolSeleccionado) {
                var esperado = record.rol === window.RestoRoles.ADMIN ? 'administrador' : 'mesero';
                return logout().then(function () {
                    mostrarMensajeLogin('Esta cuenta es de ' + esperado + '. Selecciona ese perfil para ingresar.');
                });
            }
            window.location.href = record.rol === window.RestoRoles.ADMIN ? 'admin.html' : 'pedido.html';
        });
    }

    function manejarLogin() {
        var email = document.getElementById('email').value.trim();
        var pass = document.getElementById('pass').value;

        var error = validarCredenciales(email, pass);
        if (error) {
            mostrarMensajeLogin(error);
            return;
        }

        setFormularioOcupado(true);
        mostrarMensajeLogin('Verificando...', false);

        login(email, pass)
            .then(function (cred) { return verificarRolYRedirigir(cred.user); })
            .catch(function (err) {
                console.error('Login error:', err);
                mostrarMensajeLogin(mensajeError(err));
            })
            .then(function () { setFormularioOcupado(false); });
    }

    // Bootstrap: la PRIMERA cuenta de administrador se crea desde aquí porque
    // todavía no hay ningún admin que pueda crearla. A partir de ese momento
    // el autorregistro queda cerrado y las cuentas nuevas (meseros u otros
    // admins) solo se crean desde el panel de administración.
    function existeAlgunAdmin() {
        return firebase.database().ref('usuarios')
            .orderByChild('rol')
            .equalTo(window.RestoRoles.ADMIN)
            .limitToFirst(1)
            .once('value')
            .then(function (snap) { return snap.exists(); });
    }

    function manejarBootstrapAdmin() {
        var nombre = document.getElementById('bootstrapName').value.trim();
        var email = document.getElementById('email').value.trim();
        var pass = document.getElementById('pass').value;

        if (!nombre) {
            mostrarMensajeLogin('Escribe el nombre del administrador.');
            return;
        }
        var error = validarCredenciales(email, pass);
        if (error) {
            mostrarMensajeLogin(error);
            return;
        }

        setFormularioOcupado(true);
        mostrarMensajeLogin('Creando cuenta de administrador...', false);
        suspendGuards = true;

        existeAlgunAdmin()
            .then(function (existe) {
                if (existe) {
                    throw new Error('ADMIN_YA_EXISTE');
                }
                return firebase.auth().createUserWithEmailAndPassword(email, pass);
            })
            .then(function (cred) {
                return window.RestoRoles
                    .crearRegistroAdmin(cred.user.uid, { nombre: nombre, email: email })
                    .then(function () { return cred.user; });
            })
            .then(function () {
                suspendGuards = false;
                window.location.href = 'admin.html';
            })
            .catch(function (err) {
                suspendGuards = false;
                setFormularioOcupado(false);
                if (err && err.message === 'ADMIN_YA_EXISTE') {
                    mostrarMensajeLogin('Ya existe un administrador. Pídele que cree tu cuenta desde el panel.');
                    return;
                }
                console.error('Bootstrap admin error:', err);
                mostrarMensajeLogin(mensajeError(err));
                // Si la cuenta de Auth alcanzó a crearse pero falló el registro
                // del rol, la sesión quedaría a medias: se cierra para que el
                // usuario pueda reintentar desde cero.
                if (firebase.auth().currentUser) logout();
            });
    }

    function setFormularioOcupado(ocupado) {
        var ids = ['loginBtn', 'bootstrapBtn', 'email', 'pass', 'bootstrapName'];
        ids.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.disabled = !!ocupado;
        });
    }

    function updateLoginUI(user, rol) {
        var loginForm = document.getElementById('loginForm');
        var alreadyMsg = document.getElementById('alreadyLoggedMsg');
        var alreadyLink = document.getElementById('alreadyLoggedLink');
        if (!loginForm || !alreadyMsg) return;

        var sesionValida = !!user && !!rol;
        loginForm.classList.toggle('hidden', sesionValida);
        alreadyMsg.classList.toggle('hidden', !sesionValida);

        if (sesionValida && alreadyLink) {
            var esAdmin = rol === window.RestoRoles.ADMIN;
            alreadyLink.setAttribute('href', esAdmin ? 'admin.html' : 'pedido.html');
            alreadyLink.innerText = esAdmin ? 'Panel de administración' : 'Panel del mesero';
        }
    }

    function initLoginPage() {
        var loginBtn = document.getElementById('loginBtn');
        if (!loginBtn) return;

        initSelectorRol();
        actualizarAyudaRol();

        var pendiente = tomarMensaje();
        if (pendiente) mostrarMensajeLogin(pendiente);

        loginBtn.addEventListener('click', manejarLogin);

        var bootstrapBtn = document.getElementById('bootstrapBtn');
        if (bootstrapBtn) bootstrapBtn.addEventListener('click', manejarBootstrapAdmin);

        var form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    manejarLogin();
                }
            });
        }
    }

    // --- Guards por página ---

    function aplicarGuard(page, user, rol, record) {
        if (page !== 'admin' && page !== 'pedido') return;

        if (!user) {
            redirigirALogin('Inicia sesión para continuar.');
            return;
        }
        if (!rol) {
            logout().then(function () {
                redirigirALogin('Tu cuenta no tiene un rol asignado.');
            });
            return;
        }
        if (record && record.activo === false) {
            logout().then(function () {
                redirigirALogin('Tu cuenta está desactivada.');
            });
            return;
        }
        if (page === 'admin' && rol !== window.RestoRoles.ADMIN) {
            window.location.replace('pedido.html');
            return;
        }

        var contenido = document.getElementById('pageContent');
        var status = document.getElementById('pageStatus');
        if (status) status.classList.add('hidden');
        if (contenido) contenido.classList.remove('hidden');
    }

    // --- Ciclo de vida ---

    function handleAuthChange(user) {
        if (suspendGuards) return;

        currentUser = user;

        if (!user) {
            currentRole = null;
            currentRecord = null;
            authReady = true;
            renderNav(null, null, null);
            aplicarGuardPagina();
            flushReadyQueue();
            return;
        }

        window.RestoRoles.getUserRecord(user.uid)
            .then(function (record) {
                currentRecord = record;
                currentRole = record && record.rol ? record.rol : null;
            })
            .catch(function (err) {
                console.error('No se pudo leer el rol del usuario:', err);
                currentRecord = null;
                currentRole = null;
            })
            .then(function () {
                authReady = true;
                renderNav(currentUser, currentRole, currentRecord);
                aplicarGuardPagina();
                flushReadyQueue();
            });
    }

    function aplicarGuardPagina() {
        var page = document.body.getAttribute('data-page');
        if (page === 'login') updateLoginUI(currentUser, currentRole);
        aplicarGuard(page, currentUser, currentRole, currentRecord);
    }

    document.addEventListener('DOMContentLoaded', function () {
        marcarPaginaActiva();
        initNavLogout();
        initLoginPage();
        firebase.auth().onAuthStateChanged(handleAuthChange);
    });

    window.RestoAuth = {
        isLogged: isLogged,
        isAdmin: isAdmin,
        isAuthReady: function () { return authReady; },
        getUser: function () { return currentUser; },
        getRole: getRole,
        getRecord: function () { return currentRecord; },
        onReady: onReady,
        login: login,
        logout: logout,
        mensajeError: mensajeError
    };
})();
