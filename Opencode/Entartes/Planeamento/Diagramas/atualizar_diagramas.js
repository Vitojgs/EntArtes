/**
 * Script to update PlantUML sources in all 5 diagram XML files
 * based on the audit corrections.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Updated PlantUML source for each diagram ──────────────────────────────

const diagrams = {

  // ── 1. Marcar Aula (M-01, M-02, M-03) ──────────────────────────────────
  marcar_aula: {
    file: 'Diagrama_Sequencia_marcar_aula.xml',
    plantuml: `@startuml
title Diagrama de Sequência - Marcar Aula

actor EncarregadoEducacao as EE

boundary PaginaMarcacaoUI as UI
control Controlador

participant PedidoDeAula
participant Aula
participant AlunoPedidoAula
participant AlunoAula

== Associar aluno a pedido pendente (Aguardar) ==

EE -> UI : escolher pedido pendente
activate UI

UI -> Controlador : inserirAlunoPedido(idAluno, idPedido)
activate Controlador

Controlador -> PedidoDeAula : obterPedido(idPedido)
activate PedidoDeAula
PedidoDeAula --> Controlador : pedido(estado="Pendente", idPedido)
deactivate PedidoDeAula

Controlador -> AlunoPedidoAula : inserir(idAluno, idPedido)
activate AlunoPedidoAula
AlunoPedidoAula --> Controlador : ok
deactivate AlunoPedidoAula

Controlador --> UI : aluno associado ao pedido
deactivate Controlador
UI --> EE : aluno inscrito (aguarda aprovação)
deactivate UI

== Associar aluno a aula confirmada (Aprovado) ==

EE -> UI : escolher aula confirmada
activate UI

UI -> Controlador : joinAula(idAluno, idAula)
activate Controlador

Controlador -> Aula : obterAulaDoPedido(idPedido)
activate Aula
Aula --> Controlador : aula(idAula, estado="CONFIRMADA")
deactivate Aula

Controlador -> AlunoAula : inserir(idAluno, idAula)
activate AlunoAula
AlunoAula --> Controlador : ok
deactivate AlunoAula

Controlador --> UI : aluno inscrito na aula
deactivate Controlador

note right of Controlador : Notificação: ALUNO_ASSOCIADO_AULA
UI --> EE : aluno associado à aula confirmada
deactivate UI

@enduml`
  },

  // ── 2. Pedido de Aula - BPMN 1 (P-03: terminologia) ────────────────────
  pedido_aula: {
    file: 'Diagrama_Sequencia_pedido_aula.xml',
    plantuml: `@startuml
title Diagrama de Sequência - Pedido de Aula (BPMN 1)

actor EncarregadoEducacao as EE
actor Direcao
actor Professor

boundary PaginaPedidoAulaUI as UI
control Controlador

participant PedidoDeAula
participant Aula
participant Estado
participant AlunoPedidoAula
participant AlunoAula
participant Sala
participant Disponibilidade

== Submissão do pedido ==

EE -> UI : preencher dados do pedido
activate UI

EE -> UI : submeterPedidoAula()
UI -> Controlador: submeterPedidoAula(dadosPedido)
activate Controlador

Controlador -> Disponibilidade : consultarDisponibilidade(idDisponibilidade)
activate Disponibilidade
Disponibilidade --> Controlador : dadosDisponibilidade
deactivate Disponibilidade

Controlador -> Sala : consultarSalaDisponivel(data,hora,duracao)
activate Sala
Sala --> Controlador : salaDisponivel
deactivate Sala

Controlador -> PedidoDeAula : registarPedido(dadosPedido, estado="Pendente")
activate PedidoDeAula
PedidoDeAula --> Controlador : pedidoRegistado(idPedido)
deactivate PedidoDeAula

Controlador --> UI : pedidoSubmetido()

UI --> EE : pedido submetido com sucesso
deactivate UI

== Direção recebe e avalia ==

Controlador -> UI : notificarPedidoPendente()
deactivate Controlador
activate UI
UI --> Direcao : receberPedido()
deactivate UI

Direcao -> UI : avaliarPedido(decisao)
activate UI
UI -> Controlador : avaliarPedido(idPedido, decisao)
activate Controlador

alt pedido aprovado

    Controlador -> Estado : atualizarEstadoPedido(idPedido, "Confirmado")
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado

    Controlador -> Aula : criarAula(idPedido, idSala, estado="CONFIRMADA")
    activate Aula
    Aula --> Controlador : aulaCriada(idAula)
    deactivate Aula

    opt existem alunos associados ao pedido
        Controlador -> AlunoPedidoAula : obterAlunosDoPedido(idPedido)
        activate AlunoPedidoAula
        AlunoPedidoAula --> Controlador : listaAlunos
        deactivate AlunoPedidoAula

        loop para cada aluno
            Controlador -> AlunoAula : associarAlunoAula(idAluno, idAula)
            activate AlunoAula
            AlunoAula --> Controlador : alunoAssociado
            deactivate AlunoAula
        end
    end

    Controlador --> UI : pedidoAprovado()
    deactivate Controlador

    note right of Controlador : Notificação: AULA_APROVADA (EE)\nNotificação: AULA_CONFIRMADA (Prof)

    UI --> EE : receber notificação de aprovação
    UI --> Professor : receber notificação de confirmação
    deactivate UI

else pedido rejeitado

    Controlador -> Estado : atualizarEstadoPedido(idPedido, "Rejeitado")
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado

    Controlador --> UI : pedidoRejeitado()
    deactivate Controlador

    note right of Controlador : Notificação: AULA_REJEITADA (EE)

    UI --> EE : receber notificação de rejeição
    deactivate UI
end

@enduml`
  },

  // ── 3. Cancelar e Remarcar Aula - BPMN 2 (C-01, C-02, C-03, C-04) ─────
  cancelar_remarcar: {
    file: 'Diagrama_Sequencia_cancelar__remarcar_aula.xml',
    plantuml: `@startuml
title Diagrama de Sequência - Cancelar e Remarcar Aula (BPMN 2)

actor Professor
actor Direcao
actor EncarregadoEducacao as EE

boundary PaginaAulaUI as UI
control Controlador

participant PedidoDeAula
participant Disponibilidade
participant Sala

== Cancelamento da aula ==

Professor -> UI : cancelarAula(idAula, motivo)
activate UI
UI -> Controlador : cancelarAula(idAula, motivo)
activate Controlador

Controlador -> PedidoDeAula : consultarAula(idAula)
activate PedidoDeAula
PedidoDeAula --> Controlador : dadosAula
deactivate PedidoDeAula

Controlador --> UI : pedidoCancelamentoRecebido()
deactivate Controlador
UI --> Direcao : receberPedidoCancelarAula()
deactivate UI

== Remarcação: percurso A (Direção propõe) ==

Direcao -> UI : remarcarAula(idAula, novaData, novaHora)
activate UI
UI -> Controlador : remarcarAula(idAula, novaData, novaHora)
activate Controlador

Controlador -> Disponibilidade : verificarDisponibilidadeProfessor(idProfessor, novaData, novaHora)
activate Disponibilidade
Disponibilidade --> Controlador : disponivel / indisponivel
deactivate Disponibilidade

alt professor sem disponibilidade
    Controlador --> UI : notificarCancelamento()
    UI --> Professor : receber notificação de cancelamento
    UI --> EE : receber notificação de cancelamento
    deactivate UI

else professor com disponibilidade

    Controlador -> Sala : ConsultarSalaDisponivel(novaData, hora, duracao)
    activate Sala
    Sala --> Controlador : salaDisponivel / salaOcupada
    deactivate Sala

    alt sala indisponível
        Controlador --> UI : notificarCancelamento()
        UI --> Professor : receber notificação de cancelamento
        UI --> EE : receber notificação de cancelamento
        deactivate UI

    else sala disponível
        Controlador -> PedidoDeAula : definir sugestaoestado="AGUARDA_PROFESSOR"
        activate PedidoDeAula
        PedidoDeAula --> Controlador : sugestaoRegistada
        deactivate PedidoDeAula

        note right of Controlador : Notificação: SUGESTAO_REMARCACAO_PROFESSOR

        Controlador --> UI : aguardarRespostaProfessor()
        deactivate Controlador
        UI --> Professor : receber proposta de remarcação
        deactivate UI

        Professor -> UI : responderSugestaoProfessor(aceitar=true)
        activate UI
        UI -> Controlador : responderSugestaoProfessor(idAula, true)
        activate Controlador
        Controlador -> PedidoDeAula : sugestaoestado="AGUARDA_EE"

        note right of Controlador : Notificação: SUGESTAO_REMARCACAO_EE

        Controlador --> UI : aguardarRespostaEE()
        deactivate Controlador
        UI --> EE : receber proposta de remarcação
        deactivate UI

        EE -> UI : responderSugestaoEE(aceitar)
        activate UI
        UI -> Controlador : responderSugestaoEE(idAula, aceitar)
        activate Controlador

        alt EE aceita
            Controlador -> PedidoDeAula : atualizarDataAula(novaData)
            note right of Controlador : sugestaoestado=null\ndata=novaData
            Controlador --> UI : aulaRemarcada()
            deactivate Controlador
            note right of Controlador : Notificação: AULA_REMARCADA
            UI --> EE : receber confirmação
            UI --> Professor : receber confirmação
            deactivate UI

        else EE rejeita
            Controlador -> PedidoDeAula : sugestaoestado=null, estado="Cancelado"
            Controlador --> UI : aulaCancelada()
            deactivate Controlador
            UI --> EE : receber notificação de cancelamento
            UI --> Professor : receber notificação de cancelamento
            deactivate UI
        end
    end
end

== Remarcação: percurso B (Professor pede, Direção aprova) ==

Professor -> UI : pedirRemarcacao(idAula)
activate UI
UI -> Controlador : pedirRemarcacao(idAula)
activate Controlador

Controlador -> PedidoDeAula : sugestaoestado="AGUARDA_DIRECAO"
note right of Controlador : Notificação: SUGESTAO_REMARCACAO_DIRECAO

Controlador --> UI : aguardarRespostaDirecao()
deactivate Controlador
UI --> Direcao : receber pedido de remarcação
deactivate UI

Direcao -> UI : responderSugestaoDirecao(idAula, aceitar, novaData)
activate UI
UI -> Controlador : responderSugestaoDirecao(idAula, bool, novaData)
activate Controlador

alt Direcao aceita
    Controlador -> PedidoDeAula : sugestaoestado="AGUARDA_EE"
    note right of Controlador : Notificação: SUGESTAO_REMARCACAO_EE
    (continua com resposta do EE igual ao percurso A)
else Direcao rejeita
    Controlador -> PedidoDeAula : sugestaoestado=null
    Controlador --> UI : pedidoRejeitado()
    deactivate Controlador
    UI --> Professor : receber notificação de rejeição
    deactivate UI
end

@enduml`
  },

  // ── 4. Alugar Figurino - BPMN 3 (A-01, A-02, A-03) ─────────────────────
  aluguer_figurino: {
    file: 'Diagrama_Sequencia_aluguer_de_figurino.xml',
    plantuml: `@startuml
title Diagrama de Sequência - Alugar Figurino / Pedido de Reserva (BPMN 3)

actor "Encarregado/Professor" as Utilizador
actor Direcao

boundary PaginaReservaUI as UI
control Controlador

participant Anuncio
participant TransacaoFigurino
participant Estado

== Selecionar anúncio ==

Utilizador -> UI : selecionarAnuncio(idAnuncio)
activate UI
UI -> Controlador : consultarAnuncio(idAnuncio)
activate Controlador

Controlador -> Anuncio : consultarAnuncio(idAnuncio)
activate Anuncio
Anuncio --> Controlador : dadosAnuncio
deactivate Anuncio

Controlador --> UI : dadosAnuncio
deactivate Controlador

== Fazer pedido de reserva ==

Utilizador -> UI : fazerPedidoReserva(dadosReserva)
UI -> Controlador : submeterPedidoReserva(dadosReserva)
activate Controlador

Controlador -> TransacaoFigurino : registarTransacao(dadosReserva)
activate TransacaoFigurino
TransacaoFigurino --> Controlador : pedidoRegistado(idTransacao)
deactivate TransacaoFigurino

note right of Controlador : Estado definido como "Pendente" pela BD

Controlador --> UI : pedidoSubmetido()
deactivate Controlador
UI --> Utilizador : pedido de reserva submetido
deactivate UI

== Direção avalia pedido ==

Direcao -> UI : receberPedidoReserva(idTransacao)
activate UI
UI -> Controlador : avaliarPedidoReserva(idTransacao, decisao)
activate Controlador

alt pedido aprovado

    Controlador -> Estado : definirEstadoTransacao(idTransacao, "Aprovado")
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado

    note right of Controlador : Notificação: ALUGUER_APROVADO

    Controlador --> UI : notificarAceitacaoPedido()
    deactivate Controlador
    UI --> Utilizador : receber notificação de aceitação
    deactivate UI

    == Utilizador confirma/cancela reserva ==

    Utilizador -> UI : confirmarReserva(idTransacao)
    activate UI
    UI -> Controlador : confirmarReserva(idTransacao)
    activate Controlador
    Controlador -> Estado : definirEstadoTransacao(idTransacao, "Confirmado")
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado
    Controlador --> UI : reservaConfirmada()
    deactivate Controlador

    note right of Controlador : Notificação: ALUGUER_CONFIRMADO

    UI --> Utilizador : reserva confirmada
    deactivate UI

    Utilizador -> UI : cancelarReserva(idTransacao)
    activate UI
    UI -> Controlador : cancelarReserva(idTransacao)
    activate Controlador
    Controlador -> Estado : definirEstadoTransacao(idTransacao, "Cancelado")
    note right of Controlador : Stock é restaurado
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado
    Controlador --> UI : reservaCancelada()
    deactivate Controlador
    UI --> Utilizador : reserva cancelada
    deactivate UI

else pedido recusado

    Controlador -> Estado : definirEstadoTransacao(idTransacao, "Rejeitado")
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado

    note right of Controlador : Notificação: ALUGUER_REJEITADO

    Controlador --> UI : notificarRejeicao()
    deactivate Controlador
    UI --> Utilizador : receber notificação de rejeição
    deactivate UI
end

@enduml`
  },

  // ── 5. Criar Anúncio - BPMN 4 (AN-01, AN-02, AN-03) ────────────────────
  criar_anuncio: {
    file: 'Diagrama_Sequencia_criar_anuncio.xml',
    plantuml: `@startuml
title Diagrama de Sequência - Criar Anúncio (BPMN 4)

actor "Vendedor (Encarregado/Professor)" as Vendedor
actor Direcao

boundary PaginaCriarAnuncioUI as UI
control Controlador

participant Figurino
participant Anuncio
participant Estado

Vendedor -> UI : iniciar criação de anúncio
activate UI

    Vendedor -> UI : selecionar figurino
    UI -> Controlador : consultarFigurino(idFigurino)
    activate Controlador
    Controlador -> Figurino : consultarFigurino(idFigurino)
    activate Figurino
    Figurino --> Controlador : dadosFigurino
    deactivate Figurino
    Controlador --> UI : figurino selecionado
    deactivate Controlador

Vendedor -> UI : preencher dados do anúncio (inclui tipotransacao: ALUGUER/VENDA)
UI -> Controlador : submeterAnuncio(dadosAnuncio, idFigurino, tipotransacao)
activate Controlador

Controlador -> Anuncio : registarAnuncio(dadosAnuncio, idFigurino, tipotransacao)
activate Anuncio
Anuncio --> Controlador : anuncioRegistado(idAnuncio)
deactivate Anuncio

note right of Controlador : Estado definido como "Pendente" pela BD

Controlador --> UI : anuncioSubmetido()
deactivate Controlador
UI --> Vendedor : submissão concluída
deactivate UI

Direcao -> UI : avaliarAnuncio(idAnuncio, decisao)
activate UI
UI -> Controlador : avaliarAnuncio(idAnuncio, decisao)
activate Controlador

alt aprovado
    Controlador -> Estado : definirEstadoAnuncio(idAnuncio, "Aprovado")
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado

    Controlador --> UI : notificarAprovacao()
    deactivate Controlador
    UI --> Vendedor : receber notificação da aprovação

else rejeitado
    Controlador -> Estado : definirEstado(idAnuncio, "Rejeitado")
    activate Controlador
    activate Estado
    Estado --> Controlador : estadoAtualizado
    deactivate Estado
    Controlador --> UI : notificarRejeicao()
    deactivate Controlador
    UI --> Vendedor : receber notificação da rejeição
    deactivate UI
end

@enduml`
  }
};

// ── Main: update each XML file ────────────────────────────────────────────

for (const [key, diag] of Object.entries(diagrams)) {
  const filePath = join(__dirname, diag.file);
  console.log(`\nProcessing: ${diag.file}`);

  let xml = readFileSync(filePath, 'utf-8');

  const match = xml.match(/plantUmlData="(\{[\s\S]*?\})"/);
  if (!match) {
    console.log(`  ERROR: plantUmlData not found in ${diag.file}`);
    continue;
  }

  const rawJson = match[1].replace(/&quot;/g, '"');
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    console.log(`  ERROR: failed to parse plantUmlData JSON: ${e.message}`);
    continue;
  }

  parsed.data = diag.plantuml;

  const newJson = JSON.stringify(parsed);
  const escapedJson = newJson.replace(/"/g, '&quot;');

  const newAttr = `plantUmlData="${escapedJson}"`;
  xml = xml.replace(match[0], newAttr);

  xml = xml.replace(
    /image=data:image\/svg\+xml,[^"]+/,
    'image=data:image/svg+xml,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg'
  );

  writeFileSync(filePath, xml, 'utf-8');
  console.log(`  OK: PlantUML updated, SVG cleared (will regenerate on draw.io open)`);
}

console.log('\nAll diagrams updated successfully!');
