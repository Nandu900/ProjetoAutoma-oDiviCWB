/* ==========================================================================
   Cadeira Cheia · painel do estabelecimento (V2 · código único)
   O MESMO arquivo serve salão, studio e barbearia. Tudo que muda de um cliente
   para outro (nomes, textos com gênero, serviços, cores) vem de config-salao.js e tema-painel.css.
   Lê TUDO de config-salao.js (window.CADEIRA_CONFIG): serviços, equipe, horários,
   rótulos e fidelidade. Trocar de estabelecimento é trocar o config, não este arquivo.
   Recursos: pausa com encaixe, R$ recuperados, funil de follow-up, lista do dia,
   fidelidade editável e estimativa do "a partir de".
   ========================================================================== */
(function(){
"use strict";

/* ============================= utilidades ============================= */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd = mulberry32(20260922);
const ri = (a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick = arr => arr[Math.floor(rnd()*arr.length)];
const pad = n => String(n).padStart(2,"0");
const iso = d => d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dayDiff=(a,b)=>Math.round((a-b)/86400000);
const BRL = v => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0});
const BRL2 = v => "R$ " + v.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const hm = m => pad(Math.floor(m/60))+":"+pad(m%60);
const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const WD = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const WDL = ["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
const MO = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
const fmtD = d => WD[d.getDay()]+", "+d.getDate()+" "+MO[d.getMonth()];
const initials = n => n.split(" ").filter(Boolean).slice(0,2).map(s=>s[0]).join("").toUpperCase();

const TODAY = new Date(); TODAY.setHours(0,0,0,0);

/* ============================= cadastro base ============================= */
const CFG = window.CADEIRA_CONFIG;
const FIDEL = CFG.fidelidade;            // editável em Configurações › Fidelidade
const R = CFG.rotulos;                   // rótulos do estabelecimento (barbearia/barbeiro/cliente)
const maiusc = t => t.charAt(0).toUpperCase() + t.slice(1);
const SHOP = {
  nome:CFG.estabelecimento.nome, tel:CFG.estabelecimento.telefone, endereco:CFG.estabelecimento.endereco,
  gradeMin:CFG.estabelecimento.gradeMin, ddd:CFG.estabelecimento.ddd, horarios:{}
};
Object.keys(CFG.horarios).forEach(k=>{ SHOP.horarios[k] = CFG.horarios[k] ? CFG.horarios[k].slice() : null; });
(function(){ const hs = Object.values(SHOP.horarios).filter(Boolean);
  SHOP.abre = Math.min(...hs.map(h=>h[0])); SHOP.fecha = Math.max(...hs.map(h=>h[1])); })();
const fechado = d => !SHOP.horarios[d.getDay()];
// jornada efetiva de um profissional num dia: cruza a escala dele com o horário da casa
function jornadaDia(p, d){
  const casa = SHOP.horarios[d.getDay()];
  if(!casa || !p.dias.includes(d.getDay())) return null;
  const ini = Math.max(p.ini, casa[0]), fim = Math.min(p.fim, casa[1]);
  return fim > ini ? [ini, fim] : null;
}

const CORES = [["--p1","--p1-soft"],["--p2","--p2-soft"],["--p3","--p3-soft"],["--p4","--p4-soft"],["--p5","--p5-soft"]];
const PROS = CFG.equipe.map((p,i)=>({id:p.id, nome:p.nome, papel:p.papel, cor:CORES[i%CORES.length][0], soft:CORES[i%CORES.length][1],
  dias:p.dias.slice(), ini:p.ini, fim:p.fim, almoco:p.almoco}));
// quem sai da equipe continua acessível para o histórico e os relatórios
const EX_PROS = [];
const proById = id => PROS.find(p=>p.id===id) || EX_PROS.find(p=>p.id===id);

// serviços vêm da configuração; teto = referência usada só para simular o valor cobrado no histórico
const SERVICOS = CFG.servicos.map(s=>({id:s.id, nome:s.nome, grupo:s.grupo, dur:s.dur, preco:s.preco, pro:s.pros.slice(),
  apartir:!!s.apartir, faixas: s.faixas ? JSON.parse(JSON.stringify(s.faixas)) : null,
  teto: s.faixas ? s.faixas.longo[1] : s.preco, pausa: s.pausa ? {apos:s.pausa.apos, dur:s.pausa.dur} : null,
  ciclo: s.ciclo || null, inclui: s.inclui ? s.inclui.slice() : null}));
const precoTxt = s => (s.apartir ? "a partir de " : "") + BRL(s.preco);
const srvById = id => SERVICOS.find(s=>s.id===id);
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
// textos derivados da configuração: nenhum dia da semana ou nome de serviço fixo no código
const DIAS_ABERTOS = Object.keys(SHOP.horarios).filter(k=>SHOP.horarios[k]).map(Number).sort((a,b)=>a-b);
const FAIXA_DIAS = DIAS_ABERTOS.length ? WDL[DIAS_ABERTOS[0]]+" a "+WDL[DIAS_ABERTOS[DIAS_ABERTOS.length-1]] : "";
const SERV_PAUSA = SERVICOS.filter(s=>s.pausa).map(s=>s.nome.toLowerCase()).join(", ") || "serviços longos";
const DO_CLI = R.doCli || (R.cli==="cliente" ? "do cliente" : "da "+R.cli);
const CONTATADO = R.contatado || "contatado", CONTATADOS = R.contatadosPl || "contatados";
const durTxt = m => m>=60 ? Math.floor(m/60)+"h"+(m%60 ? String(m%60).padStart(2,"0") : "") : m+" minutos";
const DUR_MIN = durTxt(Math.min.apply(null, SERVICOS.map(s=>s.dur)));
const DUR_MAX = durTxt(Math.max.apply(null, SERVICOS.map(s=>s.dur)));

/* ---------- régua da situação do cliente (editável em Configurações › Situação) ---------- */
const SIT = Object.assign({atrasado:1.2, risco:2, perdido:3, pesoReferencia:2, visitasConfianca:4,
  novoNaFilaApos:0.5, calibrarMin:10}, CFG.situacao || {});
// ciclo "da casa": mediana dos ciclos cadastrados — rede de segurança para serviço sem ciclo
function cicloCasa(){
  const cs = SERVICOS.filter(x=>x.ciclo).map(x=>x.ciclo).sort((a,b)=>a-b);
  return cs.length ? cs[Math.floor(cs.length/2)] : 30;
}
// ciclo de um serviço: o dele; combinado sem ciclo herda o do serviço principal
// (o primeiro da lista "inclui": em Corte + Barba, quem dita a volta é o corte)
function cicloServ(sv){
  if(!sv) return cicloCasa();
  if(sv.ciclo) return sv.ciclo;
  if(sv.inclui && sv.inclui.length){
    const base = sv.inclui.map(srvById).find(x=>x && x.ciclo);
    if(base) return base.ciclo;
  }
  return cicloCasa();
}
const cicloHerdado = sv => !sv.ciclo;
// uma visita "contém" o serviço se foi ele ou um combinado que o inclui
const contem = (visitaSrvId, alvoId) => { const v = srvById(visitaSrvId); return !!v && (v.id===alvoId || (v.inclui||[]).includes(alvoId)); };
// ciclo observado: mediana dos intervalos entre visitas seguidas que contêm o serviço
function cicloObservado(sv){
  const gaps = [], quem = new Set();
  CLIENTES.forEach(c=>{
    const vs = visitasDoCliente(c.id).filter(a=>contem(a.servicoId, sv.id));
    if(vs.length < 3) return;
    for(let i=0;i<vs.length-1;i++){
      gaps.push(dayDiff(new Date(vs[i].data+"T12:00:00"), new Date(vs[i+1].data+"T12:00:00")));
    }
    quem.add(c.id);
  });
  if(quem.size < SIT.calibrarMin || !gaps.length) return null;
  gaps.sort((a,b)=>a-b);
  return {dias: gaps[Math.floor(gaps.length/2)], clientes: quem.size};
}

/* ---------- tempo de pausa: o profissional fica livre durante o processamento ---------- */
function blocosDe(a){
  if(a.bloco || !a.pausa) return [[a.inicio, a.inicio+a.dur]];
  const x = a.inicio + a.pausa.apos, y = x + a.pausa.dur;
  return [[a.inicio, x],[y, a.inicio+a.dur]];
}
const blocosServ = (s, ini) => blocosDe({inicio:ini, dur:s.dur, pausa:s.pausa});
const cruza = (x, y) => x.some(([a,b]) => y.some(([c,d]) => a < d && c < b));
const minutosAtivos = a => blocosDe(a).reduce((t,[x,y])=>t+(y-x),0);

/* ---------- estimativa do "a partir de" ---------- */
const COMPRIMENTOS = CFG.estimativa.comprimentos, VOLUMES = CFG.estimativa.volumes;
const teto5 = v => Math.ceil(v/5)*5;
function estimativaServ(s, comp, vol){
  if(!s || !s.apartir || !s.faixas || !s.faixas[comp]) return null;
  const f = s.faixas[comp], v = VOLUMES.find(x=>x.id===vol) || VOLUMES[1];
  return [Math.max(s.preco, teto5(f[0]*(1+v.acrescimo))), teto5(f[1]*(1+v.acrescimo))];
}

// base de exemplo: nomes, observações e perfis vêm de CFG.exemplo; a lista abaixo é só o padrão
const EX = CFG.exemplo || {};
const PRIMEIROS = EX.nomes || ["João Pedro","Lucas","Rafael","Bruno","Thiago","Matheus","Gustavo","Felipe","Rodrigo","Eduardo",
"Vinícius","Leandro","Diego","Caio","André","Marcelo","Fábio","Renato","Guilherme","Daniel","Alexandre","Murilo",
"Otávio","Henrique","Danilo","Wesley","Igor","Samuel","Júlio César","Everton",
"Anderson","Cristiano","Márcio","Paulo Henrique","Ricardo","Sérgio","Wagner","Alan","Breno","Davi","Emerson","Fernando",
"Gabriel","Hugo","Ítalo","Jonas","Kleber","Luiz Felipe","Maurício","Nelson","Osvaldo","Pedro Henrique","Rogério",
"Tadeu","Ubiratan","Valter","William","Yuri","Arthur","Enzo"];
const SOBRENOMES = ["Lima","Sales","Menezes","Tavares","Prado","Carvalho","Nogueira","Ramos","Bastos","Moura","Campos",
"Pinheiro","Duarte","Aguiar","Barreto","Queiroz","Vasques","Lacerda","Fontes","Bezerra","Antunes","Pacheco","Cordeiro",
"Medeiros","Portela","Vilela","Rosa","Andrade","Serra","Cunha","Amaral","Bandeira","Peixoto","Mattos","Guedes","Paes",
"Siqueira","Freitas","Xavier","Pontes","Braga","Sampaio","Correia","Dias","Leal","Maciel","Bueno","Ferraz","Nunes","Tanaka"];
const TOTAL_CLIENTES = 420;

function telefone(){ return "("+SHOP.ddd+") 9"+ri(4000,9999)+"-"+ri(1000,9999); }

/* ============================= geração de dados ============================= */
// Cada cliente ganha uma frequência própria e um "atraso" que o coloca numa faixa.
const CLIENTES = [];
const perfis = EX.perfis || CFG.perfisExemplo || [
  {pros:["p1"], servs:["s4","s4","s1"],       freq:[14,21]},   // 0 corte e barba quinzenal
  {pros:["p1"], servs:["s1","s1","s1","s4"],  freq:[21,32]},   // 1 só corte, mensal
  {pros:["p1"], servs:["s4","s1","s4"],       freq:[25,40]},   // 2 corte e barba espaçado
  {pros:["p1"], servs:["s2","s2","s4"],       freq:[10,18]},   // 3 barba frequente
  {pros:["p1"], servs:["s5","s6","s3"],       freq:[60,95]},   // 4 progressiva
  {pros:["p1"], servs:["s6","s4","s1"],       freq:[30,50]}    // 5 combinado completo
];
const PERF_F = EX.pesos || [0,0,1,1,2,3,3,4,4,5];   // sorteio ponderado dos perfis
for(let i=0;i<TOTAL_CLIENTES;i++){
  const pi = i % PRIMEIROS.length;
  const nome = PRIMEIROS[pi] + " " + SOBRENOMES[(i*17 + Math.floor(i/PRIMEIROS.length)*7) % SOBRENOMES.length];
  const perfil = perfis[ pick(PERF_F) ];
  const freq = ri(perfil.freq[0], perfil.freq[1]);
  const novo = rnd() < .055;
  // distribuição proposital de faixas de recência
  let mult;
  const r = rnd();
  if(r < .68) mult = .02 + rnd()*1.10;      // em dia
  else if(r < .86) mult = 1.25 + rnd()*.7;  // atrasado
  else if(r < .95) mult = 2.1 + rnd()*.85;  // em risco
  else mult = 3.2 + rnd()*1.6;              // perdido
  CLIENTES.push({
    id:"c"+(i+1), nome, tel:telefone(), perfil, freq,
    ultimoGap: Math.round(freq*mult), novo, churn: mult>2, proPref: CFG.equipe[Math.floor(rnd()*CFG.equipe.length)].id,
    obs: pick(EX.obs || ["","","","","Prefere horário no fim do dia.","Máquina 1 nas laterais.","Barba sempre na navalha.","Café sem açúcar.","Vem com o filho.","Costuma atrasar 10 min.","Pele sensível: pouco álcool.","Risco do lado esquerdo."])
  });
}

const AGENDAMENTOS = [];
let seqId = 1;

function novaVisita(cliente, data, servico, proId, status){
  const s = srvById(servico);
  if(!s.pro.includes(proId)) proId = s.pro.includes(cliente.proPref) ? cliente.proPref : s.pro[0];
  // serviço "a partir de" já atendido: registra o valor fechado na avaliação
  let preco = s.preco;
  if(s.apartir && status==="atendido") preco = s.preco + 10*ri(0, Math.round((s.teto - s.preco)/10));
  const a = {
    id:"a"+(seqId++), clienteId:cliente.id, servicoId:servico, proId,
    data:iso(data), inicio:0, dur:s.dur, preco, status, encaixe:false, bloco:false,
    pausa: s.pausa ? {apos:s.pausa.apos, dur:s.pausa.dur} : null
  };
  // horários futuros de serviços "a partir de" chegam com a estimativa que o cliente viu
  if(s.apartir && (status==="agendado" || status==="confirmado")){
    a.comprimento = pick(["curto","medio","longo","longo","extra"]); a.volume = pick(["fino","medio","medio","volumoso"]);
    a.estimativa = estimativaServ(s, a.comprimento, a.volume);
  }
  AGENDAMENTOS.push(a);
}

// monta o histórico de visitas de cada cliente
CLIENTES.forEach(c=>{
  const proId = c.perfil.pros.includes(c.proPref) ? c.proPref : c.perfil.pros[0];
  if(c.novo){
    // parte dos novos já voltou uma vez: 1ª e 2ª visitas recentes, para o KPI "2º retorno" ter base
    const voltou = rnd() < .45;
    const g1 = voltou ? ri(2, 14) : ri(2, 26);
    let d1 = addDays(TODAY, -g1);
    while(fechado(d1)) d1 = addDays(d1,-1);
    novaVisita(c, d1, pick(c.perfil.servs), proId, "atendido");
    if(voltou){
      let d2 = addDays(TODAY, -(g1 + ri(6, 18)));
      while(fechado(d2)) d2 = addDays(d2,-1);
      novaVisita(c, d2, pick(c.perfil.servs), proId, "atendido");
    }
    return;
  }
  let gap = c.ultimoGap;
  let visitas = 0;
  const teto = c.churn ? 4 : 9;
  while(gap < 170 && visitas < teto){
    let d = addDays(TODAY, -gap);
    let guard=0;
    while(fechado(d) && guard++<3) d = addDays(d,-1);
    const st = rnd()<.065 ? (rnd()<.45?"cancelado":"faltou") : "atendido";
    novaVisita(c, d, pick(c.perfil.servs), proId, st);
    gap += Math.max(7, Math.round(c.freq * (0.8 + rnd()*0.55)));
    visitas++;
  }
});

// agendamentos futuros: clientes em dia voltam nos próximos dias
CLIENTES.forEach(c=>{
  if(c.novo) return;
  const proximo = c.freq - c.ultimoGap;
  if(proximo >= 0 && proximo <= 9){
    let d = addDays(TODAY, Math.max(0, proximo));
    let guard=0;
    while(fechado(d) && guard++<3) d = addDays(d,1);
    novaVisita(c, d, pick(c.perfil.servs), c.proPref, rnd()<.5 ? "confirmado" : "agendado");
  }
});

// bloqueios recorrentes de almoço e uma folga
(function(){
  for(let k=-120;k<=14;k++){
    const d = addDays(TODAY,k);
    if(fechado(d)) continue;
    PROS.forEach(p=>{
      if(!p.dias.includes(d.getDay())) return;
      AGENDAMENTOS.push({id:"b"+(seqId++), clienteId:null, servicoId:null, proId:p.id,
        data:iso(d), inicio: p.almoco, dur:60, preco:0, status:"bloqueio", bloco:true, motivo:"Almoço"});
    });
  }
})();

// demonstração: serviços com pausa nos próximos dias — hoje com um encaixe, depois com a pausa aberta
(function(){
  const sir = PROS[0];
  const comPausa = SERVICOS.filter(x=>x.pausa && x.pro.includes(sir.id));
  if(!comPausa.length) return;
  // serviço curto que cabe inteiro dentro da pausa: é ele que vira o encaixe da demonstração
  const curto = SERVICOS.filter(x=>!x.pausa && x.pro.includes(sir.id) && x.dur <= comPausa[0].pausa.dur)
                        .sort((a,b)=>a.dur-b.dur)[0];
  const quimica = CLIENTES.filter(c=>c.perfil.servs.some(id=>comPausa.some(x=>x.id===id)));
  const outras = CLIENTES.filter(c=>c.perfil.pros.includes(sir.id));
  const roteiro = [[comPausa[0].id,13*60,!!curto],
                   [comPausa[Math.min(1,comPausa.length-1)].id,14*60,false],
                   [comPausa[comPausa.length-1].id,13*60,false]];
  let k = 0, n = 0;
  while(n < roteiro.length && k < 12){
    const d = addDays(TODAY,k++);
    if(!jornadaDia(sir, d)) continue;
    const [sid, ini, comEncaixe] = roteiro[n++];
    novaVisita(pick(quimica.length?quimica:CLIENTES), d, sid, sir.id, k===1 ? "confirmado" : "agendado");
    Object.assign(AGENDAMENTOS[AGENDAMENTOS.length-1], {inicio:ini, fixo:true, pausaAberta:!comEncaixe});
    if(comEncaixe){
      const s = srvById(sid);
      novaVisita(pick(outras.length?outras:CLIENTES), d, curto.id, sir.id, "confirmado");
      Object.assign(AGENDAMENTOS[AGENDAMENTOS.length-1], {inicio:ini+s.pausa.apos, fixo:true});
    }
  }
})();

// distribui os horários no dia, sem sobreposição por profissional
(function(){
  const byKey = {};
  AGENDAMENTOS.forEach(a=>{ const k=a.data+"|"+a.proId; (byKey[k]=byKey[k]||[]).push(a); });
  const descartar = new Set();
  Object.keys(byKey).forEach(k=>{
    const [data,proId] = k.split("|");
    const p = proById(proId);
    const d = new Date(data+"T12:00:00");
    const lista = byKey[k];
    const blocos = lista.filter(a=>a.bloco || a.fixo);
    const ats = lista.filter(a=>!a.bloco && !a.fixo);
    const jd = jornadaDia(p, d);
    if(!jd){ lista.forEach(a=>descartar.add(a.id)); return; }
    const fim = jd[1];
    const ocupado = [];
    blocos.forEach(b=>{ ocupado.push(...blocosDe(b)); if(b.pausaAberta) ocupado.push([b.inicio+b.pausa.apos, b.inicio+b.pausa.apos+b.pausa.dur]); });
    const pausas = [];   // janelas de pausa já colocadas: atraem serviços curtos (encaixe)
    // peso por faixa do dia: fim de tarde e meio da manhã são os horários disputados
    const peso = m => { const h=Math.floor(m/60);
      if(h>=15 && h<19) return 2.0; if(h>=10 && h<13) return 1.5; if(h>=13 && h<14) return .5; return .9; };
    ats.sort((x,y)=> y.dur - x.dur).forEach(a=>{   // serviços longos primeiro, menos fragmentação
      const cands=[];
      const pesoP = m => peso(m) * (pausas.some(([x,y])=> m>=x && m+a.dur<=y) ? 3 : 1);
      for(let m=jd[0]; m+a.dur<=fim; m+=30){
        if(cruza(ocupado, blocosDe(Object.assign({}, a, {inicio:m})))) continue;
        cands.push(m);
      }
      if(!cands.length){ descartar.add(a.id); return; }
      const total = cands.reduce((s,m)=>s+pesoP(m),0);
      let alvo = rnd()*total, escolhido = cands[cands.length-1];
      for(const m of cands){ alvo -= pesoP(m); if(alvo<=0){ escolhido=m; break; } }
      a.inicio = escolhido;
      ocupado.push(...blocosDe(a));
      if(a.pausa){ const x = escolhido + a.pausa.apos; pausas.push([x, x + a.pausa.dur]); }
    });
  });
  for(let i=AGENDAMENTOS.length-1;i>=0;i--) if(descartar.has(AGENDAMENTOS[i].id)) AGENDAMENTOS.splice(i,1);
})();

/* ============================= consultas ============================= */
const cliById = id => CLIENTES.find(c=>c.id===id);
const noDia = d => AGENDAMENTOS.filter(a=>a.data===iso(d));
const realizados = () => AGENDAMENTOS.filter(a=>a.status==="atendido");

let IDX_CLI = {};
function reindex(){
  IDX_CLI = {};
  AGENDAMENTOS.forEach(a=>{
    if(a.clienteId && a.status==="atendido") (IDX_CLI[a.clienteId]=IDX_CLI[a.clienteId]||[]).push(a);
  });
  Object.keys(IDX_CLI).forEach(k=> IDX_CLI[k].sort((x,y)=> x.data < y.data ? 1 : -1));
}
function visitasDoCliente(id){ return IDX_CLI[id] || []; }
/* Situação do cliente
   R = dias sem vir ÷ ritmo.
   · 1 visita: ritmo = ciclo do serviço feito → Novo · Não voltou · Perdido
   · 2+ visitas: ritmo = (soma dos intervalos + peso × ciclo) ÷ (nº de intervalos + peso).
     O ciclo funciona como "intervalos imaginários": com poucas visitas segura a média,
     e perde força sozinho a cada visita nova — sem salto de uma regra para outra. */
function statsCliente(c){
  const vs = visitasDoCliente(c.id);
  const total = vs.reduce((s,a)=>s+a.preco,0);
  const datas = vs.map(a=>new Date(a.data+"T12:00:00"));
  const n = datas.length;
  // serviço que mais faz; empate → o mais recente (vs vem do mais novo para o mais antigo)
  const favorito = (()=>{ const c={}; vs.forEach(a=>c[a.servicoId]=(c[a.servicoId]||0)+1);
    const k = Object.keys(c).sort((a,b)=>c[b]-c[a])[0]; return k?srvById(k):null; })();
  const ciclo = cicloServ(favorito);
  let soma = 0;
  for(let i=0;i<n-1;i++) soma += dayDiff(datas[i], datas[i+1]);
  const freqPropria = n>=2 ? Math.max(1, Math.round(soma/(n-1))) : null;
  const k = SIT.pesoReferencia;
  const freq = n>=2 ? Math.max(1, Math.round((soma + k*ciclo)/((n-1) + k))) : null;
  const diasSem = n ? dayDiff(TODAY, datas[0]) : null;
  const ritmo = freq || ciclo;
  const razao = diasSem!=null ? diasSem/ritmo : 0;
  let faixa;
  if(n<=1) faixa = razao < 1 ? "novo" : razao < SIT.perdido ? "nao-voltou" : "perdido";
  else     faixa = razao < SIT.atrasado ? "em-dia" : razao < SIT.risco ? "atrasado" : razao < SIT.perdido ? "em-risco" : "perdido";
  const provisoria = n>=2 && n < SIT.visitasConfianca;
  const proFav = (()=>{ const m={}; vs.forEach(a=>m[a.proId]=(m[a.proId]||0)+1);
    const k = Object.keys(m).sort((a,b)=>m[b]-m[a])[0]; return k?proById(k):null; })();
  const desde = vs.length ? vs[vs.length-1].data : null;
  return {visitas:vs, total, freq, freqPropria, ciclo, ritmo, R:razao, diasSem, faixa, provisoria, favorito, proFav, desde, qtd:vs.length};
}
const FAIXAS = {
  "novo":       {rot:"Novo",       cls:"accent"},
  "nao-voltou": {rot:"Não voltou", cls:"nv"},
  "em-dia":     {rot:"Em dia",     cls:"ok"},
  "atrasado":   {rot:"Atrasado",   cls:"warn"},
  "em-risco":   {rot:"Em risco",   cls:"crit"},
  "perdido":    {rot:"Perdido",    cls:"crit"}
};
// quem entra na fila de follow-up: Novo só depois de metade do ciclo (padrão), e nunca quem está em dia
const VAGAS_1A_VISITA = 4;   // vagas da fila de follow-up reservadas para Novo e Não voltou
const naFila = s => s.qtd>0 && (["nao-voltou","atrasado","em-risco","perdido"].includes(s.faixa) ||
  (s.faixa==="novo" && s.R >= SIT.novoNaFilaApos));
function pillSituacao(s){
  const f = FAIXAS[s.faixa];
  const tip = s.provisoria ? "Provisória: só "+s.qtd+" visitas, o ritmo ainda está se formando"
            : s.qtd===1 ? "Medido pelo ciclo de "+s.ciclo+" dias do serviço"
            : "Ritmo de "+s.ritmo+" dias";
  return '<span class="pill '+f.cls+(s.provisoria?' prov':'')+'" title="'+esc(tip)+'">'+f.rot+'</span>';
}
// frase que explica a tag, usada na ficha e na fila
function porqueSituacao(s){
  const sv = s.favorito ? s.favorito.nome.toLowerCase() : "serviço";
  const dias = s.diasSem+(s.diasSem===1?" dia":" dias");
  if(s.qtd===1) return "Veio uma vez, há "+dias+" · ciclo de "+sv+": "+s.ciclo+" dias";
  return "Ritmo de "+s.ritmo+" dias"+(s.provisoria ? " (provisório: "+s.qtd+" visitas)" : "")+" · sem aparecer há "+dias;
}
const ORDEM_ST = ["agendado","confirmado","atendido","faltou","cancelado"];
const STATUS = {
  agendado:{rot:"Agendado",cls:"neutral"}, confirmado:{rot:"Confirmado",cls:"accent"},
  atendido:{rot:"Atendido",cls:"ok"}, faltou:{rot:"Faltou",cls:"crit"}, cancelado:{rot:"Cancelado",cls:"neutral"}
};

// cache de stats (recalculado quando algo muda)
let STATS = {};
// encaixe = atendimento que cabe inteiro dentro da pausa de outro, com o mesmo profissional
function marcaEncaixes(){
  const porDia = {};
  AGENDAMENTOS.forEach(a=>{ a.encaixe = false; if(!a.bloco && a.status!=="cancelado") (porDia[a.data+"|"+a.proId]=porDia[a.data+"|"+a.proId]||[]).push(a); });
  Object.values(porDia).forEach(l=>{
    l.filter(b=>b.pausa).forEach(b=>{
      const x = b.inicio + b.pausa.apos, y = x + b.pausa.dur;
      l.forEach(a=>{ if(a!==b && a.inicio>=x && a.inicio+a.dur<=y) a.encaixe = true; });
    });
  });
}
function recalcStats(){ reindex(); marcaEncaixes(); STATS = {}; CLIENTES.forEach(c=>STATS[c.id]=statsCliente(c)); }
recalcStats();

/* ============================= follow-up medido ============================= */
// contato: {id, clienteId, data, resultado: aguardando | sem-resposta | marcou | veio | nao-veio, agendamentoId}
const CONTATOS = [];
const JANELA_FU = 15;   // dias: retorno marcado até 15 dias depois da mensagem conta para o follow-up
(function semearContatos(){
  CLIENTES.forEach(c=>{
    const vs = visitasDoCliente(c.id);
    if(vs.length < 2) return;
    const d0 = new Date(vs[0].data+"T12:00:00"), d1 = new Date(vs[1].data+"T12:00:00");
    if(dayDiff(TODAY, d0) <= 60 && dayDiff(d0, d1) > c.freq*1.35 && rnd() < .3)
      CONTATOS.push({id:"fu"+(seqId++), clienteId:c.id, data:iso(addDays(d0, -ri(2,6))), resultado:"veio", agendamentoId:vs[0].id});
  });
  AGENDAMENTOS.filter(a=>!a.bloco && a.data>=iso(TODAY) && (a.status==="agendado"||a.status==="confirmado")).forEach(a=>{
    const s = STATS[a.clienteId];
    if(s && s.freq && s.diasSem > s.freq*1.3 && rnd() < .35)
      CONTATOS.push({id:"fu"+(seqId++), clienteId:a.clienteId, data:iso(addDays(TODAY,-ri(1,4))), resultado:"marcou", agendamentoId:a.id});
  });
  CLIENTES.filter(c=>{ const s = STATS[c.id]; return s.qtd>0 && ["nao-voltou","atrasado","em-risco","perdido"].includes(s.faixa); }).slice(0,110)
    .forEach(c=>{ if(rnd() < .6) CONTATOS.push({id:"fu"+(seqId++), clienteId:c.id, data:iso(addDays(TODAY,-ri(3,40))), resultado:"sem-resposta", agendamentoId:null}); });
})();
const agById = id => AGENDAMENTOS.find(x=>x.id===id);
function ultimoContato(cid){
  return CONTATOS.filter(c=>c.clienteId===cid).sort((a,b)=> a.data<b.data?1:-1)[0] || null;
}
// novo horário para quem recebeu mensagem há até 15 dias: o retorno conta para o follow-up
function vincularContato(cid, agId){
  const c = ultimoContato(cid);
  if(c && (c.resultado==="aguardando" || c.resultado==="sem-resposta") && dayDiff(TODAY, new Date(c.data+"T12:00:00")) <= JANELA_FU){
    c.resultado = "marcou"; c.agendamentoId = agId; return true;
  }
  return false;
}
function atualizaContato(a){
  const c = CONTATOS.find(x=>x.agendamentoId===a.id);
  if(!c) return;
  c.resultado = a.status==="atendido" ? "veio" : (a.status==="faltou"||a.status==="cancelado") ? "nao-veio" : "marcou";
}
function funilFU(ini, fim){
  const xs = CONTATOS.filter(c=>c.data>=iso(ini) && c.data<=iso(fim));
  const marcaram = xs.filter(c=>["marcou","veio","nao-veio"].includes(c.resultado)).length;
  const vieram = xs.filter(c=>c.resultado==="veio");
  const receita = vieram.reduce((t,c)=>{ const a = agById(c.agendamentoId); return t + (a ? a.preco : 0); }, 0);
  return {contatadas:xs.length, marcaram, vieram:vieram.length, receita};
}
// dinheiro que não entraria sem o sistema, pela data do atendimento
function recuperado(ini, fim){
  const a0 = iso(ini), a1 = iso(fim);
  let fu = 0, nFu = 0, enc = 0, nEnc = 0;
  CONTATOS.forEach(c=>{ if(c.resultado!=="veio") return; const a = agById(c.agendamentoId);
    if(a && a.status==="atendido" && a.data>=a0 && a.data<=a1){ fu += a.preco; nFu++; } });
  AGENDAMENTOS.forEach(a=>{ if(a.encaixe && a.status==="atendido" && a.data>=a0 && a.data<=a1){ enc += a.preco; nEnc++; } });
  return {total:fu+enc, fu, nFu, enc, nEnc};
}
function mudarStatus(a, st){
  a.status = st; atualizaContato(a); recalcStats();
}

/* ============================= fidelidade (prêmio fixo) ============================= */
const RESGATES = {};   // prêmios já usados por cliente
function nomePremio(){
  const p = FIDEL.premio;
  if(p.tipo==="servico"){ const s = srvById(p.servicoId); return (s ? s.nome : "Serviço")+" grátis"; }
  return "Vale de "+BRL(p.valor);
}
function valorPremio(){ const p = FIDEL.premio; if(p.tipo==="servico"){ const s = srvById(p.servicoId); return s ? s.preco : 0; } return p.valor; }
function cartela(c){
  const vs = visitasDoCliente(c.id);
  const n = FIDEL.conta==="servico" ? vs.length : new Set(vs.map(a=>a.data)).size;
  const ganhos = Math.floor(n / FIDEL.meta);
  return {n, atual: n % FIDEL.meta, disponiveis: Math.max(0, ganhos - (RESGATES[c.id]||0))};
}
CLIENTES.forEach(c=>{ const g = Math.floor(cartela(c).n / FIDEL.meta); if(g) RESGATES[c.id] = rnd() < .75 ? g : g-1; });

/* ============================= métricas ============================= */
function periodo(ini,fim){ // inclusivo, Date
  const a=iso(ini), b=iso(fim);
  return AGENDAMENTOS.filter(x=>x.data>=a && x.data<=b);
}
function resumo(ini,fim,proFiltro){
  const xs = periodo(ini,fim).filter(x=> !proFiltro || x.proId===proFiltro);
  const at = xs.filter(x=>x.status==="atendido");
  const marcados = xs.filter(x=>!x.bloco && (x.status==="atendido"||x.status==="confirmado"||x.status==="agendado"));
  const faturamento = at.reduce((s,x)=>s+x.preco,0);
  const previsto = marcados.reduce((s,x)=>s+x.preco,0);
  const minutos = marcados.reduce((s,x)=>s+minutosAtivos(x),0);      // pausa de processamento não ocupa o profissional
  const horasAt = at.reduce((s,x)=>s+minutosAtivos(x),0)/60;
  const faltas = xs.filter(x=>x.status==="faltou").length;
  // minutos disponíveis
  let disp = 0;
  const equipe = proFiltro ? PROS.filter(p=>p.id===proFiltro) : PROS;
  for(let d=new Date(ini); d<=fim; d=addDays(d,1)){
    equipe.forEach(p=>{
      const jd = jornadaDia(p, d);
      if(jd) disp += (jd[1] - jd[0]);
    });
  }
  const bloq = xs.filter(x=>x.bloco).reduce((s,x)=>s+x.dur,0);
  disp = Math.max(1, disp - bloq);
  return {
    faturamento, previsto, atendimentos:at.length, marcados:marcados.length,
    ticket: at.length ? faturamento/at.length : 0,
    horas: horasAt,
    ocupacao: minutos/disp,
    noshow: (at.length+faltas) ? faltas/(at.length+faltas) : 0
  };
}
function inicioSemana(d){ const x=new Date(d); const w=(x.getDay()+6)%7; return addDays(x,-w); }

/* ============================= estado de navegação ============================= */
let nav = "agenda";
let agendaDia = new Date(TODAY);
let agendaModo = window.innerWidth <= 760 ? "lista" : "dia";   // no celular abre na lista do dia
let filtroPro = "todos";
let filtroFaixa = "todas";
let ordem = {campo:"total", dir:"desc"};
let DOWNLOADS = null, menuExp = false;
let per = {tipo:"30d", de:null, ate:null}, menuPer = false;
let confAba = "perfil";
let previaImport = null;
let busca = "";
const contatados = new Set();
const confirmadosHoje = new Set();

const view = document.getElementById("view");
const overlay = document.getElementById("overlay");

function toast(msg){
  const host = document.getElementById("toast-host");
  host.innerHTML = '<div class="toast">'+esc(msg)+'</div>';
  setTimeout(()=>{ host.innerHTML=""; }, 2200);
}

/* ============================= render: agenda ============================= */
function agendaHTML(){
  const cols = filtroPro==="todos" ? PROS : PROS.filter(p=>p.id===filtroPro);
  const d = agendaDia;
  const aberto = !fechado(d);
  const slots = [];
  for(let m=SHOP.abre; m<SHOP.fecha; m+=SHOP.gradeMin) slots.push(m);

  let head = faixaRecuperado() + '<div class="agenda-bar">'+
    '<div class="datenav">'+
      '<button data-go="-1" aria-label="Dia anterior">‹</button>'+
      '<span class="datelabel">'+esc(fmtD(d))+'</span>'+
      '<button data-go="1" aria-label="Próximo dia">›</button>'+
    '</div>'+
    '<button class="btn sm" data-go="hoje">Hoje</button>'+
    '<div class="seg" role="group" aria-label="Modo de visualização">'+
      '<button data-modo="dia" aria-pressed="'+(agendaModo==="dia")+'">Dia</button>'+
      '<button data-modo="lista" aria-pressed="'+(agendaModo==="lista")+'">Lista</button>'+
      '<button data-modo="semana" aria-pressed="'+(agendaModo==="semana")+'">Semana</button>'+
    '</div>'+
    '<div class="spacer"></div>'+
    '<div class="seg" role="group" aria-label="Profissional">'+
      '<button data-pro="todos" aria-pressed="'+(filtroPro==="todos")+'">Todos</button>'+
      PROS.map(p=>'<button data-pro="'+p.id+'" aria-pressed="'+(filtroPro===p.id)+'">'+esc(p.nome.split(" ")[0])+'</button>').join("")+
    '</div>'+
  '</div>';

  if(agendaModo==="semana") return head + semanaHTML();

  if(!aberto){
    return head + '<div class="card"><div class="empty">'+esc(maiusc(R.casa))+' não abre '+WDL[d.getDay()]+'. Funciona de '+esc(FAIXA_DIAS)+' — use as setas para ver outro dia.</div></div>';
  }
  if(agendaModo==="lista") return head + listaHTML();

  const rowH = SHOP.gradeMin===15 ? 19 : 30;
  let grid = '<div class="gridwrap"><div class="grid" style="--rowh:'+rowH+'px;grid-template-columns:56px repeat('+cols.length+',minmax(150px,1fr))">';
  grid += '<div class="hcell" style="justify-content:flex-end"></div>';
  cols.forEach(p=>{
    const dia = noDia(d).filter(a=>a.proId===p.id && a.status!=="cancelado" && !a.bloco);
    grid += '<div class="hcell"><span class="dot" style="background:var('+p.cor+')"></span>'+esc(p.nome)+
            '<span class="cap">'+dia.length+' hor.</span></div>';
  });
  // coluna de horas
  grid += '<div class="timecol">'+slots.map(m=>'<div class="tlabel'+(m%60===0?' hour':'')+'" style="height:'+rowH+'px">'+(m%60===0?hm(m):"")+'</div>').join("")+'</div>';

  cols.forEach(p=>{
    const jd = jornadaDia(p, d);
    const trabalha = !!jd;
    let col = '<div class="col" data-pro="'+p.id+'" style="height:'+(slots.length*rowH)+'px">';
    slots.forEach(m=>{
      const off = !trabalha || m < jd[0] || m >= jd[1];
      col += '<div class="slot'+((m+SHOP.gradeMin)%60===0?' hourline':'')+(off?' off':'')+'" data-slot="'+m+'" data-pro="'+p.id+'"></div>';
    });
    noDia(d).filter(a=>a.proId===p.id).forEach(a=>{
      const top = ((a.inicio - SHOP.abre)/SHOP.gradeMin)*rowH;
      const h = Math.max(24,(a.dur/SHOP.gradeMin)*rowH - 3);
      if(a.bloco){
        col += '<div class="appt block" style="top:'+top+'px;height:'+h+'px" data-appt="'+a.id+'">'+
               '<div class="who">'+esc(a.motivo||"Bloqueado")+'</div><div class="tm">'+hm(a.inicio)+'</div></div>';
        return;
      }
      const c = cliById(a.clienteId), s = srvById(a.servicoId);
      const cls = (a.status==="atendido" ? " done" : (a.status==="cancelado"||a.status==="faltou") ? " cancel" : "") + (a.encaixe ? " encaixe" : "");
      const flag = a.status==="confirmado" ? "✓" : a.status==="faltou" ? "!" : "";
      col += '<div class="appt'+cls+'" data-appt="'+a.id+'"'+(a.encaixe?' title="Encaixe na pausa de outro atendimento"':'')+' style="top:'+top+'px;height:'+h+'px;--pc:var('+p.cor+');--pcs:var('+p.soft+')">'+
             (flag?'<span class="flag">'+flag+'</span>':'')+
             '<div class="who">'+esc(c?c.nome:"—")+'</div>'+
             (h>40?'<div class="what">'+esc(s.nome)+'</div>':'')+
             (h>58?'<div class="tm">'+hm(a.inicio)+'–'+hm(a.inicio+a.dur)+' · '+(s.apartir && a.status!=="atendido" ? "a partir de " : "")+BRL(a.preco)+'</div>':'')+
             (a.pausa && a.status!=="cancelado" && a.status!=="faltou" ? (()=>{
                 const x = a.inicio + a.pausa.apos, y = x + a.pausa.dur;
                 const usada = noDia(d).some(b=>b.encaixe && b.proId===a.proId && b.status!=="cancelado" && b.inicio>=x && b.inicio<y);
                 const pos = 'style="top:'+(a.pausa.apos/SHOP.gradeMin*rowH)+'px;height:'+(a.pausa.dur/SHOP.gradeMin*rowH)+'px"';
                 return usada ? '<div class="pausa usada" '+pos+'>Pausa · com encaixe</div>'
                   : '<div class="pausa" data-slot="'+x+'" data-pro="'+p.id+'" title="Pausa de processamento: clique para encaixar outro atendimento" '+pos+'>Pausa · livre para encaixe</div>';
               })() : '')+
             '</div>';
    });
    col += '</div>';
    grid += col;
  });
  grid += '</div></div>';

  const soPro = filtroPro==="todos" ? null : filtroPro;
  const r = resumo(d, d, soPro);
  const quem = soPro ? esc(proById(soPro).nome.split(" ")[0])+' neste dia' : 'Neste dia';
  const corBarra = soPro ? proById(soPro).cor : "--accent";
  const trabalha = !soPro || proById(soPro).dias.includes(d.getDay());
  const resumoDia = '<div class="demo" style="margin-top:14px;border-left-color:var('+corBarra+')">'+
    (trabalha
      ? quem+': <b>'+r.marcados+'</b> horários · <b>'+BRL(r.previsto)+'</b> previstos'+
        ' · ocupação de <b>'+Math.round(r.ocupacao*100)+'%</b>.'
      : esc(proById(soPro).nome.split(" ")[0])+' não trabalha '+WDL[d.getDay()]+'.')+
    ' Clique num horário livre para marcar, num agendamento para mudar o status, ou na faixa de pausa para encaixar outro atendimento.</div>';

  return head + grid + resumoDia;
}

function faixaRecuperado(){
  const ini = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  const r = recuperado(ini, TODAY);
  return '<div class="recup"><div><div class="eyebrow">Recuperado em '+MESES[TODAY.getMonth()]+'</div>'+
    '<div class="vl">'+BRL(r.total)+'</div></div>'+
    '<div class="parts"><span><b>'+BRL(r.fu)+'</b> de '+r.nFu+' cliente'+(r.nFu===1?'':'s')+' que voltaram pelo follow-up</span>'+
    '<span><b>'+BRL(r.enc)+'</b> em '+r.nEnc+' encaixe'+(r.nEnc===1?'':'s')+' na pausa de serviços longos</span></div>'+
    selo("Dinheiro que não entraria sem o sistema: atendimentos de "+R.cliPl+" que voltaram até "+JANELA_FU+" dias depois de uma mensagem de follow-up, mais atendimentos encaixados na pausa dos serviços com processamento ("+SERV_PAUSA+"). Conta só atendimento concluído, pela data em que aconteceu.")+
  '</div>';
}

function listaHTML(){
  const d = agendaDia, dia = iso(d);
  const cols = filtroPro==="todos" ? PROS : PROS.filter(p=>p.id===filtroPro);
  const ids = cols.map(p=>p.id);
  const agora = dia===iso(TODAY) ? new Date().getHours()*60 + new Date().getMinutes() : (dia < iso(TODAY) ? 24*60 : 0);
  const itens = [];
  AGENDAMENTOS.filter(a=>a.data===dia && !a.bloco && ids.includes(a.proId)).forEach(a=>{
    itens.push({t:a.inicio, tipo:"at", a});
    if(a.pausa && a.status!=="cancelado" && a.status!=="faltou"){
      const x = a.inicio + a.pausa.apos, y = x + a.pausa.dur;
      const usada = AGENDAMENTOS.some(b=>b.encaixe && b.data===dia && b.proId===a.proId && b.status!=="cancelado" && b.inicio>=x && b.inicio<y);
      if(!usada && y > agora) itens.push({t:x, tipo:"pausa", a, fim:y});
    }
  });
  cols.forEach(p=>{
    const jd = jornadaDia(p, d); if(!jd) return;
    const bl = AGENDAMENTOS.filter(a=>a.data===dia && a.proId===p.id && a.status!=="cancelado").flatMap(blocosDe).sort((x,y)=>x[0]-y[0]);
    const pausasIni = itens.filter(i=>i.tipo==="pausa" && i.a.proId===p.id).map(i=>i.t);
    let cur = jd[0];
    const janela = (x, y) => {
      const ini = Math.max(x, Math.ceil(agora/30)*30);
      if(y - ini >= 45 && !pausasIni.includes(x)) itens.push({t:ini, tipo:"livre", p, fim:y});
    };
    bl.forEach(([x,y])=>{ if(x > cur) janela(cur, x); cur = Math.max(cur, y); });
    if(jd[1] > cur) janela(cur, jd[1]);
  });
  itens.sort((x,y)=> x.t-y.t || (x.tipo==="at"?-1:1));
  if(!itens.length) return '<div class="card"><div class="empty">Ninguém trabalha neste dia com esse filtro.</div></div>';
  const prox = {agendado:["confirmado","Confirmar"], confirmado:["atendido","Atendido"]};
  const linhas = itens.map(i=>{
    if(i.tipo==="pausa"){
      const p = proById(i.a.proId), c = cliById(i.a.clienteId);
      return '<div class="lrow pausa" style="--pc:var('+p.cor+')"><span class="hr">'+hm(i.t)+'</span><div class="bd">'+
        '<b>Pausa de '+esc(p.nome.split(" ")[0])+' · '+(i.fim-i.t)+' min livres</b>'+
        '<div class="sub">Processamento de '+esc(srvById(i.a.servicoId).nome.toLowerCase())+' de '+esc(c?c.nome.split(" ")[0]:"—")+' até '+hm(i.fim)+'</div>'+
        '<div class="lacts"><button class="btn sm primary" data-slot="'+i.t+'" data-pro="'+p.id+'">Encaixar cliente</button></div></div></div>';
    }
    if(i.tipo==="livre"){
      return '<div class="lrow livre"><span class="hr">'+hm(i.t)+'</span><div class="bd">'+
        '<b>Livre com '+esc(i.p.nome.split(" ")[0])+' até '+hm(i.fim)+'</b><div class="sub">'+(i.fim-i.t)+' min sem atendimento</div>'+
        '<div class="lacts"><button class="btn sm" data-slot="'+i.t+'" data-pro="'+i.p.id+'">Marcar aqui</button></div></div></div>';
    }
    const a = i.a, p = proById(a.proId), c = cliById(a.clienteId), s = srvById(a.servicoId);
    const nx = prox[a.status];
    return '<div class="lrow'+(a.status==="cancelado"||a.status==="faltou"?" apagado":"")+'" style="--pc:var('+p.cor+')">'+
      '<span class="hr">'+hm(a.inicio)+'<small>'+hm(a.inicio+a.dur)+'</small></span>'+
      '<div class="bd"><button class="nomebtn" data-appt="'+a.id+'"><b>'+esc(c?c.nome:"—")+'</b></button>'+
        '<div class="sub"><span class="dot" style="background:var('+p.cor+');display:inline-block;margin-right:5px"></span>'+
          esc(s.nome)+' · '+esc(p.nome.split(" ")[0])+' · '+(s.apartir && a.status!=="atendido" ? "a partir de " : "")+BRL(a.preco)+'</div>'+
        '<div class="lacts"><span class="pill '+STATUS[a.status].cls+'">'+STATUS[a.status].rot+'</span>'+
          (a.encaixe?'<span class="pill accent">Encaixe</span>':'')+
          (nx ? '<button class="btn sm primary" data-rapido="'+nx[0]+'|'+a.id+'">'+nx[1]+'</button>' : '')+
          (a.status==="agendado"||a.status==="confirmado" ? '<button class="btn sm" data-rapido="faltou|'+a.id+'">Faltou</button>' : '')+
        '</div></div></div>';
  }).join("");
  const soPro = filtroPro==="todos" ? null : filtroPro;
  const r = resumo(d, d, soPro);
  return '<div class="lista">'+linhas+'</div>'+
    '<div class="demo" style="margin-top:14px">'+(soPro?esc(proById(soPro).nome.split(" ")[0])+' neste dia':'Neste dia')+': <b>'+r.marcados+'</b> horários · <b>'+BRL(r.previsto)+'</b> previstos. '+
    'Um toque confirma ou conclui; toque no nome para abrir o atendimento.</div>';
}

function semanaHTML(){
  const ini = inicioSemana(agendaDia);
  const dias = [0,1,2,3,4,5,6].map(i=>addDays(ini,i)).filter(d=>!fechado(d));
  let out = '<div class="tablewrap"><div class="weekgrid" style="grid-template-columns:repeat('+dias.length+',minmax(140px,1fr));min-width:'+(dias.length*150)+'px">';
  for(const d of dias){
    const ats = noDia(d).filter(a=>!a.bloco && a.status!=="cancelado")
      .filter(a=> filtroPro==="todos" || a.proId===filtroPro)
      .sort((a,b)=>a.inicio-b.inicio);
    const fat = ats.filter(a=>a.status!=="faltou").reduce((s,a)=>s+a.preco,0);
    const hoje = iso(d)===iso(TODAY);
    out += '<div class="daycard'+(hoje?" today":"")+'">'+
      '<h4>'+WD[d.getDay()]+' <span class="dnum">'+d.getDate()+"/"+pad(d.getMonth()+1)+'</span></h4>';
    if(!ats.length) out += '<div style="font-size:11.5px;color:var(--muted)">Sem horários</div>';
    ats.slice(0,8).forEach(a=>{
      const p = proById(a.proId), c = cliById(a.clienteId);
      out += '<div class="miniappt" data-appt="'+a.id+'" style="--pc:var('+p.cor+');--pcs:var('+p.soft+')">'+
             hm(a.inicio)+' '+esc(c?c.nome.split(" ")[0]:"—")+'</div>';
    });
    if(ats.length>8) out += '<div style="font-size:11px;color:var(--muted)">+'+(ats.length-8)+' outros</div>';
    out += '<div class="daysum"><span>'+ats.length+' hor.</span><span class="num">'+BRL(fat)+'</span></div></div>';
  }
  out += '</div></div>';
  return out;
}

/* ============================= gráficos ============================= */
function svgLinha(pontos, rot){
  const W=640,H=200,PL=52,PR=12,PT=12,PB=26;
  const max = Math.max(1,...pontos)*1.15;
  const x = i => PL + (i/(pontos.length-1))*(W-PL-PR);
  const y = v => PT + (1-v/max)*(H-PT-PB);
  let dPath="", aPath="";
  pontos.forEach((v,i)=>{ dPath += (i?" L":"M")+x(i).toFixed(1)+" "+y(v).toFixed(1); });
  aPath = dPath+" L"+x(pontos.length-1).toFixed(1)+" "+(H-PB)+" L"+x(0).toFixed(1)+" "+(H-PB)+" Z";
  let ticks="";
  for(let k=0;k<=2;k++){
    const v = max*k/2, yy=y(v);
    ticks += '<line x1="'+PL+'" y1="'+yy.toFixed(1)+'" x2="'+(W-PR)+'" y2="'+yy.toFixed(1)+'" stroke="var(--line)" stroke-width="1"/>'+
             '<text x="'+(PL-8)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+BRL(Math.round(v))+'</text>';
  }
  let labs="";
  [0, Math.floor(pontos.length/2), pontos.length-1].forEach(i=>{
    labs += '<text x="'+x(i).toFixed(1)+'" y="'+(H-6)+'" text-anchor="'+(i===0?"start":i===pontos.length-1?"end":"middle")+'" font-size="11" fill="var(--muted)">'+esc(rot[i])+'</text>';
  });
  const last = pontos.length-1;
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Faturamento diário">'+
    '<defs><linearGradient id="fadeA" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0%" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>'+
    '</linearGradient></defs>'+ticks+
    '<path d="'+aPath+'" fill="url(#fadeA)"/>'+
    '<path d="'+dPath+'" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<circle cx="'+x(last).toFixed(1)+'" cy="'+y(pontos[last]).toFixed(1)+'" r="4" fill="var(--accent)"/>'+
    labs+'</svg>';
}
function svgBarras(itens){ // [{rot, val, cor}]
  const W=640,H=200,PL=52,PR=12,PT=14,PB=30;
  const max = Math.max(1,...itens.map(i=>i.val))*1.18;
  const bw = (W-PL-PR)/itens.length;
  let out="";
  for(let k=0;k<=2;k++){
    const v=max*k/2, yy=PT+(1-v/max)*(H-PT-PB);
    out += '<line x1="'+PL+'" y1="'+yy.toFixed(1)+'" x2="'+(W-PR)+'" y2="'+yy.toFixed(1)+'" stroke="var(--line)"/>'+
           '<text x="'+(PL-8)+'" y="'+(yy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="var(--muted)">'+BRL(Math.round(v))+'</text>';
  }
  const rotula = itens.length <= 8;   // com muitas barras o valor em cima não cabe
  itens.forEach((it,i)=>{
    const h=(it.val/max)*(H-PT-PB), xx=PL+i*bw+bw*0.22, w=bw*0.56, yy=H-PB-h;
    out += '<rect x="'+xx.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(2,h).toFixed(1)+'" rx="4" fill="var('+(it.cor||"--accent")+')"/>'+
           (rotula ? '<text x="'+(xx+w/2).toFixed(1)+'" y="'+(yy-6).toFixed(1)+'" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink-2)">'+BRL(it.val)+'</text>' : '')+
           '<text x="'+(xx+w/2).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle" font-size="11" fill="var(--muted)">'+esc(it.rot)+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Comparativo por barras">'+out+'</svg>';
}
function svgBarrasH(itens){
  const W=640, rowH=28, PT=6, PL=196, PR=64;
  const H = PT*2 + itens.length*rowH;
  const max = Math.max(1,...itens.map(i=>i.val));
  let out="";
  itens.forEach((it,i)=>{
    const yy = PT + i*rowH + 5, h = rowH-12;
    const w = (it.val/max)*(W-PL-PR);
    out += '<text x="'+(PL-10)+'" y="'+(yy+h/2+4).toFixed(1)+'" text-anchor="end" font-size="12" fill="var(--ink-2)">'+esc(it.rot.length>27 ? it.rot.slice(0,26)+"…" : it.rot)+'</text>'+
           '<rect x="'+PL+'" y="'+yy+'" width="'+Math.max(2,w).toFixed(1)+'" height="'+h+'" rx="4" fill="var(--accent)" opacity="'+(0.45+0.55*(it.val/max)).toFixed(2)+'"/>'+
           '<text x="'+(PL+w+8).toFixed(1)+'" y="'+(yy+h/2+4).toFixed(1)+'" font-size="11.5" font-weight="600" fill="var(--ink-2)">'+BRL(it.val)+'</text>';
  });
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Serviços por faturamento">'+out+'</svg>';
}
function svgHoras(vals, rot){
  const W=640,H=180,PL=34,PR=12,PT=14,PB=28;
  const max=Math.max(1,...vals)*1.2, bw=(W-PL-PR)/vals.length;
  let out="";
  vals.forEach((v,i)=>{
    const h=(v/max)*(H-PT-PB), xx=PL+i*bw+bw*0.18, w=bw*0.64, yy=H-PB-h;
    const quiet = v <= Math.max(1, Math.max(...vals)*0.28);
    out += '<rect x="'+xx.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+Math.max(2,h).toFixed(1)+'" rx="3" fill="var('+(quiet?"--warn":"--accent")+')" opacity="'+(quiet?".85":"1")+'"/>'+
           '<text x="'+(xx+w/2).toFixed(1)+'" y="'+(H-10)+'" text-anchor="middle" font-size="10.5" fill="var(--muted)">'+esc(rot[i])+'</text>';
  });
  out += '<text x="'+PL+'" y="10" font-size="10.5" fill="var(--muted)">atendimentos</text>';
  return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Atendimentos por hora do dia">'+out+'</svg>';
}

function delta(atual, anterior, rotulo){
  const txt = rotulo || "vs. período anterior";
  if(!anterior) return '<div class="dt">sem base de comparação</div>';
  const p = (atual-anterior)/anterior*100;
  const cls = p>=0 ? "up":"down";
  return '<div class="dt"><b class="'+cls+'">'+(p>=0?"▲":"▼")+" "+Math.abs(p).toFixed(0)+'%</b> '+esc(txt)+'</div>';
}

function selo(texto, fim){
  return '<button type="button" class="info'+(fim?" fim":"")+'" data-tip="'+esc(texto)+'" '+
         'aria-label="Como este número é calculado: '+esc(texto)+'">i</button>';
}

const PERIODOS = [["1d","Hoje"],["7d","7 dias"],["30d","30 dias"],["mes","Este mês"]];
const dataCurta = d => pad(d.getDate())+"/"+pad(d.getMonth()+1);

function faixaPeriodo(){
  let ini, fim = new Date(TODAY);
  if(per.tipo==="1d")       ini = new Date(TODAY);
  else if(per.tipo==="7d")  ini = addDays(TODAY,-6);
  else if(per.tipo==="30d") ini = addDays(TODAY,-29);
  else if(per.tipo==="mes") ini = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  else { ini = new Date(per.de+"T12:00:00"); fim = new Date(per.ate+"T12:00:00"); }
  ini.setHours(0,0,0,0); fim.setHours(0,0,0,0);
  if(fim < ini){ const t = ini; ini = fim; fim = t; }
  return [ini, fim];
}
function rotuloPeriodo(ini, fim){
  const n = dayDiff(fim,ini) + 1;
  if(n===1) return iso(ini)===iso(TODAY) ? "hoje, "+dataCurta(ini) : dataCurta(ini);
  return dataCurta(ini)+" a "+dataCurta(fim)+" · "+n+" dias";
}

function barraPeriodo(ini, fim){
  const escolhido = per.tipo==="custom";
  return '<div class="perbar">'+
    '<div class="seg" role="group" aria-label="Período">'+
      PERIODOS.map(([k,r])=>'<button data-per="'+k+'" aria-pressed="'+(per.tipo===k)+'">'+r+'</button>').join("")+
    '</div>'+
    '<div class="perwrap">'+
      '<button class="btn sm" data-per="menu" aria-expanded="'+menuPer+'">'+
        (escolhido ? dataCurta(ini)+" a "+dataCurta(fim) : "Escolher datas")+' ▾</button>'+
      (menuPer ? '<div class="permenu">'+
        '<div class="row2">'+
          '<div class="field"><label class="fl" for="p-de">De</label>'+
            '<input type="date" id="p-de" value="'+iso(ini)+'" max="'+iso(TODAY)+'"></div>'+
          '<div class="field"><label class="fl" for="p-ate">Até</label>'+
            '<input type="date" id="p-ate" value="'+iso(fim)+'" max="'+iso(TODAY)+'"></div>'+
        '</div>'+
        '<div class="peracts">'+
          '<button class="btn sm" data-per="cancelar">Cancelar</button>'+
          '<button class="btn sm primary" data-per="aplicar">Aplicar</button>'+
        '</div></div>' : '')+
    '</div>'+
    '<span class="perlabel">'+esc(rotuloPeriodo(ini,fim))+'</span>'+
  '</div>';
}

/* ---------- ordem dos indicadores: editável pelo botão "Editar ordem", guardada neste navegador ---------- */
const KPI_PADRAO = ["rec","fat","ticket","atend","ocup","horas","ret2","noshow"];
const KPI_CHAVE = "cadeira:kpis:"+CFG.estabelecimento.nome.toLowerCase().replace(/[^a-z0-9]+/g,"-");
let editandoKpis = false;
let kpiOrdem = (()=>{ try{ const v = JSON.parse(localStorage.getItem(KPI_CHAVE)||"null"); return Array.isArray(v) ? v : KPI_PADRAO.slice(); }catch(e){ return KPI_PADRAO.slice(); } })();
function salvarOrdemKpis(){ try{ localStorage.setItem(KPI_CHAVE, JSON.stringify(kpiOrdem)); }catch(e){} }
// indicador que não estiver na ordem salva (ex.: um card novo numa versão futura) entra no fim
function ordenarKpis(ks){
  const pos = id => { const i = kpiOrdem.indexOf(id); return i<0 ? 999 + KPI_PADRAO.indexOf(id) : i; };
  return ks.slice().sort((a,b)=>pos(a.id)-pos(b.id));
}
function normalizarOrdem(){ kpiOrdem = ordenarKpis(KPI_PADRAO.map(id=>({id}))).map(k=>k.id); }
function moverKpi(id, alvo){   // alvo: índice final
  normalizarOrdem();
  const de = kpiOrdem.indexOf(id); if(de<0) return;
  kpiOrdem.splice(de,1); kpiOrdem.splice(Math.max(0, Math.min(kpiOrdem.length, alvo)), 0, id);
  salvarOrdemKpis();
}
function kpiBarra(){
  const mexeu = kpiOrdem.join()!==KPI_PADRAO.join();
  return '<div class="kpibar"><span class="eyebrow">Indicadores</span>'+
    (editandoKpis
      ? '<span class="kdica">Arraste os cards ou use as setas</span>'+
        (mexeu ? '<button class="btn sm" data-kpi-edit="padrao">Restaurar padrão</button>' : '')+
        '<button class="btn sm primary" data-kpi-edit="fim">Concluir</button>'
      : '<button class="btn sm" data-kpi-edit="abrir"><svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4m0 16-3.5-3.5M17 20l3.5-3.5"/></svg>Editar ordem</button>')+
  '</div>';
}

// coorte: 1ª visita no período → voltou / não voltou / ainda no ciclo
function segundoRetorno(ini, fim){
  const a0 = iso(ini), a1 = iso(fim);
  let voltou = 0, naoVoltou = 0, pendente = 0;
  CLIENTES.forEach(c=>{
    const s = STATS[c.id];
    if(!s || !s.qtd) return;
    const primeira = s.visitas[s.visitas.length-1].data;
    if(primeira < a0 || primeira > a1) return;
    if(s.qtd >= 2) voltou++;
    else if(s.faixa==="novo") pendente++;
    else naoVoltou++;
  });
  const dec = voltou + naoVoltou;
  return {taxa: dec ? voltou/dec : null, voltou, naoVoltou, pendente, dec};
}
function resultadosHTML(){
  const [ini, fim] = faixaPeriodo();
  const nDias = dayDiff(fim, ini) + 1;
  const atual = resumo(ini, fim);
  const anterior = resumo(addDays(ini, -nDias), addDays(ini, -1));
  const umDia = nDias === 1;
  const rot = rotuloPeriodo(ini, fim);
  const comp = nDias===1 ? "vs. o dia anterior" : "vs. os "+nDias+" dias anteriores";

  const rec = recuperado(ini, fim), recAnt = recuperado(addDays(ini, -nDias), addDays(ini, -1));
  const sr = segundoRetorno(ini, fim), srAnt = segundoRetorno(addDays(ini, -nDias), addDays(ini, -1));
  const kpis = [
    {id:"rec", lb:"Recuperado", vl:BRL(rec.total), dt:delta(rec.total, recAnt.total, comp),
     tip:"Receita que não entraria sem o sistema: "+BRL(rec.fu)+" de "+rec.nFu+" clientes que voltaram pelo follow-up e "+BRL(rec.enc)+" de "+rec.nEnc+" encaixes na pausa de serviços longos. Conta só atendimento concluído no período."},
    {id:"fat", lb:"Faturamento", vl:BRL(atual.faturamento), dt:delta(atual.faturamento, anterior.faturamento, comp),
     tip:"Soma do valor dos atendimentos marcados como Atendido dentro do período escolhido. Serviços “a partir de” entram pelo valor fechado na avaliação, não pelo mínimo da tabela. Agendados, faltas e cancelamentos ficam de fora. A comparação usa um período igual, imediatamente anterior."},
    {id:"ticket", lb:"Ticket médio", vl:BRL2(atual.ticket), dt:delta(atual.ticket, anterior.ticket, comp),
     tip:"Faturamento do período dividido pelo número de atendimentos realizados. Sobe quando o mix de serviços fica mais caro, não só quando o preço sobe."},
    {id:"atend", lb:"Atendimentos", vl:String(atual.atendimentos), dt:delta(atual.atendimentos, anterior.atendimentos, comp),
     tip:"Quantos atendimentos foram concluídos no período. "+maiusc(R.cliUm||"um cliente")+" que veio três vezes conta três."},
    {id:"ocup", lb:"Ocupação", vl:Math.round(atual.ocupacao*100)+"%", dt:delta(atual.ocupacao, anterior.ocupacao, comp),
     tip:"Minutos com "+R.proA+" ocupado divididos pelos minutos de jornada do período"+(PROS.length>1?", somando "+R.proAsPl:"")+". A pausa de processamento ("+SERV_PAUSA+") não conta como ocupada: é janela de encaixe. Almoço e folga saem da conta."},
    {id:"horas", lb:"Horas trabalhadas", vl:atual.horas.toFixed(1)+"h", dt:delta(atual.horas, anterior.horas, comp),
     tip:"Tempo de cadeira ocupada nos atendimentos já realizados"+(PROS.length>1?", somando "+R.proAsPl:"")+". A pausa de processamento fica de fora."},
    {id:"ret2", lb:"2º retorno", vl: sr.taxa==null ? "—" : Math.round(sr.taxa*100)+"%",
     dt: '<div class="dt">'+(sr.dec ? sr.voltou+' de '+sr.dec+' voltaram' : 'ninguém fechou o ciclo ainda')+(sr.pendente ? ' · '+sr.pendente+' ainda no ciclo' : '')+
         (sr.taxa!=null && srAnt.taxa!=null ? ' · antes '+Math.round(srAnt.taxa*100)+'%' : '')+'</div>',
     tip:"Dos "+R.cliPl+" que vieram pela primeira vez no período, quantos voltaram uma segunda vez. Só conta quem já teve tempo de decidir: voltou, ou passou do ciclo do serviço sem voltar. Quem ainda está dentro do ciclo fica de fora da conta. É o termômetro da primeira experiência."},
    {id:"noshow", lb:"No-show", vl:(atual.noshow*100).toFixed(1)+"%", dt:delta(atual.noshow, anterior.noshow, comp),
     tip:"Faltas divididas por faltas mais atendidos, no período. Cancelamento avisado não entra: ele libera a cadeira, a falta não."}
  ];

  const doPeriodo = () => periodo(ini, fim).filter(a=>a.status==="atendido");

  // gráfico principal: por dia; num período de um dia só, por hora
  let grafico, tituloG, capG, tipG;
  if(umDia){
    const vals=[], lbl=[];
    for(let h=8;h<=20;h++){ lbl.push(h+"h");
      vals.push({rot:h+"h", val: doPeriodo().filter(a=>a.inicio>=h*60 && a.inicio<(h+1)*60).reduce((x,a)=>x+a.preco,0)}); }
    grafico = svgBarras(vals);
    tituloG = "Faturamento por hora";
    capG = "Como o dinheiro entrou ao longo do dia";
    tipG = "Faturamento de cada faixa de hora do dia escolhido. Só conta atendimento realizado — horário com agendamento ainda não atendido aparece zerado.";
  } else {
    const pts=[], lbl=[];
    for(let d=new Date(ini); d<=fim; d=addDays(d,1)){
      pts.push(periodo(d,d).filter(a=>a.status==="atendido").reduce((x,a)=>x+a.preco,0));
      lbl.push(dataCurta(d));
    }
    grafico = svgLinha(pts, lbl);
    tituloG = "Faturamento por dia";
    capG = "Cada dia do período, somando apenas atendimentos realizados";
    tipG = "Quanto entrou em cada dia do período escolhido. Só conta atendimento realizado, por isso domingo, folga e dias ainda por vir aparecem zerados.";
  }

  const porPro = PROS.map(p=>({rot:p.nome.split(" ")[0], cor:p.cor,
    val: doPeriodo().filter(a=>a.proId===p.id).reduce((x,a)=>x+a.preco,0)}));
  const porServ = SERVICOS.map(x=>({rot:x.nome,
    val: doPeriodo().filter(a=>a.servicoId===x.id).reduce((y,a)=>y+a.preco,0)}))
    .filter(x=>x.val>0).sort((a,b)=>b.val-a.val).slice(0,7);

  const horas=[], hrot=[];
  for(let h=9;h<=19;h++){ hrot.push(h+"h");
    horas.push(doPeriodo().filter(a=>a.inicio>=h*60 && a.inicio<(h+1)*60).length); }
  const temMovimento = horas.some(v=>v>0);
  const pior = temMovimento ? hrot[horas.indexOf(Math.min(...horas))] : null;

  const vazio = atual.atendimentos===0 && atual.marcados===0;

  return '<div class="demo">Os números abaixo respeitam o período escolhido — '+esc(rot)+
      '. Mudar um status na agenda muda o painel na hora.</div>'+
   barraPeriodo(ini, fim)+
   (vazio ? '<div class="card"><div class="empty">Nenhum atendimento nesse período. Escolha outro intervalo.</div></div>' :
   kpiBarra()+
   '<div class="kpis'+(editandoKpis?' editando':'')+'">'+ordenarKpis(kpis).map((k,i,arr)=>'<div class="kpi" data-kid="'+k.id+'"'+(editandoKpis?' draggable="true"':'')+'>'+
     (editandoKpis ? '<div class="kmove"><button data-kpi-move="'+k.id+':-1" aria-label="Mover '+esc(k.lb)+' para trás"'+(i===0?' disabled':'')+'>‹</button>'+
       '<span class="kpos">'+(i+1)+'</span>'+
       '<button data-kpi-move="'+k.id+':1" aria-label="Mover '+esc(k.lb)+' para frente"'+(i===arr.length-1?' disabled':'')+'>›</button></div>' : '')+
     '<div class="lb"><span>'+k.lb+'</span>'+(editandoKpis?'':selo(k.tip, true))+
     '</div><div class="vl">'+k.vl+'</div>'+k.dt+'</div>').join("")+'</div>'+
   '<div class="charts">'+
     '<div class="chart wide"><h3>'+tituloG+selo(tipG)+'</h3><div class="cap">'+capG+'</div>'+grafico+'</div>'+
     '<div class="chart"><h3>Faturamento por profissional'+selo("Valor dos atendimentos realizados no período, separado por quem atendeu. É a base para comparar cadeiras e calcular comissão.")+'</h3><div class="cap">'+esc(rot)+'</div>'+svgBarras(porPro)+'</div>'+
     '<div class="chart"><h3>Serviços que mais faturam'+selo("Faturamento do período por serviço, os sete maiores. Ordena por dinheiro, não por volume: um serviço caro e raro pode render mais que um barato e frequente.")+'</h3><div class="cap">'+esc(rot)+'</div>'+svgBarrasH(porServ)+'</div>'+
     '<div class="chart wide"><h3>Movimento por hora do dia'+selo("Quantos atendimentos começaram em cada faixa de hora, dentro do período escolhido. As barras douradas marcam as faixas mais fracas.")+'</h3><div class="cap">'+
        (pior ? 'No período, o horário mais fraco é '+esc(pior)+', candidato natural a promoção' : 'Sem atendimentos no período')+
        '</div>'+svgHoras(horas,hrot)+'</div>'+
   '</div>');
}


/* ============================= clientes ============================= */
const COLUNAS = [
  {k:"nome",    rot:"Cliente",       tipo:"txt", padrao:"asc"},
  {k:"faixa",   rot:"Situação",      tipo:"num", padrao:"asc"},
  {k:"diasSem", rot:"Última visita", tipo:"num", padrao:"desc"},
  {k:"freq",    rot:"Frequência",    tipo:"num", padrao:"asc"},
  {k:"qtd",     rot:"Visitas",       tipo:"num", padrao:"desc"},
  {k:"total",   rot:"Total gasto",   tipo:"num", padrao:"desc"}
];
const RANK_FAIXA = {"em-dia":0,"novo":1,"atrasado":2,"nao-voltou":3,"em-risco":4,"perdido":5};
function valorCol(x, k){
  if(k==="nome")  return x.c.nome.toLocaleLowerCase("pt-BR");
  if(k==="faixa") return RANK_FAIXA[x.s.faixa];
  return x.s[k];
}
const filtrosAtivos = () => busca || filtroFaixa!=="todas" || ordem.campo!=="total" || ordem.dir!=="desc";

function linhasClientes(){
  const col = COLUNAS.find(c=>c.k===ordem.campo) || COLUNAS[5];
  const sinal = ordem.dir==="asc" ? 1 : -1;
  return CLIENTES.map(c=>({c, s:STATS[c.id]}))
    .filter(x=>x.s.qtd>0)
    .filter(x=> filtroFaixa==="todas" || x.s.faixa===filtroFaixa)
    .filter(x=> !busca || x.c.nome.toLowerCase().includes(busca) || x.c.tel.includes(busca))
    .sort((a,b)=>{
      let va = valorCol(a, col.k), vb = valorCol(b, col.k);
      if(col.tipo==="txt") return sinal * String(va).localeCompare(String(vb),"pt-BR");
      // sem valor (frequência de quem só tem uma visita) sempre no fim
      if(va==null) return 1;
      if(vb==null) return -1;
      return sinal * (va - vb);
    });
}

function clientesHTML(){
  const linhas = linhasClientes();
  const cont = {};
  CLIENTES.forEach(c=>{ const f=STATS[c.id]; if(f.qtd>0) cont[f.faixa]=(cont[f.faixa]||0)+1; });

  let filtros = '<div class="filters">'+
    '<input class="search" id="busca" placeholder="Buscar por nome ou telefone" value="'+esc(busca)+'">'+
    '<button class="chip" data-faixa="todas" aria-pressed="'+(filtroFaixa==="todas")+'">Todos</button>'+
    Object.keys(FAIXAS).map(k=>'<button class="chip" data-faixa="'+k+'" aria-pressed="'+(filtroFaixa===k)+'">'+
      FAIXAS[k].rot+' ('+(cont[k]||0)+')</button>').join("")+
    (filtrosAtivos() ? '<button class="btn sm" data-clear="1">Limpar filtros</button>' : '')+
    (DOWNLOADS ? '<div class="expwrap">'+
        '<button class="btn sm" data-exp="menu" aria-expanded="'+menuExp+'">Exportar ▾</button>'+
        (menuExp ? '<div class="expmenu" role="menu">'+
          '<button class="expopt" role="menuitem" data-exp="csv" title="'+TIP_CSV+'" data-tip="'+TIP_CSV+'">'+
            '<b>CSV</b><span>.csv</span></button>'+
          '<button class="expopt" role="menuitem" data-exp="xlsx" title="'+TIP_XLSX+'" data-tip="'+TIP_XLSX+'">'+
            '<b>XLSX</b><span>.xlsx</span></button>'+
        '</div>' : '')+
      '</div>' : '')+
  '</div>';

  const cabecalho = COLUNAS.map(c=>{
    const ativa = c.k===ordem.campo;
    const seta = ativa ? (ordem.dir==="asc" ? "▲" : "▼") : "↕";
    return '<th data-sort="'+c.k+'"'+(ativa?' aria-sort="'+(ordem.dir==="asc"?"ascending":"descending")+'"':'')+
           ' title="Ordenar por '+esc(c.rot)+'">'+esc(c.rot)+'<span class="arr">'+seta+'</span></th>';
  }).join("");

  let tabela = '<div class="card"><div class="tablewrap"><table><thead><tr>'+
    cabecalho+
    '</tr></thead><tbody>'+
    (linhas.length ? linhas.slice(0,60).map(({c,s})=>{
      const p = proById(pick2(c));
      return '<tr data-cli="'+c.id+'">'+
        '<td><div class="cellname"><span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+initials(c.nome)+'</span>'+
        '<span><span class="nm">'+esc(c.nome)+'</span><br><span class="ph">'+esc(c.tel)+'</span></span></div></td>'+
        '<td>'+pillSituacao(s)+'</td>'+
        '<td class="num">'+(s.diasSem===0?"hoje":s.diasSem+(s.diasSem===1?" dia":" dias"))+'</td>'+
        '<td class="num">'+(s.freq ? "a cada "+s.freq+"d" : '<span style="color:var(--muted)" title="Ciclo do serviço, usado até existir a 2ª visita">ref. '+s.ciclo+'d</span>')+'</td>'+
        '<td class="num">'+s.qtd+'</td>'+
        '<td class="num" style="font-weight:600">'+BRL(s.total)+'</td></tr>';
    }).join("") : '<tr><td colspan="6"><div class="empty">'+maiusc(R.nenhumCli||"nenhum cliente")+' nesse filtro.</div></td></tr>')+
    '</tbody></table></div>'+
    (linhas.length>60 ? '<div class="empty" style="padding:12px">Mostrando 60 de '+linhas.length+' clientes, na ordem escolhida. Clique num título de coluna para reordenar, ou use a busca.</div>' : '')+
    '</div>';

  return '<div class="demo">'+CLIENTES.filter(c=>STATS[c.id].qtd>0).length+' '+esc(R.cliPl)+' com histórico. A situação compara os dias sem vir com o ritmo de '+(R.cadaUm||'cada um')+'; quem veio uma vez só é medido pelo ciclo do serviço que fez. '+
    '<b>Novo</b> dura até o fim desse ciclo; depois vira <b>Não voltou</b>. Tag tracejada = provisória (menos de '+SIT.visitasConfianca+' visitas). Clique no título de uma coluna para ordenar, ou numa linha para abrir a ficha.</div>'+filtros+tabela;
}
function pick2(c){ const s = STATS[c.id]; return s && s.proFav ? s.proFav.id : c.perfil.pros[0]; }

/* ============================= follow-up ============================= */
function mensagemFU(c,s){
  const nome = c.nome.split(" ")[0];
  const serv = s.favorito ? s.favorito.nome.toLowerCase() : "seu horário";
  const k = cartela(c), falta = FIDEL.meta - k.atual;
  const fid = FIDEL.ativo && k.n>0 && falta<=2 ? " Ah: faltam só "+falta+" visita"+(falta>1?"s":"")+" para o seu prêmio ("+nomePremio().toLowerCase()+")." : "";
  return mensagemBase(c,s,nome,serv) + fid;
}
function mensagemBase(c,s,nome,serv){
  const mes = s.visitas.length ? MESES[new Date(s.visitas[0].data+"T12:00:00").getMonth()] : "";
  if(s.faixa==="novo")       return "Oi, "+nome+"! Aqui é "+(R.artigoNome||"do")+" "+SHOP.nome+". Já faz "+s.diasSem+" dias do seu "+serv+" — quer deixar o próximo horário garantido?";
  if(s.faixa==="nao-voltou") return "Oi, "+nome+"! Aqui é "+(R.artigoNome||"do")+" "+SHOP.nome+". Você esteve aqui em "+mes+" para "+serv+" e eu queria saber: como ficou? Se quiser voltar, tenho horário essa semana.";
  if(s.faixa==="perdido" && s.qtd===1) return "Oi, "+nome+"! Faz um tempo desde sua visita em "+mes+". Se quiser dar uma nova chance, separei uma condição especial de retorno para "+serv+".";
  if(s.faixa==="atrasado") return "Oi, "+nome+"! Faz "+s.diasSem+" dias desde seu último horário de "+serv+". Quer que eu guarde um horário essa semana?";
  if(s.faixa==="em-risco") return "Oi, "+nome+"! Senti sua falta por aqui. Tenho horário livre quinta e sexta para "+serv+" — quer que eu reserve um?";
  return "Oi, "+nome+"! Faz um tempo que você não aparece. Separei uma condição especial de retorno no horário de "+serv+". Posso te encaixar?";
}
function followupHTML(){
  const amanha = (()=>{ let d=addDays(TODAY,1); let g=0; while(fechado(d) && g++<7) d=addDays(d,1); return d; })();
  const conf = noDia(amanha).filter(a=>!a.bloco && (a.status==="agendado"||a.status==="confirmado")).sort((a,b)=>a.inicio-b.inicio);

  const recente = cid => { const u = ultimoContato(cid); return u && (u.resultado==="aguardando"||u.resultado==="marcou") && dayDiff(TODAY, new Date(u.data+"T12:00:00")) <= JANELA_FU; };
  const cands = CLIENTES.map(c=>({c,s:STATS[c.id]}))
    .filter(x=> naFila(x.s) && (contatados.has(x.c.id) || !recente(x.c.id)));
  // quem veio uma vez gastou pouco e nunca chegaria ao topo por valor: tem vaga reservada.
  // Não voltou primeiro (já passou do ciclo), depois Novo; em cada um, o mais recente antes
  const primeiraVez = cands.filter(x=>x.s.qtd===1 && x.s.faixa!=="perdido")
    .sort((a,b)=> (a.s.faixa==="nao-voltou"?0:1)-(b.s.faixa==="nao-voltou"?0:1) || a.s.diasSem-b.s.diasSem)
    .slice(0, VAGAS_1A_VISITA);
  const fila = cands.filter(x=>!primeiraVez.includes(x)).sort((a,b)=> b.s.total-a.s.total)
    .slice(0, 14-primeiraVez.length).concat(primeiraVez);

  let a = '<div class="card"><div class="cardhead"><h3>Confirmar amanhã</h3>'+
    '<span class="cap">'+esc(fmtD(amanha))+' · '+conf.length+' horários</span></div><div class="fulist">'+
    (conf.length ? conf.map(x=>{
      const c=cliById(x.clienteId), p=proById(x.proId), s=srvById(x.servicoId);
      const ok = confirmadosHoje.has(x.id) || x.status==="confirmado";
      return '<div class="fuitem"><span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+initials(c.nome)+'</span>'+
        '<div class="bd"><b>'+esc(c.nome)+'</b> <span class="pill neutral">'+hm(x.inicio)+'</span>'+
        '<div class="why">'+esc(s.nome)+' com '+esc(p.nome.split(" ")[0])+' · '+esc(c.tel)+'</div>'+
        (ok ? '<div class="done-note">✓ Confirmado</div>'+
              '<div class="fuacts"><button class="btn sm" data-cli="'+c.id+'">Ver ficha</button></div>'
            : '<div class="msg">Oi, '+esc(c.nome.split(" ")[0])+'! Confirmando seu horário de amanhã às '+hm(x.inicio)+' para '+esc(s.nome.toLowerCase())+'. Posso manter?</div>'+
              '<div class="fuacts"><button class="btn sm primary" data-confirm="'+x.id+'">Marcar '+(R.confirmado||'confirmado')+'</button>'+
              '<button class="btn sm" data-copy="'+x.id+'">Copiar mensagem</button>'+
              '<button class="btn sm" data-cli="'+c.id+'">Ver ficha</button></div>')+
        '</div></div>';
    }).join("") : '<div class="empty">Nenhum horário para confirmar.</div>')+'</div></div>';

  let b = '<div class="card"><div class="cardhead"><h3>Trazer de volta</h3>'+
    '<span class="cap">'+fila.length+' '+esc(R.cliPl)+' · recorrentes por quanto já gastaram, depois quem veio uma vez</span></div><div class="fulist">'+
    (fila.length ? fila.map(({c,s})=>{
      const p = proById(pick2(c));
      const feito = contatados.has(c.id);
      const u = ultimoContato(c.id);
      const why = porqueSituacao(s) +
        (u && u.resultado==="sem-resposta" ? " · última mensagem há "+dayDiff(TODAY, new Date(u.data+"T12:00:00"))+" dias, sem resposta" : "");
      return '<div class="fuitem"><span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+initials(c.nome)+'</span>'+
        '<div class="bd"><b>'+esc(c.nome)+'</b> '+pillSituacao(s)+' '+
        '<span class="pill neutral">'+BRL(s.total)+' no histórico</span>'+
        '<div class="why">'+esc(why)+'</div>'+
        (feito ? '<div class="done-note">✓ '+maiusc(CONTATADO)+' — volta para a fila em 15 dias</div>'+
                 '<div class="fuacts"><button class="btn sm" data-cli="'+c.id+'">Ver ficha</button></div>'
               : '<div class="msg">'+esc(mensagemFU(c,s))+'</div>'+
                 '<div class="fuacts"><button class="btn sm primary" data-fudone="'+c.id+'">Marcar '+CONTATADO+'</button>'+
                 '<button class="btn sm" data-fucopy="'+c.id+'">Copiar mensagem</button>'+
                 '<button class="btn sm" data-cli="'+c.id+'">Ver ficha</button></div>')+
        '</div></div>';
    }).join("") : '<div class="empty">Ninguém para reativar hoje.</div>')+'</div></div>';

  const f = funilFU(addDays(TODAY,-29), TODAY);
  const pc = (x,y) => y ? Math.round(x/y*100)+"%" : "—";
  const funil = '<div class="funil">'+
    '<div class="et"><div class="l">'+maiusc(CONTATADOS)+'</div><div class="n">'+f.contatadas+'</div><div class="p" style="color:var(--muted)">últimos 30 dias</div></div>'+
    '<div class="et"><div class="l">Marcaram horário</div><div class="n">'+f.marcaram+'</div><div class="p">'+pc(f.marcaram,f.contatadas)+' '+(R.dosCliPl ? R.dosCliPl.split(" ")[0] : "dos")+' '+CONTATADOS+'</div></div>'+
    '<div class="et"><div class="l">Vieram</div><div class="n">'+f.vieram+'</div><div class="p">'+pc(f.vieram,f.marcaram)+' de quem marcou</div></div>'+
    '<div class="et"><div class="l">Receita recuperada '+selo("Soma do que "+R.cliAsPl+" "+CONTATADOS+" nos últimos 30 dias gastaram quando voltaram. Um retorno conta se o horário foi marcado até "+JANELA_FU+" dias depois da mensagem.")+'</div><div class="n">'+BRL(f.receita)+'</div>'+
      '<div class="p">'+(f.vieram?BRL(Math.round(f.receita/f.vieram))+' por retorno':'')+'</div></div>'+
  '</div>';
  return '<div class="demo">Na V1 nada é disparado sozinho: o sistema monta a fila e escreve a mensagem, '+esc(R.principalArt)+' revisa e envia. Ao marcar horário para quem recebeu mensagem, o retorno entra no funil automaticamente.</div>'+
         funil+
         '<div class="fu">'+a+b+'</div>';
}

/* ============================= drawers ============================= */
function fecharOverlay(){ overlay.innerHTML=""; }
overlay.addEventListener("click", e=>{ if(e.target===overlay.firstElementChild) fecharOverlay(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") fecharOverlay(); });

function abrirCliente(id){
  const c = cliById(id), s = STATS[id];
  const tel = c.tel.replace(/\D/g,"");
  const k = cartela(c);
  const selos = Array.from({length:FIDEL.meta},(_,i)=>
    '<span class="stamp'+(i < k.atual ? " on":"")+'">'+(i+1)+'</span>').join("");
  overlay.innerHTML = '<div class="scrim"><aside class="drawer">'+
    '<div class="dh"><div><h2>'+esc(c.nome)+'</h2>'+
      '<div style="color:var(--muted);font-size:12.5px;margin-top:3px">'+esc(c.tel)+'</div></div>'+
      '<button class="btn ghost cl" data-close="1">Fechar</button></div>'+
    '<div>'+pillSituacao(s)+' '+
      (s.favorito?'<span class="pill neutral">Costuma fazer: '+esc(s.favorito.nome)+'</span> ':'')+
      (s.proFav?'<span class="pill neutral"><span class="dot" style="background:var('+s.proFav.cor+')"></span>Atende com '+esc(s.proFav.nome.split(" ")[0])+'</span>':'')+'</div>'+
    '<div class="meta">'+
      '<div class="m"><div class="l">Total gasto</div><div class="v">'+BRL(s.total)+'</div></div>'+
      '<div class="m"><div class="l">Visitas</div><div class="v">'+s.qtd+'</div></div>'+
      '<div class="m"><div class="l">'+(s.freq?"Ritmo":"Ciclo de referência")+'</div><div class="v">'+(s.freq||s.ciclo)+'d</div></div>'+
      '<div class="m"><div class="l">Última visita</div><div class="v">'+(s.diasSem===0?"hoje":s.diasSem+"d")+'</div></div>'+
      '<div class="m"><div class="l">Cliente desde</div><div class="v" style="font-size:13.5px">'+
        (s.desde ? (()=>{const dd=new Date(s.desde+"T12:00:00"); return pad(dd.getDate())+"/"+pad(dd.getMonth()+1)+"/"+dd.getFullYear();})() : "—")+'</div></div>'+
    '</div>'+
    '<div style="font-size:12.5px;color:var(--ink-2);margin:10px 0 2px">'+esc(porqueSituacao(s))+
      (s.qtd>=2 && s.freqPropria!==s.freq ? ' · intervalo médio real '+s.freqPropria+'d, ajustado pelo ciclo de '+s.ciclo+'d' : '')+'</div>'+
    (c.obs?'<div class="msg" style="border-left-color:var(--warn)">'+esc(c.obs)+'</div>':'')+
    (FIDEL.ativo
      ? '<div><div class="eyebrow" style="margin-bottom:7px">Fidelidade · '+k.atual+' de '+FIDEL.meta+' '+(FIDEL.conta==="servico"?"serviços":"visitas")+' · prêmio: '+esc(nomePremio())+'</div>'+
        '<div class="loyal">'+selos+'</div>'+
        (k.disponiveis ? '<div class="premio-disp"><span class="pill warn">'+k.disponiveis+' prêmio'+(k.disponiveis>1?'s':'')+' disponível'+(k.disponiveis>1?'is':'')+'</span>'+
          '<button class="btn sm" data-resgatar="'+c.id+'">Registrar prêmio usado</button></div>' : '')+'</div>'
      : '<div><div class="eyebrow" style="margin-bottom:5px">Fidelidade</div><div style="font-size:12.5px;color:var(--muted)">Programa desativado em Configurações › Fidelidade. Os carimbos continuam guardados.</div></div>')+
    '<div><div class="eyebrow" style="margin-bottom:5px">Histórico</div><div class="hist">'+
      s.visitas.slice(0,12).map(a=>{
        const d=new Date(a.data+"T12:00:00"), p=proById(a.proId);
        return '<div class="h"><span class="d">'+pad(d.getDate())+"/"+pad(d.getMonth()+1)+'</span>'+
          '<span class="dot" style="background:var('+p.cor+')"></span>'+
          '<span>'+esc(srvById(a.servicoId).nome)+'</span><span class="v num">'+BRL(a.preco)+'</span></div>';
      }).join("")+'</div></div>'+
    '<div class="actions" style="margin-top:auto">'+
      '<a class="btn primary" href="https://wa.me/55'+tel+'" target="_blank" rel="noopener">Abrir WhatsApp</a>'+
      '<button class="btn" data-novo-cli="'+c.id+'">Marcar horário</button>'+
    '</div></aside></div>';
}

function abrirAgendamento(id){
  const a = AGENDAMENTOS.find(x=>x.id===id);
  if(!a) return;
  if(a.bloco){
    overlay.innerHTML = '<div class="scrim center"><div class="modal">'+
      '<div class="dh"><div><h2>'+esc(a.motivo||"Bloqueio")+'</h2>'+
      '<div style="color:var(--muted);font-size:12.5px;margin-top:3px">'+esc(proById(a.proId).nome)+' · '+hm(a.inicio)+'–'+hm(a.inicio+a.dur)+'</div></div>'+
      '<button class="btn ghost cl" data-close="1">Fechar</button></div>'+
      '<p style="color:var(--muted);font-size:13px">Horário bloqueado não conta como ociosidade no cálculo de ocupação.</p>'+
      '<div class="actions"><button class="btn" data-del="'+a.id+'">Remover bloqueio</button></div></div></div>';
    return;
  }
  const c = cliById(a.clienteId), s = srvById(a.servicoId), p = proById(a.proId);
  const d = new Date(a.data+"T12:00:00");
  const opcoesSt = ORDEM_ST.map(k=>
    '<button class="stopt'+(a.status===k ? " on "+STATUS[k].cls : "")+'" data-st="'+k+'|'+a.id+'" '+
    'aria-pressed="'+(a.status===k)+'">'+(a.status===k?"✓ ":"")+STATUS[k].rot+'</button>').join("");
  overlay.innerHTML = '<div class="scrim center"><div class="modal">'+
    '<div class="dh"><div><h2>'+esc(c.nome)+'</h2>'+
      '<div style="color:var(--muted);font-size:12.5px;margin:3px 0 9px">'+esc(fmtD(d))+' · '+hm(a.inicio)+'–'+hm(a.inicio+a.dur)+'</div>'+
      '<button class="btn sm" data-cli="'+c.id+'">Ficha '+esc(DO_CLI)+'</button></div>'+
      '<button class="btn ghost cl" data-close="1">Fechar</button></div>'+
    '<div style="margin:14px 0"><span class="pill '+STATUS[a.status].cls+'">'+STATUS[a.status].rot+'</span> '+
      '<span class="pill neutral"><span class="dot" style="background:var('+p.cor+')"></span>'+esc(p.nome)+'</span></div>'+
    '<div class="meta" style="margin-bottom:14px">'+
      '<div class="m"><div class="l">Serviço</div><div class="v" style="font-size:13.5px">'+esc(s.nome)+'</div></div>'+
      '<div class="m"><div class="l">Duração</div><div class="v">'+s.dur+' min</div></div>'+
      '<div class="m"><div class="l">'+(s.apartir?"Valor cobrado":"Valor")+'</div><div class="v">'+BRL(a.preco)+'</div></div>'+
    '</div>'+
    (s.apartir ? '<div class="field" style="background:var(--surface-2);border-radius:10px;padding:11px 12px">'+
      '<label class="fl" for="f-valor">Valor fechado na avaliação</label>'+
      '<input type="number" id="f-valor" min="'+s.preco+'" step="5" value="'+a.preco+'" data-valor="'+a.id+'">'+
      '<div style="font-size:11.5px;color:var(--muted);margin-top:6px">'+esc(s.nome)+' sai a partir de '+BRL(s.preco)+'. '+
      'Ajuste ao valor combinado com '+esc(R.cliA)+' — é ele que entra no faturamento.</div>'+
      (a.estimativa ? '<div style="font-size:12px;margin-top:8px;padding-top:8px;border-top:1px solid var(--line)">Estimativa que '+esc(R.cliA)+' viu ao marcar: <b>'+BRL(a.estimativa[0])+' a '+BRL(a.estimativa[1])+'</b>'+
        ' · cabelo '+esc((COMPRIMENTOS.find(x=>x.id===a.comprimento)||{rotulo:""}).rotulo.toLowerCase())+', volume '+esc((VOLUMES.find(x=>x.id===a.volume)||{rotulo:""}).rotulo.toLowerCase())+
        (a.status==="atendido" ? ' · <span class="pill '+(a.preco>a.estimativa[1]?'warn':'ok')+'">'+(a.preco>a.estimativa[1]?'acima da estimativa':'dentro da estimativa')+'</span>' : '')+'</div>' : '')+
      '</div>' : '')+
    (a.encaixe ? '<div class="demo" style="margin-top:10px">Encaixe feito na pausa de outro atendimento: esta receita entra em “Recuperado”.</div>' : '')+
    '<div class="eyebrow" style="margin-bottom:7px">Status do atendimento</div>'+
    '<div class="stsel">'+opcoesSt+'</div>'+
    '<div style="font-size:11.5px;color:var(--muted);margin-top:9px">Só o status Atendido entra no faturamento. Faltou e Cancelado ficam registrados e alimentam a taxa de no-show.</div>'+
    '</div></div>';
}

function abrirNovo(prefill){
  const pf = prefill || {};
  const d = pf.data || iso(agendaDia);
  const proSel = pf.proId || (filtroPro!=="todos"?filtroPro:"p1");
  const horas=[];
  for(let m=SHOP.abre;m<SHOP.fecha;m+=SHOP.gradeMin) horas.push(m);
  overlay.innerHTML = '<div class="scrim center"><div class="modal">'+
    '<div class="dh"><div><h2>Novo horário</h2>'+
    '<div style="color:var(--muted);font-size:12.5px;margin-top:3px">Três escolhas: quem, o quê e quando.</div></div>'+
    '<button class="btn ghost cl" data-close="1">Fechar</button></div>'+
    '<form id="form-novo" style="margin-top:14px">'+
      '<div class="field"><label class="fl" for="f-cli-busca">Cliente</label>'+
        '<div class="ac" id="f-cli-box">'+
          '<input id="f-cli-busca" autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" '+
            'aria-controls="f-cli-lista" placeholder="Digite o nome ou o telefone">'+
          '<div class="aclista" id="f-cli-lista" role="listbox" hidden></div>'+
        '</div>'+
        '<div class="acsel" id="f-cli-sel" hidden></div>'+
      '</div>'+
      '<div class="row2" id="bloco-novo" hidden>'+
        '<div class="field"><label class="fl" for="f-nome">Nome</label><input id="f-nome" placeholder="Nome '+esc(DO_CLI)+'"></div>'+
        '<div class="field"><label class="fl" for="f-tel">Telefone</label><input id="f-tel" placeholder="(31) 90000-0000"></div>'+
      '</div>'+
      '<div class="field"><label class="fl" for="f-pro">Profissional</label><select id="f-pro">'+
        PROS.map(p=>'<option value="'+p.id+'"'+(p.id===proSel?" selected":"")+'>'+esc(p.nome)+' · '+esc(p.papel)+'</option>').join("")+
      '</select></div>'+
      '<div class="field"><label class="fl" for="f-srv">Serviço</label><select id="f-srv"></select></div>'+
      '<div class="row2">'+
        '<div class="field"><label class="fl" for="f-data">Data</label><input type="date" id="f-data" value="'+d+'"></div>'+
        '<div class="field"><label class="fl" for="f-hora">Hora</label><select id="f-hora">'+
          horas.map(m=>'<option value="'+m+'"'+(pf.inicio===m?" selected":"")+'>'+hm(m)+'</option>').join("")+
        '</select></div>'+
      '</div>'+
      '<div id="f-aviso" style="font-size:12.5px;color:var(--crit);margin-bottom:10px" hidden></div>'+
      '<div class="actions" style="justify-content:flex-end">'+
        '<button type="button" class="btn" data-close="1">Cancelar</button>'+
        '<button type="submit" class="btn primary">Marcar horário</button>'+
      '</div>'+
    '</form></div></div>';

  const blocoNovo=document.getElementById("bloco-novo");
  const selPro=document.getElementById("f-pro"), selSrv=document.getElementById("f-srv");
  function popularServicos(){
    const p = selPro.value;
    const list = SERVICOS.filter(s=>s.pro.includes(p) && s.ativo!==false);
    selSrv.innerHTML = list.map(s=>'<option value="'+s.id+'"'+(pf.servicoId===s.id?" selected":"")+'>'+
      esc(s.nome)+' · '+s.dur+' min · '+precoTxt(s)+'</option>').join("");
  }
  popularServicos();
  selPro.addEventListener("change", popularServicos);

  /* --- busca de cliente por digitação (a lista inteira era impraticável) --- */
  const inpCli = document.getElementById("f-cli-busca");
  const listaCli = document.getElementById("f-cli-lista");
  const caixaCli = document.getElementById("f-cli-box");
  const selCliBox = document.getElementById("f-cli-sel");
  let escolha = null;            // {tipo:"cli", id} | {tipo:"novo"}
  let opcoes = [], ativo = -1;

  function fechaLista(){ listaCli.hidden = true; inpCli.setAttribute("aria-expanded","false"); ativo = -1; }

  function chipCliente(c){
    const s = STATS[c.id], p = proById(pick2(c));
    const extra = (s && s.qtd) ? ' · '+s.qtd+' visita'+(s.qtd>1?'s':'')+(s.favorito?' · '+esc(s.favorito.nome):'') : ' · sem histórico';
    return '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+initials(c.nome)+'</span>'+
      '<div class="bd"><b>'+esc(c.nome)+'</b><div class="sub">'+esc(c.tel)+extra+'</div></div>';
  }
  function mostraSelecionado(){
    caixaCli.hidden = true; selCliBox.hidden = false;
    blocoNovo.hidden = escolha.tipo !== "novo";
    selCliBox.innerHTML = (escolha.tipo==="cli"
      ? chipCliente(cliById(escolha.id))
      : '<span class="avatar" style="background:var(--accent-soft);color:var(--accent)">+</span>'+
        '<div class="bd"><b>'+esc(maiusc(R.cliNovo))+'</b><div class="sub">preencha nome e telefone abaixo</div></div>')+
      '<button type="button" class="btn sm" id="f-cli-trocar">Trocar</button>';
    document.getElementById("f-cli-trocar").addEventListener("click", ()=>{
      escolha = null; selCliBox.hidden = true; caixaCli.hidden = false; blocoNovo.hidden = true;
      inpCli.value = ""; fechaLista(); inpCli.focus();
    });
  }
  function buscarClientes(q){
    const t = q.trim().toLowerCase(), dig = q.replace(/\D/g,"");
    if(!t) return [];
    return CLIENTES.filter(c => c.nome.toLowerCase().includes(t) ||
        (dig.length>=3 && c.tel.replace(/\D/g,"").includes(dig)))
      .sort((a,b)=>{
        const ia=a.nome.toLowerCase().indexOf(t), ib=b.nome.toLowerCase().indexOf(t);
        const pa = ia<0?99:ia, pb = ib<0?99:ib;
        return pa!==pb ? pa-pb : a.nome.localeCompare(b.nome,"pt-BR");
      }).slice(0,8);
  }
  function pintaLista(){
    const q = inpCli.value, achados = buscarClientes(q);
    opcoes = achados.map(c=>({tipo:"cli", id:c.id, c}));
    opcoes.push({tipo:"novo"});
    const vazio = q.trim() && !achados.length ? '<div class="vazio">Ninguém com “'+esc(q.trim())+'” na base.</div>' : '';
    listaCli.innerHTML = vazio + opcoes.map((o,i)=>{
      if(o.tipo==="novo"){
        return '<div class="op" role="option" data-i="'+i+'">'+
          '<span class="avatar" style="background:var(--accent-soft);color:var(--accent)">+</span>'+
          '<div class="bd"><b>Cadastrar '+(q.trim()?'“'+esc(q.trim())+'”':esc(R.cliNovo))+'</b>'+
          '<div class="sub">só nome e telefone</div></div></div>';
      }
      const s = STATS[o.c.id], p = proById(pick2(o.c));
      const ult = (s && s.qtd) ? ' · última visita '+(s.diasSem===0?'hoje':'há '+s.diasSem+(s.diasSem===1?' dia':' dias')) : '';
      return '<div class="op" role="option" data-i="'+i+'">'+
        '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+initials(o.c.nome)+'</span>'+
        '<div class="bd"><b>'+esc(o.c.nome)+'</b><div class="sub">'+esc(o.c.tel)+ult+'</div></div></div>';
    }).join("");
    listaCli.hidden = false; inpCli.setAttribute("aria-expanded","true");
    marcaAtivo();
  }
  function marcaAtivo(){
    Array.prototype.forEach.call(listaCli.querySelectorAll(".op"), (el,i)=> el.classList.toggle("ativo", i===ativo));
  }
  function escolher(i){
    const o = opcoes[i]; if(!o) return;
    const q = inpCli.value.trim();
    escolha = o.tipo==="cli" ? {tipo:"cli", id:o.id} : {tipo:"novo"};
    fechaLista(); mostraSelecionado();
    if(o.tipo==="novo"){ const n=document.getElementById("f-nome"); n.value=q; n.focus(); }
  }
  inpCli.addEventListener("input", pintaLista);
  inpCli.addEventListener("focus", pintaLista);
  inpCli.addEventListener("blur", ()=> setTimeout(fechaLista, 130));
  inpCli.addEventListener("keydown", e=>{
    if(listaCli.hidden){ if(e.key==="ArrowDown") pintaLista(); return; }
    if(e.key==="ArrowDown"){ e.preventDefault(); ativo=Math.min(ativo+1, opcoes.length-1); marcaAtivo(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); ativo=Math.max(ativo-1, 0); marcaAtivo(); }
    else if(e.key==="Enter"){ e.preventDefault(); escolher(ativo<0?0:ativo); }
    else if(e.key==="Escape"){ e.stopPropagation(); fechaLista(); }
  });
  listaCli.addEventListener("mousedown", e=>{
    const op = e.target.closest(".op"); if(!op) return;
    e.preventDefault(); escolher(parseInt(op.dataset.i,10));
  });
  if(pf.clienteId && cliById(pf.clienteId)){ escolha={tipo:"cli", id:pf.clienteId}; mostraSelecionado(); }
  else setTimeout(()=>inpCli.focus(), 30);

  document.getElementById("form-novo").addEventListener("submit", ev=>{
    ev.preventDefault();
    const aviso = document.getElementById("f-aviso");
    const proId = selPro.value, srv = srvById(selSrv.value);
    const data = document.getElementById("f-data").value;
    const inicio = parseInt(document.getElementById("f-hora").value,10);
    const p = proById(proId);
    const dd = new Date(data+"T12:00:00");
    if(fechado(dd)){ aviso.hidden=false; aviso.textContent=maiusc(R.casa)+" não abre "+WDL[dd.getDay()]+"."; return; }
    const jd = jornadaDia(p, dd);
    if(!jd){ aviso.hidden=false; aviso.textContent=p.nome+" não atende "+WDL[dd.getDay()]+"."; return; }
    const fimJ = jd[1];
    if(inicio < jd[0] || inicio+srv.dur > fimJ){
      aviso.hidden=false;
      aviso.textContent="Fora da jornada de "+p.nome.split(" ")[0]+" ("+hm(jd[0])+" às "+hm(fimJ)+").";
      return;
    }
    const novoBl = blocosServ(srv, inicio);
    const conflito = AGENDAMENTOS.find(a=>a.data===data && a.proId===proId && a.status!=="cancelado" && cruza(blocosDe(a), novoBl));
    if(conflito){
      const livre = proximoLivre(data, proId, srv, inicio, fimJ);
      aviso.hidden=false;
      aviso.textContent = "Conflito com outro horário." + (livre!==null ? " Próximo livre: "+hm(livre)+"." : "");
      return;
    }
    if(!escolha){
      aviso.hidden=false; aviso.textContent="Busque "+R.cliA+" pelo nome, ou cadastre "+R.cliUm+".";
      inpCli.focus(); return;
    }
    let cliId = escolha.id;
    if(escolha.tipo==="novo"){
      const nome=(document.getElementById("f-nome").value||"").trim();
      if(!nome){ aviso.hidden=false; aviso.textContent="Informe o nome "+DO_CLI+"."; return; }
      const novo = {id:"c"+(CLIENTES.length+1)+"-"+(seqId++), nome,
        tel:(document.getElementById("f-tel").value||telefone()), perfil:perfis[0], freq:30, novo:true, obs:"", proPref:PROS[0].id};
      CLIENTES.push(novo); cliId = novo.id;
    }
    AGENDAMENTOS.push({id:"a"+(seqId++), clienteId:cliId, servicoId:srv.id, proId, data,
      inicio, dur:srv.dur, preco:srv.preco, status:"agendado", bloco:false,
      pausa: srv.pausa ? {apos:srv.pausa.apos, dur:srv.pausa.dur} : null});
    const doFU = vincularContato(cliId, AGENDAMENTOS[AGENDAMENTOS.length-1].id);
    recalcStats();
    const novoAg = AGENDAMENTOS[AGENDAMENTOS.length-1];
    agendaDia = new Date(data+"T12:00:00"); agendaDia.setHours(0,0,0,0);
    fecharOverlay(); render();
    toast(novoAg.encaixe ? "Encaixe na pausa marcado para "+hm(inicio) : doFU ? "Horário marcado · retorno do follow-up" : "Horário marcado para "+hm(inicio));
  });
}
function proximoLivre(data, proId, srv, desde, fimJ){
  for(let m=desde; m+srv.dur<=fimJ; m+=30){
    const bl = blocosServ(srv, m);
    const bate = AGENDAMENTOS.some(a=>a.data===data && a.proId===proId && a.status!=="cancelado" && cruza(blocosDe(a), bl));
    if(!bate) return m;
  }
  return null;
}

/* ============================= copiar ============================= */
function copiar(txt){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast("Mensagem copiada")).catch(()=>toast("Copie manualmente"));
  } else { toast("Copie manualmente"); }
}

/* ============================= exportação ============================= */
// os dois textos de tooltip — no máximo 70 caracteres cada
const TIP_CSV  = "Texto puro: abre em qualquer sistema, sem formatação nem fórmulas.";
const TIP_XLSX = "Planilha do Excel pronta: colunas formatadas e números somáveis.";

const dataBR = iso => { const d = new Date(iso+"T12:00:00");
  return pad(d.getDate())+"/"+pad(d.getMonth()+1)+"/"+d.getFullYear(); };

const COLS_EXP = [
  ["Cliente",            x=>x.c.nome,                                  "txt", 26],
  ["Telefone",           x=>x.c.tel,                                   "txt", 16],
  ["Situação",           x=>FAIXAS[x.s.faixa].rot,                     "txt", 12],
  ["Dias sem aparecer",  x=>x.s.diasSem,                               "int", 17],
  ["Frequência (dias)",  x=>x.s.freq,                                  "int", 17],
  ["Visitas",            x=>x.s.qtd,                                   "int", 9],
  ["Total gasto",        x=>x.s.total,                                 "brl", 13],
  ["Profissional",       x=>x.s.proFav ? x.s.proFav.nome : "",         "txt", 16],
  ["Serviço habitual",   x=>x.s.favorito ? x.s.favorito.nome : "",     "txt", 18],
  ["Cliente desde",      x=>x.s.desde ? dataBR(x.s.desde) : "",        "txt", 14],
  ["Observação",         x=>x.c.obs || "",                             "txt", 30]
];
const SLUG = SHOP.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const nomeArquivo = ext => "clientes-"+SLUG+"-"+iso(new Date())+"."+ext;

function montaCSV(){
  const sep = ";";
  const campo = v => {
    const t = (v===null || v===undefined) ? "" : String(v);
    return /[";\n\r]/.test(t) ? '"'+t.replace(/"/g,'""')+'"' : t;
  };
  const out = [COLS_EXP.map(c=>campo(c[0])).join(sep)];
  linhasClientes().forEach(x => out.push(COLS_EXP.map(c=>campo(c[1](x))).join(sep)));
  return "﻿" + out.join("\r\n");   // BOM para o Excel ler os acentos
}

/* --- gerador mínimo de .xlsx (zip sem compressão, sem biblioteca externa) --- */
const CRCT = (()=>{ const t=new Uint32Array(256);
  for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320^(c>>>1) : c>>>1; t[n]=c>>>0; }
  return t; })();
function crc32(u8){ let c=0xFFFFFFFF;
  for(let i=0;i<u8.length;i++) c = CRCT[(c ^ u8[i]) & 0xFF] ^ (c>>>8);
  return (c ^ 0xFFFFFFFF) >>> 0; }

function zipar(arquivos){
  const enc = new TextEncoder(), partes = [], central = [];
  let offset = 0, total = 0;
  arquivos.forEach(f=>{
    const nome = enc.encode(f.nome), dados = enc.encode(f.texto), crc = crc32(dados);
    const lh = new Uint8Array(30 + nome.length), dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true); dv.setUint16(4, 20, true); dv.setUint16(6, 0x0800, true);
    dv.setUint16(8, 0, true); dv.setUint16(10, 0, true); dv.setUint16(12, 0x2821, true);
    dv.setUint32(14, crc, true); dv.setUint32(18, dados.length, true); dv.setUint32(22, dados.length, true);
    dv.setUint16(26, nome.length, true); dv.setUint16(28, 0, true);
    lh.set(nome, 30);
    partes.push(lh, dados);
    const cd = new Uint8Array(46 + nome.length), cv = new DataView(cd.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true); cv.setUint16(10, 0, true); cv.setUint16(12, 0, true); cv.setUint16(14, 0x2821, true);
    cv.setUint32(16, crc, true); cv.setUint32(20, dados.length, true); cv.setUint32(24, dados.length, true);
    cv.setUint16(28, nome.length, true); cv.setUint16(30, 0, true); cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true); cv.setUint16(36, 0, true); cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    cd.set(nome, 46);
    central.push(cd);
    offset += lh.length + dados.length;
    total += lh.length + dados.length;
  });
  const tamCentral = central.reduce((n,c)=>n+c.length, 0);
  const eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(4, 0, true); ev.setUint16(6, 0, true);
  ev.setUint16(8, arquivos.length, true); ev.setUint16(10, arquivos.length, true);
  ev.setUint32(12, tamCentral, true); ev.setUint32(16, total, true); ev.setUint16(20, 0, true);
  const saida = new Uint8Array(total + tamCentral + 22);
  let pos = 0;
  partes.forEach(b=>{ saida.set(b, pos); pos += b.length; });
  central.forEach(b=>{ saida.set(b, pos); pos += b.length; });
  saida.set(eocd, pos);
  return saida;
}

const xesc = v => String(v).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]))
                           .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
function colLetra(i){ let s="", n=i+1; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26); } return s; }

function montaXLSX(){
  const linhas = linhasClientes();
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const NS  = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const R   = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  let corpo = '<row r="1">' + COLS_EXP.map((c,i)=>
      '<c r="'+colLetra(i)+'1" s="1" t="inlineStr"><is><t>'+xesc(c[0])+'</t></is></c>').join("") + '</row>';
  linhas.forEach((x, li)=>{
    const r = li + 2;
    corpo += '<row r="'+r+'">' + COLS_EXP.map((c,i)=>{
      const ref = colLetra(i)+r, v = c[1](x), tipo = c[2];
      if((tipo==="int" || tipo==="brl") && typeof v === "number" && isFinite(v))
        return '<c r="'+ref+'"'+(tipo==="brl" ? ' s="2"' : '')+'><v>'+v+'</v></c>';
      if(v === null || v === undefined || v === "") return '<c r="'+ref+'"/>';
      return '<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(v)+'</t></is></c>';
    }).join("") + '</row>';
  });
  const ultima = colLetra(COLS_EXP.length-1), fim = linhas.length + 1;
  const cols = '<cols>' + COLS_EXP.map((c,i)=>
      '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+c[3]+'" customWidth="1"/>').join("") + '</cols>';

  const sheet = XML+'<worksheet xmlns="'+NS+'">'+
    '<dimension ref="A1:'+ultima+fim+'"/>'+
    '<sheetViews><sheetView workbookViewId="0" tabSelected="1">'+
      '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'+
    '<sheetFormatPr defaultRowHeight="15"/>'+ cols +
    '<sheetData>'+corpo+'</sheetData>'+
    '<autoFilter ref="A1:'+ultima+fim+'"/>'+
    '</worksheet>';

  const styles = XML+'<styleSheet xmlns="'+NS+'">'+
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot;\\ #,##0"/></numFmts>'+
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>'+
      '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'+
    '<fills count="2"><fill><patternFill patternType="none"/></fill>'+
      '<fill><patternFill patternType="gray125"/></fill></fills>'+
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'+
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'+
    '<cellXfs count="3">'+
      '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'+
      '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>'+
      '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'+
    '</cellXfs>'+
    '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'+
    '</styleSheet>';

  return zipar([
    {nome:"[Content_Types].xml", texto: XML+
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'+
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+
      '<Default Extension="xml" ContentType="application/xml"/>'+
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+
      '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'+
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+
      '</Types>'},
    {nome:"_rels/.rels", texto: XML+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="'+R+'/officeDocument" Target="xl/workbook.xml"/></Relationships>'},
    {nome:"xl/workbook.xml", texto: XML+
      '<workbook xmlns="'+NS+'" xmlns:r="'+R+'"><sheets>'+
      '<sheet name="Clientes" sheetId="1" r:id="rId1"/></sheets></workbook>'},
    {nome:"xl/_rels/workbook.xml.rels", texto: XML+
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+
      '<Relationship Id="rId1" Type="'+R+'/worksheet" Target="worksheets/sheet1.xml"/>'+
      '<Relationship Id="rId2" Type="'+R+'/styles" Target="styles.xml"/></Relationships>'},
    {nome:"xl/styles.xml", texto: styles},
    {nome:"xl/worksheets/sheet1.xml", texto: sheet}
  ]);
}

async function exportar(formato){
  if(!DOWNLOADS) return;
  const n = linhasClientes().length;
  try{
    if(formato==="csv"){
      await DOWNLOADS.save({filename: nomeArquivo("csv"), data: montaCSV()});
    } else {
      const bytes = montaXLSX();
      await DOWNLOADS.save({filename: nomeArquivo("xlsx"),
        data: new Blob([bytes], {type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"})});
    }
    toast(n+" clientes exportados");
  }catch(err){
    const cod = err && err.code;
    if(cod === "declined") return;                       // o usuário decidiu não salvar
    if(cod === "rate_limited") toast("Aguarde um instante e tente de novo");
    else toast("Não foi possível exportar agora");
  }
}

/* ============================= configurações ============================= */
const ABAS_CONF = [["perfil","Perfil"],["horarios","Horários"],["equipe","Funcionários"],
                   ["atribuicoes","Atribuições"],["servicos","Serviços e valores"],["situacao","Situação"],["fidelidade","Fidelidade"]];
const DIAS_SEM = [[1,"Segunda"],[2,"Terça"],[3,"Quarta"],[4,"Quinta"],[5,"Sexta"],[6,"Sábado"],[0,"Domingo"]];

function secao(titulo, legenda, corpo){
  return '<section class="confsec"><header><h3>'+titulo+'</h3>'+
    (legenda?'<div class="cap">'+legenda+'</div>':'')+'</header>'+
    '<div class="confbody">'+corpo+'</div></section>';
}
function campo(rot, id, tipo, valor, extra){
  return '<div class="field"><label class="fl" for="'+id+'">'+rot+'</label>'+
    '<input id="'+id+'" type="'+tipo+'" value="'+esc(valor)+'" data-set="'+id+'" '+(extra||"")+'></div>';
}

function confPerfil(){
  return secao("Perfil do estabelecimento","O que aparece para "+(R.cliA||"o cliente")+" e nos lembretes",
    '<div class="grid2">'+
      campo("Nome do estabelecimento","shop:nome","text",SHOP.nome)+
      campo("Telefone","shop:tel","text",SHOP.tel)+
    '</div>'+
    campo("Endereço","shop:endereco","text",SHOP.endereco)+
    '<div class="grid2">'+
      '<div class="field"><label class="fl" for="shop:grade">Intervalo da agenda</label>'+
        '<select id="shop:grade" data-set="shop:grade">'+
          [15,30].map(v=>'<option value="'+v+'"'+(SHOP.gradeMin===v?" selected":"")+'>'+v+' minutos</option>').join("")+
        '</select></div>'+
    '</div>'+
    '<div class="nota" style="margin-top:4px">O intervalo da agenda muda a altura da grade na tela de Agenda. '+
    'Com serviços de '+DUR_MIN+' a '+DUR_MAX+', 30 minutos é o intervalo que menos fragmenta o dia '+esc(R.daCasa)+'.</div>');
}

function confHorarios(){
  const linhas = DIAS_SEM.map(([dow,rot])=>{
    const h = SHOP.horarios[dow];
    return '<div class="diaslin"><span class="nomedia">'+rot+'</span>'+
      '<label class="chk"><input type="checkbox" data-set="hor:'+dow+':aberto"'+(h?" checked":"")+'> Aberto</label>'+
      (h ? '<input type="time" step="900" value="'+hm(h[0])+'" data-set="hor:'+dow+':ini" aria-label="Abre">'+
           '<span style="color:var(--muted)">até</span>'+
           '<input type="time" step="900" value="'+hm(h[1])+'" data-set="hor:'+dow+':fim" aria-label="Fecha">'
         : '<span class="fechado">Fechado — nenhum horário é oferecido neste dia</span>')+
      '</div>';
  }).join("");
  return secao("Horários de funcionamento","A casa fechada manda em tudo: ninguém é agendado fora disso, nem pelo link nem pelo WhatsApp", linhas);
}

function confEquipe(){
  const cartoes = PROS.map(p=>
    '<div class="cartao-pro">'+
      '<div class="cab">'+
        '<span class="avatar" style="background:var('+p.soft+');color:var('+p.cor+')">'+initials(p.nome)+'</span>'+
        '<b>'+esc(p.nome)+'</b>'+
        '<button class="btn sm perigo" data-remover-pro="'+p.id+'"'+(PROS.length<2?' disabled title="'+esc(maiusc(R.casa))+' precisa de pelo menos um profissional"':'')+'>Remover</button></div>'+
      '<div class="grid2">'+
        campo("Nome","pro:"+p.id+":nome","text",p.nome)+
        campo("Função","pro:"+p.id+":papel","text",p.papel)+
      '</div>'+
      '<div class="grid2">'+
        '<div class="field"><label class="fl">Entrada</label>'+
          '<input type="time" step="900" value="'+hm(p.ini)+'" data-set="pro:'+p.id+':ini"></div>'+
        '<div class="field"><label class="fl">Saída</label>'+
          '<input type="time" step="900" value="'+hm(p.fim)+'" data-set="pro:'+p.id+':fim"></div>'+
      '</div>'+
      '<label class="fl">Dias de trabalho</label>'+
      '<div class="diasem">'+DIAS_SEM.map(([dow,rot])=>
        '<label><input type="checkbox" data-set="pro:'+p.id+':dia:'+dow+'"'+(p.dias.includes(dow)?" checked":"")+'>'+
        '<span>'+rot.slice(0,3)+'</span></label>').join("")+'</div>'+
    '</div>').join("");
  const topo = '<div class="equipe-topo"><span class="cap">'+PROS.length+' profissiona'+(PROS.length===1?'l':'is')+' na equipe</span>'+
    '<button class="btn sm primary" data-add-pro="1">+ Adicionar funcionário(a)</button></div>';
  return secao("Funcionários","Quem atende, em que horário e em que dias",
    topo + cartoes + (EX_PROS.length ? '<div class="nota" style="margin-bottom:10px">Removidas: '+EX_PROS.map(p=>esc(p.nome)).join(", ")+'. O histórico delas continua nos relatórios.</div>' : '') +
    '<div class="nota">A jornada de cada pessoa é cruzada com o horário da casa. Quem entra às 9h numa segunda que abre às 10h começa às 10h.</div>');
}

/* ---------- equipe: adicionar e remover ---------- */
function futurosDe(pid){
  return AGENDAMENTOS.filter(a=>!a.bloco && a.proId===pid && a.data>=iso(TODAY) && (a.status==="agendado"||a.status==="confirmado"));
}
function abrirRemoverPro(pid){
  const p = proById(pid); if(!p) return;
  const fut = futurosDe(pid);
  const exclusivos = SERVICOS.filter(sv=>sv.ativo!==false && sv.pro.length===1 && sv.pro[0]===pid);
  overlay.innerHTML = '<div class="scrim center"><div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="rm-tit" aria-describedby="rm-desc">'+
    '<div class="alerta"><span class="ic" aria-hidden="true">!</span><div>'+
      '<h2 id="rm-tit" style="font-size:18px">Tem certeza que quer remover este(a) funcionário(a)?</h2>'+
      '<div id="rm-desc" style="margin-top:6px;color:var(--ink-2);font-size:13.5px"><b>'+esc(p.nome)+'</b> · '+esc(p.papel)+'</div>'+
    '</div></div>'+
    '<ul style="margin:14px 0 0;padding-left:18px;font-size:13px;color:var(--ink-2);display:flex;flex-direction:column;gap:5px">'+
      '<li>'+(fut.length ? '<b>'+fut.length+' horário'+(fut.length>1?'s':'')+' futuro'+(fut.length>1?'s':'')+'</b> nessa agenda '+(fut.length>1?'serão cancelados':'será cancelado')+'. Avise '+esc(R.cliAsPl)+' para remarcar com outra pessoa.' : 'Não há horários futuros marcados nessa agenda.')+'</li>'+
      (exclusivos.length ? '<li>Só essa pessoa faz: <b>'+exclusivos.map(sv=>esc(sv.nome)).join(", ")+'</b>. '+(exclusivos.length>1?'Esses serviços saem':'Esse serviço sai')+' da marcação até você atribuir a outra pessoa.</li>' : '')+
      '<li>O histórico de atendimentos e o faturamento continuam nos relatórios.</li>'+
    '</ul>'+
    '<div class="actions" style="justify-content:flex-end;margin-top:18px">'+
      '<button class="btn" data-close="1" id="rm-cancelar">Cancelar</button>'+
      '<button class="btn perigo-cheio" data-confirma-remover="'+p.id+'">Remover funcionário(a)</button>'+
    '</div></div></div>';
  const bc = document.getElementById("rm-cancelar"); if(bc) bc.focus();
}
function removerPro(pid){
  const i = PROS.findIndex(p=>p.id===pid);
  if(i<0 || PROS.length<2) return;
  const p = PROS[i];
  const fut = futurosDe(pid);
  fut.forEach(a=>{ a.status = "cancelado"; atualizaContato(a); });
  SERVICOS.forEach(sv=>{ sv.pro = sv.pro.filter(x=>x!==pid); });
  EX_PROS.push(p); PROS.splice(i,1);
  if(filtroPro===pid) filtroPro = "todos";
  recalcStats();
  fecharOverlay(); render();
  toast(p.nome.split(" ")[0]+" removida da equipe"+(fut.length?" · "+fut.length+" horário"+(fut.length>1?"s cancelados":" cancelado"):""));
}
function abrirAdicionarPro(){
  const ativos = SERVICOS.filter(sv=>sv.ativo!==false);
  overlay.innerHTML = '<div class="scrim center"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="ad-tit">'+
    '<div class="dh"><div><h2 id="ad-tit">Adicionar funcionário(a)</h2>'+
    '<div style="color:var(--muted);font-size:12.5px;margin-top:3px">Aparece na agenda assim que for salvo.</div></div>'+
    '<button class="btn ghost cl" data-close="1">Fechar</button></div>'+
    '<form id="form-pro" style="margin-top:14px">'+
      '<div class="row2"><div class="field"><label class="fl" for="np-nome">Nome</label><input id="np-nome" placeholder="Nome e sobrenome"></div>'+
        '<div class="field"><label class="fl" for="np-papel">Função</label><input id="np-papel" placeholder="'+esc(R.exemploFuncao)+'"></div></div>'+
      '<div class="row2"><div class="field"><label class="fl" for="np-ini">Entrada</label><input type="time" step="900" id="np-ini" value="09:00"></div>'+
        '<div class="field"><label class="fl" for="np-fim">Saída</label><input type="time" step="900" id="np-fim" value="18:00"></div></div>'+
      '<label class="fl">Dias de trabalho</label>'+
      '<div class="diasem" style="margin-bottom:13px">'+DIAS_SEM.map(([dow,rot])=>
        '<label><input type="checkbox" name="np-dia" value="'+dow+'"'+(SHOP.horarios[dow]?" checked":"")+'><span>'+rot.slice(0,3)+'</span></label>').join("")+'</div>'+
      '<label class="fl">Serviços que essa pessoa faz</label>'+
      '<div class="srvchk">'+ativos.map(sv=>'<label class="chk"><input type="checkbox" name="np-srv" value="'+sv.id+'"> '+esc(sv.nome)+'</label>').join("")+'</div>'+
      '<div id="np-aviso" style="font-size:12.5px;color:var(--crit);margin:10px 0 0" hidden></div>'+
      '<div class="actions" style="justify-content:flex-end;margin-top:14px">'+
        '<button type="button" class="btn" data-close="1">Cancelar</button>'+
        '<button type="submit" class="btn primary">Adicionar à equipe</button></div>'+
    '</form></div></div>';
  setTimeout(()=>{ const n=document.getElementById("np-nome"); if(n) n.focus(); }, 30);
  document.getElementById("form-pro").addEventListener("submit", ev=>{
    ev.preventDefault();
    const aviso = document.getElementById("np-aviso");
    const nome = (document.getElementById("np-nome").value||"").trim();
    const papel = (document.getElementById("np-papel").value||"").trim() || "Profissional";
    const ini = minutos(document.getElementById("np-ini").value), fim = minutos(document.getElementById("np-fim").value);
    const dias = Array.from(document.querySelectorAll('input[name="np-dia"]:checked')).map(x=>+x.value).sort();
    const srvs = Array.from(document.querySelectorAll('input[name="np-srv"]:checked')).map(x=>x.value);
    const erro = !nome ? "Informe o nome." : (ini===null || fim===null || fim-ini < 60) ? "A saída precisa ser pelo menos 1 hora depois da entrada." :
      !dias.length ? "Marque pelo menos um dia de trabalho." : !srvs.length ? "Marque pelo menos um serviço." : "";
    if(erro){ aviso.hidden = false; aviso.textContent = erro; return; }
    const usados = PROS.concat(EX_PROS).map(p=>+p.id.replace(/\D/g,"")||0);
    const id = "p"+(Math.max(0,...usados)+1);
    const cor = CORES[(PROS.length+EX_PROS.length) % CORES.length];
    PROS.push({id, nome, papel, cor:cor[0], soft:cor[1], dias, ini, fim, almoco:Math.min(12*60, fim-60)});
    srvs.forEach(sid=>{ const sv = srvById(sid); if(sv && !sv.pro.includes(id)) sv.pro.push(id); });
    fecharOverlay(); render(); toast(nome.split(" ")[0]+" adicionada à equipe");
  });
}

function confAtribuicoes(){
  const cab = '<tr><th>Serviço</th>'+PROS.map(p=>'<th>'+esc(p.nome.split(" ")[0])+'</th>').join("")+'</tr>';
  const linhas = SERVICOS.map(sv=>
    '<tr'+(sv.ativo===false?' style="opacity:.5"':'')+'><td>'+esc(sv.nome)+'</td>'+
    PROS.map(p=>'<td><input type="checkbox" style="width:auto" data-set="atr:'+sv.id+':'+p.id+'"'+
      (sv.pro.includes(p.id)?" checked":"")+' aria-label="'+esc(sv.nome+" com "+p.nome)+'"></td>').join("")+
    '</tr>').join("");
  return secao("Atribuições","Quem pode fazer cada serviço — é isso que filtra os horários oferecidos "+(R.aoCli||"ao cliente"),
    '<div class="tablewrap"><table class="matriz"><thead>'+cab+'</thead><tbody>'+linhas+'</tbody></table></div>'+
    '<div class="nota" style="margin-top:12px">Serviço sem ninguém marcado não aparece para agendar.</div>');
}

function celCiclo(sv){
  const obs = cicloObservado(sv);
  const dif = obs && Math.abs(obs.dias - cicloServ(sv)) >= 3;
  const base = cicloHerdado(sv) && sv.inclui ? sv.inclui.map(srvById).find(x=>x && x.ciclo) : null;
  return '<input type="number" min="3" max="365" step="1" value="'+(sv.ciclo||"")+'" placeholder="'+(cicloHerdado(sv)?cicloServ(sv):"")+'" data-set="srv:'+sv.id+':ciclo" aria-label="Ciclo de retorno de '+esc(sv.nome)+' (dias)">'+
    (cicloHerdado(sv) ? '<div class="obs">'+(base ? 'herdado de '+esc(base.nome) : 'padrão da casa')+'</div>' : '')+
    (obs ? '<div class="obs">real: <b>'+obs.dias+'d</b> ('+obs.clientes+' '+esc(R.cliPl)+')'+
      (dif ? ' <button class="linkbtn" data-usar-ciclo="'+sv.id+':'+obs.dias+'">usar</button>' : ' ✓')+'</div>' : '');
}
function confSituacao(){
  const cont = {}; let tot = 0;
  CLIENTES.forEach(c=>{ const f = STATS[c.id]; if(f.qtd>0){ cont[f.faixa] = (cont[f.faixa]||0)+1; tot++; } });
  const barra = '<div class="sitbar">'+Object.keys(FAIXAS).map(k=>{
      const n = cont[k]||0; if(!n) return "";
      return '<span class="pill '+FAIXAS[k].cls+'" style="flex:'+n+' 1 0">'+FAIXAS[k].rot+' · '+n+'</span>'; }).join("")+'</div>';
  const num = (id, rot, v, attrs, dica) => '<div class="field"><label class="fl" for="sit:'+id+'">'+rot+'</label>'+
    '<input id="sit:'+id+'" type="number" '+attrs+' value="'+v+'" data-set="sit:'+id+'"><div class="obs">'+dica+'</div></div>';
  const cortes =
    '<div class="grid2">'+
      num("atrasado","Atrasado a partir de (× o ritmo)", SIT.atrasado, 'min="1" max="3" step="0.1"', "Em dia até aqui. Ex.: 1,2 = 20% além do ritmo.")+
      num("risco","Em risco a partir de (× o ritmo)", SIT.risco, 'min="1.2" max="5" step="0.1"', "Perdeu cerca de "+SIT.risco+" ciclos.")+
    '</div><div class="grid2">'+
      num("perdido","Perdido a partir de (× o ritmo)", SIT.perdido, 'min="1.5" max="8" step="0.1"', "Vale também para quem veio uma vez só.")+
      num("peso","Peso do ciclo na média (visitas)", SIT.pesoReferencia, 'min="0" max="6" step="1"', "0 = só a frequência real. 2 = o ciclo vale como 2 intervalos.")+
    '</div><div class="grid2">'+
      num("confianca","Tag provisória abaixo de (visitas)", SIT.visitasConfianca, 'min="2" max="10" step="1"', "Mostra a tag tracejada até o ritmo se firmar.")+
      num("novoFila","Novo entra no follow-up após (× o ciclo)", SIT.novoNaFilaApos, 'min="0" max="1" step="0.1"', "0,5 = na metade do ciclo, para lembrar do próximo horário.")+
    '</div>';
  const regra = '<div class="nota" style="margin-top:4px"><b>Como a tag é decidida.</b> R = dias sem vir ÷ ritmo '+esc(DO_CLI)+'.<br>'+
    '<b>1 visita</b>: o ritmo é o ciclo do serviço feito → <b>Novo</b> (R &lt; 1) · <b>Não voltou</b> (1 a '+String(SIT.perdido).replace(".",",")+') · <b>Perdido</b>.<br>'+
    '<b>2 ou mais</b>: o ritmo mistura o intervalo real com o ciclo do serviço, e o ciclo perde força a cada visita → '+
    '<b>Em dia</b> (R &lt; '+String(SIT.atrasado).replace(".",",")+') · <b>Atrasado</b> (&lt; '+String(SIT.risco).replace(".",",")+') · <b>Em risco</b> (&lt; '+String(SIT.perdido).replace(".",",")+') · <b>Perdido</b>.<br>'+
    'Os ciclos de cada serviço ficam em Serviços e valores.</div>';
  return secao("Situação "+esc(R.dosCliPl||("dos "+R.cliPl)),"A régua que decide as tags da página Clientes e quem entra no follow-up",
    '<div class="eyebrow" style="margin-bottom:8px">Hoje, com esta régua · '+tot+' '+esc(R.cliPl)+'</div>'+barra+cortes+regra);
}
function confServicos(){
  const linhas = SERVICOS.map(sv=>
    '<tr class="'+(sv.ativo===false?"off":"")+'">'+
      '<td><input type="text" value="'+esc(sv.nome)+'" data-set="srv:'+sv.id+':nome" aria-label="Nome do serviço"></td>'+
      '<td><input type="number" min="5" step="5" value="'+sv.dur+'" data-set="srv:'+sv.id+':dur" aria-label="Duração"></td>'+
      '<td><input type="number" min="0" step="1" value="'+sv.preco+'" data-set="srv:'+sv.id+':preco" aria-label="Preço"></td>'+
      '<td><label class="chk"><input type="checkbox" data-set="srv:'+sv.id+':apartir"'+(sv.apartir?" checked":"")+'> a partir de</label></td>'+
      '<td class="pausacel"><input type="number" min="0" step="5" value="'+((sv.rascunhoPausa||sv.pausa||{apos:0}).apos)+'" data-set="srv:'+sv.id+':pausaApos" aria-label="Pausa começa após (min)" title="começa após (min)">'+
        '<input type="number" min="0" step="5" value="'+((sv.rascunhoPausa||sv.pausa||{dur:0}).dur)+'" data-set="srv:'+sv.id+':pausaDur" aria-label="Pausa dura (min)" title="dura (min)"></td>'+
      '<td class="ciclocel">'+celCiclo(sv)+'</td>'+
      '<td><label class="chk"><input type="checkbox" data-set="srv:'+sv.id+':ativo"'+(sv.ativo!==false?" checked":"")+'> ativo</label></td>'+
    '</tr>').join("");
  const barra = '<div class="impbar">'+
    '<button class="btn sm primary" data-imp="abrir">Importar arquivo</button>'+
    (DOWNLOADS ? '<button class="btn sm" data-imp="modelo">Baixar modelo</button>' : '')+
    '<span class="cap">Aceita .csv e .xlsx com Serviço e Preço (Duração é opcional). Valores “a partir de R$ X” são reconhecidos.</span>'+
    '<input type="file" id="f-imp" accept=".csv,.txt,.tsv,.xlsx" hidden>'+
  '</div>';
  return secao("Serviços oferecidos e valores","Duração é o que define o bloco na agenda; preço é o que entra no faturamento",
    barra+
    '<div class="tablewrap"><table class="tsrv"><thead><tr>'+
      '<th>Serviço</th><th>Duração (min)</th><th>Preço (R$)</th>'+
      thInfo("Preço", "Marque “a partir de” quando o valor depende de avaliação. A tabela mostra o mínimo; o valor final é lançado ao concluir.")+
      thInfo("Pausa: após · dura (min)", "Tempo em que "+R.proA+" fica livre durante o processamento. A agenda oferece esse intervalo para encaixe. 0 = sem pausa.")+
      thInfo("Ciclo de retorno (dias)", "Em quantos dias "+R.cliA+" costuma voltar. Combinado em branco herda o do serviço principal. Com histórico, aparece o ciclo real.")+
      thInfo("Situação", "Desativado some da marcação, mas fica no histórico e nos relatórios.")+
    '</tr></thead><tbody>'+linhas+'</tbody></table></div>') + confFaixas();
}
// cabeçalho de coluna com a explicação escondida no "i" pontilhado
function thInfo(rot, dica){
  return '<th><span class="thi">'+rot+selo(dica)+'</span></th>';
}
function confFaixas(){
  const aps = SERVICOS.filter(sv=>sv.apartir && sv.ativo!==false);
  if(!aps.length) return "";
  const cab = '<tr><th>Serviço</th>'+COMPRIMENTOS.map(c=>'<th>'+esc(c.rotulo)+' (R$)</th>').join("")+'</tr>';
  const linhas = aps.map(sv=>{
    if(!sv.faixas){ sv.faixas = {}; COMPRIMENTOS.forEach((c,i)=>{ sv.faixas[c.id] = [sv.preco + i*10, sv.preco + i*10 + 20]; }); }
    return '<tr><td>'+esc(sv.nome)+'<div style="font-size:11px;color:var(--muted)">mínimo '+BRL(sv.preco)+'</div></td>'+
      COMPRIMENTOS.map(c=>'<td class="faixacel"><input type="number" min="0" step="5" value="'+sv.faixas[c.id][0]+'" data-set="fx:'+sv.id+':'+c.id+':0" aria-label="'+esc(sv.nome+" "+c.rotulo+" mínimo")+'">'+
        '<span>a</span><input type="number" min="0" step="5" value="'+sv.faixas[c.id][1]+'" data-set="fx:'+sv.id+':'+c.id+':1" aria-label="'+esc(sv.nome+" "+c.rotulo+" máximo")+'"></td>').join("")+'</tr>';
  }).join("");
  return secao("Estimativa dos serviços “a partir de”",maiusc(R.cliA)+" responde comprimento e volume e vê a faixa antes de marcar",
    '<div class="tablewrap"><table class="tsrv"><thead>'+cab+'</thead><tbody>'+linhas+'</tbody></table></div>'+
    '<div class="nota" style="margin-top:12px">Volume fino usa a faixa como está; médio soma '+Math.round(VOLUMES[1].acrescimo*100)+'% e volumoso, '+Math.round(VOLUMES[2].acrescimo*100)+'%. '+
    'O valor final continua sendo o que '+esc(R.principalArt)+' lança ao concluir o atendimento. Faixas de exemplo: validar com '+esc(R.casa)+'.</div>');
}

function confFidelidade(){
  const f = FIDEL, v = valorPremio();
  const k = CLIENTES.map(c=>cartela(c)).filter(x=>x.n>0);
  const disp = k.filter(x=>x.disponiveis>0).length;
  const perto = k.filter(x=>x.disponiveis===0 && f.meta - x.atual <= 2).length;
  const ult90 = periodo(addDays(TODAY,-89), TODAY).filter(a=>a.status==="atendido");
  const ticketVisita = (()=>{ const m = {}; ult90.forEach(a=>{ const key=a.clienteId+"|"+a.data; m[key]=(m[key]||0)+a.preco; });
    const vs = Object.values(m); return vs.length ? vs.reduce((a,b)=>a+b,0)/vs.length : 0; })();
  const ticket = f.conta==="servico" ? (ult90.length ? ult90.reduce((t,a)=>t+a.preco,0)/ult90.length : 0) : ticketVisita;
  const pct = ticket ? v/(ticket*f.meta)*100 : 0;
  const selosPrev = Array.from({length:f.meta},(_,i)=>'<span class="stamp'+(i<Math.min(f.meta-1,3)?" on":"")+'">'+(i===f.meta-1?"★":i+1)+'</span>').join("");
  const ativos = SERVICOS.filter(sv=>sv.ativo!==false);
  const corpo =
    '<label class="chk" style="font-size:14px;font-weight:600"><input type="checkbox" data-set="fid:ativo"'+(f.ativo?" checked":"")+'> Programa de fidelidade ativo</label>'+
    '<div class="nota" style="margin:10px 0 14px">'+(f.ativo
      ? 'A cartela aparece na página '+esc(DO_CLI)+', na ficha de cada '+esc(R.cli)+' e nas mensagens de follow-up.'
      : '<b>Desativado.</b> A cartela some da página '+esc(DO_CLI)+' e das mensagens. Os carimbos ficam guardados: se reativar, ninguém perde o que já juntou.')+'</div>'+
    '<div class="'+(f.ativo?"":"desligado")+'">'+
      '<div class="grid2">'+
        '<div class="field"><label class="fl" for="fid:meta">Carimbos para o prêmio</label>'+
          '<input id="fid:meta" type="number" min="3" max="20" value="'+f.meta+'" data-set="fid:meta"></div>'+
        '<div class="field"><label class="fl" for="fid:conta">O que vale carimbo</label><select id="fid:conta" data-set="fid:conta">'+
          '<option value="visita"'+(f.conta==="visita"?" selected":"")+'>Cada visita (combo conta 1)</option>'+
          '<option value="servico"'+(f.conta==="servico"?" selected":"")+'>Cada serviço</option></select></div>'+
      '</div>'+
      '<div class="grid2">'+
        '<div class="field"><label class="fl" for="fid:tipo">Tipo de prêmio</label><select id="fid:tipo" data-set="fid:tipo">'+
          '<option value="servico"'+(f.premio.tipo==="servico"?" selected":"")+'>Um serviço grátis</option>'+
          '<option value="vale"'+(f.premio.tipo==="vale"?" selected":"")+'>Vale em R$ para abater</option></select></div>'+
        (f.premio.tipo==="servico"
          ? '<div class="field"><label class="fl" for="fid:servico">Serviço do prêmio</label><select id="fid:servico" data-set="fid:servico">'+
              ativos.map(sv=>'<option value="'+sv.id+'"'+(f.premio.servicoId===sv.id?" selected":"")+'>'+esc(sv.nome)+' · '+esc(precoTxt(sv))+'</option>').join("")+'</select></div>'
          : campo("Valor do vale (R$)","fid:valor","number",f.premio.valor,'min="5" step="5"'))+
      '</div>'+
      '<div class="fidprev"><div class="eyebrow" style="margin-bottom:8px">Como '+esc(R.cliA)+' vê</div><div class="loyal">'+selosPrev+'</div>'+
        '<div style="margin-top:9px;font-weight:600">A cada '+f.meta+' '+(f.conta==="servico"?"serviços":"visitas")+': '+esc(nomePremio())+' <span style="color:var(--muted);font-weight:500">('+BRL(v)+')</span></div></div>'+
      '<div class="meta" style="margin-top:14px">'+
        '<div class="m"><div class="l">Prêmios disponíveis agora</div><div class="v">'+disp+'</div><div class="l" style="margin-top:3px">'+BRL(disp*v)+' se todos usarem</div></div>'+
        '<div class="m"><div class="l">Perto de completar (faltam até 2)</div><div class="v">'+perto+'</div><div class="l" style="margin-top:3px">custo previsto '+BRL(perto*v)+'</div></div>'+
        '<div class="m"><div class="l">Custo do prêmio sobre a cartela '+selo("Valor do prêmio dividido pelo quanto "+R.cliUm+" gasta, em média, para completar a cartela (ticket médio "+(f.conta==="servico"?"por serviço":"por visita")+" dos últimos 90 dias × carimbos necessários). É o desconto efetivo que o programa custa.")+'</div><div class="v">'+pct.toFixed(1)+'%</div><div class="l" style="margin-top:3px">cartela média de '+BRL(Math.round(ticket*f.meta))+'</div></div>'+
      '</div>'+
    '</div>';
  return secao("Programa de fidelidade","Prêmio fixo, igual para "+R.cliTodos+": custo previsível para "+R.casa, corpo);
}

function configHTML(){
  const conteudo =
    confAba==="perfil" ? confPerfil() :
    confAba==="horarios" ? confHorarios() :
    confAba==="equipe" ? confEquipe() :
    confAba==="atribuicoes" ? confAtribuicoes() :
    confAba==="fidelidade" ? confFidelidade() :
    confAba==="situacao" ? confSituacao() : confServicos();
  return '<div class="demo">As alterações valem na hora para a agenda, os horários oferecidos e o painel. '+
      'Como é um protótipo, tudo volta ao padrão quando a página é recarregada.</div>'+
    '<div class="seg" style="margin-bottom:16px;width:fit-content;max-width:100%;flex-wrap:wrap">'+
      ABAS_CONF.map(([k,r])=>'<button data-conf="'+k+'" aria-pressed="'+(confAba===k)+'">'+r+'</button>').join("")+
    '</div>'+
    '<div class="conf">'+conteudo+'</div>';
}

/* --- aplica uma edição feita na tela de configurações --- */
function minutos(txt){ const m = /^(\d{1,2}):(\d{2})$/.exec(txt||""); return m ? (+m[1])*60 + (+m[2]) : null; }

function ajustar(chave, el){
  const [tipo, a, b, c] = chave.split(":");
  const val = el.type==="checkbox" ? el.checked : el.value;
  let recarrega = true;

  if(tipo==="shop"){
    if(a==="nome"){ SHOP.nome = String(val).trim() || SHOP.nome; }
    else if(a==="tel"){ SHOP.tel = val; recarrega=false; }
    else if(a==="endereco"){ SHOP.endereco = val; recarrega=false; }
    else if(a==="grade"){ SHOP.gradeMin = parseInt(val,10); }
  }
  else if(tipo==="hor"){
    const dow = +a;
    if(b==="aberto") SHOP.horarios[dow] = val ? (SHOP.horarios[dow] || [9*60, 19*60]) : null;
    else if(SHOP.horarios[dow]){
      const m = minutos(val);
      if(m===null) return;
      const h = SHOP.horarios[dow];
      if(b==="ini") h[0] = Math.min(m, h[1]-30); else h[1] = Math.max(m, h[0]+30);
    }
  }
  else if(tipo==="pro"){
    const p = proById(a);
    if(!p) return;
    if(b==="nome"){ p.nome = String(val).trim() || p.nome; }
    else if(b==="papel"){ p.papel = val; }
    else if(b==="ini" || b==="fim"){
      const m = minutos(val); if(m===null) return;
      if(b==="ini") p.ini = Math.min(m, p.fim-30); else p.fim = Math.max(m, p.ini+30);
    }
    else if(b==="dia"){
      const dow = +c;
      if(val){ if(!p.dias.includes(dow)) p.dias.push(dow); }
      else p.dias = p.dias.filter(x=>x!==dow);
      p.dias.sort();
    }
  }
  else if(tipo==="srv"){
    const sv = srvById(a);
    if(!sv) return;
    if(b==="nome"){ sv.nome = String(val).trim() || sv.nome; }
    else if(b==="dur"){ sv.dur = Math.max(5, parseInt(val,10)||sv.dur); }
    else if(b==="preco"){ sv.preco = Math.max(0, parseInt(val,10)||0); }
    else if(b==="ativo"){ sv.ativo = !!val; }
    else if(b==="ciclo"){ const n = parseInt(val,10); sv.ciclo = n>=3 ? Math.min(365,n) : null; recalcStats(); }
    else if(b==="apartir"){ sv.apartir = !!val; if(!sv.teto) sv.teto = sv.preco; }
    else if(b==="pausaApos" || b==="pausaDur"){
      const n = Math.max(0, parseInt(val,10)||0);
      const base = sv.rascunhoPausa || sv.pausa || {apos:0, dur:0};
      const pz = {apos:base.apos, dur:base.dur};
      if(b==="pausaApos") pz.apos = n; else pz.dur = n;
      if(pz.apos + pz.dur > sv.dur - 5){ toast("A pausa precisa terminar antes do fim do serviço"); render(); return; }
      if(pz.apos>0 && pz.dur>0){ sv.pausa = pz; sv.rascunhoPausa = null; }
      else if(!pz.apos && !pz.dur){ sv.pausa = null; sv.rascunhoPausa = null; }
      else { sv.rascunhoPausa = pz; toast("Preencha quando a pausa começa e quanto dura"); return; }
    }
  }
  else if(tipo==="sit"){
    const v = parseFloat(String(val).replace(",","."));
    if(!isFinite(v)){ render(); return; }
    const cap = (x,a,b)=>Math.max(a,Math.min(b,x));
    if(a==="atrasado") SIT.atrasado = cap(v, 1, SIT.risco-0.1);
    else if(a==="risco") SIT.risco = cap(v, SIT.atrasado+0.1, SIT.perdido-0.1);
    else if(a==="perdido") SIT.perdido = cap(v, Math.max(1.5, SIT.risco+0.1), 8);
    else if(a==="peso") SIT.pesoReferencia = cap(Math.round(v), 0, 6);
    else if(a==="confianca") SIT.visitasConfianca = cap(Math.round(v), 2, 10);
    else if(a==="novoFila") SIT.novoNaFilaApos = cap(v, 0, 1);
    recalcStats();
  }
  else if(tipo==="fid"){
    if(a==="ativo") FIDEL.ativo = !!val;
    else if(a==="meta") FIDEL.meta = Math.max(3, Math.min(20, parseInt(val,10)||FIDEL.meta));
    else if(a==="conta") FIDEL.conta = val==="servico" ? "servico" : "visita";
    else if(a==="tipo") FIDEL.premio.tipo = val==="vale" ? "vale" : "servico";
    else if(a==="servico") FIDEL.premio.servicoId = val;
    else if(a==="valor") FIDEL.premio.valor = Math.max(5, parseInt(val,10)||FIDEL.premio.valor);
  }
  else if(tipo==="fx"){
    const sv = srvById(a);
    if(!sv || !sv.faixas || !sv.faixas[b]) return;
    const n = Math.max(0, parseInt(val,10)||0), f = sv.faixas[b];
    f[+c] = n;
    if(f[0] > f[1]){ const t = f[0]; f[0] = f[1]; f[1] = t; }
    if(f[0] < sv.preco) f[0] = sv.preco;
  }
  else if(tipo==="atr"){
    const sv = srvById(a);
    if(!sv) return;
    if(val){ if(!sv.pro.includes(b)) sv.pro.push(b); }
    else sv.pro = sv.pro.filter(x=>x!==b);
  }

  if(recarrega){
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
  }
  toast("Salvo");
}

/* ============================= importar serviços ============================= */
const semAcento = t => String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");

function numeroBR(txt){
  let t = String(txt).replace(/[^\d,.-]/g,"");
  if(t.includes(",") && t.includes(".")) t = t.replace(/\./g,"").replace(",",".");
  else if(t.includes(",")) t = t.replace(",",".");
  const n = parseFloat(t);
  return isFinite(n) ? n : null;
}
function dividirLinha(linha, sep){
  const out=[]; let cur="", dentro=false;
  for(let i=0;i<linha.length;i++){
    const ch = linha[i];
    if(ch === '"'){ if(dentro && linha[i+1] === '"'){ cur += '"'; i++; } else dentro = !dentro; }
    else if(ch === sep && !dentro){ out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(x=>x.trim());
}
function lerTexto(txt){
  txt = txt.replace(/^﻿/,"");
  const linhas = txt.split(/\r?\n/).filter(l=>l.trim());
  if(!linhas.length) return [];
  const sep = [";","\t",","].map(x=>({x, n:linhas[0].split(x).length})).sort((a,b)=>b.n-a.n)[0].x;
  return linhas.map(l=>dividirLinha(l, sep));
}
async function inflar(bytes){
  const fluxo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(fluxo).arrayBuffer());
}
async function abrirZip(buf){
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for(let i = buf.length-22; i >= Math.max(0, buf.length-66000); i--)
    if(dv.getUint32(i, true) === 0x06054b50){ eocd = i; break; }
  if(eocd < 0) throw new Error("zip");
  const total = dv.getUint16(eocd+10, true);
  let off = dv.getUint32(eocd+16, true);
  const dec = new TextDecoder(), saida = {};
  for(let k=0; k<total; k++){
    const metodo = dv.getUint16(off+10, true);
    const comp = dv.getUint32(off+20, true);
    const nLen = dv.getUint16(off+28, true), eLen = dv.getUint16(off+30, true), cLen = dv.getUint16(off+32, true);
    const local = dv.getUint32(off+42, true);
    const nome = dec.decode(buf.subarray(off+46, off+46+nLen));
    const lN = dv.getUint16(local+26, true), lE = dv.getUint16(local+28, true);
    const ini = local + 30 + lN + lE;
    const dados = buf.subarray(ini, ini+comp);
    saida[nome] = metodo === 0 ? dados : await inflar(dados);
    off += 46 + nLen + eLen + cLen;
  }
  return saida;
}
function colunaPara(letras){
  let n = 0;
  for(const ch of letras) n = n*26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
async function lerXLSX(file){
  if(typeof DecompressionStream === "undefined") throw new Error("sem-suporte");
  const partes = await abrirZip(new Uint8Array(await file.arrayBuffer()));
  const dec = new TextDecoder(), dp = new DOMParser();
  const compart = partes["xl/sharedStrings.xml"]
    ? Array.prototype.map.call(dp.parseFromString(dec.decode(partes["xl/sharedStrings.xml"]),"application/xml")
        .getElementsByTagName("si"), si=>si.textContent)
    : [];
  const nomeAba = Object.keys(partes).find(n=>/^xl\/worksheets\/sheet1\.xml$/.test(n))
               || Object.keys(partes).find(n=>/^xl\/worksheets\//.test(n));
  if(!nomeAba) throw new Error("planilha");
  const doc = dp.parseFromString(dec.decode(partes[nomeAba]), "application/xml");
  return Array.prototype.map.call(doc.getElementsByTagName("row"), row=>{
    const arr = [];
    Array.prototype.forEach.call(row.getElementsByTagName("c"), cel=>{
      const ref = (cel.getAttribute("r")||"").replace(/[0-9]/g,"");
      const col = ref ? colunaPara(ref) : arr.length;
      const t = cel.getAttribute("t");
      let v = "";
      if(t === "inlineStr") v = cel.textContent;
      else {
        const vEl = cel.getElementsByTagName("v")[0];
        v = vEl ? vEl.textContent : "";
        if(t === "s") v = compart[+v] || "";
      }
      arr[col] = String(v).trim();
    });
    for(let i=0;i<arr.length;i++) if(arr[i] === undefined) arr[i] = "";
    return arr;
  });
}

function interpretar(linhas){
  if(!linhas.length) return {itens:[], descartadas:0};
  const acha = (cab, alts) => cab.findIndex(c => alts.some(a => semAcento(c).includes(a)));
  const cab = linhas[0];
  let iNome = acha(cab, ["servico","nome","descricao","item","procedimento"]);
  let iDur  = acha(cab, ["duracao","tempo","minuto","min"]);
  let iPre  = acha(cab, ["preco","valor","r$"]);
  let corpo;
  if(iNome < 0){ iNome = 0; iDur = 1; iPre = 2; corpo = linhas; }   // arquivo sem cabeçalho
  else corpo = linhas.slice(1);

  const itens = [], vistos = {};
  let descartadas = 0;
  corpo.forEach(l=>{
    const nome = (l[iNome]||"").trim();
    const txtPre = iPre >= 0 ? String(l[iPre]||"") : "";
    let dur = iDur >= 0 ? numeroBR(l[iDur]) : null;
    const pre = txtPre ? numeroBR(txtPre) : null;
    const chave = semAcento(nome);
    // sem coluna de duração: entra com 60 min e o dono ajusta depois
    const durPadrao = (dur===null || dur<=0) && iDur < 0;
    if(durPadrao) dur = 60;
    if(!nome || dur===null || pre===null || dur<=0 || vistos[chave]){ descartadas++; return; }
    vistos[chave] = 1;
    itens.push({nome, dur:Math.round(dur), preco:Math.round(pre), apartir:/a partir/i.test(txtPre), durPadrao});
  });
  return {itens, descartadas};
}

function abrirPrevia(){
  const {itens, descartadas} = previaImport;
  overlay.innerHTML = '<div class="scrim center"><div class="modal">'+
    '<div class="dh"><div><h2>Conferir importação</h2>'+
      '<div style="color:var(--muted);font-size:12.5px;margin-top:3px">'+itens.length+' serviço'+(itens.length===1?"":"s")+' lido'+(itens.length===1?"":"s")+
      (descartadas ? ' · '+descartadas+' linha'+(descartadas===1?"":"s")+' ignorada'+(descartadas===1?"":"s") : '')+'</div></div>'+
      '<button class="btn ghost cl" data-close="1">Fechar</button></div>'+
    (itens.length ? '<div class="previa"><table><thead><tr><th>Serviço</th><th>Duração</th><th>Preço</th></tr></thead><tbody>'+
      itens.map(i=>'<tr><td>'+esc(i.nome)+'</td><td class="num">'+i.dur+' min'+(i.durPadrao?'*':'')+'</td>'+
        '<td class="num">'+(i.apartir?'a partir de ':'')+BRL(i.preco)+'</td></tr>').join("")+
      '</tbody></table></div>'
      : '<div class="empty">Não consegui ler nenhum serviço. Confira se o arquivo tem as colunas Serviço, Duração e Preço.</div>')+
    (itens.length ? '<div class="nota">'+(itens.some(i=>i.durPadrao) ? '* A planilha não traz duração: esses serviços entram com 60 min — ajuste em Serviços e valores. ' : '')+
      'Os serviços entram atribuídos a quem você marcar depois, em Atribuições. '+
      'Substituir não apaga nada: os atuais só passam a inativos e o histórico continua intacto.</div>'+
      '<div class="actions" style="justify-content:flex-end;margin-top:14px">'+
        '<button class="btn" data-close="1">Cancelar</button>'+
        '<button class="btn" data-imp="somar">Adicionar aos atuais</button>'+
        '<button class="btn primary" data-imp="substituir">Substituir a tabela</button>'+
      '</div>' : '')+
  '</div></div>';
}

function aplicarImport(modo){
  const itens = previaImport ? previaImport.itens : [];
  if(!itens.length) return;
  if(modo === "substituir") SERVICOS.forEach(sv=>{ sv.ativo = false; });
  itens.forEach((i, k)=>{
    SERVICOS.push({id:"si"+(seqId++)+"-"+k, nome:i.nome, dur:i.dur, preco:i.preco,
                   pro:[PROS[0].id], ativo:true, apartir:i.apartir, teto:i.preco});
  });
  previaImport = null;
  confAba = "servicos";
  fecharOverlay(); render();
  toast(itens.length+" serviços importados");
}

async function receberArquivo(file){
  try{
    const linhas = /\.xlsx$/i.test(file.name) ? await lerXLSX(file) : lerTexto(await file.text());
    previaImport = interpretar(linhas);
    abrirPrevia();
  }catch(err){
    toast(err && err.message === "sem-suporte"
      ? "Este navegador não abre .xlsx — salve como CSV"
      : "Não consegui ler esse arquivo");
  }
}

function modeloCSV(){
  return "﻿" + ["Serviço;Duração (min);Preço",
    ].concat(SERVICOS.slice(0,6).map(sv=>sv.nome+";"+sv.dur+";"+(sv.apartir?"a partir de R$ "+sv.preco:sv.preco))).join("\r\n");
}

/* ============================= render ============================= */
const TITULOS = {
  agenda:["Agenda","Quem vem hoje"],
  resultados:["Resultados","Quanto a cadeira rendeu"],
  clientes:["Clientes","Quem volta e quem sumiu"],
  followup:["Follow-up","A fila de hoje"],
  config:["Configurações","Como "+R.casa+" funciona"]
};
function render(){
  const subMarca = document.querySelector(".brand .sub");
  if(subMarca) subMarca.textContent = SHOP.nome;
  document.getElementById("page-title").textContent = TITULOS[nav][0];
  document.getElementById("page-sub").textContent = TITULOS[nav][1];
  document.querySelectorAll("[data-nav]").forEach(b=>b.setAttribute("aria-current", String(b.dataset.nav===nav)));
  const fu = CLIENTES.filter(c=>{
    const s=STATS[c.id];
    return naFila(s) && !contatados.has(c.id);
  }).length;
  document.getElementById("fu-badge").textContent = Math.min(fu,14);
  view.innerHTML =
    nav==="agenda" ? agendaHTML() :
    nav==="resultados" ? resultadosHTML() :
    nav==="clientes" ? clientesHTML() :
    nav==="config" ? configHTML() : followupHTML();
  const bs = document.getElementById("busca");
  if(bs){ bs.addEventListener("input", e=>{ busca=e.target.value.toLowerCase();
    const pos=e.target.selectionStart; render();
    const nb=document.getElementById("busca"); if(nb){ nb.focus(); nb.setSelectionRange(pos,pos); } }); }
}

/* ============================= eventos ============================= */
document.addEventListener("click", e=>{
  if(menuExp && !e.target.closest(".expwrap")){ menuExp = false; render(); }
  if(menuPer && !e.target.closest(".perwrap")){ menuPer = false; render(); }
  const ke = e.target.closest("[data-kpi-edit],[data-kpi-move]");
  if(ke){
    if(ke.dataset.kpiEdit){
      const a = ke.dataset.kpiEdit;
      if(a==="abrir") editandoKpis = true;
      else if(a==="fim"){ editandoKpis = false; toast("Ordem dos indicadores salva"); }
      else if(a==="padrao"){ kpiOrdem = KPI_PADRAO.slice(); salvarOrdemKpis(); }
    } else {
      const [id, passo] = ke.dataset.kpiMove.split(":");
      normalizarOrdem();
      moverKpi(id, kpiOrdem.indexOf(id) + (+passo));
    }
    const y = window.scrollY; render(); window.scrollTo(0, y);
    if(ke.dataset.kpiMove){ const b = document.querySelector('[data-kpi-move="'+ke.dataset.kpiMove+'"]'); if(b && !b.disabled) b.focus(); }
    return;
  }
  const uc = e.target.closest("[data-usar-ciclo]");
  if(uc){
    const [sid, dias] = uc.dataset.usarCiclo.split(":");
    const sv = srvById(sid);
    if(sv){ sv.ciclo = +dias; recalcStats(); const y = window.scrollY; render(); window.scrollTo(0, y); toast("Ciclo de "+sv.nome+" atualizado para "+dias+" dias"); }
    return;
  }
  const t = e.target.closest("[data-add-pro],[data-remover-pro],[data-confirma-remover],[data-rapido],[data-resgatar],[data-nav],[data-go],[data-modo],[data-pro],[data-faixa],[data-sort],[data-clear],[data-exp],[data-per],[data-conf],[data-imp],[data-appt],[data-cli],[data-slot],[data-close],[data-st],[data-del],[data-confirm],[data-copy],[data-fudone],[data-fucopy],[data-novo-cli]");
  if(!t) return;

  if(t.dataset.close){ fecharOverlay(); return; }
  if(t.dataset.addPro){ abrirAdicionarPro(); return; }
  if(t.dataset.removerPro){ if(!t.disabled) abrirRemoverPro(t.dataset.removerPro); return; }
  if(t.dataset.confirmaRemover){ removerPro(t.dataset.confirmaRemover); return; }
  if(t.dataset.rapido){
    const [st,id] = t.dataset.rapido.split("|");
    const a = AGENDAMENTOS.find(x=>x.id===id);
    if(!a || a.status===st) return;
    mudarStatus(a, st); render();
    const s = srvById(a.servicoId);
    if(st==="atendido" && s && s.apartir){ abrirAgendamento(id); toast("Atendido · lance o valor fechado"); }
    else toast("Status: "+STATUS[st].rot);
    return;
  }
  if(t.dataset.resgatar){
    const id = t.dataset.resgatar;
    RESGATES[id] = (RESGATES[id]||0) + 1;
    abrirCliente(id); render(); toast("Prêmio registrado como usado");
    return;
  }
  if(t.dataset.nav){ nav=t.dataset.nav; render(); window.scrollTo({top:0}); return; }
  if(t.dataset.go){
    if(t.dataset.go==="hoje") agendaDia=new Date(TODAY);
    else agendaDia = addDays(agendaDia, parseInt(t.dataset.go,10)*(agendaModo==="semana"?7:1));
    render(); return;
  }
  if(t.dataset.modo){ agendaModo=t.dataset.modo; render(); return; }
  if(t.dataset.pro && !t.dataset.slot){ filtroPro=t.dataset.pro; render(); return; }
  if(t.dataset.faixa){ filtroFaixa=t.dataset.faixa; render(); return; }
  if(t.dataset.sort){
    const k = t.dataset.sort;
    const col = COLUNAS.find(c=>c.k===k);
    if(ordem.campo===k) ordem.dir = ordem.dir==="asc" ? "desc" : "asc";
    else ordem = {campo:k, dir:col.padrao};
    render(); return;
  }
  if(t.dataset.clear){
    busca=""; filtroFaixa="todas"; ordem={campo:"total", dir:"desc"};
    render(); toast("Filtros limpos"); return;
  }
  if(t.dataset.conf){ confAba = t.dataset.conf; render(); window.scrollTo({top:0}); return; }
  if(t.dataset.imp){
    const acao = t.dataset.imp;
    if(acao==="abrir"){ const f = document.getElementById("f-imp"); if(f) f.click(); return; }
    if(acao==="modelo"){
      if(DOWNLOADS) DOWNLOADS.save({filename:"modelo-servicos.csv", data:modeloCSV()})
        .then(()=>toast("Modelo baixado")).catch(()=>{});
      return;
    }
    aplicarImport(acao); return;
  }
  if(t.dataset.per){
    const v = t.dataset.per;
    if(v==="menu"){ menuPer = !menuPer; render(); return; }
    if(v==="cancelar"){ menuPer = false; render(); return; }
    if(v==="aplicar"){
      const de = document.getElementById("p-de").value, ate = document.getElementById("p-ate").value;
      if(!de || !ate){ toast("Preencha as duas datas"); return; }
      per = {tipo:"custom", de, ate}; menuPer = false; render(); toast("Período aplicado");
      return;
    }
    per = {tipo:v, de:null, ate:null}; menuPer = false; render(); return;
  }
  if(t.dataset.exp){
    const acao = t.dataset.exp;
    if(acao==="menu"){ menuExp = !menuExp; render(); return; }
    menuExp = false; render(); exportar(acao); return;
  }
  if(t.dataset.appt){ abrirAgendamento(t.dataset.appt); return; }
  if(t.dataset.cli){ abrirCliente(t.dataset.cli); return; }
  if(t.dataset.novoCli){ abrirNovo({clienteId:t.dataset.novoCli}); return; }
  if(t.dataset.slot){
    if(t.classList.contains("off")) return;
    abrirNovo({proId:t.dataset.pro, inicio:parseInt(t.dataset.slot,10), data:iso(agendaDia)});
    return;
  }
  if(t.dataset.st){
    const [st,id]=t.dataset.st.split("|");
    const a=AGENDAMENTOS.find(x=>x.id===id);
    if(!a || a.status===st) return;
    mudarStatus(a, st);
    render();                 // agenda e painel atrás
    abrirAgendamento(id);     // e o próprio modal, já com a opção certa marcada
    toast("Status: "+STATUS[st].rot);
    return;
  }
  if(t.dataset.del){
    const i=AGENDAMENTOS.findIndex(x=>x.id===t.dataset.del);
    if(i>=0) AGENDAMENTOS.splice(i,1);
    fecharOverlay(); render(); toast("Bloqueio removido");
    return;
  }
  if(t.dataset.confirm){
    const a=AGENDAMENTOS.find(x=>x.id===t.dataset.confirm);
    if(a) a.status="confirmado";
    confirmadosHoje.add(t.dataset.confirm); render(); toast(R.cliCap+" "+(R.confirmado||"confirmado"));
    return;
  }
  if(t.dataset.copy){
    const a=AGENDAMENTOS.find(x=>x.id===t.dataset.copy), c=cliById(a.clienteId), s=srvById(a.servicoId);
    copiar("Oi, "+c.nome.split(" ")[0]+"! Confirmando seu horário de amanhã às "+hm(a.inicio)+" para "+s.nome.toLowerCase()+". Posso manter?");
    return;
  }
  if(t.dataset.fudone){
    contatados.add(t.dataset.fudone);
    CONTATOS.push({id:"fu"+(seqId++), clienteId:t.dataset.fudone, data:iso(TODAY), resultado:"aguardando", agendamentoId:null});
    render(); toast("Contatada · se marcar em até "+JANELA_FU+" dias, entra no funil"); return;
  }
  if(t.dataset.fucopy){
    const c=cliById(t.dataset.fucopy);
    copiar(mensagemFU(c, STATS[c.id]));
    return;
  }
});

/* arrastar e soltar os indicadores (modo Editar ordem) */
let kpiArrastado = null;
document.addEventListener("dragstart", e=>{
  const k = e.target.closest && e.target.closest(".kpis.editando .kpi"); if(!k) return;
  kpiArrastado = k.dataset.kid; k.classList.add("arrastando");
  try{ e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", kpiArrastado); }catch(err){}
});
document.addEventListener("dragover", e=>{
  const k = e.target.closest && e.target.closest(".kpis.editando .kpi"); if(!k || !kpiArrastado) return;
  e.preventDefault();
  document.querySelectorAll(".kpi.alvo").forEach(x=>x.classList.remove("alvo"));
  if(k.dataset.kid!==kpiArrastado) k.classList.add("alvo");
});
document.addEventListener("drop", e=>{
  const k = e.target.closest && e.target.closest(".kpis.editando .kpi"); if(!k || !kpiArrastado) return;
  e.preventDefault();
  normalizarOrdem();
  moverKpi(kpiArrastado, kpiOrdem.indexOf(k.dataset.kid));
  kpiArrastado = null;
  const y = window.scrollY; render(); window.scrollTo(0, y);
});
document.addEventListener("dragend", ()=>{ kpiArrastado = null;
  document.querySelectorAll(".kpi.arrastando,.kpi.alvo").forEach(x=>x.classList.remove("arrastando","alvo")); });

document.addEventListener("change", e=>{
  if(e.target.dataset && e.target.dataset.valor){
    const a = AGENDAMENTOS.find(x=>x.id===e.target.dataset.valor);
    const s = a && srvById(a.servicoId);
    if(a && s){
      const v = Math.max(s.preco, Math.round(parseFloat(e.target.value)||s.preco));
      a.preco = v; recalcStats(); render(); abrirAgendamento(a.id);
      toast("Valor ajustado para "+BRL(v));
    }
    return;
  }
  const el = e.target.closest("[data-set]");
  if(el){ ajustar(el.dataset.set, el); return; }
  if(e.target.id === "f-imp" && e.target.files && e.target.files[0]){
    receberArquivo(e.target.files[0]);
    e.target.value = "";
  }
});

document.getElementById("new-appt").addEventListener("click", ()=>abrirNovo({}));

/* --- balão de explicação dos widgets: posicionado por JS para nunca sair da tela --- */
const tipbox = document.createElement("div");
tipbox.id = "tipbox";
document.body.appendChild(tipbox);
function mostraTip(el){
  const texto = el.getAttribute("data-tip");
  if(!texto) return;
  tipbox.textContent = texto;
  tipbox.classList.add("on");
  const larg = Math.min(262, window.innerWidth - 24);
  tipbox.style.width = larg + "px";
  tipbox.style.top = "-9999px";
  const r = el.getBoundingClientRect(), alt = tipbox.offsetHeight;
  let x = r.left + r.width/2 - larg/2;
  x = Math.max(12, Math.min(x, window.innerWidth - larg - 12));
  let y = r.bottom + 8;
  if(y + alt > window.innerHeight - 8) y = Math.max(8, r.top - alt - 8);
  tipbox.style.left = Math.round(x) + "px";
  tipbox.style.top  = Math.round(y) + "px";
}
function escondeTip(){ tipbox.classList.remove("on"); tipbox.style.top = "-9999px"; }
document.addEventListener("mouseover", e=>{ const b = e.target.closest(".info"); if(b) mostraTip(b); });
document.addEventListener("mouseout",  e=>{ if(e.target.closest(".info")) escondeTip(); });
document.addEventListener("focusin",   e=>{ const b = e.target.closest(".info"); if(b) mostraTip(b); });
document.addEventListener("focusout",  e=>{ if(e.target.closest(".info")) escondeTip(); });
window.addEventListener("scroll", escondeTip, true);
window.addEventListener("resize", escondeTip);

const root=document.documentElement, tl=document.getElementById("theme-label");
function temaAtual(){
  if(root.dataset.theme) return root.dataset.theme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark":"light";
}
function pintaLabel(){ tl.textContent = temaAtual()==="dark" ? "Claro" : "Escuro"; }
document.getElementById("theme-toggle").addEventListener("click", ()=>{
  root.dataset.theme = temaAtual()==="dark" ? "light":"dark";
  pintaLabel(); render();
});
pintaLabel();
render();

// a exportação depende de o visualizador permitir salvar arquivos; sem isso, o botão não aparece
(async ()=>{
  try{
    if(window.claude && typeof window.claude.use === "function"){
      DOWNLOADS = await window.claude.use("downloads");
      if(DOWNLOADS) render();
    }
  }catch(e){ DOWNLOADS = null; }
})();
})();
