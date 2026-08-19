// RestoApp - Pestañas del panel (Productos / Meseros)
(function () {
    'use strict';

    function activar(tabs, paneles, tabElegida) {
        Array.prototype.forEach.call(tabs, function (tab) {
            var activa = tab === tabElegida;
            tab.classList.toggle('active', activa);
            tab.setAttribute('aria-selected', activa ? 'true' : 'false');
        });
        var objetivo = tabElegida.getAttribute('data-tab');
        Array.prototype.forEach.call(paneles, function (panel) {
            panel.classList.toggle('hidden', panel.id !== objetivo);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var tabs = document.querySelectorAll('.tab[data-tab]');
        var paneles = document.querySelectorAll('.tab-panel');
        if (!tabs.length) return;

        Array.prototype.forEach.call(tabs, function (tab) {
            tab.addEventListener('click', function () { activar(tabs, paneles, tab); });
        });
    });
})();
