// RestoApp - Formato compartido (moneda, fechas, códigos de pedido)
(function () {
    'use strict';

    function moneda(valor) {
        var numero = Number(valor) || 0;
        return '$' + numero.toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    }

    function fechaHora(timestamp) {
        if (!timestamp) return '—';
        var d = new Date(timestamp);
        if (isNaN(d.getTime())) return '—';
        return d.toLocaleString('es-CO', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    // Firebase devuelve claves como "-P-M_hcjwaeYcxYuUM4X": sirven como
    // identificador interno, pero no como algo que un mesero pueda dictar en
    // voz alta. El código visible se arma con la fecha y un tramo corto y
    // estable derivado de esa clave.
    function codigoPedido(key, timestamp) {
        var d = new Date(timestamp || Date.now());
        if (isNaN(d.getTime())) d = new Date();
        var dia = String(d.getDate()).padStart(2, '0');
        var mes = String(d.getMonth() + 1).padStart(2, '0');
        var sufijo = String(key || '')
            .replace(/[^A-Za-z0-9]/g, '')
            .slice(-4)
            .toUpperCase()
            .padStart(4, '0');
        return 'P-' + dia + mes + '-' + sufijo;
    }

    window.RestoFormato = {
        moneda: moneda,
        fechaHora: fechaHora,
        codigoPedido: codigoPedido
    };
})();
