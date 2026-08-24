// RestoApp - Utilidades compartidas por todas las páginas
(function () {
    'use strict';

    // Un valor que no es número se muestra como '—' en vez de '$ 0': un cero
    // inventado pasa desapercibido, un guion se nota.
    function moneda(valor) {
        var numero = Number(valor);
        if (valor === null || valor === '' || !isFinite(numero)) return '—';
        return '$ ' + numero.toLocaleString('es-CO');
    }

    function fecha(timestamp) {
        if (!timestamp) return '—';
        var d = new Date(timestamp);
        return isNaN(d.getTime()) ? '—' : d.toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    }

    function mensaje(id, texto, esError) {
        var caja = document.getElementById(id);
        if (!caja) return;
        caja.textContent = texto || '';
        caja.classList.toggle('error', !!esError);
    }

    // Marca el enlace de la página actual en la barra superior.
    function marcarNav() {
        var pagina = document.body.getAttribute('data-pagina');
        var enlace = document.querySelector('.barra nav a[data-nav="' + pagina + '"]');
        if (enlace) enlace.classList.add('activo');
    }

    document.addEventListener('DOMContentLoaded', marcarNav);

    window.Resto = {
        moneda: moneda,
        fecha: fecha,
        mensaje: mensaje
    };
})();
