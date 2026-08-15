// RestoApp - Autenticación (Ejercicio 2: módulo IIFE, sin variables globales sueltas)
// Expone un único namespace (window.RestoAuth) en vez de funciones/variables sueltas.
(function () {
    'use strict';

    // TODO(Ejercicio 3): credenciales hardcodeadas en el cliente. Sacarlas de aquí
    // y usar Firebase Auth o un backend mínimo.
    var ADMIN_USER = 'admin';
    var ADMIN_PASS = 'admin';

    function isLogged() {
        // TODO(Ejercicio 3): sessionStorage es un parche para que la sesión
        // sobreviva al cambiar de página en la MPA; no es autenticación real.
        return sessionStorage.getItem('isLogged') === 'true';
    }

    function login(user, pass) {
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            sessionStorage.setItem('isLogged', 'true');
            return true;
        }
        return false;
    }

    function logout() {
        sessionStorage.removeItem('isLogged');
    }

    function initLoginPage() {
        var loginBtn = document.getElementById('loginBtn');
        var logoutBtn = document.getElementById('logoutBtn');
        var authMsg = document.getElementById('authMsg');

        function updateUI() {
            if (isLogged()) {
                authMsg.innerText = 'Autenticado';
                loginBtn.classList.add('hidden');
                logoutBtn.classList.remove('hidden');
            } else {
                authMsg.innerText = '';
                loginBtn.classList.remove('hidden');
                logoutBtn.classList.add('hidden');
            }
        }

        loginBtn.addEventListener('click', function () {
            var user = document.getElementById('user').value;
            var pass = document.getElementById('pass').value;
            if (login(user, pass)) {
                updateUI();
                window.location.href = 'admin.html';
            } else {
                authMsg.innerText = 'Credenciales inválidas';
            }
        });

        logoutBtn.addEventListener('click', function () {
            logout();
            updateUI();
        });

        updateUI();
    }

    function initAdminGuard() {
        if (!isLogged()) {
            window.location.href = 'login.html';
            return;
        }
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () {
                logout();
                window.location.href = 'login.html';
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var page = document.body.getAttribute('data-page');
        if (page === 'login') initLoginPage();
        if (page === 'admin') initAdminGuard();
    });

    window.RestoAuth = { isLogged: isLogged, login: login, logout: logout };
})();
