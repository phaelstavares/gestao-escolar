import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function verificarGestaoCompleta(cargo = '') {
  const c = cargo.toLowerCase()
  return (
    c.includes('administrador') ||
    c.includes('diretor') ||
    c.includes('vice') ||
    c.includes('secretári') ||
    c.includes('secretari')
  )
}

export default function HistoricoGeral({ perfil }) {
  const [registros, setRegistros] = useState([])
  const [filtroModulo, setFiltroModulo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)

  const ehGestao = verificarGestaoCompleta(perfil?.cargo)

  useEffect(() => {
    carregarHistoricoCompleto()
  }, [perfil])

  async function carregarHistoricoCompleto() {
    setCarregando(true)

    // 1. Busca registros da tabela de auditoria
    let queryAudit = supabase
      .from('historico_auditoria')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(300)

    if (!ehGestao) {
      queryAudit = queryAudit.eq('autor_id', perfil.id)
    }

    // 2. Busca também resumo das chamadas realizadas por professor/matéria
    let queryFreq = supabase
      .from('frequencias')
      .select('data_aula, disciplina, registrado_por, registrado_por_nome, turmas(nome, turno)')
      .order('data_aula', { ascending: false })
      .limit(500)

    if (!ehGestao) {
      queryFreq = queryFreq.eq('registrado_por', perfil.id)
    }

    const [{ data: auditData }, { data: freqData }] = await Promise.all([queryAudit, queryFreq])

    const listaUnificada = [...(auditData || [])]

    // Agrupa chamadas por data + disciplina + turma para exibir no histórico
    const mapaChamadas = {}
    ;(freqData || []).forEach((f) => {
      const chave = `${f.data_aula}_${f.disciplina}_${f.turmas?.nome}_${f.registrado_por_nome}`
      if (!mapaChamadas[chave]) {
        mapaChamadas[chave] = {
          id: `freq_${chave}`,
          modulo: 'Chamada Diária',
          acao: `Chamada Realizada • ${f.disciplina || 'Geral'}`,
          detalhes: `Frequência registrada para a turma ${f.turmas?.nome || ''} (${f.turmas?.turno || ''})`,
          turma_nome: f.turmas?.nome,
          aluno_nome: null,
          autor_nome: f.registrado_por_nome || 'Docente',
          autor_cargo: 'Professor(a)',
          criado_em: `${f.data_aula}T12:00:00Z`,
        }
      }
    })

    const combinado = [...listaUnificada, ...Object.values(mapaChamadas)].sort(
      (a, b) => new Date(b.criado_em) - new Date(a.criado_em)
    )

    setRegistros(combinado)
    setCarregando(false)
  }

  const filtrados = registros.filter((r) => {
    const bateModulo = filtroModulo === 'todos' ? true : r.modulo === filtroModulo
    const termo = busca.toLowerCase()
    const bateBusca =
      !termo ||
      (r.autor_nome || '').toLowerCase().includes(termo) ||
      (r.acao || '').toLowerCase().includes(termo) ||
      (r.detalhes || '').toLowerCase().includes(termo) ||
      (r.aluno_nome || '').toLowerCase().includes(termo) ||
      (r.turma_nome || '').toLowerCase().includes(termo)
    return bateModulo && bateBusca
  })

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <h3>
            {ehGestao
              ? `Histórico Geral de Atividades e Auditoria • ${filtrados.length}`
              : `Meu Histórico de Atividades • ${filtrados.length}`}
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            {ehGestao
              ? 'Visão completa da Direção, Vice-Direção e Administração sobre todas as ocorrências, chamadas, diários e matrículas.'
              : 'Registro individual das suas ocorrências, chamadas e aulas lançadas.'}
          </p>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 18 }}>
        <div className="form-group col-6">
          <label>Pesquisar por Servidor, Aluno, Turma ou Descrição</label>
          <input
            type="text"
            placeholder="Digite para filtrar o histórico..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <div className="form-group col-6">
          <label>Módulo</label>
          <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}>
            <option value="todos">Todos os Módulos</option>
            <option value="Ocorrências">Ocorrências</option>
            <option value="Chamada Diária">Chamada Diária</option>
            <option value="Diário de Classe">Diário de Classe</option>
            {ehGestao && <option value="Matrículas">Matrículas e Transferências</option>}
          </select>
        </div>
      </div>

      {carregando ? (
        <p style={{ color: '#64748b' }}>Carregando histórico completo...</p>
      ) : filtrados.length === 0 ? (
        <p style={{ color: '#64748b' }}>Nenhum registro encontrado para os filtros selecionados.</p>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Módulo</th>
                <th>Ação / Registro</th>
                <th>Aluno / Turma</th>
                <th>Responsável</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item) => (
                <tr key={item.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
                    <strong>
                      {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {new Date(item.criado_em).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </td>
                  <td>
                    <span className="status-pill status-ativo">{item.modulo}</span>
                  </td>
                  <td>
                    <strong>{item.acao}</strong>
                    {item.detalhes && (
                      <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 3 }}>
                        {item.detalhes}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: '0.84rem' }}>
                    {item.aluno_nome && <div><strong>Aluno:</strong> {item.aluno_nome}</div>}
                    {item.turma_nome && <div><strong>Turma:</strong> {item.turma_nome}</div>}
                    {!item.aluno_nome && !item.turma_nome && '-'}
                  </td>
                  <td>
                    <strong>{item.autor_nome}</strong>
                    {item.autor_cargo && (
                      <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{item.autor_cargo}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}