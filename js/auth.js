// RestoApp - Autenticación con Firebase Auth (Ejercicio 3 + registro)
// La validación ocurre en los servidores de Firebase, no comparando
// strings en el cliente.
//
// TODO(seguridad): el registro está abierto — cualquiera que se registre
// obtiene acceso a admin.html, porque el guard solo valida que haya sesión
// (isLogged), no un rol o correo específico. Para producción: restringir
// con Firebase custom claims, una lista blanca de correos, o quitar el
// autorregistro y crear las cuentas admin manualmente desde la consola.
(function () {
    'use strict';

    function isLogged() {
        return !!firebase.auth().currentUser;
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

    function initLoginPage() {
        var loginBtn = document.getElementById('loginBtn');
        var registerBtn = document.getElementById('registerBtn');
        var logoutBtn = document.getElementById('logoutBtn');
        var authMsg = document.getElementById('authMsg');

        function updateUI(user) {
            if (user) {
                authMsg.innerText = 'Autenticado como ' + user.email;
                loginBtn.classList.add('hidden');
                registerBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                authMsg.innerText = '';
                loginBtn.classList.remove('hidden');
                registerBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
            }
        }

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

        logoutBtn.addEventListener('click', function () {
            logout();
        });

        firebase.auth().onAuthStateChanged(updateUI);
    }

    function initAdminGuard() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                logout().then(function () {
                    window.location.href = 'login.html';
                });
            });
        }

        firebase.auth().onAuthStateChanged(function (user) {
            if (!user) {
                window.location.href = 'login.html';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var page = document.body.getAttribute('data-page');
        if (page === 'login') initLoginPage();
        if (page === 'admin') initAdminGuard();
    });

    window.RestoAuth = { isLogged: isLogged, login: login, register: register, logout: logout };
})();
