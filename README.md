# Pocket Plan

MVP em HTML, CSS e JavaScript para consultar e editar fichas A/B/C no celular. Sem conta ou backend: cada navegador salva seu próprio plano em `localStorage`.

## Executar

Com Node.js 22 ou superior:

```sh
npm start
```

Abra http://localhost:4173. Para testar no celular na mesma rede, use o IP local do computador com a porta 4173 (o firewall precisa permitir a conexão). O servidor é apenas para desenvolvimento. Não abra `index.html` por `file://`, pois a aplicação usa módulos e `fetch`.

## Fluxo

1. Escolha os equipamentos em **Plan settings**.
2. Selecione A, B ou C, adicione exercícios e informe séries e repetições.
3. Toque em um exercício para consultar a demonstração, editar ou reordenar.
4. Use **Transfer plan → Export plan** para compartilhar um JSON. O colega usa **Import plan**, confere a substituição e passa a ter uma cópia independente.

O plano inicial em `data/starter-plan.json` organiza os exercícios informados pelo usuário: A tem 11 exercícios (incluindo encolhimento como opção inicial para trapézio), B tem 6 e C tem 6 exercícios de pernas. As séries começam em **3 × 10**, com atalhos para **3 × 12**. As primeiras variações são escolhas de interface, editáveis; não significam que todos os aparelhos já foram confirmados na academia. Os tipos de equipamento do datasource são amplos; confira a demonstração da variante e ajuste os equipamentos nas configurações.

O seletor de variações substitui o exercício no mesmo espaço da ficha e preserva séries, repetições e alternativas. **Move to top**, **Move up** e **Move down** alteram a ordem salva, sem marcar execução nem impor sequência. As fichas seguem livres de calendário.

O plano inicial carrega automaticamente para um navegador novo ou o plano vazio original sem alterações. Se o navegador já tinha a versão anterior do plano A/B com C vazio, somente os seis exercícios de C são acrescentados; alterações em A/B são preservadas. Planos C personalizados são preservados. **Plan settings → Load our starter A/B/C plan** permite substituir o plano inteiro após conferir a confirmação. Exportação/importação preservam as variações. Backups antigos sem variações continuam compatíveis.

O encolhimento com halteres tem demonstração adicional em https://library.theprehabguys.com/vimeo-video/shrug-dumbbell-3/. A lista de A/B registra o treino descrito pelo usuário; não é uma avaliação da adequação do volume ou da distribuição do treino.

O aplicativo não sincroniza alterações, não registra sessões e não tem suporte offline garantido. Limpar dados do navegador remove o plano; exporte um backup. Mudar domínio ou porta também muda o armazenamento acessível.

## Dados

`data/catalog.json` é uma projeção do [Exercises Dataset](https://github.com/hasaneyldrm/exercises-dataset), mantendo os 1.324 registros e apenas as instruções em inglês. IDs continuam sendo strings. O arquivo está incluído neste repositório; o catálogo funciona sem clonar o datasource. `npm run build:catalog` só é necessário para atualizar a projeção e exige uma cópia local do projeto original em `exercises-dataset/`.

```sh
npm run build:catalog
npm test
```

As 1.324 imagens em `images/` e os 1.324 GIFs em `videos/` estão incluídos neste repositório e são carregados pelos caminhos em `data/catalog.json`. O catálogo não classifica modelos específicos de máquinas.

## Licenças

Dados derivados de Exercises Dataset, Copyright (c) 2026 Hasan Emir Yıldırım, sob os termos em [THIRD_PARTY_LICENSE](THIRD_PARTY_LICENSE). As mídias são © Gym visual — https://gymvisual.com/ e seguem as condições em [NOTICE.md](NOTICE.md), fornecido com os arquivos. A interface exibe a atribuição junto às mídias. O aviso do projeto original diz que clonar o dataset não concede automaticamente uma licença própria de uso ou redistribuição das mídias.
