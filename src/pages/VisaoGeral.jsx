import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function verificarSecretariaOuGestao(cargo = '') {
  const c = cargo.toLowerCase()
  return (
    c.includes('administrador') ||
    c.includes('secretári') ||
    c.includes('secretari') ||
    c.includes('diretor') ||
    c.includes('vice')
  )
}

export default function VisaoGeral({ perfil, onNavegar }) {
  const [totais, setTotais] = useState({
    alunosAtivos: 0,
    turmas: 0,
    servidoresAtivos: 0,
    pendentesAprovacao: 0,
  })
  const [ultimosAvisos, setUltimosAvisos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const ehSecretariaOuGestao = verificarSecretariaOuGestao(perfil?.cargo)
  const ehDocenteOuAdmin =
    perfil?.cargo === 'Administrador(a) do Sistema' ||
    perfil?.cargo?.toLowerCase().includes('professor')

  useEffect(() => {
    carregarResumo()
  }, [])

  async function carregarResumo() {
    setCarregando(true)
    const [
      { count: countAlunos },
      { count: countTurmas },
      { data: listaPerfis },
      { data: listaAvisos },
    ] = await Promise.all([
      supabase.from('alunos').select('*', { count: 'exact', head: true }).eq('situacao', 'Ativo'),
      supabase.from('turmas').select('*', { count: 'exact', head: true }),
      supabase.from('perfis').select('status_aprovacao'),
      supabase.from('avisos').select('*').order('criado_em', { ascending: false }).limit(3),
    ])

    const ativos = (listaPerfis || []).filter((p) => p.status_aprovacao === 'ativo').length
    const pendentes = (listaPerfis || []).filter((p) => p.status_aprovacao === 'pendente').length

    setTotais({
      alunosAtivos: countAlunos || 0,
      turmas: countTurmas || 0,
      servidoresAtivos: ativos,
      pendentesAprovacao: pendentes,
    })
    setUltimosAvisos(listaAvisos || [])
    setCarregando(false)
  }

  const primeiroNome = (perfil?.nome_completo || '').split(' ')[0]

  const atalhosRapidos = [
    ...(ehDocenteOuAdmin
      ? [
          {
            id: 'frequencia',
            titulo: 'Lançar Chamada Diária',
            descricao: 'Registre presença, faltas e atestados das suas turmas.',
          },
          {
            id: 'notas',
            titulo: 'Lançar Notas Bimestrais',
            descricao: 'Atualize as avaliações e médias por disciplina.',
          },
          {
            id: 'diario',
            titulo: 'Diário de Classe',
            descricao: 'Registre os conteúdos ministrados e atividades.',
          },
        ]
      : []),
    ...(ehSecretariaOuGestao
      ? [
          {
            id: 'matriculas',
            titulo: 'Nova Matrícula / Ficha',
            descricao: 'Cadastre alunos, consulte fichas e emita declarações.',
          },
          {
            id: 'relatorio',
            titulo: 'Boletim e Relatórios',
            descricao: 'Consulte frequência consolidada e boletins escolares.',
          },
        ]
      : []),
    {
      id: 'ocorrencias',
      titulo: 'Registrar Ocorrência',
      descricao: 'Comunique ocorrências disciplinares ou pedagógicas.',
    },
    {
      id: 'grade',
      titulo: 'Consultar Grade Horária',
      descricao: 'Visualize os horários semanais por turma e turno.',
    },
    {
      id: 'historico',
      titulo: 'Histórico e Auditoria',
      descricao: 'Acompanhe o registro detalhado das atividades.',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* BANNER INSTITUCIONAL */}
      <section className="welcome-banner">
        <div>
          <h1>Olá, {primeiroNome}</h1>
          <p>
            Bem-vindo(a) ao Portal Administrativo da Escola Municipal Pedro Furtado.
            Utilize o menu lateral ou os atalhos abaixo para acessar suas rotinas escolares.
          </p>
        </div>

        <div className="welcome-badge">
          <strong>{perfil?.cargo}</strong>
          <span>Turno {perfil?.turno || 'Integral'} • Itamarati de Minas/MG</span>
        </div>
      </section>

      {/* CARDS DE INDICADORES */}
      <section className="stats-grid">
        <div className="stat-card" onClick={() => onNavegar('turmas')}>
          <div className="stat-top-row">
            <span className="stat-label">Alunos Matriculados</span>
            <div className="stat-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <strong className="stat-value">{carregando ? '...' : totais.alunosAtivos}</strong>
          <span className="stat-link">Ver turmas e alunos</span>
        </div>

        <div className="stat-card" onClick={() => onNavegar('grade')}>
          <div className="stat-top-row">
            <span className="stat-label">Turmas Ativas</span>
            <div className="stat-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
          <strong className="stat-value">{carregando ? '...' : totais.turmas}</strong>
          <span className="stat-link">Consultar grade horária</span>
        </div>

        <div className="stat-card" onClick={() => onNavegar('servidores')}>
          <div className="stat-top-row">
            <span className="stat-label">Servidores Ativos</span>
            <div className="stat-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
          </div>
          <strong className="stat-value">{carregando ? '...' : totais.servidoresAtivos}</strong>
          <span className="stat-link">Visualizar equipe escolar</span>
        </div>

        <div
          className={`stat-card ${ehSecretariaOuGestao && totais.pendentesAprovacao > 0 ? 'stat-highlight' : ''}`}
          onClick={() => onNavegar(ehSecretariaOuGestao ? 'servidores' : 'avisos')}
        >
          <div className="stat-top-row">
            <span className="stat-label">
              {ehSecretariaOuGestao ? 'Acessos Pendentes' : 'Comunicados Ativos'}
            </span>
            <div className="stat-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <strong className="stat-value">
            {carregando
              ? '...'
              : ehSecretariaOuGestao
              ? totais.pendentesAprovacao
              : ultimosAvisos.length}
          </strong>
          <span className="stat-link">
            {ehSecretariaOuGestao ? 'Gerenciar solicitações' : 'Ler mural de avisos'}
          </span>
        </div>
      </section>

      {/* ACESSO RÁPIDO POR PERFIL */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Acesso Rápido</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Atalhos diretos para as principais funções habilitadas no seu perfil.
            </p>
          </div>
        </div>

        <div className="quick-actions-grid">
          {atalhosRapidos.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className="quick-action-card"
              onClick={() => onNavegar(item.id)}
            >
              <strong>{item.titulo}</strong>
              <span>{item.descricao}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ÚLTIMOS COMUNICADOS DO MURAL */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Últimos Comunicados da Secretaria</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Avisos recentes publicados para a equipe da E.M. Pedro Furtado.
            </p>
          </div>
          <button
            type="button"
            className="btn-outline"
            style={{ marginTop: 0 }}
            onClick={() => onNavegar('avisos')}
          >
            Ver Todos os Avisos
          </button>
        </div>

        {ultimosAvisos.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Nenhum comunicado recente publicado no mural.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ultimosAvisos.map((av) => (
              <div key={av.id} className="aviso-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <strong style={{ color: 'var(--primary-dark)', fontSize: '0.96rem' }}>
                    {av.titulo}
                  </strong>
                  <span className="status-pill status-ativo">{av.publico_alvo}</span>
                </div>
                <p style={{ marginTop: 8, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5 }}>
                  {av.conteudo}
                </p>
                <div style={{ marginTop: 8, fontSize: '0.76rem', color: '#64748b' }}>
                  Publicado por {av.autor_nome} ({av.autor_cargo})
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}