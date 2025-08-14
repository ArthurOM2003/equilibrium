// ** SUA CONFIGURAÇÃO DO FIREBASE VAI AQUI **


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

    // --- DECLARAÇÕES DE VARIÁVEIS E REFERÊNCIAS ---
    let assets = [];
    let savedTargetAllocation = {};
    // NOVO: Variável para armazenar todas as perguntas dos checklists
    let checklistQuestions = {};
    let stagedTargetAllocation = {};
    let nextAssetId = 1;
    let currentPortfolioChart, targetPortfolioChart;

    // --- NOVO MAPA DE CORES FIXO PARA AS CLASSES DE ATIVOS ---
    const assetClassColorMap = {
        'Ações Nacionais': '#4B6B50',     // Verde Serrado
        'Ações Internacionais': '#BFA14A',// Ouro Velho
        'Fundos Imobiliários': '#A0522D',  // Terracota
        'Renda Fixa Nacional': '#6D6D6D', // Cinza Pedra
        'Cripto': '#8C785A',              // Tom terroso
        'Default': '#A9A9A9'              // Cor padrão para novas classes
    };

    // --- Referências do DOM ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-btn');
    const logoutModal = document.getElementById('logout-modal');
    const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
    const cancelLogoutBtn = document.getElementById('cancel-logout-btn');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const privacyToggleBtn = document.getElementById('privacy-toggle-btn');
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
    // NOVO: Referências para o modal de gerenciamento do checklist
    const manageChecklistBtn = document.getElementById('manage-checklist-btn');
    const checklistManagerModal = document.getElementById('checklist-manager-modal');
    const checklistManagerListEl = document.getElementById('checklist-manager-list');
    const addQuestionForm = document.getElementById('add-question-form');
    const newQuestionInput = document.getElementById('new-question-text');
    const checklistManagerDoneBtn = document.getElementById('checklist-manager-done-btn');

    // --- FUNÇÕES DE AJUDA E UTILITÁRIOS ---
    const showToast = (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };
    
    const setButtonLoading = (button, isLoading) => {
        const btnText = button.querySelector('.btn-text');
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
            if(btnText) btnText.style.visibility = 'hidden';
        } else {
            button.classList.remove('loading');
            button.disabled = false;
            if(btnText) btnText.style.visibility = 'visible';
        }
    };

    const getChartOptions = () => ({ responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'top', labels: { color: getComputedStyle(document.body).getPropertyValue('--c-text-secondary'), font: { family: "'Inter', sans-serif" } } }, tooltip: { backgroundColor: getComputedStyle(document.body).getPropertyValue('--c-surface'), titleColor: getComputedStyle(document.body).getPropertyValue('--c-text-primary'), bodyColor: getComputedStyle(document.body).getPropertyValue('--c-text-secondary'), boxPadding: 8, cornerRadius: 4, callbacks: { label: function(context) { return `${context.label}: ${context.parsed.toFixed(1)}%`; } } } } });
    const updateChartColors = () => { const newOptions = getChartOptions(); if (currentPortfolioChart) { currentPortfolioChart.options = newOptions; currentPortfolioChart.update('none'); } if (targetPortfolioChart) { targetPortfolioChart.options = newOptions; targetPortfolioChart.update('none'); } };

    // --- LÓGICA DE UI (TEMA, PRIVACIDADE, ONBOARDING) ---
    const applyTheme = () => { if (localStorage.getItem('darkMode') === 'true') { document.body.classList.add('dark-mode'); darkModeToggle.checked = true; } else { document.body.classList.remove('dark-mode'); darkModeToggle.checked = false; }};
    darkModeToggle.addEventListener('change', () => { document.body.classList.toggle('dark-mode'); localStorage.setItem('darkMode', document.body.classList.contains('dark-mode')); updateChartColors(); });
    const applyPrivacyMode = () => { const isPrivate = localStorage.getItem('privacyMode') === 'true'; document.body.classList.toggle('privacy-mode', isPrivate); };
    privacyToggleBtn.addEventListener('click', () => { const isPrivate = document.body.classList.toggle('privacy-mode'); localStorage.setItem('privacyMode', isPrivate); });

    const handleOnboarding = () => {
        const onboardingModal = document.getElementById('onboarding-modal');
        if (!onboardingModal || localStorage.getItem('onboardingCompleted') === 'true') {
            return;
        }
        onboardingModal.classList.add('active');
        let currentStep = 1;
        const steps = onboardingModal.querySelectorAll('.onboarding-step');
        const indicators = onboardingModal.querySelectorAll('.step-indicator');

        const showStep = (stepNumber) => {
            steps.forEach(step => step.classList.add('hidden'));
            steps[stepNumber - 1].classList.remove('hidden');
            indicators.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === stepNumber - 1);
            });
            currentStep = stepNumber;
        };

        onboardingModal.addEventListener('click', (e) => {
            if (e.target.closest('.btn-next-step')) {
                showStep(currentStep + 1);
            }
            if (e.target.closest('.btn-prev-step')) {
                showStep(currentStep - 1);
            }
            if (e.target.closest('#finish-onboarding-btn')) {
                onboardingModal.classList.remove('active');
                localStorage.setItem('onboardingCompleted', 'true');
                showToast('Tudo pronto! Sua jornada de investimentos começa agora.', 'success');
            }
        });
    };
    
    // NOVO: Perguntas padrão para novos usuários
    const getDefaultChecklists = () => ({
        'Ações Nacionais': [ { id: 1, text: 'Dívida Líquida é negativa ou DL/PL < 50%?' }, { id: 2, text: 'ROE (Retorno sobre Patrimônio) histórico acima de 5%?' }, { id: 3, text: 'Dívida líquida é menor que o lucro líquido dos últimos 12 meses?' }, { id: 4, text: 'Tem crescimento de receitas ou lucro > 5% a.a. nos últimos 5 anos?' }, { id: 5, text: 'Possui um histórico consistente de pagamento de dividendos?' }, { id: 6, text: 'Investe consistentemente em pesquisa e inovação?' }, { id: 7, text: 'O setor é perene (não está se tornando obsoleto)?' }, { id: 8, text: 'Está negociada com um P/VP (Preço/Valor Patrimonial) abaixo de 5?' }, { id: 9, text: 'Teve lucro operacional no último exercício (ano)?' }, { id: 10, text: 'Tem mais de 30 anos de mercado (desde a fundação)?' }, { id: 11, text: 'É LÍDER (1º lugar) nacional ou mundial no seu setor?' }, { id: 12, text: 'O setor de atuação da empresa tem mais de 100 anos?' }, { id: 13, text: 'É considerada uma BLUE CHIP (empresa de grande porte e sólida)?' }, { id: 14, text: 'A empresa possui uma gestão bem avaliada pelo mercado?' }, { id: 15, text: 'É livre de escândalos de corrupção recentes?' }, { id: 16, text: 'É livre de controle estatal ou concentração em um único cliente?' }, { id: 17, text: 'O P/L (Preço/Lucro) da empresa está abaixo de 30?' } ],
        'Ações Internacionais': [ { id: 18, text: 'A taxa de administração é inferior a 0,7% ao ano?' }, { id: 19, text: 'O gestor do fundo tem mais de 5 anos de experiência no mercado?' }, { id: 20, text: 'A carteira do ETF é composta por mais de 30 ativos diferentes?' }, { id: 21, text: 'Nenhum ativo individual representa mais de 20% do patrimônio total do fundo?' }, { id: 22, text: 'O ETF tem um patrimônio líquido sob gestão superior a R$ 100 milhões?' }, { id: 23, text: 'O Dividend Yield do fundo foi superior a 2,5% nos últimos 12 meses?' }, { id: 24, text: 'O foco do ETF está em setores considerados perenes e confiáveis (ex: financeiro, saúde, consumo básico, utilidades)?' } ],
        'Fundos Imobiliários': [], // Começa vazio para o usuário adicionar
        'Renda Fixa Nacional': [],
        'Cripto': []
    });


    // --- LÓGICA DE DADOS (FIREBASE) ---
    const portfolioRef = db.collection('portfolios').doc(user.uid);
    // ATUALIZADO: Carrega os checklists junto com os outros dados
    const loadDataFromFirebase = async () => {
        try {
            const doc = await portfolioRef.get();
            if (doc.exists) {
                const data = doc.data();
                assets = data.assets || [];
                savedTargetAllocation = data.target || {};
                // Carrega checklists do usuário ou usa os padrões
                checklistQuestions = data.checklists || getDefaultChecklists();
            } else {
                showToast(`Bem-vindo(a), ${user.displayName || 'investidor(a)'}!`, 'info');
                const exampleData = {
                    assets: [], 
                    target: { 'Cripto': 5, 'Ações Nacionais': 40, 'Renda Fixa Nacional': 10, 'Ações Internacionais': 35, 'Fundos Imobiliários': 10 },
                    checklists: getDefaultChecklists() // Salva os checklists padrão para novos usuários
                };
                await portfolioRef.set(exampleData);
                assets = exampleData.assets;
                savedTargetAllocation = exampleData.target;
                checklistQuestions = exampleData.checklists;
                handleOnboarding(); 
            }
        } catch (error) {
            console.error("Erro Crítico ao carregar dados:", error);
            showToast("Não foi possível carregar os dados da sua carteira.", "error");
        }
    };
    
    // ATUALIZADO: Salva os checklists junto com os outros dados
    const saveDataToFirebase = async () => {
        try {
            await portfolioRef.set({ 
                assets: assets, 
                target: savedTargetAllocation,
                checklists: checklistQuestions // Adiciona os checklists ao salvar
            });
            return true;
        } catch (error) {
            console.error("Erro ao salvar dados:", error);
            showToast("Não foi possível salvar suas alterações.", "error");
            return false;
        }
    };

    // REMOVIDO: As variáveis com checklists hardcoded foram removidas
    // const nationalStockChecklistQuestions = [...];
    // const internationalChecklistQuestions = [...];

    // --- FUNÇÕES DE RENDERIZAÇÃO ---
    const initCharts = () => { const currentCtx = document.getElementById('currentPortfolioChart').getContext('2d'); currentPortfolioChart = new Chart(currentCtx, { type: 'doughnut', options: getChartOptions() }); const targetCtx = document.getElementById('targetPortfolioChart').getContext('2d'); targetPortfolioChart = new Chart(targetCtx, { type: 'doughnut', options: getChartOptions() }); };
    
    const updateChartData = (chart, labels, data) => { 
        const backgroundColors = labels.map(label => assetClassColorMap[label] || assetClassColorMap['Default']);
        chart.data.labels = labels; 
        chart.data.datasets = [{ 
            data: data, 
            backgroundColor: backgroundColors, 
            borderWidth: 2, 
            borderColor: getComputedStyle(document.body).getPropertyValue('--c-chart-border') 
        }]; 
        chart.update(); 
    };

    const updateCurrentChart = () => { const classTotals = {}; let totalValue = 0; assets.forEach(asset => { const value = asset.quantity * asset.precoAtual; classTotals[asset.class] = (classTotals[asset.class] || 0) + value; totalValue += value; }); const percentages = totalValue > 0 ? Object.values(classTotals).map(v => (v / totalValue) * 100) : []; updateChartData(currentPortfolioChart, Object.keys(classTotals), percentages); };
    const updateTargetChart = () => { const validTargets = Object.entries(savedTargetAllocation).filter(([,v]) => v > 0); updateChartData(targetPortfolioChart, validTargets.map(([k]) => k), validTargets.map(([,v]) => v)); };
    
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
        summaryEl.innerHTML = `<div class="portfolio-summary-total"><span>Valor Total da Carteira</span><strong class="sensitive-data">${totalPortfolioValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></div><div class="portfolio-summary-breakdown"></div>`; 
        const breakdownContainer = summaryEl.querySelector('.portfolio-summary-breakdown'); 
        if (Object.keys(classTotals).length === 0) {
            breakdownContainer.innerHTML = `<p class="placeholder-text" style="padding: 10px 0;">Nenhum ativo para resumir.</p>`;
            return;
        }
        Object.entries(classTotals).sort(([, a], [, b]) => b - a).forEach(([className, classValue]) => { 
            if (classValue >= 0) {
                const itemEl = document.createElement('div'); 
                itemEl.className = 'summary-item'; 
                itemEl.innerHTML = `<span>${className}</span><span class="sensitive-data">${classValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>`; 
                breakdownContainer.appendChild(itemEl); 
            } 
        }); 
    };

    const renderAssets = () => {
        assetListEl.innerHTML = '';
        if (assets.length === 0) {
            assetListEl.innerHTML = `<div class="empty-state-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 12L22 7l-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
                <h3>Sua carteira está vazia</h3>
                <p>Adicione seu primeiro ativo para começar a organizar seus investimentos.</p>
                <button id="add-first-asset-btn" class="btn btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                    <span class="btn-text">Adicionar Ativo</span>
                </button>
            </div>`;
            document.getElementById('add-first-asset-btn').addEventListener('click', () => openModal());
        } else {
            assets.forEach(asset => { 
                const valorTotal = asset.quantity * (asset.precoAtual || 0); 
                const assetEl = document.createElement('div'); 
                assetEl.className = 'asset-item'; 
                assetEl.dataset.ticker = asset.ticker; 
                assetEl.innerHTML = `<span data-label="Ticker">${asset.ticker}</span><span data-label="Classe">${asset.class}</span><span data-label="Valor Total (R$)" class="sensitive-data">${valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span data-label="Preço Atual" class="asset-price sensitive-data">${(asset.precoAtual || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}<span class="price-status"></span></span><span data-label="Quantidade">${asset.quantity.toLocaleString('pt-BR')}</span><span data-label="Nota">${asset.score || 0}</span><div data-label="Ações" class="asset-actions"><button class="btn-edit" data-id="${asset.id}" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path></svg></button><button class="btn-danger" data-id="${asset.id}" title="Remover"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></div>`; 
                assetListEl.appendChild(assetEl); 
            });
        }
        updateCurrentChart();
        renderPortfolioSummary();
    };
    
    // --- FUNÇÕES DE AÇÃO E EVENTOS ---
    const atualizarCotacoes = async () => {
        setButtonLoading(refreshPricesBtn, true);
        const functionUrl = 'https://carteirainvestimentos.netlify.app/.netlify/functions/getQuote';
        const assetsToUpdate = assets.filter(asset => asset.class === 'Ações Nacionais' || asset.class === 'Fundos Imobiliários');

        if (assetsToUpdate.length === 0) {
            showToast("Nenhum ativo para atualizar.", "info");
            setButtonLoading(refreshPricesBtn, false);
            return;
        }

        let successCount = 0;
        let errorCount = 0;
        await Promise.all(assetsToUpdate.map(async (asset) => {
            const assetRow = document.querySelector(`.asset-item[data-ticker="${asset.ticker}"]`);
            const statusEl = assetRow ? assetRow.querySelector('.price-status') : null;
            if (statusEl) statusEl.className = 'price-status spinner';
            try {
                const response = await fetch(`${functionUrl}?ticker=${asset.ticker}`);
                if (!response.ok) throw new Error(`API Error ${response.status}`);
                const data = await response.json();
                if (data && data.price) {
                    asset.precoAtual = data.price;
                    if (statusEl) statusEl.className = 'price-status success';
                    successCount++;
                } else {
                    throw new Error('Preço não encontrado.');
                }
            } catch (error) {
                console.error(`Erro para ${asset.ticker}:`, error);
                if (statusEl) statusEl.className = 'price-status failure';
                errorCount++;
            } finally {
                setTimeout(() => { if (statusEl) statusEl.className = 'price-status'; }, 3000);
            }
        }));

        if (successCount > 0) {
            await saveDataToFirebase();
            renderAssets();
        }
        
        showToast(`${successCount} cotação(ões) atualizada(s). ${errorCount > 0 ? `${errorCount} falharam.` : ''}`, successCount > 0 ? 'success' : 'error');
        setButtonLoading(refreshPricesBtn, false);
    };
    
    // ATUALIZADO: Renderiza o checklist com base na lista de perguntas fornecida
    const renderChecklistInModal = (questions) => {
        checklistItemsEl.innerHTML = '';
        if (!questions || questions.length === 0) {
            checklistItemsEl.innerHTML = `<p class="placeholder-text">Nenhuma pergunta definida para esta classe de ativos.</p>`;
            return;
        }
        questions.forEach(q => {
            const item = document.createElement('div');
            item.className = 'checklist-item';
            
            item.innerHTML = `
                <span class="question-text">${q.text}</span>
                <label class="toggle-switch">
                    <input type="checkbox" class="quality-checkbox" data-id="${q.id}">
                    <span class="switch-slider"></span>
                </label>
            `;
            checklistItemsEl.appendChild(item);
        });
    };

    const openModal = (asset = null) => {
        assetForm.reset();
        document.getElementById('asset-id').value = '';
        checklistContainer.classList.add('hidden');
        
        const selectedClass = asset ? asset.class : assetClassSelect.value;
        const questionsForClass = checklistQuestions[selectedClass] || [];

        if (asset) {
            document.getElementById('modal-title').textContent = 'Editar Ativo';
            document.getElementById('asset-id').value = asset.id;
            document.getElementById('asset-ticker').value = asset.ticker;
            document.getElementById('asset-class').value = asset.class;
            document.getElementById('asset-quantity').value = asset.quantity;
            document.getElementById('asset-price').value = asset.precoAtual;

            if (questionsForClass.length > 0) {
                renderChecklistInModal(questionsForClass);
                checklistContainer.classList.remove('hidden');
                questionsForClass.forEach(q => {
                    const checkbox = checklistItemsEl.querySelector(`.quality-checkbox[data-id="${q.id}"]`);
                    if (checkbox && asset.questions) {
                        checkbox.checked = !!asset.questions[q.id];
                    }
                });
            }
        } else {
            document.getElementById('modal-title').textContent = 'Adicionar Novo Ativo';
            if (questionsForClass.length > 0) {
                renderChecklistInModal(questionsForClass);
                checklistContainer.classList.remove('hidden');
            }
        }
        modal.classList.add('active');
    };
    
    const handleFormSubmit = async (e) => {
        e.preventDefault();
        const submitButton = e.target.querySelector('button[type="submit"]');
        setButtonLoading(submitButton, true);

        const assetClass = document.getElementById('asset-class').value;
        const questionsForClass = checklistQuestions[assetClass] || [];

        let score = 0; 
        const questionAnswers = {};
        if (questionsForClass.length > 0) {
            checklistItemsEl.querySelectorAll('.quality-checkbox').forEach(checkbox => {
                const qId = checkbox.dataset.id;
                const isYes = checkbox.checked;
                questionAnswers[qId] = isYes;
                if (isYes) score++; else score--;
            });
        } else {
            score = 10; // Nota padrão se não houver checklist
        }

        const idValue = document.getElementById('asset-id').value;
        const assetData = { ticker: document.getElementById('asset-ticker').value.toUpperCase(), class: assetClass, quantity: parseFloat(document.getElementById('asset-quantity').value), precoAtual: parseFloat(document.getElementById('asset-price').value), score: score, questions: questionAnswers };
        
        const isEditing = !!idValue;
        if (isEditing) { const idToEdit = Number(idValue); const index = assets.findIndex(a => a.id === idToEdit); if (index > -1) assets[index] = { ...assets[index], ...assetData }; } 
        else { assetData.id = nextAssetId++; assets.push(assetData); }
        
        const success = await saveDataToFirebase();
        if (success) {
            renderAssets();
            showToast(`Ativo ${isEditing ? 'atualizado' : 'adicionado'} com sucesso!`, 'success');
            modal.classList.remove('active');
        } else {
            showToast('Erro ao salvar o ativo.', 'error');
        }
        setButtonLoading(submitButton, false);
    };

    // --- LÓGICA DO GERENCIADOR DE CHECKLIST ---
    // NOVO: Renderiza as perguntas no modal de gerenciamento
    const renderChecklistManager = (assetClass) => {
        checklistManagerListEl.innerHTML = '';
        const questions = checklistQuestions[assetClass] || [];
        if (questions.length === 0) {
            checklistManagerListEl.innerHTML = `<p class="placeholder-text">Nenhuma pergunta. Adicione a primeira!</p>`;
        } else {
            questions.forEach(q => {
                const item = document.createElement('div');
                item.className = 'checklist-item';
                item.dataset.id = q.id;
                item.innerHTML = `
                    <span>${q.text}</span>
                    <button class="btn-icon btn-danger btn-delete-question" title="Remover Pergunta">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                `;
                checklistManagerListEl.appendChild(item);
            });
        }
    };
    
    // NOVO: Abre o modal de gerenciamento
    manageChecklistBtn.addEventListener('click', () => {
        const currentClass = assetClassSelect.value;
        checklistManagerModal.dataset.class = currentClass; // Armazena a classe atual
        document.getElementById('checklist-manager-title').textContent = `Gerenciar Checklist: ${currentClass}`;
        renderChecklistManager(currentClass);
        checklistManagerModal.classList.add('active');
    });

    // NOVO: Adiciona nova pergunta
    addQuestionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const assetClass = checklistManagerModal.dataset.class;
        const newText = newQuestionInput.value.trim();
        if (newText && assetClass) {
            if (!checklistQuestions[assetClass]) {
                checklistQuestions[assetClass] = [];
            }
            checklistQuestions[assetClass].push({ id: Date.now(), text: newText });
            newQuestionInput.value = '';
            renderChecklistManager(assetClass);
        }
    });

    // NOVO: Remove uma pergunta
    checklistManagerListEl.addEventListener('click', (e) => {
        const deleteButton = e.target.closest('.btn-delete-question');
        if (deleteButton) {
            const assetClass = checklistManagerModal.dataset.class;
            const questionItem = deleteButton.closest('.checklist-item');
            const questionId = Number(questionItem.dataset.id);
            if (assetClass && questionId) {
                checklistQuestions[assetClass] = checklistQuestions[assetClass].filter(q => q.id !== questionId);
                renderChecklistManager(assetClass);
            }
        }
    });

    // NOVO: Fecha o modal de gerenciamento e salva os dados
    checklistManagerDoneBtn.addEventListener('click', async () => {
        setButtonLoading(checklistManagerDoneBtn, true);
        const success = await saveDataToFirebase();
        if (success) {
            showToast('Checklist atualizado com sucesso!', 'success');
            // Re-renderiza o checklist no modal principal para refletir as mudanças
            const currentClass = checklistManagerModal.dataset.class;
            const questionsForClass = checklistQuestions[currentClass] || [];
            renderChecklistInModal(questionsForClass);
        }
        checklistManagerModal.classList.remove('active');
        setButtonLoading(checklistManagerDoneBtn, false);
    });
    // Adiciona evento para o botão de fechar no modal de checklist
    checklistManagerModal.querySelector('.close-modal-btn').addEventListener('click', () => {
        checklistManagerModal.classList.remove('active');
    });


    // --- Demais Funções ---
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

    assetListEl.addEventListener('click', (e) => {
        const targetButton = e.target.closest('button');
        if (!targetButton) return;
        const assetId = Number(targetButton.dataset.id);
        if (isNaN(assetId)) return;
        if (targetButton.classList.contains('btn-edit')) {
            const assetToEdit = assets.find(a => a.id === assetId);
            if (assetToEdit) openModal(assetToEdit);
        }
        if (targetButton.classList.contains('btn-danger')) {
            if (confirm('Tem certeza que deseja remover este ativo? A ação não pode ser desfeita.')) {
                assets = assets.filter(a => a.id !== assetId);
                saveDataToFirebase().then(() => {
                    renderAssets();
                    showToast('Ativo removido.', 'info');
                });
            }
        }
    });

    // ATUALIZADO: Agora busca as perguntas dinamicamente ao mudar a classe
    assetClassSelect.addEventListener('change', (e) => {
        const selectedClass = e.target.value;
        const questionsForClass = checklistQuestions[selectedClass] || [];
        
        if (questionsForClass.length > 0) {
            renderChecklistInModal(questionsForClass);
            checklistContainer.classList.remove('hidden');
        } else {
            checklistContainer.classList.add('hidden');
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

    saveAllocationBtn.addEventListener('click', async () => { 
        setButtonLoading(saveAllocationBtn, true); 
        savedTargetAllocation = { ...stagedTargetAllocation }; 
        const success = await saveDataToFirebase(); 
        if(success) { updateTargetChart(); showToast("Meta de alocação salva!", "success"); } 
        setButtonLoading(saveAllocationBtn, false); 
    });

    addAssetBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
    assetForm.addEventListener('submit', handleFormSubmit);
    refreshPricesBtn.addEventListener('click', atualizarCotacoes);
    logoutBtn.addEventListener('click', () => logoutModal.classList.add('active'));
    confirmLogoutBtn.addEventListener('click', () => { showToast('Saindo...', 'info'); setTimeout(() => auth.signOut(), 500); });
    cancelLogoutBtn.addEventListener('click', () => logoutModal.classList.remove('active'));

    // --- FUNÇÃO DE INICIALIZAÇÃO PRINCIPAL ---
    const init = async () => {
        welcomeMessage.textContent = `Olá, ${user.displayName || user.email.split('@')[0]}!`;
        applyTheme();
        applyPrivacyMode();
        
        await loadDataFromFirebase();
        
        nextAssetId = assets.length > 0 ? Math.max(...assets.map(a => a.id).filter(id => !isNaN(id))) + 1 : 1;
        stagedTargetAllocation = { ...savedTargetAllocation };
        assetClassSelect.innerHTML = '';
        Object.keys(savedTargetAllocation).forEach(key => {
            assetClassSelect.add(new Option(key, key));
            // Garante que todas as classes de alocação tenham uma entrada no checklist
            if (checklistQuestions[key] === undefined) {
                checklistQuestions[key] = [];
            }
        });

        initCharts();
        createAllocationSliders();
        validateAndSyncAllocationUI();
        renderAssets();
        updateTargetChart();
    };
    
    init();
};