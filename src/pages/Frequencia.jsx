import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Frequencia({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [dataAula, setDataAula] = useState(() => new Date().toISOString().split('T')[0])
  const [alunos, setAlunos] = useState([])
  const [chamada, setChamada] = useState({})
  const [historicoDatas, setHistoricoDatas] = useState([])
  const [justificativasTurma, setJustificativasTurma] = useState([])
  const [jaRegistrada, setJaRegistrada] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [enviandoArquivoId, setEnviandoArquivoId] = useState(null)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) {
      carregarHistoricoEJustificativas()
    }
  }, [turmaId])

  useEffect(() => {
    if (turmaId && dataAula) {
      carregarAlunosEChamada()
    }
  }, [turmaId, dataAula])

  async function carregarTurmas() {
    const { data } = await supabase.from('turmas').select('*').order('nome')
    if (data && data.length > 0) {
      setTurmas(data)
      setTurmaId(data[0].id)
    }
  }

  async function carregarHistoricoEJustificativas() {
    const { data } = await supabase
      .from('frequencias')
      .select('id, aluno_id, data_aula, status, observacao, anexo_url, anexo_nome, alunos(nome_completo)')
      .eq('turma_id', turmaId)
      .order('data_aula', { ascending: false })

    if (!data || data.length === 0) {
      setHistoricoDatas([])
      setJustificativasTurma([])
      return
    }

    const agrupado = {}
    const listaJust = []

    data.forEach((reg) => {
      if (!agrupado[reg.data_aula]) {
        agrupado[reg.data_aula] = {
          data_aula: reg.data_aula,
          presentes: 0,
          faltas: 0,
          justificadas: 0,
          total: 0,
        }
      }
      agrupado[reg.data_aula].total += 1
      if (reg.status === 'presente') agrupado[reg.data_aula].presentes += 1
      else if (reg.status === 'falta') agrupado[reg.data_aula].faltas += 1
      else if (reg.status === 'justificada') agrupado[reg.data_aula].justificadas += 1

      if (reg.status === 'justificada' || reg.anexo_url || (reg.observacao && reg.observacao.trim() !== '')) {
        listaJust.push(reg)
      }
    })

    setHistoricoDatas(
      Object.values(agrupado).sort((a, b) => b.data_aula.localeCompare(a.data_aula))
    )
    setJustificativasTurma(listaJust)
  }

  async function carregarAlunosEChamada() {
    setCarregando(true)
    setMensagem('')

    const [{ data: listaAlunos }, { data: registrosExistentes }] = await Promise.all([
      supabase.from('alunos').select('*').eq('turma_id', turmaId).order('nome_completo'),
      supabase.from('frequencias').select('*').eq('turma_id', turmaId).eq('data_aula', dataAula),
    ])

    const alunosDaTurma = listaAlunos || []
    setAlunos(alunosDaTurma)

    const mapaChamada = {}
    const temRegistro = registrosExistentes && registrosExistentes.length > 0
    setJaRegistrada(temRegistro)

    alunosDaTurma.forEach((aluno) => {
      const reg = registrosExistentes?.find((r) => r.aluno_id === aluno.id)
      mapaChamada[aluno.id] = {
        status: reg ? reg.status : 'presente',
        observacao: reg?.observacao || '',
        anexo_url: reg?.anexo_url || '',
        anexo_nome: reg?.anexo_nome || '',
      }
    })

    setChamada(mapaChamada)
    setCarregando(false)
  }

  function alterarStatus(alunoId, novoStatus) {
    setChamada((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], status: novoStatus },
    }))
  }

  function alterarObservacao(alunoId, texto) {
    setChamada((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], observacao: texto },
    }))
  }

  async function handleUploadAtestado(alunoId, file) {
    if (!file) return
    setEnviandoArquivoId(alunoId)

    const extensao = file.name.split('.').pop()
    const caminhoArquivo = `frequencias/${turmaId}/${dataAula}_${alunoId}_${Date.now()}.${extensao}`

    const { error: uploadError } = await supabase.storage
      .from('atestados')
      .upload(caminhoArquivo, file, { upsert: true })

    if (uploadError) {
      alert('Erro ao enviar atestado: ' + uploadError.message)
      setEnviandoArquivoId(null)
      return
    }

    const { data: urlData } = supabase.storage
      .from('atestados')
      .getPublicUrl(caminhoArquivo)

    const publicUrl = urlData?.publicUrl || ''

    setChamada((prev) => ({
      ...prev,
      [alunoId]: {
        ...prev[alunoId],
        status: prev[alunoId]?.status === 'presente' ? 'justificada' : prev[alunoId]?.status,
        anexo_url: publicUrl,
        anexo_nome: file.name,
      },
    }))

    await supabase.from('frequencias').upsert(
      {
        turma_id: turmaId,
        aluno_id: alunoId,
        data_aula: dataAula,
        status: chamada[alunoId]?.status === 'presente' ? 'justificada' : (chamada[alunoId]?.status || 'justificada'),
        observacao: chamada[alunoId]?.observacao || 'Atestado anexado',
        anexo_url: publicUrl,
        anexo_nome: file.name,
        registrado_por: perfil.id,
      },
      { onConflict: 'aluno_id,data_aula' }
    )

    setEnviandoArquivoId(null)
    carregarHistoricoEJustificativas()
    setMensagem('Atestado anexado e salvo!')
    setTimeout(() => setMensagem(''), 4000)
  }

  function marcarTodosPresentes() {
    const atualizado = {}
    alunos.forEach((a) => {
      atualizado[a.id] = { ...chamada[a.id], status: 'presente' }
    })
    setChamada(atualizado)
  }

  async function handleSalvarChamada(e) {
    e.preventDefault()
    if (alunos.length === 0) return

    setSalvando(true)
    setMensagem('')

    const payload = alunos.map((aluno) => ({
      turma_id: turmaId,
      aluno_id: aluno.id,
      data_aula: dataAula,
      status: chamada[aluno.id]?.status || 'presente',
      observacao: chamada[aluno.id]?.observacao || null,
      anexo_url: chamada[aluno.id]?.anexo_url || null,
      anexo_nome: chamada[aluno.id]?.anexo_nome || null,
      registrado_por: perfil.id,
    }))

    const { error } = await supabase
      .from('frequencias')
      .upsert(payload, { onConflict: 'aluno_id,data_aula' })

    setSalvando(false)

    if (error) {
      alert('Erro ao salvar chamada: ' + error.message)
    } else {
      setJaRegistrada(true)
      setMensagem('Chamada salva com sucesso!')
      carregarHistoricoEJustificativas()
      setTimeout(() => setMensagem(''), 4000)
    }
  }

  const totalPresentes = Object.values(chamada).filter((c) => c.status === 'presente').length
  const totalFaltas = Object.values(chamada).filter((c) => c.status === 'falta').length
  const totalJustificadas = Object.values(chamada).filter((c) => c.status === 'justificada').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Chamada Diária</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Controle de presença, faltas, justificativas e atestados.
            </p>
          </div>
          {jaRegistrada && (
            <span className="status-pill status-ativo">Chamada Registrada</span>
          )}
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group col-6">
            <label>Turma</label>
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              {turmas.length === 0 && <option value="">Nenhuma turma cadastrada</option>}
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} • {t.turno}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-6">
            <label>Data da Aula</label>
            <input
              type="date"
              value={dataAula}
              onChange={(e) => setDataAula(e.target.value)}
            />
          </div>
        </div>

        {historicoDatas.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 8 }}>
              Chamadas anteriores • {historicoDatas.length} dias
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {historicoDatas.map((item) => {
                const selecionada = item.data_aula === dataAula
                return (
                  <button
                    key={item.data_aula}
                    type="button"
                    onClick={() => setDataAula(item.data_aula)}
                    className={`tab-btn ${selecionada ? 'active' : ''}`}
                    style={{ padding: '5px 10px', fontSize: '0.78rem' }}
                  >
                    {item.data_aula.split('-').reverse().join('/')}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        {carregando ? (
          <p style={{ color: '#64748b' }}>Carregando alunos...</p>
        ) : alunos.length === 0 ? (
          <p style={{ color: '#64748b', padding: '16px 0' }}>
            Nenhum aluno matriculado nesta turma.
          </p>
        ) : (
          <form onSubmit={handleSalvarChamada}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 14,
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                fontSize: '0.88rem',
              }}
            >
              <div>
                <strong>{dataAula.split('-').reverse().join('/')}</strong> •{' '}
                <strong style={{ color: '#16a34a' }}>{totalPresentes} Presentes</strong> •{' '}
                <strong style={{ color: '#dc2626' }}>{totalFaltas} Faltas</strong> •{' '}
                <strong style={{ color: '#d97706' }}>{totalJustificadas} Justificadas</strong>
              </div>
              <button type="button" onClick={marcarTodosPresentes} className="btn-sm btn-pending">
                Marcar Todos Presentes
              </button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno • {alunos.length}</th>
                    <th>Situação</th>
                    <th>Justificativa</th>
                    <th>Atestado</th>
                  </tr>
                </thead>
                <tbody>
                  {alunos.map((aluno) => {
                    const item = chamada[aluno.id] || { status: 'presente', observacao: '', anexo_url: '', anexo_nome: '' }
                    return (
                      <tr key={aluno.id}>
                        <td>
                          <strong>{aluno.nome_completo}</strong>
                        </td>
                        <td>
                          <div className="action-group">
                            <button
                              type="button"
                              onClick={() => alterarStatus(aluno.id, 'presente')}
                              className="btn-sm"
                              style={{
                                background: item.status === 'presente' ? '#16a34a' : '#e2e8f0',
                                color: item.status === 'presente' ? '#fff' : '#334155',
                              }}
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => alterarStatus(aluno.id, 'falta')}
                              className="btn-sm"
                              style={{
                                background: item.status === 'falta' ? '#dc2626' : '#e2e8f0',
                                color: item.status === 'falta' ? '#fff' : '#334155',
                              }}
                            >
                              Falta
                            </button>
                            <button
                              type="button"
                              onClick={() => alterarStatus(aluno.id, 'justificada')}
                              className="btn-sm"
                              style={{
                                background: item.status === 'justificada' ? '#d97706' : '#e2e8f0',
                                color: item.status === 'justificada' ? '#fff' : '#334155',
                              }}
                            >
                              Justificada
                            </button>
                          </div>
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="Observação..."
                            value={item.observacao}
                            onChange={(e) => alterarObservacao(aluno.id, e.target.value)}
                            style={{
                              width: '100%',
                              minWidth: 160,
                              padding: '6px 10px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              fontSize: '0.85rem',
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <label
                              className="btn-sm btn-pending"
                              style={{ cursor: 'pointer', display: 'inline-block', margin: 0 }}
                            >
                              {enviandoArquivoId === aluno.id
                                ? 'Enviando...'
                                : item.anexo_url
                                ? 'Alterar Anexo'
                                : 'Anexar Atestado'}
                              <input
                                type="file"
                                accept=".pdf,image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleUploadAtestado(aluno.id, e.target.files?.[0])}
                              />
                            </label>

                            {item.anexo_url && (
                              <a
                                href={item.anexo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-sm btn-approve"
                                style={{ textDecoration: 'none' }}
                              >
                                Ver Arquivo
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={salvando}
              style={{ width: 'auto', padding: '11px 24px' }}
            >
              {salvando ? 'Salvando...' : 'Salvar Chamada'}
            </button>
          </form>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Justificativas e Atestados • {justificativasTurma.length}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Registros de justificativas e documentos anexados da turma.
            </p>
          </div>
        </div>

        {justificativasTurma.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma justificativa registrada nesta turma.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Aluno</th>
                  <th>Situação</th>
                  <th>Justificativa</th>
                  <th>Documento</th>
                </tr>
              </thead>
              <tbody>
                {justificativasTurma.map((j) => (
                  <tr key={j.id}>
                    <td><strong>{j.data_aula.split('-').reverse().join('/')}</strong></td>
                    <td>{j.alunos?.nome_completo || '-'}</td>
                    <td>
                      <span className={`status-pill ${j.status === 'justificada' ? 'status-pendente' : 'status-bloqueado'}`}>
                        {j.status === 'justificada' ? 'Justificada' : j.status}
                      </span>
                    </td>
                    <td>{j.observacao || '-'}</td>
                    <td>
                      {j.anexo_url ? (
                        <a
                          href={j.anexo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-sm btn-approve"
                          style={{ textDecoration: 'none', display: 'inline-block' }}
                        >
                          Ver Arquivo
                        </a>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Sem anexo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Histórico de Chamadas • {historicoDatas.length} dias</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Dias letivos registrados para esta turma.
            </p>
          </div>
        </div>

        {historicoDatas.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma chamada anterior encontrada.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Presentes</th>
                  <th>Faltas</th>
                  <th>Justificadas</th>
                  <th>Total</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {historicoDatas.map((reg) => (
                  <tr key={reg.data_aula}>
                    <td><strong>{reg.data_aula.split('-').reverse().join('/')}</strong></td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{reg.presentes}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>{reg.faltas}</td>
                    <td style={{ color: '#d97706', fontWeight: 600 }}>{reg.justificadas}</td>
                    <td>{reg.total}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => {
                          setDataAula(reg.data_aula)
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="btn-sm btn-pending"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}