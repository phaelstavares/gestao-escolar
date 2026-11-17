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
import MeuPerfil from './pages/MeuPerfil'

const CARGOS_ADMIN = [
  'Administrador(a) do Sistema',
]

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
            {perfil?.status_aprovacao === 'bloqueado'
              ? 'Acesso Bloqueado'
              : 'Aguardando Aprovação'}
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

  const ehAdmin = CARGOS_ADMIN.includes(perfil.cargo)

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
        { id: 'matriculas', label: 'Matrículas e Transferências' },
        { id: 'turmas', label: 'Turmas e Alunos' },
        { id: 'grade', label: 'Grade Horária' },
        { id: 'relatorio', label: 'Boletim e Relatórios' },
      ],
    },
    {
      categoria: 'Área Pedagógica',
      itens: [
        { id: 'frequencia', label: 'Chamada Diária' },
        { id: 'notas', label: 'Lançar Notas' },
        { id: 'diario', label: 'Diário de Classe' },
        { id: 'ocorrencias', label: 'Ocorrências' },
      ],
    },
    {
      categoria: 'Administração',
      itens: [
        ...(ehAdmin ? [{ id: 'servidores', label: 'Servidores' }] : []),
        { id: 'perfil', label: 'Meu Perfil' },
      ],
    },
  ]

  return (
    <div className="portal-shell">
      <aside className="portal-sidebar no-print">
        <div className="sidebar-header">
          <img src={logoEscola} alt="Logo E.M. Pedro Furtado" className="sidebar-logo" />
          <div className="sidebar-title">
            <strong>E.M. Pedro Furtado</strong>
            <span>Portal Administrativo</span>
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
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <strong>{perfil.nome_completo}</strong>
            <span>{perfil.cargo}</span>
          </div>
          <button type="button" onClick={handleLogout} className="btn-sair">
            Encerrar Sessão
          </button>
        </div>
      </aside>

      <main className="portal-workspace">
        {abaAtiva === 'inicio' && <VisaoGeral perfil={perfil} onNavegar={setAbaAtiva} />}
        {abaAtiva === 'matriculas' && <Matriculas perfil={perfil} />}
        {abaAtiva === 'turmas' && <TurmasAlunos />}
        {abaAtiva === 'grade' && <GradeHoraria />}
        {abaAtiva === 'frequencia' && <Frequencia perfil={perfil} />}
        {abaAtiva === 'notas' && <BoletimNotas perfil={perfil} />}
        {abaAtiva === 'relatorio' && <RelatorioFrequencia />}
        {abaAtiva === 'diario' && <DiarioAulas perfil={perfil} />}
        {abaAtiva === 'ocorrencias' && <Ocorrencias perfil={perfil} />}
        {abaAtiva === 'avisos' && <MuralAvisos perfil={perfil} />}
        {abaAtiva === 'servidores' && ehAdmin && <GestaoServidores perfilAtual={perfil} />}
        {abaAtiva === 'perfil' && <MeuPerfil perfil={perfil} onPerfilAtualizado={() => carregarPerfil(session.user.id)} />}
      </main>
    </div>
  )
}