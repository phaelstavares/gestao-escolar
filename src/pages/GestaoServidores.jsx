import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const PODEM_GERENCIAR_EQUIPE = [
  'Administrador(a) do Sistema',
  'Secretário(a) Escolar',
  'Diretor(a)',
]

export default function GestaoServidores({ perfilAtual }) {
  const [servidores, setServidores] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [carregando, setCarregando] = useState(true)

  const podeGerenciar = PODEM_GERENCIAR_EQUIPE.includes(perfilAtual.cargo)

  useEffect(() => {
    carregarServidores()
  }, [])

  async function carregarServidores() {
    setCarregando(true)
    const { data } = await supabase
      .from('perfis')
      .select('*')
      .order('nome_completo')

    setServidores(data || [])
    setCarregando(false)
  }

  async function alterarStatus(id, novoStatus) {
    if (!podeGerenciar) return
    const { error } = await supabase
      .from('perfis')
      .update({ status_aprovacao: novoStatus })
      .eq('id', id)

    if (error) {
      alert('Erro ao atualizar status: ' + error.message)
    } else {
      carregarServidores()
    }
  }

  async function alterarCargo(id, novoCargo) {
    if (!podeGerenciar) return
    const { error } = await supabase
      .from('perfis')
      .update({ cargo: novoCargo })
      .eq('id', id)

    if (error) {
      alert('Erro ao atualizar cargo: ' + error.message)
    } else {
      carregarServidores()
    }
  }

  const listaFiltrada = servidores.filter((s) =>
    filtroStatus === 'todos' ? true : s.status_aprovacao === filtroStatus
  )

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Servidores e Equipe Escolar • {listaFiltrada.length}</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            {podeGerenciar
              ? 'Gerencie acessos, cargos e aprovações da equipe escolar.'
              : 'Consulta do corpo docente e equipe administrativa da escola (modo visualização).'}
          </p>
        </div>

        <div className="filter-tabs">
          <button
            type="button"
            className={`tab-btn ${filtroStatus === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('todos')}
          >
            Todos
          </button>
          <button
            type="button"
            className={`tab-btn ${filtroStatus === 'ativo' ? 'active' : ''}`}
            onClick={() => setFiltroStatus('ativo')}
          >
            Ativos
          </button>
          {podeGerenciar && (
            <>
              <button
                type="button"
                className={`tab-btn ${filtroStatus === 'pendente' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('pendente')}
              >
                Pendentes
              </button>
              <button
                type="button"
                className={`tab-btn ${filtroStatus === 'bloqueado' ? 'active' : ''}`}
                onClick={() => setFiltroStatus('bloqueado')}
              >
                Bloqueados
              </button>
            </>
          )}
        </div>
      </div>

      {carregando ? (
        <p style={{ color: '#64748b' }}>Carregando equipe...</p>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Servidor</th>
                <th>Cargo / Área</th>
                <th>Turno</th>
                <th>Contato</th>
                <th>Status</th>
                {podeGerenciar && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {listaFiltrada.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.nome_completo}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{s.email}</div>
                  </td>
                  <td>
                    {podeGerenciar && s.id !== perfilAtual.id ? (
                      <select
                        value={s.cargo}
                        onChange={(e) => alterarCargo(s.id, e.target.value)}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.84rem' }}
                      >
                        <option value="Professor(a)">Professor(a)</option>
                        <option value="Secretário(a) Escolar">Secretário(a) Escolar</option>
                        <option value="Diretor(a)">Diretor(a)</option>
                        <option value="Supervisor(a) Pedagógico(a)">Supervisor(a) Pedagógico(a)</option>
                        <option value="Administrador(a) do Sistema">Administrador(a) do Sistema</option>
                      </select>
                    ) : (
                      <span>{s.cargo}</span>
                    )}
                    {s.disciplina_principal && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--primary)', marginTop: 2 }}>
                        {s.disciplina_principal}
                      </div>
                    )}
                  </td>
                  <td>{s.turno || '-'}</td>
                  <td>{s.telefone || '-'}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        s.status_aprovacao === 'ativo'
                          ? 'status-ativo'
                          : s.status_aprovacao === 'bloqueado'
                          ? 'status-bloqueado'
                          : 'status-pendente'
                      }`}
                    >
                      {s.status_aprovacao}
                    </span>
                  </td>
                  {podeGerenciar && (
                    <td>
                      {s.id !== perfilAtual.id ? (
                        <div className="action-group">
                          {s.status_aprovacao !== 'ativo' && (
                            <button
                              type="button"
                              onClick={() => alterarStatus(s.id, 'ativo')}
                              className="btn-sm btn-approve"
                            >
                              Aprovar
                            </button>
                          )}
                          {s.status_aprovacao !== 'bloqueado' && (
                            <button
                              type="button"
                              onClick={() => alterarStatus(s.id, 'bloqueado')}
                              className="btn-sm btn-block"
                            >
                              Bloquear
                            </button>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Você</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}