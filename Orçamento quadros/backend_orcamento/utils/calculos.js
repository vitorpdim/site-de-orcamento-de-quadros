// backend_orcamento/utils/calculos.js

// ... (demais funções como arredondarParaCinco, cmParaMetro, etc., permanecem as mesmas) ...
// RF01 - Arredondamento automático para múltiplos de 5 cm (sempre para cima)
function arredondarParaCinco(medida) {
    return Math.ceil(medida / 5) * 5;
}

// Converte cm para metro (para cálculos de metro linear/quadrado)
function cmParaMetro(valorCm) {
    return valorCm / 100;
}

// RF01 - Metro linear: (altura + altura + largura + largura)
function calcularMetroLinear(alturaCm, larguraCm) {
    const alturaArredondada = arredondarParaCinco(alturaCm);
    const larguraArredondada = arredondarParaCinco(larguraCm);
    return (alturaArredondada + alturaArredondada + larguraArredondada + larguraArredondada) / 100;
}

// RF01 - Metro quadrado: (altura × largura)
function calcularMetroQuadrado(alturaCm, larguraCm) {
    const alturaArredondada = arredondarParaCinco(alturaCm);
    const larguraArredondada = arredondarParaCinco(larguraCm);
    return (alturaArredondada * larguraArredondada) / 10000;
}

// RF01 - Paspatur: (altura + 2 × espessura) × (largura + 2 × espessura), com mínimo de 2 cm
function calcularAreaPaspatur(alturaCm, larguraCm, espessuraPaspaturCm) {
    const espessuraReal = Math.max(espessuraPaspaturCm, 2);
    const alturaComPaspaturCm = alturaCm + (2 * espessuraReal);
    const larguraComPaspaturCm = larguraCm + (2 * espessuraReal);
    return calcularMetroQuadrado(alturaComPaspaturCm, larguraComPaspaturCm);
}


async function calcularPrecoQuadro(altura_cm, largura_cm, moldurasSelecionadas, materiaisSelecionados, espessuraPaspaturCm, limpezaSelecionada, db) {
    let valorTotal = 0;
    const detalhes = [];

    // --- CORREÇÃO IMPORTANTE ADICIONADA AQUI ---
    // 1. Calcula o perímetro inicial
    let perimetro_m = ((altura_cm / 100) + (largura_cm / 100)) * 2;
    let alturaExterna_m = altura_cm / 100;
    let larguraExterna_m = largura_cm / 100;

    // 2. Se houver paspatur, ATUALIZA o perímetro e as dimensões externas
    //    Esta lógica estava faltando e causava o erro no cálculo das molduras.
    if (materiaisSelecionados.includes('Paspatur') && espessuraPaspaturCm > 0) {
        alturaExterna_m += (espessuraPaspaturCm / 100) * 2;
        larguraExterna_m += (espessuraPaspaturCm / 100) * 2;
        perimetro_m = (alturaExterna_m + larguraExterna_m) * 2;
    }
    // --- FIM DA CORREÇÃO ---

    const getMaterialPrice = async (nome) => {
        const [rows] = await db.execute('SELECT valor_base FROM Materiais WHERE nome = ?', [nome]);
        return rows.length > 0 ? parseFloat(rows[0].valor_base) : 0;
    };
    
    // Calcula o preço dos materiais (Vidro, Fundo, etc.)
    const area_m2 = (altura_cm / 100) * (largura_cm / 100);
    for (const materialNome of materiaisSelecionados) {
        if (materialNome.toLowerCase() !== 'paspatur' && materialNome.toLowerCase() !== 'sarrafo') {
            const materialPrice = await getMaterialPrice(materialNome);
            if (materialPrice > 0) {
                const valorMaterial = area_m2 * materialPrice;
                valorTotal += valorMaterial;
                detalhes.push(`${materialNome}: R$ ${valorMaterial.toFixed(2)}`);
            }
        }
    }

    // Calcula Sarrafo (baseado no perímetro INTERNO, o que está correto)
    if (materiaisSelecionados.includes('Sarrafo')) {
        const sarrafoPrice = await getMaterialPrice('Sarrafo');
        if (sarrafoPrice > 0) {
            const perimetroInterno_m = ((altura_cm / 100) + (largura_cm / 100)) * 2;
            const valorSarrafo = perimetroInterno_m * sarrafoPrice;
            valorTotal += valorSarrafo;
            detalhes.push(`Sarrafo: R$ ${valorSarrafo.toFixed(2)}`);
        }
    }
    
    // Calcula Paspatur (lógica específica)
    if (materiaisSelecionados.includes('Paspatur') && espessuraPaspaturCm > 0) {
        const valorPaspatur = await getMaterialPrice('Paspatur');
        if (valorPaspatur > 0) {
            const areaTotalComPaspatur = alturaExterna_m * larguraExterna_m;
            const valorMaterial = areaTotalComPaspatur * valorPaspatur;
            valorTotal += valorMaterial;
            detalhes.push(`Paspatur (${espessuraPaspaturCm}cm): R$ ${valorMaterial.toFixed(2)}`);
        }
    }

    // Calcula o preço das molduras (agora usando o perímetro CORRETO)
    if (moldurasSelecionadas && moldurasSelecionadas.length > 0) {
        for (const molduraNome of moldurasSelecionadas) {
            const [rows] = await db.execute('SELECT valor_metro_linear FROM Molduras WHERE nome = ? OR codigo = ?', [molduraNome, molduraNome]);
            if (rows.length > 0) {
                const molduraPrice = parseFloat(rows[0].valor_metro_linear);
                const valorMoldura = perimetro_m * molduraPrice;
                valorTotal += valorMoldura;
                detalhes.push(`Moldura (${molduraNome}): R$ ${valorMoldura.toFixed(2)}`);
            }
        }
    }

    // Adiciona valor da Limpeza (se houver)
    if (limpezaSelecionada) {
        const valorLimpeza = 10.00; // Valor fixo para limpeza
        valorTotal += valorLimpeza;
        detalhes.push(`Limpeza: R$ ${valorLimpeza.toFixed(2)}`);
    }

    return { total: valorTotal, detalhes };
}

module.exports = {
    arredondarParaCinco,
    cmParaMetro,
    calcularMetroLinear,
    calcularMetroQuadrado,
    calcularAreaPaspatur,
    calcularPrecoQuadro
};