// RestoApp - Autenticación con Firebase Auth + navegación reactiva al login
//
// TODO(seguridad): el registro está abierto — cualquiera que se registre
// obtiene acceso a admin.html, porque el guard solo valida que haya sesión
// (isLogged), no un rol o correo específico. Para producción: restringir
// con Firebase custom claims, una lista blanca de correos, o quitar el
// autorregistro y crear las cuentas admin manualmente desde la consola.
(function () {
    'use strict';

    // Estado de sesión cacheado: currentUser solo es confiable DESPUÉS de que
    // onAuthStateChanged dispare por primera vez (authReady = true). Firebase
    // tarda un instante en restaurar la sesión desde el almacenamiento local
    // al recargar la página; leer firebase.auth().currentUser antes de eso
    // puede devolver null aunque el usuario sí esté autenticado.
    var currentUser = null;
    var authReady = false;

    function isLogged() {
        return !!currentUser;
    }

    function login(email, password) {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    }

    function register(email, password) {
        return firebase.auth().createUserWithEmailAndPassword(email, password);
    }

    function logout() {
        return firebase.auth().signOut();
    }

    function mensajeError(err) {
        switch (err.code) {
            case 'auth/email-already-in-use': return 'Ese correo ya está registrado.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/invalid-email': return 'Correo inválido.';
            case 'auth/missing-password': return 'Ingresa una contraseña.';
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Credenciales inválidas.';
            default: return 'Ocurrió un error. Intenta de nuevo.';
        }
    }

    // --- Navegación (presente en las 4 páginas) ---

    function marcarPaginaActiva() {
        var page = document.body.getAttribute('data-page');
        var link = document.querySelector('.site-nav a[data-nav="' + page + '"]');
        if (link) link.classList.add('active');
    }

    function renderNav(user) {
        var navAdmin = document.getElementById('navAdminLink');
        var navLogin = document.getElementById('navLoginLink');
        var navLogout = document.getElementById('navLogoutBtn');
        if (!navAdmin || !navLogin || !navLogout) return;

        if (user) {
            navAdmin.classList.remove('hidden');
            navLogin.classList.add('hidden');
            navLogout.classList.remove('hidden');
        } else {
            navAdmin.classList.add('hidden');
            navLogin.classList.remove('hidden');
            navLogout.classList.add('hidden');
        }
    }

    function initNavLogout() {
        var navLogout = document.getElementById('navLogoutBtn');
        if (!navLogout) return;
        navLogout.addEventListener('click', function () {
            logout().then(function () {
                window.location.href = 'index.html';
            });
        });
    }

    // --- Página de login ---

    function updateLoginUI(user) {
        var loginForm = document.getElementById('loginForm');
        var alreadyMsg = document.getElementById('alreadyLoggedMsg');
        if (!loginForm) return;

        if (user) {
            loginForm.classList.add('hidden');
            alreadyMsg.classList.remove('hidden');
        } else {
            loginForm.classList.remove('hidden');
            alreadyMsg.classList.add('hidden');
        }
    }

    function initLoginPage() {
        var loginBtn = document.getElementById('loginBtn');
        var registerBtn = document.getElementById('registerBtn');
        var authMsg = document.getElementById('authMsg');
        if (!loginBtn) return;

        loginBtn.addEventListener('click', function () {
            var email = document.getElementById('email').value;
            var pass = document.getElementById('pass').value;
            authMsg.innerText = 'Verificando...';
            login(email, pass)
                .then(function () {
                    window.location.href = 'admin.html';
                })
                .catch(function (err) {
                    console.error('Login error:', err);
                    authMsg.innerText = mensajeError(err);
                });
        });

        registerBtn.addEventListener('click', function () {
            var email = document.getElementById('email').value;
            var pass = document.getElementById('pass').value;
            authMsg.innerText = 'Creando cuenta...';
            register(email, pass)
                .then(function () {
                    window.location.href = 'admin.html';
                })
                .catch(function (err) {
                    console.error('Registro error:', err);
                    authMsg.innerText = mensajeError(err);
                });
        });
    }

    // --- Página de administración ---
    // El formulario arranca oculto (ver admin.html) y solo se revela cuando
    // authReady confirma una sesión válida. Así se elimina la ventana de
    // carrera en la que se podía hacer clic en "Crear" antes de que Firebase
    // terminara de restaurar la sesión.

    function initAdminGuard(user) {
        var productForm = document.getElementById('productForm');
        var status = document.getElementById('adminStatus');
        if (!productForm) return;

        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        status.classList.add('hidden');
        productForm.classList.remove('hidden');
    }

    function handleAuthChange(user) {
        currentUser = user;
        authReady = true;
        renderNav(user);

        var page = document.body.getAttribute('data-page');
        if (page === 'login') updateLoginUI(user);
        if (page === 'admin') initAdminGuard(user);
    }

    document.addEventListener('DOMContentLoaded', function () {
        marcarPaginaActiva();
        initNavLogout();
        initLoginPage();
        firebase.auth().onAuthStateChanged(handleAuthChange);
    });

    window.RestoAuth = {
        isLogged: isLogged,
        isAuthReady: function () { return authReady; },
        login: login,
        register: register,
        logout: logout
    };
})();
