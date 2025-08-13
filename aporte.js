// ** SUA CONFIGURAÇÃO DO FIREBASE VAI AQUI **
const firebaseConfig = {
  apiKey: "AIzaSyByPGYoW_GPRstNFx5b1D5qa_qT-VoFQQ0",
  authDomain: "minha-carteira-app-f8658.firebaseapp.com",
  projectId: "minha-carteira-app-f8658",
  storageBucket: "minha-carteira-app-f8658.appspot.com",
  messagingSenderId: "802101066161",
  appId: "1:802101066161:web:f9d4f591c2f89a54422590"
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

    const darkModeToggle = document.querySelector('#dark-mode-toggle');
    if (darkModeToggle) {
        const applyTheme = () => { if (localStorage.getItem('darkMode') === 'true') { document.body.classList.add('dark-mode'); darkModeToggle.checked = true; } else { document.body.classList.remove('dark-mode'); darkModeToggle.checked = false; } };
        darkModeToggle.addEventListener('change', () => { if (darkModeToggle.checked) { document.body.classList.add('dark-mode'); localStorage.setItem('darkMode', 'true'); } else { document.body.classList.remove('dark-mode'); localStorage.setItem('darkMode', 'false'); } });
        applyTheme();
    }

    // --- LÓGICA DO MODO DE PRIVACIDADE ---
    const privacyToggleBtn = document.getElementById('privacy-toggle-btn');
    const applyPrivacyMode = () => {
        const isPrivate = localStorage.getItem('privacyMode') === 'true';
        document.body.classList.toggle('privacy-mode', isPrivate);
    };
    privacyToggleBtn.addEventListener('click', () => {
        const isPrivate = document.body.classList.toggle('privacy-mode');
        localStorage.setItem('privacyMode', isPrivate);
    });
    applyPrivacyMode(); // Aplica o modo ao carregar a página

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
        alert("Não foi possível carregar os dados da carteira.");
        return;
    }
    
    const calculateBtn = document.getElementById('calculate-aporte-btn');
    const amountInput = document.getElementById('aporte-amount');
    const resultsContainer = document.getElementById('aporte-results-container');
    const statusContainer = document.getElementById('status-carteira');
    const exclusaoContainer = document.getElementById('exclusao-temporaria-container');

    const popularCheckboxesDeExclusao = () => {
        exclusaoContainer.innerHTML = '';
        if (assets.length > 0) {
            const sortedAssets = [...assets].sort((a, b) => a.ticker.localeCompare(b.ticker));
            sortedAssets.forEach(asset => {
                const label = document.createElement('label');
                label.className = 'custom-checkbox';
                label.innerHTML = `
                    <input type="checkbox" class="penalize-asset-checkbox" value="${asset.ticker}">
                    <span class="checkmark"></span>
                    <span class="checkbox-text">
                        <span class="ticker">${asset.ticker}</span>
                        <span class="class">(${asset.class})</span>
                    </span>
                `;
                exclusaoContainer.appendChild(label);
            });
        } else {
            exclusaoContainer.innerHTML = '<p class="placeholder-text">Sua carteira está vazia.</p>';
        }
    };

    const displayPortfolioStatus = () => {
        statusContainer.innerHTML = '';
        const totalCarteira = assets.reduce((sum, asset) => sum + (asset.quantity * asset.precoAtual), 0);
        if (totalCarteira === 0) {
            statusContainer.innerHTML = '<p class="placeholder-text">Sua carteira está vazia.</p>';
            return;
        };
        const orderedClasses = Object.keys(targetAllocation).sort((a, b) => targetAllocation[b] - targetAllocation[a]);
        orderedClasses.forEach(className => {
            const classValue = assets.filter(a => a.class === className).reduce((sum, a) => sum + (a.quantity * a.precoAtual), 0);
            const currentPercent = totalCarteira > 0 ? (classValue / totalCarteira) * 100 : 0;
            const targetPercent = targetAllocation[className] || 0;
            const statusEl = document.createElement('div');
            statusEl.className = 'status-item';
            statusEl.innerHTML = `<div class="status-labels"><span>${className}</span><span class="sensitive-data">${currentPercent.toFixed(1)}% / <strong>${targetPercent}%</strong></span></div><div class="status-bar-container"><div class="status-bar current" style="width: ${Math.min(currentPercent, 100)}%;"></div><div class="status-bar target" style="width: ${targetPercent}%;"></div></div>`;
            statusContainer.appendChild(statusEl);
        });
    };

    // A função de display continua a mesma, ela não precisa de saber de onde vêm os resultados.
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
                <p>O aporte pode ser muito baixo, ou não há classes precisando de aporte no momento.</p>
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
             sobraEl.className = 'suggestion-item sobra';
             sobraEl.innerHTML = `<div class="aporte-suggestion-info"><span class="ticker">Sobra de caixa</span><span class="class">Valor residual.</span></div><div class="aporte-suggestion-amount sensitive-data">${sobra.toLocaleString('pt-BR', { style: 'currency', 'currency': 'BRL' })}</div>`;
            resultsContainer.appendChild(sobraEl);
        }
    };
    
    // O Event Listener agora chama a função no backend
    calculateBtn.addEventListener('click', async () => {
        const totalAporte = parseFloat(amountInput.value);
        if (isNaN(totalAporte) || totalAporte <= 0) {
            alert('Por favor, insira um valor de aporte válido.');
            return;
        }
        
        calculateBtn.classList.add('loading');
        calculateBtn.disabled = true;

        const tickersExcluidos = [];
        document.querySelectorAll('.penalize-asset-checkbox:checked').forEach(checkbox => {
            tickersExcluidos.push(checkbox.value);
        });

        // Prepara os dados para enviar para o servidor
        const payload = {
            totalAporte,
            tickersExcluidos,
            assets,
            targetAllocation
        };

        try {
            // Chama a nova função serverless
            const response = await fetch('/.netlify/functions/calculateAporte', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ocorreu um erro no servidor.');
            }

            const result = await response.json();
            displayAporteResults(result);

        } catch (error) {
            console.error("Erro ao calcular aporte:", error);
            alert(`Não foi possível calcular o aporte: ${error.message}`);
            // Limpa os resultados em caso de erro
            resultsContainer.innerHTML = ''; 
        } finally {
            calculateBtn.classList.remove('loading');
            calculateBtn.disabled = false;
        }
    });

    displayPortfolioStatus();
    popularCheckboxesDeExclusao();
};