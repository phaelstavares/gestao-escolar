import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import logoEscola from './assets/empf-logo.jpg'
import AuthPage from './pages/AuthPage'
import VisaoGeral from './pages/VisaoGeral'
import Matriculas from './pages/Matriculas'
import TurmasAlunos from './pages/TurmasAlunos'
import GradeHoraria from './pages/GradeHoraria'
import Frequencia from './pages/Frequencia'
import RelatorioFrequencia from './pages/RelatorioFrequencia'
import BoletimNotas from './pages/BoletimNotas'
import DiarioAulas from './pages/DiarioAulas'
import Ocorrencias from './pages/Ocorrencias'
import MuralAvisos from './pages/MuralAvisos'
import GestaoServidores from './pages/GestaoServidores'
import HistoricoGeral from './pages/HistoricoGeral'
import MeuPerfil from './pages/MeuPerfil'

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

function IconeMenu({ id }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (id) {
    case 'inicio':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
      )
    case 'avisos':
      return (
        <svg {...props}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )
    case 'matriculas':
      return (
        <svg {...props}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      )
    case 'turmas':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'grade':
      return (
        <svg {...props}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      )
    case 'relatorio':
      return (
        <svg {...props}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      )
    case 'frequencia':
      return (
        <svg {...props}>
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    case 'notas':
      return (
        <svg {...props}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
    case 'diario':
      return (
        <svg {...props}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      )
    case 'ocorrencias':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )
    case 'servidores':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      )
    case 'historico':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      )
    default:
      return (
        <svg {...props}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregandoPerfil, setCarregandoPerfil] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('inicio')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) carregarPerfil(session.user.id)
      else setCarregandoPerfil(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) carregarPerfil(session.user.id)
      else {
        setPerfil(null)
        setCarregandoPerfil(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function carregarPerfil(userId) {
    setCarregandoPerfil(true)
    const { data } = await supabase.from('perfis').select('*').eq('id', userId).single()
    if (data) setPerfil(data)
    setCarregandoPerfil(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  if (!session) return <AuthPage />

  if (carregandoPerfil) {
    return (
      <div className="auth-container login-box" style={{ textAlign: 'center' }}>
        <p>Carregando permissões...</p>
      </div>
    )
  }

  if (perfil?.status_aprovacao !== 'ativo') {
    return (
      <div className="auth-container login-box" style={{ textAlign: 'center' }}>
        <div className="auth-header">
          <img src={logoEscola} alt="Logo E.M. Pedro Furtado" className="auth-logo" />
          <h1>Olá, {perfil?.nome_completo}</h1>
          <p>{perfil?.cargo} • Turno {perfil?.turno}</p>
          <span
            className={`status-pill ${perfil?.status_aprovacao === 'bloqueado' ? 'status-bloqueado' : 'status-pendente'}`}
            style={{ marginTop: '12px' }}
          >
            {perfil?.status_aprovacao === 'bloqueado' ? 'Acesso Bloqueado' : 'Aguardando Aprovação'}
          </span>
        </div>
        <p style={{ fontSize: '0.92rem', color: '#475569', lineHeight: 1.5 }}>
          Assim que o administrador liberar seu acesso, os módulos da escola ficarão disponíveis.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button onClick={() => carregarPerfil(session.user.id)} className="btn-outline">Verificar novamente</button>
          <button onClick={handleLogout} className="btn-outline">Sair</button>
        </div>
      </div>
    )
  }

  const ehSecretariaOuGestao = verificarSecretariaOuGestao(perfil.cargo)
  const ehDocenteOuAdmin =
    perfil.cargo === 'Administrador(a) do Sistema' ||
    perfil.cargo.toLowerCase().includes('professor')

  const menuSecoes = [
    {
      categoria: 'Geral',
      itens: [
        { id: 'inicio', label: 'Visão Geral' },
        { id: 'avisos', label: 'Mural de Avisos' },
      ],
    },
    {
      categoria: 'Secretaria Escolar',
      itens: [
        ...(ehSecretariaOuGestao ? [{ id: 'matriculas', label: 'Matrículas e Transferências' }] : []),
        { id: 'turmas', label: 'Turmas e Alunos' },
        { id: 'grade', label: 'Grade Horária' },
        { id: 'relatorio', label: 'Boletim e Relatórios' },
      ],
    },
    {
      categoria: 'Área Pedagógica',
      itens: [
        ...(ehDocenteOuAdmin
          ? [
              { id: 'frequencia', label: 'Chamada Diária' },
              { id: 'notas', label: 'Lançar Notas' },
              { id: 'diario', label: 'Diário de Classe' },
            ]
          : []),
        { id: 'ocorrencias', label: 'Ocorrências' },
      ],
    },
    {
      categoria: 'Administração',
      itens: [
        { id: 'servidores', label: 'Servidores e Equipe' },
        { id: 'historico', label: 'Histórico e Auditoria' },
        { id: 'perfil', label: 'Meu Perfil' },
      ],
    },
  ]

  let secaoAtual = 'Geral'
  let tituloAtual = 'Visão Geral'
  menuSecoes.forEach((sec) => {
    const achado = sec.itens.find((it) => it.id === abaAtiva)
    if (achado) {
      secaoAtual = sec.categoria
      tituloAtual = achado.label
    }
  })

  const partesNome = (perfil.nome_completo || 'S').trim().split(' ')
  const iniciais =
    partesNome.length > 1
      ? `${partesNome[0][0]}${partesNome[partesNome.length - 1][0]}`.toUpperCase()
      : partesNome[0].slice(0, 2).toUpperCase()

  const dataHojeFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar no-print">
        <div className="sidebar-header">
          <img src={logoEscola} alt="Logo E.M. Pedro Furtado" className="sidebar-logo" />
          <div className="sidebar-title">
            <strong>E.M. Pedro Furtado</strong>
            <span>Sistema de Gestão Escolar</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuSecoes.map((secao) => (
            <div key={secao.categoria} className="menu-group">
              <div className="menu-group-label">{secao.categoria}</div>
              {secao.itens.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`menu-item ${abaAtiva === item.id ? 'active' : ''}`}
                  onClick={() => setAbaAtiva(item.id)}
                >
                  <IconeMenu id={item.id} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card-sidebar">
            <div className="user-avatar-initials">{iniciais}</div>
            <div className="user-badge">
              <strong>{perfil.nome_completo}</strong>
              <span>{perfil.cargo}</span>
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="btn-sair">
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <div className="portal-main-area">
        <header className="portal-topbar no-print">
          <div className="topbar-breadcrumb">
            <span>{secaoAtual}</span>
            <h2>{tituloAtual}</h2>
          </div>

          <div className="topbar-meta">
            <span className="meta-chip" style={{ textTransform: 'capitalize' }}>
              {dataHojeFormatada}
            </span>
            <span className="meta-chip highlight">Ano Letivo 2026</span>
          </div>
        </header>

        <main className="portal-workspace">
          {abaAtiva === 'inicio' && <VisaoGeral perfil={perfil} onNavegar={setAbaAtiva} />}
          {abaAtiva === 'matriculas' && ehSecretariaOuGestao && <Matriculas perfil={perfil} />}
          {abaAtiva === 'turmas' && <TurmasAlunos perfil={perfil} />}
          {abaAtiva === 'grade' && <GradeHoraria perfil={perfil} />}
          {abaAtiva === 'frequencia' && ehDocenteOuAdmin && <Frequencia perfil={perfil} />}
          {abaAtiva === 'notas' && ehDocenteOuAdmin && <BoletimNotas perfil={perfil} />}
          {abaAtiva === 'relatorio' && <RelatorioFrequencia />}
          {abaAtiva === 'diario' && ehDocenteOuAdmin && <DiarioAulas perfil={perfil} />}
          {abaAtiva === 'ocorrencias' && <Ocorrencias perfil={perfil} />}
          {abaAtiva === 'avisos' && <MuralAvisos perfil={perfil} />}
          {abaAtiva === 'servidores' && <GestaoServidores perfilAtual={perfil} />}
          {abaAtiva === 'historico' && <HistoricoGeral perfil={perfil} />}
          {abaAtiva === 'perfil' && <MeuPerfil perfil={perfil} onPerfilAtualizado={() => carregarPerfil(session.user.id)} />}
        </main>
      </div>
    </div>
  )
}