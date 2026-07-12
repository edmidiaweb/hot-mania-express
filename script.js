let listaProdutosOriginal = [];
let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
let ordenacao = localStorage.getItem('ordenacao') || 'az';
let _debounceTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    carregarProdutos();
    configurarFiltroPesquisa();
    configurarBuscaMobile();
    atualizarInterfaceCarrinho();
    atualizarUIOrdenacao();
});

// ── Carregamento ──────────────────────────────────────────────────────────────
async function carregarProdutos() {
    try {
        const resposta = await fetch('produtos.json');
        if (!resposta.ok) throw new Error('Falha ao ler arquivo de produtos.');
        listaProdutosOriginal = await resposta.json();
        aplicarFiltros(document.getElementById('searchBarDesktop').value || '');
    } catch (erro) {
        console.error(erro);
        document.getElementById('gridProdutos').innerHTML = `
            <div class="col-span-full text-center py-12 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Erro ao carregar o cardápio. Certifique-se de usar um servidor local (Live Server).</p>
            </div>
        `;
    }
}

// ── Ordenação ─────────────────────────────────────────────────────────────────
function definirOrdenacao(modo) {
    ordenacao = modo;
    localStorage.setItem('ordenacao', modo);
    atualizarUIOrdenacao();
    aplicarFiltros(document.getElementById('searchBarDesktop').value || '');
}

function atualizarUIOrdenacao() {
    ['az', 'menor', 'maior'].forEach(modo => {
        const btn = document.getElementById(`ord-${modo}`);
        if (!btn) return;
        if (modo === ordenacao) {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-red-600 text-white transition';
        } else {
            btn.className = 'px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition';
        }
    });
}

// ── Utilitários ───────────────────────────────────────────────────────────────
function obterPreco(item) {
    const raw = item["Valor de venda (R$)"] !== undefined ? item["Valor de venda (R$)"] : item["Valor de venda"];
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
}

function normalizarTexto(texto) {
    return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function obterProdutosBase() {
    let produtos = [...listaProdutosOriginal];

    if (ordenacao === 'az') {
        produtos.sort((a, b) => a.Produto.localeCompare(b.Produto, 'pt-BR'));
    } else if (ordenacao === 'menor') {
        produtos.sort((a, b) => obterPreco(a) - obterPreco(b));
    } else if (ordenacao === 'maior') {
        produtos.sort((a, b) => obterPreco(b) - obterPreco(a));
    }
    return produtos;
}

// ── Pesquisa ──────────────────────────────────────────────────────────────────
function obterCamposPesquisa() {
    return Array.from(document.querySelectorAll('[data-search-input]'));
}

function obterBotoesLimpar() {
    return Array.from(document.querySelectorAll('[data-clear-search]'));
}

function sincronizarCamposPesquisa(valor, campoOrigem = null) {
    obterCamposPesquisa().forEach(input => {
        if (input !== campoOrigem) input.value = valor;
    });
}

function atualizarBotoesLimpar(valor) {
    const deveExibir = valor.trim().length > 0;
    obterBotoesLimpar().forEach(botao => botao.classList.toggle('hidden', !deveExibir));
}

function configurarFiltroPesquisa() {
    obterCamposPesquisa().forEach(searchBar => {
        searchBar.addEventListener('input', (e) => {
            const valor = e.target.value;
            sincronizarCamposPesquisa(valor, e.target);
            atualizarBotoesLimpar(valor);
            clearTimeout(_debounceTimer);
            _debounceTimer = setTimeout(() => aplicarFiltros(valor), 200);
        });
    });

    obterBotoesLimpar().forEach(botao => {
        botao.addEventListener('click', () => limparPesquisa(botao.getAttribute('data-target-input')));
    });
}

function configurarBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    if (toggle) toggle.addEventListener('click', alternarBuscaMobile);
}

function abrirBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    const container = document.getElementById('mobileSearchContainer');
    const mobileInput = document.getElementById('searchBarMobile');
    if (!toggle || !container || !mobileInput) return;
    container.classList.remove('hidden');
    toggle.classList.remove('bg-white', 'border', 'border-red-100', 'text-red-700', 'hover:bg-red-50');
    toggle.classList.add('bg-red-600', 'text-white');
    setTimeout(() => mobileInput.focus(), 50);
}

function fecharBuscaMobile() {
    const toggle = document.getElementById('mobileSearchToggle');
    const container = document.getElementById('mobileSearchContainer');
    const mobileInput = document.getElementById('searchBarMobile');
    if (!toggle || !container || !mobileInput) return;
    container.classList.add('hidden');
    toggle.classList.remove('bg-red-600', 'text-white');
    toggle.classList.add('bg-white', 'border', 'border-red-100', 'text-red-700', 'hover:bg-red-50');
    mobileInput.blur();
}

function alternarBuscaMobile() {
    const container = document.getElementById('mobileSearchContainer');
    if (!container) return;
    container.classList.contains('hidden') ? abrirBuscaMobile() : fecharBuscaMobile();
}

function aplicarFiltros(termo = '') {
    const termoBuscado = normalizarTexto(termo.trim());
    let produtosFiltrados = obterProdutosBase();

    if (termoBuscado) {
        produtosFiltrados = produtosFiltrados.filter(item =>
            normalizarTexto(item.Produto).includes(termoBuscado)
        );
        produtosFiltrados.sort((a, b) => {
            const aComeca = normalizarTexto(a.Produto).startsWith(termoBuscado) ? 1 : 0;
            const bComeca = normalizarTexto(b.Produto).startsWith(termoBuscado) ? 1 : 0;
            return bComeca - aComeca;
        });
    }

    renderizarProdutos(produtosFiltrados, termoBuscado);
}

function limparPesquisa(inputIdParaFoco = 'searchBarDesktop') {
    sincronizarCamposPesquisa('');
    atualizarBotoesLimpar('');
    aplicarFiltros('');
    const input = document.getElementById(inputIdParaFoco);
    if (input && !input.closest('.hidden')) input.focus();
}

// ── Renderização ──────────────────────────────────────────────────────────────
function renderizarProdutos(produtos, termoBuscado = '') {
    const grid = document.getElementById('gridProdutos');
    grid.innerHTML = '';

    if (termoBuscado) {
        const contador = document.createElement('div');
        contador.className = 'col-span-full mb-1';
        const label = `<span class="font-bold text-red-700">${produtos.length}</span> produto${produtos.length !== 1 ? 's' : ''} encontrado${produtos.length !== 1 ? 's' : ''} para <span class="font-bold text-red-700">"${termoBuscado}"</span>`;
        contador.innerHTML = `<p class="text-xs text-gray-500">${label}</p>`;
        grid.appendChild(contador);
    }

    if (produtos.length === 0) {
        grid.innerHTML += `
            <div class="col-span-full text-center py-14 text-gray-400 flex flex-col items-center gap-3">
                <i class="fas fa-search text-4xl text-red-200"></i>
                <p class="font-semibold text-gray-500">Nenhum produto encontrado</p>
                <p class="text-xs text-gray-400">${termoBuscado ? `Nenhum resultado para "${termoBuscado}"` : 'O cardápio está vazio.'}</p>
                ${termoBuscado ? `<button onclick="limparPesquisa()" class="mt-1 px-5 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition">Limpar busca</button>` : ''}
            </div>
        `;
        return;
    }

    produtos.forEach((item, idx) => {
        const preco = obterPreco(item);
        const itemNoCarrinho = carrinho.find(c => c.nome === item.Produto);
        const qtd = itemNoCarrinho ? itemNoCarrinho.qtd : 0;
        const wrapId = `wrap-img-${idx}`;
        const btnId  = `btn-container-${idx}`;

        const estoqueDisponivel = item.Estoque !== undefined ? parseInt(item.Estoque) : 0;
        const estaEsgotado = estoqueDisponivel <= 0;

        const card = document.createElement('div');
        card.className = `bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition duration-200 ${estaEsgotado ? 'opacity-60 select-none' : ''}`;
        card.innerHTML = `
            <div>
                <div id="${wrapId}"
                     class="w-full h-32 bg-red-50 rounded-xl overflow-hidden flex items-center justify-center cursor-zoom-in select-none"
                     data-nome="${item.Produto.replace(/"/g, '&quot;')}"
                     onclick="abrirLightbox(this)">
                    <i class="fas fa-spinner fa-spin text-red-300 text-xl pointer-events-none"></i>
                </div>
                <h3 class="text-xs font-bold text-gray-700 mt-2 line-clamp-2 uppercase h-8">${item.Produto}</h3>
                
                <p class="text-[10px] font-bold mt-1 ${estaEsgotado ? 'text-red-500' : 'text-emerald-600'}">
                    ${estaEsgotado ? '<i class="fas fa-times-circle"></i> ESGOTADO' : `<i class="fas fa-boxes"></i> DISPONÍVEL: ${estoqueDisponivel} un`}
                </p>
            </div>
            <div class="mt-2">
                <p class="text-red-900 font-extrabold text-base">R$ ${preco.toFixed(2).replace('.', ',')}</p>
                <div class="mt-2" id="${btnId}">
                    ${renderizarBotaoAcao(item.Produto, preco, qtd, btnId, estoqueDisponivel)}
                </div>
            </div>
        `;
        grid.appendChild(card);
        carregarImagemCard(wrapId, item.imagem || null, item.Produto, item.Categoria || '', btnId);
    });
}

// ── Botões de ação ────────────────────────────────────────────────────────────
function renderizarBotaoAcao(nome, preco, qtd, btnId = '', estoqueDisponivel = 0) {
    const nomeEsc = nome.replace(/'/g, "\\'");
    
    if (estoqueDisponivel <= 0) {
        return `
            <button disabled 
                class="w-full bg-gray-200 text-gray-400 text-xs font-bold py-2 px-3 rounded-xl cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs">
                <i class="fas fa-box-open text-[10px]"></i> Indisponível
            </button>
        `;
    }

    if (qtd > 0) {
        return `
            <div class="flex items-center justify-between bg-red-50 rounded-xl p-1 border border-red-200">
                <button onclick="alterarQuantidade('${nomeEsc}', ${preco}, -1, '${btnId}')" aria-label="Diminuir quantidade"
                    class="w-8 h-8 flex items-center justify-center bg-white text-red-900 rounded-lg shadow-xs hover:bg-red-100 font-bold transition">-</button>
                <span class="font-bold text-sm text-red-950">${qtd}</span>
                <button onclick="alterarQuantidade('${nomeEsc}', ${preco}, 1, '${btnId}')" aria-label="Aumentar quantidade"
                    class="w-8 h-8 flex items-center justify-center bg-white text-red-900 rounded-lg shadow-xs hover:bg-red-100 font-bold transition">+</button>
            </div>
        `;
    }
    return `
        <button onclick="alterarQuantidade('${nomeEsc}', ${preco}, 1, '${btnId}')"
            class="btn-adicionar w-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs">
            <i class="fas fa-plus text-[10px]"></i> Adicionar
        </button>
    `;
}

function alterarQuantidade(nome, preco, alterar, btnId) {
    const produtoBase = listaProdutosOriginal.find(item => item.Produto === nome);
    const estoqueMaximo = produtoBase && produtoBase.Estoque !== undefined ? parseInt(produtoBase.Estoque) : 0;

    const index = carrinho.findIndex(item => item.nome === nome);
    let qtdAtualNoCarrinho = index > -1 ? carrinho[index].qtd : 0;

    if (alterar > 0 && (qtdAtualNoCarrinho + alterar) > estoqueMaximo) {
        alert(`Atenção: Só existem ${estoqueMaximo} unidades em stock para este produto.`);
        return;
    }

    if (index > -1) {
        carrinho[index].qtd += alterar;
        if (carrinho[index].qtd <= 0) carrinho.splice(index, 1);
    } else if (alterar > 0) {
        carrinho.push({ nome, preco, qtd: 1 });
    }
    localStorage.setItem('carrinho', JSON.stringify(carrinho));

    const container = document.getElementById(btnId);
    const itemAtualizado = carrinho.find(item => item.nome === nome);
    const novaQtd = itemAtualizado ? itemAtualizado.qtd : 0;

    if (container) {
        if (alterar > 0 && novaQtd === 1) {
            container.innerHTML = `
                <div class="w-full bg-green-500 text-white text-xs font-bold py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs">
                    <i class="fas fa-check text-[10px]"></i> Adicionado!
                </div>
            `;
            setTimeout(() => {
                container.innerHTML = renderizarBotaoAcao(nome, preco, novaQtd, btnId, estoqueMaximo);
            }, 700);
        } else {
            container.innerHTML = renderizarBotaoAcao(nome, preco, novaQtd, btnId, estoqueMaximo);
        }
    }
    atualizarInterfaceCarrinho();
}

function atualizarInterfaceCarrinho() {
    const badge = document.getElementById('badgeCarrinho');
    const barraMobile = document.getElementById('barraFixaMobile');
    const labelQtdMobile = document.getElementById('qtdItensMobile');
    const totalInferior = document.getElementById('totalFixInferior');

    const totalItens = carrinho.reduce((acc, item) => acc + item.qtd, 0);
    const valorTotal = carrinho.reduce((acc, item) => acc + (item.qtd * item.preco), 0);

    if (badge) {
        badge.innerText = totalItens;
        badge.classList.toggle('hidden', totalItens === 0);
    }

    if (barraMobile) {
        barraMobile.classList.toggle('hidden', totalItens === 0);
    }

    if (labelQtdMobile) {
        labelQtdMobile.innerText = totalItens;
    }

    if (totalInferior) {
        totalInferior.innerText = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
    }
}

// ── Carregamento de imagens ───────────────────────────────────────────────────
function carregarImagemCard(wrapId, imagemUrl, nomeProduto, categoria, btnId) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    if (imagemUrl) {
        const img = new Image();
        img.onload = () => {
            wrap.innerHTML = '';
            wrap.appendChild(img);
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
        };
        img.onerror = () => {
            gerarImagemCanvas(wrap, nomeProduto, categoria);
        };
        img.src = imagemUrl;
    } else {
        gerarImagemCanvas(wrap, nomeProduto, categoria);
    }
}

function gerarImagemCanvas(wrap, nomeProduto, categoria) {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    const cores = {
        'Tradicionais': '#dc2626',
        'Especiais': '#ea580c',
        'Bebidas': '#0891b2'
    };

    const cor = cores[categoria] || '#dc2626';
    ctx.fillStyle = cor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌭', canvas.width / 2, canvas.height / 2 - 20);

    ctx.font = '12px Arial';
    ctx.fillText(nomeProduto, canvas.width / 2, canvas.height / 2 + 40);

    wrap.innerHTML = '';
    wrap.appendChild(canvas);
}

function abrirLightbox(elemento) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxNome = document.getElementById('lightboxNome');
    const nome = elemento.getAttribute('data-nome');

    if (elemento.querySelector('img')) {
        lightboxImg.src = elemento.querySelector('img').src;
    } else if (elemento.querySelector('canvas')) {
        lightboxImg.src = elemento.querySelector('canvas').toDataURL();
    }

    lightboxNome.textContent = nome;
    lightbox.classList.remove('hidden');
    lightbox.classList.add('flex');
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', fecharLightboxComTecla);
}

function fecharLightbox() {
    const lightbox = document.getElementById('lightbox');
    lightbox.classList.add('hidden');
    lightbox.classList.remove('flex');
    document.body.style.overflow = 'auto';
    document.removeEventListener('keydown', fecharLightboxComTecla);
}

function fecharLightboxComTecla(e) {
    if (e.key === 'Escape') fecharLightbox();
}
