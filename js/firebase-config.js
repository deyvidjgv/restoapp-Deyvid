// RestoApp - Configuración de Firebase (Ejercicio 3)
// apiKey y demás campos son públicos por diseño del SDK web de Firebase.
// La seguridad real la dan las reglas de Authentication y Realtime Database,
// no la confidencialidad de este objeto.
var firebaseConfig = {
    apiKey: "AIzaSyBY0mObgEnib049nbeI1xUZJcahpGohuQk",
    authDomain: "restoapp-clase.firebaseapp.com",
    databaseURL: "https://restoapp-clase-default-rtdb.firebaseio.com",
    projectId: "restoapp-clase",
    storageBucket: "restoapp-clase.firebasestorage.app",
    messagingSenderId: "947242740647",
    appId: "1:947242740647:web:5a5bd12f9abf3ceaf0e482",
    measurementId: "G-KJC788M030"
};

firebase.initializeApp(firebaseConfig);
