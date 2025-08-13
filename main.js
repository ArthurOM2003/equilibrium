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

    // ** SUAS CHAVES CORRETAS DO FIREBASE FORAM INSERIDAS AQUI **

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();

    // Lógica do botão de login
    const googleLoginBtn = document.getElementById('google-login-btn');

    googleLoginBtn.addEventListener('click', () => {
        auth.signInWithPopup(provider)
            .then((result) => {
                // Login bem-sucedido, redireciona para a aplicação
                console.log("Login com Google bem-sucedido!", result.user);
                window.location.href = 'app.html';
            })
            .catch((error) => {
                // Lida com erros aqui
                console.error("Erro no login com Google:", error);
                alert("Houve um erro ao tentar fazer login. Verifique o console para mais detalhes.");
            });
    });

    // Verifica se o usuário já está logado ao carregar a página
    auth.onAuthStateChanged(user => {
        if (user) {
            // Se o usuário já estiver logado, redireciona direto para a app
            console.log("Usuário já está logado, redirecionando...");
            window.location.href = 'app.html';
        }
    });
});