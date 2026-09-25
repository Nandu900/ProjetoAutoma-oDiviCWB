/* ==========================================================================
   Cadeira Cheia · configuração do estabelecimento
   Fonte única lida pelo painel da dona e pela página da cliente.
   Mudou um serviço, preço, pausa, rótulo ou regra de fidelidade? Mude aqui.
   Horários em minutos desde 00:00 (9h = 540). Dias: 0 = domingo … 6 = sábado.

   MODELO: Sirlene Lamounier Studio · salão feminino · 3 profissionais · 14 serviços
   ========================================================================== */
window.CADEIRA_CONFIG = {
  versao: "V2",

  estabelecimento: {
    nome: "Sirlene Lamounier Studio",
    marca: "Studio",                          // sobretítulo da capa
    sigla: "SL",                              // selo no painel
    tagline: "Cabelo, unhas e sobrancelha",
    endereco: "Rua das Palmeiras, 214 — Centro",
    telefone: "(31) 3555-0142",
    publico: "Só para mulheres",
    ddd: "31",
    gradeMin: 30,
    avisoCancelamentoHoras: 4
  },

  /* ---- camada de rótulos: todo texto com gênero sai daqui, nada fica no código ---- */
  rotulos: {
    casaCap: "O studio",     casa: "o studio",      daCasa: "do studio",      naCasa: "no studio",
    cliCap: "Cliente",       cli: "cliente",        cliA: "a cliente",        cliUm: "uma cliente",
    cliNovo: "cliente nova", cliPl: "clientes",     cliAsPl: "as clientes",   cliTodos: "todas as clientes",
    proCap: "Profissional",  pro: "profissional",   proA: "a profissional",   proPl: "profissionais",
    proAsPl: "as profissionais", proOutro: "outra profissional", proEle: "ela", proDele: "dela",
    donoA: "a dona",         principal: "Sirlene",  principalArt: "a Sirlene",
    cadeira: "cadeira",
    exemploFuncao: "Ex.: Manicure",
    agradeco: "obrigada",
    artigoNome: "do",        // "Aqui é DO Sirlene Lamounier Studio"
    doCli: "da cliente",     aoCli: "à cliente",    dosCliPl: "das clientes", nenhumCli: "nenhuma cliente",
    contatado: "contatada",  contatadosPl: "contatadas", confirmado: "confirmada", cadaUm: "cada uma",
    visao: "Visão da cliente"
  },

  // null = fechado · terça a sábado, sábado até 18h
  horarios: { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] },

  equipe: [
    { id: "p1", nome: "Sirlene Lamounier", papel: "Cabelo, botox e sobrancelha", dias: [2, 3, 4, 5, 6], ini: 540, fim: 1140, almoco: 720 },
    { id: "p2", nome: "Juliana",           papel: "Manicure e pedicure",         dias: [2, 3, 4, 5],    ini: 540, fim: 1080, almoco: 720 },
    { id: "p3", nome: "Carla",             papel: "Manicure e pedicure",         dias: [3, 4, 5, 6],    ini: 600, fim: 1140, almoco: 780 }
  ],

  /* seções da página da cliente, nesta ordem (também é a ordem da visita: cabelo, sobrancelha, unhas) */
  gruposServico: [
    { id: "cabelo",      titulo: "Cabelo",      cap: "Com a Sirlene. Toque para escolher e somar outros serviços." },
    { id: "sobrancelha", titulo: "Sobrancelha", cap: "Design com a Sirlene, rápido de encaixar na mesma visita." },
    { id: "unhas",       titulo: "Unhas",       cap: "Com Juliana ou Carla; quando dá, ao mesmo tempo que o cabelo." }
  ],

  /* apartir: preço mínimo; o valor fecha na avaliação (faixas = estimativa por comprimento, em R$)
     pausa: a profissional fica livre durante o processamento — {apos: min do início, dur: min}
     paralelo: pode ser feito ao mesmo tempo que outro serviço da mesma visita (ex.: mão durante a escova)
     ciclo: em quantos dias a cliente costuma voltar para esse serviço — a régua de quem veio poucas vezes.
            Valores iniciais de mercado: validar com a Sirlene (o painel sugere o ciclo real com histórico). */
  servicos: [
    { id: "s1",  nome: "Corte",                         grupo: "cabelo",      dur: 60,  preco: 80,  pros: ["p1"], ciclo: 45,
      desc: "Corte com lavagem e finalização." },
    { id: "s2",  nome: "Escova",                        grupo: "cabelo",      dur: 45,  preco: 50,  pros: ["p1"], ciclo: 10,
      desc: "Lavagem e escova modelada.",
      apartir: true, faixas: { curto: [50, 60], medio: [60, 75], longo: [75, 90], extra: [90, 110] } },
    { id: "s3",  nome: "Hidratação + escova",           grupo: "cabelo",      dur: 90,  preco: 120, pros: ["p1"], ciclo: 21,
      desc: "Máscara de tratamento e finalização." },
    { id: "s4",  nome: "Hidratação c/ ozônio + escova", grupo: "cabelo",      dur: 105, preco: 150, pros: ["p1"], ciclo: 21,
      desc: "Hidratação com vapor de ozônio e escova." },
    { id: "s5",  nome: "Gloss + escova",                grupo: "cabelo",      dur: 90,  preco: 150, pros: ["p1"], ciclo: 30,
      desc: "Brilho e realce de cor, sem clarear.", pausa: { apos: 20, dur: 20 } },
    { id: "s6",  nome: "Retoque de coloração",          grupo: "cabelo",      dur: 90,  preco: 90,  pros: ["p1"], ciclo: 35,
      desc: "Retoque de raiz.", pausa: { apos: 30, dur: 30 } },
    { id: "s7",  nome: "Mechas",                        grupo: "cabelo",      dur: 240, preco: 450, pros: ["p1"], ciclo: 90,
      desc: "Mechas com matização.", pausa: { apos: 90, dur: 60 } },
    { id: "s8",  nome: "Mechas + hidratação + escova",  grupo: "cabelo",      dur: 300, preco: 600, pros: ["p1"], ciclo: 90,
      desc: "Dia completo: mechas, tratamento e finalização.", pausa: { apos: 90, dur: 60 } },
    { id: "s9",  nome: "Progressiva",                   grupo: "cabelo",      dur: 180, preco: 180, pros: ["p1"], ciclo: 90,
      desc: "Alisamento com selagem.",
      apartir: true, pausa: { apos: 60, dur: 60 }, faixas: { curto: [180, 220], medio: [220, 260], longo: [260, 300], extra: [300, 340] } },
    { id: "s10", nome: "Botox",                         grupo: "cabelo",      dur: 150, preco: 180, pros: ["p1"], ciclo: 60,
      desc: "Redução de volume e brilho.",
      apartir: true, pausa: { apos: 45, dur: 45 }, faixas: { curto: [180, 200], medio: [200, 230], longo: [230, 260], extra: [260, 290] } },
    { id: "s11", nome: "Sobrancelha",                   grupo: "sobrancelha", dur: 30,  preco: 40,  pros: ["p1"], ciclo: 20,
      desc: "Design de sobrancelha." },
    { id: "s12", nome: "Pé e mão",                      grupo: "unhas",       dur: 90,  preco: 60,  pros: ["p2", "p3"], ciclo: 12,
      desc: "Manicure e pedicure completas.", paralelo: true },
    { id: "s13", nome: "Mão",                           grupo: "unhas",       dur: 45,  preco: 35,  pros: ["p2", "p3"], ciclo: 10,
      desc: "Cutícula, lixa e esmalte.", paralelo: true },
    { id: "s14", nome: "Pé",                            grupo: "unhas",       dur: 45,  preco: 35,  pros: ["p2", "p3"], ciclo: 15,
      desc: "Pedicure completa.", paralelo: true }
  ],

  // textos de chamada da página da cliente
  textos: {
    combosTitulo: "Combine e resolva numa visita",
    combosCap: "Quando dá, as unhas são feitas ao mesmo tempo que o cabelo."
  },

  // combinações sugeridas na página da cliente (aqui somam serviços avulsos, sem preço fechado)
  combos: [
    { itens: ["s2", "s11"], rotulo: "Escova + sobrancelha" },
    { itens: ["s3", "s12"], rotulo: "Hidratação + pé e mão" },
    { itens: ["s2", "s13"], rotulo: "Escova + mão" }
  ],

  // perguntas da estimativa do "a partir de"
  estimativa: {
    comprimentos: [
      { id: "curto",  rotulo: "Curto",       dica: "acima do ombro" },
      { id: "medio",  rotulo: "Médio",       dica: "na altura do ombro" },
      { id: "longo",  rotulo: "Longo",       dica: "até o meio das costas" },
      { id: "extra",  rotulo: "Extra longo", dica: "abaixo do meio das costas" }
    ],
    volumes: [
      { id: "fino",     rotulo: "Fino",     acrescimo: 0 },
      { id: "medio",    rotulo: "Médio",    acrescimo: 0.05 },
      { id: "volumoso", rotulo: "Volumoso", acrescimo: 0.15 }
    ]
  },

  // histórico de exemplo da cliente logada na página: [dias atrás, serviço]
  historicoExemplo: [[-16,"s12"],[-31,"s1"],[-48,"s2"],[-62,"s12"],[-89,"s7"],[-117,"s13"]],

  // dados de demonstração (só no protótipo)
  exemplo: {
    clienteDemo: "Renata Alves",
    proximo: { itens: ["s3", "s12"], hora: 900 },       // hidratação com a Sirlene + pé e mão ao mesmo tempo
    nomes: ["Ana Beatriz","Carla","Juliana","Patrícia","Fernanda","Letícia","Camila","Simone","Renata","Mariana",
      "Débora","Vivian","Aline","Tatiane","Bianca","Priscila","Larissa","Natália","Elaine","Roberta","Manuela","Yasmin",
      "Sabrina","Cristina","Gabriela","Isabela","Adriana","Kelly","Lívia","Vanda",
      "Rosângela","Luciana","Marta","Sônia","Beatriz","Helena","Clara","Valéria","Eliane","Raquel","Denise","Márcia","Paula",
      "Luana","Jéssica","Thaís","Flávia","Silvana","Regina","Cláudia","Michele","Viviane","Sandra","Rafaela","Carolina",
      "Heloísa","Laura","Andreia","Mônica","Maria Clara"],
    obs: ["","","","","Prefere horário no fim do dia.","Esmalte sempre em tons nude.","Alergia a amônia.","Café sem açúcar.",
      "Vem com a filha.","Costuma atrasar 10 min.","Cabelo muito fino, escova leve.","Couro cabeludo sensível ao secador."],
    // perfis de frequência da base de exemplo: quais serviços faz, com quem, a cada quantos dias
    perfis: [
      { pros: ["p1"],       servs: ["s2","s2","s3","s4","s1"],  freq: [14,28] },   // cabelo de rotina
      { pros: ["p1"],       servs: ["s6","s5","s7","s9","s10"], freq: [45,90] },   // química e cor
      { pros: ["p2","p3"],  servs: ["s13","s12","s12"],         freq: [7,14]  },   // unhas toda semana
      { pros: ["p2","p3"],  servs: ["s12","s14","s12"],         freq: [14,24] },   // unhas quinzenal
      { pros: ["p1"],       servs: ["s11"],                     freq: [20,32] },   // só sobrancelha
      { pros: ["p1","p2"],  servs: ["s1","s2","s11","s12"],     freq: [21,35] }    // cabelo + unhas
    ],
    pesos: [0,0,1,2,2,3,3,3,4,5]
  },

  /* situação da cliente (página Clientes e fila do follow-up) — mesma régua da V1.1 da barbearia
     R = dias sem vir ÷ ritmo da cliente. 1 visita: ritmo = ciclo do serviço → Novo · Não voltou · Perdido.
     2+ visitas: o ritmo mistura a frequência real com o ciclo (o ciclo pesa como "pesoReferencia" intervalos). */
  situacao: {
    atrasado: 1.2,
    risco: 2,
    perdido: 3,
    pesoReferencia: 2,
    visitasConfianca: 4,
    novoNaFilaApos: 0.5,
    calibrarMin: 10
  },

  /* fidelidade — prêmio fixo, editável e desativável pela dona no painel */
  fidelidade: {
    ativo: true,
    meta: 10,
    conta: "visita",
    premio: { tipo: "servico", servicoId: "s3", valor: 50 }
  }
};
