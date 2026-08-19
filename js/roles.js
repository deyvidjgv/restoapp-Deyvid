// RestoApp - Roles de usuario (admin / mesero)
//
// Firebase Auth solo confirma "quién eres" (credenciales válidas). El ROL
// ("qué puedes hacer") se guarda aparte, en Realtime Database bajo
// /usuarios/{uid}. Este módulo centraliza la lectura/escritura de ese nodo
// para que auth.js, productos.js, meseros.js y pedidos.js no dupliquen
// la ruta ni la forma del registro.
//
// TODO(seguridad): al ser un proyecto sin backend propio, cualquier cliente
// autenticado que conozca la ruta podría intentar escribir /usuarios/{uid}.
// En producción esto se cierra con reglas de Realtime Database (ver
// database.rules.json) que solo permitan a un admin escribir el rol de
// otros usuarios, y a cada usuario leer/escribir su propio nodo.
(function () {
    'use strict';

    var ROLE_ADMIN = 'admin';
    var ROLE_MESERO = 'mesero';

    function usuariosRef(uid) {
        var ref = firebase.database().ref('usuarios');
        return uid ? ref.child(uid) : ref;
    }

    function getUserRecord(uid) {
        if (!uid) return Promise.resolve(null);
        return usuariosRef(uid).once('value').then(function (snap) {
            return snap.exists() ? snap.val() : null;
        });
    }

    function getRole(uid) {
        return getUserRecord(uid).then(function (data) {
            return data && data.rol ? data.rol : null;
        });
    }

    function crearRegistroAdmin(uid, datos) {
        return usuariosRef(uid).set({
            nombre: datos.nombre || '',
            email: datos.email || '',
            rol: ROLE_ADMIN,
            activo: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function crearRegistroMesero(uid, datos, adminUid) {
        return usuariosRef(uid).set({
            nombre: datos.nombre || '',
            email: datos.email || '',
            rol: ROLE_MESERO,
            activo: true,
            createdBy: adminUid || null,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function listarMeseros() {
        return usuariosRef()
            .orderByChild('rol')
            .equalTo(ROLE_MESERO)
            .once('value')
            .then(function (snap) {
                var lista = [];
                snap.forEach(function (child) {
                    var val = child.val() || {};
                    val.uid = child.key;
                    lista.push(val);
                });
                return lista;
            });
    }

    function escucharMeseros(onDatos, onError) {
        var query = usuariosRef().orderByChild('rol').equalTo(ROLE_MESERO);
        var handler = query.on('value', function (snap) {
            var lista = [];
            snap.forEach(function (child) {
                var val = child.val() || {};
                val.uid = child.key;
                lista.push(val);
            });
            lista.sort(function (a, b) {
                return String(a.nombre || a.email || '').localeCompare(String(b.nombre || b.email || ''), 'es');
            });
            onDatos(lista);
        }, function (err) {
            console.error('Error leyendo meseros:', err);
            if (onError) onError(err);
        });
        return function detener() { query.off('value', handler); };
    }

    function setActivo(uid, activo) {
        return usuariosRef(uid).update({ activo: !!activo });
    }

    function eliminarMesero(uid) {
        // Nota: esto borra el registro de rol (revoca el acceso a los
        // paneles, ya que los guards de auth.js exigen un rol válido en
        // /usuarios/{uid}), pero NO elimina la cuenta de Firebase
        // Authentication en sí: hacerlo desde el cliente requeriría que el
        // propio mesero esté autenticado, o bien un backend con Admin SDK.
        return usuariosRef(uid).remove();
    }

    window.RestoRoles = {
        ADMIN: ROLE_ADMIN,
        MESERO: ROLE_MESERO,
        getUserRecord: getUserRecord,
        getRole: getRole,
        crearRegistroAdmin: crearRegistroAdmin,
        crearRegistroMesero: crearRegistroMesero,
        listarMeseros: listarMeseros,
        escucharMeseros: escucharMeseros,
        setActivo: setActivo,
        eliminarMesero: eliminarMesero
    };
})();
