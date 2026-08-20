// RestoApp - Panel de administración: cuentas de mesero
//
// createUserWithEmailAndPassword deja autenticado al usuario recién creado.
// Si se llamara sobre la app principal, el admin perdería su sesión en cuanto
// crea un mesero. Por eso las cuentas se crean en una SEGUNDA instancia de
// Firebase ("creador"), aislada de la sesión del admin; el registro de rol en
// /usuarios sí se escribe con la app principal, que es la que lleva las
// credenciales de admin que las reglas del servidor exigen.
(function () {
    'use strict';

    var meseros = [];
    var appCreador = null;

    function getAppCreador() {
        if (appCreador) return appCreador;
        var existente = firebase.apps.filter(function (app) { return app.name === 'creador'; })[0];
        appCreador = existente || firebase.initializeApp(firebaseConfig, 'creador');
        return appCreador;
    }

    // --- Helpers de DOM ---

    function el(tag, clase, texto) {
        var nodo = document.createElement(tag);
        if (clase) nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }

    function boton(icono, titulo, clase, onClick) {
        var b = el('button', 'btn-icono ' + (clase || ''));
        b.type = 'button';
        b.title = titulo;
        b.setAttribute('aria-label', titulo);
        b.innerHTML = window.RestoIcons.svg(icono);
        b.addEventListener('click', onClick);
        return b;
    }

    function mostrarMensaje(texto, esError) {
        var msg = document.getElementById('meseroMsg');
        if (!msg) return;
        msg.textContent = texto || '';
        msg.classList.toggle('error', !!esError);
    }

    function filaMensaje(texto) {
        var tr = el('tr');
        var td = el('td', 'tabla-vacia', texto);
        td.colSpan = 4;
        tr.appendChild(td);
        return tr;
    }

    // --- Validación ---

    function validarMesero(nombre, email, pass) {
        if (!nombre) return 'Escribe el nombre del mesero.';
        if (nombre.length > 60) return 'El nombre no puede superar 60 caracteres.';
        if (!email) return 'Escribe el correo del mesero.';
        if (email.indexOf('@') === -1) return 'El correo no es válido.';
        if (!pass) return 'Escribe una contraseña temporal.';
        if (pass.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
        return null;
    }

    // --- Tabla ---

    function render() {
        var body = document.getElementById('meserosBody');
        if (!body) return;

        body.innerHTML = '';
        if (!meseros.length) {
            body.appendChild(filaMensaje('Todavía no hay meseros registrados.'));
            return;
        }

        meseros.forEach(function (mesero) {
            var activo = mesero.activo !== false;
            var tr = el('tr');
            tr.appendChild(el('td', null, mesero.nombre || '—'));
            tr.appendChild(el('td', null, mesero.email || '—'));

            var tdEstado = el('td');
            tdEstado.appendChild(activo
                ? el('span', 'badge badge-ok', 'activo')
                : el('span', 'badge badge-neutro', 'desactivado'));
            tr.appendChild(tdEstado);

            var tdAcciones = el('td', 'col-acciones');
            tdAcciones.appendChild(boton(
                activo ? 'cancelar' : 'guardar',
                activo ? 'Desactivar acceso' : 'Reactivar acceso',
                '',
                function () { alternarActivo(mesero, activo); }
            ));
            tdAcciones.appendChild(boton('eliminar', 'Quitar mesero', 'peligro', function () {
                eliminar(mesero);
            }));
            tr.appendChild(tdAcciones);

            body.appendChild(tr);
        });
    }

    // --- Acciones ---

    function crearMesero() {
        var nombre = document.getElementById('meseroName').value.trim();
        var email = document.getElementById('meseroEmail').value.trim();
        var pass = document.getElementById('meseroPass').value;

        var error = validarMesero(nombre, email, pass);
        if (error) {
            mostrarMensaje(error, true);
            return;
        }

        var admin = window.RestoAuth.getUser();
        if (!admin) {
            mostrarMensaje('Tu sesión expiró. Vuelve a ingresar.', true);
            return;
        }

        var btn = document.getElementById('crearMeseroBtn');
        btn.disabled = true;
        mostrarMensaje('Creando cuenta...');

        var authCreador = getAppCreador().auth();
        authCreador.createUserWithEmailAndPassword(email, pass)
            .then(function (cred) {
                return window.RestoRoles
                    .crearRegistroMesero(cred.user.uid, { nombre: nombre, email: email }, admin.uid)
                    .catch(function (err) {
                        // La cuenta de Auth quedó creada pero sin rol: sin
                        // Admin SDK no se puede borrar desde el cliente, así
                        // que se avisa para que el admin reintente con el
                        // mismo correo o lo elimine desde la consola.
                        err.parcial = true;
                        throw err;
                    });
            })
            .then(function () {
                mostrarMensaje('Mesero "' + nombre + '" creado. Ya puede ingresar con ese correo.');
                document.getElementById('meseroName').value = '';
                document.getElementById('meseroEmail').value = '';
                document.getElementById('meseroPass').value = '';
            })
            .catch(function (err) {
                console.error('Crear mesero error:', err);
                mostrarMensaje(err.parcial
                    ? 'La cuenta se creó pero no se pudo asignar el rol. Revísala en la consola de Firebase.'
                    : window.RestoAuth.mensajeError(err), true);
            })
            .then(function () {
                btn.disabled = false;
                // Cerrar la sesión secundaria deja la app "creador" lista para
                // el siguiente alta; la sesión del admin nunca se tocó.
                return authCreador.signOut().catch(function (err) {
                    console.warn('No se pudo cerrar la sesión secundaria:', err);
                });
            });
    }

    function alternarActivo(mesero, activo) {
        window.RestoRoles.setActivo(mesero.uid, !activo)
            .then(function () {
                mostrarMensaje(activo
                    ? 'Acceso desactivado para ' + (mesero.nombre || mesero.email) + '.'
                    : 'Acceso reactivado para ' + (mesero.nombre || mesero.email) + '.');
            })
            .catch(function (err) {
                console.error('Cambiar estado de mesero error:', err);
                mostrarMensaje(window.RestoAuth.mensajeError(err), true);
            });
    }

    function eliminar(mesero) {
        var etiqueta = mesero.nombre || mesero.email || 'este mesero';
        if (!window.confirm('¿Quitar a ' + etiqueta + '? Perderá el acceso al panel del mesero.')) return;

        window.RestoRoles.eliminarMesero(mesero.uid)
            .then(function () { mostrarMensaje('Mesero eliminado del sistema.'); })
            .catch(function (err) {
                console.error('Eliminar mesero error:', err);
                mostrarMensaje(window.RestoAuth.mensajeError(err), true);
            });
    }

    function init() {
        var btn = document.getElementById('crearMeseroBtn');
        if (!btn) return;

        btn.addEventListener('click', crearMesero);

        window.RestoAuth.onReady(function (user, rol) {
            if (!user || rol !== window.RestoRoles.ADMIN) return;

            window.RestoRoles.escucharMeseros(function (lista) {
                meseros = lista;
                render();
            }, function () {
                var body = document.getElementById('meserosBody');
                if (body) {
                    body.innerHTML = '';
                    body.appendChild(filaMensaje('No se pudo cargar la lista de meseros.'));
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
