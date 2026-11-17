import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logoEscola from '../assets/empf-logo.jpg'

const DIAS = [
  { id: 1, nome: 'Segunda-feira' },
  { id: 2, nome: 'Terça-feira' },
  { id: 3, nome: 'Quarta-feira' },
  { id: 4, nome: 'Quinta-feira' },
  { id: 5, nome: 'Sexta-feira' },
]

export default function GradeHoraria() {
  const [modoVisao, setModoVisao] = useState('turma') // 'turma' | 'docente'
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [grade, setGrade] = useState([])
  const [gradeCompleta, setGradeCompleta] = useState([])
  const [docentes, setDocentes] = useState([])
  const [docenteFiltro, setDocenteFiltro] = useState('')
  const [disciplinasTurma, setDisciplinasTurma] = useState([])

  const [celulaEditando, setCelulaEditando] = useState(null)
  const [novaDisciplina, setNovaDisciplina] = useState('')
  const [novoProfessor, setNovoProfessor] = useState('')
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    carregarInicial()
  }, [])

  useEffect(() => {
    if (turmaId) carregarGradeDaTurma()
  }, [turmaId])

  async function carregarInicial() {
    const [{ data: listaTurmas }, { data: todaGrade }] = await Promise.all([
      supabase.from('turmas').select('*').order('nome'),
      supabase.from('grade_horaria').select('*, turmas(nome, turno)').order('dia_semana').order('aula_numero'),
    ])

    if (listaTurmas && listaTurmas.length > 0) {
      setTurmas(listaTurmas)
      setTurmaId(listaTurmas[0].id)
    }

    if (todaGrade) {
      setGradeCompleta(todaGrade)
      const profsUnicos = [...new Set(todaGrade.map((g) => g.professor_nome))].sort()
      setDocentes(profsUnicos)
      if (profsUnicos.length > 0) setDocenteFiltro(profsUnicos[0])
    }
  }

  async function carregarGradeDaTurma() {
    setCarregando(true)
    const [{ data: dadosGrade }, { data: vincs }] = await Promise.all([
      supabase
        .from('grade_horaria')
        .select('*')
        .eq('turma_id', turmaId)
        .order('aula_numero')
        .order('dia_semana'),
      supabase
        .from('professores_turmas')
        .select('disciplina, professor_nome')
        .eq('turma_id', turmaId)
        .order('disciplina'),
    ])

    setGrade(dadosGrade || [])
    setDisciplinasTurma(vincs || [])
    setCelulaEditando(null)
    setCarregando(false)
  }

  function abrirEdicao(item) {
    setCelulaEditando(item)
    setNovaDisciplina(item.disciplina)
    setNovoProfessor(item.professor_nome)
  }

  function handleTrocarDisciplinaEdicao(discEscolhida) {
    setNovaDisciplina(discEscolhida)
    const vinc = disciplinasTurma.find((d) => d.disciplina === discEscolhida)
    if (vinc) setNovoProfessor(vinc.professor_nome)
  }

  async function handleSalvarEdicao(e) {
    e.preventDefault()
    if (!celulaEditando) return

    const { error } = await supabase
      .from('grade_horaria')
      .update({
        disciplina: novaDisciplina,
        professor_nome: novoProfessor,
      })
      .eq('id', celulaEditando.id)

    if (error) {
      alert('Erro ao atualizar horário: ' + error.message)
    } else {
      setCelulaEditando(null)
      carregarGradeDaTurma()
      carregarInicial()
    }
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId)

  const aulasPorNumero = [1, 2, 3, 4, 5].map((num) => {
    const referencia = grade.find((g) => g.aula_numero === num)
    return {
      numero: num,
      horario: referencia?.horario || `${num}º Horário`,
      dias: DIAS.map((d) => grade.find((g) => g.aula_numero === num && g.dia_semana === d.id)),
    }
  })

  const aulasDocente = gradeCompleta.filter((g) => g.professor_nome === docenteFiltro)

  return (
    <section className="panel-card printable-area">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={logoEscola}
            alt="Logo E.M. Pedro Furtado"
            style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: '50%' }}
          />
          <div>
            <h3>E.M. Pedro Furtado • Grade Horária</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Quadro semanal de aulas por turma e agenda dos docentes.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary no-print"
          style={{ marginTop: 0, width: 'auto', padding: '10px 18px' }}
        >
          Imprimir / PDF
        </button>
      </div>

      <div className="filter-tabs no-print" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${modoVisao === 'turma' ? 'active' : ''}`}
          onClick={() => setModoVisao('turma')}
        >
          Grade por Turma
        </button>
        <button
          type="button"
          className={`tab-btn ${modoVisao === 'docente' ? 'active' : ''}`}
          onClick={() => setModoVisao('docente')}
        >
          Agenda por Docente
        </button>
      </div>

      {modoVisao === 'turma' ? (
        <>
          <div className="form-grid no-print" style={{ marginBottom: 18 }}>
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
          </div>

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
            <strong>Turma:</strong> {turmaAtual?.nome} • <strong>Turno:</strong> {turmaAtual?.turno} •{' '}
            <strong>Intervalo:</strong> {turmaAtual?.turno === 'Manhã' ? '09:30 às 09:50' : '15:30 às 15:50'}
          </div>

          {celulaEditando && (
            <form
              onSubmit={handleSalvarEdicao}
              className="no-print"
              style={{
                marginBottom: 18,
                padding: '14px 16px',
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <strong style={{ fontSize: '0.88rem' }}>
                Editando {DIAS.find((d) => d.id === celulaEditando.dia_semana)?.nome} • {celulaEditando.horario}:
              </strong>
              <select
                value={novaDisciplina}
                onChange={(e) => handleTrocarDisciplinaEdicao(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)' }}
              >
                {disciplinasTurma.map((d) => (
                  <option key={d.disciplina} value={d.disciplina}>
                    {d.disciplina}
                  </option>
                ))}
              </select>
              <input
                type="text"
                required
                value={novoProfessor}
                onChange={(e) => setNovoProfessor(e.target.value)}
                style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--border)', minWidth: 210 }}
              />
              <button type="submit" className="btn-sm btn-approve">Salvar</button>
              <button type="button" onClick={() => setCelulaEditando(null)} className="btn-sm btn-pending">Cancelar</button>
            </form>
          )}

          {carregando ? (
            <p style={{ color: '#64748b' }}>Carregando horários...</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: 120 }}>Horário</th>
                    {DIAS.map((d) => (
                      <th key={d.id}>{d.nome}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {aulasPorNumero.map((linha) => (
                    <tr key={linha.numero}>
                      <td>
                        <strong>{linha.numero}ª Aula</strong>
                        <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{linha.horario}</div>
                      </td>
                      {linha.dias.map((item, idx) => (
                        <td
                          key={idx}
                          onClick={() => item && abrirEdicao(item)}
                          title="Clique para alterar disciplina ou docente"
                          style={{ cursor: item ? 'pointer' : 'default', verticalAlign: 'top' }}
                        >
                          {item ? (
                            <div>
                              <strong style={{ color: 'var(--primary)', fontSize: '0.86rem' }}>
                                {item.disciplina}
                              </strong>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                                {item.professor_nome}
                              </div>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="form-grid no-print" style={{ marginBottom: 18 }}>
            <div className="form-group col-6">
              <label>Docente</label>
              <select value={docenteFiltro} onChange={(e) => setDocenteFiltro(e.target.value)}>
                {docentes.map((doc) => (
                  <option key={doc} value={doc}>
                    {doc}
                  </option>
                ))}
              </select>
            </div>
          </div>

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
            <strong>Docente:</strong> {docenteFiltro} • <strong>Total de Aulas Semanais:</strong> {aulasDocente.length}
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dia da Semana</th>
                  <th>Horário</th>
                  <th>Turma</th>
                  <th>Turno</th>
                  <th>Disciplina</th>
                </tr>
              </thead>
              <tbody>
                {aulasDocente.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{DIAS.find((d) => d.id === a.dia_semana)?.nome}</strong></td>
                    <td>{a.aula_numero}ª Aula • {a.horario}</td>
                    <td><strong>{a.turmas?.nome}</strong></td>
                    <td>{a.turmas?.turno}</td>
                    <td>{a.disciplina}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}