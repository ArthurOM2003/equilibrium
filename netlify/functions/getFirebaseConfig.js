exports.handler = async function(event, context) {
  // Lê as variáveis de ambiente públicas que configuramos no Netlify
  const config = {
    apiKey: process.env.PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.PUBLIC_FIREBASE_APP_ID,
  };

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      // Cache de 1 hora para não chamar esta função toda hora
      'Cache-Control': 'public, max-age=3600' 
    },
    body: JSON.stringify(config),
  };
};