# Simulador de portões — Riachos

Aplicação interativa em português para comparar duas soluções de portão residencial em 3D:

- **Recolha em curva:** cinco folhas articuladas, seis carros dianteiros e cinco apoios traseiros retráteis, guiados por dois carris com curva de 90°.
- **Acordeão + batente:** quatro folhas em acordeão à esquerda (A) e uma folha pedonal independente à direita (B).

É um modelo cinemático conceptual para explorar movimentos, folgas e ocupação do espaço. Os resultados não constituem dimensionamento mecânico nem autorização para construção.

## Requisitos

- Navegador moderno com JavaScript, módulos ES, import maps e WebGL 2 ativos.
- Ligação à Internet para carregar **Three.js 0.180.0** e `OrbitControls` através de `cdn.jsdelivr.net`.
- Para o serviço: Docker Engine e Docker Compose v2.
- Para execução local alternativa: Python 3. Node.js é opcional para verificar os módulos e o modelo numérico.

Não há backend, base de dados, instalação de pacotes npm ou etapa de compilação. O servidor disponibiliza HTML, CSS e módulos JavaScript.

## Ativar o serviço

Na raiz do repositório:

```sh
docker compose up -d --wait
```

Abrir **http://localhost:8081** no servidor ou **http://192.168.1.149:8081** na rede local desta instalação. O endereço de rede depende do servidor onde o projeto for executado.

O serviço `web` utiliza `nginx:alpine`, publica a porta 8081 nas interfaces do servidor e verifica periodicamente a resposta HTTP. A política `unless-stopped` permite o reinício automático quando o Docker arranca, exceto se o contentor tiver sido parado explicitamente. O arranque do próprio Docker deve estar configurado no sistema anfitrião.

Para escolher outra porta:

```sh
PORT=8082 docker compose up -d --wait
```

### Operação

```sh
# Estado e saúde
docker compose ps

# Acompanhar os registos
docker compose logs -f --tail=100 web

# Reiniciar o servidor, por exemplo após alterar nginx.conf
docker compose restart web

# Parar e remover o contentor e a rede deste projeto
docker compose down
```

Os cinco ficheiros da aplicação e a configuração Nginx são montados individualmente em modo de leitura. O diretório Git e os restantes ficheiros do repositório não são publicados. Alterações aos ficheiros da aplicação não exigem compilação; atualizar a página para as carregar. Se um editor substituir o ficheiro e a montagem continuar a mostrar a versão anterior, recriar o contentor:

```sh
docker compose up -d --force-recreate --wait
```

### Execução local sem Docker

```sh
python3 -m http.server 8081 --bind 127.0.0.1
```

Abrir http://localhost:8081 e terminar com `Ctrl+C`. Este servidor serve o diretório de trabalho, pelo que esta alternativa fica limitada ao acesso local. Abrir `index.html` diretamente com `file://` pode impedir o carregamento dos módulos.

## Utilização

1. Escolher a vista: **Perspetiva**, **Planta**, **Rua**, **Interior** ou **Mecanismos**. As vistas e a velocidade aplicam-se às duas simulações.
2. Em cada cartão, usar **Abrir**, **Fechar**, **Parar** e **Retomar**. O cursor de posição e os botões **− / +** permitem explorar o percurso; **Reiniciar** repõe as posições desse cartão.
3. No acordeão, a sequência coordenada abre B antes de recolher A; no fecho, estende A antes de fechar B. B também possui comandos e cursor próprios. Sem coordenação, abrir B manualmente antes de mover A.
4. Expandir **Parâmetros e camadas** para alterar dimensões, carris, apoios, batentes, muro e obstáculo de ensaio. As caixas permitem mostrar ou ocultar muros, revestimento, eixos e envelopes, bem como ativar molas e obstáculo.
5. Consultar as métricas, avisos e **Leituras cinemáticas** para observar ângulos, coordenadas, cursos e envelope em planta.

As alterações de parâmetros interrompem a animação e recalculam a geometria, mantendo as posições quando possível. **Repor parâmetros** restaura as dimensões e as opções de molas, obstáculo e sequência; as camadas visuais são controladas separadamente. As configurações não são guardadas entre carregamentos da página.

## Valores iniciais

| Parâmetro | Valor |
|---|---:|
| Largura útil / altura | 4,50 m / 2,00 m |
| Raio do carril dianteiro / traseiro | 0,90 m / 0,60 m |
| Distância entre carris | 0,30 m |
| Curso disponível do apoio traseiro | 0,15 m |
| Troço lateral útil depois da curva | 4,80 m |
| Espessura geral / folhas de A | 0,045 m / 0,022 m |
| Folga descontada no comprimento dos painéis | 0,14 m |
| Largura do muro esquerdo | 1,00 m |
| Posição do eixo fixo J0 do acordeão | x = −0,88 m |
| Batente pedido de A / B | 85° / 90° |

Os valores efetivos estão em `initial`, no ficheiro `modelo.mjs`. O limite efetivo de A é calculado por colisões e pode ser inferior ao batente pedido: com estes valores fica aproximadamente em **81°**. O recuo de J0 faz com que o passo das quatro folhas A seja calculado por `(0,8 × largura − offset) / 4`, inicialmente **1,12 m**; a folha B tem passo de **0,90 m**.

O modelo físico usa x para a direita de quem observa da rua, y para o interior e z para cima. A visualização converte esses pontos para Three.js como `(x, z, −y)`. As dimensões internas são em metros e os ângulos de cálculo em radianos.

## Organização do código

| Ficheiro | Responsabilidade |
|---|---|
| `index.html` | Interface, modelo dos cartões, import map e mensagem de falha de carregamento. |
| `estilo.css` | Aspeto visual, disposição responsiva e estados dos controlos. |
| `modelo.mjs` | Parâmetros, geometria dos carris, resolução das folhas e apoios, colisões em planta, envelopes e abertura útil. Não depende de Three.js nem do DOM. |
| `simulador.mjs` | Controlos, sequência de movimentos, animação, validação incremental e leituras. |
| `visual.mjs` | Cenas Three.js, câmaras, OrbitControls e representação dos componentes. |
| `compose.yaml` | Serviço HTTP, porta, montagens, reinício e healthcheck. |
| `nginx.conf` | Servidor estático e tipos MIME, incluindo `.mjs`. |
| `especificacao_simulador_portao_threejs.md` | Especificação de referência, mais ampla do que a implementação atual. |

## Verificação e resultados da revisão

Verificar a sintaxe e a resposta do serviço:

```sh
node --check modelo.mjs
node --check simulador.mjs
node --check visual.mjs
curl -I http://localhost:8081/
curl -I http://localhost:8081/modelo.mjs
```

O módulo deve responder com `Content-Type: application/javascript`. No navegador, confirmar que aparecem dois desenhos 3D, experimentar a abertura e o fecho e consultar a consola se houver falhas.

Na revisão de 26-11-2026, a amostragem de 1001 posições do portão em curva e 2002 posições da sequência de abertura do acordeão, com os parâmetros iniciais, não produziu erros do validador. O cálculo reproduziu **120,58 mm** de retração traseira máxima e **55,94°** de dobra máxima entre folhas no portão em curva. Estes resultados verificam o modelo implementado com a configuração inicial; não comprovam todas as combinações possíveis de parâmetros nem a viabilidade física.

### Limitações identificadas

- A deteção de colisões utiliza retângulos orientados em planta e amostragem incremental do movimento. Não inclui todos os volumes desenhados, contactos tridimensionais, tolerâncias ou deformações. O limite de A é procurado em passos de 0,2°.
- Molas e acionamentos são representações conceptuais. Não há simulação de forças, massas, atrito, vento, potência do motor ou resistência estrutural.
- A abertura útil é uma estimativa geométrica baseada nos painéis próximos da linha da entrada; deve ser interpretada juntamente com os envelopes e avisos.
- Os limites individuais dos campos não garantem uma combinação válida. O simulador pode interromper o movimento por colisão, falta de curso ou profundidade insuficiente.
- Não existe uma suite automatizada de testes no repositório, exportação de resultados ou persistência de configurações. A especificação descreve objetivos adicionais e não deve ser tomada como lista de funcionalidades concluídas.
- A aplicação depende da CDN para iniciar. Uma utilização sem Internet exige disponibilizar Three.js e os addons localmente e ajustar o import map.

## Resolução de problemas

- **Página indisponível:** verificar `docker compose ps`, os registos e se a porta escolhida está livre. Para acesso remoto, confirmar o endereço do servidor e as regras de rede.
- **Página sem visualização 3D:** verificar a ligação à CDN, o suporte WebGL 2 e a consola do navegador. Extensões de privacidade ou políticas de rede podem bloquear módulos externos.
- **Erro MIME ao importar `.mjs`:** confirmar que o servidor usa `application/javascript`; a configuração Nginx incluída já o define.
- **Falha geométrica ou bloqueio:** ler o aviso do cartão, ajustar os parâmetros ou remover o obstáculo e voltar a comandar o movimento. No acordeão, verificar a abertura prévia de B.
