import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function GestaoServidores({ perfilAtual }) {
  const [servidores, setServidores] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [atualizandoId, setAtualizandoId] = useState(null)

  useEffect(() => {
    listarServidores()
  }, [])

  async function listarServidores() {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('criado_em', { ascending: false })

    if (!error && data) setServidores(data)
  }

  async function alterarStatusServidor(id, novoStatus) {
    setAtualizandoId(id)
    const { error } = await supabase
      .from('perfis')
      .update({ status_aprovacao: novoStatus })
      .eq('id', id)

    if (!error) await listarServidores()
    else alert('Erro ao atualizar status: ' + error.message)
    setAtualizandoId(null)
  }

  const servidoresFiltrados = servidores.filter((s) =>
    filtroStatus === 'todos' ? true : s.status_aprovacao === filtroStatus
  )

  const qtdPendentes = servidores.filter((s) => s.status_aprovacao === 'pendente').length

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Autorização e Gestão de Servidores</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            Aprove novos cadastros da equipe escolar ou gerencie acessos ativos.
          </p>
        </div>

        <div className="filter-tabs">
          <button className={`tab-btn ${filtroStatus === 'todos' ? 'active' : ''}`} onClick={() => setFiltroStatus('todos')}>
            Todos ({servidores.length})
          </button>
          <button className={`tab-btn ${filtroStatus === 'pendente' ? 'active' : ''}`} onClick={() => setFiltroStatus('pendente')}>
            Pendentes ({qtdPendentes})
          </button>
          <button className={`tab-btn ${filtroStatus === 'ativo' ? 'active' : ''}`} onClick={() => setFiltroStatus('ativo')}>
            Ativos
          </button>
          <button className={`tab-btn ${filtroStatus === 'bloqueado' ? 'active' : ''}`} onClick={() => setFiltroStatus('bloqueado')}>
            Bloqueados
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Servidor</th>
              <th>Cargo / Turno</th>
              <th>Contato / CPF</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {servidoresFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: '#64748b', padding: 24 }}>
                  Nenhum servidor encontrado neste filtro.
                </td>
              </tr>
            ) : (
              servidoresFiltrados.map((srv) => (
                <tr key={srv.id}>
                  <td>
                    <strong>{srv.nome_completo}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{srv.email}</div>
                  </td>
                  <td>
                    <div>{srv.cargo}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Turno: {srv.turno} {srv.matricula ? `• Mat: ${srv.matricula}` : ''}
                    </div>
                  </td>
                  <td>
                    <div>{srv.telefone}</div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>CPF: {srv.cpf}</div>
                  </td>
                  <td>
                    <span className={`status-pill status-${srv.status_aprovacao}`}>
                      {srv.status_aprovacao}
                    </span>
                  </td>
                  <td>
                    {srv.id === perfilAtual.id ? (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Você (Admin atual)</span>
                    ) : (
                      <div className="action-group">
                        {srv.status_aprovacao !== 'ativo' && (
                          <button
                            className="btn-sm btn-approve"
                            disabled={atualizandoId === srv.id}
                            onClick={() => alterarStatusServidor(srv.id, 'ativo')}
                          >
                            Autorizar
                          </button>
                        )}
                        {srv.status_aprovacao !== 'bloqueado' && (
                          <button
                            className="btn-sm btn-block"
                            disabled={atualizandoId === srv.id}
                            onClick={() => alterarStatusServidor(srv.id, 'bloqueado')}
                          >
                            Bloquear
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}