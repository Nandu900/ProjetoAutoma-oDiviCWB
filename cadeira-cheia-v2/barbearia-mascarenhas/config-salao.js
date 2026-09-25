/* ==========================================================================
   Cadeira Cheia · configuração do estabelecimento
   Fonte única lida pelo painel do dono e pela página do cliente.
   Mudou um serviço, preço, pausa, rótulo ou regra de fidelidade? Mude aqui.
   Horários em minutos desde 00:00 (9h = 540). Dias: 0 = domingo … 6 = sábado.

   MODELO: Barbearia Mascarenhas · 1 profissional · 6 serviços
   ========================================================================== */
window.CADEIRA_CONFIG = {
  versao: "V2",

  estabelecimento: {
    nome: "Barbearia Mascarenhas",
    marca: "Barbearia",                       // sobretítulo da capa
    sigla: "BM",                              // selo no painel
    tagline: "Corte, barba e progressiva",
    endereco: "Av. Getúlio Vargas, 780 — Centro",
    telefone: "(31) 3555-0198",
    publico: "Barbearia masculina",
    ddd: "31",
    gradeMin: 30,
    avisoCancelamentoHoras: 4
  },

  /* ---- camada de rótulos: é o que troca o modelo de salão para barbearia ----
     Nenhum texto de gênero fica preso no código. Para clonar para outro
     estabelecimento, troque só este bloco (e o de serviços/equipe abaixo). */
  rotulos: {
    casaCap: "A barbearia",  casa: "a barbearia",  daCasa: "da barbearia",  naCasa: "na barbearia",
    cliCap: "Cliente",       cli: "cliente",       cliA: "o cliente",       cliUm: "um cliente",
    cliNovo: "cliente novo", cliPl: "clientes",    cliAsPl: "os clientes",  cliTodos: "todos os clientes",
    proCap: "Barbeiro",      pro: "barbeiro",      proA: "o barbeiro",      proPl: "barbeiros",
    proAsPl: "os barbeiros", proOutro: "outro barbeiro", proEle: "ele",     proDele: "dele",
    donoA: "o dono",         principal: "Felipe",  principalArt: "o Felipe",
    cadeira: "cadeira",
    exemploFuncao: "Ex.: Barbeiro",
    agradeco: "obrigado",   // "Só isso, obrigado" — muda para "obrigada" num salão feminino
    artigoNome: "da",       // "Aqui é DA Barbearia Mascarenhas" · num studio vira "do"
    doCli: "do cliente",     aoCli: "ao cliente",     dosCliPl: "dos clientes",   nenhumCli: "nenhum cliente",
    contatado: "contatado",  contatadosPl: "contatados", confirmado: "confirmado", cadaUm: "cada um",
    visao: "Visão do cliente"
  },

  // null = fechado · terça a sábado, sábado até 18h
  horarios: { 0: null, 1: null, 2: [540, 1140], 3: [540, 1140], 4: [540, 1140], 5: [540, 1140], 6: [540, 1080] },

  equipe: [
    { id: "p1", nome: "Felipe Mascarenhas", papel: "Barbeiro", dias: [2, 3, 4, 5, 6], ini: 540, fim: 1140, almoco: 720 }
  ],

  /* seções em que os serviços aparecem na página do cliente, nesta ordem.
     O id casa com o campo "grupo" de cada serviço. */
  gruposServico: [
    { id: "corte",   titulo: "Corte",       cap: "O carro-chefe da casa." },
    { id: "barba",   titulo: "Barba",       cap: "Toalha quente, navalha e finalização." },
    { id: "quimica", titulo: "Progressiva", cap: "Alinhamento com tempo de processamento." },
    { id: "combo",   titulo: "Combinados",  cap: "Dois ou três serviços numa visita só." }
  ],

  /* apartir: preço mínimo, fecha na avaliação (não usado nesta barbearia — preço é fixo)
     pausa: o profissional fica livre durante o processamento — {apos: min do início, dur: min}
     inclui: serviços que o combinado já resolve (usado para sugerir o combo mais barato)
     paralelo: pode ser feito ao mesmo tempo que outro serviço da mesma visita
     ciclo: em quantos dias o cliente costuma voltar para esse serviço. É a régua de quem
            veio poucas vezes. Combinado sem ciclo herda o ciclo do serviço PRINCIPAL
            (o primeiro da lista "inclui" — em Corte + Barba, quem dita a volta é o corte).
            Valores iniciais de mercado — o painel sugere o ciclo real quando houver histórico. */
  servicos: [
    { id: "s1", nome: "Corte",                       grupo: "corte",   dur: 40,  preco: 45,  pros: ["p1"], ciclo: 21,
      desc: "Máquina, tesoura e finalização." },
    { id: "s2", nome: "Barba Terapia",               grupo: "barba",   dur: 30,  preco: 35,  pros: ["p1"], ciclo: 15,
      desc: "Toalha quente, navalha, óleo e balm." },
    { id: "s3", nome: "Progressiva",                 grupo: "quimica", dur: 90,  preco: 70,  pros: ["p1"], ciclo: 60,
      desc: "Alinhamento capilar com selagem.", pausa: { apos: 40, dur: 30 } },
    { id: "s4", nome: "Corte + Barba",               grupo: "combo",   dur: 70,  preco: 70,  pros: ["p1"],
      desc: "O combo mais pedido da casa.", inclui: ["s1", "s2"] },
    { id: "s5", nome: "Corte + Progressiva",         grupo: "combo",   dur: 130, preco: 100, pros: ["p1"],
      desc: "Corte na medida e cabelo alinhado.", inclui: ["s1", "s3"], pausa: { apos: 70, dur: 30 } },
    { id: "s6", nome: "Corte + Barba + Progressiva", grupo: "combo",   dur: 160, preco: 150, pros: ["p1"],
      desc: "Visual inteiro resolvido numa sentada.", inclui: ["s1", "s2", "s3"], pausa: { apos: 95, dur: 30 } }
  ],

  // textos de chamada da página do cliente
  textos: {
    combosTitulo: "Resolva numa visita",
    combosCap: "Preço fechado, tudo na mesma sentada."
  },

  // combinações em destaque na página do cliente (a economia sai do campo "inclui")
  combos: [
    { itens: ["s4"], rotulo: "Corte + Barba" },
    { itens: ["s5"], rotulo: "Corte + Progressiva" },
    { itens: ["s6"], rotulo: "Corte + Barba + Progressiva" }
  ],

  /* perguntas da estimativa do "a partir de" — sem uso aqui (preços fixos),
     mantidas porque o motor lê a estrutura ao montar a tela */
  estimativa: {
    comprimentos: [
      { id: "curto", rotulo: "Curto",  dica: "máquina ou bem baixo" },
      { id: "medio", rotulo: "Médio",  dica: "cobre a orelha" },
      { id: "longo", rotulo: "Longo",  dica: "abaixo da nuca" },
      { id: "extra", rotulo: "Muito longo", dica: "na altura do ombro" }
    ],
    volumes: [
      { id: "fino",     rotulo: "Fino",     acrescimo: 0 },
      { id: "medio",    rotulo: "Médio",    acrescimo: 0.05 },
      { id: "volumoso", rotulo: "Volumoso", acrescimo: 0.15 }
    ]
  },

  // dados de demonstração (só no protótipo): quem aparece como cliente logado e o próximo horário dele
  exemplo: {
    clienteDemo: "Rodrigo Alves",
    proximo: { itens: ["s4"], hora: 960 }
  },

  /* situação do cliente (página Clientes e fila do follow-up)
     R = dias sem vir ÷ ritmo do cliente.
     · 1 visita: o ritmo é o ciclo do serviço → Novo (R < 1) · Não voltou (1 a perdido) · Perdido
     · 2+ visitas: o ritmo mistura a frequência real com o ciclo do serviço; o ciclo pesa como
       "pesoReferencia" intervalos, então perde força a cada visita nova
       → Em dia (R < atrasado) · Atrasado (< risco) · Em risco (< perdido) · Perdido
     · visitasConfianca: abaixo disso a tag aparece como provisória (borda tracejada)
     · novoNaFilaApos: Novo entra no follow-up a partir dessa fração do ciclo (0,5 = metade)
     · calibrarMin: nº de clientes com histórico para o painel sugerir o ciclo real do serviço */
  situacao: {
    atrasado: 1.2,
    risco: 2,
    perdido: 3,
    pesoReferencia: 2,
    visitasConfianca: 4,
    novoNaFilaApos: 0.5,
    calibrarMin: 10
  },

  /* fidelidade — prêmio fixo, editável e desativável pelo dono no painel
     premio.tipo: "servico" (um serviço grátis) | "vale" (valor em R$ para abater)
     conta: "visita" (combinado conta 1 carimbo) | "servico" (cada serviço conta 1) */
  fidelidade: {
    ativo: true,
    meta: 10,
    conta: "visita",
    premio: { tipo: "servico", servicoId: "s1", valor: 45 }
  }
};
