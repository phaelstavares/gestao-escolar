import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logoEscola from '../assets/empf-logo.jpg'

export default function RelatorioFrequencia() {
  const [tipoRelatorio, setTipoRelatorio] = useState('individual')
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [alunosTurma, setAlunosTurma] = useState([])
  const [alunoId, setAlunoId] = useState('')
  const [mesFiltro, setMesFiltro] = useState('')
  const [disciplinaFiltro, setDisciplinaFiltro] = useState('todas')

  const [gradeTurma, setGradeTurma] = useState([]) // [{ disciplina, professor_nome }]
  const [frequencias, setFrequencias] = useState([])
  const [notas, setNotas] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) {
      setDisciplinaFiltro('todas')
      carregarDadosDaTurma()
    }
  }, [turmaId])

  async function carregarTurmas() {
    const { data } = await supabase.from('turmas').select('*').order('nome')
    if (data && data.length > 0) {
      setTurmas(data)
      setTurmaId(data[0].id)
    }
  }

  async function carregarDadosDaTurma() {
    setCarregando(true)
    const [
      { data: listaAlunos },
      { data: listaFreqs },
      { data: listaNotas },
      { data: listaGrade },
    ] = await Promise.all([
      supabase.from('alunos').select('*').eq('turma_id', turmaId).order('nome_completo'),
      supabase.from('frequencias').select('*').eq('turma_id', turmaId),
      supabase.from('notas').select('*').eq('turma_id', turmaId),
      supabase.from('professores_turmas').select('disciplina, professor_nome').eq('turma_id', turmaId).order('disciplina'),
    ])

    const alunos = listaAlunos || []
    setAlunosTurma(alunos)
    setAlunoId(alunos.length > 0 ? alunos[0].id : '')
    setFrequencias(listaFreqs || [])
    setNotas(listaNotas || [])
    setGradeTurma(listaGrade || [])
    setCarregando(false)
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId)
  const alunoAtual = alunosTurma.find((a) => a.id === alunoId)

  const freqsFiltradas = frequencias.filter((f) =>
    mesFiltro ? f.data_aula.startsWith(mesFiltro) : true
  )

  // === CÁLCULOS DO RELATÓRIO 1: FICHA INDIVIDUAL DO ALUNO ===
  const freqsAluno = freqsFiltradas.filter((f) => f.aluno_id === alunoId)
  const presencasAluno = freqsAluno.filter((f) => f.status === 'presente').length
  const faltasAluno = freqsAluno.filter((f) => f.status === 'falta').length
  const justificadasAluno = freqsAluno.filter((f) => f.status === 'justificada').length
  const totalAulasAluno = freqsAluno.length
  const pctFreqAluno =
    totalAulasAluno > 0
      ? Math.round(((presencasAluno + justificadasAluno) / totalAulasAluno) * 100)
      : 100

  const boletimAluno = gradeTurma.map((itemGrade) => {
    const disc = itemGrade.disciplina
    const notasDisc = notas.filter((n) => n.aluno_id === alunoId && n.disciplina === disc)
    const b1 = notasDisc.find((n) => n.bimestre === 1)?.nota ?? null
    const b2 = notasDisc.find((n) => n.bimestre === 2)?.nota ?? null
    const b3 = notasDisc.find((n) => n.bimestre === 3)?.nota ?? null
    const b4 = notasDisc.find((n) => n.bimestre === 4)?.nota ?? null

    const validas = [b1, b2, b3, b4].filter((v) => v !== null).map(Number)
    const media =
      validas.length > 0
        ? (validas.reduce((acc, v) => acc + v, 0) / validas.length).toFixed(1)
        : null

    return {
      disciplina: disc,
      professor: itemGrade.professor_nome,
      b1,
      b2,
      b3,
      b4,
      media,
    }
  })

  // === CÁLCULOS DO RELATÓRIO 2: FREQUÊNCIA GERAL DA TURMA ===
  const linhasFreqTurma = alunosTurma.map((aluno) => {
    const doAluno = freqsFiltradas.filter((r) => r.aluno_id === aluno.id)
    const presencas = doAluno.filter((r) => r.status === 'presente').length
    const faltas = doAluno.filter((r) => r.status === 'falta').length
    const justificadas = doAluno.filter((r) => r.status === 'justificada').length
    const totalAulas = doAluno.length
    const percentual =
      totalAulas > 0 ? Math.round(((presencas + justificadas) / totalAulas) * 100) : 100

    return {
      id: aluno.id,
      nome: aluno.nome_completo,
      responsavel: aluno.responsavel_nome,
      presencas,
      faltas,
      justificadas,
      totalAulas,
      percentual,
    }
  })

  // === CÁLCULOS DO RELATÓRIO 3: NOTAS GERAIS DA TURMA ===
  const linhasNotasTurma = alunosTurma.map((aluno) => {
    if (disciplinaFiltro !== 'todas') {
      const notasDisc = notas.filter(
        (n) => n.aluno_id === aluno.id && n.disciplina === disciplinaFiltro
      )
      const b1 = notasDisc.find((n) => n.bimestre === 1)?.nota ?? null
      const b2 = notasDisc.find((n) => n.bimestre === 2)?.nota ?? null
      const b3 = notasDisc.find((n) => n.bimestre === 3)?.nota ?? null
      const b4 = notasDisc.find((n) => n.bimestre === 4)?.nota ?? null
      const validas = [b1, b2, b3, b4].filter((v) => v !== null).map(Number)
      const media =
        validas.length > 0
          ? (validas.reduce((acc, v) => acc + v, 0) / validas.length).toFixed(1)
          : null

      return { id: aluno.id, nome: aluno.nome_completo, b1, b2, b3, b4, media }
    } else {
      const mediasPorDisc = {}
      let somaGeral = 0
      let qtdDiscComNota = 0

      gradeTurma.forEach((g) => {
        const disc = g.disciplina
        const notasDisc = notas.filter((n) => n.aluno_id === aluno.id && n.disciplina === disc)
        const validas = notasDisc.map((n) => Number(n.nota))
        if (validas.length > 0) {
          const m = validas.reduce((acc, v) => acc + v, 0) / validas.length
          mediasPorDisc[disc] = m.toFixed(1)
          somaGeral += m
          qtdDiscComNota++
        } else {
          mediasPorDisc[disc] = '-'
        }
      })

      const mediaGeral = qtdDiscComNota > 0 ? (somaGeral / qtdDiscComNota).toFixed(1) : null
      return { id: aluno.id, nome: aluno.nome_completo, mediasPorDisc, mediaGeral }
    }
  })

  return (
    <section className="panel-card printable-area">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={logoEscola}
            alt="Logo E.M. Pedro Furtado"
            style={{ width: 58, height: 58, objectFit: 'contain', borderRadius: '50%' }}
          />
          <div>
            <h3>E.M. Pedro Furtado • Central de Relatórios</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Emissão de boletim individual, frequência por turma e mapa de notas conforme a grade da série.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary no-print"
          style={{ marginTop: 0, width: 'auto', padding: '10px 18px' }}
        >
          Imprimir / Salvar PDF
        </button>
      </div>

      <div className="filter-tabs no-print" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${tipoRelatorio === 'individual' ? 'active' : ''}`}
          onClick={() => setTipoRelatorio('individual')}
        >
          1. Ficha Individual do Aluno (Notas + Frequência)
        </button>
        <button
          type="button"
          className={`tab-btn ${tipoRelatorio === 'notas_turma' ? 'active' : ''}`}
          onClick={() => setTipoRelatorio('notas_turma')}
        >
          2. Notas da Turma / Série
        </button>
        <button
          type="button"
          className={`tab-btn ${tipoRelatorio === 'freq_turma' ? 'active' : ''}`}
          onClick={() => setTipoRelatorio('freq_turma')}
        >
          3. Frequência da Turma / Série
        </button>
      </div>

      <div className="form-grid no-print" style={{ marginBottom: 20 }}>
        <div className="form-group col-4">
          <label>Turma / Série</label>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.turno})
              </option>
            ))}
          </select>
        </div>

        {tipoRelatorio === 'individual' && (
          <div className="form-group col-4">
            <label>Selecione o Aluno(a)</label>
            <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
              {alunosTurma.length === 0 && <option value="">Nenhum aluno na turma</option>}
              {alunosTurma.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome_completo}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipoRelatorio === 'notas_turma' && (
          <div className="form-group col-4">
            <label>Disciplina da Grade ({gradeTurma.length})</label>
            <select value={disciplinaFiltro} onChange={(e) => setDisciplinaFiltro(e.target.value)}>
              <option value="todas">Todas as Disciplinas da Série (Médias)</option>
              {gradeTurma.map((g) => (
                <option key={g.disciplina} value={g.disciplina}>
                  {g.disciplina}
                </option>
              ))}
            </select>
          </div>
        )}

        {(tipoRelatorio === 'individual' || tipoRelatorio === 'freq_turma') && (
          <div className="form-group col-4">
            <label>Mês da Frequência (vazio = ano todo)</label>
            <input
              type="month"
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
            />
          </div>
        )}
      </div>

      {carregando ? (
        <p style={{ color: '#64748b' }}>Carregando dados do relatório...</p>
      ) : alunosTurma.length === 0 ? (
        <p style={{ color: '#64748b' }}>Nenhum aluno cadastrado nesta turma ainda.</p>
      ) : (
        <>
          {tipoRelatorio === 'individual' && alunoAtual && (
            <div>
              <div
                style={{
                  marginBottom: 18,
                  padding: '12px 16px',
                  background: '#f0f7fa',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: 6,
                  fontSize: '0.92rem',
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <strong>Aluno(a):</strong> {alunoAtual.nome_completo} •{' '}
                  <strong>Turma/Série:</strong> {turmaAtual?.nome} ({turmaAtual?.turno})
                </div>
                <div>
                  <strong>Responsável:</strong> {alunoAtual.responsavel_nome || '-'}{' '}
                  {alunoAtual.responsavel_telefone ? `(${alunoAtual.responsavel_telefone})` : ''} •{' '}
                  <strong>Grade Curricular:</strong> {gradeTurma.length} componentes
                </div>
              </div>

              <h4 style={{ color: 'var(--primary)', marginBottom: 10 }}>
                Resumo de Frequência Individual
              </h4>
              <div className="table-responsive" style={{ marginBottom: 24 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Aulas Registradas</th>
                      <th>Presenças</th>
                      <th>Faltas</th>
                      <th>Faltas Justificadas</th>
                      <th>Percentual de Frequência</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>{totalAulasAluno}</strong></td>
                      <td style={{ color: '#16a34a', fontWeight: 700 }}>{presencasAluno}</td>
                      <td style={{ color: '#dc2626', fontWeight: 700 }}>{faltasAluno}</td>
                      <td style={{ color: '#d97706', fontWeight: 700 }}>{justificadasAluno}</td>
                      <td>
                        <span className={`status-pill ${pctFreqAluno >= 75 ? 'status-ativo' : 'status-bloqueado'}`}>
                          {pctFreqAluno}% {pctFreqAluno >= 75 ? '(Regular)' : '(Atenção < 75%)'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h4 style={{ color: 'var(--primary)', marginBottom: 10 }}>
                Boletim Individual de Notas
              </h4>
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Disciplina / Docente Responsável</th>
                      <th style={{ textAlign: 'center' }}>1º Bim</th>
                      <th style={{ textAlign: 'center' }}>2º Bim</th>
                      <th style={{ textAlign: 'center' }}>3º Bim</th>
                      <th style={{ textAlign: 'center' }}>4º Bim</th>
                      <th style={{ textAlign: 'center' }}>Média</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boletimAluno.map((item) => (
                      <tr key={item.disciplina}>
                        <td>
                          <strong>{item.disciplina}</strong>
                          <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                            {item.professor}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{item.b1 !== null ? item.b1 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{item.b2 !== null ? item.b2 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{item.b3 !== null ? item.b3 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>{item.b4 !== null ? item.b4 : '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          <strong>{item.media !== null ? item.media : '-'}</strong>
                        </td>
                        <td>
                          {item.media === null ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Sem lançamentos</span>
                          ) : Number(item.media) >= 6 ? (
                            <span className="status-pill status-ativo">Na média</span>
                          ) : (
                            <span className="status-pill status-bloqueado">Abaixo da média</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tipoRelatorio === 'notas_turma' && (
            <div>
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: '#f0f7fa',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                }}
              >
                <strong>Mapa de Notas • Turma/Série:</strong> {turmaAtual?.nome} ({turmaAtual?.turno}) •{' '}
                <strong>Filtro:</strong>{' '}
                {disciplinaFiltro === 'todas' ? 'Todas as Disciplinas da Série (Médias)' : disciplinaFiltro}
              </div>

              {disciplinaFiltro !== 'todas' ? (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Aluno(a)</th>
                        <th style={{ textAlign: 'center' }}>1º Bim</th>
                        <th style={{ textAlign: 'center' }}>2º Bim</th>
                        <th style={{ textAlign: 'center' }}>3º Bim</th>
                        <th style={{ textAlign: 'center' }}>4º Bim</th>
                        <th style={{ textAlign: 'center' }}>Média</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasNotasTurma.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.nome}</strong></td>
                          <td style={{ textAlign: 'center' }}>{r.b1 !== null ? r.b1 : '-'}</td>
                          <td style={{ textAlign: 'center' }}>{r.b2 !== null ? r.b2 : '-'}</td>
                          <td style={{ textAlign: 'center' }}>{r.b3 !== null ? r.b3 : '-'}</td>
                          <td style={{ textAlign: 'center' }}>{r.b4 !== null ? r.b4 : '-'}</td>
                          <td style={{ textAlign: 'center' }}><strong>{r.media ?? '-'}</strong></td>
                          <td>
                            {r.media === null ? (
                              <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>-</span>
                            ) : Number(r.media) >= 6 ? (
                              <span className="status-pill status-ativo">Na média</span>
                            ) : (
                              <span className="status-pill status-bloqueado">Atenção</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Aluno(a)</th>
                        {gradeTurma.map((g) => (
                          <th key={g.disciplina} style={{ textAlign: 'center' }}>
                            {g.disciplina.split(' ')[0]}
                          </th>
                        ))}
                        <th style={{ textAlign: 'center' }}>Média Geral</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linhasNotasTurma.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.nome}</strong></td>
                          {gradeTurma.map((g) => (
                            <td key={g.disciplina} style={{ textAlign: 'center' }}>
                              {r.mediasPorDisc[g.disciplina]}
                            </td>
                          ))}
                          <td style={{ textAlign: 'center' }}>
                            <strong>{r.mediaGeral ?? '-'}</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tipoRelatorio === 'freq_turma' && (
            <div>
              <div
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  background: '#f0f7fa',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: 6,
                  fontSize: '0.9rem',
                }}
              >
                <strong>Frequência Consolidada • Turma/Série:</strong> {turmaAtual?.nome} ({turmaAtual?.turno}) •{' '}
                <strong>Período:</strong>{' '}
                {mesFiltro ? mesFiltro.split('-').reverse().join('/') : 'Ano Letivo Completo'}
              </div>

              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Aluno(a)</th>
                      <th>Aulas Reg.</th>
                      <th>Presenças</th>
                      <th>Faltas</th>
                      <th>Justificadas</th>
                      <th>Frequência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasFreqTurma.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{r.nome}</strong>
                          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                            Resp: {r.responsavel}
                          </div>
                        </td>
                        <td>{r.totalAulas}</td>
                        <td style={{ color: '#16a34a', fontWeight: 600 }}>{r.presencas}</td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>{r.faltas}</td>
                        <td style={{ color: '#d97706', fontWeight: 600 }}>{r.justificadas}</td>
                        <td>
                          <span className={`status-pill ${r.percentual >= 75 ? 'status-ativo' : 'status-bloqueado'}`}>
                            {r.percentual}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 32,
              paddingTop: 16,
              borderTop: '1px dashed #cbd5e1',
              display: 'flex',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '0.82rem',
              color: '#64748b',
            }}
          >
            <span>Emitido em: {new Date().toLocaleDateString('pt-BR')}</span>
            <span>Assinatura da Direção / Secretaria: ____________________________________</span>
          </div>
        </>
      )}
    </section>
  )
}