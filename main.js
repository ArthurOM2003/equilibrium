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
        apiKey: "AIzaSyByPGYoW_GPRstNFx5b1D5qa_qT-VoFQQ0",
        authDomain: "minha-carteira-app-f8658.firebaseapp.com",
        projectId: "minha-carteira-app-f8658",
        storageBucket: "minha-carteira-app-f8658.appspot.com",
        messagingSenderId: "802101066161",
        appId: "1:802101066161:web:f9d4f591c2f89a54422590"
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