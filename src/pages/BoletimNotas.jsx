import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function BoletimNotas({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinasTurma, setDisciplinasTurma] = useState([])
  const [disciplina, setDisciplina] = useState('')
  const [professorAtual, setProfessorAtual] = useState('')
  const [editandoProf, setEditandoProf] = useState(false)
  const [novoProfNome, setNovoProfNome] = useState('')

  const [alunos, setAlunos] = useState([])
  const [notasMap, setNotasMap] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) carregarDisciplinasDaTurma()
  }, [turmaId])

  useEffect(() => {
    if (turmaId && disciplina) {
      const vinc = disciplinasTurma.find((d) => d.disciplina === disciplina)
      setProfessorAtual(vinc?.professor_nome || 'Não atribuído')
      setNovoProfNome(vinc?.professor_nome || '')
      setEditandoProf(false)
      carregarAlunosENotas()
    }
  }, [turmaId, disciplina, disciplinasTurma])

  async function carregarTurmas() {
    const { data } = await supabase.from('turmas').select('*').order('nome')
    if (data && data.length > 0) {
      setTurmas(data)
      setTurmaId(data[0].id)
    }
  }

  async function carregarDisciplinasDaTurma() {
    const { data: vincs } = await supabase
      .from('professores_turmas')
      .select('*')
      .eq('turma_id', turmaId)
      .order('disciplina')

    if (vincs && vincs.length > 0) {
      setDisciplinasTurma(vincs)
      if (!vincs.some((v) => v.disciplina === disciplina)) {
        setDisciplina(vincs[0].disciplina)
      }
    } else {
      const { data: todasDisc } = await supabase.from('disciplinas').select('nome').order('nome')
      const fallback = (todasDisc || []).map((d) => ({
        disciplina: d.nome,
        professor_nome: 'Não atribuído',
      }))
      setDisciplinasTurma(fallback)
      if (fallback.length > 0) setDisciplina(fallback[0].disciplina)
    }
  }

  async function handleSalvarProfessor(e) {
    e.preventDefault()
    if (!novoProfNome.trim()) return

    const { error } = await supabase
      .from('professores_turmas')
      .upsert(
        {
          turma_id: turmaId,
          disciplina,
          professor_nome: novoProfNome.trim(),
        },
        { onConflict: 'turma_id,disciplina' }
      )

    if (error) {
      alert('Erro ao atualizar docente: ' + error.message)
    } else {
      setProfessorAtual(novoProfNome.trim())
      setEditandoProf(false)
      carregarDisciplinasDaTurma()
      setMensagem('Docente atualizado com sucesso!')
      setTimeout(() => setMensagem(''), 3500)
    }
  }

  async function carregarAlunosENotas() {
    const [{ data: listaAlunos }, { data: listaNotas }] = await Promise.all([
      supabase.from('alunos').select('*').eq('turma_id', turmaId).order('nome_completo'),
      supabase.from('notas').select('*').eq('turma_id', turmaId).eq('disciplina', disciplina),
    ])

    const alunosTurma = listaAlunos || []
    setAlunos(alunosTurma)

    const mapa = {}
    alunosTurma.forEach((a) => {
      mapa[a.id] = { 1: '', 2: '', 3: '', 4: '' }
    })

    ;(listaNotas || []).forEach((n) => {
      if (mapa[n.aluno_id]) {
        mapa[n.aluno_id][n.bimestre] = n.nota !== null ? String(n.nota) : ''
      }
    })

    setNotasMap(mapa)
  }

  function handleNotaChange(alunoId, bimestre, valor) {
    if (valor !== '' && (Number(valor) < 0 || Number(valor) > 10)) return
    setNotasMap((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [bimestre]: valor },
    }))
  }

  function calcularMedia(notasAluno) {
    const valores = [1, 2, 3, 4]
      .map((b) => notasAluno?.[b])
      .filter((v) => v !== '' && v !== undefined && !isNaN(Number(v)))
      .map(Number)

    if (valores.length === 0) return null
    const soma = valores.reduce((acc, n) => acc + n, 0)
    return (soma / valores.length).toFixed(1)
  }

  async function handleSalvarNotas(e) {
    e.preventDefault()
    setSalvando(true)
    setMensagem('')

    const registros = []
    alunos.forEach((aluno) => {
      ;[1, 2, 3, 4].forEach((bim) => {
        const val = notasMap[aluno.id]?.[bim]
        if (val !== '' && val !== undefined) {
          registros.push({
            turma_id: turmaId,
            aluno_id: aluno.id,
            disciplina,
            bimestre: bim,
            nota: Number(val),
            registrado_por: perfil.id,
          })
        }
      })
    })

    if (registros.length > 0) {
      const { error } = await supabase
        .from('notas')
        .upsert(registros, { onConflict: 'aluno_id,disciplina,bimestre' })

      if (error) {
        alert('Erro ao salvar notas: ' + error.message)
      } else {
        setMensagem('Notas salvas com sucesso!')
        setTimeout(() => setMensagem(''), 4000)
      }
    }
    setSalvando(false)
  }

  return (
    <section className="panel-card">
      <div className="panel-header">
        <div>
          <h3>Lançar Notas por Bimestre</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            Registre notas de 0 a 10 e gerencie o docente responsável por cada disciplina.
          </p>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
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

        <div className="form-group col-6">
          <label>Disciplina</label>
          <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
            {disciplinasTurma.map((d) => (
              <option key={d.disciplina} value={d.disciplina}>
                {d.disciplina}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: '12px 16px',
          background: '#f0f7fa',
          borderLeft: '4px solid var(--primary)',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        {!editandoProf ? (
          <>
            <div style={{ fontSize: '0.9rem' }}>
              <strong>Docente:</strong> {professorAtual} • <strong>Disciplina:</strong> {disciplina}
            </div>
            <button
              type="button"
              onClick={() => setEditandoProf(true)}
              className="btn-sm btn-pending"
            >
              Alterar Docente
            </button>
          </>
        ) : (
          <form
            onSubmit={handleSalvarProfessor}
            style={{ display: 'flex', gap: 8, width: '100%', flexWrap: 'wrap', alignItems: 'center' }}
          >
            <input
              type="text"
              required
              placeholder="Nome do docente..."
              value={novoProfNome}
              onChange={(e) => setNovoProfNome(e.target.value)}
              style={{
                flex: 1,
                minWidth: 220,
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
              }}
            />
            <button type="submit" className="btn-sm btn-approve">
              Salvar
            </button>
            <button
              type="button"
              onClick={() => setEditandoProf(false)}
              className="btn-sm btn-pending"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>

      {mensagem && <div className="alert alert-success">{mensagem}</div>}

      {alunos.length === 0 ? (
        <p style={{ color: '#64748b' }}>Nenhum aluno matriculado nesta turma.</p>
      ) : (
        <form onSubmit={handleSalvarNotas}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno • {alunos.length}</th>
                  <th style={{ width: 90 }}>1º Bim</th>
                  <th style={{ width: 90 }}>2º Bim</th>
                  <th style={{ width: 90 }}>3º Bim</th>
                  <th style={{ width: 90 }}>4º Bim</th>
                  <th>Média</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const media = calcularMedia(notasMap[aluno.id])
                  return (
                    <tr key={aluno.id}>
                      <td><strong>{aluno.nome_completo}</strong></td>
                      {[1, 2, 3, 4].map((bim) => (
                        <td key={bim}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="10"
                            placeholder="-"
                            value={notasMap[aluno.id]?.[bim] ?? ''}
                            onChange={(e) => handleNotaChange(aluno.id, bim, e.target.value)}
                            style={{
                              width: '70px',
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              textAlign: 'center',
                            }}
                          />
                        </td>
                      ))}
                      <td><strong>{media !== null ? media : '-'}</strong></td>
                      <td>
                        {media === null ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Pendente</span>
                        ) : Number(media) >= 6 ? (
                          <span className="status-pill status-ativo">Na média</span>
                        ) : (
                          <span className="status-pill status-bloqueado">Abaixo da média</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button type="submit" className="btn-primary" disabled={salvando} style={{ width: 'auto', padding: '11px 24px' }}>
            {salvando ? 'Salvando...' : 'Salvar Notas'}
          </button>
        </form>
      )}
    </section>
  )
}