// RestoApp - Acceso del administrador
//
// Solo hay un tipo de cuenta: el administrador. Los clientes hacen pedidos
// sin iniciar sesión, así que la única página protegida es admin.html.
(function () {
    'use strict';

    var usuario = null;

    function mensajeError(err) {
        switch (err && err.code) {
            case 'auth/invalid-email': return 'Correo inválido.';
            case 'auth/missing-password': return 'Ingresa tu contraseña.';
            case 'auth/too-many-requests': return 'Demasiados intentos. Espera unos minutos.';
            case 'auth/network-request-failed': return 'Sin conexión. Revisa tu internet.';
            case 'auth/email-already-in-use': return 'Ese correo ya está registrado.';
            case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Credenciales inválidas.';
            case 'PERMISSION_DENIED': return 'No tienes permisos para esta operación.';
            default: return (err && err.message) || 'Ocurrió un error. Intenta de nuevo.';
        }
    }

    function validar(email, pass) {
        if (!email) return 'Ingresa tu correo.';
        if (email.indexOf('@') === -1) return 'Correo inválido.';
        if (!pass) return 'Ingresa tu contraseña.';
        if (pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
        return null;
    }

    // --- Barra superior ---

    function pintarSesion(user) {
        var caja = document.getElementById('sesion');
        var correo = document.getElementById('sesionCorreo');
        if (!caja) return;
        caja.classList.toggle('oculto', !user);
        if (user && correo) correo.textContent = user.email;
    }

    // --- Página de acceso ---

    function initLogin() {
        var boton = document.getElementById('entrarBtn');
        if (!boton) return;

        boton.addEventListener('click', function () {
            var email = document.getElementById('email').value.trim();
            var pass = document.getElementById('pass').value;

            var error = validar(email, pass);
            if (error) {
                Resto.mensaje('authMsg', error, true);
                return;
            }

            boton.disabled = true;
            Resto.mensaje('authMsg', 'Verificando...');

            firebase.auth().signInWithEmailAndPassword(email, pass)
                .then(function () { window.location.href = 'admin.html'; })
                .catch(function (err) {
                    console.error('Error de acceso:', err);
                    Resto.mensaje('authMsg', mensajeError(err), true);
                    boton.disabled = false;
                });
        });

        var form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); boton.click(); }
            });
        }
    }

    function initSalir() {
        var boton = document.getElementById('salirBtn');
        if (!boton) return;
        boton.addEventListener('click', function () {
            firebase.auth().signOut().then(function () {
                window.location.href = 'index.html';
            });
        });
    }

    // --- Estado de sesión ---
    // admin.html arranca con el contenido oculto y solo lo muestra cuando
    // Firebase confirma la sesión; así nadie alcanza a usar el panel antes
    // de que se sepa si tiene permiso.

    function alCambiarSesion(user) {
        usuario = user;
        pintarSesion(user);

        var pagina = document.body.getAttribute('data-pagina');

        if (pagina === 'admin') {
            if (!user) {
                window.location.replace('login.html');
                return;
            }
            var panel = document.getElementById('panel');
            var estado = document.getElementById('estado');
            if (estado) estado.classList.add('oculto');
            if (panel) panel.classList.remove('oculto');
        }

        if (pagina === 'login' && user) {
            window.location.replace('admin.html');
            return;
        }

        document.dispatchEvent(new CustomEvent('sesion-lista', { detail: user }));
    }

    document.addEventListener('DOMContentLoaded', function () {
        initLogin();
        initSalir();
        firebase.auth().onAuthStateChanged(alCambiarSesion);
    });

    window.RestoAuth = {
        usuario: function () { return usuario; },
        mensajeError: mensajeError
    };
})();
