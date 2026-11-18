import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function DiarioAulas({ perfil }) {
  const [vinculos, setVinculos] = useState([])
  const [turmasPermitidas, setTurmasPermitidas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [disciplinasPermitidas, setDisciplinasPermitidas] = useState([])
  const [disciplina, setDisciplina] = useState('')
  const [filtroDisciplina, setFiltroDisciplina] = useState('todas')

  const [dataAula, setDataAula] = useState(() => new Date().toISOString().split('T')[0])
  const [quantidadeAulas, setQuantidadeAulas] = useState(1)
  const [conteudo, setConteudo] = useState('')
  const [atividades, setAtividades] = useState('')

  const [registros, setRegistros] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const ehAdmin = perfil.cargo === 'Administrador(a) do Sistema'

  useEffect(() => {
    carregarPermissoesETurmas()
  }, [perfil])

  useEffect(() => {
    if (turmaId && vinculos.length > 0) {
      const discs = vinculos.filter((v) => v.turma_id === turmaId)
      setDisciplinasPermitidas(discs)
      if (discs.length > 0 && !discs.some((d) => d.disciplina === disciplina)) {
        setDisciplina(discs[0].disciplina)
      }
      setFiltroDisciplina('todas')
      carregarRegistrosDiario(turmaId)
    }
  }, [turmaId, vinculos])

  async function carregarPermissoesETurmas() {
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
    setTurmasPermitidas(turmasPerm)
    if (turmasPerm.length > 0) {
      setTurmaId(turmasPerm[0].id)
    }
  }

  async function carregarRegistrosDiario(tId) {
    setCarregando(true)
    const { data } = await supabase
      .from('diario_aulas')
      .select('*')
      .eq('turma_id', tId)
      .order('data_aula', { ascending: false })
      .order('criado_em', { ascending: false })

    setRegistros(data || [])
    setCarregando(false)
  }

  async function handleRegistrarAula(e) {
    e.preventDefault()
    if (!turmaId || !disciplina || !conteudo.trim()) return

    setSalvando(true)
    setMensagem('')

    const { error } = await supabase.from('diario_aulas').insert([
      {
        turma_id: turmaId,
        disciplina,
        data_aula: dataAula,
        quantidade_aulas: Number(quantidadeAulas) || 1,
        conteudo: conteudo.trim(),
        atividades: atividades.trim() || null,
        professor_id: perfil.id,
        professor_nome: perfil.nome_completo,
      },
    ])

    setSalvando(false)

    if (error) {
      alert('Erro ao registrar aula no diário: ' + error.message)
    } else {
      setConteudo('')
      setAtividades('')
      setMensagem(`Aula de ${disciplina} registrada no diário!`)
      carregarRegistrosDiario(turmaId)
      setTimeout(() => setMensagem(''), 4000)
    }
  }

  async function handleExcluirRegistro(reg) {
    const ehAutor = reg.professor_id === perfil.id || reg.professor_nome === perfil.nome_completo
    if (!ehAutor && !ehAdmin) return
    if (!window.confirm('Deseja remover este registro do diário de classe?')) return

    const { error } = await supabase.from('diario_aulas').delete().eq('id', reg.id)
    if (error) {
      alert('Erro ao remover registro: ' + error.message)
    } else {
      carregarRegistrosDiario(turmaId)
    }
  }

  const registrosFiltrados = registros.filter((r) =>
    filtroDisciplina === 'todas' ? true : (r.disciplina || 'Geral') === filtroDisciplina
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* FORMULÁRIO DE REGISTRO DE AULA */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Diário de Classe • Registro de Conteúdos</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Lançamento exclusivo docente, separado por turma e disciplina ministrada.
            </p>
          </div>
        </div>

        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        {turmasPermitidas.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            Nenhuma turma vinculada ao seu perfil docente.
          </p>
        ) : (
          <form onSubmit={handleRegistrarAula}>
            <div className="form-grid">
              <div className="form-group col-4">
                <label>Turma</label>
                <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
                  {turmasPermitidas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} • {t.turno}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group col-4">
                <label>Disciplina</label>
                <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
                  {disciplinasPermitidas.map((d) => (
                    <option key={d.disciplina} value={d.disciplina}>
                      {d.disciplina}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group col-2">
                <label>Data da Aula</label>
                <input
                  type="date"
                  required
                  value={dataAula}
                  onChange={(e) => setDataAula(e.target.value)}
                />
              </div>

              <div className="form-group col-2">
                <label>Nº de Aulas</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  required
                  value={quantidadeAulas}
                  onChange={(e) => setQuantidadeAulas(e.target.value)}
                />
              </div>

              <div className="form-group col-12">
                <label>Conteúdo Ministrado / Habilidade BNCC</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Descreva os conteúdos trabalhados em sala..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                />
              </div>

              <div className="form-group col-12">
                <label>Atividades, Metodologia ou Tarefa de Casa (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Exercícios no livro didático pág. 42, atividade prática em laboratório..."
                  value={atividades}
                  onChange={(e) => setAtividades(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={salvando}
              style={{ width: 'auto', padding: '11px 24px' }}
            >
              {salvando ? 'Registrando...' : `Registrar Aula (${disciplina})`}
            </button>
          </form>
        )}
      </section>

      {/* HISTÓRICO DO DIÁRIO SEPARADO POR MATÉRIA */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Histórico de Aulas Registradas • {registrosFiltrados.length}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Cada lançamento identifica a disciplina e o docente responsável.
            </p>
          </div>

          <div className="filter-tabs">
            <button
              type="button"
              className={`tab-btn ${filtroDisciplina === 'todas' ? 'active' : ''}`}
              onClick={() => setFiltroDisciplina('todas')}
            >
              Todas as Matérias
            </button>
            {disciplinasPermitidas.map((d) => (
              <button
                key={d.disciplina}
                type="button"
                className={`tab-btn ${filtroDisciplina === d.disciplina ? 'active' : ''}`}
                onClick={() => setFiltroDisciplina(d.disciplina)}
              >
                {d.disciplina}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <p style={{ color: '#64748b' }}>Carregando registros do diário...</p>
        ) : registrosFiltrados.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma aula registrada para este filtro.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {registrosFiltrados.map((reg) => {
              const podeExcluir =
                ehAdmin ||
                reg.professor_id === perfil.id ||
                reg.professor_nome === perfil.nome_completo

              return (
                <div key={reg.id} className="aviso-item">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <span className="status-pill status-ativo" style={{ marginRight: 8 }}>
                        {reg.disciplina || 'Geral'}
                      </span>
                      <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>
                        {reg.data_aula?.split('-').reverse().join('/')} ({reg.quantidade_aulas || 1} aula{reg.quantidade_aulas > 1 ? 's' : ''})
                      </strong>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 4 }}>
                        Docente: <strong>{reg.professor_nome || 'Não informado'}</strong>
                      </div>
                    </div>

                    {podeExcluir && (
                      <button
                        type="button"
                        onClick={() => handleExcluirRegistro(reg)}
                        className="btn-sm btn-block"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <p style={{ marginTop: 10, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.55 }}>
                    {reg.conteudo}
                  </p>

                  {reg.atividades && (
                    <div style={{ marginTop: 8, fontSize: '0.84rem', color: '#475569' }}>
                      <strong>Atividades:</strong> {reg.atividades}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}