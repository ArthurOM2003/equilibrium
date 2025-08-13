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
    
    const CLASSES_INTEIRAS = ['Ações Nacionais', 'Fundos Imobiliários'];

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
            statusEl.innerHTML = `<div class="status-labels"><span>${className}</span><span>${currentPercent.toFixed(1)}% / <strong>${targetPercent}%</strong></span></div><div class="status-bar-container"><div class="status-bar current" style="width: ${Math.min(currentPercent, 100)}%;"></div><div class="status-bar target" style="width: ${targetPercent}%;"></div></div>`;
            statusContainer.appendChild(statusEl);
        });
    };
    
    const calcularAporteIdealComDiagnostico = (totalAporte, tickersExcluidos) => {
        const diagnostico = {};
        diagnostico.passo1_entrada = { totalAporte, tickersExcluidos: [...tickersExcluidos], totalAtivos: assets.length };

        const ativosConsiderados = assets.filter(a => !tickersExcluidos.has(a.ticker));
        if (ativosConsiderados.length === 0) {
            return { sugestoes: [], sobra: totalAporte };
        }
        diagnostico.passo2_ativosConsiderados = { quantidade: ativosConsiderados.length, lista: ativosConsiderados.map(a => a.ticker) };

        const valorAtualConsiderado = ativosConsiderados.reduce((sum, a) => sum + (a.quantity * a.precoAtual), 0);
        const valorFinalConsiderado = valorAtualConsiderado + totalAporte;
        
        const analiseDeClasses = Object.keys(targetAllocation)
            .map(className => {
                const ativosDaClasse = ativosConsiderados.filter(a => a.class === className);
                if (ativosDaClasse.length === 0) return null;
                const valorAtualDaClasse = ativosDaClasse.reduce((sum, a) => sum + (a.quantity * a.precoAtual), 0);
                const valorIdealDaClasse = (targetAllocation[className] / 100) * valorFinalConsiderado;
                const necessidade = Math.max(0, valorIdealDaClasse - valorAtualDaClasse);
                return { classe: className, necessidadeEmReais: necessidade };
            }).filter(Boolean);
        
        diagnostico.passo3_analiseDeClasses = analiseDeClasses;

        const classesComNecessidade = analiseDeClasses.filter(c => c.necessidadeEmReais > 0);
        const totalNecessidade = classesComNecessidade.reduce((sum, c) => sum + c.necessidadeEmReais, 0);
        let sugestoesProcessadas = [];

        if (totalNecessidade > 0) {
            const sugestoesAgregadas = {};
            classesComNecessidade.forEach(classeInfo => {
                const proporcaoDaNecessidade = classeInfo.necessidadeEmReais / totalNecessidade;
                const aporteParaClasse = totalAporte * proporcaoDaNecessidade;
                const ativosDaClasse = ativosConsiderados.filter(a => a.class === classeInfo.classe);
                const totalScoreDaClasse = ativosDaClasse.reduce((sum, ativo) => sum + (ativo.score > 0 ? ativo.score : 0), 1);
                ativosDaClasse.forEach(ativo => {
                    const pesoDoAtivo = (ativo.score > 0 ? ativo.score : 0) / totalScoreDaClasse;
                    const valorParaAtivo = aporteParaClasse * pesoDoAtivo;
                    sugestoesAgregadas[ativo.ticker] = (sugestoesAgregadas[ativo.ticker] || 0) + valorParaAtivo;
                });
            });
            diagnostico.passo4_distribuicaoInicial = { ...sugestoesAgregadas };

            sugestoesProcessadas = Object.entries(sugestoesAgregadas).map(([ticker, amount]) => {
                const asset = ativosConsiderados.find(a => a.ticker === ticker);
                let quantidade = null;
                let valorReal = amount;
                if (CLASSES_INTEIRAS.includes(asset.class) && asset.precoAtual > 0) {
                    quantidade = Math.floor(amount / asset.precoAtual);
                    valorReal = quantidade * asset.precoAtual;
                }
                return { ticker, class: asset.class, amount: valorReal, quantity: quantidade };
            });
        }
        
        let sobraCorrente = totalAporte - sugestoesProcessadas.reduce((sum, s) => sum + s.amount, 0);
        diagnostico.passo5_sobraAntesDoLoop = sobraCorrente;
        diagnostico.passo6_loopDeSobra = [];

        const totalScoreConsiderado = ativosConsiderados.reduce((sum, a) => sum + (a.score > 0 ? a.score : 0), 0);

        while (sobraCorrente > 1.00 && totalScoreConsiderado > 0) {
            const valorEntradaLoop = sobraCorrente;
            let valorAlocadoNesteLoop = 0;
            const alocacoesDaRodada = [];

            ativosConsiderados.forEach(ativo => {
                const pesoDoAtivo = (ativo.score > 0 ? ativo.score : 0) / totalScoreConsiderado;
                const valorDaSobraParaAtivo = valorEntradaLoop * pesoDoAtivo;
                let valorAlocadoParaAtivo = 0;
                let cotasAdicionais = 0;

                if (CLASSES_INTEIRAS.includes(ativo.class) && ativo.precoAtual > 0) {
                    cotasAdicionais = Math.floor(valorDaSobraParaAtivo / ativo.precoAtual);
                    if (cotasAdicionais > 0) valorAlocadoParaAtivo = cotasAdicionais * ativo.precoAtual;
                } else if (valorDaSobraParaAtivo > 0.01) {
                    valorAlocadoParaAtivo = valorDaSobraParaAtivo;
                }
                
                if (valorAlocadoParaAtivo > 0) {
                    alocacoesDaRodada.push({ticker: ativo.ticker, class: ativo.class, amount: valorAlocadoParaAtivo, quantity: cotasAdicionais});
                    valorAlocadoNesteLoop += valorAlocadoParaAtivo;
                }
            });
            
            if (valorAlocadoNesteLoop < 0.01) {
                diagnostico.passo6_loopDeSobra.push({rodada: diagnostico.passo6_loopDeSobra.length + 1, motivo: "Loop encerrado, sobra insuficiente."});
                break;
            }

            alocacoesDaRodada.forEach(alocacao => {
                const sugestaoExistente = sugestoesProcessadas.find(s => s.ticker === alocacao.ticker);
                if(sugestaoExistente){
                    sugestaoExistente.amount += alocacao.amount;
                    if(sugestaoExistente.quantity !== null && alocacao.quantity > 0) sugestaoExistente.quantity += alocacao.quantity;
                } else {
                    sugestoesProcessadas.push(alocacao);
                }
            });
            
            sobraCorrente = valorEntradaLoop - valorAlocadoNesteLoop;
            diagnostico.passo6_loopDeSobra.push({rodada: diagnostico.passo6_loopDeSobra.length + 1, entrada: valorEntradaLoop, alocado: valorAlocadoNesteLoop, novaSobra: sobraCorrente});
        }

        let sugestoesFinais = [...sugestoesProcessadas];
        let valorARedistribuir = 0;
        const tickersInvalidos = new Set();

        sugestoesFinais.forEach(sugestao => {
            const necessidadeDaClasse = analiseDeClasses.find(c => c.classe === sugestao.class)?.necessidadeEmReais || 0;
            if (necessidadeDaClasse === 0) {
                valorARedistribuir += sugestao.amount;
                tickersInvalidos.add(sugestao.ticker);
            }
        });

        if (valorARedistribuir > 0) {
            diagnostico.passo7_filtroDeSeguranca = { motivo: `Sugestões para classes balanceadas (${[...tickersInvalidos].join(', ')}) removidas.`, valor: valorARedistribuir };
            
            sugestoesFinais = sugestoesFinais.filter(s => !tickersInvalidos.has(s.ticker));
            const totalLegitimo = sugestoesFinais.reduce((sum, s) => sum + s.amount, 0);

            if (totalLegitimo > 0) {
                sugestoesFinais.forEach(s => {
                    const proporcao = s.amount / totalLegitimo;
                    s.amount += valorARedistribuir * proporcao;
                });
            }
        }

        const totalSugeridoFinal = sugestoesFinais.reduce((sum, s) => sum + s.amount, 0);
        const sobraFinal = totalAporte - totalSugeridoFinal;

        diagnostico.passo8_resultadoFinal = { sugestoes: sugestoesFinais, sobra: sobraFinal };

        console.log("--- DIAGNÓSTICO COMPLETO DO APORTE (v11 - LOOP + FILTRO) ---");
        console.log(diagnostico);
        console.table(analiseDeClasses.map(c => ({...c, necessidadeEmReais: c.necessidadeEmReais.toFixed(2)})));
        console.log("--------------------------------------");

        return { sugestoes: sugestoesFinais.filter(s => s.amount >= 0.01), sobra: sobraFinal };
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
                <p>O aporte pode ser muito baixo, ou não há classes precisando de aporte no momento.</p>
            </div>`;
            return;
        }
        sugestoes.sort((a,b) => b.amount - a.amount).forEach(s => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'aporte-suggestion';
            let infoExtra = s.quantity !== null ? `<span class="class">${s.class} (~ ${s.quantity} cota(s))</span>` : `<span class="class">${s.class}</span>`;
            suggestionEl.innerHTML = `<div class="aporte-suggestion-info"><span class="ticker">${s.ticker}</span>${infoExtra}</div><div class="aporte-suggestion-amount">${s.amount.toLocaleString('pt-BR', { style: 'currency', 'currency': 'BRL' })}</div>`;
            resultsContainer.appendChild(suggestionEl);
        });

        if (sobra >= 0.01) {
             const sobraEl = document.createElement('div');
             sobraEl.className = 'suggestion-item sobra';
             sobraEl.innerHTML = `<div class="aporte-suggestion-info"><span class="ticker">Sobra de caixa</span><span class="class">Valor residual.</span></div><div class="aporte-suggestion-amount">${sobra.toLocaleString('pt-BR', { style: 'currency', 'currency': 'BRL' })}</div>`;
            resultsContainer.appendChild(sobraEl);
        }
    };
    
    calculateBtn.addEventListener('click', () => {
        const totalAporte = parseFloat(amountInput.value);
        if (isNaN(totalAporte) || totalAporte <= 0) {
            alert('Por favor, insira um valor de aporte válido.');
            return;
        }
        
        calculateBtn.classList.add('loading');
        calculateBtn.disabled = true;

        // Pequeno delay para a animação do spinner ser visível
        setTimeout(() => {
            const tickersExcluidos = new Set();
            document.querySelectorAll('.penalize-asset-checkbox:checked').forEach(checkbox => {
                tickersExcluidos.add(checkbox.value);
            });
            
            const result = calcularAporteIdealComDiagnostico(totalAporte, tickersExcluidos); 
            displayAporteResults(result);

            calculateBtn.classList.remove('loading');
            calculateBtn.disabled = false;
        }, 300);
    });

    displayPortfolioStatus();
    popularCheckboxesDeExclusao();
};