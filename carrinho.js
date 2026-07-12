let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
let etapaAtual = 1;
let pedidoEnviado = false;

const TAXA_OUTROS_BAIRROS = 10;
const MINIMO_FRETE_GRATIS = 30;
const MINIMO_FRETE_GRATIS_OUTROS = 50;

const tabelaTaxas = {
    "Centro": 5,
    "Praia": 5,
    "Vila Nova": 5,
    "Balneário": 5,
    "Outros": TAXA_OUTROS_BAIRROS
};

document.addEventListener('DOMContentLoaded', () => {
    renderizarItensCarrinho();
    recuperarEnderecoSalvo();
    atualizarStepper(1);
    atualizarResumoFinanceiro();
});

function atualizarStepper(etapa) {
    for (let i = 1; i <= 3; i++) {
        const circle = document.getElementById(`step-circle-${i}`);
        const label = document.getElementById(`step-label-${i}`);
        if (i < etapa) {
            circle.className = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-emerald-600 border-emerald-600 text-white";
            circle.innerHTML = '<i class="fas fa-check text-xs"></i>';
            label.className = "text-xs font-semibold text-emerald-600";
        } else if (i === etapa) {
            circle.className = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-red-700 border-red-700 text-white";
            const icons = ['fa-shopping-basket', 'fa-map-marker-alt', 'fa-check'];
            circle.innerHTML = `<i class="fas ${icons[i - 1]} text-xs"></i>`;
            label.className = "text-xs font-semibold text-red-700";
        } else {
            circle.className = "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 bg-white border-gray-300 text-gray-400";
            const icons = ['fa-shopping-basket', 'fa-map-marker-alt', 'fa-check'];
            circle.innerHTML = `<i class="fas ${icons[i - 1]} text-xs"></i>`;
            label.className = "text-xs font-semibold text-gray-400";
        }
    }
    for (let i = 1; i <= 2; i++) {
        const line = document.getElementById(`step-line-${i}`);
        line.style.background = i < etapa ? '#059669' : '#fee2e2';
    }
}

function irParaEtapa(destino) {
    if (destino === 2 && !validarEtapa1()) return;
    if (destino === 3 && !validarEtapa2()) return;
    if (destino === 3) preencherResSummary();

    document.getElementById(`etapa-${etapaAtual}`).classList.add('hidden');
    document.getElementById(`etapa-${destino}`).classList.remove('hidden');
    etapaAtual = destino;
    atualizarStepper(destino);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validarEtapa1() {
    if (carrinho.length === 0) {
        alert("Seu carrinho está vazio! Adicione produtos antes de continuar.");
        return false;
    }
    return true;
}

function validarEtapa2() {
    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
    const ref = document.getElementById('referencia').value.trim();
    const bairroOutro = document.getElementById('bairroOutro').value.trim();

    if (!nome || !rua || !num || !bairro || !ref) {
        alert("Por favor, preencha todos os campos: Nome, Rua, Número, Bairro e Ponto de Referência.");
        return false;
    }

    if (bairro === 'Outros') {
        if (!bairroOutro) {
            alert("Digite o bairro para continuar.");
            return false;
        }
        const confirma = document.getElementById('confirmaOutrosBairros').value;
        if (confirma !== 'sim') {
            alert("Para continuar com entrega em outro bairro, confirme que aceita as condições.");
            return false;
        }
    }

    const pag = document.getElementById('pagamento').value;
    if (pag === 'Dinheiro') {
        const trocoValor = document.getElementById('troco').value.trim();
        if (trocoValor) {
            const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
            const taxa = calcularTaxa(bairro, subtotal);
            const total = subtotal + taxa;
            const trocoNum = parseFloat(trocoValor.replace(',', '.'));
            if (!isNaN(trocoNum) && trocoNum < total) {
                alert(`O valor do troco (R$ ${trocoNum.toFixed(2).replace('.', ',')}) é menor que o total do pedido (R$ ${total.toFixed(2).replace('.', ',')}). Por favor, corrija.`);
                return false;
            }
        }
    }

    return true;
}

function renderizarItensCarrinho() {
    const listaItens = document.getElementById('listaItens');

    if (carrinho.length === 0) {
        listaItens.innerHTML = `
            <div class="text-center py-8 text-gray-400">
                <i class="fas fa-shopping-cart text-3xl mb-2"></i>
                <p>Seu carrinho está vazio.</p>
                <a href="index.html" class="text-red-600 hover:underline font-semibold text-xs inline-block mt-2">Voltar para escolher produtos</a>
            </div>`;
        atualizarResumoFinanceiro();
        document.getElementById('btnAvancarEtapa1').disabled = true;
        return;
    }

    document.getElementById('btnAvancarEtapa1').disabled = false;

    listaItens.innerHTML = carrinho.map(item => {
        const totalItem = item.preco * item.qtd;
        return `
            <div class="flex justify-between items-center py-3">
                <div class="pr-2">
                    <p class="font-semibold text-gray-800">${item.nome}</p>
                    <p class="text-xs text-gray-400">${item.qtd}x R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                </div>
                <div class="flex items-center gap-3 shrink-0">
                    <span class="font-bold text-red-800">R$ ${totalItem.toFixed(2).replace('.', ',')}</span>
                    <button onclick="removerItemCarrinho('${item.nome}')" class="text-red-400 hover:text-red-600 transition text-xs p-1">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>`;
    }).join('');

    atualizarResumoFinanceiro();
}

function atualizarResumoFinanceiro() {
    const labelProdutos = document.getElementById('valorProdutos');
    const labelTotalGeral = document.getElementById('valorTotalGeral');
    const banner = document.getElementById('bannerFrete');
    const mensagemFreteOutros = document.getElementById('mensagemFreteOutros');

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    labelProdutos.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    labelTotalGeral.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    const bairroSelecionado = document.getElementById('bairro')?.value || '';

    if (mensagemFreteOutros) {
        if (subtotal >= MINIMO_FRETE_GRATIS_OUTROS) {
            mensagemFreteOutros.innerHTML = `🎉 <strong>Parabéns! Você atingiu o valor mínimo para frete grátis!</strong>`;
            mensagemFreteOutros.className = "text-emerald-700 font-bold list-none -ml-5";
        } else {
            const faltamOutros = (MINIMO_FRETE_GRATIS_OUTROS - subtotal).toFixed(2).replace('.', ',');
            mensagemFreteOutros.innerHTML = `⚠️ Faltam <strong>R$ ${faltamOutros}</strong> para o frete grátis!`;
            mensagemFreteOutros.className = "text-amber-900 font-bold list-none -ml-5";
        }
    }

    if (!bairroSelecionado) {
        banner.classList.add('hidden');
        return;
    }

    if (bairroSelecionado === 'Outros') {
        const freteGratisOutros = subtotal >= MINIMO_FRETE_GRATIS_OUTROS;
        if (freteGratisOutros) {
            banner.className = "flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3";
            banner.innerHTML = `<i class="fas fa-check-circle text-emerald-500"></i><span>🎉 <strong>Parabéns! Você atingiu o valor mínimo para frete grátis!</strong></span>`;
        } else {
            const faltamOutros = (MINIMO_FRETE_GRATIS_OUTROS - subtotal).toFixed(2).replace('.', ',');
            banner.className = "flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3";
            banner.innerHTML = `<i class="fas fa-truck text-amber-500"></i><span>Faltam <strong>R$ ${faltamOutros}</strong> para conseguir frete grátis em Outros Bairros!</span>`;
        }
        banner.classList.remove('hidden');
        return;
    }

    const freteGratis = subtotal >= MINIMO_FRETE_GRATIS;

    if (freteGratis) {
        banner.className = "flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mb-3";
        banner.innerHTML = `<i class="fas fa-check-circle text-emerald-500"></i><span>🎉 <strong>Parabéns! Você atingiu o valor mínimo para frete grátis!</strong></span>`;
    } else {
        const faltam = (MINIMO_FRETE_GRATIS - subtotal).toFixed(2).replace('.', ',');
        banner.className = "flex items-center gap-2 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mb-3";
        banner.innerHTML = `<i class="fas fa-truck text-amber-500"></i><span>Faltam <strong>R$ ${faltam}</strong> para conseguir frete grátis!</span>`;
    }
    banner.classList.remove('hidden');
}

function removerItemCarrinho(nomeDoProduto) {
    carrinho = carrinho.filter(item => item.nome !== nomeDoProduto);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    renderizarItensCarrinho();
}

function onBairroChange() {
    const bairro = document.getElementById('bairro').value;
    const aviso = document.getElementById('avisoOutrosBairros');
    const campoOutro = document.getElementById('campoOutroBairro');

    if (bairro === 'Outros') {
        aviso.classList.remove('hidden');
        campoOutro.classList.remove('hidden');
    } else {
        aviso.classList.add('hidden');
        campoOutro.classList.add('hidden');
        document.getElementById('bairroOutro').value = '';
        document.getElementById('confirmaOutrosBairros').value = '';
    }

    atualizarBotaoEtapa2();
    atualizarResumoFinanceiro();
}

function atualizarBotaoEtapa2() {
    const bairro = document.getElementById('bairro').value;
    const btn = document.getElementById('btnAvancarEtapa2');

    if (bairro === 'Outros') {
        const confirma = document.getElementById('confirmaOutrosBairros').value;
        btn.disabled = confirma !== 'sim';
        btn.classList.toggle('opacity-40', confirma !== 'sim');
        btn.classList.toggle('cursor-not-allowed', confirma !== 'sim');
    } else {
        btn.disabled = false;
        btn.classList.remove('opacity-40', 'cursor-not-allowed');
    }

    atualizarResumoFinanceiro();
}

function verificarPagamento() {
    const pag = document.getElementById('pagamento').value;
    const containerTroco = document.getElementById('containerTroco');
    containerTroco.classList.toggle('hidden', pag !== 'Dinheiro');
}

function salvarDadosEndereco(nome, rua, numero, bairro, referencia, bairroOutro) {
    localStorage.setItem('endereco_cliente', JSON.stringify({ nome, rua, numero, bairro, referencia, bairroOutro }));
}

function recuperarEnderecoSalvo() {
    const dados = JSON.parse(localStorage.getItem('endereco_cliente'));
    if (dados) {
        document.getElementById('nomeRecebedor').value = dados.nome || '';
        document.getElementById('rua').value = dados.rua || '';
        document.getElementById('numero').value = dados.numero || '';
        document.getElementById('bairro').value = dados.bairro || '';
        document.getElementById('referencia').value = dados.referencia || '';
        document.getElementById('bairroOutro').value = dados.bairroOutro || '';
        if (dados.bairro === 'Outros') onBairroChange();
    }
}

function calcularTaxa(bairro, subtotal) {
    if (bairro === 'Outros') {
        if (subtotal >= MINIMO_FRETE_GRATIS_OUTROS) return 0;
        return TAXA_OUTROS_BAIRROS;
    }
    if (subtotal >= MINIMO_FRETE_GRATIS) return 0;
    return tabelaTaxas[bairro] || 0;
}

function preencherResSummary() {
    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
    const bairroOutro = document.getElementById('bairroOutro').value.trim();
    const ref = document.getElementById('referencia').value.trim();
    const pag = document.getElementById('pagamento').value;
    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const taxa = calcularTaxa(bairro, subtotal);
    const total = subtotal + taxa;

    document.getElementById('resumoItens').innerHTML = carrinho.map(item => {
        const t = item.preco * item.qtd;
        return `<div class="flex justify-between items-center py-2"><span class="text-gray-700">${item.qtd}x ${item.nome}</span><span class="font-semibold text-red-800">R$ ${t.toFixed(2).replace('.', ',')}</span></div>`;
    }).join('');

    document.getElementById('resumoNome').textContent = nome;
    document.getElementById('resumoEndereco').textContent = `${rua}, Nº ${num}`;
    document.getElementById('resumoBairro').textContent = bairro === 'Outros' ? bairroOutro : bairro;
    document.getElementById('resumoReferencia').textContent = ref;
    document.getElementById('resumoSubtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    const taxaEl = document.getElementById('resumoTaxa');
    const blocoEl = document.getElementById('resumoBlocoTaxa');
    if (taxa === 0) {
        taxaEl.textContent = 'GRÁTIS';
        taxaEl.className = 'text-emerald-600 font-bold';
        blocoEl.className = 'flex justify-between font-medium text-emerald-600';
    } else {
        taxaEl.textContent = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
        taxaEl.className = 'text-gray-800 font-semibold';
        blocoEl.className = 'flex justify-between font-medium text-gray-600';
    }

    document.getElementById('resumoPagamento').textContent = pag;
    document.getElementById('resumoTotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;

    const containerPix = document.getElementById('containerPixDinamico');
    if (pag === 'Pix') {
        containerPix.classList.remove('hidden');
        const codigoCopiaECola = gerarPixCopiaECola('seu_email@email.com', total);
        document.getElementById('codigoPixGerado').value = codigoCopiaECola;
    } else {
        containerPix.classList.add('hidden');
    }
}

function confirmarPedido() {
    if (pedidoEnviado) return;
    pedidoEnviado = true;

    const btnConfirmar = document.querySelector('button[onclick="confirmarPedido()"]');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Abrindo WhatsApp...';
    }

    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
    const bairroOutro = document.getElementById('bairroOutro').value.trim();
    const ref = document.getElementById('referencia').value.trim();
    const pag = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value.trim();

    salvarDadosEndereco(nome, rua, num, bairro, ref, bairroOutro);

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    const taxa = calcularTaxa(bairro, subtotal);
    const total = subtotal + taxa;

    let msg = `🌭 *NOVO PEDIDO - HOT DOG EXPRESS*\n\n`;
    msg += `📋 *ITENS COMPRADOS:*\n`;
    carrinho.forEach(item => {
        const t = item.preco * item.qtd;
        msg += `• ${item.qtd}x ${item.nome} — R$ ${t.toFixed(2).replace('.', ',')}\n`;
    });

    msg += `\n💰 *RESUMO DO PEDIDO:*`;
    msg += `\n• Subtotal Itens: R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    let motivoTaxa;
    if (bairro === 'Outros') {
        if (taxa === 0) {
            motivoTaxa = 'GRÁTIS (Pedido acima de R$ 50)';
        } else {
            motivoTaxa = `R$ ${taxa.toFixed(2).replace('.', ',')} (outro bairro)`;
        }
    } else if (taxa === 0) {
        motivoTaxa = 'GRÁTIS (Pedido acima de R$ 30)';
    } else {
        motivoTaxa = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
    }

    msg += `\n• Taxa de Entrega: ${motivoTaxa}`;
    msg += `\n• *Total Geral: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    msg += `📍 *ENDEREÇO DE ENTREGA:*\n`;
    msg += `👤 Recebedor: ${nome}\n`;
    msg += `🏠 Rua: ${rua}, Nº ${num}\n`;
    msg += `🏘️ Bairro: ${bairro === 'Outros' ? bairroOutro : bairro}\n`;
    msg += `🚩 Referência: ${ref}\n`;
    msg += `\n💳 *FORMA DE PAGAMENTO:*\n• ${pag}`;

    if (pag === 'Dinheiro' && troco) msg += ` (troco para R$ ${troco})`;

    window.open(`https://wa.me/5513996305218?text=${encodeURIComponent(msg)}`, '_blank');

    carrinho = [];
    localStorage.removeItem('carrinho');
}

function gerarPixCopiaECola(chave, valor, txid = 'HOTDOGEXPRESS') {
    const payloadFormatIndicator = '000201';
    const pixGUI = '0014br.gov.bcb.pix';
    const pixKey = `01${chave.length.toString().padStart(2, '0')}${chave}`;
    const tag26Content = `${pixGUI}${pixKey}`;
    const merchantAccountInformation = `26${tag26Content.length.toString().padStart(2, '0')}${tag26Content}`;
    const merchantCategoryCode = '52040000';
    const transactionCurrency = '5303986';
    const transactionAmount = valor > 0 ? `54${valor.toFixed(2).length.toString().padStart(2, '0')}${valor.toFixed(2)}` : '';
    const countryCode = '5802BR';
    const merchantName = '5913Hot Dog Express';
    const merchantCity = '6008Itanhaem';
    const additionalData = `05${txid.length.toString().padStart(2, '0')}${txid}`;
    const additionalDataFieldTemplate = `62${additionalData.length.toString().padStart(2, '0')}${additionalData}`;

    const payload = `${payloadFormatIndicator}${merchantAccountInformation}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${merchantName}${merchantCity}${additionalDataFieldTemplate}6304`;

    let poly = 0x1021;
    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
        crc ^= (payload.charCodeAt(i) << 8);
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = (crc << 1) ^ poly;
            } else {
                crc <<= 1;
            }
        }
        crc &= 0xFFFF;
    }
    const crcHex = (crc >>> 0).toString(16).toUpperCase().padStart(4, '0');
    return `${payload}${crcHex}`;
}

function copiarCodigoPix() {
    const inputPix = document.getElementById('codigoPixGerado');
    inputPix.select();
    inputPix.setSelectionRange(0, 99999);
    document.execCommand('copy');

    const btn = document.getElementById('btnCopiarPix');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
    btn.classList.replace('bg-amber-500', 'bg-emerald-600');
    btn.classList.replace('hover:bg-amber-600', 'hover:bg-emerald-700');

    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.replace('bg-emerald-600', 'bg-amber-500');
        btn.classList.replace('hover:bg-emerald-700', 'hover:bg-amber-600');
    }, 3000);
}
