CREATE DATABASE EntArtes;
--USE EntArtes;

USE entartes;
GO


---------------------------------------------------------
-- TABELAS base
---------------------------------------------------------



CREATE TABLE Utilizador (
  IdUser INT IDENTITY(1,1) PRIMARY KEY,
  Nome VARCHAR(255) NOT NULL,
  Email VARCHAR(255) UNIQUE,
  Telemovel VARCHAR(20) NOT NULL,
  Password VARCHAR(255) NOT NULL,
  Estado BIT CHECK (Estado IN (0,1))
);

CREATE TABLE Estado (
  IdEstado INT IDENTITY(1,1) PRIMARY KEY,
  TipoEstado VARCHAR(255) NOT NULL
);

CREATE TABLE TipoFigurino (
  IdTipoFigurino INT IDENTITY(1,1) PRIMARY KEY,
  TipoFigurino VARCHAR(255) NOT NULL
);

CREATE TABLE ModeloFigurino (
  IdModelo INT IDENTITY(1,1) PRIMARY KEY,
  NomeModelo VARCHAR(255) NOT NULL
);

CREATE TABLE EstadoUso (
  IdEstado INT IDENTITY(1,1) PRIMARY KEY,
  EstadoUso VARCHAR(255) NOT NULL
);

CREATE TABLE EstadoSala (
  IdEstadoSala INT IDENTITY(1,1) PRIMARY KEY,
  NomeEstadoSala VARCHAR(255) NOT NULL
);

CREATE TABLE EstadoAula (
  IdEstadoAula INT IDENTITY(1,1) PRIMARY KEY,
  NomeEstadoAula VARCHAR(255) NOT NULL
);

CREATE TABLE TipoSala (
  IdTipoSala INT IDENTITY(1,1) PRIMARY KEY,
  NomeTipoSala VARCHAR(255) NOT NULL
);

CREATE TABLE TipoAula (
  IdTipoAula INT IDENTITY(1,1) PRIMARY KEY,
  NomeTipoAula VARCHAR(255) NOT NULL
);

CREATE TABLE Modalidade (
  IdModalidade INT IDENTITY(1,1) PRIMARY KEY,
  Nome VARCHAR(255) NOT NULL
);

CREATE TABLE Grupo (
  IdGrupo INT IDENTITY(1,1) PRIMARY KEY,
  NomeGrupo VARCHAR(255) NOT NULL
);


---------------------------------------------------------
-- TABELAS dependentes de utilziadores
---------------------------------------------------------

CREATE TABLE Direcao (
  IdDirecao INT IDENTITY(1,1) PRIMARY KEY,
  UtilizadorIdUser INT NOT NULL,
  FOREIGN KEY (UtilizadorIdUser) REFERENCES Utilizador(IdUser)
);

CREATE TABLE EncarregadoEducacao (
  IdEE INT IDENTITY(1,1) PRIMARY KEY,
  UtilizadorIdUser INT NOT NULL,
  FOREIGN KEY (UtilizadorIdUser) REFERENCES Utilizador(IdUser)
);

CREATE TABLE Professor (
  IdProfessor INT IDENTITY(1,1) PRIMARY KEY,
  UtilizadorIdUser INT NOT NULL,
  FOREIGN KEY (UtilizadorIdUser) REFERENCES Utilizador(IdUser)
);

CREATE TABLE Aluno (
  IdAluno INT IDENTITY(1,1) PRIMARY KEY,
  UtilizadorIdUser INT NOT NULL,
  FOREIGN KEY (UtilizadorIdUser) REFERENCES Utilizador(IdUser)
);


---------------------------------------------------------
-- TABELAS intermédias
---------------------------------------------------------

CREATE TABLE ModalidadeProfessor (
  IdModalidadeProfessor INT IDENTITY(1,1) PRIMARY KEY,
  ModalidadeIdModalidade INT NOT NULL,
  ProfessorIdProfessor INT NOT NULL,
  FOREIGN KEY (ModalidadeIdModalidade) REFERENCES Modalidade(IdModalidade),
  FOREIGN KEY (ProfessorIdProfessor) REFERENCES Professor(IdProfessor)
);


---------------------------------------------------------
-- TABELAS principais
---------------------------------------------------------

CREATE TABLE Sala (
  IdSala INT IDENTITY(1,1) PRIMARY KEY,
  NomeSala VARCHAR(255) NOT NULL,
  Capacidade INT NOT NULL,
  EstadoSalaIdEstadoSala INT NOT NULL,
  TipoSalaIdTipoSala INT NOT NULL,
  FOREIGN KEY (EstadoSalaIdEstadoSala) REFERENCES EstadoSala(IdEstadoSala),
  FOREIGN KEY (TipoSalaIdTipoSala) REFERENCES TipoSala(IdTipoSala)
);

CREATE TABLE Figurino (
  IdFigurino INT IDENTITY(1,1) PRIMARY KEY,
  Genero VARCHAR(255),
  Tamanho VARCHAR(255),
  Cor VARCHAR(255),
  Fotografias VARCHAR(255),
  Localizacao VARCHAR(255),
  EstadoUsoIdEstado INT,
  TipoFigurinoIdTipoFigurino INT,
  ModeloFigurinoIdModelo INT,
  EncarregadoEducacaoIdEE INT,
  DirecaoIdDirecao INT,
  ProfessorIdProfessor INT,
  FOREIGN KEY (EstadoUsoIdEstado) REFERENCES EstadoUso(IdEstado),
  FOREIGN KEY (TipoFigurinoIdTipoFigurino) REFERENCES TipoFigurino(IdTipoFigurino),
  FOREIGN KEY (ModeloFigurinoIdModelo) REFERENCES ModeloFigurino(IdModelo),
  FOREIGN KEY (EncarregadoEducacaoIdEE) REFERENCES EncarregadoEducacao(IdEE),
  FOREIGN KEY (DirecaoIdDirecao) REFERENCES Direcao(IdDirecao),
  FOREIGN KEY (ProfessorIdProfessor) REFERENCES Professor(IdProfessor)
);


---------------------------------------------------------
-- TABELAS dependentes
---------------------------------------------------------


CREATE TABLE Anuncio (
  IdAnuncio INT IDENTITY(1,1) PRIMARY KEY,
  Valor INT,
  DataAnuncio DATE,
  DataInicio DATE,
  DataFim DATE,
  FigurinoIdFigurino INT,
  EstadoIdEstado INT,
  EncarregadoEducacaoIdEE INT,
  DirecaoIdDirecao INT,
  ProfessorIdProfessor INT,
  FOREIGN KEY (FigurinoIdFigurino) REFERENCES Figurino(IdFigurino),
  FOREIGN KEY (EstadoIdEstado) REFERENCES Estado(IdEstado),
  FOREIGN KEY (EncarregadoEducacaoIdEE) REFERENCES EncarregadoEducacao(IdEE),
  FOREIGN KEY (DirecaoIdDirecao) REFERENCES Direcao(IdDirecao),
  FOREIGN KEY (ProfessorIdProfessor) REFERENCES Professor(IdProfessor)
);



---------------------------------------------------------
-- TABELAS outras
---------------------------------------------------------



CREATE TABLE Disponibilidade (
  IdDisponibilidade INT IDENTITY(1,1) PRIMARY KEY,
  DataInicio DATE,
  DataFim TIME,
  DuracaoMinima TIME,
  DuracaoMaxima TIME,
  ModalidadeProfessorIdModalidadeProfessor INT,
  TipoAulaIdTipoAula INT,
  ProfessorIdProfessor INT,
  FOREIGN KEY (ModalidadeProfessorIdModalidadeProfessor) REFERENCES ModalidadeProfessor(IdModalidadeProfessor),
  FOREIGN KEY (TipoAulaIdTipoAula) REFERENCES TipoAula(IdTipoAula),
  FOREIGN KEY (ProfessorIdProfessor) REFERENCES Professor(IdProfessor)
);

CREATE TABLE PedidoDeAula (
  IdPedidoAula INT IDENTITY(1,1) PRIMARY KEY,
  Data DATE,
  HoraInicio TIME,
  DuracaoAula TIME,
  MaxParticipantes INT,
  DataPedido DATE,
  Privacidade BIT,
  DisponibilidadeIdDisponibilidade INT,
  GrupoIdGrupo INT,
  EstadoIdEstado INT,
  EncarregadoEducacaoIdEE INT,
  AlunoIdAluno INT,
  SalaIdSala INT,
  FOREIGN KEY (DisponibilidadeIdDisponibilidade) REFERENCES Disponibilidade(IdDisponibilidade),
  FOREIGN KEY (GrupoIdGrupo) REFERENCES Grupo(IdGrupo),
  FOREIGN KEY (EstadoIdEstado) REFERENCES Estado(IdEstado),
  FOREIGN KEY (EncarregadoEducacaoIdEE) REFERENCES EncarregadoEducacao(IdEE),
  FOREIGN KEY (AlunoIdAluno) REFERENCES Aluno(IdAluno),
  FOREIGN KEY (SalaIdSala) REFERENCES Sala(IdSala)
);

CREATE TABLE Aula (
  IdAula INT IDENTITY(1,1) PRIMARY KEY,
  PedidoDeAulaIdPedidoAula INT,
  SalaIdSala INT,
  EstadoAulaIdEstadoAula INT,
  FOREIGN KEY (PedidoDeAulaIdPedidoAula) REFERENCES PedidoDeAula(IdPedidoAula),
  FOREIGN KEY (SalaIdSala) REFERENCES Sala(IdSala),
  FOREIGN KEY (EstadoAulaIdEstadoAula) REFERENCES EstadoAula(IdEstadoAula)
);




---------------------------------------------------------
-- INSERTS
---------------------------------------------------------

INSERT INTO Utilizador (Nome, Email, Telemovel, Password, Estado)
VALUES ('Vitor', 'vitor@email.com', '912345678', '123', 1);