/* ==========================================================================
   Cadeira Cheia · página do cliente (V2 · código único)
   O MESMO arquivo serve salão, studio e barbearia: nomes, textos com gênero,
   serviços e cores vêm de config-salao.js e tema-cliente.css.
   Lê TUDO de config-salao.js (window.CADEIRA_CONFIG): serviços, seções, rótulos,
   equipe, horários, combinados e fidelidade. Nenhum nome de estabelecimento,
   de profissional ou de gênero fica preso neste arquivo.
   ========================================================================== */
(function(){
"use strict";

const CFG = window.CADEIRA_CONFIG;

/* ============================ utilidades ============================ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd = mulberry32(20260924);
const ri = (a,b)=>a+Math.floor(rnd()*(b-a+1));
const pad = n=>String(n).padStart(2,"0");
const iso = d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const addDias=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const hm = m=>pad(Math.floor(m/60))+":"+pad(m%60);
const BRL = v=>"R$ "+v.toLocaleString("pt-BR");
const esc = s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const WD=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const WDL=["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const MO=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const iniciais = n=>n.split(" ").filter(Boolean).slice(0,2).map(s=>s[0]).join("").toUpperCase();
const HOJE = new Date(); HOJE.setHours(0,0,0,0);
const AGORA_MIN = new Date().getHours()*60 + new Date().getMinutes();
const dur = m => m>=60 ? (m%60 ? Math.floor(m/60)+"h"+pad(m%60) : Math.floor(m/60)+"h") : m+" min";
const teto5 = v => Math.ceil(v/5)*5;
const dataDe = s => new Date(s+"T12:00:00");

function dataLonga(d){
  const h = iso(d)===iso(HOJE), a = iso(d)===iso(addDias(HOJE,1));
  const base = WDL[d.getDay()]+", "+d.getDate()+" de "+MO[d.getMonth()];
  return h ? "hoje, "+base.split(", ")[1] : a ? "amanhã, "+base.split(", ")[1] : base;
}

/* ============================ o salão (vem da configuração) ============================ */
const E = CFG.estabelecimento;
const SALAO = { nome:E.nome, tagline:E.tagline, endereco:E.endereco, fone:E.telefone, publico:E.publico, abre:{} };
Object.keys(CFG.horarios).forEach(k=>{ if(CFG.horarios[k]) SALAO.abre[k] = CFG.horarios[k].slice(); });
const CORES = [["--p1","--p1-soft"],["--p2","--p2-soft"],["--p3","--p3-soft"]];
const PROS = CFG.equipe.map((p,i)=>Object.assign({}, p, {cor:CORES[i%3][0], soft:CORES[i%3][1]}));
const pro = id=>PROS.find(p=>p.id===id);
const SERVICOS = CFG.servicos.filter(s=>s.ativo!==false).map(s=>Object.assign({}, s));
const srv = id=>SERVICOS.find(s=>s.id===id);
const FIDEL = CFG.fidelidade;
const R = CFG.rotulos;                       // rótulos do estabelecimento (barbearia/barbeiro/cliente)
const GRUPOS = CFG.gruposServico;            // seções em que os serviços aparecem
const COMPRIMENTOS = CFG.estimativa.comprimentos, VOLUMES = CFG.estimativa.volumes;
const primeiro = n => n.split(" ")[0];
const maiusc = t => t.charAt(0).toUpperCase() + t.slice(1);
const diasAbertos = Object.keys(SALAO.abre).map(Number).sort();
const faixaDias = (()=>{ const d = diasAbertos; return d.length ? WD[d[0]]+" a "+WD[d[d.length-1]].toLowerCase() : ""; })();

function nomePremio(){
  const p = FIDEL.premio;
  if(p.tipo==="servico"){ const s = srv(p.servicoId); return (s ? s.nome : "Serviço")+" grátis"; }
  return "Vale de "+BRL(p.valor)+" no próximo serviço";
}
const precoTxt = s => (s.apartir ? "a partir de " : "") + BRL(s.preco);
function precoCaixa(s){ return '<span class="pr">'+(s.apartir?'<small>a partir de</small>':'')+BRL(s.preco)+'</span>'; }

/* ============================ motor de horários ============================ */
function jornada(p, d){
  if(!p.dias.includes(d.getDay())) return null;
  const casa = SALAO.abre[d.getDay()];
  if(!casa) return null;
  return [Math.max(p.ini, casa[0]), Math.min(p.fim, casa[1])];
}
// intervalos em que o profissional fica ocupado; na pausa ele está livre para outro atendimento
function blocosServ(s, ini){
  if(!s.pausa) return [[ini, ini+s.dur]];
  const a = ini + s.pausa.apos, b = a + s.pausa.dur;
  return [[ini, a],[b, ini+s.dur]];
}
const cruza = (x, y) => x.some(([a,b]) => y.some(([c,d]) => a < d && c < b));

/* ============================ o cliente (dados de exemplo) ============================ */
const EX = CFG.exemplo || {};
const EU = {nome: EX.clienteDemo || "Rodrigo Alves", tel:"("+E.ddd+") 98842-7190"};
const MEUS = [];
let seq = 100;
function registra(servicoId, proId, data, ini, extra){
  const s = srv(servicoId);
  const m = Object.assign({id:"m"+(seq++), grupo:null, servicoId, proId, data, ini, dur:s.dur, preco:s.preco, status:"feito", canal:"Página"}, extra||{});
  MEUS.push(m); return m;
}
// histórico de exemplo: a frequência típica de quem mantém corte e barba em dia
const HIST = CFG.historicoExemplo || [[-18,"s4"],[-39,"s1"],[-58,"s4"],[-79,"s1"],[-104,"s6"],[-131,"s4"]];
HIST.forEach(([k, sid], i)=>{
  const s = srv(sid) || SERVICOS[0];
  const p = s.pros[0];
  let d = addDias(HOJE,k), guarda = 0;
  while(!jornada(pro(p), d) && guarda++ < 7) d = addDias(d,-1);
  registra(s.id, p, iso(d), 10*60 + (i%4)*90, {grupo:"h"+i});
});
// próximo horário já marcado (CFG.exemplo.proximo: serviços e hora de chegada)
(function(){
  const px = EX.proximo || {itens:["s4"], hora:16*60};
  const itens = px.itens.map(srv).filter(Boolean);
  if(!itens.length) itens.push(SERVICOS[0]);
  for(let k=2;k<16;k++){
    const d = addDias(HOJE,k);
    let cursor = px.hora, ok = true;
    const plano = [], usados = [];
    itens.forEach((s,i)=>{
      if(!ok) return;
      const ini = (s.paralelo && i>0) ? px.hora : cursor;
      const par = s.paralelo && i>0;
      const p = s.pros.map(pro).find(x=>{ const j = jornada(x,d); return j && j[0]<=ini && ini+s.dur<=j[1] && (!par || !usados.includes(x.id)); });
      if(!p){ ok = false; return; }
      plano.push([s, p, ini, ini<cursor]); usados.push(p.id);
      if(!(s.paralelo && i>0)) cursor = ini + s.dur;
    });
    if(!ok) continue;
    plano.forEach(([s,p,ini,par])=>registra(s.id, p.id, iso(d), ini, {grupo:"g1", status:"marcado", paralelo:par}));
    return;
  }
})();

/* ============================ agenda da casa (ocupação de exemplo) ============================ */
const OCUPADO = [];
(function(){
  for(let k=0;k<21;k++){
    const d = addDias(HOJE,k), dia = iso(d);
    PROS.forEach(p=>{
      const j = jornada(p,d);
      if(!j) return;
      const livreDeMim = bl => !MEUS.some(m=>m.data===dia && m.proId===p.id && m.status==="marcado" && cruza(blocosServ(srv(m.servicoId), m.ini), bl));
      const almoco = [[p.almoco, p.almoco+60]];
      if(livreDeMim(almoco)) OCUPADO.push({data:dia, proId:p.id, blocos:almoco, motivo:"Almoço"});
      const carga = k===0 ? .60 : k<=2 ? .48 : k<=6 ? .36 : .22;
      let cursor = j[0];
      while(cursor < j[1]-30){
        // entram os serviços que este profissional faz; os longos deixam a pausa aberta para encaixe
        const opcoes = SERVICOS.filter(x=>x.pros.includes(p.id));
        const s = opcoes[ri(0,opcoes.length-1)];
        const bl = blocosServ(s, cursor);
        const noAlmoco = cruza(bl, almoco);
        if(rnd() < carga && cursor+s.dur <= j[1] && !noAlmoco && livreDeMim(bl)){
          OCUPADO.push({data:dia, proId:p.id, blocos:bl, motivo:"ocupado"});
          cursor += s.dur;
        } else cursor += 30;
      }
    });
  }
})();

let GRUPO_IGNORADO = null;   // na remarcação, o horário antigo não bloqueia o novo
function conflita(dia, proId, bl){
  return OCUPADO.some(o => o.data===dia && o.proId===proId && cruza(o.blocos, bl))
      || MEUS.some(m => m.data===dia && m.proId===proId && m.status==="marcado" && m.grupo!==GRUPO_IGNORADO && cruza(blocosServ(srv(m.servicoId), m.ini), bl));
}
// o próprio cliente não pode ter outro horário marcado no mesmo período
function clienteOcupado(dia, ini, fim, ignorarGrupo){
  return MEUS.some(m => m.data===dia && m.status==="marcado" && m.grupo!==ignorarGrupo && ini < m.ini+m.dur && m.ini < fim);
}

/* ---------- cesta: um ou mais serviços na mesma visita ---------- */
const PESO_GRUPO = {};
GRUPOS.forEach((g,i)=>{ PESO_GRUPO[g.id] = i; });
const pesoG = s => PESO_GRUPO[s.grupo] === undefined ? 99 : PESO_GRUPO[s.grupo];
const ordenar = ids => ids.map(srv).filter(Boolean).sort((a,b)=>pesoG(a)-pesoG(b));

/* ---------- combinados: preço fechado que substitui os serviços soltos ---------- */
function economiaCombo(ids){
  let econ = 0;
  ids.map(srv).filter(Boolean).forEach(s=>{
    if(!s.inclui) return;
    const soma = s.inclui.map(srv).filter(Boolean).reduce((a,x)=>a+x.preco,0);
    econ += Math.max(0, soma - s.preco);
  });
  return econ;
}
// se os serviços escolhidos cabem num combinado mais barato, devolve a troca
function comboMelhor(cesta){
  if(cesta.length < 2) return null;
  const atual = cesta.map(srv).filter(Boolean).reduce((a,x)=>a+x.preco,0);
  let melhor = null;
  SERVICOS.filter(s=>s.inclui && !cesta.includes(s.id)).forEach(s=>{
    if(!s.inclui.every(id=>cesta.includes(id))) return;
    const resto = cesta.filter(id=>!s.inclui.includes(id));
    const novo = s.preco + resto.map(srv).filter(Boolean).reduce((a,x)=>a+x.preco,0);
    if(novo < atual && (!melhor || novo < melhor.novo))
      melhor = {s, novo, economia:atual-novo, cesta:[s.id].concat(resto)};
  });
  return melhor;
}

function cabe(p, d, ini, s, reservas){
  const j = jornada(p,d);
  if(!j || ini < j[0] || ini+s.dur > j[1]) return false;
  if(iso(d)===iso(HOJE) && ini < AGORA_MIN+60) return false;
  const bl = blocosServ(s, ini);
  if(conflita(iso(d), p.id, bl)) return false;
  return !reservas.some(r => r.proId===p.id && cruza(r.blocos, bl));
}
/* monta a visita a partir de um horário de chegada T: os serviços entram em sequência
   com o profissional; os marcados como paralelo entram ao mesmo tempo quando há alguém livre */
function planejar(cesta, pref, d, T, ignorarGrupo){
  const itens = [], reservas = [];
  let cursor = T, fim = T;
  for(const s of ordenar(cesta)){
    const candidatas = s.pros.filter(id => !(pref && s.pros.length>1) || id===pref).map(pro);
    const inicios = (s.paralelo && itens.length) ? [T, cursor] : [cursor];
    let feito = null;
    for(const ini of inicios){
      for(const p of candidatas){ if(cabe(p,d,ini,s,reservas)){ feito = {p, ini}; break; } }
      if(feito) break;
    }
    if(!feito) return null;
    const paralelo = feito.ini < cursor;
    itens.push({servicoId:s.id, proId:feito.p.id, ini:feito.ini, dur:s.dur, paralelo});
    reservas.push({proId:feito.p.id, blocos:blocosServ(s, feito.ini)});
    if(!paralelo) cursor = feito.ini + s.dur;
    fim = Math.max(fim, feito.ini + s.dur);
  }
  if(clienteOcupado(iso(d), T, fim, ignorarGrupo)) return null;
  return {inicio:T, fim, itens};
}
function opcoesDoDia(cesta, pref, d, ignorarGrupo){
  const casa = SALAO.abre[d.getDay()];
  if(!casa || !cesta.length) return [];
  const out = [];
  for(let T=casa[0]; T<casa[1]; T+=30){
    const pl = planejar(cesta, pref, d, T, ignorarGrupo);
    if(pl) out.push(pl);
  }
  return out;
}
function temVaga(cesta, pref, d, ig){
  const casa = SALAO.abre[d.getDay()];
  if(!casa) return false;
  for(let T=casa[0]; T<casa[1]; T+=30) if(planejar(cesta, pref, d, T, ig)) return true;
  return false;
}

/* ---------- estimativa do "a partir de" ---------- */
function estimativa(s, comp, vol){
  if(!s.apartir || !s.faixas || !comp) return null;
  const f = s.faixas[comp]; if(!f) return null;
  const v = VOLUMES.find(x=>x.id===vol) || VOLUMES[1];
  return [Math.max(s.preco, teto5(f[0]*(1+v.acrescimo))), teto5(f[1]*(1+v.acrescimo))];
}
function totalCesta(cesta, comp, vol){
  let min = 0, max = 0, apartir = false, semEstim = false;
  cesta.map(srv).forEach(s=>{
    const e = estimativa(s, comp, vol);
    if(e){ min += e[0]; max += e[1]; }
    else { min += s.preco; max += s.preco; if(s.apartir){ apartir = true; semEstim = true; } }
  });
  if(semEstim) return {txt:"a partir de "+BRL(min), min, max};
  if(max > min) return {txt:BRL(min)+" a "+BRL(max), min, max, estimado:true};
  return {txt:BRL(min), min, max};
}
const durCesta = cesta => { const pl = cesta.map(srv); return pl.reduce((a,s)=>a+s.dur,0); };

/* ---------- fidelidade (prêmio fixo, pode estar desativada) ---------- */
function carimbos(){
  const feitos = MEUS.filter(m=>m.status==="feito");
  return FIDEL.conta==="servico" ? feitos.length : new Set(feitos.map(m=>m.grupo||m.id)).size;
}

/* ============================ estado ============================ */
let canal = "app";
let aba = "inicio";
let passo = null;      // {etapa, cesta:[], pref, comp, vol, foto, data, T, remarcando}
let confirmado = null; // grupo confirmado
const fone = document.getElementById("fone");
const legenda = document.getElementById("legenda");

const grupos = () => {
  const m = {};
  MEUS.forEach(x=>{ const g = x.grupo||x.id; (m[g]=m[g]||[]).push(x); });
  return Object.keys(m).map(g=>({id:g, itens:m[g].sort((a,b)=>a.ini-b.ini)}));
};
const proximos = () => grupos().filter(g=>g.itens[0].status==="marcado" && g.itens[0].data>=iso(HOJE))
  .sort((a,b)=>a.itens[0].data<b.itens[0].data?-1:a.itens[0].data>b.itens[0].data?1:a.itens[0].ini-b.itens[0].ini);
const feitos = () => MEUS.filter(m=>m.status==="feito").sort((a,b)=>a.data<b.data?1:-1);
const nomeGrupo = g => g.itens.map(i=>srv(i.servicoId).nome).join(" + ");

function novoPasso(cesta, etapa){
  passo = {etapa:etapa||"servicos", cesta:(cesta||[]).slice(), pref:null, comp:null, vol:"medio", foto:null, data:null, T:null, remarcando:null};
  if(etapa && etapa!=="servicos") passo.etapa = proximaEtapa("servicos");
}
function etapas(st){
  const ss = st.cesta.map(srv);
  const out = ["servicos"];
  if(ss.some(s=>s.apartir && s.faixas)) out.push("cabelo");
  if(ss.some(s=>s.pros.length>1)) out.push("pro");
  out.push("dia","hora","confirmar");
  return out;
}
function proximaEtapa(atual){ const l = etapas(passo); return l[Math.min(l.length-1, l.indexOf(atual)+1)]; }
function etapaAnterior(atual){ const l = etapas(passo); return l[Math.max(0, l.indexOf(atual)-1)]; }
const TITULOS = {servicos:"O que você vai fazer", cabelo:"Conte sobre seu cabelo", pro:"Com quem", dia:"Escolha o dia", hora:"Escolha o horário", confirmar:"Confirme os dados"};

/* ============================ telas: página ============================ */
function chipAberto(){
  const j = SALAO.abre[HOJE.getDay()];
  if(!j) return '<span class="chipclaro">Fechado hoje</span>';
  const aberto = AGORA_MIN >= j[0] && AGORA_MIN < j[1];
  return '<span class="chipclaro">'+(aberto ? "Aberto até "+hm(j[1]) : "Abre "+hm(j[0]))+'</span>';
}
function cardServico(s, modo){
  const p = pro(s.pros[0]);
  const quem = s.pros.length>1 ? s.pros.map(id=>primeiro(pro(id).nome)).join(" ou ") : primeiro(p.nome);
  const sel = modo==="sel" && passo && passo.cesta.includes(s.id);
  return '<button class="servico" data-'+(modo==="sel"?"toggle":"srv")+'="'+s.id+'"'+(modo==="sel"?' aria-pressed="'+sel+'"':'')+'>'+
    (modo==="sel" ? '<span class="marca-sel" aria-hidden="true">✓</span>'
      : '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')" title="'+esc(quem)+'">'+(s.pros.length>1?"+"+s.pros.length:iniciais(p.nome))+'</span>')+
    '<span class="bd"><span class="nm">'+esc(s.nome)+'</span>'+
    '<span class="mt">'+(s.apartir?"aprox. ":"")+dur(s.dur)+' · '+esc(modo==="sel" ? s.desc : "com "+quem)+'</span></span>'+
    precoCaixa(s)+(modo==="sel"?'':'<span class="seta">›</span>')+'</button>';
}
function combosHTML(){
  return '<div class="combos">'+CFG.combos.map((c,i)=>{
    const t = totalCesta(c.itens, null, null);
    const e = economiaCombo(c.itens);
    return '<button class="combo" data-combo="'+i+'"><span class="nm">'+esc(c.rotulo)+'</span>'+
      '<span class="mt">'+t.txt+(e ? ' · economia de '+BRL(e) : ' · uma visita só')+'</span></button>';
  }).join("")+'</div>';
}
// as seções vêm de CFG.gruposServico: trocar de estabelecimento não mexe neste arquivo
function secoesHTML(modo){
  let h = "";
  GRUPOS.forEach((g, i)=>{
    const lista = SERVICOS.filter(s=>s.grupo===g.id);
    if(!lista.length) return;
    h += modo==="sel"
      ? '<div class="faixa"'+(i===0?' style="margin-top:0"':'')+'>'+esc(g.titulo)+'</div>'
      : '<div class="bloco"><h2>'+esc(g.titulo)+'</h2><div class="cap">'+esc(g.cap)+'</div>';
    lista.forEach(s=>{ h += cardServico(s, modo); });
    if(modo!=="sel") h += '</div>';
  });
  return h;
}

function telaInicio(){
  const prox = proximos()[0];
  let h = '<div class="capa">'+
    '<div class="marca">'+esc(E.marca||"")+'</div>'+
    '<h1>'+esc(E.marca ? SALAO.nome.replace(new RegExp("^"+E.marca+"\\s+"), "") : SALAO.nome)+'</h1>'+
    '<div class="end">'+esc(SALAO.tagline)+' · '+esc(SALAO.endereco)+'</div>'+
    '<div class="chips">'+chipAberto()+
      '<span class="chipclaro">'+esc(faixaDias)+'</span>'+
      '<span class="chipclaro">'+esc(SALAO.publico)+'</span></div>'+
  '</div><div class="corpo">';

  if(prox){
    const i0 = prox.itens[0], d = dataDe(i0.data);
    h += '<div class="destaque"><div class="q">Seu próximo horário</div>'+
      '<div class="r">'+esc(nomeGrupo(prox))+' · '+hm(i0.ini)+'</div>'+
      '<div class="d">'+dataLonga(d)+' com '+esc([...new Set(prox.itens.map(i=>primeiro(pro(i.proId).nome)))].join(" e "))+'</div></div>';
  }
  if(FIDEL.ativo){
    const n = carimbos(), at = n % FIDEL.meta, falta = FIDEL.meta - at;
    h += '<button class="fidcard" data-aba="fidelidade"><span class="bd"><b>'+
      (falta===FIDEL.meta && n>0 ? "Prêmio liberado!" : "Faltam "+falta+" visita"+(falta>1?"s":"")+" para: "+esc(nomePremio()))+'</b>'+
      at+' de '+FIDEL.meta+' carimbos no seu cartão fidelidade'+
      '<span class="barrinha"><i style="width:'+Math.round(at/FIDEL.meta*100)+'%"></i></span></span><span class="seta">›</span></button>';
  }

  if(CFG.combos && CFG.combos.length)
    h += '<div class="bloco"><h2>'+esc((CFG.textos||{}).combosTitulo || "Resolva numa visita")+'</h2>'+
         '<div class="cap">'+esc((CFG.textos||{}).combosCap || "Preço fechado, tudo na mesma sentada.")+'</div>'+combosHTML()+'</div>';

  h += secoesHTML("link");

  h += '<div class="bloco"><h2>Quem atende</h2><div class="cartao">'+
    PROS.map(p=>'<div class="linha">'+
      '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+iniciais(p.nome)+'</span>'+
      '<span class="bd"><b>'+esc(p.nome)+'</b><div class="sub">'+esc(p.papel)+' · '+
        p.dias.map(d=>WD[d]).join(", ")+' · '+hm(p.ini)+' às '+hm(p.fim)+'</div></span></div>').join("")+
    '</div></div>';

  const temApartir = SERVICOS.some(s=>s.apartir);
  h += '<div class="nota">'+
    (temApartir ? 'Alguns serviços saem <b>a partir do valor da tabela</b>: você responde duas perguntas e já vê a faixa de preço. '
                : 'Preço fechado: o que está na tabela é o que você paga. ')+
    'Confirmamos seu horário pelo WhatsApp na véspera; para desmarcar, avise com '+E.avisoCancelamentoHoras+' horas de antecedência.</div>';
  h += '</div>';
  return h;
}

function sugestaoCombo(){
  const m = comboMelhor(passo.cesta);
  if(!m) return "";
  return '<div class="nota" style="margin-top:12px">Juntando esses serviços, o <b>'+esc(m.s.nome)+'</b> sai por '+
    BRL(m.novo)+' — '+BRL(m.economia)+' a menos.'+
    '<div><button class="btn pq" data-trocacombo="1" style="margin-top:9px">Trocar pelo combinado</button></div></div>';
}
function barraCesta(){
  const st = passo, n = st.cesta.length;
  const t = totalCesta(st.cesta, st.comp, st.vol);
  return '<div class="cesta-barra"><div class="info">'+
    (n ? '<b>'+n+' serviço'+(n>1?'s':'')+' · '+t.txt+'</b>'+dur(durCesta(st.cesta))+' de atendimento'+(n>1?' somado':'')
       : '<b>Nenhum serviço escolhido</b>Toque nos serviços para montar sua visita')+
    '</div><button class="btn cheio" data-avancar="1"'+(n?'':' disabled')+'>Continuar</button></div>';
}

function telaAgendar(){
  const st = passo;
  const lista = etapas(st), idx = lista.indexOf(st.etapa)+1, total = lista.length;
  let h = '<div class="topo"><button class="voltar" data-voltar="1" aria-label="Voltar">‹</button>'+
    '<div><h2>'+TITULOS[st.etapa]+'</h2><div class="et">Passo '+idx+' de '+total+'</div></div></div>'+
    '<div class="trilho"><i style="width:'+Math.round(idx/total*100)+'%"></i></div>'+
    '<div class="corpo">';

  if(st.etapa==="servicos"){
    h += '<div class="cap" style="margin-top:-6px;color:var(--muted);font-size:12.5px">Escolha um ou mais. A gente monta a visita com os horários '+esc(R.daCasa)+'.</div>';
    if(CFG.combos && CFG.combos.length)
      h += '<div class="bloco"><div class="faixa" style="margin-top:0">Mais pedidos</div>'+combosHTML()+'</div>';
    h += '<div>' + secoesHTML("sel") + '</div>';
    h += sugestaoCombo();
    h += '</div>' + barraCesta();
    return h;
  }

  if(st.etapa==="cabelo"){
    const aps = st.cesta.map(srv).filter(s=>s.apartir && s.faixas);
    h += '<div class="cap" style="margin-top:-6px;color:var(--muted);font-size:12.5px">'+esc(aps.map(s=>s.nome).join(" e "))+
      (aps.length>1?' variam':' varia')+' com o comprimento e o volume. Com duas respostas você já vê a faixa de preço.</div>';
    h += '<div><div class="faixa" style="margin-top:0">Comprimento</div><div class="selgrid">'+
      COMPRIMENTOS.map(c=>'<button class="opcao" data-comp="'+c.id+'" aria-pressed="'+(st.comp===c.id)+'"><b>'+esc(c.rotulo)+'</b><span class="sub">'+esc(c.dica)+'</span></button>').join("")+
      '</div></div>';
    h += '<div><div class="faixa">Volume</div><div class="chips">'+
      VOLUMES.map(v=>'<button class="chipsel" data-vol="'+v.id+'" aria-pressed="'+(st.vol===v.id)+'">'+esc(v.rotulo)+'</button>').join("")+
      '</div></div>';
    h += '<div><div class="faixa">Foto (opcional)</div><div class="foto">'+
      (st.foto ? '<img src="'+st.foto+'" alt="Foto do cabelo enviada">' : '')+
      '<label class="btn pq" for="f-foto">'+(st.foto?'Trocar foto':'Enviar uma foto do cabelo')+'</label>'+
      '<input type="file" id="f-foto" accept="image/*">'+
      '<span style="font-size:12px;color:var(--muted)">'+esc(maiusc(R.principalArt))+' vê antes do atendimento.</span></div></div>';
    if(st.comp){
      h += '<div class="estim"><div class="q">Estimativa</div>'+
        aps.map(s=>{ const e = estimativa(s, st.comp, st.vol);
          return '<div class="r"><span>'+esc(s.nome)+'</span><b>'+BRL(e[0])+' a '+BRL(e[1])+'</b></div>'; }).join("")+
        '<div style="font-size:12px;color:var(--ink-2);margin-top:7px">O valor final '+esc(R.principalArt)+' fecha com você antes de começar.</div></div>';
    }
    h += '<button class="btn cheio bloco" data-avancar="1"'+(st.comp?'':' disabled')+'>Continuar</button>';
  }

  if(st.etapa==="pro"){
    const multi = st.cesta.map(srv).filter(s=>s.pros.length>1);
    const ids = [...new Set(multi.flatMap(s=>s.pros))];
    h += '<button class="opcao" data-pro="qualquer" aria-pressed="'+(st.pref===null)+'">'+
      '<span class="avatar" style="background:var(--surface-2);color:var(--ink-2)">?</span>'+
      '<span class="bd"><b>Tanto faz</b><div class="sub">mostra mais horários livres</div></span></button>';
    ids.map(pro).forEach(p=>{
      h += '<button class="opcao" data-pro="'+p.id+'" aria-pressed="'+(st.pref===p.id)+'">'+
        '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+iniciais(p.nome)+'</span>'+
        '<span class="bd"><b>'+esc(p.nome)+'</b><div class="sub">'+esc(p.papel)+' · '+p.dias.map(d=>WD[d]).join(", ")+'</div></span></button>';
    });
    if(st.cesta.some(id=>srv(id).pros.length===1))
      h += '<div class="nota">Os demais serviços são sempre com '+esc(R.principalArt)+'.</div>';
  }

  if(st.etapa==="dia"){
    h += '<div class="dias">';
    for(let k=0;k<14;k++){
      const d = addDias(HOJE,k);
      const vaga = temVaga(st.cesta, st.pref, d, st.remarcando);
      h += '<button class="dia" data-dia="'+iso(d)+'" aria-pressed="'+(st.data===iso(d))+'"'+(vaga?"":" disabled")+'>'+
        '<span class="sem">'+(k===0?"Hoje":WD[d.getDay()])+'</span>'+
        '<span class="num">'+d.getDate()+'</span><span class="mes">'+MO[d.getMonth()]+'</span></button>';
    }
    h += '</div><div class="nota">'+esc(R.casaCap)+' abre de '+esc(faixaDias)+'. Dias apagados estão sem horário para '+(st.cesta.length>1?'essa combinação':'este serviço')+'.</div>';
  }

  if(st.etapa==="hora"){
    const d = dataDe(st.data);
    const ops = opcoesDoDia(st.cesta, st.pref, d, st.remarcando);
    h += '<div class="pill brand" style="margin-bottom:4px">'+dataLonga(d)+'</div>';
    if(!ops.length){
      h += '<div class="vazio">Não sobrou horário nesse dia. Volte e escolha outro.</div>';
    } else {
      [["Manhã",0,12*60],["Tarde",12*60,18*60],["Fim do dia",18*60,24*60]].forEach(function(f){
        const fatia = ops.filter(o=>o.inicio>=f[1] && o.inicio<f[2]);
        if(!fatia.length) return;
        h += '<div class="faixa">'+f[0]+'</div><div class="horas">'+
          fatia.map(o=>'<button class="hora" data-hora="'+o.inicio+'" aria-pressed="'+(st.T===o.inicio)+'">'+hm(o.inicio)+
            (st.cesta.length>1?'<span class="fim">até '+hm(o.fim)+'</span>':'')+'</button>').join("")+'</div>';
      });
      if(st.cesta.length>1) h += '<div class="nota">O horário é o da sua chegada; embaixo, quando a visita termina.</div>';
    }
  }

  if(st.etapa==="confirmar"){
    const d = dataDe(st.data);
    const pl = planejar(st.cesta, st.pref, d, st.T, st.remarcando);
    if(!pl){
      h += '<div class="vazio">Esse horário acabou de ser preenchido. Volte e escolha outro.</div></div>';
      return h;
    }
    const t = totalCesta(st.cesta, st.comp, st.vol);
    h += '<div class="cartao"><div class="faixa" style="margin-top:0">'+esc(dataLonga(d))+' · das '+hm(pl.inicio)+' às '+hm(pl.fim)+'</div><div class="plano">'+
      pl.itens.map(i=>{ const s = srv(i.servicoId), p = pro(i.proId), e = estimativa(s, st.comp, st.vol);
        return '<div class="it"><span class="hr">'+hm(i.ini)+'–'+hm(i.ini+i.dur)+'</span>'+
          '<span class="bd"><b>'+esc(s.nome)+'</b><div class="sub">com '+esc(primeiro(p.nome))+(i.paralelo?' · ao mesmo tempo':'')+'</div></span>'+
          '<span class="vl">'+(e ? BRL(e[0])+'–'+BRL(e[1]).replace("R$ ","") : precoTxt(s))+'</span></div>'; }).join("")+
      '</div><div class="resumo" style="margin-top:4px"><div class="r"><span>Total '+(t.estimado?'estimado':'')+'</span><span>'+t.txt+'</span></div></div></div>'+
    (t.estimado || st.cesta.some(id=>srv(id).apartir) ? '<div class="nota">Serviços "a partir de": '+esc(R.principalArt)+' confirma o valor com você <b>antes de começar</b>.</div>' : '')+
    '<form id="form-confirmar">'+
      '<div class="campo"><label for="f-nome">Seu nome</label><input id="f-nome" value="'+esc(EU.nome)+'" autocomplete="name"></div>'+
      '<div class="campo"><label for="f-tel">WhatsApp</label><input id="f-tel" value="'+esc(EU.tel)+'" autocomplete="tel" inputmode="tel"></div>'+
      '<div class="aviso" id="f-aviso" hidden></div>'+
      '<button type="submit" class="btn cheio bloco">'+(st.remarcando?'Confirmar novo horário':'Confirmar horário')+'</button>'+
    '</form>'+
    '<div class="nota">Você recebe a confirmação no WhatsApp. O pagamento é '+esc(R.naCasa)+', no dia.'+
      (FIDEL.ativo ? ' Esta visita vale '+(FIDEL.conta==="servico" ? st.cesta.length+' carimbo'+(st.cesta.length>1?'s':'') : '1 carimbo')+' no cartão fidelidade.' : '')+'</div>';
  }

  h += '</div>';
  return h;
}

function telaConfirmado(){
  const g = grupos().find(x=>x.id===confirmado);
  const i0 = g.itens[0], d = dataDe(i0.data);
  const fim = Math.max(...g.itens.map(i=>i.ini+i.dur));
  return '<div class="corpo" style="padding-top:34px">'+
    '<div class="centro"><div class="selo-ok">✓</div>'+
    '<h2 style="font-size:21px;font-weight:500">Horário confirmado</h2>'+
    '<div class="cap" style="margin-top:6px;color:var(--muted);font-size:12.5px">Mandamos os detalhes no seu WhatsApp.</div></div>'+
    '<div class="cartao"><div class="faixa" style="margin-top:0">'+esc(dataLonga(d))+' · das '+hm(i0.ini)+' às '+hm(fim)+'</div><div class="plano">'+
      g.itens.map(i=>'<div class="it"><span class="hr">'+hm(i.ini)+'</span><span class="bd"><b>'+esc(srv(i.servicoId).nome)+'</b>'+
        '<div class="sub">com '+esc(primeiro(pro(i.proId).nome))+(i.paralelo?' · ao mesmo tempo':'')+'</div></span></div>').join("")+
      '</div><div class="resumo"><div class="r"><span>Onde</span><span>'+esc(SALAO.endereco)+'</span></div></div></div>'+
    '<button class="btn cheio bloco" data-ir="meus">Ver meus horários</button>'+
    '<button class="btn bloco" data-ir="inicio">Voltar ao início</button>'+
    '<div class="nota">Precisa remarcar? Dá para fazer por aqui em Meus horários, sem precisar ligar.</div>'+
  '</div>';
}

function telaMeus(){
  const prox = proximos(), ant = feitos();
  let h = '<div class="corpo"><div class="bloco"><h2>Meus horários</h2>'+
    '<div class="cap">'+esc(EU.nome)+' · '+esc(EU.tel)+'</div>';
  if(!prox.length){
    h += '<div class="cartao"><div class="vazio">Você não tem horário marcado.<br><br>'+
         '<button class="btn cheio" data-ir="agendar">Agendar agora</button></div></div>';
  } else {
    prox.forEach(g=>{
      const i0 = g.itens[0], d = dataDe(i0.data), p = pro(i0.proId);
      const t = g.itens.reduce((a,i)=>a+i.preco,0), ap = g.itens.some(i=>srv(i.servicoId).apartir);
      const est = g.itens.find(i=>i.estimativa);
      h += '<div class="cartao" style="margin-bottom:10px">'+
        '<div style="display:flex;align-items:flex-start;gap:11px">'+
          '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+iniciais(p.nome)+'</span>'+
          '<div style="flex:1;min-width:0"><b>'+esc(nomeGrupo(g))+'</b>'+
            '<div class="sub" style="font-size:12.5px;color:var(--muted)">'+dataLonga(d)+' · '+hm(i0.ini)+' · '+
              esc([...new Set(g.itens.map(i=>primeiro(pro(i.proId).nome)))].join(" e "))+'</div>'+
            '<div style="margin-top:7px;display:flex;gap:6px;flex-wrap:wrap"><span class="pill ok">Confirmado</span>'+
              '<span class="pill neutro">'+(est && est.estTotal ? BRL(est.estTotal[0])+' a '+BRL(est.estTotal[1]) : (ap?'a partir de ':'')+BRL(t))+'</span>'+
              (g.itens.length>1?'<span class="pill brand">'+g.itens.length+' serviços</span>':'')+
              (i0.canal==="WhatsApp"?'<span class="pill brass">via WhatsApp</span>':'')+'</div>'+
          '</div></div>'+
        '<div style="display:flex;gap:7px;margin-top:12px">'+
          '<button class="btn pq" data-remarcar="'+g.id+'">Remarcar</button>'+
          '<button class="btn pq perigo" data-cancelar="'+g.id+'">Cancelar</button>'+
        '</div></div>';
    });
  }
  h += '</div><div class="bloco"><h2>Já fiz aqui</h2><div class="cap">'+ant.length+' atendimentos</div><div class="cartao">'+
    ant.slice(0,6).map(m=>{
      const s = srv(m.servicoId), p = pro(m.proId), d = dataDe(m.data);
      return '<div class="linha"><span class="dot" style="background:var('+p.cor+')"></span>'+
        '<span class="bd"><b>'+esc(s.nome)+'</b><div class="sub">'+pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear()+
          ' · '+esc(primeiro(p.nome))+'</div></span>'+
        '<button class="btn pq" data-repetir="'+m.servicoId+'">Repetir</button></div>';
    }).join("")+'</div></div></div>';
  return h;
}

function telaFidelidade(){
  if(!FIDEL.ativo) return '<div class="corpo"><div class="vazio">'+esc(R.casaCap)+' não está com programa de fidelidade no momento.</div></div>';
  const n = carimbos(), meta = FIDEL.meta, atual = n % meta, faltam = meta - atual;
  let selos = "";
  for(let i=0;i<meta;i++){
    const on = i < atual, premio = i === meta-1;
    selos += '<div class="selo'+(on?" on":"")+(premio&&!on?" premio":"")+'">'+(on?"✓":(premio?"★":i+1))+'</div>';
  }
  const unidade = FIDEL.conta==="servico" ? "serviço" : "visita";
  return '<div class="corpo">'+
    '<div class="bloco"><h2>Cartão fidelidade</h2>'+
    '<div class="cap">A cada '+meta+' '+unidade+'s, você ganha: <b>'+esc(nomePremio())+'</b>.</div>'+
    '<div class="cartao"><div class="selos">'+selos+'</div>'+
      '<div style="margin-top:14px;font-weight:700;font-size:15px">'+
        (faltam===1 ? "Falta 1 "+unidade+" para o prêmio" : "Faltam "+faltam+" "+unidade+"s para o prêmio")+'</div>'+
      '<div class="sub" style="font-size:12.5px;color:var(--muted);margin-top:3px">'+atual+' de '+meta+' carimbos nesta cartela · '+n+' no total</div>'+
    '</div></div>'+
    '<div class="bloco"><h2>Como funciona</h2><div class="cartao">'+
      '<div class="linha"><span class="pill brand">1</span><span class="bd">'+(FIDEL.conta==="servico"
          ? 'Cada serviço concluído vira um carimbo, automaticamente.'
          : 'Cada visita concluída vira um carimbo, mesmo que você faça mais de um serviço nela.')+'</span></div>'+
      '<div class="linha"><span class="pill brand">2</span><span class="bd">Ao completar '+meta+', o prêmio aparece aqui e '+esc(R.casa)+' aplica na próxima visita.</span></div>'+
      '<div class="linha"><span class="pill brand">3</span><span class="bd">Horário desmarcado ou falta não conta carimbo.</span></div>'+
    '</div></div>'+
    '<div class="nota">O prêmio é fixo, igual para '+esc(R.cliTodos)+', e vale como indicado por '+esc(R.casa)+'.</div>'+
  '</div>';
}

function abas(){
  const l = [
    ["inicio","Início",'<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10V20h13V10"/>'],
    ["agendar","Agendar",'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>'],
    ["meus","Meus horários",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>']
  ];
  if(FIDEL.ativo) l.push(["fidelidade","Fidelidade",'<path d="m12 4 2.3 4.9 5.2.7-3.8 3.7.9 5.3-4.6-2.6-4.6 2.6.9-5.3L4.5 9.6l5.2-.7z"/>']);
  return l;
}

function pintaApp(){
  let tela;
  if(confirmado) tela = telaConfirmado();
  else if(aba==="inicio") tela = telaInicio();
  else if(aba==="agendar") tela = telaAgendar();
  else if(aba==="meus") tela = telaMeus();
  else tela = telaFidelidade();
  const y = document.getElementById("tela") ? document.getElementById("tela").scrollTop : 0;
  fone.innerHTML = '<div class="tela" id="tela">'+tela+'</div>'+
    '<nav class="rodape" aria-label="Seções">'+
      abas().map(a=>'<button data-aba="'+a[0]+'" aria-current="'+(!confirmado && aba===a[0])+'">'+
        '<svg class="pt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+a[2]+'</svg>'+a[1]+'</button>').join("")+
    '</nav>';
  return y;
}
function pinta(manterScroll){
  GRUPO_IGNORADO = passo ? passo.remarcando : null;
  const y = pintaApp();
  const t = document.getElementById("tela");
  if(t) t.scrollTop = manterScroll ? y : 0;
  const f = document.getElementById("form-confirmar");
  if(f) f.addEventListener("submit", confirmarPagina);
  const ff = document.getElementById("f-foto");
  if(ff) ff.addEventListener("change", lerFoto);
  legenda.textContent = "O mesmo link que "+R.casa+" põe na bio do Instagram e no Google. Sem cadastro e sem aplicativo para instalar.";
}
function lerFoto(ev){
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = () => { passo.foto = r.result; pinta(true); };
  r.readAsDataURL(f);
}

function gravarVisita(st, canalOrigem){
  GRUPO_IGNORADO = st.remarcando || null;
  const d = dataDe(st.data);
  const pl = planejar(st.cesta, st.pref, d, st.T, st.remarcando);
  if(!pl) return null;
  if(st.remarcando) MEUS.forEach(m=>{ if(m.grupo===st.remarcando) m.status="cancelado"; });
  const g = "g"+(seq++);
  const t = totalCesta(st.cesta, st.comp, st.vol);
  pl.itens.forEach(i=>{
    const s = srv(i.servicoId), e = estimativa(s, st.comp, st.vol);
    registra(i.servicoId, i.proId, st.data, i.ini, {grupo:g, status:"marcado", canal:canalOrigem, paralelo:i.paralelo,
      estimativa:e, comprimento:st.comp, volume:st.vol, foto:st.foto, estTotal: t.estimado ? [t.min,t.max] : null});
  });
  return g;
}
function confirmarPagina(ev){
  ev.preventDefault();
  const aviso = document.getElementById("f-aviso");
  const nome = (document.getElementById("f-nome").value||"").trim();
  const tel = (document.getElementById("f-tel").value||"").replace(/\D/g,"");
  if(nome.length < 3){ aviso.hidden=false; aviso.textContent="Escreva seu nome completo."; return; }
  if(tel.length < 10){ aviso.hidden=false; aviso.textContent="Confira o número do WhatsApp, com DDD."; return; }
  const g = gravarVisita(passo, "Página");
  if(!g){ aviso.hidden=false; aviso.textContent="Esse horário acabou de ser preenchido. Escolha outro."; return; }
  EU.nome = nome;
  confirmado = g; passo = null;
  pinta();
}

/* ============================ telas: WhatsApp ============================ */
let conversa = [], rapidas = [], estadoZap = null, digitando = false;
function horaAgora(){ const n=new Date(); return pad(n.getHours())+":"+pad(n.getMinutes()); }
function diz(quem, texto){ conversa.push({quem, texto, hora:horaAgora()}); }

function pintaZap(){
  const baloes = conversa.map(m=>'<div class="msg '+(m.quem==="eu"?"eu":"bot")+'">'+esc(m.texto)+
      '<span class="hr">'+m.hora+(m.quem==="eu"?' ✓✓':'')+'</span></div>').join("");
  fone.innerHTML = '<div class="zap"><div class="zaptopo">'+
      '<span class="avatar" style="background:rgba(247,242,237,.16);color:var(--on-brand)">'+iniciais(SALAO.nome)+'</span>'+
      '<div><div class="nm">'+esc(SALAO.nome)+'</div><div class="st">'+(digitando?"digitando…":"responde na hora")+'</div></div></div>'+
    '<div class="zapfundo" id="zapfundo">'+baloes+(digitando?'<div class="digitando"><i></i><i></i><i></i></div>':'')+'</div>'+
    (rapidas.length && !digitando ? '<div class="rapidas">'+rapidas.map((r,i)=>
        '<button class="rapida'+(r.fraca?" fraca":"")+'" data-zap="'+i+'">'+esc(r.rot)+'</button>').join("")+'</div>' : '')+
    '<div class="zapnota">Simulação do bot de marcação · as respostas usam a agenda real '+esc(R.daCasa)+'</div></div>';
  const fundo = document.getElementById("zapfundo");
  if(fundo) fundo.scrollTop = fundo.scrollHeight;
  legenda.textContent = "O mesmo motor de horários da página, respondendo no canal onde "+R.cliA+" já está.";
}
function botDiz(textos, proximas, espera){
  digitando = true; rapidas = []; pintaZap();
  setTimeout(()=>{
    digitando = false;
    (Array.isArray(textos)?textos:[textos]).forEach(t=>diz("bot", t));
    rapidas = proximas || [];
    pintaZap();
  }, espera || 620);
}
function iniciaZap(){
  conversa = []; rapidas = []; estadoZap = {cesta:[], pref:null, comp:null, vol:"medio"};
  diz("bot", "Oi! Aqui é "+(R.artigoNome||"o")+" "+SALAO.nome+" ✨\nPosso te ajudar com o quê?");
  rapidas = [{rot:"Quero marcar um horário", acao:"marcar"},{rot:"Ver meus horários", acao:"ver"},{rot:"Falar com "+R.principalArt, acao:"humano", fraca:true}];
  pintaZap();
}
function zapEscolhe(i){
  const r = rapidas[i]; if(!r) return;
  diz("eu", r.rot); rapidas = []; pintaZap();
  setTimeout(()=>trataZap(r), 260);
}
// o que ainda cabe na visita: serviços soltos que nenhum item da cesta já resolve
function complementos(st){
  const cobertos = new Set(st.cesta);
  st.cesta.map(srv).filter(Boolean).forEach(s=>{ (s.inclui||[]).forEach(i=>cobertos.add(i)); });
  return SERVICOS.filter(s=>!s.inclui && !cobertos.has(s.id)).slice(0,3);
}
function valorTxt(s, st){
  const e = estimativa(s, st.comp, st.vol);
  return e ? BRL(e[0])+" a "+BRL(e[1]) : precoTxt(s);
}
function seguirZap(st){
  const ss = st.cesta.map(srv);
  if(ss.some(s=>s.apartir && s.faixas) && !st.comp){
    const s = ss.find(x=>x.apartir && x.faixas);
    botDiz(s.nome+" varia com o cabelo. Pra eu te passar uma estimativa: qual o comprimento?",
      COMPRIMENTOS.map(c=>({rot:c.rotulo+" ("+c.dica+")", acao:"comp", id:c.id})));
    return;
  }
  if(ss.some(s=>s.pros.length>1) && st.pref===undefined){
    const ids = [...new Set(ss.filter(s=>s.pros.length>1).flatMap(s=>s.pros))];
    botDiz("Você prefere com quem?",
      [{rot:"Tanto faz", acao:"pro", id:null}].concat(ids.map(id=>({rot:primeiro(pro(id).nome), acao:"pro", id}))));
    return;
  }
  const mc = comboMelhor(st.cesta);
  if(mc && !st.comboOferecido){
    st.comboOferecido = true;
    botDiz("Fechando junto sai melhor: o "+mc.s.nome+" fica em "+BRL(mc.novo)+", "+BRL(mc.economia)+" a menos. Quer assim?",
      [{rot:"Quero o combinado", acao:"combo"},{rot:"Deixa separado", acao:"segue", fraca:true}]);
    return;
  }
  const t = totalCesta(st.cesta, st.comp, st.vol);
  botDiz((st.cesta.length>1 ? "Fechado: "+ss.map(s=>s.nome).join(" + ")+", "+t.txt+(t.estimado?" (estimado)":"")+"." : "Fechado.")+"\nPara quando?", diasRapidos(st));
}
function trataZap(r){
  const st = estadoZap;
  if(r.acao==="humano"){ botDiz("Combinado, já avisei "+R.principalArt+". Enquanto isso, se quiser adiantar, é só me dizer o serviço.",
      [{rot:"Quero marcar um horário", acao:"marcar"},{rot:"Recomeçar", acao:"reset", fraca:true}]); return; }
  if(r.acao==="reset"){ iniciaZap(); return; }
  if(r.acao==="ver"){
    const p = proximos();
    if(!p.length){ botDiz("Não achei horário marcado no seu número. Quer marcar um agora?",[{rot:"Quero marcar um horário", acao:"marcar"}]); return; }
    const linhas = p.map(g=>"• "+nomeGrupo(g)+" — "+dataLonga(dataDe(g.itens[0].data))+" às "+hm(g.itens[0].ini)).join("\n");
    botDiz("Você tem:\n"+linhas+"\n\nQuer fazer mais alguma coisa?",
      [{rot:"Marcar outro horário", acao:"marcar"},{rot:"Só isso, "+R.agradeco, acao:"tchau", fraca:true}]); return;
  }
  if(r.acao==="tchau"){ botDiz("Então tá! Te espero por aqui 💛",[{rot:"Recomeçar a conversa", acao:"reset", fraca:true}]); return; }
  if(r.acao==="marcar"){
    Object.assign(st, {cesta:[], pref:undefined, comp:null, vol:"medio", data:null, T:null, comboOferecido:false});
    const pop = SERVICOS.slice(0,6);
    botDiz("Boa! Qual serviço você quer?", pop.map(s=>({rot:s.nome+" · "+precoTxt(s), acao:"srv", id:s.id}))
      .concat([{rot:"Ver a tabela completa", acao:"todos", fraca:true}])); return;
  }
  if(r.acao==="todos"){ botDiz("Nossa tabela completa:", SERVICOS.map(s=>({rot:s.nome+" · "+precoTxt(s), acao:"srv", id:s.id}))); return; }
  if(r.acao==="srv" || r.acao==="add"){
    st.cesta.push(r.id);
    const s = srv(r.id);
    const extra = complementos(st);
    const txt = (r.acao==="srv" ? s.nome+" leva cerca de "+dur(s.dur)+" e "+(s.apartir?"sai a partir de "+BRL(s.preco):"sai por "+BRL(s.preco))+"."
                                : "Anotado: "+s.nome+".")+
      (extra.length && st.cesta.length<3 ? "\nQuer aproveitar a visita e fazer mais alguma coisa?" : "");
    if(extra.length && st.cesta.length<3){
      botDiz(txt, extra.map(x=>({rot:"+ "+x.nome+" · "+precoTxt(x), acao:"add", id:x.id})).concat([{rot:"Não, só isso", acao:"segue", fraca:true}]));
    } else { diz("bot", txt); seguirZap(st); }
    return;
  }
  if(r.acao==="segue"){ st.comboOferecido = true; seguirZap(st); return; }
  if(r.acao==="combo"){ const m = comboMelhor(st.cesta); if(m) st.cesta = m.cesta; st.comboOferecido = true; seguirZap(st); return; }
  if(r.acao==="comp"){
    st.comp = r.id;
    const aps = st.cesta.map(srv).filter(s=>s.apartir && s.faixas);
    diz("bot", aps.map(s=>s.nome+" para cabelo "+COMPRIMENTOS.find(c=>c.id===r.id).rotulo.toLowerCase()+": entre "+valorTxt(s, st)).join("\n")+
      "\n"+maiusc(R.principalArt)+" fecha o valor com você antes de começar.");
    pintaZap(); setTimeout(()=>seguirZap(st), 350); return;
  }
  if(r.acao==="pro"){ st.pref = r.id; seguirZap(st); return; }
  if(r.acao==="dia"){
    st.data = r.id;
    const d = dataDe(r.id), ops = opcoesDoDia(st.cesta, st.pref||null, d);
    if(!ops.length){ botDiz("Esse dia lotou. Tenho estes outros:", diasRapidos(st)); return; }
    const amostra = ops.filter((v,i)=> i%Math.max(1,Math.floor(ops.length/6))===0).slice(0,6);
    botDiz("Tenho estes horários "+dataLonga(d)+":", amostra.map(o=>({rot:hm(o.inicio)+(st.cesta.length>1?" (até "+hm(o.fim)+")":""), acao:"hora", id:o.inicio}))
      .concat([{rot:"Outro dia", acao:"outrodia", fraca:true}])); return;
  }
  if(r.acao==="outrodia"){ botDiz("Sem problema. Qual dia?", diasRapidos(st)); return; }
  if(r.acao==="hora"){
    st.T = r.id;
    const d = dataDe(st.data), pl = planejar(st.cesta, st.pref||null, d, st.T);
    const t = totalCesta(st.cesta, st.comp, st.vol);
    botDiz("Deixa eu confirmar:\n\n"+dataLonga(d)+"\n"+pl.itens.map(i=>hm(i.ini)+" "+srv(i.servicoId).nome+" com "+primeiro(pro(i.proId).nome)+(i.paralelo?" (ao mesmo tempo)":"")).join("\n")+
      "\nTotal: "+t.txt+(t.estimado?" (estimado)":"")+"\n\nPosso fechar?",
      [{rot:"Pode fechar", acao:"fechar"},{rot:"Quero trocar o horário", acao:"outrodia", fraca:true}]); return;
  }
  if(r.acao==="fechar"){
    const g = gravarVisita({cesta:st.cesta, pref:st.pref||null, comp:st.comp, vol:st.vol, foto:null, data:st.data, T:st.T}, "WhatsApp");
    if(!g){ botDiz("Poxa, esse horário acabou de ser ocupado. Escolhe outro?", diasRapidos(st)); return; }
    const n = carimbos() % FIDEL.meta;
    botDiz(["Prontinho, "+primeiro(EU.nome)+"! Seu horário está marcado ✅",
      "Te lembro um dia antes por aqui. Se precisar desmarcar, é só me chamar.\n\n"+SALAO.endereco+
      (FIDEL.ativo ? "\n\nAh: você está com "+n+" de "+FIDEL.meta+" carimbos. O prêmio é: "+nomePremio()+"." : "")],
      [{rot:"Ver meus horários", acao:"ver"},{rot:"Recomeçar", acao:"reset", fraca:true}], 800); return;
  }
}
function diasRapidos(st){
  const out = [];
  for(let k=0;k<14 && out.length<5;k++){
    const d = addDias(HOJE,k);
    if(!SALAO.abre[d.getDay()] || !temVaga(st.cesta, st.pref||null, d)) continue;
    out.push({rot: k===0?"Hoje":k===1?"Amanhã":WD[d.getDay()]+" "+d.getDate()+"/"+pad(d.getMonth()+1), acao:"dia", id:iso(d)});
  }
  if(!out.length) out.push({rot:"Falar com "+R.principalArt, acao:"humano", fraca:true});
  return out;
}

/* ============================ eventos ============================ */
document.addEventListener("click", e=>{
  const t = e.target.closest("[data-canal],[data-aba],[data-srv],[data-toggle],[data-combo],[data-trocacombo],[data-avancar],[data-comp],[data-vol],[data-pro],[data-dia],[data-hora],[data-voltar],[data-ir],[data-cancelar],[data-remarcar],[data-repetir],[data-zap]");
  if(!t) return;
  const ds = t.dataset;

  if(ds.canal){
    canal = ds.canal;
    document.querySelectorAll("[data-canal]").forEach(b=>b.setAttribute("aria-pressed", String(b.dataset.canal===canal)));
    if(canal==="zap") iniciaZap(); else pinta();
    return;
  }
  if(ds.zap !== undefined){ zapEscolhe(parseInt(ds.zap,10)); return; }
  if(ds.aba){
    confirmado = null; aba = ds.aba;
    if(aba==="agendar" && !passo) novoPasso([]);
    pinta(); return;
  }
  if(ds.ir){
    confirmado = null; aba = ds.ir;
    if(aba==="agendar") novoPasso([]);
    pinta(); return;
  }
  if(ds.srv){ novoPasso([ds.srv]); aba="agendar"; confirmado=null; pinta(); return; }
  if(ds.combo!==undefined){
    novoPasso(CFG.combos[+ds.combo].itens); aba="agendar"; confirmado=null; pinta(); return;
  }
  if(ds.trocacombo){
    const m = comboMelhor(passo.cesta);
    if(m){ passo.cesta = m.cesta; passo.data = null; passo.T = null; }
    pinta(true); return;
  }
  if(ds.toggle){
    const i = passo.cesta.indexOf(ds.toggle);
    if(i>=0) passo.cesta.splice(i,1); else passo.cesta.push(ds.toggle);
    passo.data = null; passo.T = null;
    pinta(true); return;
  }
  if(ds.avancar){ if(t.disabled) return; passo.etapa = proximaEtapa(passo.etapa); pinta(); return; }
  if(ds.comp){ passo.comp = ds.comp; pinta(true); return; }
  if(ds.vol){ passo.vol = ds.vol; pinta(true); return; }
  if(ds.pro){ passo.pref = ds.pro==="qualquer" ? null : ds.pro; passo.data=null; passo.T=null; passo.etapa = proximaEtapa("pro"); pinta(); return; }
  if(ds.dia){ passo.data = ds.dia; passo.T = null; passo.etapa = "hora"; pinta(); return; }
  if(ds.hora){ passo.T = parseInt(ds.hora,10); passo.etapa = "confirmar"; pinta(); return; }
  if(ds.voltar){
    if(passo.etapa==="servicos"){ aba = "inicio"; passo = null; }
    else passo.etapa = etapaAnterior(passo.etapa);
    pinta(); return;
  }
  if(ds.cancelar){ MEUS.forEach(m=>{ if(m.grupo===ds.cancelar) m.status="cancelado"; }); pinta(true); return; }
  if(ds.remarcar){
    const g = grupos().find(x=>x.id===ds.remarcar);
    if(g){
      const i0 = g.itens[0];
      novoPasso(g.itens.map(i=>i.servicoId));
      passo.remarcando = g.id; passo.comp = i0.comprimento || null; passo.vol = i0.volume || "medio";
      const multi = g.itens.find(i=>srv(i.servicoId).pros.length>1);
      passo.pref = multi ? multi.proId : null;
      passo.etapa = "dia"; aba = "agendar"; confirmado = null;
    }
    pinta(); return;
  }
  if(ds.repetir){ novoPasso([ds.repetir]); aba="agendar"; confirmado=null; pinta(); return; }
});

const raiz = document.documentElement, btnTema = document.getElementById("tema");
function temaAtual(){ return raiz.dataset.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light"); }
btnTema.addEventListener("click", ()=>{
  raiz.dataset.theme = temaAtual()==="dark" ? "light" : "dark";
  btnTema.textContent = temaAtual()==="dark" ? "Claro" : "Escuro";
});
btnTema.textContent = temaAtual()==="dark" ? "Claro" : "Escuro";

pinta();
})();
