import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function BoletimNotas({ perfil }) {
  const [vinculos, setVinculos] = useState([])
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

  const ehAdmin = perfil?.cargo === 'Administrador(a) do Sistema'
  const ehDocenteOuAdmin =
    ehAdmin || perfil?.cargo?.toLowerCase().includes('professor')

  useEffect(() => {
    if (ehDocenteOuAdmin) {
      carregarPermissoes()
    }
  }, [perfil, ehDocenteOuAdmin])

  useEffect(() => {
    if (turmaId && vinculos.length > 0) {
      const discs = vinculos.filter((v) => v.turma_id === turmaId)
      setDisciplinasTurma(discs)
      if (discs.length > 0 && !discs.some((d) => d.disciplina === disciplina)) {
        setDisciplina(discs[0].disciplina)
      }
    }
  }, [turmaId, vinculos])

  useEffect(() => {
    if (turmaId && disciplina) {
      const vinc = disciplinasTurma.find((d) => d.disciplina === disciplina)
      setProfessorAtual(vinc?.professor_nome || 'Não atribuído')
      setNovoProfNome(vinc?.professor_nome || '')
      setEditandoProf(false)
      carregarAlunosENotas()
    }
  }, [turmaId, disciplina, disciplinasTurma])

  if (!ehDocenteOuAdmin) {
    return (
      <section className="panel-card">
        <h3>Acesso Restrito ao Corpo Docente</h3>
        <p style={{ color: '#64748b', marginTop: 6 }}>
          Apenas professores podem lançar ou alterar notas bimestrais. Para consultar boletins consolidados, acesse Boletim e Relatórios.
        </p>
      </section>
    )
  }

  async function carregarPermissoes() {
    const [{ data: todasTurmas }, { data: todosVinculos }] = await Promise.all([
      supabase.from('turmas').select('*').order('nome'),
      supabase.from('professores_turmas').select('*').order('disciplina'),
    ])

    const filtrados = (todosVinculos || []).filter((v) => {
      if (ehAdmin) return true
      const mesmoId = v.professor_id && v.professor_id === perfil.id
      const mesmoNome =
        v.professor_nome &&
        perfil.nome_completo &&
        v.professor_nome.toLowerCase().includes(perfil.nome_completo.split(' ')[0].toLowerCase()) &&
        v.professor_nome.toLowerCase().includes(perfil.nome_completo.split(' ').slice(-1)[0].toLowerCase())
      return mesmoId || mesmoNome
    })

    setVinculos(filtrados)

    const idsPermitidos = new Set(filtrados.map((v) => v.turma_id))
    const turmasPerm = (todasTurmas || []).filter((t) => idsPermitidos.has(t.id))
    setTurmas(turmasPerm)
    if (turmasPerm.length > 0) {
      setTurmaId(turmasPerm[0].id)
    }
  }

  async function handleSalvarProfessor(e) {
    e.preventDefault()
    if (!ehAdmin || !novoProfNome.trim()) return

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
      carregarPermissoes()
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
    if (valor !== '' && (Number(valor) < 0 || Number(valor) > 25)) return
    setNotasMap((prev) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [bimestre]: valor },
    }))
  }

  function calcularTotalAnual(notasAluno) {
    const valores = [1, 2, 3, 4]
      .map((b) => notasAluno?.[b])
      .filter((v) => v !== '' && v !== undefined && !isNaN(Number(v)))
      .map(Number)

    if (valores.length === 0) return null
    const soma = valores.reduce((acc, n) => acc + n, 0)
    return soma.toFixed(1)
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
        const turmaObj = turmas.find((t) => t.id === turmaId)
        await supabase.from('historico_auditoria').insert([
          {
            autor_id: perfil.id,
            autor_nome: perfil.nome_completo,
            autor_cargo: perfil.cargo,
            modulo: 'Lançar Notas',
            acao: 'Atualização de Notas Bimestrais',
            turma_nome: turmaObj ? `${turmaObj.nome} (${turmaObj.turno})` : '',
            detalhes: `Disciplina: ${disciplina} • ${registros.length} lançamento(s) atualizado(s).`,
          },
        ])

        setMensagem('Notas salvas com sucesso!')
        setTimeout(() => setMensagem(''), 4000)
      }
    }
    setSalvando(false)
  }

  return (
    <section className="panel-card" style={{ borderTop: '4px solid var(--primary)' }}>
      <div className="panel-header">
        <div>
          <h3>Lançar Notas por Bimestre</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            Cada bimestre vale até <strong>25,0 pontos</strong> (100,0 pontos anuais • mínimo de <strong>60,0 pontos</strong> para média).
          </p>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div className="form-group col-6">
          <label>Turma</label>
          <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            {turmas.length === 0 && <option value="">Nenhuma turma vinculada</option>}
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
            {ehAdmin && (
              <button
                type="button"
                onClick={() => setEditandoProf(true)}
                className="btn-sm btn-pending"
              >
                Alterar Docente
              </button>
            )}
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
        <p style={{ color: '#64748b' }}>Nenhum aluno disponível para esta seleção.</p>
      ) : (
        <form onSubmit={handleSalvarNotas}>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno • {alunos.length}</th>
                  <th style={{ width: 95, textAlign: 'center' }}>1º Bim (25)</th>
                  <th style={{ width: 95, textAlign: 'center' }}>2º Bim (25)</th>
                  <th style={{ width: 95, textAlign: 'center' }}>3º Bim (25)</th>
                  <th style={{ width: 95, textAlign: 'center' }}>4º Bim (25)</th>
                  <th style={{ textAlign: 'center' }}>Total (100)</th>
                  <th style={{ textAlign: 'center' }}>Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno) => {
                  const total = calcularTotalAnual(notasMap[aluno.id])
                  return (
                    <tr key={aluno.id}>
                      <td><strong>{aluno.nome_completo}</strong></td>
                      {[1, 2, 3, 4].map((bim) => (
                        <td key={bim} style={{ textAlign: 'center' }}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="25"
                            placeholder="-"
                            value={notasMap[aluno.id]?.[bim] ?? ''}
                            onChange={(e) => handleNotaChange(aluno.id, bim, e.target.value)}
                            style={{
                              width: '74px',
                              padding: '6px 8px',
                              borderRadius: 6,
                              border: '1px solid var(--border)',
                              textAlign: 'center',
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        <strong style={{ color: 'var(--primary-dark)' }}>
                          {total !== null ? total : '-'}
                        </strong>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {total === null ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.82rem' }}>Pendente</span>
                        ) : Number(total) >= 60 ? (
                          <span className="status-pill status-ativo">Na média</span>
                        ) : (
                          <span className="status-pill status-pendente">Sem média</span>
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