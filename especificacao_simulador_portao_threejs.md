# Especificação funcional e cinemática — simulador de portão residencial

**Versão:** 1.0 — conceito para implementação futura  
**Tecnologia de destino:** Three.js (simulação 3D interativa em navegador)  
**Âmbito:** documentação de requisitos; não inclui implementação, modelos CAD, código JavaScript nem dimensionamento para construção.

## 1. Objetivo e enquadramento

Pretende-se comparar duas arquiteturas de um portão residencial de grandes dimensões, com recolhimento para o interior da propriedade e sem qualquer travessa ou guia fixa acima da entrada. O simulador deverá tornar compreensível o movimento de todos os painéis, articulações, carros, rolamentos e elementos de acionamento, permitir variar dimensões e identificar incompatibilidades geométricas antes do desenvolvimento mecânico.

As duas opções devem ser simuláveis separadamente, com a mesma geometria de referência e condições de visualização. A primeira utiliza painéis articulados que percorrem dois carris com uma curva de 90°. A segunda utiliza quatro painéis em acordeão à esquerda e uma folha independente de batente à direita.

## 2. Requisitos comuns e parâmetros

A abertura total existente é aproximadamente 6 m, mas a largura útil do portão adotada para este estudo é 4,50 m. A diferença remanescente, incluindo pilares ou outros elementos, não foi medida e não deve ser preenchida com dimensões inventadas.

| Parâmetro | Valor inicial | Estado |
|---|---:|---|
| Largura útil nominal | 4,50 m | definida para o estudo |
| Altura nominal das folhas | 2,00 m | definida |
| Número de folhas (pétalas) | 5 | definido |
| Passo nominal por folha | 0,90 m | derivado; inclui folgas |
| Largura do muro esquerdo | 1,00 m | definida, aproximada |
| Profundidade de recolha | disponível, sem limite medido | parametrizar |
| Guiamento superior transversal à entrada | inexistente | requisito obrigatório |
| Abertura para a rua | não permitida | requisito obrigatório |
| Apoio vertical das folhas | pavimento, por rodas/carros quando aplicável | requisito obrigatório para o conjunto móvel |
| Carris | preferencialmente à superfície ou de baixo perfil | evitar valas profundas |
| Espessura das folhas, massa, materiais, folgas, dimensões dos carros | por definir | parâmetros configuráveis |

As dimensões nominais referem-se à geometria ideal dos eixos das articulações. Uma folha física não tem necessariamente 900 mm de largura: devem ser contabilizados dobradiças, batentes, folgas, sobreposições e vãos terminais. Não apresentar dimensões físicas como se estivessem aprovadas.

### 2.1 Referencial comum

Usar metros, segundos e radianos internamente. Definir um referencial físico com x horizontal ao longo da entrada, positivo para a direita de quem observa da rua; y horizontal, positivo para o interior; z vertical, positivo para cima. A entrada nominal ocupa x entre 0 e 4,50 m, em y = 0; o muro esquerdo ocupa aproximadamente x entre -1 e 0 m. A rua situa-se em y negativo. O plano do pavimento é z = 0. Espessura e posição em profundidade do muro são configuráveis.

O implementador deverá converter coerentemente este referencial para o sistema de eixos do Three.js (habitualmente Y vertical), sem inverter a orientação visual da abertura. Disponibilizar uma vista de planta com indicação inequívoca de RUA, INTERIOR, ESQUERDA e DIREITA.

### 2.2 Representação física comum

Cada folha é um corpo rígido vertical, com eixo de articulação vertical e uma geometria visual parametrizável (estrutura metálica, revestimento e, opcionalmente, ripado). Representar apoios no pavimento, dobradiças, caixas inferiores, carris, pilares, batentes e fechos como elementos distintos. Não tratar a geometria visual simplificada como se fosse geometria de fabricação.

Os carros cativos devem aparecer introduzidos num perfil de guia que os impede de sair verticalmente, inclusive sob forças de levantamento. A inserção inicial é feita por uma extremidade acessível do carril, posteriormente protegida com batente desmontável. Distinguir rodas de carga, elementos antilevantamento e guiamento lateral: um ponto cinemático pode corresponder a vários rolamentos físicos. O desenho de secção do carril é conceptual. Considerar drenagem, limpeza, atravessamento por pneus e acessibilidade como requisitos de projeto físico, não como questões resolvidas.

## 3. Opção 1 — cinco folhas articuladas, com dois carris em curva

### 3.1 Arquitetura e funcionamento

O portão constitui uma cadeia articulada de cinco folhas de 0,90 m de passo. Fechado, todas se encontram alinhadas na entrada. Ao abrir, deslocam-se para a esquerda, percorrem uma curva de 90° no canto esquerdo e seguem para dentro da propriedade ao longo de uma zona de armazenamento lateral. Não há enrolamento em tambor, empilhamento nem rotação individual de 180°. Totalmente aberto, o conjunto fica perpendicular à entrada, escondido tanto quanto possível atrás do muro.

Existem dois carris inferiores, contínuos e de baixo perfil: o dianteiro, mais próximo da rua no troço reto, guia as articulações entre folhas; o traseiro, 0,30 m mais para dentro, guia o terceiro apoio de cada folha. Ambos têm um troço frontal reto, uma curva e um troço lateral reto. Os raios iniciais dos eixos dos carris são 0,90 m (exterior/dianteiro) e 0,60 m (interior/traseiro). Não existe guia superior sobre a passagem.

### 3.2 Geometria dos carris

O carril dianteiro é descrito por uma coordenada curvilínea s, crescente no sentido de abertura. Seja R = 0,90 m e L = πR/2, o comprimento do arco (aproximadamente 1,414 m). Em planta, o centro da curva é (0,R).

- Troço frontal, s ≤ 0: P(s) = (-s, 0).
- Curva, 0 ≤ s ≤ L: P(s) = (-R sen(s/R), R[1 − cos(s/R)]).
- Troço de recolha, s ≥ L: P(s) = (-R, R+s−L).

O carril traseiro segue y = 0,30 m no troço frontal; uma curva concêntrica de raio 0,60 m; e x = −0,60 m no troço lateral. Usar a própria geometria desse carril para calcular a posição do apoio traseiro, e não a mesma distância curvilínea do carril dianteiro.

Os troços de recolha devem ter pelo menos 4,50 m de comprimento útil depois da curva para acomodar todas as folhas alinhadas, mais margens para carros, batentes e acionamento. Nesta implantação ideal, a extremidade mais avançada chega a y = 5,40 m quando todo o portão está no troço lateral. A posição real do muro e os envelopes dos carros podem exigir alterações. O raio de 0,90 m deixa apenas 0,10 m entre o eixo do carril exterior e o limite nominal x = −1 m; essa margem não comprova que toda a estrutura cabe.

### 3.3 Articulações e apoios

Cada folha dispõe de três pontos de apoio em planta: dois dianteiros, nas suas extremidades, e um traseiro, centrado longitudinalmente. Os apoios dianteiros coincidem com os eixos das dobradiças. Na arquitetura preferida, duas folhas adjacentes partilham um carro dianteiro. O carro deve permitir rotação das folhas relativamente à direção local da guia, sem impedir a articulação comum.

Para cinco folhas resultam seis carros dianteiros e cinco traseiros: onze carros no total, contra quinze se os apoios forem independentes. Esta partilha é uma hipótese conceptual, sujeita a validação estrutural e construtiva. Nenhum carro deve abandonar a sua guia em funcionamento normal.

O apoio traseiro é montado numa guia prismática transversal ao painel, no centro da largura, que permite variar a distância entre ele e a linha que une os dois apoios dianteiros. Esta liberdade adicional evita a sobreconstrição da geometria quando os dois apoios dianteiros percorrem uma corda do arco. A guia deverá transmitir os esforços relevantes de apoio e antilevantamento, sem permitir o tombamento livre da folha. Representar o seu curso e batentes; o mecanismo físico exato não está definido.

### 3.4 Resolução cinemática

Identificar os seis pontos dianteiros como H0 a H5, da esquerda para a direita no estado fechado. H0 é o ponto líder no sentido da abertura. Todas as distâncias |H(i+1) − H(i)| são iguais ao passo rígido w = 0,90 m. Cada H deve pertencer ao carril dianteiro.

- Fechado: coordenadas curvilíneas s_i = −i·w; H_i = (i·w,0).
- O acionamento determina s_0, a posição do líder. Os restantes s_i são calculados sequencialmente para trás, impondo s_(i+1) < s_i e distância euclidiana w entre os pontos. Selecionar a solução contínua correspondente ao estado anterior. Não espaçar os pontos simplesmente por 0,90 m de arco na curva: isso reduziria incorretamente a distância rígida entre as dobradiças.
- Para cada folha, a orientação em planta é a direção entre os seus dois H. O centro M é a média desses pontos. A normal unitária n aponta para o carril traseiro; no estado fechado aponta para y positivo.
- O apoio traseiro B deve satisfazer B = M + k·n e pertencer ao carril traseiro. Resolver k geometricamente. Não introduzir deformação da folha para compensar erros numéricos.
- O curso de retração é 0,30 − k. A caixa inferior acompanha a orientação da folha; as rodas e os carros acompanham a direção local dos seus respetivos carris.
- Aberto ideal: s_0 = L+4,50 m, s_5 = L; as cinco folhas ficam alinhadas no troço lateral. O fecho percorre os mesmos estados em sentido inverso.

### 3.5 Valores de referência para validação

Quando os dois apoios dianteiros de uma folha estão completamente sobre o arco, a distância do centro da curva ao meio da corda é √(R²−(w/2)²). Para R = w = 0,90 m, essa distância é 0,779423 m. Logo a extensão traseira necessária é k = 0,779423−0,60 = 0,179423 m, em vez dos 0,30 m dos troços retos.

O curso ideal máximo de retração é aproximadamente 120,6 mm. Numa amostragem numérica da transição, a variação máxima do ângulo entre duas folhas adjacentes foi aproximadamente 55,94°. O ângulo de 60° subtendido por uma única corda inteiramente no arco não é a mesma grandeza que o ângulo máximo entre folhas adjacentes durante a passagem pela curva de 90°.

Adotar provisoriamente um curso mecânico disponível de 150 mm no apoio traseiro para visualização, sem o considerar dimensionado ou suficiente para tolerâncias e cargas reais. Se o utilizador alterar os raios, a largura ou a distância entre carris, recalcular tudo. Sinalizar se não existir interseção admissível, se houver inversão de orientação ou se os limites do curso forem excedidos.

### 3.6 Acionamento e sequência

Adotar inicialmente um único grau de liberdade motorizado para a cadeia de folhas. O simulador pode aplicar o movimento ideal ao carro líder, mantendo as restantes folhas ligadas por restrições rígidas. Na versão física, é necessário definir uma transmissão bidirecional apta a conduzir a cadeia por uma curva e a suportar os esforços de tração e compressão sem encravamento. Corrente guiada, cabo em circuito fechado ou outro mecanismo podem ser estudados posteriormente; não está selecionada uma solução construtiva. Não representar um motor de cremalheira convencional como comprovadamente adequado à curva.

Sequência: desbloquear fecho terminal; iniciar movimento suave; percorrer a curva mantendo apoios capturados; atingir posição aberta; parar; executar percurso inverso para fechar; bloquear mecanicamente a extremidade direita. Mostrar a posição e o sentido do acionamento e distinguir comando de movimento ideal de transmissão física validada.

## 4. Opção 2 — quatro folhas em acordeão e uma folha independente

### 4.1 Arquitetura e numeração

As folhas A1, A2, A3 e A4, cada uma com 0,90 m de passo, ocupam nominalmente os primeiros 3,60 m da entrada e formam o conjunto articulado esquerdo. A folha B, com 0,90 m de passo, ocupa os 0,90 m restantes, à direita. B roda independentemente em torno de um eixo vertical no pilar direito, para dentro da propriedade. Pode funcionar como passagem pedonal; o funcionamento manual ou a motorização própria são parâmetros ainda não decididos. O acionamento de B não faz parte da sincronização das quatro folhas.

O conjunto A é apoiado no pavimento e ancorado por uma articulação ao pilar esquerdo, que não deve ser o único suporte do peso. O carril inferior é reto. Não existe travessa superior. A recolha faz-se por dobramento simultâneo de dois pares de folhas, sempre para dentro, formando dois V em planta. No estado aberto, as quatro folhas aproximam-se de uma pilha de elementos paralelos orientados para o interior.

### 4.2 Pontos de articulação e apoios no chão

| Ponto | Localização | Restrição / apoio |
|---|---|---|
| J0 | pilar esquerdo / início de A1 | eixo vertical fixo; ancoragem estrutural, não único suporte de peso |
| J1 | entre A1 e A2 | dobradiça vertical; roda giratória de apoio no pavimento; desloca-se para dentro |
| J2 | entre A2 e A3 | dobradiça vertical sobre carro cativo no carril reto |
| J3 | entre A3 e A4 | dobradiça vertical; roda giratória de apoio no pavimento; desloca-se para dentro |
| J4 | extremidade livre de A4 | carro cativo no carril reto e interface de fecho |

As rodas em J1 e J3 suportam o peso, mas não estão necessariamente retidas contra levantamento; não lhes atribuir essa capacidade no modelo. Os carros em J2 e J4 devem permanecer capturados na guia. Os eixos das dobradiças permitem dobramento alternado; batentes impedem que as articulações móveis dobrem para a rua. Representar apoio junto a J0 se necessário no modelo detalhado, sem introduzir uma restrição de movimento incompatível com o eixo fixo.

### 4.3 Modelo geométrico ideal

Seja w = 0,90 m, θ o ângulo de cada folha relativamente à direção x, e J0 = (x0,0). Inicialmente x0 = 0, para estudar a cinemática sem recuo do pilar. No modelo sincronizado, A1 e A3 formam +θ com x; A2 e A4 formam −θ. As coordenadas em planta são:

| Ponto | x | y |
|---|---|---|
| J0 | x0 | 0 |
| J1 | x0 + w cos θ | w sen θ |
| J2 | x0 + 2w cos θ | 0 |
| J3 | x0 + 3w cos θ | w sen θ |
| J4 | x0 + 4w cos θ | 0 |

Os carros J2 e J4 deslocam-se exclusivamente ao longo do carril. J1 e J3 acompanham as trajetórias determinadas pelos comprimentos rígidos e pelas dobradiças, com rodas livres sobre um pavimento plano. A orientação de cada folha é dada pelos seus dois pontos consecutivos. A dobra relativa entre folhas sucessivas é de magnitude 2θ, alternando o sinal.

θ = 0° representa o conjunto fechado. θ = 90° é apenas o limite matemático de folhas sem espessura, no qual todos os pontos do carril coincidem. Não permitir chegar a esse estado na simulação física detalhada: os carros, as dobradiças e as folhas ocupam volume. Calcular θ máximo admissível através das folgas mínimas, dos batentes e das interferências. Como referência, a 60° os quatro painéis projetam 1,80 m ao longo de x e os pontos J1 e J3 avançam cerca de 0,779 m para dentro. A 80°, a projeção ideal é 0,625 m e o avanço interior cerca de 0,886 m.

### 4.4 Automatização sincronizada 2:1

Puxar apenas J4 não garante dobramento simultâneo. J2 pode deslocar-se de forma não coordenada e um par pode dobrar antes do outro, principalmente com diferenças de atrito ou vento. A solução de referência é um único motorredutor com duas saídas de transmissão mecânica de relação 2:1 para os carros J2 e J4.

Definir d como a distância de abertura de J2, medida a partir da posição fechada. Então:

- x(J2) = x0 + 1,80 − d;
- x(J4) = x0 + 3,60 − 2d;
- θ = arccos(1 − d/1,80), no modelo ideal;
- v(J4) = 2·v(J2), em magnitude, durante abertura e fecho.

A distância entre J0 e J2 é igual à distância entre J2 e J4. Assim, ambos os pares mantêm a mesma projeção horizontal e o mesmo ângulo de dobramento, sem necessitar de motores individuais. O percurso ideal até ao limite matemático seria 1,80 m em J2 e 3,60 m em J4; os percursos reais são inferiores e dependem do ângulo final admissível.

Representar um motor comum, um veio de transmissão, rodas dentadas com relação de velocidades 2:1 e dois circuitos de corrente independentes, cada um ligado a um carro. As rodas dentadas devem ser associadas às saídas corretas: para correntes do mesmo passo e um veio comum, a roda que aciona J4 tem o dobro do número de dentes da que aciona J2. A transmissão precisa de caminhos separados, mesmo que os carros usem o mesmo carril de guiamento. Não representar ambas as correntes a atravessarem-se ou a ocuparem o mesmo espaço físico. O posicionamento definitivo de motor, retorno, tensores e proteção das correntes permanece em aberto. É possível exibir uma transmissão esquemática em modo de visualização técnica.

A variável de comando pode ser θ ou d. Para animação suave perto do ponto morto, evitar velocidade horizontal inicial instantânea: a derivada de θ relativamente ao deslocamento diverge quando θ tende a zero. Usar perfil suave ou parametrização angular que produza movimentos consistentes nos dois carros; a simulação não é um controlador industrial.

### 4.5 Molas de torção e ponto morto

Com todas as folhas alinhadas, os dois pares estão num ponto morto cinemático. O sentido inicial da dobra não fica determinado apenas pela tração longitudinal. Adotar duas molas de torção pré-carregadas nos eixos verticais J1 e J3, orientadas para iniciar a dobra para o interior.

Durante o fecho o motor vence a ação das molas e repõe a pré-carga. Na abertura, as molas fornecem um momento inicial que favorece a configuração para y positivo. Os batentes mecânicos impedem o dobramento no sentido da rua. As molas não são responsáveis por todo o acionamento, nem substituem fechos, travagem ou controlo do motor. Não especificar rigidez, pré-carga ou binário sem dados de massa, atrito e vento.

O simulador cinemático deve mostrar a mola carregada no estado fechado e o sentido do binário. Se houver modo dinâmico, utilizar parâmetros de rigidez e pré-carga configuráveis e verificar o equilíbrio perto do ponto morto. Se a mola for desativada, o modo ideal deve assinalar que não está garantida a escolha do sentido de abertura, em vez de alegar estabilidade física.

### 4.6 Folha independente à direita

No estado fechado, o eixo fixo de B situa-se nominalmente em (4,50,0), e a extremidade livre em (3,60,0). Seja φ o ângulo de abertura para dentro. A extremidade livre descreve (4,50−w cos φ, w sen φ). A folha permanece vertical e gira em torno do pilar direito. O limite inicial de visualização é 90°, mas deve ser ajustável conforme os batentes e o espaço efetivo. O suporte físico da folha B — dobradiças e eventual roda inferior — ainda não foi definido.

Permitir abrir e fechar B sem mover A, incluindo o modo pedonal. Para abrir totalmente a passagem, permitir recolher A e rodar B. A sequência preferencial de referência é abrir primeiro B para libertar a interface central e depois recolher A; no fecho, fechar A antes de B. Esta sequência é uma hipótese de segurança e deve ser configurável após validação da fechadura e das folgas. Se B estiver fechada, não permitir forçar A contra um eventual fecho comum. Verificar a colisão dos volumes durante movimentos independentes ou simultâneos.

### 4.7 Recolha efetivamente atrás do muro

A profundidade de cada folha recolhida é da ordem de 0,90 m. Porém, a projeção longitudinal do conjunto permanece positiva enquanto θ for menor que 90°. Com J0 no limite x = 0 e as folhas com espessura, não se garante que fiquem completamente escondidas atrás do muro situado entre x = −1 e 0 m.

O simulador deve mostrar o envelope real das quatro folhas dobradas, com os carros, dobradiças e folgas. Deve permitir estudar um recuo/offset do eixo J0, uma geometria de articulação de recolha adicional ou uma alteração da implantação do muro. O simples recuo do eixo com quatro folhas de passo fixo pode reduzir a cobertura quando fechado: não deslocar silenciosamente o portão nem esticar as folhas para compensar. Se existir incompatibilidade, reportá-la ao utilizador. Nenhuma dessas adaptações foi selecionada; são variantes de estudo.

## 5. Requisitos do futuro simulador em Three.js

### 5.1 Modos de operação e apresentação

- Seleção independente das duas opções; idealmente comparação lado a lado com a mesma escala e orientação.
- Vistas em perspetiva 3D, planta ortográfica, vista da rua, vista interior e inspeção de mecanismos inferiores. Possibilidade de ocultar paredes, revestimentos ou caixas para ver a cinemática.
- Comandos abrir, fechar, parar, retomar, reiniciar e posicionar continuamente ao longo do percurso. Na opção 2, comandos separados para A e B e abertura total coordenada.
- Mostrar estados fechado, em abertura, parcialmente aberto, aberto, em fecho, bloqueado e falha geométrica. Em pausa, preservar a posição atual; inverter apenas após a paragem, como regra da simulação.
- Controlos de velocidade, avanço passo a passo, alteração de dimensões e reposição dos parâmetros iniciais. Parar e recalcular o modelo se uma alteração tornar a configuração inválida.
- Destaque por cores de folhas, eixos de dobradiça, carros, apoios livres, carris e acionamentos. Mostrar trajetórias, envelopes de movimento, folgas e cotas. A visualização de linhas/eixos ideais deve poder ser alternada com componentes de volume finito.
- Indicadores numéricos: posição dos carros; ângulo absoluto de cada folha; ângulos de dobradiças; abertura útil; interferências; curso dos apoios traseiros (opção 1); relação de deslocamentos J2/J4 e estado das molas (opção 2).

### 5.2 Arquitetura funcional, sem prescrever implementação

Separar a descrição paramétrica das dimensões, o modelo cinemático, a geração de poses 3D, o estado dos comandos, a visualização e o módulo de validação. A geometria renderizada deve seguir as poses calculadas pelo modelo, não determinar o movimento por animações independentes de malhas. As dimensões dos painéis são invariantes. A mesma configuração deve produzir o mesmo resultado em diferentes taxas de atualização do navegador.

A primeira versão deverá ser cinemática, determinista e suficientemente precisa para estudar folgas. Um modo dinâmico com massas, inércias, rigidez, atrito, contacto e cargas externas é uma extensão opcional, não um requisito para a primeira versão. Não confundir trajetória possível com resistência estrutural, força de acionamento ou segurança comprovada.

### 5.3 Deteção de colisões e segurança

Verificar interseções de volumes entre folhas não destinadas a contactar, muro, pilares, carros, carris, rodas, piso e obstáculos configuráveis. Permitir contactos intencionais em eixos, batentes e guias. Distinguir avisos de proximidade e colisão efetiva. Para movimentos rápidos, subdividir o percurso ou verificar o volume varrido, evitando ignorar colisões entre duas imagens consecutivas.

Assinalar pontos de esmagamento junto às dobras, extremidades móveis, carros e correntes. Representar como requisitos do futuro sistema real: fechos mecânicos, proteção das transmissões, deteção de obstáculos, limitação de forças, paragem de emergência, fim de curso, desbloqueio manual seguro e retenção perante falha de energia. O simulador pode demonstrar eventos de paragem, mas não certifica funções de segurança. Não fornecer valores de força admissível arbitrários.

### 5.4 Cargas estruturais (visualização opcional)

Possibilitar a representação de pressão de vento, nos dois sentidos, e indicação das reações esperadas. Para o exemplo ilustrativo de 500 Pa, uma folha fechada de 0,90 × 2,00 m, totalmente opaca, recebe 900 N e um momento de 900 N·m relativamente à base, assumindo pressão uniforme e resultante a 1 m de altura. Cinco folhas recebem em conjunto 4.500 N. Na opção 1, um binário equilibrado por carris afastados 0,30 m corresponde, idealmente, a uma reação adicional de magnitude 3.000 N por carril e por folha (não inclui peso, distribuição entre carros, efeitos de dobradiças nem fatores de segurança). Quando o apoio retrai, o braço de reação pode diminuir. Na opção 2, as reações dependem fortemente da configuração das dobras e dos apoios cativos; rodas livres não resistem a levantamento.

Estes valores são ilustrativos, não representam a pressão regulamentar do local nem constituem dimensionamento. Não apresentar a animação de vetores como uma análise de elementos finitos ou aprovação de segurança.

## 6. Critérios de aceitação do simulador

| ID | Ensaio | Resultado esperado |
|---|---|---|
| C1 | Fechar as duas opções | Cinco folhas verticais cobrem nominalmente 4,50 m; sem guia fixa superior |
| C2 | Executar abertura e fecho completos | Movimento contínuo, reversível, sem alteração do comprimento dos painéis ou saída de apoios das guias |
| C3 | Introduzir obstáculo e ordenar movimento | Assinalar contacto/risco e parar no modo de segurança simulado |
| C4 | Alterar espessura, folgas e dimensões dos carros | Atualizar os envelopes e reportar incompatibilidades, sem ocultar colisões |
| C5 | Comparar vistas de planta e 3D | Mesmos pontos, cotas e orientação; nenhuma folha invade a rua no modelo admissível |
| O1.1 | Abrir opção 1 com parâmetros nominais | Seis pontos dianteiros no carril; cinco apoios traseiros no carril; passo rígido de 0,90 m |
| O1.2 | Percorrer transições reta–curva–reta | Curso de retração máximo aproximado de 120,6 mm e ângulo máximo entre folhas adjacentes próximo de 55,94° no modelo ideal |
| O1.3 | Reduzir curso admissível para menos de 120 mm | Indicar incompatibilidade da geometria nominal |
| O1.4 | Atingir posição aberta | Cinco folhas no troço lateral; verificar se o envelope cabe efetivamente atrás do muro |
| O2.1 | Abrir A com transmissão 2:1 | Deslocamento de J4 é o dobro do de J2; pares mantêm ângulos iguais; J1/J3 movem-se para dentro |
| O2.2 | Posicionar A a θ = 60° | Projeção longitudinal de 1,80 m; J1 e J3 com y ≈ 0,779 m |
| O2.3 | Aproximar do limite de dobramento | Parar antes de sobreposição de volumes; não tratar θ = 90° como configuração física realizável |
| O2.4 | Abrir apenas B | A permanece imóvel; extremidade livre de B segue um arco de raio 0,90 m |
| O2.5 | Mostrar estado fechado e início de abertura | Molas pré-carregadas, sentido da dobra para dentro e batentes representados |
| O2.6 | Verificar posição de recolha atrás do muro | Reportar a largura que continua visível na entrada e qualquer conflito entre recuo e cobertura fechada |

Para a geometria ideal, utilizar uma tolerância numérica inicial de 0,1 mm para as restrições de posição e de comprimento (não confundir com tolerância de fabricação). Para componentes com volume, as folgas físicas mínimas devem ser parâmetros independentes a validar posteriormente.

## 7. Comparação conceptual e decisões ainda em aberto

| Aspeto | Opção 1 | Opção 2 |
|---|---|---|
| Folhas | 5 em cadeia articulada | 4 em acordeão + 1 independente |
| Guiamento | 2 carris com curva de 90° | 1 carril reto para A, rodas livres nos pontos de dobra |
| Carros / apoios | 11 carros cativos na variante partilhada | 2 carros cativos + 2 rodas livres, além de J0 e apoios da folha B |
| Sincronização | cadeia de articulações, um acionamento ideal | transmissão mecânica 2:1, um motor para A, molas de torção |
| Recolha | ao longo da lateral, cerca de 4,50 m após a curva | pilha de quatro folhas, profundidade da ordem de 0,90 m |
| Principal dificuldade | curva, apoios traseiros móveis, transmissão e retenção | dobramento coordenado, retenção sob vento, espessura da pilha e recuo |
| Folha pedonal independente | não prevista | possível, à direita |

A opção 2 reduz a complexidade de fabrico esperada, mas ainda não existe orçamento nem demonstração de segurança. A opção 1 tem uma cinemática ideal numericamente verificada para o conjunto nominal de dimensões; não foi analisada a geometria de fabricação. A opção 2 tem uma lei geométrica ideal de sincronização definida, mas as interferências e a implantação de recolha não estão resolvidas.

Dados por obter antes de qualquer projeto executivo: levantamento da entrada e do muro; espessura e massa das folhas; fundação e ancoragens; perfis e rolamentos comerciais adequados; cargas de vento do local; resistência das articulações e dos pilares; solução de acionamento da opção 1; detalhe da transmissão 2:1 da opção 2; rigidez e pré-carga das molas; folgas de recolha; modo de fecho e apoio da folha B; estratégia de manutenção e segurança. A análise estrutural, a avaliação de riscos e a conformidade regulamentar do portão motorizado devem ser tratadas por profissionais competentes antes de construir ou instalar.

**Entrega esperada do futuro implementador:** simulador 3D parametrizável das duas opções, com comandos interativos, visualização de mecanismos, validação geométrica e indicação explícita dos limites do modelo. Esta especificação não solicita a implementação nesta fase.
