import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DIAS_SEMANA = [
  { label: 'Segunda-feira', aliases: ['1', 'segunda', 'seg'] },
  { label: 'Terça-feira', aliases: ['2', 'terça', 'terca', 'ter'] },
  { label: 'Quarta-feira', aliases: ['3', 'quarta', 'qua'] },
  { label: 'Quinta-feira', aliases: ['4', 'quinta', 'qui'] },
  { label: 'Sexta-feira', aliases: ['5', 'sexta', 'sex'] },
]

const SLOTS_PADRAO_MATUTINO = [
  { chave: '07:00 - 07:50', aula: '1º Horário', hora: '07:00 - 07:50' },
  { chave: '07:50 - 08:40', aula: '2º Horário', hora: '07:50 - 08:40' },
  { chave: '08:40 - 09:30', aula: '3º Horário', hora: '08:40 - 09:30' },
  { isIntervalo: true, aula: 'INTERVALO', hora: '09:30 - 09:50' },
  { chave: '09:50 - 10:40', aula: '4º Horário', hora: '09:50 - 10:40' },
  { chave: '10:40 - 11:30', aula: '5º Horário', hora: '10:40 - 11:30' },
]

const SLOTS_PADRAO_VESPERTINO = [
  { chave: '13:00 - 13:50', aula: '1º Horário', hora: '13:00 - 13:50' },
  { chave: '13:50 - 14:40', aula: '2º Horário', hora: '13:50 - 14:40' },
  { chave: '14:40 - 15:30', aula: '3º Horário', hora: '14:40 - 15:30' },
  { isIntervalo: true, aula: 'INTERVALO', hora: '15:30 - 15:50' },
  { chave: '15:50 - 16:40', aula: '4º Horário', hora: '15:50 - 16:40' },
  { chave: '16:40 - 17:30', aula: '5º Horário', hora: '16:40 - 17:30' },
]

function normalizarDia(valor = '') {
  const v = String(valor)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
  const achado = DIAS_SEMANA.find((d) =>
    d.aliases.some((a) => v === a || v.startsWith(a))
  )
  return achado ? achado.label : ''
}

function extrairTextoHorario(item) {
  if (item.horario) return String(item.horario).trim()
  if (item.faixa_horaria) return String(item.faixa_horaria).trim()
  if (item.horario_inicio && item.horario_fim) {
    return `${String(item.horario_inicio).slice(0, 5)} - ${String(item.horario_fim).slice(0, 5)}`
  }
  if (item.horario_inicio) return String(item.horario_inicio).slice(0, 5)
  if (item.aula) return String(item.aula).trim()
  if (item.numero_aula) return `${item.numero_aula}º Horário`
  return ''
}

function corDisciplina(materia = '') {
  const m = materia.toLowerCase()
  if (m.includes('portugu') || m.includes('leitura')) return { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' }
  if (m.includes('matem')) return { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' }
  if (m.includes('ingl')) return { bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' }
  if (m.includes('física') || m.includes('fisica')) return { bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' }
  if (m.includes('inform') || m.includes('tecnol')) return { bg: '#ecfeff', border: '#67e8f9', text: '#155e75' }
  if (m.includes('ciên') || m.includes('cien')) return { bg: '#f0fdf4', border: '#86efac', text: '#166534' }
  if (m.includes('hist') || m.includes('geog')) return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' }
  if (m.includes('arte') || m.includes('relig')) return { bg: '#fdf2f8', border: '#f9a8d4', text: '#9d174d' }
  return { bg: '#f8fafc', border: '#cbd5e1', text: '#334155' }
}

export default function GradeHoraria({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [gradeMap, setGradeMap] = useState({})
  const [slotsExibicao, setSlotsExibicao] = useState([])
  const [vinculosDocentes, setVinculosDocentes] = useState([])
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [erroLeitura, setErroLeitura] = useState('')
  const [mensagem, setMensagem] = useState('')

  const cargo = (perfil?.cargo || '').toLowerCase()
  const podeEditarGrade =
    cargo.includes('administrador') ||
    cargo.includes('secretári') ||
    cargo.includes('secretari') ||
    cargo.includes('diretor')

  useEffect(() => {
    carregarTurmas()
  }, [])

  useEffect(() => {
    if (turmaId) {
      carregarGradeEDocentes(turmaId)
    }
  }, [turmaId])

  async function carregarTurmas() {
    const { data, error } = await supabase.from('turmas').select('*').order('nome')
    if (error) {
      setErroLeitura('Erro ao carregar turmas: ' + error.message)
      setCarregando(false)
      return
    }
    const lista = data || []
    setTurmas(lista)
    if (lista.length > 0) setTurmaId(lista[0].id)
    else setCarregando(false)
  }

  async function carregarGradeEDocentes(tId) {
    setCarregando(true)
    setErroLeitura('')
    setEditando(false)

    const [{ data: dadosGrade, error: errGrade }, { data: dadosVinculos }] = await Promise.all([
      supabase.from('grade_horaria').select('*').eq('turma_id', tId),
      supabase.from('professores_turmas').select('*').eq('turma_id', tId),
    ])

    if (errGrade) {
      setErroLeitura('Não foi possível ler os horários: ' + errGrade.message)
      setCarregando(false)
      return
    }

    const registros = dadosGrade || []
    setVinculosDocentes(dadosVinculos || [])

    const turmaObj = turmas.find((t) => t.id === tId)
    const ehVesp =
      (turmaObj?.turno || '').toLowerCase().includes('vesp') ||
      (turmaObj?.turno || '').toLowerCase().includes('tarde')
    const slotsPadrao = ehVesp ? SLOTS_PADRAO_VESPERTINO : SLOTS_PADRAO_MATUTINO

    const horariosBanco = []
    const vistos = new Set()

    registros.forEach((item) => {
      const h = extrairTextoHorario(item)
      if (h && !vistos.has(h)) {
        vistos.add(h)
        horariosBanco.push({
          chave: h,
          aula: item.aula ? String(item.aula) : `${horariosBanco.length + 1}º Horário`,
          hora: h,
        })
      }
    })

    horariosBanco.sort((a, b) => a.hora.localeCompare(b.hora))

    let slotsFinais = []
    if (horariosBanco.length > 0) {
      horariosBanco.forEach((s, idx) => {
        slotsFinais.push(s)
        if (idx === 2 && horariosBanco.length > 3) {
          slotsFinais.push({
            isIntervalo: true,
            aula: 'INTERVALO',
            hora: ehVesp ? '15:30 - 15:50' : '09:30 - 09:50',
          })
        }
      })
    } else {
      slotsFinais = slotsPadrao
    }

    setSlotsExibicao(slotsFinais)

    const mapa = {}
    registros.forEach((item) => {
      const valorDiaBruto =
        item.dia_semana ?? item.dia ?? item.dia_da_semana ?? item.weekday ?? ''
      const diaNorm = normalizarDia(valorDiaBruto)
      const h = extrairTextoHorario(item)
      const materia = item.disciplina || item.materia || item.componente || ''
      const prof = item.professor_nome || item.professor || item.docente || ''

      if (diaNorm && h) {
        mapa[`${diaNorm}|||${h}`] = {
          disciplina: materia,
          professor_nome: prof,
        }
      }
    })

    setGradeMap(mapa)
    setCarregando(false)
  }

  function handleAlterarCelula(diaLabel, chaveHorario, novaDisciplina) {
    const vinc = vinculosDocentes.find(
      (v) => v.disciplina.toLowerCase() === novaDisciplina.toLowerCase()
    )
    const chave = `${diaLabel}|||${chaveHorario}`
    setGradeMap((prev) => ({
      ...prev,
      [chave]: {
        disciplina: novaDisciplina,
        professor_nome: vinc?.professor_nome || prev[chave]?.professor_nome || '',
      },
    }))
  }

  async function handleSalvarGrade() {
    if (!podeEditarGrade) return
    setSalvando(true)
    setMensagem('')

    const registros = []
    Object.entries(gradeMap).forEach(([chave, valor]) => {
      if (valor.disciplina?.trim()) {
        const [dia_semana, horario] = chave.split('|||')
        registros.push({
          turma_id: turmaId,
          dia_semana,
          horario,
          disciplina: valor.disciplina.trim(),
          professor_nome: valor.professor_nome || null,
        })
      }
    })

    await supabase.from('grade_horaria').delete().eq('turma_id', turmaId)
    if (registros.length > 0) {
      const { error } = await supabase.from('grade_horaria').insert(registros)
      if (error) {
        alert('Erro ao salvar grade horária: ' + error.message)
        setSalvando(false)
        return
      }
    }

    setSalvando(false)
    setEditando(false)
    setMensagem('Grade horária atualizada com sucesso!')
    carregarGradeEDocentes(turmaId)
    setTimeout(() => setMensagem(''), 4000)
  }

  const turmaAtual = turmas.find((t) => t.id === turmaId)
  const ehVespertino =
    (turmaAtual?.turno || '').toLowerCase().includes('vesp') ||
    (turmaAtual?.turno || '').toLowerCase().includes('tarde')

  const disciplinasDisponiveis = Array.from(
    new Set([
      ...vinculosDocentes.map((v) => v.disciplina),
      'Língua Portuguesa',
      'Matemática',
      'Ciências',
      'História',
      'Geografia',
      'Língua Inglesa',
      'Educação Física',
      'Informática Educacional',
      'Arte',
      'Ensino Religioso',
    ])
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Quadro Semanal de Horários</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Consulta aberta para toda a equipe escolar • Edição restrita à Secretaria e Direção.
            </p>
          </div>

          <div className="action-group no-print">
            <button
              type="button"
              className="btn-outline"
              style={{ marginTop: 0 }}
              onClick={() => window.print()}
            >
              Imprimir Grade
            </button>

            {podeEditarGrade && !editando && (
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 0, width: 'auto', padding: '9px 18px' }}
                onClick={() => setEditando(true)}
              >
                Editar Horários
              </button>
            )}

            {podeEditarGrade && editando && (
              <>
                <button
                  type="button"
                  className="btn-sm btn-approve"
                  disabled={salvando}
                  onClick={handleSalvarGrade}
                >
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  className="btn-sm btn-pending"
                  onClick={() => carregarGradeEDocentes(turmaId)}
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        {/* SELETOR DE TURMAS */}
        <div className="filter-tabs no-print" style={{ marginBottom: 20 }}>
          {turmas.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-btn ${turmaId === t.id ? 'active' : ''}`}
              onClick={() => setTurmaId(t.id)}
            >
              {t.nome} ({t.turno})
            </button>
          ))}
        </div>

        {erroLeitura && <div className="alert alert-error no-print">{erroLeitura}</div>}
        {mensagem && <div className="alert alert-success no-print">{mensagem}</div>}

        {turmaAtual && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              padding: '14px 18px',
              background: 'var(--primary-soft)',
              borderRadius: 10,
              border: '1px solid #bae6fd',
              marginBottom: 20,
            }}
          >
            <div>
              <strong style={{ color: 'var(--primary-dark)', fontSize: '1rem' }}>
                {turmaAtual.nome} • Turno {turmaAtual.turno}
              </strong>
              <div style={{ fontSize: '0.82rem', color: '#475569', marginTop: 2 }}>
                Escola Municipal Pedro Furtado • Ano Letivo 2026
              </div>
            </div>
            <span className="status-pill status-ativo">
              {ehVespertino ? '13h00 às 17h30' : '07h00 às 11h30'}
            </span>
          </div>
        )}

        {carregando ? (
          <p style={{ color: '#64748b' }}>Carregando grade horária...</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th style={{ width: 145 }}>Horário</th>
                  {DIAS_SEMANA.map((dia) => (
                    <th key={dia.label} style={{ textAlign: 'center' }}>
                      {dia.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slotsExibicao.map((slot, index) => {
                  if (slot.isIntervalo) {
                    return (
                      <tr key={`int_${index}`}>
                        <td
                          colSpan={6}
                          style={{
                            background: '#fef6e7',
                            color: '#b4690e',
                            textAlign: 'center',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            letterSpacing: '0.06em',
                            padding: '10px',
                          }}
                        >
                          INTERVALO ({slot.hora})
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={slot.chave}>
                      <td style={{ background: '#f8fafc', borderRight: '1px solid var(--border)' }}>
                        <strong style={{ display: 'block', fontSize: '0.84rem', color: 'var(--primary-dark)' }}>
                          {slot.aula}
                        </strong>
                        <span style={{ fontSize: '0.76rem', color: '#64748b' }}>{slot.hora}</span>
                      </td>

                      {DIAS_SEMANA.map((dia) => {
                        const chave = `${dia.label}|||${slot.chave}`
                        const celula = gradeMap[chave] || { disciplina: '', professor_nome: '' }
                        const estilo = corDisciplina(celula.disciplina)

                        return (
                          <td key={dia.label} style={{ padding: 8, verticalAlign: 'top' }}>
                            {editando ? (
                              <select
                                value={celula.disciplina}
                                onChange={(e) =>
                                  handleAlterarCelula(dia.label, slot.chave, e.target.value)
                                }
                                style={{
                                  width: '100%',
                                  padding: '7px 8px',
                                  borderRadius: 7,
                                  border: '1px solid var(--border-input)',
                                  fontSize: '0.82rem',
                                }}
                              >
                                <option value="">-- Livre --</option>
                                {disciplinasDisponiveis.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>
                            ) : celula.disciplina ? (
                              <div
                                style={{
                                  background: estilo.bg,
                                  border: `1px solid ${estilo.border}`,
                                  borderRadius: 8,
                                  padding: '9px 10px',
                                  textAlign: 'center',
                                }}
                              >
                                <strong
                                  style={{
                                    display: 'block',
                                    fontSize: '0.83rem',
                                    color: estilo.text,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  {celula.disciplina}
                                </strong>
                                {celula.professor_nome && (
                                  <span
                                    style={{
                                      display: 'block',
                                      fontSize: '0.72rem',
                                      color: '#475569',
                                      marginTop: 4,
                                    }}
                                  >
                                    {celula.professor_nome.split(' ').slice(0, 2).join(' ')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div
                                style={{
                                  textAlign: 'center',
                                  color: '#cbd5e1',
                                  fontSize: '0.8rem',
                                  padding: '10px 0',
                                }}
                              >
                                —
                              </div>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}