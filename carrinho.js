let carrinho = JSON.parse(localStorage.getItem('carrinho') || '[]');
let etapaAtual = 1;
let pedidoEnviado = false;

const tabelaTaxas = {
    "Belas Artes": 5,
    "Praia do Sonho": 5,
    "Cibratel (até a AV São Paulo)": 5,
    "Corumbá": 5,
    "Ieda": 5,
    "Sabaúna": 6,
    "Guapiranga": 6,
    "Umuarama": 6,
    "América": 6
};

document.addEventListener('DOMContentLoaded', () => {
    renderizarItensCarrinho();
    recuperarEnderecoSalvo();
    atualizarStepper(1);
    atualizarResumoFinanceiro();
    verificarPagamento();
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

    if (!nome || !rua || !num || !bairro || !ref) {
        alert("Por favor, preencha todos os campos: Nome, Rua, Número, Bairro e Ponto de Referência.");
        return false;
    }

    const pag = document.getElementById('pagamento').value;
    if (pag === 'Dinheiro') {
        const trocoValor = document.getElementById('troco').value.trim();

        if (!trocoValor) {
            alert("Por favor, informe para quanto precisa de troco.");
            return false;
        }

        const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
        const taxa = calcularTaxa(bairro, subtotal);
        const total = subtotal + taxa;
        const trocoNum = parseFloat(trocoValor.replace(',', '.'));

        if (isNaN(trocoNum)) {
            alert("Por favor, informe um valor de troco válido.");
            return false;
        }

        if (trocoNum < total) {
            alert(`O valor do troco (R$ ${trocoNum.toFixed(2).replace('.', ',')}) é menor que o total do pedido (R$ ${total.toFixed(2).replace('.', ',')}). Por favor, corrija.`);
            return false;
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

    const subtotal = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
    labelProdutos.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    labelTotalGeral.innerText = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;
}

function removerItemCarrinho(nomeDoProduto) {
    carrinho = carrinho.filter(item => item.nome !== nomeDoProduto);
    localStorage.setItem('carrinho', JSON.stringify(carrinho));
    renderizarItensCarrinho();
}

function verificarPagamento() {
    const pag = document.getElementById('pagamento').value;
    const containerTroco = document.getElementById('containerTroco');
    containerTroco.classList.toggle('hidden', pag !== 'Dinheiro');
}

function salvarDadosEndereco(nome, rua, numero, bairro, referencia) {
    localStorage.setItem('endereco_cliente', JSON.stringify({ nome, rua, numero, bairro, referencia }));
}

function recuperarEnderecoSalvo() {
    const dados = JSON.parse(localStorage.getItem('endereco_cliente'));
    if (dados) {
        document.getElementById('nomeRecebedor').value = dados.nome || '';
        document.getElementById('rua').value = dados.rua || '';
        document.getElementById('numero').value = dados.numero || '';
        document.getElementById('bairro').value = dados.bairro || '';
        document.getElementById('referencia').value = dados.referencia || '';
    }
}

function calcularTaxa(bairro, subtotal) {
    return tabelaTaxas[bairro] || 0;
}

function preencherResSummary() {
    const nome = document.getElementById('nomeRecebedor').value.trim();
    const rua = document.getElementById('rua').value.trim();
    const num = document.getElementById('numero').value.trim();
    const bairro = document.getElementById('bairro').value;
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
    document.getElementById('resumoBairro').textContent = bairro;
    document.getElementById('resumoReferencia').textContent = ref;
    document.getElementById('resumoSubtotal').textContent = `R$ ${subtotal.toFixed(2).replace('.', ',')}`;

    const taxaEl = document.getElementById('resumoTaxa');
    const blocoEl = document.getElementById('resumoBlocoTaxa');
    taxaEl.textContent = `R$ ${taxa.toFixed(2).replace('.', ',')}`;
    taxaEl.className = 'text-gray-800 font-semibold';
    blocoEl.className = 'flex justify-between font-medium text-gray-600';

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
    const ref = document.getElementById('referencia').value.trim();
    const pag = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value.trim();

    salvarDadosEndereco(nome, rua, num, bairro, ref);

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

    let motivoTaxa = `R$ ${taxa.toFixed(2).replace('.', ',')}`;

    msg += `\n• Taxa de Entrega: ${motivoTaxa}`;
    msg += `\n• *Total Geral: R$ ${total.toFixed(2).replace('.', ',')}*\n\n`;
    msg += `📍 *ENDEREÇO DE ENTREGA:*\n`;
    msg += `👤 Recebedor: ${nome}\n`;
    msg += `🏠 Rua: ${rua}, Nº ${num}\n`;
    msg += `🏘️ Bairro: ${bairro}\n`;
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