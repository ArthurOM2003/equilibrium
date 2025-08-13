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
        initializeApp(user);
    } else {
        if (window.location.pathname.includes('/app.html') || window.location.pathname.includes('/aporte.html')) {
            window.location.replace('/');
        }
    }
});

const initializeApp = async (user) => {
    if (document.body.hasAttribute('data-app-initialized')) return;
    document.body.setAttribute('data-app-initialized', 'true');

    // --- LÓGICA DO DARK MODE ---
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const applyTheme = () => { if (localStorage.getItem('darkMode') === 'true') { document.body.classList.add('dark-mode'); darkModeToggle.checked = true; } else { document.body.classList.remove('dark-mode'); darkModeToggle.checked = false; } };
    darkModeToggle.addEventListener('change', () => { if (darkModeToggle.checked) { document.body.classList.add('dark-mode'); localStorage.setItem('darkMode', 'true'); } else { document.body.classList.remove('dark-mode'); localStorage.setItem('darkMode', 'false'); } updateChartColors(); });
    applyTheme();

     // --- LÓGICA DE BOAS-VINDAS E LOGOUT ---
    const welcomeMessage = document.getElementById('welcome-message');
    welcomeMessage.textContent = `Bem-vindo(a), ${user.displayName || user.email.split('@')[0]}!`;
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
    const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
    logoutBtn.addEventListener('click', () => logoutModal.classList.add('active'));
    confirmLogoutBtn.addEventListener('click', () => auth.signOut());
    cancelLogoutBtn.addEventListener('click', () => logoutModal.classList.remove('active'));
    logoutModal.addEventListener('click', (e) => { if(e.target === logoutModal) { logoutModal.classList.remove('active'); } });
    
    // --- MODELO DE DADOS E FUNÇÕES DO FIREBASE ---
    const portfolioRef = db.collection('portfolios').doc(user.uid);
    let assets = [];
    let savedTargetAllocation = {};
    
    const loadDataFromFirebase = async () => {
        try {
            const doc = await portfolioRef.get();
            if (doc.exists) {
                const data = doc.data();
                assets = data.assets || [];
                assets.forEach(asset => {
                    asset.id = Number(asset.id);
                    if (asset.precoMedio) {
                        if (!asset.precoAtual) {
                           asset.precoAtual = asset.precoMedio;
                        }
                        delete asset.precoMedio;
                    }
                });
                savedTargetAllocation = data.target || {};
            } else {
                console.log("Novo usuário! Criando carteira de exemplo.");
                 const exampleData = {
                    assets: [
                        { id: 1, class: 'Ações Nacionais', ticker: 'ITSA4', quantity: 59, precoAtual: 10.30, questions: {}, score: 17 },
                        { id: 2, class: 'Fundos Imobiliários', ticker: 'MXRF11', quantity: 300, precoAtual: 10.50, questions: {}, score: 10 }
                    ],
                    target: { 'Cripto': 10, 'Ações Nacionais': 35, 'Renda Fixa Nacional': 20, 'Ações Internacionais': 25, 'Fundos Imobiliários': 10, 'Renda Fixa Internacional': 0 }
                };
                await portfolioRef.set(exampleData);
                assets = exampleData.assets;
                savedTargetAllocation = exampleData.target;
            }
        } catch (error) {
            console.error("Erro Crítico ao carregar dados do Firestore:", error);
            alert("Não foi possível carregar os dados da sua carteira. Por favor, recarregue a página.");
        }
    };

    const saveDataToFirebase = async () => {
        try {
            const assetsToSave = assets.map(asset => {
                const { precoMedio, ...assetSemPrecoMedio } = asset;
                return assetSemPrecoMedio;
            });
            await portfolioRef.set({ assets: assetsToSave, target: savedTargetAllocation });
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            alert("Não foi possível salvar suas alterações.");
        }
    };
    
    const saveAssets = saveDataToFirebase;
    const saveTarget = saveDataToFirebase;

    // --- DECLARAÇÃO DE VARIÁVEIS E REFERÊNCIAS ---
    let stagedTargetAllocation = {};
    
    // Lista de perguntas para Ações Nacionais (original)
    const nationalStockChecklistQuestions = [
        { id: 1, text: 'Dívida Líquida é negativa ou DL/PL < 50%?' }, { id: 2, text: 'ROE (Retorno sobre Patrimônio) histórico acima de 5%?' }, { id: 3, text: 'Dívida líquida é menor que o lucro líquido dos últimos 12 meses?' }, { id: 4, text: 'Tem crescimento de receitas ou lucro > 5% a.a. nos últimos 5 anos?' }, { id: 5, text: 'Possui um histórico consistente de pagamento de dividendos?' }, { id: 6, text: 'Investe consistentemente em pesquisa e inovação?' }, { id: 7, text: 'O setor é perene (não está se tornando obsoleto)?' }, { id: 8, text: 'Está negociada com um P/VP (Preço/Valor Patrimonial) abaixo de 5?' }, { id: 9, text: 'Teve lucro operacional no último exercício (ano)?' }, { id: 10, text: 'Tem mais de 30 anos de mercado (desde a fundação)?' }, { id: 11, text: 'É LÍDER (1º lugar) nacional ou mundial no seu setor?' }, { id: 12, text: 'O setor de atuação da empresa tem mais de 100 anos?' }, { id: 13, text: 'É considerada uma BLUE CHIP (empresa de grande porte e sólida)?' }, { id: 14, text: 'A empresa possui uma gestão bem avaliada pelo mercado?' }, { id: 15, text: 'É livre de escândalos de corrupção recentes?' }, { id: 16, text: 'É livre de controle estatal ou concentração em um único cliente?' }, { id: 17, text: 'O P/L (Preço/Lucro) da empresa está abaixo de 30?' }
    ];

    // Nova lista de perguntas para Ações Internacionais (foco em ETF)
    const internationalChecklistQuestions = [
        { id: 1, text: 'A taxa de administração é inferior a 0,7% ao ano?' },
        { id: 2, text: 'O gestor do fundo tem mais de 5 anos de experiência no mercado?' },
        { id: 3, text: 'A carteira do ETF é composta por mais de 30 ativos diferentes?' },
        { id: 4, text: 'Nenhum ativo individual representa mais de 20% do patrimônio total do fundo?' },
        { id: 5, text: 'O ETF tem um patrimônio líquido sob gestão superior a R$ 100 milhões?' },
        { id: 6, text: 'O Dividend Yield do fundo foi superior a 2,5% nos últimos 12 meses?' },
        { id: 7, text: 'O foco do ETF está em setores considerados perenes e confiáveis (ex: financeiro, saúde, consumo básico, utilidades)?' }
    ];

    let nextAssetId = 1;
    const STOCK_CLASSES = ['Ações Nacionais', 'Ações Internacionais'];
    const assetListEl = document.getElementById('asset-list');
    const modal = document.getElementById('asset-modal');
    const assetForm = document.getElementById('asset-form');
    const addAssetBtn = document.getElementById('add-asset-btn');
    const refreshPricesBtn = document.getElementById('refresh-prices-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const allocationSlidersEl = document.getElementById('allocation-sliders');
    const assetClassSelect = document.getElementById('asset-class');
    const checklistContainer = document.getElementById('dynamic-checklist-container');
    const checklistItemsEl = document.getElementById('checklist-items');
    const saveAllocationBtn = document.getElementById('save-allocation-btn');
    const allocationWarning = document.getElementById('allocation-warning');
    const targetTotalDisplay = document.getElementById('target-total-display');
    let currentPortfolioChart, targetPortfolioChart;
    
    // --- FUNÇÕES ---
    const getChartOptions = () => ({ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--c-text-secondary'), font: { family: "'Inter', sans-serif" } } }, tooltip: { backgroundColor: getComputedStyle(document.body).getPropertyValue('--c-surface'), titleColor: getComputedStyle(document.body).getPropertyValue('--c-text-primary'), bodyColor: getComputedStyle(document.body).getPropertyValue('--c-text-secondary'), boxPadding: 8, cornerRadius: 4, callbacks: { label: function(context) { return `${context.label}: ${context.parsed.toFixed(1)}%`; } } } } });
    const initCharts = () => { const currentCtx = document.getElementById('currentPortfolioChart').getContext('2d'); currentPortfolioChart = new Chart(currentCtx, { type: 'doughnut', options: getChartOptions() }); const targetCtx = document.getElementById('targetPortfolioChart').getContext('2d'); targetPortfolioChart = new Chart(targetCtx, { type: 'doughnut', options: getChartOptions() }); };
    const updateChartColors = () => { const newOptions = getChartOptions(); if (currentPortfolioChart) { currentPortfolioChart.options = newOptions; currentPortfolioChart.update('none'); } if (targetPortfolioChart) { targetPortfolioChart.options = newOptions; targetPortfolioChart.update('none'); } };
    const updateChartData = (chart, labels, data) => { chart.data.labels = labels; chart.data.datasets = [{ data: data, backgroundColor: ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#3b82f6'], borderWidth: 2, borderColor: getComputedStyle(document.body).getPropertyValue('--c-chart-border') }]; chart.update(); };
    const updateCurrentChart = () => { const classTotals = {}; assets.forEach(asset => { const value = asset.quantity * asset.precoAtual; classTotals[asset.class] = (classTotals[asset.class] || 0) + value; }); updateChartData(currentPortfolioChart, Object.keys(classTotals), Object.values(classTotals)); };
    const updateTargetChart = () => { updateChartData(targetPortfolioChart, Object.keys(savedTargetAllocation), Object.values(savedTargetAllocation)); };
    
    const renderPortfolioSummary = () => {
        const summaryEl = document.getElementById('current-portfolio-summary');
        if (!summaryEl) return;
        const classTotals = {};
        let totalPortfolioValue = 0;
        assets.forEach(asset => {
            const assetValue = asset.quantity * (asset.precoAtual || 0);
            totalPortfolioValue += assetValue;
            classTotals[asset.class] = (classTotals[asset.class] || 0) + assetValue;
        });
        summaryEl.innerHTML = `<div class="portfolio-summary-total"><span>Valor Total da Carteira</span><strong>${totalPortfolioValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div class="portfolio-summary-breakdown"></div>`;
        const breakdownContainer = summaryEl.querySelector('.portfolio-summary-breakdown');
        Object.entries(classTotals).sort(([, a], [, b]) => b - a).forEach(([className, classValue]) => {
            if (classValue > 0) {
                const itemEl = document.createElement('div');
                itemEl.className = 'summary-item';
                itemEl.innerHTML = `<span>${className}</span><span>${classValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`;
                breakdownContainer.appendChild(itemEl);
            }
        });
    };

    const renderAssets = () => {
        assetListEl.innerHTML = '';
        if (assets.length === 0) {
            assetListEl.innerHTML = '<p style="padding: 20px; text-align: center;">Nenhum ativo na carteira.</p>';
            updateCurrentChart();
            renderPortfolioSummary();
            return;
        }
        assets.forEach(asset => {
            const valorTotal = asset.quantity * (asset.precoAtual || 0);
            const assetEl = document.createElement('div');
            assetEl.className = 'asset-item';
            assetEl.innerHTML = `<span data-label="Ticker">${asset.ticker}</span><span data-label="Classe">${asset.class}</span><span data-label="Valor Total (R$)">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span data-label="Preço Atual">${(asset.precoAtual || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span data-label="Quantidade">${asset.quantity.toLocaleString('pt-BR')}</span><span data-label="Nota">${asset.score || 0}</span><div data-label="Ações" class="asset-actions"><button class="btn-edit" data-id="${asset.id}" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button><button class="btn-danger" data-id="${asset.id}" title="Remover"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button></div>`;
            assetListEl.appendChild(assetEl);
        });
        updateCurrentChart();
        renderPortfolioSummary();
    };

const atualizarCotacoes = async () => {
    // CORREÇÃO: A URL agora está com 'getquote' em minúsculo para corresponder ao nome do arquivo.
    const functionUrl = 'https://carteirainvestimentos.netlify.app/.netlify/functions/getQuote';

    refreshPricesBtn.disabled = true;
    const btnSpan = refreshPricesBtn.querySelector('span');
    const assetsToUpdate = assets.filter(asset => asset.class === 'Ações Nacionais' || asset.class === 'Fundos Imobiliários');

    if (assetsToUpdate.length === 0) {
        alert("Nenhum ativo para atualizar (Ações Nacionais ou FIIs).");
        refreshPricesBtn.disabled = false;
        return;
    }

    let successCount = 0;
    let errorCount = 0;
    const totalAssets = assetsToUpdate.length;

    await Promise.all(assetsToUpdate.map(async (asset, i) => {
        btnSpan.textContent = `Atualizando (${i + 1}/${totalAssets})...`;
        try {
            const response = await fetch(`${functionUrl}?ticker=${asset.ticker}`);

            if (!response.ok) {
                let errorMessage = `Erro na função: ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    // Ignora o erro de parse se a resposta não for JSON
                }
                throw new Error(`Falha para ${asset.ticker}: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();

            if (data && data.price) {
                asset.precoAtual = data.price;
                successCount++;
            } else {
                console.warn(`Não foi possível obter a cotação para ${asset.ticker}.`, { responseData: data });
                errorCount++;
            }
        } catch (error) {
            console.error(`Erro ao buscar cotação para ${asset.ticker}:`, error.message);
            errorCount++;
        }
    }));

    if (successCount > 0) {
        renderAssets();
        await saveAssets();
    }

    btnSpan.textContent = 'Atualizar Cotações';
    refreshPricesBtn.disabled = false;
    alert(`${successCount} cotação(ões) atualizada(s) com sucesso. ${errorCount} falha(s).`);
};



    
    const renderChecklistInModal = (questions) => {
        checklistItemsEl.innerHTML = '';
        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'checklist-item';
            item.innerHTML = `<span class="question-text">${q.text}</span><div class="quality-slider-wrapper"><span class="slider-label no">Não</span><input type="range" class="quality-slider" min="0" max="1" value="0" data-id="${q.id}"><span class="slider-label yes">Sim</span></div>`;
            checklistItemsEl.appendChild(item);
        });
    };
    
    const openModal = (asset = null) => {
        assetForm.reset();
        document.getElementById('asset-id').value = '';
        checklistContainer.classList.add('hidden');
        
        if (asset) {
            document.getElementById('modal-title').textContent = 'Editar Ativo';
            document.getElementById('asset-id').value = asset.id;
            document.getElementById('asset-ticker').value = asset.ticker;
            document.getElementById('asset-class').value = asset.class;
            document.getElementById('asset-quantity').value = asset.quantity;
            document.getElementById('asset-price').value = asset.precoAtual;

            let checklistToUse = [];
            if (asset.class === 'Ações Nacionais') {
                checklistToUse = nationalStockChecklistQuestions;
            } else if (asset.class === 'Ações Internacionais') {
                checklistToUse = internationalChecklistQuestions;
            }

            if (checklistToUse.length > 0) {
                renderChecklistInModal(checklistToUse);
                checklistContainer.classList.remove('hidden');
                checklistToUse.forEach(q => {
                    const slider = checklistItemsEl.querySelector(`.quality-slider[data-id="${q.id}"]`);
                    if (slider && asset.questions) {
                        slider.value = asset.questions[q.id] ? 1 : 0;
                        slider.classList.toggle('is-yes', !!asset.questions[q.id]);
                    }
                });
            }
        } else {
            document.getElementById('modal-title').textContent = 'Adicionar Novo Ativo';
            // Ao adicionar um novo, renderiza o checklist default ou nenhum
            renderChecklistInModal(nationalStockChecklistQuestions); // Padrão
        }
        modal.classList.add('active');
    };
    
    const handleFormSubmit = (e) => {
        e.preventDefault();
        const assetClass = document.getElementById('asset-class').value;
        
        let checklistToUse = [];
        if (assetClass === 'Ações Nacionais') {
            checklistToUse = nationalStockChecklistQuestions;
        } else if (assetClass === 'Ações Internacionais') {
            checklistToUse = internationalChecklistQuestions;
        }

        let score = 0;
        const questionAnswers = {};
        if (checklistToUse.length > 0) {
            checklistItemsEl.querySelectorAll('.quality-slider').forEach(slider => {
                const qId = Number(slider.dataset.id);
                const isYes = parseInt(slider.value) === 1;
                questionAnswers[qId] = isYes;
                if (isYes) { score++; } else { score--; }
            });
        } else {
            score = 10; // Nota padrão para classes sem checklist
        }

        const idValue = document.getElementById('asset-id').value;
        const assetData = {
            ticker: document.getElementById('asset-ticker').value.toUpperCase(),
            class: assetClass,
            quantity: parseFloat(document.getElementById('asset-quantity').value),
            precoAtual: parseFloat(document.getElementById('asset-price').value),
            score: score,
            questions: questionAnswers
        };
        if (idValue) {
            const idToEdit = Number(idValue);
            const index = assets.findIndex(a => a.id === idToEdit);
            if (index > -1) {
                assets[index] = { ...assets[index], ...assetData };
            }
        } else {
            assetData.id = nextAssetId++;
            assets.push(assetData);
        }
        renderAssets();
        saveAssets();
        modal.classList.remove('active');
    };

    const createAllocationSliders = () => {
        allocationSlidersEl.innerHTML = '';
        for (const className in stagedTargetAllocation) {
            const value = stagedTargetAllocation[className] || 0;
            const sliderEl = document.createElement('div');
            sliderEl.className = 'allocation-item';
            sliderEl.innerHTML = `<label for="slider-${className}">${className}</label><div class="slider-container"><input type="range" id="slider-${className}" min="0" max="100" value="${value}" data-class="${className}"><input type="number" class="slider-value" min="0" max="100" value="${value}" data-class="${className}"></div>`;
            allocationSlidersEl.appendChild(sliderEl);
        }
    };
    
    const validateAndSyncAllocationUI = () => {
        const total = Object.values(stagedTargetAllocation).reduce((sum, val) => sum + Number(val), 0);
        targetTotalDisplay.textContent = total.toFixed(0);
        if (Math.round(total) === 100) {
            saveAllocationBtn.disabled = false;
            allocationWarning.classList.add('hidden');
        } else {
            saveAllocationBtn.disabled = true;
            allocationWarning.classList.remove('hidden');
        }
    };
    
    // --- EVENT LISTENERS ---
    assetListEl.addEventListener('click', (e) => {
        const targetButton = e.target.closest('.btn-edit, .btn-danger');
        if (!targetButton) return;
        const assetId = Number(targetButton.dataset.id);
        if (isNaN(assetId)) {
            console.error("ID do ativo é inválido:", targetButton.dataset.id);
            return;
        }
        if (targetButton.classList.contains('btn-edit')) {
            const assetToEdit = assets.find(a => a.id === assetId);
            if (assetToEdit) openModal(assetToEdit);
        }
        if (targetButton.classList.contains('btn-danger')) {
            if (confirm('Tem certeza que deseja remover este ativo? A ação não pode ser desfeita.')) {
                assets = assets.filter(a => a.id !== assetId);
                saveAssets();
                renderAssets();
            }
        }
    });
    
    assetClassSelect.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        let checklistToUse = [];

        if (selectedClass === 'Ações Nacionais') {
            checklistToUse = nationalStockChecklistQuestions;
        } else if (selectedClass === 'Ações Internacionais') {
            checklistToUse = internationalChecklistQuestions;
        }

        if (checklistToUse.length > 0) {
            renderChecklistInModal(checklistToUse);
            checklistContainer.classList.remove('hidden');
        } else {
            checklistContainer.classList.add('hidden');
        }
    });

    checklistItemsEl.addEventListener('input', (e) => {
        if (e.target.classList.contains('quality-slider')) {
             const slider = e.target;
             slider.classList.toggle('is-yes', parseInt(slider.value) === 1);
        }
    });
    
    allocationSlidersEl.addEventListener('input', (e) => {
        const target = e.target;
        const className = target.dataset.class;
        if (!className) return;
        const value = target.value;
        stagedTargetAllocation[className] = Number(value);
        const otherInput = allocationSlidersEl.querySelector(`[data-class="${className}"]:not([type="${target.type}"])`);
        if (otherInput) otherInput.value = value;
        validateAndSyncAllocationUI();
    });

    saveAllocationBtn.addEventListener('click', () => {
        savedTargetAllocation = { ...stagedTargetAllocation };
        saveTarget();
        updateTargetChart();
        alert("Meta de alocação salva!");
    });

    addAssetBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    assetForm.addEventListener('submit', handleFormSubmit);
    refreshPricesBtn.addEventListener('click', atualizarCotacoes);

    // --- FUNÇÃO DE INICIALIZAÇÃO PRINCIPAL ---
    const initApp = async () => {
        await loadDataFromFirebase();
        
        nextAssetId = assets.length > 0 ? Math.max(...assets.map(a => a.id).filter(id => !isNaN(id))) + 1 : 1;
        
        stagedTargetAllocation = { ...savedTargetAllocation };
        assetClassSelect.innerHTML = '';
        Object.keys(savedTargetAllocation).forEach(key => {
            assetClassSelect.add(new Option(key, key));
        });

        initCharts();
        createAllocationSliders();
        validateAndSyncAllocationUI();
        renderAssets();
        updateTargetChart();
    };
    
    initApp();
};