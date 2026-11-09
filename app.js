/* Diagnóstico de marca · formulário em etapas.
   Perguntas: perguntas.js (gerado de perguntas.json pelo build.py). Envio: config.js > endpoint. */
(function () {
  'use strict';

  var D = window.PERGUNTAS;
  var CFG = window.DIAGNOSTICO_CONFIG || {};
  var CHAVE = 'diagnostico-marca-v1';
  var OUTRO = '__outro';
  var BLOCOS = D.blocos;
  var REVISAO = BLOCOS.length + 1;
  var FIM = BLOCOS.length + 2;
  var app = document.getElementById('app');
  var barra = document.getElementById('barra');
  var statusTopo = document.getElementById('status-topo');

  var estado = carregar() || { passo: 0, nome: '', email: '', aceite: false, r: {}, inicio: Date.now() };

  function carregar() {
    try { var s = localStorage.getItem(CHAVE); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function salvar() {
    try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* sem armazenamento: segue sem rascunho */ }
  }
  function limpar() {
    try { localStorage.removeItem(CHAVE); } catch (e) {}
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function obrig(p) { return p.obrigatoria !== false; }
  function n2(n) { return (n < 10 ? '0' : '') + n; }

  // numera as perguntas de 1 a 60
  var TODAS = [];
  BLOCOS.forEach(function (b) { b.perguntas.forEach(function (p) { p.n = TODAS.length + 1; p.bloco = b; TODAS.push(p); }); });

  function instrucao(p) {
    if (p.tipo === 'unica') return 'Marque uma';
    if (p.tipo === 'multipla') return p.max ? 'Marque até ' + p.max : 'Marque todas que se aplicam';
    if (p.tipo === 'grade') return 'Um ponto por linha';
    return p.tipo === 'curta' ? 'Resposta curta' : 'Resposta livre';
  }

  /* ---------- render ---------- */

  function render() {
    var passo = estado.passo;
    if (passo === 0) renderCapa();
    else if (passo <= BLOCOS.length) renderBloco(BLOCOS[passo - 1], passo);
    else if (passo === REVISAO) renderRevisao();
    else renderFim();
    var pct = passo === 0 ? 0 : Math.min(100, Math.round((Math.min(passo, REVISAO) / REVISAO) * 100));
    barra.style.width = pct + '%';
    statusTopo.textContent = passo === 0 ? 'Diagnóstico de marca'
      : passo <= BLOCOS.length ? 'Bloco ' + passo + ' de ' + BLOCOS.length
      : passo === REVISAO ? 'Revisão' : 'Enviado';
  }

  function irPara(p) {
    estado.passo = p;
    salvar();
    render();
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  function renderCapa() {
    var retomando = Object.keys(estado.r).length > 0;
    app.innerHTML =
      '<section class="capa"><div class="wrap">' +
        '<span class="tag">Diagnóstico de marca · ' + TODAS.length + ' perguntas · 40 a 60 min</span>' +
        '<h1 class="d">diagnóstico de marca</h1>' +
        '<p class="tese">Antes do logo, a planta.</p>' +
        '<p class="intro">' + esc(D.intro) + '</p>' +
        '<div class="fatos"><span class="tag">10 blocos</span><span class="tag">Salva sozinho neste navegador</span><span class="tag">Sempre existe a opção "Outro"</span></div>' +
      '</div></section>' +
      '<div class="wrap"><form class="cartao" id="form-id" novalidate>' +
        '<h2 class="d">' + (retomando ? 'continuar de onde parou' : 'para começar') + '</h2>' +
        '<p>Seu nome e e-mail servem para eu identificar e organizar as suas respostas. Não uso para mais nada.</p>' +
        '<div class="linha-campos">' +
          '<div class="campo"><label for="nome">Nome completo</label><input type="text" id="nome" name="nome" autocomplete="name" required maxlength="120" value="' + esc(estado.nome) + '"></div>' +
          '<div class="campo"><label for="email">E-mail</label><input type="email" id="email" name="email" autocomplete="email" inputmode="email" required maxlength="160" value="' + esc(estado.email) + '"></div>' +
        '</div>' +
        '<label class="consent opcao" style="background:none;border:0;padding:0"><input type="checkbox" id="aceite"' + (estado.aceite ? ' checked' : '') + '><span class="caixa"></span><span>Concordo que estas respostas sejam usadas por Kevin Ribeiro para criar a minha marca, o meu site e o meu portfólio.</span></label>' +
        '<div class="aviso erro" id="erro-id" hidden></div>' +
        '<div class="nav" style="padding-bottom:0"><span class="salvo">' + (retomando ? 'Encontrei respostas salvas neste navegador.' : '') + '</span>' +
        '<button class="btn primario" type="submit">' + (retomando ? 'Continuar' : 'Começar') + ' <span aria-hidden="true">→</span></button></div>' +
      '</form></div>';

    document.getElementById('form-id').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nome = document.getElementById('nome').value.trim();
      var email = document.getElementById('email').value.trim();
      var aceite = document.getElementById('aceite').checked;
      var erros = [];
      if (nome.length < 2) erros.push('Escreva o seu nome.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) erros.push('Confira o e-mail.');
      if (!aceite) erros.push('Marque a caixa de concordância para continuar.');
      var box = document.getElementById('erro-id');
      if (erros.length) { box.textContent = erros.join(' '); box.hidden = false; return; }
      estado.nome = nome; estado.email = email; estado.aceite = true;
      if (!estado.inicio) estado.inicio = Date.now();
      irPara(primeiroBlocoPendente() || 1);
    });
  }

  function primeiroBlocoPendente() {
    for (var i = 0; i < BLOCOS.length; i++) {
      if (BLOCOS[i].perguntas.some(function (p) { return validar(p) !== ''; })) return i + 1;
    }
    return Object.keys(estado.r).length ? REVISAO : 1;
  }

  function renderBloco(b, passo) {
    var ini = b.perguntas[0].n, fim = b.perguntas[b.perguntas.length - 1].n;
    var html =
      '<div class="wrap"><div class="bloco-cab">' +
        '<span class="tag azul">Bloco ' + esc(b.id) + ' · perguntas ' + n2(ini) + ' a ' + n2(fim) + '</span>' +
        '<h2 class="d">' + esc(b.nome) + '</h2>' +
        '<p class="porque"><span class="tag">Por que pergunto</span>' + esc(b.porque) + '</p>' +
      '</div><form id="form-bloco" novalidate>';
    b.perguntas.forEach(function (p) { html += perguntaHtml(p); });
    html +=
      '<div class="nav">' +
        '<button type="button" class="btn" id="voltar"><span aria-hidden="true">←</span> Voltar</button>' +
        '<span class="salvo" aria-live="polite" id="salvo">Respostas salvas neste navegador</span>' +
        '<button type="submit" class="btn ' + (passo === BLOCOS.length ? 'primario' : 'acao') + '">' +
          (passo === BLOCOS.length ? 'Revisar e enviar' : 'Próximo bloco') + ' <span aria-hidden="true">→</span></button>' +
      '</div></form></div>';
    app.innerHTML = html;

    var form = document.getElementById('form-bloco');
    form.addEventListener('input', aoMudar);
    form.addEventListener('change', aoMudar);
    document.getElementById('voltar').addEventListener('click', function () { irPara(passo - 1); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var primeiroErro = null;
      b.perguntas.forEach(function (p) {
        var msg = validar(p);
        var el = document.getElementById('q' + p.n);
        el.classList.toggle('erro', !!msg);
        el.querySelector('.msg-erro').textContent = msg;
        if (msg && !primeiroErro) primeiroErro = el;
      });
      if (primeiroErro) {
        primeiroErro.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var f = primeiroErro.querySelector('input, textarea');
        if (f) f.focus({ preventScroll: true });
        return;
      }
      irPara(passo + 1);
    });
  }

  function perguntaHtml(p) {
    var v = estado.r[p.n];
    var id = 'q' + p.n;
    var cab = '<div class="q-cab"><span class="q-n d">' + n2(p.n) + '</span><span class="tag">' + instrucao(p) + (obrig(p) ? '' : ' · opcional') + '</span></div>';
    var ajuda = p.ajuda ? '<p class="q-a" id="' + id + '-a">' + esc(p.ajuda) + '</p>' : '';
    var desc = p.ajuda ? ' aria-describedby="' + id + '-a"' : '';
    var corpo = '';

    if (p.tipo === 'curta' || p.tipo === 'longa') {
      var campo = p.tipo === 'curta'
        ? '<input type="text" id="' + id + '-c" data-q="' + p.n + '" maxlength="300" value="' + esc(v || '') + '"' + desc + '>'
        : '<textarea id="' + id + '-c" data-q="' + p.n + '" maxlength="5000"' + desc + '>' + esc(v || '') + '</textarea>';
      return '<div class="q" id="' + id + '">' + cab + '<label class="q-t" for="' + id + '-c">' + esc(p.titulo) + '</label>' + ajuda +
        '<div class="q-corpo">' + campo + '</div><p class="msg-erro" role="alert"></p></div>';
    }

    if (p.tipo === 'unica' || p.tipo === 'multipla') {
      var tipo = p.tipo === 'unica' ? 'radio' : 'checkbox';
      var sel = v ? (p.tipo === 'unica' ? [v.v] : v.v) : [];
      var ops = p.opcoes.map(function (o, i) {
        return '<label class="opcao"><input type="' + tipo + '" name="' + id + '" value="' + esc(o) + '" data-q="' + p.n + '"' +
          (sel.indexOf(o) >= 0 ? ' checked' : '') + '><span class="caixa"></span><span>' + esc(o) + '</span></label>';
      }).join('');
      var outroMarcado = sel.indexOf(OUTRO) >= 0;
      ops += '<label class="opcao outro"><input type="' + tipo + '" name="' + id + '" value="' + OUTRO + '" data-q="' + p.n + '"' +
        (outroMarcado ? ' checked' : '') + '><span class="caixa"></span><span>Outro</span></label>' +
        '<div class="outro-txt' + (outroMarcado ? ' ativo' : '') + '" style="grid-column:1/-1"><input type="text" aria-label="Escreva a sua resposta para Outro" placeholder="Escreva aqui" data-q="' + p.n + '" data-outro="1" maxlength="500" value="' + esc(v && v.outro || '') + '"></div>';
      corpo = '<div class="opcoes">' + ops + '</div>' + (p.max ? '<p class="limite">Escolha no máximo ' + p.max + '.</p>' : '');
    }

    if (p.tipo === 'grade') {
      corpo = '<div class="grade">' + p.linhas.map(function (l, li) {
        var lados = l.split('↔').map(function (x) { return x.trim(); });
        var atual = v && v[li];
        return '<div class="g-linha" role="radiogroup" aria-label="' + esc(lados[0] + ' ou ' + lados[1]) + '"><div class="g-rot"><span>' + esc(lados[0]) + '</span><span>' + esc(lados[1]) + '</span></div><div class="g-pontos">' +
          p.colunas.map(function (c) {
            return '<label><input type="radio" name="' + id + '-' + li + '" value="' + esc(c) + '" data-q="' + p.n + '" data-linha="' + li + '"' +
              (atual === c ? ' checked' : '') + ' aria-label="' + esc(lados[0] + ' ↔ ' + lados[1] + ': ' + c) + '"><span>' + esc(c) + '</span></label>';
          }).join('') + '</div></div>';
      }).join('') + '</div>';
    }

    return '<fieldset class="q" id="' + id + '"' + desc + '><legend class="q-leg">' + cab + '<span class="q-t">' + esc(p.titulo) + '</span></legend>' + ajuda +
      '<div class="q-corpo">' + corpo + '</div><p class="msg-erro" role="alert"></p></fieldset>';
  }

  function aoMudar(ev) {
    var alvo = ev.target;
    var n = Number(alvo.getAttribute('data-q'));
    if (!n) return;
    var p = TODAS[n - 1];
    var raiz = document.getElementById('q' + n);

    if (p.tipo === 'curta' || p.tipo === 'longa') {
      estado.r[n] = alvo.value;
    } else if (p.tipo === 'unica' || p.tipo === 'multipla') {
      var marcados = Array.prototype.slice.call(raiz.querySelectorAll('input[name="q' + n + '"]:checked')).map(function (i) { return i.value; });
      if (p.tipo === 'multipla' && p.max && marcados.length > p.max && alvo.checked) {
        alvo.checked = false;
        marcados.splice(marcados.indexOf(alvo.value), 1);
        raiz.querySelector('.limite').textContent = 'Você já marcou ' + p.max + '. Desmarque uma para trocar.';
      }
      var outro = raiz.querySelector('[data-outro]');
      var temOutro = marcados.indexOf(OUTRO) >= 0;
      raiz.querySelector('.outro-txt').classList.toggle('ativo', temOutro);
      if (alvo.value === OUTRO && alvo.checked) setTimeout(function () { outro.focus(); }, 0);
      estado.r[n] = { v: p.tipo === 'unica' ? (marcados[0] || '') : marcados, outro: outro.value };
    } else if (p.tipo === 'grade') {
      var g = estado.r[n] || {};
      g[alvo.getAttribute('data-linha')] = alvo.value;
      estado.r[n] = g;
    }
    if (raiz.classList.contains('erro') && !validar(p)) raiz.classList.remove('erro');
    salvar();
  }

  function validar(p) {
    var v = estado.r[p.n];
    if (p.tipo === 'curta' || p.tipo === 'longa') {
      return obrig(p) && !(v || '').trim() ? 'Responda esta pergunta. Se não souber, escreva "não sei".' : '';
    }
    if (p.tipo === 'unica' || p.tipo === 'multipla') {
      var sel = !v ? [] : p.tipo === 'unica' ? (v.v ? [v.v] : []) : v.v;
      if (!sel.length) return obrig(p) ? 'Escolha uma opção, ou marque "Outro" e escreva.' : '';
      if (p.max && sel.length > p.max) return 'Escolha no máximo ' + p.max + '.';
      if (sel.indexOf(OUTRO) >= 0 && !(v.outro || '').trim()) return 'Você marcou "Outro": escreva a sua resposta.';
      return '';
    }
    if (p.tipo === 'grade') {
      var falta = p.linhas.some(function (_, i) { return !(v && v[i]); });
      return obrig(p) && falta ? 'Marque um ponto em cada linha.' : '';
    }
    return '';
  }

  function textoResposta(p) {
    var v = estado.r[p.n];
    if (v == null) return '';
    if (p.tipo === 'curta' || p.tipo === 'longa') return String(v).trim();
    if (p.tipo === 'unica' || p.tipo === 'multipla') {
      var sel = p.tipo === 'unica' ? (v.v ? [v.v] : []) : v.v;
      return sel.map(function (s) { return s === OUTRO ? 'Outro: ' + (v.outro || '').trim() : s; }).join('; ');
    }
    if (p.tipo === 'grade') {
      return p.linhas.map(function (l, i) { return l + ': ' + (v[i] || '-'); }).join(' | ');
    }
    return '';
  }

  function renderRevisao() {
    var itens = BLOCOS.map(function (b, i) {
      var pend = b.perguntas.filter(function (p) { return validar(p) !== ''; }).length;
      return '<li><span class="id">' + esc(b.id) + '</span><button type="button" data-ir="' + (i + 1) + '">' + esc(b.nome) + '</button>' +
        '<span class="ok">' + (pend ? pend + ' pendente' + (pend > 1 ? 's' : '') : 'Completo') + '</span></li>';
    }).join('');
    var pendentes = TODAS.filter(function (p) { return validar(p) !== ''; }).length;

    app.innerHTML =
      '<div class="wrap"><div class="bloco-cab">' +
        '<span class="tag azul">Última etapa</span><h2 class="d">revisar e enviar</h2>' +
        '<p class="porque"><span class="tag">Quase lá</span>Toque em um bloco para revisar. Depois de enviar, as respostas chegam direto para mim.</p>' +
      '</div>' +
      '<p class="tag" style="margin-top:24px">Enviando como: ' + esc(estado.nome) + ' · ' + esc(estado.email) + ' · <button type="button" data-ir="0" style="font:inherit;background:none;border:0;color:var(--azul-500);cursor:pointer;padding:0;text-transform:uppercase;letter-spacing:inherit">alterar</button></p>' +
      '<ul class="resumo">' + itens + '</ul>' +
      '<input type="text" class="oculto" id="site_url" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="aviso' + (pendentes ? ' erro' : '') + '" id="aviso"' + (pendentes ? '' : ' hidden') + '>' +
        (pendentes ? 'Faltam ' + pendentes + ' respostas obrigatórias. Abra os blocos marcados como pendentes.' : '') + '</div>' +
      '<div class="nav"><button type="button" class="btn" data-ir="' + BLOCOS.length + '"><span aria-hidden="true">←</span> Voltar</button>' +
      '<button type="button" class="btn primario" id="enviar"' + (pendentes ? ' disabled' : '') + '>Enviar respostas <span aria-hidden="true">→</span></button></div></div>';

    app.querySelectorAll('[data-ir]').forEach(function (b) {
      b.addEventListener('click', function () { irPara(Number(b.getAttribute('data-ir'))); });
    });
    document.getElementById('enviar').addEventListener('click', enviar);
  }

  function enviar() {
    var botao = document.getElementById('enviar');
    var aviso = document.getElementById('aviso');
    function erro(msg) { aviso.className = 'aviso erro'; aviso.textContent = msg; aviso.hidden = false; botao.disabled = false; botao.innerHTML = 'Tentar de novo <span aria-hidden="true">→</span>'; }

    if (!CFG.endpoint) { erro('O envio ainda não foi configurado. Avise o Kevin: suas respostas continuam salvas neste navegador.'); return; }

    var payload = {
      nome: estado.nome,
      email: estado.email,
      site_url: document.getElementById('site_url').value,
      tempo_segundos: Math.round((Date.now() - (estado.inicio || Date.now())) / 1000),
      enviado_em: new Date().toISOString(),
      respostas: TODAS.map(function (p) {
        return { n: p.n, bloco: p.bloco.id + ' · ' + p.bloco.nome, pergunta: p.titulo, resposta: textoResposta(p) };
      })
    };

    botao.disabled = true;
    botao.textContent = 'Enviando...';
    aviso.hidden = true;

    fetch(CFG.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) { limpar(); estado = { passo: FIM, nome: estado.nome, r: {} }; render(); window.scrollTo(0, 0); }
        else erro('Não consegui enviar agora. Tente de novo em alguns minutos: suas respostas continuam salvas.');
      })
      .catch(function () {
        erro('Não consegui confirmar o envio. Verifique a internet e tente de novo: suas respostas continuam salvas.');
      });
  }

  function renderFim() {
    barra.style.width = '100%';
    app.innerHTML =
      '<div class="wrap fim">' +
        '<span class="tag azul">Respostas recebidas</span>' +
        '<h2 class="d">obrigado' + (estado.nome ? ', ' + esc(estado.nome.split(' ')[0]) : '') + '.</h2>' +
        '<p class="tese">Marca boa não nasce do gosto. Nasce de decisões que dá para explicar.</p>' +
        '<p style="margin-top:24px;max-width:60ch">Vou ler tudo com calma e montar o mapa da sua marca. Depois te chamo para uma conversa curta sobre o que ficou em aberto.</p>' +
      '</div>';
  }

  render();
})();
