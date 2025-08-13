document.addEventListener('DOMContentLoaded', () => {
    
    // --- LÓGICA DO DARK MODE PARA A PÁGINA PRINCIPAL ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        const applyTheme = () => {
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark-mode');
                darkModeToggle.checked = true;
            } else {
                document.body.classList.remove('dark-mode');
                darkModeToggle.checked = false;
            }
        };
        darkModeToggle.addEventListener('change', () => {
            if (darkModeToggle.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('darkMode', 'true');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('darkMode', 'false');
            }
        });
        applyTheme();
    }

    // --- LÓGICA DE AUTENTICAÇÃO COM FIREBASE ---
    const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  
  // 👇 As outras usam o prefixo "PUBLIC_"
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID
    };

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();

    // Lógica do botão de login
    const googleLoginBtn = document.getElementById('google-login-btn');
    const btnText = googleLoginBtn.querySelector('span');

    googleLoginBtn.addEventListener('click', () => {
        // Adiciona feedback de carregamento
        googleLoginBtn.classList.add('loading');
        googleLoginBtn.disabled = true;
        btnText.style.visibility = 'hidden';


        auth.signInWithPopup(provider)
            .then((result) => {
                // Login bem-sucedido, redireciona para a aplicação
                // O redirecionamento é quase instantâneo, então um toast aqui não seria visto.
                // O estado de loading já fornece o feedback necessário.
                window.location.href = 'app.html';
            })
            .catch((error) => {
                // Lida com erros aqui
                console.error("Erro no login com Google:", error);
                alert("Houve um erro ao tentar fazer login: " + error.message);
                // Remove o estado de carregamento em caso de erro
                googleLoginBtn.classList.remove('loading');
                googleLoginBtn.disabled = false;
                btnText.style.visibility = 'visible';
            });
    });

    // Verifica se o usuário já está logado ao carregar a página
    auth.onAuthStateChanged(user => {
        if (user) {
            // Se o usuário já estiver logado e na página inicial, redireciona direto para a app
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                 window.location.href = 'app.html';
            }
        }
    });
});