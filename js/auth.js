// RestoApp - Autenticación con Firebase Auth (Ejercicio 3)
// Reemplaza las credenciales hardcodeadas por autenticación real:
// la validación ocurre en los servidores de Firebase, no comparando
// strings en el cliente.
(function () {
    'use strict';

    function isLogged() {
        return !!firebase.auth().currentUser;
    }

    function login(email, password) {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    }

    function logout() {
        return firebase.auth().signOut();
    }

    function initLoginPage() {
        var loginBtn = document.getElementById('loginBtn');
        var logoutBtn = document.getElementById('logoutBtn');
        var authMsg = document.getElementById('authMsg');

        function updateUI(user) {
            if (user) {
                authMsg.innerText = 'Autenticado como ' + user.email;
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                authMsg.innerText = '';
                loginBtn.classList.remove('hidden');
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
                    authMsg.innerText = 'Credenciales inválidas';
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

    window.RestoAuth = { isLogged: isLogged, login: login, logout: logout };
})();
