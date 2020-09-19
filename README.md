# LoLPatches

Atualizações de [LoL](https://br.leagueoflegends.com/pt-br/news/game-updates/), notícias resumidas e objetivas. Feed de patches com mudanças detalhadas em cada campeão e mais.
***
## Overview

  Scrap feito no site oficial, são organizados e salvos localmente no server.
Extração de dados das imagens feitas com módulo OCR.
Os dados são exibidos em páginas AMP geradas dinamicamente com PugJs.
***
### Installation

  `npm install`
Módulos internos foram desenvolvidos com [Puppeteer](https://github.com/puppeteer/puppeteer/blob/main/docs/api.md) utilizado no crawling; e [CheerioJS](https://cheerio.js.org/#api) scrap dos dados;
Package gerado inicialmente com [express-generator](https://expressjs.com/en/starter/generator.html);
***
### Uso

Para atualização dos Patches, utilize uma das funções disponibilizadas no final do módulo principal `main.js` e rode o script `node core/main.js`.
Caso procure automatizar as chamadas é preciso criar um CronJob de acordo as [datas oficiais](https://lol.garena.com/news/league-of-legends-patch-schedule)
**Obs**: Para usar o módulo `vision.js` é necessário autenticação com o Google Console, para configuração [veja](https://cloud.google.com/vision/docs/libraries#setting_up_authentication).
Inicie o Express com `devstart`.
***
### Contribuindo

  **O projeto está depreciado**, depois de clonado é preciso atualizar alguma querie para funcionamento do *core*. Para qualquer mudança no core crie um branch e envia a **PR** que será testada e aceita :]. Me contate se quiser dar continuidade neste repositório e irei retormar o projeto também.

#### Licença
  [Apache 2.0](https://choosealicense.com/licenses/apache-2.0/) Livre para cópia e modificações, contanto que mantenha créditos.
