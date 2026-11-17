import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function VisaoGeral({ perfil, onNavegar }) {
  const [stats, setStats] = useState({
    servidoresAtivos: 0,
    servidoresPendentes: 0,
    totalTurmas: 0,
    totalAlunos: 0,
  })
  const [ultimosAvisos, setUltimosAvisos] = useState([])

  useEffect(() => {
    carregarResumo()
  }, [])

  async function carregarResumo() {
    const [{ data: perfis }, { count: qtdTurmas }, { count: qtdAlunos }, { data: avisos }] =
      await Promise.all([
        supabase.from('perfis').select('status_aprovacao'),
        supabase.from('turmas').select('*', { count: 'exact', head: true }),
        supabase.from('alunos').select('*', { count: 'exact', head: true }),
        supabase.from('avisos').select('*').order('criado_em', { ascending: false }).limit(3),
      ])

    if (perfis) {
      setStats({
        servidoresAtivos: perfis.filter((p) => p.status_aprovacao === 'ativo').length,
        servidoresPendentes: perfis.filter((p) => p.status_aprovacao === 'pendente').length,
        totalTurmas: qtdTurmas || 0,
        totalAlunos: qtdAlunos || 0,
      })
    }
    if (avisos) setUltimosAvisos(avisos)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="stats-grid">
        <div className="stat-card" onClick={() => onNavegar('turmas')}>
          <span className="stat-label">Turmas Ativas</span>
          <strong className="stat-value">{stats.totalTurmas}</strong>
          <span className="stat-link">Gerenciar turmas →</span>
        </div>

        <div className="stat-card" onClick={() => onNavegar('turmas')}>
          <span className="stat-label">Alunos Matriculados</span>
          <strong className="stat-value">{stats.totalAlunos}</strong>
          <span className="stat-link">Ver alunos →</span>
        </div>

        <div className="stat-card" onClick={() => onNavegar('servidores')}>
          <span className="stat-label">Equipe Ativa</span>
          <strong className="stat-value">{stats.servidoresAtivos}</strong>
          <span className="stat-link">Ver equipe →</span>
        </div>

        <div
          className={`stat-card ${stats.servidoresPendentes > 0 ? 'stat-highlight' : ''}`}
          onClick={() => onNavegar('servidores')}
        >
          <span className="stat-label">Aguardando Aprovação</span>
          <strong className="stat-value">{stats.servidoresPendentes}</strong>
          <span className="stat-link">Revisar cadastros →</span>
        </div>
      </div>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Últimos Avisos da Escola</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Comunicados recentes da direção, coordenação e equipe
            </p>
          </div>
          <button className="tab-btn active" onClick={() => onNavegar('avisos')}>
            Abrir Mural Completo
          </button>
        </div>

        {ultimosAvisos.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Nenhum aviso publicado ainda. Clique em "Abrir Mural Completo" para criar o primeiro.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {ultimosAvisos.map((aviso) => (
              <div key={aviso.id} className="aviso-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong>{aviso.titulo}</strong>
                  <span className="status-pill status-ativo">{aviso.categoria}</span>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#475569' }}>{aviso.mensagem}</p>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6, display: 'block' }}>
                  Publicado por {aviso.autor_nome}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}