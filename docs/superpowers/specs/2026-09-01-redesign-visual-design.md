# Redesign visual — do livro-caixa de papel à linguagem clara

Data: 2026-09-01
Status: aprovado para planejamento

## 1. O que muda e por quê

O app nasceu com uma direção declarada em `src/lib/tema.ts`: livro-caixa de
papel — fundo pautado esverdeado, réguas de 1px no lugar de sombras, números em
monoespaçada, barra de abas puramente tipográfica. É coerente e está justificada
em comentário.

O pedido é outro: adotar a linguagem de um app de finanças moderno — fundo
azul-claro, cartões brancos com sombra difusa, ícones, azul como cor de ação,
FAB circular no centro da barra de abas, saldo herói com olho de ocultar, par
receitas/despesas e rosca de categorias.

Isto **substitui** a direção anterior. Não é um refino dela.

### Decisões tomadas antes desta spec

| Questão | Decisão |
|---|---|
| Profundidade | Trocar a linguagem visual inteira. O vocabulário de papel sai. |
| Escopo | Pele nova + reorganização da navegação. Sem funcionalidade nova. |
| Navegação | Espelhar a referência: Principal / Transações / (+) / Planejamento / Mais. |
| Acessibilidade | Preservar os invariantes existentes e vestir o visual por cima. |
| Execução | Vocabulário novo em `tema.ts` + camada de primitivas, migração guiada pelo compilador. |

## 2. Não-objetivos

Fora do escopo, explicitamente:

- **Cartões de crédito e faturas.** Aparecem na referência, exigem tabelas,
  migration reversível, regra de fechamento e parcelamento. É uma fase própria.
- **Modo escuro.** `app.json` fixa `userInterfaceStyle: "light"` e a referência é
  clara. A paleta abaixo é validada só para o modo claro.
- **Qualquer mudança em `lib/`, `services/`, `repositories/` ou no schema.** O
  redesign não toca regra de negócio. Os 222 testes existentes cobrem essas
  camadas e devem passar sem alteração — se algum quebrar, é sinal de que lógica
  vazou para a camada visual, e isso é um bug a corrigir, não um teste a ajustar.
- **Fonte customizada.** Continua sem `expo-font`; as faces são as do sistema.

## 3. Paleta e tokens

Todos os valores abaixo foram **medidos**, não escolhidos por gosto. Contraste é
WCAG 2.1; separação para daltonismo é ΔE OKLab ×100 sob simulação
Machado-Oliveira-Fernandes, via o validador do skill de dataviz.

### 3.1 Superfícies e texto

| Token | Hex | Papel |
|---|---|---|
| `fundo` | `#F4F7FC` | fundo do app |
| `superficie` | `#FFFFFF` | cartão, folha, barra de abas |
| `superficieBaixa` | `#EDF1F7` | trilha vazia, estado pressionado |
| `contorno` | `#E6EBF2` | divisor de lista, onde ainda faz sentido um fio |
| `texto` | `#16202E` | 15,28:1 no fundo · 16,40:1 na superfície |
| `textoMedio` | `#566579` | 5,54:1 · 5,94:1 |
| `textoFraco` | `#5F6E82` | 4,84:1 · 5,20:1 |

`textoFraco` foi escurecido duas vezes durante a validação. Os candidatos
`#8493A6` (2,92:1), `#77869B` (3,45:1), `#6B7A8F` (4,07:1) e `#64748B` (4,43:1)
reprovaram sobre `fundo`. O tom claro bonito da referência não sobrevive a 4,5:1;
`#5F6E82` é o primeiro que sobrevive.

### 3.2 Ação e semântica

| Token | Hex | Fundo pálido | Medições |
|---|---|---|---|
| `acento` | `#2563EB` | `acentoFundo` `#EAF1FE` | branco sobre acento 5,17:1 · acento como texto 5,17:1 na superfície e 4,81:1 no fundo · acento sobre `acentoFundo` 4,56:1 |
| `entrada` | `#0F7A43` | `entradaFundo` `#E2F5EA` | 5,41:1 · 5,03:1 · ícone sobre o chip 4,76:1 |
| `saida` | `#C0322B` | `saidaFundo` `#FBE0DE` | 5,63:1 · 5,24:1 · ícone sobre o chip 4,51:1 |
| `aporte` | `#4338CA` | `aporteFundo` `#E2E0FA` | 7,90:1 · 7,36:1 · ícone sobre o chip 6,13:1 |

**Os chips seguem a referência e a acessibilidade ao mesmo tempo.** Na imagem, o
par receitas/despesas é um círculo pálido com a seta colorida dentro — não um
círculo saturado com seta branca. Isso é uma sorte: branco sobre `#16A34A` dá
3,30:1 e reprovaria; a seta escura sobre o chip pálido passa. `acentoFundo`
também subiu de `#E4EDFD` (4,39:1) para `#EAF1FE`, e `entradaFundo` de `#D8F0E2`
(4,50:1) para `#E2F5EA`.

### 3.3 Paleta da rosca de categorias

Três categorias nomeadas mais "Outros", como na referência.

| Fatia | Hex |
|---|---|
| 1ª categoria | `#2A78D6` |
| 2ª categoria | `#EB6834` |
| 3ª categoria | `#1BAF7A` |
| `OUTRAS` | `#94A3B8` |

Os três primeiros são os slots 1–3 do tema categórico validado do skill de
dataviz, que é exatamente o corte que passa em **todos os pares** (não só nos
adjacentes) — o quarto slot do tema poria amarelo ao lado de laranja e reprovaria.
Por isso a rosca mostra top-3 + "Outras", e não top-4.

**Isto não exige nada novo na camada de serviço.**
`distribuicaoPorCategoria` já corta em `limite` fatias e agrega o resto sob a
constante `OUTRAS` (`saudeFinanceira.ts:254-258`); hoje é chamada com o padrão
`limite = 7`. A rosca simplesmente chama com `limite: 3`. O nome da fatia
agregada é "Outras", que já é o texto do app.

Relatório do validador para os quatro juntos, superfície branca, `--pairs all`:

```
[PASS] Lightness band         all 4 inside L 0.43–0.77
[FAIL] Chroma floor           below floor (reads gray): [["#94a3b8",0.035]]
[WARN] CVD separation         worst all-pairs #94a3b8↔#1baf7a ΔE 8.0 (deutan) · tritan 9.5
[PASS] Normal-vision floor    worst all-pairs #94a3b8↔#1baf7a ΔE 15.4 (normal)
[WARN] Contrast vs surface    below 3:1 — relief required: [["#1baf7a",2.82],["#94a3b8",2.56]]
```

**Desvio deliberado e registrado:** o piso de croma existe para impedir que uma
cor vire cinza sem querer. Aqui virar cinza é a intenção — cinza comunica "não é
uma categoria". Todos os portões que protegem o leitor passam.

**Alívio obrigatório, não opcional.** O WARN de CVD e o WARN de contraste só são
legais com codificação secundária. Portanto, na rosca:

- toda fatia é rotulada com nome e valor ao lado do ponto colorido — como a
  própria referência faz. Identidade nunca depende de cor.
- 2px de vão da cor da superfície entre fatias vizinhas.
- número e rótulo vestem token de texto, nunca a cor da fatia.

### 3.3.1 O gráfico de 12 meses não muda de forma

`GraficoReceita` permanece **série única mais média móvel**, e continua na tela
de Saúde. A justificativa está no próprio arquivo: o par verde/vermelho do app
deu ΔE 4,8 em deuteranopia, abaixo até do piso de 6, e duas séries nessas cores
seriam indistinguíveis. O redesign repinta esse gráfico com a paleta nova; não
o converte para barras verde/vermelho como na referência.

### 3.4 Tipografia

Sans-serif do sistema em toda parte; a hierarquia vem de peso e escala.

| Token | Tamanho / peso |
|---|---|
| `saldoHeroi` | 32 / 700 |
| `titulo` | 17 / 600 |
| `secao` | 15 / 600 |
| `corpo` | 14 / 400 |
| `apoio` | 12 / 400 |
| `valor` | 15 / 600 |
| `valorApoio` | 12 / 400 |

**Exceção justificada:** a monoespaçada não era só estética. `tema.ts:63-65`
registra que ela existe para o valor não tremer enquanto o teclado numérico
digita. Sans-serif proporcional faz o número dançar a cada dígito. A face de
largura fixa **permanece exclusivamente no visor de digitação** de
`FolhaLancamento`/`TecladoNumerico`, exposta como `tipografia.visorDigitacao`.
Em nenhum outro lugar do app.

### 3.5 Forma e elevação

- `raio`: `sm: 8`, `md: 12`, `lg: 16`, `folha: 24`, `pill: 999`.
- `espaco`: mantém a escala de 4 que já existe (`xs` 4 … `xxl` 32).
- `elevacao.cartao` e `elevacao.flutuante`: `elevation` do Android mais
  `shadowColor/Opacity/Radius/Offset` para paridade.
- `REGUA` é **removido**. Separação passa a ser sombra e espaço. O único fio que
  sobrevive é `contorno`, em divisores de lista.

## 4. Camada de primitivas — `src/components/ui/`

O padrão "cartão" está hoje copiado em pelo menos quatro arquivos
(`ResumoDoMes.tsx:104-112`, `saude.tsx`, `GraficosSaude.tsx`, `objetivos.tsx`),
cada um repetindo `backgroundColor` + `borderRadius` + `borderWidth` +
`borderColor`. Com sombra no lugar da régua, isso viraria sombra copiada em
quatro lugares — que é exatamente como um redesign apodrece.

| Primitiva | Contrato |
|---|---|
| `Cartao` | superfície branca, raio `lg`, `elevacao.cartao`, padding padrão. Aceita `style` para exceções. |
| `ChipIcone` | círculo de fundo pálido com ícone da cor forte. Props: `nome`, `tom` (`entrada`/`saida`/`aporte`/`acento`/`neutro`), `tamanho`. |
| `PillValor` | `ChipIcone` + rótulo + valor. É o par Receitas/Despesas. |
| `Seccao` | título (`tipografia.secao`), legenda opcional, conteúdo. |
| `Icone` | casca fina sobre `@expo/vector-icons`. Escolhe o conjunto em **um** lugar; o resto do app pede ícone por nome semântico. |

Cada uma é testável de olho isoladamente e nenhuma conhece domínio financeiro
além do `tom`.

## 5. Telas

| Rota | Conteúdo | Origem |
|---|---|---|
| `(tabs)/index.tsx` — Principal | cabeçalho de mês, saldo herói com olho, `PillValor` receitas/despesas, rosca por categoria, atalho para saúde | bloco herói de `ResumoDoMes` + rosca nova sobre `distribuicaoPorCategoria(…, 3)` |
| `(tabs)/transacoes.tsx` — Transações | cabeçalho de mês + lista agrupada por dia | `ListaDoMes` + o corpo atual de `index.tsx` |
| `(tabs)/planejamento.tsx` — Planejamento | abas internas Recorrências \| Objetivos | corpo extraído de `recorrencias.tsx` e `objetivos.tsx` |
| `(tabs)/mais.tsx` — Mais | lista de destinos: Saúde financeira, Diagnóstico do banco | novo |
| `saude.tsx` | painel de saúde completo, agora empilhado | `(tabs)/saude.tsx` |
| `debug.tsx` | inalterado no conteúdo, repintado | `debug.tsx` |

Principal, Transações e Saúde continuam compartilhando `useMesStore` — navegar
entre elas mantém o mesmo recorte de tempo, como já acontece hoje.

`recorrencias.tsx` e `objetivos.tsx` deixam de ser rotas de aba; seus corpos
viram componentes consumidos por `planejamento.tsx`. `experiments.typedRoutes`
está ligado, então qualquer `href` órfão vira erro de tipo.

## 6. Estado compartilhado

### 6.1 A folha de lançamento sobe de nível

Hoje a folha é estado local da tela do mês (`index.tsx:31-32`) e o botão `+` vive
dentro dela. Com o FAB na barra de abas, ele precisa abrir a folha de **qualquer**
aba. Então:

- `FolhaLancamento` é montada uma vez em `(tabs)/_layout.tsx`.
- Um store mínimo `useFolhaLancamento` expõe `aberta`, `emEdicao`, `abrir(item?)`,
  `fechar()`. Mesmo padrão do `useMesStore` que já existe.
- O FAB chama `abrir()`. Um toque numa linha de Transações chama `abrir(item)`.

### 6.2 O olho de ocultar

É comportamento novo, não pintura. Estado local da tela Principal, **não
persistido**: fechar o app faz os valores voltarem. Persistir "esconder saldo" é
decisão de privacidade que cabe ao dono do app, não a esta spec.

Acessibilidade: o botão é `accessibilityRole="button"` com rótulo que reflete o
estado (`Mostrar valores` / `Ocultar valores`) e área de toque mínima de 44dp.

## 7. Navegação

`BarraDeAbas` reescrita: superfície branca, quatro abas com ícone e rótulo curto,
aba ativa em `acento` (5,17:1), inativa em `textoFraco` (5,20:1), e o FAB
circular de `acento` com glifo branco (5,17:1) sobreposto ao centro.

Os rótulos encolhem mas **não somem** — ícone sozinho não nomeia destino. Cada
aba mantém `accessibilityRole="tab"` e `accessibilityState={{ selected }}`, como
já faz hoje.

Área de toque: 44dp mínimos em cada aba e no FAB.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Número tremendo ao digitar, após sair a monoespaçada | `tipografia.visorDigitacao` mantém largura fixa no visor do teclado (§3.4) |
| Rosca ilegível para daltônicos | Top-3 + Outros validado; fatias direto-rotuladas; vão de 2px (§3.3) |
| FAB não abre a folha fora da aba Principal | Folha içada para o layout das abas + store (§6.1) |
| `href` apontando para rota que deixou de existir | `typedRoutes` transforma em erro de compilação |
| Regressão silenciosa de regra de negócio | Os 222 testes cobrem `lib/`/`services/` e não podem precisar de ajuste |
| `@expo/vector-icons` ausente | Instalar com `npx expo install` na etapa 1 |

## 9. Etapas de entrega

Cada etapa compila e passa em `tsc --noEmit` sozinha.

1. **Tokens e primitivas** — `@expo/vector-icons` instalado, `tema.ts` reescrito,
   `src/components/ui/` criado. O app **não** compila ao final da reescrita de
   `tema.ts`; é `tsc` quem enumera cada ponto de uso quebrado, e a etapa só fecha
   quando a lista zera.
2. **Componentes** — `ResumoDoMes`, `ListaDoMes`, `GraficoReceita`,
   `GraficosSaude`, `TrilhaDupla`, `CabecalhoMes`, `LinhaDeslizavel`, as três
   folhas e o teclado, todos passando a consumir as primitivas.
3. **Telas** — divisão de Principal/Transações, criação de Planejamento e Mais,
   saúde e diagnóstico empilhados.
4. **Navegação** — `BarraDeAbas` com ícones e FAB, folha içada para o layout,
   store `useFolhaLancamento`.

## 10. Verificação

Ao final de cada etapa: `npx tsc --noEmit`.

Ao final da etapa 4:

- `npx vitest run` — 222 testes, sem alteração esperada em nenhum.
- `npx expo export --platform android` — o bundle precisa gerar.
- Conferência visual no aparelho: a tela Principal, o FAB abrindo a folha a
  partir de cada uma das quatro abas, e o olho ocultando todos os valores.

O que esta spec **não** garante e precisa de olho humano: se o resultado é
bonito. Contraste e separação de cor são computáveis e foram computados;
proporção, ritmo e peso não são.
