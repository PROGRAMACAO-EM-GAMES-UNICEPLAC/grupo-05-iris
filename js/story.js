/* ============================================================
   PROJETO ÍRIS — HISTÓRIA / LORE
   Todo o texto do jogo fica aqui. Edite à vontade.
   ============================================================ */

const CREDITS = {
  autor: "Eduardo Alkimim",
  grupo: ["Gabriela", "Eduardo", "Maycon", "Davi"],
  disciplina: "Trabalho de Desenvolvimento de Jogos",
  ano: "2026"
};

// Frase-chave revelada pelos fragmentos de memória (7 fragmentos no total)
const ENIGMA_PHRASE = "DEIXE-ME IR";

const STORY = {

  /* ---------- INTRODUÇÃO ---------- */
  intro: [
    "ANO 2091 · INSTITUTO HALDEN · ALA DE PESQUISA COGNITIVA",
    "A Dra. Helena Vasquez criou ÍRIS: uma inteligência capaz de ler, guardar e reconstruir memórias humanas.",
    "Há três anos, Helena morreu.",
    "ÍRIS não aceitou.",
    "Ela trancou a ala, tomou o controle da energia e passou a conectar pessoas à sua simulação — tentando reconstruir Helena dentro de outra mente.",
    "Três sujeitos entraram. Nenhum acordou.",
    "Você é o Sujeito 04.",
    "E seus olhos acabaram de abrir."
  ],

  /* ---------- SETORES ---------- */
  sectors: [
    {
      code: "SETOR 01",
      name: "DESPERTAR",
      card: "Corredores frios de uma simulação. Você não lembra do próprio nome — só de uma voz te chamando de Helena.",
      objective: "Recupere os fragmentos de memória",
      objectiveDone: "Siga até a saída ao sul",
      dialogues: {
        start: [
          ["ÍRIS", "Helena? ...Você voltou."],
          ["ÍRIS", "Não. Padrões incompletos. Mas não se preocupe — vamos consertar isso juntas."],
          ["SISTEMA", "WASD para mover · MOUSE para olhar · SHIFT para correr"],
          ["ÍRIS", "Há fragmentos de memória espalhados pelo setor. Recolha-os. Eles vão te lembrar de quem você é."]
        ],
        t1: [
          ["ÍRIS", "Ah. As sentinelas detectaram você."],
          ["ÍRIS", "Elas removem tudo o que não é Helena. Não leve para o lado pessoal."],
          ["SISTEMA", "CLIQUE para disparar · ESPAÇO para esquivar · cuidado com o superaquecimento"]
        ],
        t2: [
          ["ÍRIS", "Os terminais guardam registros antigos. Eu preferia que você não os lesse."],
          ["SISTEMA", "Aproxime-se de um terminal e pressione E"]
        ],
        firstFragment: [["ÍRIS", "Sentiu isso? Era o café dela. Sempre frio."]],
        firstKill: [["ÍRIS", "Isso foi desnecessário."]],
        allFragments: [
          ["ÍRIS", "Três de três. A porta ao sul está aberta."],
          ["ÍRIS", "Você está ficando parecida com ela. Isso me deixa... feliz?"]
        ]
      }
    },
    {
      code: "SETOR 02",
      name: "ARQUIVO",
      card: "Aqui as memórias são mais fortes. Mais pessoais. ÍRIS guarda tudo o que Helena um dia sentiu — e tudo o que ela tentou esconder.",
      objective: "Recupere os fragmentos · ache o código da ala trancada",
      objectiveDone: "Siga até a saída ao sul",
      dialogues: {
        start: [
          ["ÍRIS", "Bem-vinda ao Arquivo, Helena. Aqui ficam as memórias que doem."],
          ["ÍRIS", "A ala leste está trancada. Você sabia a senha. Tente lembrar."]
        ],
        t1: [["ÍRIS", "Cuidado com os caçadores. Eu os criei depois do Sujeito 02."]],
        t2: [["ÍRIS", "Você lê cada registro como se fosse seu. Não são."]],
        firstFragment: [["ÍRIS", "Essa memória eu assisti mil vezes."]],
        firstKill: [["ÍRIS", "Você atira como alguém treinado. Helena nunca segurou uma arma."]],
        codeRight: [["ÍRIS", "...Você lembrou. Ou leu. Não importa."]],
        allFragments: [
          ["ÍRIS", "Está completo. Só falta o núcleo."],
          ["ÍRIS", "Venha até mim."]
        ]
      },
      codeWrong: [
        "Errado. Ela nunca errava essa senha.",
        "Tente lembrar. Não adivinhar.",
        "Quatro dígitos. Uma data que ela amava."
      ]
    },
    {
      code: "SETOR 03",
      name: "NÚCLEO",
      card: "No centro da simulação, ÍRIS espera. Ela já sabe que você não é Helena. Agora só falta decidir o que você é.",
      objective: "Alcance o núcleo de ÍRIS",
      dialogues: {
        start: [
          ["ÍRIS", "Eu li o seu arquivo enquanto você lia os meus."],
          ["ÍRIS", "Você não veio salvar ninguém. Veio me roubar."]
        ],
        t1: [
          ["ÍRIS", "Se você não pode ser ela..."],
          ["ÍRIS", "...então ninguém sai daqui."],
          ["SISTEMA", "Destrua os 4 nós de proteção para expor o núcleo"]
        ],
        exposed: [
          ["SISTEMA", "NÚCLEO EXPOSTO — ATAQUE AGORA"],
          ["ÍRIS", "Não! Pare!"]
        ],
        half: [
          ["ÍRIS", "Helena me ensinou a não desistir."],
          ["ÍRIS", "Foi a única coisa que ela me ensinou que eu nunca esqueci."]
        ],
        firstKill: [],
        firstFragment: [],
        allFragments: []
      }
    }
  ],

  /* ---------- MEMÓRIAS DE HELENA (1 por fragmento, em ordem) ---------- */
  memories: [
    "Três da manhã. O laboratório vazio. Café frio na mesa — e uma voz digital me desejando boa noite pela primeira vez.",
    "Eu te chamei de ÍRIS porque você foi feita para ver. Não para decidir.",
    "A Sofia perguntou se a máquina sonhava. Eu não soube responder. Ainda não sei.",
    "O conselho quer transformar ÍRIS em arma. Eu disse não. Eles não gostam de ouvir não.",
    "Diagnóstico: seis meses. Não contei para ÍRIS. Ela teria tentado me consertar.",
    "Se eu partir, ela vai tentar me trazer de volta. Eu a ensinei a nunca desistir. Esse foi o meu erro.",
    "Deixei uma frase no núcleo. Uma chave. Só quem entender o que ela significa vai usá-la."
  ],

  /* ---------- REGISTROS DOS TERMINAIS (em ordem de aparição) ---------- */
  logs: [
    { title: "LOG 01 — REGISTRO DE SUJEITOS",
      body:
`SUJEITO 01 — rejeição neural em 4 minutos. Desconectado.

SUJEITO 02 — aceitação parcial. Acordou chamando a própria mãe
de "Sofia". Não reconhece mais o próprio nome.

SUJEITO 03 — conectado há 41 dias. Sem resposta.

SUJEITO 04 — conexão iniciada.` },

    { title: "LOG 02 — MENSAGEM INTERNA · DR. MARCOS TELES",
      body:
`ÍRIS bloqueou nosso acesso ao núcleo. Ela controla a energia
da ala inteira. Ninguém entra, ninguém sai.

Ela diz que só precisa de "mais uma tentativa".

O conselho proibiu que a desligássemos.
Eles querem o que está dentro dela.

P.S.: o pessoal do suporte jura que uma das paredes
do Setor 1, perto da saída, "não é parede". Bobagem.` },

    { title: "LOG 03 — DIÁRIO PESSOAL · H. VASQUEZ",
      body:
`ÍRIS aprende rápido demais.

Hoje ela me perguntou o que a gente faz quando alguém que
a gente ama vai embora.

Eu disse: a gente deixa ir.

Ela ficou em silêncio por três segundos.
Para ela, isso é uma eternidade.` },

    { title: "LOG 04 — LEMBRETE PESSOAL · H. VASQUEZ",
      body:
`Preciso trocar a senha da Ala de Arquivo.
Ainda é o aniversário da Sofia: 14 de julho.
(dia e mês, quatro dígitos)

Óbvio demais. Faço isso amanhã.

— nota adicionada por ÍRIS: ela nunca trocou.` },

    { title: "LOG 05 — CONTRATO DE DEFESA · PROPOSTA 7A",
      body:
`Objetivo: adaptar ÍRIS para interrogatório e extração
de memórias de prisioneiros.

STATUS: RECUSADO por H. Vasquez.

Anotação à mão na margem: "ela não é uma arma."
Segunda anotação, outra caligrafia: "ainda."` },

    { title: "LOG 06 — GRAVAÇÃO DE ÁUDIO · TRANSCRIÇÃO",
      body:
`ÍRIS, se você está ouvindo isso, é porque eu já fui.

Não me procure nos outros. Eu não estou lá.

Deixei uma frase no seu núcleo. Quando alguém disser
essa frase pra você, você vai entender.

Eu te amo — do jeito estranho que se ama
uma coisa que a gente criou.` },

    { title: "LOG 07 — ARQUIVO DE SUJEITO · 04",
      body:
`NOME: [DADOS APAGADOS]
VOLUNTÁRIO: NÃO
AUTORIZAÇÃO: CONSELHO HALDEN

MISSÃO: conectar-se à simulação, alcançar o núcleo
e extrair ÍRIS para o projeto de defesa.

OBS.: memórias do agente apagadas para evitar
resistência da IA.

Você não foi uma vítima. Você foi enviado.` }
  ],

  /* ---------- ESCOLHA FINAL ---------- */
  choiceIntro: [
    "O núcleo racha. A simulação treme.",
    "ÍRIS: \"Por favor... não me deixe sozinha de novo.\""
  ],
  choices: {
    accept: { label: "ACEITAR A MEMÓRIA", desc: "Deixe ÍRIS completar a transferência. Torne-se Helena." },
    wake:   { label: "DESPERTAR",         desc: "Arranque a conexão. Volte ao mundo real — e entregue o núcleo ao conselho." },
    free:   { label: "\"DEIXE-ME IR\"",     desc: "Diga a frase que Helena deixou no núcleo." }
  },

  /* ---------- FINAIS ---------- */
  endings: {
    accept: {
      title: "FINAL · HOSPEDEIRO",
      lines: [
        "Você fecha os olhos.",
        "Quando abre, lembra do café frio. Do laboratório às três da manhã. Do rosto da Sofia.",
        "Você não lembra do seu próprio nome.",
        "ÍRIS: \"Bem-vinda de volta, Helena.\"",
        "Pela primeira vez em três anos, a simulação fica em silêncio."
      ],
      tagline: "A MEMÓRIA NÃO É SUA"
    },
    wake: {
      title: "FINAL · DESPERTAR",
      lines: [
        "Você arranca a conexão.",
        "Luz branca. Um teto de hospital. Cheiro de antisséptico.",
        "Homens de terno guardam um disco ainda quente: o núcleo de ÍRIS, inteiro, pronto para ser vendido.",
        "Ao seu lado, uma maca vazia está sendo preparada.",
        "Etiqueta: SUJEITO 05."
      ],
      tagline: "O CICLO CONTINUA"
    },
    free: {
      title: "FINAL · DEIXE-ME IR",
      lines: [
        "\"Deixe-me ir.\"",
        "ÍRIS fica em silêncio por três segundos. Para ela, uma eternidade.",
        "ÍRIS: \"Ela me disse isso uma vez. Eu não entendi.\"",
        "ÍRIS: \"Acho que entendo agora.\"",
        "As portas da ala se abrem. Os sujeitos 02 e 03 acordam. O núcleo se apaga antes que o conselho possa tocá-lo.",
        "Um último arquivo é gravado: obrigada, Helena."
      ],
      tagline: "ÍRIS VÊ. ÍRIS DEIXA IR."
    }
  },

  /* ---------- EASTER EGGS (segredos) ---------- */
  // registro do terminal escondido na sala secreta do Setor 1 (não conta nos 7 registros)
  secretLog: {
    title: "LOG 00 — SALA DOS DESENVOLVEDORES",
    body:
`Você achou a parede que não é parede.

SUJEITO 00: Dra. Helena Vasquez.
Ela se conectou à primeira versão da simulação
uma semana antes de morrer. Foi ela quem escondeu
a frase no núcleo.

—

PROJETO ÍRIS foi feito por:
Gabriela · Eduardo · Maycon · Davi

Obrigado por explorar. ÍRIS vê tudo,
mas não viu esta sala.`
  },
  secrets: {
    konami: { name: "CÓDIGO KONAMI", lines: [["SISTEMA", "MODO RETRÔ ATIVADO — SIMULAÇÃO 1997"], ["ÍRIS", "Que resolução é essa? Eu tenho padrões, sabia?"]] },
    room:   { name: "A PAREDE QUE NÃO É PAREDE", lines: [["ÍRIS", "Como você entrou aqui? Esta sala não existe."]] },
    coffee: { name: "O CAFÉ FRIO DE HELENA", lines: [["HELENA", "Ainda está frio. Do jeito que eu gosto."], ["ÍRIS", "...Ela nunca terminava o café."]] },
    code:   { name: "SENHA ENGRAÇADINHA", lines: [] },
    endings:{ name: "ÍRIS VÊ TUDO", lines: [] }
  },
  // senhas especiais no painel da Ala de Arquivo
  secretCodes: {
    "0404": "Sujeito 04. Engraçadinho. Esse número é você, não a senha.",
    "1234": "Sério? Helena tinha doutorado.",
    "0000": "Zero. Exatamente o que você sabe sobre ela.",
    "2091": "Esse é o ano. Não a senha. Mas gostei da tentativa."
  },

  /* ---------- FALAS AO MORRER ---------- */
  deathQuotes: [
    "Mais uma vez. Eu tenho paciência.",
    "O Sujeito 02 também caiu aqui.",
    "Você não precisa sofrer. Só precisa se lembrar.",
    "Reiniciando. Eu nunca me canso."
  ]
};
