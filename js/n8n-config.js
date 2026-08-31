// RestoApp / DeliveryBot - Configuración de n8n
//
// Todas las lecturas y escrituras de menú y pedidos pasan por webhooks de
// n8n (no se habla con Google Sheets directo desde el navegador: la API key
// de Sheets no puede exponerse en el cliente). n8n es quien de verdad lee y
// escribe en Google Sheets.
//
// Reemplazar N8N_BASE_URL por la URL pública de la instancia de n8n
// (ej: "https://tu-instancia.app.n8n.cloud/webhook").
var N8N_BASE_URL = 'https://deyvidjgv12.app.n8n.cloud/webhook';

// Enlace público del bot: los clientes hacen su pedido ahí, no en la web.
var DISCORD_BOT_URL =
  'https://discord.com/oauth2/authorize?client_id=1543039767850131576&permissions=2147486720&integration_type=0&scope=applications.commands+bot';
