# Padrão visual e acessibilidade

O frontend segue a identidade definida no README principal: azul-marinho, azul, fundo cinza claro, texto cinza escuro e fonte Inter. O nome é **GP4 | Controle de Qualidade**, acompanhado de um escudo com check.

## Identidade

| Elemento       | Diretriz                                                                 |
| -------------- | ------------------------------------------------------------------------ |
| Cor principal  | Azul-marinho `#142D4E`; marca, navegação e títulos de destaque.          |
| Cor secundária | Azul `#2563EB`; ações principais e foco.                                 |
| Fundo          | Cinza claro; superfícies de conteúdo brancas.                            |
| Texto          | Cinza escuro; texto auxiliar com contraste legível.                      |
| Tipografia     | Inter Regular 400, Semibold 600 e Bold 700, com alternativas de sistema. |
| Símbolo        | Escudo com check, sem depender de emoji do sistema.                      |
| Formulários    | Rótulos visíveis, mensagens legíveis e indicação de obrigatoriedade.     |

O README original indicava `#25663EB`, valor com sete dígitos que não é aceito como cor hexadecimal CSS. A implementação usa `#2563EB`, mantendo a intenção de azul secundário e registrando a correção no README.

## Componentes e comportamento

- A navegação agrupa operações, cadastros e consultas. O item atual tem indicação visual e semântica; o perfil controla a disponibilidade dos módulos.
- Cabeçalhos apresentam título, contexto e ação principal. Listagens têm pesquisa/filtros, estados vazios e feedback de carregamento.
- Formulários mantêm seus campos identificados e mostram falhas de validação ou da API no contexto da ação. Botões de envio indicam operações em andamento.
- Estados como **Aprovada**, **Reprovada** e **Em andamento** são escritos por extenso; a informação não depende exclusivamente da cor.
- Revisão e confirmação separam o preenchimento da decisão final de uma inspeção.
- Indicadores mostram as métricas reais da API e sua base de cálculo; ausência de dados aparece como estado vazio ou zero conforme o contrato.

## Responsividade

No desktop, a navegação lateral permanece separada do conteúdo. Em telas menores, o menu fica recolhido, os formulários e cards se reorganizam e as tabelas podem rolar horizontalmente dentro de sua própria área. A página inteira não deve exigir rolagem horizontal.

## Acessibilidade básica

O roteiro de validação deve conferir navegação por teclado, foco visível, ordem de leitura, rótulos associados aos campos, identificação de erros, botões de menu e semântica das tabelas. Elementos informativos usam texto junto às cores; gráficos devem ter valores ou descrições textuais equivalentes.

Essas verificações são uma base de usabilidade e não representam certificação de conformidade com WCAG. Testes com leitores de tela e usuários reais permanecem parte da homologação da equipe.
