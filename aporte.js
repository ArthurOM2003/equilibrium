// ** SUA CONFIGURAÇÃO DO FIREBASE VAI AQUI **
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  
  // 👇 As outras usam o prefixo "PUBLIC_"
  authDomain: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.PUBLIC_FIREBASE_APP_ID
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.onAuthStateChanged(user => {
    if (user) {
        initializeAportePage(user);
    } else {
        if (window.location.pathname.includes('/aporte.html')) {
            window.location.replace('/');
        }
    }
});

const initializeAportePage = async (user) => {
    if (document.body.hasAttribute('data-app-initialized')) return;
    document.body.setAttribute('data-app-initialized', 'true');

    // --- LÓGICA DE UI (TEMA E PRIVACIDADE) ---
    const darkModeToggle = document.querySelector('#dark-mode-toggle');
    const privacyToggleBtn = document.getElementById('privacy-toggle-btn');
    if (darkModeToggle) {
        const applyTheme = () => { if (localStorage.getItem('darkMode') === 'true') { document.body.classList.add('dark-mode'); darkModeToggle.checked = true; } else { document.body.classList.remove('dark-mode'); darkModeToggle.checked = false; } };
        darkModeToggle.addEventListener('change', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('darkMode', document.body.classList.contains('dark-mode')); });
        applyTheme();
    }
    const applyPrivacyMode = () => { const isPrivate = localStorage.getItem('privacyMode') === 'true'; document.body.classList.toggle('privacy-mode', isPrivate); };
    privacyToggleBtn.addEventListener('click', () => { const isPrivate = document.body.classList.toggle('privacy-mode'); localStorage.setItem('privacyMode', isPrivate); });
    applyPrivacyMode();
    
    // --- NOTIFICAÇÕES (TOAST) ---
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) { // Adiciona o container se ele não existir
            const toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    // --- CARREGAMENTO DE DADOS ---
    const portfolioRef = db.collection('portfolios').doc(user.uid);
    let assets = [];
    let targetAllocation = {};
    try {
        const doc = await portfolioRef.get();
        if (doc.exists) {
            const data = doc.data();
            assets = data.assets || [];
            targetAllocation = data.target || {};
        }
    } catch(error) {
        console.error("Erro ao carregar dados para a página de aporte:", error);
        showToast("Não foi possível carregar os dados da carteira.", "error");
        return;
    }
    
    // --- REFERÊNCIAS DE ELEMENTOS ---
    const calculateBtn = document.getElementById('calculate-aporte-btn');
    const amountInput = document.getElementById('aporte-amount');
    const resultsContainer = document.getElementById('aporte-results-container');
    const statusContainer = document.getElementById('status-carteira');
    const exclusaoContainer = document.getElementById('exclusao-temporaria-container');

    // --- RENDERIZAÇÃO ---
    const popularCheckboxesDeExclusao = () => {
        exclusaoContainer.innerHTML = '';
        if (assets.length > 0) {
            const sortedAssets = [...assets].sort((a, b) => a.ticker.localeCompare(b.ticker));
            sortedAssets.forEach(asset => {
                const label = document.createElement('label');
                label.className = 'custom-checkbox';
                label.innerHTML = `<input type="checkbox" class="penalize-asset-checkbox" value="${asset.ticker}"><span class="checkmark"></span><span class="checkbox-text"><span class="ticker">${asset.ticker}</span><span class="class">(${asset.class})</span></span>`;
                exclusaoContainer.appendChild(label);
            });
        } else {
            exclusaoContainer.innerHTML = '<p class="placeholder-text">Nenhum ativo na carteira para excluir.</p>';
        }
    };

    const displayPortfolioStatus = () => {
        statusContainer.innerHTML = '';
        const totalCarteira = assets.reduce((sum, asset) => sum + (asset.quantity * asset.precoAtual), 0);
        if (totalCarteira === 0) {
            statusContainer.innerHTML = `<div class="empty-state-container" style="min-height: 100px; padding: 20px; margin-top: 0;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="20" y2="10"></line><line x1="18" x2="18" y1="20" y2="4"></line><line x1="6" x2="6" y1="20" y2="16"></line></svg>
                <h3 style="font-size: 1.1em; margin-bottom: 0;">Carteira Vazia</h3>
                <p style="margin-bottom: 0;">Adicione ativos no painel principal.</p>
            </div>`;
            return;
        };
        const orderedClasses = Object.keys(targetAllocation).sort((a, b) => targetAllocation[b] - targetAllocation[a]);
        orderedClasses.forEach(className => { const classValue = assets.filter(a => a.class === className).reduce((sum, a) => sum + (a.quantity * a.precoAtual), 0); const currentPercent = totalCarteira > 0 ? (classValue / totalCarteira) * 100 : 0; const targetPercent = targetAllocation[className] || 0; const statusEl = document.createElement('div'); statusEl.className = 'status-item'; statusEl.innerHTML = `<div class="status-labels"><span>${className}</span><span class="sensitive-data">${currentPercent.toFixed(1)}% / <strong>${targetPercent}%</strong></span></div><div class="status-bar-container"><div class="status-bar current" style="width: ${Math.min(currentPercent, 100)}%;"></div><div class="status-bar target" style="width: ${targetPercent}%;"></div></div>`; statusContainer.appendChild(statusEl); });
    };

    const displayAporteResults = (result) => {
        const { sugestoes, sobra } = result;
        resultsContainer.innerHTML = '';
        if (sugestoes.length === 0) {
            resultsContainer.innerHTML = `<div class="results-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    <circle cx="12" cy="12" r="5"/>
                </svg>
                <h3>Nenhuma Sugestão</h3>
                <p>O valor do aporte pode ser muito baixo ou sua carteira já está balanceada.</p>
            </div>`;
            return;
        }
        sugestoes.sort((a,b) => b.amount - a.amount).forEach(s => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'aporte-suggestion';
            let infoExtra = s.quantity !== null ? `<span class="class">${s.class} (~ ${s.quantity} cota(s))</span>` : `<span class="class">${s.class}</span>`;
            suggestionEl.innerHTML = `<div class="aporte-suggestion-info"><span class="ticker">${s.ticker}</span>${infoExtra}</div><div class="aporte-suggestion-amount sensitive-data">${s.amount.toLocaleString('pt-BR', { style: 'currency', 'currency': 'BRL' })}</div>`;
            resultsContainer.appendChild(suggestionEl);
        });

        if (sobra >= 0.01) {
             const sobraEl = document.createElement('div');
             sobraEl.className = 'aporte-suggestion suggestion-item sobra';
             sobraEl.innerHTML = `<div class="aporte-suggestion-info"><span class="ticker">Sobra de caixa</span><span class="class">Valor residual para reinvestir.</span></div><div class="aporte-suggestion-amount sensitive-data">${sobra.toLocaleString('pt-BR', { style: 'currency', 'currency': 'BRL' })}</div>`;
            resultsContainer.appendChild(sobraEl);
        }
    };
    
    // --- EVENTOS ---
    calculateBtn.addEventListener('click', async () => {
        const totalAporte = parseFloat(amountInput.value);
        if (isNaN(totalAporte) || totalAporte <= 0) {
            showToast('Por favor, insira um valor de aporte válido.', 'error'); // Substituição do alert
            return;
        }
        
        calculateBtn.classList.add('loading');
        calculateBtn.disabled = true;

        const tickersExcluidos = Array.from(document.querySelectorAll('.penalize-asset-checkbox:checked')).map(cb => cb.value);
        const payload = { totalAporte, tickersExcluidos, assets, targetAllocation };

        try {
            const response = await fetch('/.netlify/functions/calculateAporte', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || 'Ocorreu um erro no servidor.'); }
            const result = await response.json();
            displayAporteResults(result);
        } catch (error) {
            console.error("Erro ao calcular aporte:", error);
            showToast(`Não foi possível calcular o aporte: ${error.message}`, 'error');
            resultsContainer.innerHTML = `<div class="results-placeholder"><h3>Ocorreu um erro</h3><p>Não foi possível processar o cálculo. Tente novamente.</p></div>`; 
        } finally {
            calculateBtn.classList.remove('loading');
            calculateBtn.disabled = false;
        }
    });

    // --- INICIALIZAÇÃO DA PÁGINA ---
    displayPortfolioStatus();
    popularCheckboxesDeExclusao();
};