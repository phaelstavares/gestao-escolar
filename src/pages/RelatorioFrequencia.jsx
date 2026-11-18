import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logoEscola from '../assets/empf-logo.jpg'

const NOTA_MINIMA_APROVACAO = 60.0 // 60% de 100 pontos totais no ano

export default function RelatorioFrequencia() {
  const [modoVisao, setModoVisao] = useState('boletim') // 'boletim' | 'mapa_turma'
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [alunos, setAlunos] = useState([])
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('')
  const [notasTurma, setNotasTurma] = useState([])
  const [frequenciasTurma, setFrequenciasTurma] = useState([])
  const [disciplinasTurma, setDisciplinasTurma] = useState([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) {
      carregarDadosConsolidados(turmaId)
    }
  }, [turmaId])

  async function carregarTurmas() {
    const { data } = await supabase.from('turmas').select('*').order('nome')
    const lista = data || []
    setTurmas(lista)
    if (lista.length > 0) setTurmaId(lista[0].id)
  }

  async function carregarDadosConsolidados(tId) {
    setCarregando(true)
    const [
      { data: listaAlunos },
      { data: listaNotas },
      { data: listaFreq },
      { data: listaVinc },
    ] = await Promise.all([
      supabase.from('alunos').select('*').eq('turma_id', tId).order('nome_completo'),
      supabase.from('notas').select('*').eq('turma_id', tId),
      supabase.from('frequencias').select('*').eq('turma_id', tId),
      supabase.from('professores_turmas').select('disciplina, professor_nome').eq('turma_id', tId),
    ])

    const alunosOrd = listaAlunos || []
    setAlunos(alunosOrd)
    if (alunosOrd.length > 0) setAlunoSelecionadoId(alunosOrd[0].id)
    else setAlunoSelecionadoId('')

    setNotasTurma(listaNotas || [])
    setFrequenciasTurma(listaFreq || [])

    const setDiscs = new Set()
    ;(listaVinc || []).forEach((v) => setDiscs.add(v.disciplina))
    ;(listaNotas || []).forEach((n) => {
      if (n.disciplina) setDiscs.add(n.disciplina)
    })

    const listaFinalDiscs =
      setDiscs.size > 0
        ? Array.from(setDiscs).sort()
        : [
            'Língua Portuguesa',
            'Matemática',
            'Ciências',
            'História',
            'Geografia',
            'Língua Inglesa',
            'Educação Física',
            'Informática Educacional',
          ]

    setDisciplinasTurma(listaFinalDiscs)
    setCarregando(false)
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId)
  const alunoAtual = alunos.find((a) => a.id === alunoSelecionadoId)

  function obterResumoFrequencia(alunoId) {
    const regsFreq = frequenciasTurma.filter((f) => f.aluno_id === alunoId)
    const totalAulas = regsFreq.length
    const faltas = regsFreq.filter((f) => f.status === 'falta').length
    const justificadas = regsFreq.filter((f) => f.status === 'justificada').length
    const presencas = totalAulas - faltas
    const percentual = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 100

    return { totalAulas, faltas, justificadas, percentual }
  }

  function calcularDesempenhoDisciplina(alunoId, disc) {
    const notasDisc = notasTurma.filter(
      (n) => n.aluno_id === alunoId && n.disciplina === disc
    )
    const b1 = notasDisc.find((n) => Number(n.bimestre) === 1)?.nota
    const b2 = notasDisc.find((n) => Number(n.bimestre) === 2)?.nota
    const b3 = notasDisc.find((n) => Number(n.bimestre) === 3)?.nota
    const b4 = notasDisc.find((n) => Number(n.bimestre) === 4)?.nota

    const lancadas = [b1, b2, b3, b4].filter((v) => v !== undefined && v !== null)
    const somaTotal = lancadas.reduce((acc, v) => acc + Number(v), 0)
    const faltamPontos = Math.max(0, NOTA_MINIMA_APROVACAO - somaTotal)
    const atingiuMedia = somaTotal >= NOTA_MINIMA_APROVACAO
    const anoEncerrado = lancadas.length === 4

    return {
      b1,
      b2,
      b3,
      b4,
      qtdLancadas: lancadas.length,
      somaTotal,
      faltamPontos,
      atingiuMedia,
      anoEncerrado,
    }
  }

  const resumoFreqAtual = alunoAtual ? obterResumoFrequencia(alunoAtual.id) : null

  // Conta quantas disciplinas do aluno selecionado estão com média >= 60 e quantas estão sem média
  const resumoNotasAlunoAtual = alunoAtual
    ? disciplinasTurma.reduce(
        (acc, disc) => {
          const d = calcularDesempenhoDisciplina(alunoAtual.id, disc)
          if (d.atingiuMedia) acc.comMedia += 1
          else acc.semMedia += 1
          return acc
        },
        { comMedia: 0, semMedia: 0 }
      )
    : { comMedia: 0, semMedia: 0 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* CONTROLES DE FILTRO E IMPRESSÃO */}
      <section className="panel-card no-print">
        <div className="panel-header">
          <div>
            <h3>Boletim Escolar e Relatórios Consolidados</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Critério de aprovação anual: mínimo de <strong>60,0 pontos (60%)</strong> distribuídos nos 4 bimestres (100 pontos totais).
            </p>
          </div>

          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: 0, width: 'auto', padding: '10px 20px' }}
            onClick={() => window.print()}
          >
            Imprimir / Salvar PDF
          </button>
        </div>

        <div className="filter-tabs" style={{ marginBottom: 18 }}>
          <button
            type="button"
            className={`tab-btn ${modoVisao === 'boletim' ? 'active' : ''}`}
            onClick={() => setModoVisao('boletim')}
          >
            Boletim Individual do Aluno
          </button>
          <button
            type="button"
            className={`tab-btn ${modoVisao === 'mapa_turma' ? 'active' : ''}`}
            onClick={() => setModoVisao('mapa_turma')}
          >
            Mapa Geral da Turma ({alunos.length})
          </button>
        </div>

        <div className="form-grid">
          <div className="form-group col-6">
            <label>Turma</label>
            <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} • {t.turno}
                </option>
              ))}
            </select>
          </div>

          {modoVisao === 'boletim' && (
            <div className="form-group col-6">
              <label>Aluno</label>
              <select
                value={alunoSelecionadoId}
                onChange={(e) => setAlunoSelecionadoId(e.target.value)}
              >
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome_completo}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {carregando ? (
        <section className="panel-card">
          <p style={{ color: '#64748b' }}>Gerando relatório consolidado...</p>
        </section>
      ) : modoVisao === 'boletim' ? (
        /* DOCUMENTO OFICIAL DO BOLETIM ESCOLAR */
        <section className="panel-card" style={{ padding: '32px' }}>
          {!alunoAtual ? (
            <p style={{ color: '#64748b' }}>Nenhum aluno matriculado nesta turma.</p>
          ) : (
            <div>
              {/* CABEÇALHO OFICIAL DA ESCOLA */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  paddingBottom: 18,
                  borderBottom: '2px solid var(--primary)',
                  marginBottom: 20,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img
                    src={logoEscola}
                    alt="Logo E.M. Pedro Furtado"
                    style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'contain' }}
                  />
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-dark)' }}>
                      ESCOLA MUNICIPAL PEDRO FURTADO
                    </h2>
                    <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                      Secretaria Municipal de Educação • Itamarati de Minas - MG
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Boletim Individual de Rendimento e Frequência • Ano Letivo 2026 (Média Mínima: 60,0 pts)
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="status-pill status-ativo">Documento Escolar</span>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 6 }}>
                    Emitido em {new Date().toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* DADOS DO ALUNO */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14,
                  background: '#f8fafc',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '16px 18px',
                  marginBottom: 22,
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>ESTUDANTE</span>
                  <strong style={{ color: '#0f172a', fontSize: '0.96rem' }}>{alunoAtual.nome_completo}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>TURMA / TURNO</span>
                  <strong>{turmaAtual?.nome} • {turmaAtual?.turno}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>FREQUÊNCIA GERAL</span>
                  <strong
                    style={{
                      color: resumoFreqAtual.percentual >= 75 ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {resumoFreqAtual.percentual}% ({resumoFreqAtual.faltas} falta{resumoFreqAtual.faltas === 1 ? '' : 's'})
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>SITUAÇÃO DAS MATÉRIAS</span>
                  <strong>
                    {resumoNotasAlunoAtual.comMedia} na média •{' '}
                    <span style={{ color: resumoNotasAlunoAtual.semMedia > 0 ? '#b45309' : '#15803d' }}>
                      {resumoNotasAlunoAtual.semMedia} sem média
                    </span>
                  </strong>
                </div>
              </div>

              {/* TABELA DE NOTAS POR DISCIPLINA */}
              <div className="table-responsive" style={{ marginBottom: 16 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Componente Curricular</th>
                      <th style={{ textAlign: 'center' }}>1º Bim</th>
                      <th style={{ textAlign: 'center' }}>2º Bim</th>
                      <th style={{ textAlign: 'center' }}>3º Bim</th>
                      <th style={{ textAlign: 'center' }}>4º Bim</th>
                      <th style={{ textAlign: 'center' }}>Total (100 pts)</th>
                      <th style={{ textAlign: 'center' }}>Faltam p/ 60</th>
                      <th style={{ textAlign: 'center' }}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplinasTurma.map((disc) => {
                      const d = calcularDesempenhoDisciplina(alunoAtual.id, disc)

                      return (
                        <tr key={disc}>
                          <td><strong>{disc}</strong></td>
                          {[d.b1, d.b2, d.b3, d.b4].map((nota, idx) => (
                            <td key={idx} style={{ textAlign: 'center' }}>
                              {nota !== undefined && nota !== null ? (
                                Number(nota).toFixed(1)
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                          ))}
                          <td style={{ textAlign: 'center' }}>
                            <strong
                              style={{
                                color: d.atingiuMedia ? '#15803d' : '#0f172a',
                                fontSize: '0.94rem',
                              }}
                            >
                              {d.qtdLancadas > 0 ? d.somaTotal.toFixed(1) : '0.0'}
                            </strong>
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '0.84rem', color: '#64748b' }}>
                            {d.atingiuMedia ? '0.0' : d.faltamPontos.toFixed(1)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {d.atingiuMedia ? (
                              <span className="status-pill status-ativo">Na Média (≥ 60%)</span>
                            ) : d.anoEncerrado ? (
                              <span className="status-pill status-bloqueado">Sem Média</span>
                            ) : (
                              <span className="status-pill status-pendente">Sem Média</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 24 }}>
                * Legenda: O total anual corresponde à soma dos 4 bimestres (100,0 pontos). O estudante precisa alcançar no mínimo <strong>60,0 pontos (60%)</strong> em cada componente curricular para atingir a média. Disciplinas com bimestres ainda não lançados permanecem como <strong>Sem Média</strong> até atingirem 60,0 pontos.
              </p>

              {/* CAMPO DE ASSINATURAS (PARA IMPRESSÃO) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 24,
                  marginTop: 42,
                  paddingTop: 12,
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: '#475569',
                }}
              >
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                  Secretaria Escolar
                </div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                  Direção Escolar
                </div>
                <div style={{ borderTop: '1px solid #94a3b8', paddingTop: 6 }}>
                  Assinatura do Responsável
                </div>
              </div>
            </div>
          )}
        </section>
      ) : (
        /* MAPA CONSOLIDADO DA TURMA */
        <section className="panel-card">
          <div className="panel-header">
            <div>
              <h3>Mapa Consolidado • {turmaAtual?.nome} ({turmaAtual?.turno})</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                Acompanhamento de frequência (mín. 75%) e matérias com 60% de aproveitamento (≥ 60,0 pts).
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Estudante</th>
                  <th style={{ textAlign: 'center' }}>Faltas</th>
                  <th style={{ width: 180 }}>Frequência</th>
                  <th style={{ textAlign: 'center' }}>Matérias na Média (≥ 60)</th>
                  <th style={{ textAlign: 'center' }}>Matérias Sem Média</th>
                  <th style={{ textAlign: 'center' }}>Situação Geral</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const resFreq = obterResumoFrequencia(aluno.id)
                  let qtdComMedia = 0
                  let qtdSemMedia = 0

                  disciplinasTurma.forEach((disc) => {
                    const d = calcularDesempenhoDisciplina(aluno.id, disc)
                    if (d.atingiuMedia) qtdComMedia += 1
                    else qtdSemMedia += 1
                  })

                  const tudoOk = resFreq.percentual >= 75 && qtdSemMedia === 0

                  return (
                    <tr key={aluno.id}>
                      <td><strong>{aluno.nome_completo}</strong></td>
                      <td style={{ textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                        {resFreq.faltas}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              flex: 1,
                              height: 8,
                              background: '#e2e8f0',
                              borderRadius: 999,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                width: `${resFreq.percentual}%`,
                                height: '100%',
                                background: resFreq.percentual >= 75 ? '#16a34a' : '#dc2626',
                              }}
                            />
                          </div>
                          <strong style={{ fontSize: '0.82rem', minWidth: 38 }}>
                            {resFreq.percentual}%
                          </strong>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', color: '#15803d', fontWeight: 700 }}>
                        {qtdComMedia} / {disciplinasTurma.length}
                      </td>
                      <td style={{ textAlign: 'center', color: qtdSemMedia > 0 ? '#b45309' : '#64748b', fontWeight: 700 }}>
                        {qtdSemMedia}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {tudoOk ? (
                          <span className="status-pill status-ativo">Na Média</span>
                        ) : (
                          <span className="status-pill status-pendente">Sem Média</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}