-- Garante que o schema public existe
CREATE SCHEMA IF NOT EXISTS public;

-- Drop das tabelas existentes (respeitando a ordem de dependência das FKs)
DROP TABLE IF EXISTS public.escala CASCADE;
DROP TABLE IF EXISTS public.evento_area_horarios CASCADE;
DROP TABLE IF EXISTS public.locais CASCADE;
DROP TABLE IF EXISTS public.areas CASCADE;
DROP TABLE IF EXISTS public.bloqueios CASCADE;
DROP TABLE IF EXISTS public.eventos CASCADE;
DROP TABLE IF EXISTS public.tipo_evento CASCADE;
DROP TABLE IF EXISTS public.mes CASCADE;
DROP TABLE IF EXISTS public.obreiros CASCADE;
DROP TABLE IF EXISTS public.padroes_bloqueio CASCADE;

-- 1. Tabela Obreiros
CREATE TABLE IF NOT EXISTS public.obreiros (
    id_obreiro SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    apelido VARCHAR(100),
    telefone VARCHAR(30),
    email VARCHAR(255),
    diacono BOOLEAN DEFAULT FALSE,
    pulpito BOOLEAN DEFAULT FALSE,
    lider BOOLEAN DEFAULT FALSE,
    ativo BOOLEAN DEFAULT TRUE,
    foto TEXT,
    data_nascimento DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela Mes
CREATE TABLE IF NOT EXISTS public.mes (
    id_mes SERIAL PRIMARY KEY,
    ano_referencia INTEGER NOT NULL CHECK (ano_referencia >= 1000),
    mes_referencia INTEGER NOT NULL CHECK (mes_referencia BETWEEN 1 AND 12),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela Tipo Evento (Modelos de eventos)
CREATE TABLE IF NOT EXISTS public.tipo_evento (
    id_tipo_evento SERIAL PRIMARY KEY,
    descricao_padrao TEXT NOT NULL,
    dia_semana_padrao INTEGER CHECK (dia_semana_padrao BETWEEN 1 AND 7),
    turno_padrao INTEGER NOT NULL,
    n_primeiro_horario_padrao INTEGER DEFAULT 0,
    exclusivo_diacono_primeiro_padrao BOOLEAN DEFAULT FALSE,
    n_segundo_horario_padrao INTEGER DEFAULT 0,
    exclusivo_diacono_segundo_padrao BOOLEAN DEFAULT FALSE,
    n_terceiro_horario_padrao INTEGER DEFAULT 0,
    exclusivo_diacono_terceiro_padrao BOOLEAN DEFAULT FALSE,
    pulpito_primeiro BOOLEAN DEFAULT TRUE,
    pulpito_segundo BOOLEAN DEFAULT TRUE,
    pulpito_terceiro BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela Bloqueios
CREATE TABLE IF NOT EXISTS public.bloqueios (
    id_bloqueio SERIAL PRIMARY KEY,
    data DATE NOT NULL,
    turno INTEGER NOT NULL,
    id_obreiro INTEGER NOT NULL REFERENCES public.obreiros(id_obreiro) ON DELETE CASCADE,
    motivo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela Eventos
CREATE TABLE IF NOT EXISTS public.eventos (
    id_evento SERIAL PRIMARY KEY,
    id_mes INTEGER NOT NULL REFERENCES public.mes(id_mes) ON DELETE CASCADE,
    data DATE NOT NULL,
    descricao TEXT,
    turno INTEGER NOT NULL,
    n_primeiro_horario INTEGER DEFAULT 0,
    exclusivo_diacono_primeiro BOOLEAN DEFAULT FALSE,
    n_segundo_horario INTEGER DEFAULT 0,
    exclusivo_diacono_segundo BOOLEAN DEFAULT FALSE,
    n_terceiro_horario INTEGER DEFAULT 0,
    exclusivo_diacono_terceiro BOOLEAN DEFAULT FALSE,
    pulpito_primeiro BOOLEAN DEFAULT TRUE,
    pulpito_segundo BOOLEAN DEFAULT TRUE,
    pulpito_terceiro BOOLEAN DEFAULT TRUE,
    -- Campos de Gestão Operacional do Culto
    traje_tipo VARCHAR(50) DEFAULT 'Camisa Preta',
    terno_cor_obrigatoria BOOLEAN DEFAULT FALSE,
    terno_cor VARCHAR(50),
    gravata_cor_obrigatoria BOOLEAN DEFAULT FALSE,
    gravata_cor VARCHAR(50),
    camisa_cor_obrigatoria BOOLEAN DEFAULT FALSE,
    camisa_cor VARCHAR(50),
    cracha_obrigatorio BOOLEAN DEFAULT TRUE,
    lideres_responsaveis_ids INTEGER[] DEFAULT '{}',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Áreas de Atuação (Setores: Igreja, Estacionamento, etc.)
CREATE TABLE IF NOT EXISTS public.areas (
    id_area SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    descricao TEXT,
    icone VARCHAR(50) DEFAULT '📍',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela de Locais de Atuação dos Obreiros
CREATE TABLE IF NOT EXISTS public.locais (
    id_local SERIAL PRIMARY KEY,
    id_area INTEGER NOT NULL REFERENCES public.areas(id_area) ON DELETE CASCADE,
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela de Horários de Funcionamento por Área no Evento
CREATE TABLE IF NOT EXISTS public.evento_area_horarios (
    id_area_horario SERIAL PRIMARY KEY,
    id_evento INTEGER NOT NULL REFERENCES public.eventos(id_evento) ON DELETE CASCADE,
    id_area INTEGER NOT NULL REFERENCES public.areas(id_area) ON DELETE CASCADE,
    horario_turno INTEGER NOT NULL CHECK (horario_turno IN (1, 2, 3)),
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_evento_area_turno UNIQUE (id_evento, id_area, horario_turno)
);

-- 9. Tabela Escala
CREATE TABLE IF NOT EXISTS public.escala (
    id_escala SERIAL PRIMARY KEY,
    id_evento INTEGER NOT NULL REFERENCES public.eventos(id_evento) ON DELETE CASCADE,
    id_obreiro INTEGER NOT NULL REFERENCES public.obreiros(id_obreiro) ON DELETE CASCADE,
    id_mes INTEGER NOT NULL REFERENCES public.mes(id_mes) ON DELETE CASCADE,
    id_local INTEGER REFERENCES public.locais(id_local) ON DELETE SET NULL,
    horario_turno INTEGER DEFAULT 1 CHECK (horario_turno IN (1, 2, 3)),
    checkin BOOLEAN,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uk_evento_obreiro UNIQUE (id_evento, id_obreiro)
);

-- 10. Tabela Usuários (Perfis de Acesso e RBAC: admin, manager, operator)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    nome_completo TEXT,
    role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.padroes_bloqueio (
    id_padrao_bloqueio SERIAL PRIMARY KEY,
    id_obreiro INTEGER NOT NULL REFERENCES public.obreiros(id_obreiro) ON DELETE CASCADE,
    
    -- Tipo da Regra: 'dias_semana', 'paridade', 'faixa_dias', 'semanas_mes', 'dias_mes', 'escala_plantao'
    tipo_regra VARCHAR(50) NOT NULL,
    
    -- Parâmetros específicos de cada tipo de regra
    dias_semana INTEGER[] DEFAULT '{}', -- [1..7] onde 1=Dom, 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex, 7=Sáb
    turno INTEGER NOT NULL DEFAULT 4,   -- 1=Manhã, 2=Tarde, 3=Noite, 4=Integral
    paridade VARCHAR(10),               -- 'par' ou 'impar'
    dia_inicio_mes INTEGER,             -- Ex: 1
    dia_fim_mes INTEGER,                -- Ex: 15
    semanas_mes INTEGER[] DEFAULT '{}', -- Ex: [1, 3] para 1ª e 3ª semana
    dias_mes INTEGER[] DEFAULT '{}',    -- Ex: [5, 20]
    
    -- Para regras de plantão cíclico (ex: trabalha 1 folga 1, ou plantão 12x36)
    data_base_plantao DATE,
    dias_trabalho INTEGER DEFAULT 1,
    dias_folga INTEGER DEFAULT 1,
    
    -- Vigência da Regra
    data_inicio DATE NOT NULL,
    data_fim DATE,                      -- NULL indica vigência indeterminada
    
    -- Estado e Metadados
    ativo BOOLEAN DEFAULT TRUE,
    motivo TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para otimização de busca
CREATE INDEX IF NOT EXISTS idx_padroes_bloqueio_obreiro ON public.padroes_bloqueio(id_obreiro);
CREATE INDEX IF NOT EXISTS idx_padroes_bloqueio_ativo ON public.padroes_bloqueio(ativo);
CREATE INDEX IF NOT EXISTS idx_padroes_bloqueio_vigencia ON public.padroes_bloqueio(data_inicio, data_fim);
