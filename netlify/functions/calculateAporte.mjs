// Esta função serverless irá executar o seu algoritmo de forma segura no backend.

// Cabeçalhos de permissão (CORS) para permitir que o seu site chame esta função
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// A sua lógica de cálculo, copiada exatamente como estava no aporte.js
const calcularAporteIdealComDiagnostico = (totalAporte, tickersExcluidos, assets, targetAllocation) => {
    const diagnostico = {};
    diagnostico.passo1_entrada = { totalAporte, tickersExcluidos: [...tickersExcluidos], totalAtivos: assets.length };

    const ativosConsiderados = assets.filter(a => !tickersExcluidos.has(a.ticker));
    if (ativosConsiderados.length === 0) {
        return { sugestoes: [], sobra: totalAporte };
    }
    diagnostico.passo2_ativosConsiderados = { quantidade: ativosConsiderados.length, lista: ativosConsiderados.map(a => a.ticker) };

    const valorAtualConsiderado = ativosConsiderados.reduce((sum, a) => sum + (a.quantity * a.precoAtual), 0);
    const valorFinalConsiderado = valorAtualConsiderado + totalAporte;
    
    const CLASSES_INTEIRAS = ['Ações Nacionais', 'Fundos Imobiliários'];

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
            const pesoDoAtivo = (ativo.score > 0 ? a.score : 0) / totalScoreConsiderado;
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

    console.log("--- DIAGNÓSTICO DO APORTE EXECUTADO NO BACKEND ---");
    console.log(diagnostico);
    console.log("--------------------------------------");

    return { sugestoes: sugestoesFinais.filter(s => s.amount >= 0.01), sobra: sobraFinal };
};

// Handler principal da função Netlify
export const handler = async (event) => {
  // Responde a pedidos de "pre-flight" do CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'OPTIONS request successful' })
    };
  }

  // Apenas permite pedidos POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const { totalAporte, tickersExcluidos, assets, targetAllocation } = JSON.parse(event.body);

    // Validação básica dos dados recebidos
    if (!totalAporte || !Array.isArray(assets) || !targetAllocation) {
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Dados de entrada inválidos ou em falta.' })
        };
    }

    // O Set não é serializado corretamente em JSON, então o recriamos aqui.
    const tickersExcluidosSet = new Set(tickersExcluidos || []);
    
    // Chama a sua função de cálculo segura
    const result = calcularAporteIdealComDiagnostico(totalAporte, tickersExcluidosSet, assets, targetAllocation);
    
    // Devolve o resultado
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error("Erro na função calculateAporte:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Ocorreu um erro interno ao calcular o aporte.' })
    };
  }
};