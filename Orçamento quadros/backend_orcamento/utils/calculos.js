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


// Função principal de cálculo do preço do quadro - ATUALIZADA
async function calcularPrecoQuadro(alturaCm, larguraCm, moldurasSelecionadas, materiaisSelecionados, espessuraPaspaturCm, limpezaSelecionada, dbConnection) {
    let precoTotalQuadro = 0;
    let detalhesCalculo = [];
    let custoLimpeza = 0; // Variável para armazenar o custo da limpeza

    if (isNaN(alturaCm) || isNaN(larguraCm) || alturaCm <= 0 || larguraCm <= 0) {
        throw new Error("Altura e largura do quadro devem ser números positivos.");
    }

    const metroLinearBase = calcularMetroLinear(alturaCm, larguraCm);
    const metroQuadradoBase = calcularMetroQuadrado(alturaCm, larguraCm);

    // 1. Cálculo de Molduras (como antes)
    if (moldurasSelecionadas && moldurasSelecionadas.length > 0) {
        for (const molduraCodigo of moldurasSelecionadas) {
            const [molduraRows] = await dbConnection.execute(
                'SELECT valor_metro_linear FROM Molduras WHERE codigo = ? OR nome = ?', // Permitir buscar por código ou nome (para alumínio)
                [molduraCodigo, molduraCodigo]
            );
            if (molduraRows.length > 0) {
                const valorMolduraPorMetro = molduraRows[0].valor_metro_linear;
                const custoMoldura = valorMolduraPorMetro * metroLinearBase;
                precoTotalQuadro += custoMoldura;
                detalhesCalculo.push(`Moldura (${molduraCodigo}): R$ ${custoMoldura.toFixed(2)}`);
            } else {
                console.warn(`Moldura com código/nome ${molduraCodigo} não encontrada no banco de dados.`);
                detalhesCalculo.push(`Moldura (${molduraCodigo}): NÃO ENCONTRADA!`);
            }
        }
    }

    // 2. Cálculo de Materiais (como antes, mas atenção ao Paspatur)
    if (materiaisSelecionados && materiaisSelecionados.length > 0) {
        for (const materialNome of materiaisSelecionados) {
            const [materialRows] = await dbConnection.execute(
                'SELECT nome, tipo_calculo, valor_base FROM Materiais WHERE nome = ?',
                [materialNome]
            );

            if (materialRows.length > 0) {
                const material = materialRows[0];
                let custoMaterialItem = 0;
                let areaOuPerimetroCalculada;

                if (material.tipo_calculo === 'metro_linear') {
                    areaOuPerimetroCalculada = metroLinearBase;
                    custoMaterialItem = material.valor_base * areaOuPerimetroCalculada;
                } else if (material.tipo_calculo === 'metro_quadrado') {
                    if (material.nome.toLowerCase() === 'paspatur' && espessuraPaspaturCm > 0) { // toLowerCase para robustez
                        areaOuPerimetroCalculada = calcularAreaPaspatur(alturaCm, larguraCm, espessuraPaspaturCm);
                    } else {
                        // Para outros materiais de m², usamos as medidas originais (não arredondadas) para o cálculo da área
                        // Pois o arredondamento já é considerado em calcularMetroQuadrado.
                        // No entanto, a função calcularMetroQuadrado já usa as medidas arredondadas.
                        // Se a intenção é que a área do fundo/vidro seja EXATAMENTE alturaCm * larguraCm (originais) / 10000,
                        // então o cálculo da área aqui deveria ser: (alturaCm * larguraCm) / 10000;
                        // Mas para manter consistência com RF01 que diz que metro quadrado é (altura arredondada * largura arredondada)
                        // mantemos metroQuadradoBase.
                        areaOuPerimetroCalculada = metroQuadradoBase;
                    }
                    custoMaterialItem = material.valor_base * areaOuPerimetroCalculada;
                }
                precoTotalQuadro += custoMaterialItem;
                detalhesCalculo.push(`${material.nome}: R$ ${custoMaterialItem.toFixed(2)}`);
            } else {
                console.warn(`Material ${materialNome} não encontrado no banco de dados.`);
                detalhesCalculo.push(`${materialNome}: NÃO ENCONTRADO!`);
            }
        }
    }

    // 3. Cálculo da Limpeza (NOVO)
    if (limpezaSelecionada) {
        // Usar as medidas *originais* (alturaCm, larguraCm) para o cálculo da área da limpeza,
        // conforme a especificação: "eles vao medir o quadro, vai dar a altura e largura"
        const areaLimpezaCm2 = alturaCm * larguraCm;
        const areaLimpezaM2 = areaLimpezaCm2 / 10000;
        custoLimpeza = areaLimpezaM2 * 150; // R$150,00 por m²
        precoTotalQuadro += custoLimpeza;
        detalhesCalculo.push(`Limpeza: R$ ${custoLimpeza.toFixed(2)}`);
    }

    return {
        total: precoTotalQuadro,
        detalhes: detalhesCalculo,
        alturaArredondadaCm: arredondarParaCinco(alturaCm),
        larguraArredondadaCm: arredondarParaCinco(larguraCm),
        metroLinearFinal: metroLinearBase,
        metroQuadradoFinal: metroQuadradoBase,
        custoLimpezaDetalhe: limpezaSelecionada ? custoLimpeza.toFixed(2) : "0.00" // Para fácil acesso no PDF se necessário
    };
}

module.exports = {
    arredondarParaCinco,
    cmParaMetro,
    calcularMetroLinear,
    calcularMetroQuadrado,
    calcularAreaPaspatur,
    calcularPrecoQuadro
};