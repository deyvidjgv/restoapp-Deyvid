// RestoApp - Carga del menú desde Firebase Realtime Database (Ejercicio 2: módulo IIFE)
(function () {
    'use strict';

    var menuData = {};

    function addOption(select, id, name, price) {
        var opt = document.createElement('option');
        opt.value = id;
        opt.text = name + ' ($' + price + ')';
        select.appendChild(opt);
    }

    function cargarMenu() {
        var url = 'https://restoapp-clase-default-rtdb.firebaseio.com/menu.json';
        var select = document.getElementById('a');

        fetch(url)
            .then(function (res) { if (!res.ok) throw new Error('Network response was not ok'); return res.json(); })
            .then(function (data) {
                menuData = {};
                select.innerHTML = '<option value="">--Selecciona plato--</option>';
                if (Array.isArray(data)) {
                    data.forEach(function (item, idx) {
                        var id = item.id || idx;
                        var name = item.name || ('Plato ' + id);
                        var price = item.price || item.precio || 0;
                        menuData[id] = price;
                        addOption(select, id, name, price);
                    });
                } else if (typeof data === 'object' && data !== null) {
                    Object.keys(data).forEach(function (key) {
                        var item = data[key] || {};
                        var name = item.name || key;
                        var price = item.price || item.precio || 0;
                        menuData[key] = price;
                        addOption(select, key, name, price);
                    });
                }
            })
            .catch(function (err) {
                console.error('Error cargando menu:', err);
                select.innerHTML = '<option value="">--Error cargando menú--</option>';
            });
    }

    function initMenuSelect() {
        var select = document.getElementById('a');
        if (!select) return;

        select.addEventListener('change', function (e) {
            var val = e.target.value;
            if (menuData[val] !== undefined) {
                document.getElementById('p').value = menuData[val];
            }
        });

        cargarMenu();
    }

    document.addEventListener('DOMContentLoaded', initMenuSelect);
})();
