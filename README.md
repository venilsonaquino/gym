# Pocket Plan

MVP em HTML, CSS e JavaScript para consultar e personalizar fichas A/B/C pelo celular. A interface abre em português brasileiro e oferece alternância para inglês. Sem conta ou backend: cada navegador salva seu próprio plano no `localStorage`.

## Executar

Com Node.js 22 ou superior:

```sh
npm start
```

Abra http://localhost:4173. Para usar no celular na mesma rede, acesse o IP local do computador pela porta 4173 (o firewall precisa permitir a conexão). O servidor serve apenas para desenvolvimento. Não abra `index.html` por `file://`, pois o aplicativo usa módulos e `fetch`.

## Usar a ficha

1. Em **Configurações da ficha**, escolha os equipamentos disponíveis na academia.
2. Alterne entre os treinos A, B e C, adicione exercícios e ajuste séries e repetições.
3. Toque em um exercício para consultar instruções, escolher uma variação ou mudar a ordem.
4. Use **Transferir ficha** para exportar um arquivo JSON. A outra pessoa pode importá-lo e terá uma cópia independente.

A ficha inicial em `data/starter-plan.json` organiza os exercícios descritos pelo usuário: A tem 11 exercícios, incluindo encolhimento como opção inicial para trapézio; B tem 6; C tem 6 exercícios de pernas. Os exercícios começam em **3 × 10**, com atalho para **3 × 12**. As variações são sugestões editáveis e não confirmam que os aparelhos existem naquela academia. O catálogo descreve tipos genéricos de equipamento; confira a demonstração e ajuste os equipamentos nas configurações.

A troca de variação conserva séries, repetições e as demais alternativas. A pessoa pode mover exercícios ao início, para cima ou para baixo, sem registrar execução nem impor sequência. A ficha não exige dias fixos.

O plano inicial é carregado em um navegador novo ou em uma ficha vazia sem alterações. Se o navegador tiver a versão anterior do plano A/B com C vazio, os exercícios de C são acrescentados, preservando edições em A/B. Uma ficha C personalizada também é preservada. **Carregar ficha inicial A/B/C** permite substituir o plano depois de confirmar. A importação/exportação preserva as variações e continua compatível com backups antigos.

O encolhimento com halteres tem uma demonstração adicional em https://library.theprehabguys.com/vimeo-video/shrug-dumbbell-3/. A lista A/B registra o treino descrito pelo usuário e não avalia volume ou distribuição.

O aplicativo não sincroniza alterações, registra sessões ou garante suporte offline. Limpar os dados do navegador remove a ficha; exporte um backup. Mudar o domínio ou a porta muda o armazenamento acessível.

## Dados e tradução

`data/catalog.json` é uma projeção do [Exercises Dataset](https://github.com/hasaneyldrm/exercises-dataset), com 1.324 exercícios, IDs e instruções originais em inglês. Cada exercício inclui também um objeto `ptBR` com nome, categoria, equipamento, músculos-alvo e instruções. Neste catálogo, 3.970 de 7.710 instruções têm texto traduzido; as demais mantêm o original em inglês. Campos sem tradução preservam a fonte para não perder informação. As traduções automáticas são para consulta e podem exigir ajustes nos termos usados em cada academia.

Para reconstruir o catálogo a partir de uma cópia local do dataset original em `exercises-dataset/`:

```sh
npm run build:catalog
```

A reconstrução conserva as traduções dos mesmos IDs. Para preencher ou atualizar traduções, com acesso à internet:

```sh
npm run translate:pt-BR
```

O script traduz frases distintas em lotes, guarda o progresso em `data/.pt-br-translation-cache.json` (ignorado pelo Git) para permitir retomada e grava o resultado em `data/catalog.json`, preservando em inglês os trechos ainda não traduzidos. Se a conexão com o serviço falhar, execute o comando novamente quando ele estiver disponível. O aplicativo usa o catálogo incluído e não consulta o serviço de tradução durante a execução.

As 1.324 imagens em `images/` e os 1.324 GIFs em `videos/` estão incluídos no repositório. O catálogo não especifica modelos de máquinas por academia.

## Licenças

Os dados derivam do Exercises Dataset, Copyright (c) 2026 Hasan Emir Yıldırım, conforme [THIRD_PARTY_LICENSE](THIRD_PARTY_LICENSE). As mídias são © Gym visual — https://gymvisual.com/ — conforme [NOTICE.md](NOTICE.md), fornecido com os arquivos. O aplicativo exibe a atribuição junto às mídias. O aviso do dataset original esclarece que clonar o dataset não concede automaticamente uma licença própria de uso ou redistribuição das mídias.
