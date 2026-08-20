// RestoApp - Iconos SVG inline
//
// En una MPA sin build tooling, repetir el markup de cada SVG en los cuatro
// HTML sería ruido difícil de mantener. Este módulo guarda los trazados en un
// solo lugar y los inyecta donde haya un [data-icon="nombre"].
//
// Uso:  <span data-icon="stock"></span>
//       window.RestoIcons.svg('stock')   -> string SVG (para filas generadas)
(function () {
    'use strict';

    // Trazos de 24x24, currentColor y stroke: heredan el color del texto que
    // los rodea, así que no necesitan una variante por tema.
    var PATHS = {
        inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
        pedido: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h10"/>',
        admin: '<path d="M12 3l7.5 3.5v5c0 4.5-3 8.4-7.5 9.5-4.5-1.1-7.5-5-7.5-9.5v-5z"/><path d="M9.5 12l1.8 1.8 3.4-3.6"/>',
        login: '<path d="M14 3h4.5A1.5 1.5 0 0 1 20 4.5v15a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l4-4-4-4"/><path d="M14 12H4"/>',
        logout: '<path d="M10 3H5.5A1.5 1.5 0 0 0 4 4.5v15A1.5 1.5 0 0 0 5.5 21H10"/><path d="M16 16l4-4-4-4"/><path d="M20 12H10"/>',
        mesero: '<circle cx="12" cy="8" r="3.2"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
        plato: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
        stock: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4"/><path d="M12 11.5v9"/>',
        precio: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.2A2.8 2.8 0 0 0 12 8c-1.7 0-2.8.9-2.8 2s1 1.8 2.8 2 2.8.9 2.8 2-1.1 2-2.8 2a2.8 2.8 0 0 1-2.5-1.2"/><path d="M12 6.2v11.6"/>',
        crear: '<path d="M12 5v14"/><path d="M5 12h14"/>',
        editar: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14.5 5.5 18.5 9.5"/>',
        eliminar: '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6.5 7l1 13h9l1-13"/>',
        guardar: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><path d="M8 20v-6h8v6"/>',
        cancelar: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
        ticket: '<path d="M3.5 8.5A2 2 0 0 0 5.5 6.5h13a2 2 0 0 0 2 2v2a2 2 0 0 0 0 3v2a2 2 0 0 0-2 2h-13a2 2 0 0 0-2-2v-2a2 2 0 0 0 0-3z"/><path d="M9.5 6.5v11"/>',
        historial: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
        alerta: '<path d="M12 4.5 21 19.5H3z"/><path d="M12 10v4"/><path d="M12 17h.01"/>'
    };

    function svg(nombre, extraClass) {
        var body = PATHS[nombre];
        if (!body) return '';
        return '<svg class="icon ' + (extraClass || '') + '" viewBox="0 0 24 24" fill="none" ' +
            'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" ' +
            'stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + '</svg>';
    }

    function pintarIconos(raiz) {
        var nodos = (raiz || document).querySelectorAll('[data-icon]');
        Array.prototype.forEach.call(nodos, function (nodo) {
            if (nodo.getAttribute('data-icon-done') === '1') return;
            var markup = svg(nodo.getAttribute('data-icon'));
            if (!markup) return;
            nodo.innerHTML = markup;
            nodo.setAttribute('data-icon-done', '1');
        });
    }

    document.addEventListener('DOMContentLoaded', function () { pintarIconos(document); });

    window.RestoIcons = { svg: svg, pintar: pintarIconos };
})();
