import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DiarioAulas({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [registros, setRegistros] = useState([])
  const [turmaFiltro, setTurmaFiltro] = useState('todas')

  const [form, setForm] = useState({
    turma_id: '',
    data_aula: new Date().toISOString().split('T')[0],
    disciplina: 'Informática Educacional',
    conteudo: '',
    atividade: '',
    observacoes: '',
  })
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const [{ data: listaTurmas }, { data: listaDiario }] = await Promise.all([
      supabase.from('turmas').select('*').order('nome'),
      supabase
        .from('diario_aulas')
        .select('*, turmas(nome, turno)')
        .order('data_aula', { ascending: false })
        .order('criado_em', { ascending: false }),
    ])

    if (listaTurmas) {
      setTurmas(listaTurmas)
      if (listaTurmas.length > 0 && !form.turma_id) {
        setForm((prev) => ({ ...prev, turma_id: listaTurmas[0].id }))
      }
    }
    if (listaDiario) setRegistros(listaDiario)
  }

  async function handleRegistrarAula(e) {
    e.preventDefault()
    if (!form.turma_id) return alert('Selecione uma turma.')

    setSalvando(true)
    const { error } = await supabase.from('diario_aulas').insert([
      {
        ...form,
        registrado_por: perfil.id,
        autor_nome: `${perfil.nome_completo} (${perfil.cargo})`,
      },
    ])
    setSalvando(false)

    if (error) {
      alert('Erro ao registrar aula: ' + error.message)
    } else {
      setForm((prev) => ({
        ...prev,
        conteudo: '',
        atividade: '',
        observacoes: '',
      }))
      carregarDados()
    }
  }

  async function handleExcluir(id) {
    await supabase.from('diario_aulas').delete().eq('id', id)
    carregarDados()
  }

  const registrosFiltrados = registros.filter((r) =>
    turmaFiltro === 'todas' ? true : r.turma_id === turmaFiltro
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* BLOCO 1: NOVO REGISTRO NO DIÁRIO */}
      <section className="panel-card">
        <div className="panel-header" style={{ marginBottom: 14 }}>
          <div>
            <h3>Diário de Classe • Registro de Aula</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Registre os conteúdos trabalhados, atividades práticas e observações pedagógicas da turma.
            </p>
          </div>
        </div>

        <form onSubmit={handleRegistrarAula} className="form-grid">
          <div className="form-group col-4">
            <label>Turma *</label>
            <select
              required
              value={form.turma_id}
              onChange={(e) => setForm({ ...form, turma_id: e.target.value })}
            >
              {turmas.length === 0 && <option value="">Nenhuma turma cadastrada</option>}
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.turno})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-4">
            <label>Data da Aula *</label>
            <input
              type="date"
              required
              value={form.data_aula}
              onChange={(e) => setForm({ ...form, data_aula: e.target.value })}
            />
          </div>

          <div className="form-group col-4">
            <label>Componente / Disciplina *</label>
            <input
              type="text"
              required
              placeholder="Ex: Informática, Português, Projeto..."
              value={form.disciplina}
              onChange={(e) => setForm({ ...form, disciplina: e.target.value })}
            />
          </div>

          <div className="form-group col-12">
            <label>Conteúdo Ministrado *</label>
            <textarea
              required
              rows="2"
              placeholder="Descreva o tema ou habilidade trabalhada na aula..."
              value={form.conteudo}
              onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
            />
          </div>

          <div className="form-group col-6">
            <label>Atividade Aplicada (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Exercício no computador, leitura coletiva..."
              value={form.atividade}
              onChange={(e) => setForm({ ...form, atividade: e.target.value })}
            />
          </div>

          <div className="form-group col-6">
            <label>Observações Pedagógicas (opcional)</label>
            <input
              type="text"
              placeholder="Ex: Turma participativa, alunos com dúvida em..."
              value={form.observacoes}
              onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
            />
          </div>

          <div className="col-12">
            <button
              type="submit"
              className="btn-primary"
              disabled={salvando}
              style={{ marginTop: 6, width: 'auto', padding: '10px 22px' }}
            >
              {salvando ? 'Salvando...' : '+ Registrar no Diário'}
            </button>
          </div>
        </form>
      </section>

      {/* BLOCO 2: HISTÓRICO DE AULAS REGISTRADAS */}
      <section className="panel-card">
        <div className="panel-header">
          <h3>Histórico de Aulas ({registrosFiltrados.length})</h3>
          <select
            value={turmaFiltro}
            onChange={(e) => setTurmaFiltro(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}
          >
            <option value="todas">Todas as turmas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} ({t.turno})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {registrosFiltrados.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhuma aula registrada neste filtro ainda.</p>
          ) : (
            registrosFiltrados.map((reg) => {
              const dataFormatada = reg.data_aula.split('-').reverse().join('/')
              return (
                <div key={reg.id} className="aviso-item">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '1rem' }}>
                        {reg.turmas?.nome || 'Turma'} • {reg.disciplina}
                      </strong>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="status-pill status-ativo">{dataFormatada}</span>
                      {reg.registrado_por === perfil.id && (
                        <button onClick={() => handleExcluir(reg.id)} className="btn-sm btn-pending">
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.5 }}>
                    <strong>Conteúdo:</strong> {reg.conteudo}
                  </p>

                  {reg.atividade && (
                    <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: 4 }}>
                      <strong>Atividade:</strong> {reg.atividade}
                    </p>
                  )}

                  {reg.observacoes && (
                    <p style={{ fontSize: '0.88rem', color: '#475569', marginTop: 4 }}>
                      <strong>Observações:</strong> {reg.observacoes}
                    </p>
                  )}

                  <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8, display: 'block' }}>
                    Registrado por {reg.autor_nome}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}