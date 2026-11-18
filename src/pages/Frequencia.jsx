import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function obterIniciais(nome = '') {
  const partes = nome.trim().split(' ').filter(Boolean)
  if (partes.length === 0) return 'AL'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase()
}

export default function Frequencia({ perfil }) {
  const [turmasPermitidas, setTurmasPermitidas] = useState([])
  const [vinculos, setVinculos] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplina, setDisciplina] = useState('')
  const [dataAula, setDataAula] = useState(() => new Date().toISOString().split('T')[0])
  const [alunos, setAlunos] = useState([])
  const [chamadaMap, setChamadaMap] = useState({})
  const [obsMap, setObsMap] = useState({})
  const [buscaAluno, setBuscaAluno] = useState('')
  const [chamadaJaExistia, setChamadaJaExistia] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const ehAdmin = perfil?.cargo === 'Administrador(a) do Sistema'

  useEffect(() => {
    carregarVinculosETurmas()
  }, [perfil])

  useEffect(() => {
    if (turmaId && disciplina && dataAula) {
      carregarAlunosEFrequencia(turmaId, disciplina, dataAula)
    }
  }, [turmaId, disciplina, dataAula])

  async function carregarVinculosETurmas() {
    setCarregando(true)
    const { data: todasTurmas } = await supabase.from('turmas').select('*').order('nome')

    if (ehAdmin) {
      const { data: todosVinc } = await supabase.from('professores_turmas').select('*')
      setVinculos(todosVinc || [])
      setTurmasPermitidas(todasTurmas || [])
      if (todasTurmas && todasTurmas.length > 0) {
        const t0 = todasTurmas[0].id
        setTurmaId(t0)
        const discsT0 = (todosVinc || []).filter((v) => v.turma_id === t0)
        setDisciplina(discsT0[0]?.disciplina || 'Língua Portuguesa')
      }
      setCarregando(false)
      return
    }

    const { data: meusVinc } = await supabase
      .from('professores_turmas')
      .select('*')
      .eq('professor_id', perfil.id)

    const listaVinc = meusVinc || []
    setVinculos(listaVinc)

    const idsPermitidos = new Set(listaVinc.map((v) => v.turma_id))
    const turmasFiltradas = (todasTurmas || []).filter((t) => idsPermitidos.has(t.id))
    setTurmasPermitidas(turmasFiltradas)

    if (turmasFiltradas.length > 0) {
      const primeiraTurmaId = turmasFiltradas[0].id
      setTurmaId(primeiraTurmaId)
      const primeiraDisc = listaVinc.find((v) => v.turma_id === primeiraTurmaId)?.disciplina || ''
      setDisciplina(primeiraDisc)
    }

    setCarregando(false)
  }

  function handleTrocarTurma(novaTurmaId) {
    setTurmaId(novaTurmaId)
    const discsDaTurma = vinculos.filter((v) => v.turma_id === novaTurmaId)
    if (discsDaTurma.length > 0) {
      setDisciplina(discsDaTurma[0].disciplina)
    } else if (ehAdmin) {
      setDisciplina('Língua Portuguesa')
    }
  }

  async function carregarAlunosEFrequencia(tId, disc, dt) {
    const [{ data: listaAlunos }, { data: freqsSalvas }] = await Promise.all([
      supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', tId)
        .eq('situacao', 'Ativo')
        .order('nome_completo'),
      supabase
        .from('frequencias')
        .select('*')
        .eq('turma_id', tId)
        .eq('disciplina', disc)
        .eq('data_aula', dt),
    ])

    const alunosAtivos = listaAlunos || []
    setAlunos(alunosAtivos)

    const mapaInicial = {}
    const mapaObsInicial = {}
    const jaTemRegistro = (freqsSalvas || []).length > 0
    setChamadaJaExistia(jaTemRegistro)

    alunosAtivos.forEach((al) => {
      const reg = (freqsSalvas || []).find((f) => f.aluno_id === al.id)
      mapaInicial[al.id] = reg ? reg.status : 'presente'
      mapaObsInicial[al.id] = reg?.observacao || ''
    })

    setChamadaMap(mapaInicial)
    setObsMap(mapaObsInicial)
  }

  function marcarStatus(alunoId, novoStatus) {
    setChamadaMap((prev) => ({ ...prev, [alunoId]: novoStatus }))
  }

  function marcarTodosPresentes() {
    const novoMapa = {}
    alunos.forEach((al) => {
      novoMapa[al.id] = 'presente'
    })
    setChamadaMap(novoMapa)
  }

  async function handleSalvarChamada() {
    if (!turmaId || !disciplina || alunos.length === 0) return

    setSalvando(true)
    setMensagem('')

    const registros = alunos.map((al) => ({
      turma_id: turmaId,
      aluno_id: al.id,
      disciplina,
      data_aula: dataAula,
      status: chamadaMap[al.id] || 'presente',
      observacao:
        chamadaMap[al.id] && chamadaMap[al.id] !== 'presente'
          ? obsMap[al.id]?.trim() || null
          : null,
      registrado_por: perfil.id,
    }))

    // Remove registros anteriores do mesmo dia/turma/disciplina deste professor para atualizar limpo
    await supabase
      .from('frequencias')
      .delete()
      .eq('turma_id', turmaId)
      .eq('disciplina', disciplina)
      .eq('data_aula', dataAula)
      .eq('registrado_por', perfil.id)

    const { error } = await supabase.from('frequencias').insert(registros)

    if (error) {
      setSalvando(false)
      alert('Erro ao salvar chamada: ' + error.message)
      return
    }

    // Registra no Histórico e Auditoria
    const turmaObj = turmasPermitidas.find((t) => t.id === turmaId)
    const totalPresentes = registros.filter((r) => r.status === 'presente').length
    const totalFaltas = registros.filter((r) => r.status === 'falta').length
    const totalJust = registros.filter((r) => r.status === 'justificada').length

    await supabase.from('historico_auditoria').insert([
      {
        autor_id: perfil.id,
        autor_nome: perfil.nome_completo,
        autor_cargo: perfil.cargo,
        modulo: 'Chamada Diária',
        acao: chamadaJaExistia ? 'Atualização de Frequência' : 'Registro de Frequência',
        turma_nome: turmaObj ? `${turmaObj.nome} (${turmaObj.turno})` : '',
        disciplina,
        detalhes: `Data: ${dataAula.split('-').reverse().join('/')} • ${totalPresentes} presentes, ${totalFaltas} faltas, ${totalJust} justificadas.`,
      },
    ])

    setSalvando(false)
    setChamadaJaExistia(true)
    setMensagem('Chamada registrada e salva com sucesso!')
    setTimeout(() => setMensagem(''), 4000)
  }

  if (carregando) {
    return (
      <section className="panel-card">
        <p style={{ color: '#64748b' }}>Carregando suas turmas e disciplinas...</p>
      </section>
    )
  }

  if (turmasPermitidas.length === 0) {
    return (
      <section className="panel-card">
        <h3>Chamada Diária</h3>
        <div className="alert alert-error" style={{ marginTop: 16 }}>
          Você ainda não possui turmas ou disciplinas vinculadas ao seu cadastro. Solicite à Secretaria Escolar ou Direção a vinculação das suas aulas.
        </div>
      </section>
    )
  }

  const disciplinasDaTurmaAtual = ehAdmin
    ? Array.from(
        new Set([
          ...vinculos.filter((v) => v.turma_id === turmaId).map((v) => v.disciplina),
          'Língua Portuguesa',
          'Matemática',
          'Ciências',
          'História',
          'Geografia',
          'Língua Inglesa',
          'Educação Física',
          'Informática Educacional',
        ])
      )
    : Array.from(
        new Set(vinculos.filter((v) => v.turma_id === turmaId).map((v) => v.disciplina))
      )

  const turmaAtual = turmasPermitidas.find((t) => t.id === turmaId)

  // Contadores em tempo real
  const totalAlunos = alunos.length
  const qtdPresentes = alunos.filter((a) => (chamadaMap[a.id] || 'presente') === 'presente').length
  const qtdFaltas = alunos.filter((a) => chamadaMap[a.id] === 'falta').length
  const qtdJustificadas = alunos.filter((a) => chamadaMap[a.id] === 'justificada').length
  const taxaPresenca = totalAlunos > 0 ? Math.round(((qtdPresentes + qtdJustificadas) / totalAlunos) * 100) : 100

  const alunosFiltrados = alunos.filter((al) =>
    al.nome_completo.toLowerCase().includes(buscaAluno.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* PAINEL DE FILTROS DA AULA */}
      <section className="panel-card" style={{ borderTop: '4px solid var(--primary)' }}>
        <div className="panel-header">
          <div>
            <h3>Diário de Frequência • Chamada Diária</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Selecione a turma, o componente curricular e a data da aula para registrar a presença.
            </p>
          </div>

          {chamadaJaExistia ? (
            <span className="status-pill status-ativo">Chamada já lançada nesta data</span>
          ) : (
            <span className="status-pill status-pendente">Novo lançamento</span>
          )}
        </div>

        <div className="form-grid">
          <div className="form-group col-5">
            <label>Turma Vinculada</label>
            <select value={turmaId} onChange={(e) => handleTrocarTurma(e.target.value)}>
              {turmasPermitidas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} • Turno {t.turno}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-4">
            <label>Disciplina / Componente</label>
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
              {disciplinasDaTurmaAtual.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-3">
            <label>Data da Aula</label>
            <input
              type="date"
              value={dataAula}
              onChange={(e) => setDataAula(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* CARDS DE RESUMO EM TEMPO REAL */}
      <section className="stats-grid">
        <div className="stat-card" style={{ cursor: 'default' }}>
          <div className="stat-top-row">
            <span className="stat-label">Total na Turma</span>
            <div className="stat-icon-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <strong className="stat-value">{totalAlunos}</strong>
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {turmaAtual?.nome} ({taxaPresenca}% assiduidade)
          </span>
        </div>

        <div className="stat-card" style={{ cursor: 'default', borderColor: '#bbf7d0' }}>
          <div className="stat-top-row">
            <span className="stat-label" style={{ color: '#15803d' }}>Presentes</span>
            <div className="stat-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <strong className="stat-value" style={{ color: '#15803d' }}>{qtdPresentes}</strong>
          <span style={{ fontSize: '0.78rem', color: '#166534' }}>Compareceram à aula</span>
        </div>

        <div className="stat-card" style={{ cursor: 'default', borderColor: '#fecaca' }}>
          <div className="stat-top-row">
            <span className="stat-label" style={{ color: '#b91c1c' }}>Faltas</span>
            <div className="stat-icon-box" style={{ background: '#fee2e2', color: '#b91c1c' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>
          <strong className="stat-value" style={{ color: '#b91c1c' }}>{qtdFaltas}</strong>
          <span style={{ fontSize: '0.78rem', color: '#991b1b' }}>Ausências não justificadas</span>
        </div>

        <div className="stat-card" style={{ cursor: 'default', borderColor: '#fde68a' }}>
          <div className="stat-top-row">
            <span className="stat-label" style={{ color: '#b45309' }}>Justificadas</span>
            <div className="stat-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          </div>
          <strong className="stat-value" style={{ color: '#b45309' }}>{qtdJustificadas}</strong>
          <span style={{ fontSize: '0.78rem', color: '#92400e' }}>Com atestado / declaração</span>
        </div>
      </section>

      {/* LISTA DE CHAMADA INTERATIVA */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Lista de Estudantes • {disciplina}</h3>
            <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 3 }}>
              Clique no botão correspondente ao lado de cada aluno para alterar a situação.
            </p>
          </div>

          <div className="action-group">
            <button
              type="button"
              className="btn-outline"
              style={{ marginTop: 0 }}
              onClick={marcarTodosPresentes}
            >
              Marcar Todos Presentes
            </button>
          </div>
        </div>

        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <div className="form-group" style={{ marginBottom: 18 }}>
          <input
            type="text"
            placeholder="Filtrar estudante pelo nome..."
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
          />
        </div>

        {alunos.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '32px 20px',
              background: '#f8fafc',
              borderRadius: 12,
              border: '1px dashed #cbd5e1',
              color: '#64748b',
            }}
          >
            Nenhum estudante ativo matriculado nesta turma.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alunosFiltrados.map((aluno) => {
              const numeroChamada = alunos.findIndex((a) => a.id === aluno.id) + 1
              const statusAtual = chamadaMap[aluno.id] || 'presente'

              const corLateral =
                statusAtual === 'presente'
                  ? '#16a34a'
                  : statusAtual === 'falta'
                  ? '#dc2626'
                  : '#d97706'

              const fundoLinha =
                statusAtual === 'falta'
                  ? '#fffafa'
                  : statusAtual === 'justificada'
                  ? '#fffdf7'
                  : '#ffffff'

              return (
                <div
                  key={aluno.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderLeft: `5px solid ${corLateral}`,
                    borderRadius: 12,
                    padding: '14px 18px',
                    background: fundoLinha,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'all 0.16s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 14,
                    }}
                  >
                    {/* IDENTIFICAÇÃO DO ESTUDANTE */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          color: '#64748b',
                          minWidth: 24,
                        }}
                      >
                        {String(numeroChamada).padStart(2, '0')}
                      </span>

                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background:
                            statusAtual === 'presente'
                              ? 'var(--primary-soft)'
                              : statusAtual === 'falta'
                              ? '#fee2e2'
                              : '#fef3c7',
                          color:
                            statusAtual === 'presente'
                              ? 'var(--primary-dark)'
                              : statusAtual === 'falta'
                              ? '#b91c1c'
                              : '#b45309',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {obterIniciais(aluno.nome_completo)}
                      </div>

                      <div>
                        <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block' }}>
                          {aluno.nome_completo}
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                          Matrícula: {aluno.matricula || 'Regular'}
                        </span>
                      </div>
                    </div>

                    {/* BOTÕES SEGMENTADOS DE PRESENÇA */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => marcarStatus(aluno.id, 'presente')}
                        style={{
                          padding: '8px 15px',
                          borderRadius: 8,
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border:
                            statusAtual === 'presente'
                              ? '1px solid #16a34a'
                              : '1px solid var(--border)',
                          background: statusAtual === 'presente' ? '#16a34a' : '#ffffff',
                          color: statusAtual === 'presente' ? '#ffffff' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Presente
                      </button>

                      <button
                        type="button"
                        onClick={() => marcarStatus(aluno.id, 'falta')}
                        style={{
                          padding: '8px 15px',
                          borderRadius: 8,
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border:
                            statusAtual === 'falta'
                              ? '1px solid #dc2626'
                              : '1px solid var(--border)',
                          background: statusAtual === 'falta' ? '#dc2626' : '#ffffff',
                          color: statusAtual === 'falta' ? '#ffffff' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Falta
                      </button>

                      <button
                        type="button"
                        onClick={() => marcarStatus(aluno.id, 'justificada')}
                        style={{
                          padding: '8px 15px',
                          borderRadius: 8,
                          fontSize: '0.83rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border:
                            statusAtual === 'justificada'
                              ? '1px solid #d97706'
                              : '1px solid var(--border)',
                          background: statusAtual === 'justificada' ? '#d97706' : '#ffffff',
                          color: statusAtual === 'justificada' ? '#ffffff' : '#475569',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        Justificada
                      </button>
                    </div>
                  </div>

                  {/* CAMPO DE OBSERVAÇÃO QUANDO HOUVER FALTA OU JUSTIFICATIVA */}
                  {statusAtual !== 'presente' && (
                    <div className="form-group" style={{ paddingLeft: 36 }}>
                      <input
                        type="text"
                        placeholder={
                          statusAtual === 'justificada'
                            ? 'Informe o motivo ou número do atestado médico...'
                            : 'Observação opcional sobre a ausência...'
                        }
                        value={obsMap[aluno.id] || ''}
                        onChange={(e) =>
                          setObsMap((prev) => ({ ...prev, [aluno.id]: e.target.value }))
                        }
                        style={{ fontSize: '0.84rem', padding: '8px 12px', background: '#ffffff' }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {alunos.length > 0 && (
          <div
            style={{
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <span style={{ fontSize: '0.84rem', color: '#64748b' }}>
              Resumo: <strong>{qtdPresentes}</strong> presentes • <strong>{qtdFaltas}</strong> faltas •{' '}
              <strong>{qtdJustificadas}</strong> justificadas
            </span>

            <button
              type="button"
              className="btn-primary"
              disabled={salvando}
              onClick={handleSalvarChamada}
              style={{ marginTop: 0, width: 'auto', padding: '12px 28px' }}
            >
              {salvando ? 'Gravando Frequência...' : 'Salvar Chamada do Dia'}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}