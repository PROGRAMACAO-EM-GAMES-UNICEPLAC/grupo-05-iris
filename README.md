# PROJETO ÍRIS

Jogo de tiro em primeira pessoa com narrativa, feito para o navegador com HTML5, JavaScript e Three.js (WebGL).

## Como jogar

**▶ Jogue online:** https://eduardoalkimim.github.io/projeto-iris/

Ou, sem internet:

1. Abra o arquivo **`index.html`** no Google Chrome ou no Edge (duplo clique). Não precisa de internet nem de servidor.
2. Use fones de ouvido e tela cheia (**F11**).

| Tecla | Ação |
|---|---|
| W A S D | mover |
| Mouse | mirar |
| Clique esquerdo (segure) | disparar |
| Shift | correr |
| Espaço | esquiva rápida (atravessa projéteis) |
| E | interagir com terminais e painéis |
| M | silenciar o som |
| Esc | pausar |

### Modo gestos (opcional, herdado do protótipo)
Ative em **OPÇÕES → CONTROLE POR GESTOS**. Precisa de webcam e internet (o reconhecimento de mão MediaPipe é baixado na hora).
- **Palma da mão**: mira (a mira acompanha a mão pela tela)
- **Pinça** (encostar polegar e indicador): atira; segurando, sai uma rajada
- **Mira na borda da tela**: gira a visão
- **WASD** com a outra mão para andar

Para ficar jogável: a mira usa o centro da palma (não treme ao fazer a pinça), um filtro tira a tremedeira, a pinça tem folga para não falhar no meio do gesto, há ajuda de mira e os inimigos ficam um pouco mais fáceis nesse modo. Se a câmera falhar, o jogo volta para o mouse sozinho.

## A história

Ano 2091. A Dra. Helena Vasquez criou **ÍRIS**, uma IA capaz de ler e reconstruir memórias humanas. Helena morreu, e ÍRIS não aceitou: trancou a ala de pesquisa e passou a conectar pessoas à sua simulação para tentar reconstruir Helena dentro de outra mente.

Você é o **Sujeito 04**. Ao recolher fragmentos de memória e ler os registros dos terminais, você descobre quem Helena era, o que ÍRIS quer e quem você é de verdade.

- **Setor 01 · Despertar**: tutorial, 3 fragmentos e sentinelas.
- **Setor 02 · Arquivo**: 4 fragmentos, caçadores e uma porta com código escondido num terminal.
- **Setor 03 · Núcleo**: confronto com ÍRIS (chefe com fases e escudo).
- **3 finais**: *Hospedeiro*, *Despertar* e o final verdadeiro, *Deixe-me ir*, que exige ler os 7 registros.

## Documentação
A documentação completa (narrativa, planejamento, descrição técnica, Easter Eggs, manual, desafios e referências) está em [`docs/Documentacao_Projeto_IRIS.pdf`](docs/Documentacao_Projeto_IRIS.pdf) e em versão Word na mesma pasta.

## Estrutura do código

```
index.html        estrutura das telas e do HUD
css/style.css     visual (menus, HUD, animações)
js/story.js       TODO o texto do jogo: lore, falas, registros, finais
js/levels.js      mapas dos setores (editáveis em texto)
js/audio.js       música e efeitos gerados por código (Web Audio API)
js/game.js        motor 3D: jogador, inimigos, chefe, colisão, itens
js/main.js        fluxo do jogo: menus, diálogos, terminais, escolhas
js/hands.js       controle por gestos (câmera + MediaPipe Hands)
js/lib/           Three.js r128 (cópia local, funciona offline)
prototipo/        primeira versão (demo com rastreamento de mão)
```

### Destaques técnicos
- **Mapas em texto**: cada caractere vira parede, inimigo, item etc. (legenda em `levels.js`).
- **Colisão em grade** (círculo contra caixas) e **linha de visão** para a IA dos inimigos.
- **IA dos inimigos**: patrulha, alerta, perseguição até a última posição vista, aviso visual antes do tiro e projéteis desviáveis.
- **Chefe em fases**: escudo, 4 nós orbitais, núcleo exposto por tempo limitado e reforços quando chega à metade da vida.
- **Áudio procedural**: nenhum arquivo de som. A música tem camadas que ficam mais intensas em combate.
- **Texturas procedurais**: geradas em `<canvas>` em tempo de execução.
- **Progresso salvo** (capítulos e finais descobertos) e opções de volume e sensibilidade em `localStorage`.

## Equipe
Desenvolvido por **Eduardo Alkimim**.
Grupo: Gabriela, Eduardo, Maycon e Davi.

## Personalizar
- Créditos: `CREDITS` em `js/story.js`.
- Textos e falas: `js/story.js`.
- Mapas: `js/levels.js`.
