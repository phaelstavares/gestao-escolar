import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CARGOS_GESTAO = [
  'Administrador(a) do Sistema',
  'Secretário(a) Escolar',
  'Diretor(a)',
  'Supervisor(a) Pedagógico(a)',
]

export default function TurmasAlunos({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(false)

  const [novaTurma, setNovaTurma] = useState({
    nome: '',
    turno: 'Manhã',
    ano_letivo: 2026,
  })
  const [criandoTurma, setCriandoTurma] = useState(false)

  const ehGestao = CARGOS_GESTAO.includes(perfil?.cargo)

  useEffect(() => {
    carregarTurmasPermitidas()
  }, [perfil])

  useEffect(() => {
    if (turmaSelecionada) {
      carregarAlunosDaTurma(turmaSelecionada)
    }
  }, [turmaSelecionada])

  async function carregarTurmasPermitidas() {
    const [{ data: todasTurmas }, { data: vinculos }] = await Promise.all([
      supabase.from('turmas').select('*').order('nome'),
      supabase.from('professores_turmas').select('turma_id, professor_id, professor_nome'),
    ])

    let listaFinal = todasTurmas || []

    if (!ehGestao && perfil) {
      const idsPermitidos = new Set(
        (vinculos || [])
          .filter((v) => {
            const mesmoId = v.professor_id && v.professor_id === perfil.id
            const mesmoNome =
              v.professor_nome &&
              perfil.nome_completo &&
              v.professor_nome.toLowerCase().includes(perfil.nome_completo.split(' ')[0].toLowerCase()) &&
              v.professor_nome.toLowerCase().includes(perfil.nome_completo.split(' ').slice(-1)[0].toLowerCase())
            return mesmoId || mesmoNome
          })
          .map((v) => v.turma_id)
      )
      listaFinal = listaFinal.filter((t) => idsPermitidos.has(t.id))
    }

    setTurmas(listaFinal)
    if (listaFinal.length > 0 && !listaFinal.some((t) => t.id === turmaSelecionada)) {
      setTurmaSelecionada(listaFinal[0].id)
    }
  }

  async function carregarAlunosDaTurma(tId) {
    setCarregando(true)
    const { data } = await supabase
      .from('alunos')
      .select('*')
      .eq('turma_id', tId)
      .order('nome_completo')

    setAlunos(data || [])
    setCarregando(false)
  }

  async function handleCriarTurma(e) {
    e.preventDefault()
    if (!ehGestao || !novaTurma.nome.trim()) return

    setCriandoTurma(true)
    const { data, error } = await supabase
      .from('turmas')
      .insert([
        {
          nome: novaTurma.nome.trim(),
          turno: novaTurma.turno,
          ano_letivo: Number(novaTurma.ano_letivo),
        },
      ])
      .select()
      .single()

    setCriandoTurma(false)

    if (error) {
      alert('Erro ao criar turma: ' + error.message)
    } else {
      setNovaTurma({ nome: '', turno: 'Manhã', ano_letivo: 2026 })
      carregarTurmasPermitidas()
      if (data) setTurmaSelecionada(data.id)
    }
  }

  const turmaAtual = turmas.find((t) => t.id === turmaSelecionada)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>{ehGestao ? `Turmas da Escola • ${turmas.length}` : `Minhas Turmas • ${turmas.length}`}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              {ehGestao
                ? 'Gerenciamento de turmas por série e turno.'
                : 'Turmas vinculadas às suas disciplinas.'}
            </p>
          </div>
        </div>

        {ehGestao && (
          <form onSubmit={handleCriarTurma} style={{ marginBottom: 20 }}>
            <div className="form-grid">
              <div className="form-group col-5">
                <label>Nome da Turma</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 5º Ano C"
                  value={novaTurma.nome}
                  onChange={(e) => setNovaTurma({ ...novaTurma, nome: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>Turno</label>
                <select
                  value={novaTurma.turno}
                  onChange={(e) => setNovaTurma({ ...novaTurma, turno: e.target.value })}
                >
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Integral">Integral</option>
                </select>
              </div>

              <div className="form-group col-3">
                <label>Ano Letivo</label>
                <input
                  type="number"
                  required
                  value={novaTurma.ano_letivo}
                  onChange={(e) => setNovaTurma({ ...novaTurma, ano_letivo: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={criandoTurma}
              style={{ width: 'auto', padding: '10px 22px' }}
            >
              {criandoTurma ? 'Criando...' : 'Adicionar Turma'}
            </button>
          </form>
        )}

        <div className="filter-tabs">
          {turmas.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`tab-btn ${turmaSelecionada === t.id ? 'active' : ''}`}
              onClick={() => setTurmaSelecionada(t.id)}
            >
              {t.nome} • {t.turno}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>
              Relação de Alunos • {turmaAtual ? `${turmaAtual.nome} (${turmaAtual.turno})` : ''}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Total de {alunos.length} alunos nesta turma.
            </p>
          </div>
        </div>

        {carregando ? (
          <p style={{ color: '#64748b' }}>Carregando lista de alunos...</p>
        ) : alunos.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhum aluno nesta turma.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Matrícula</th>
                  <th>Nome Completo</th>
                  <th>Nascimento</th>
                  <th>Responsável</th>
                  <th>Telefone</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, index) => (
                  <tr key={aluno.id}>
                    <td>{index + 1}</td>
                    <td><strong>{aluno.numero_matricula || '-'}</strong></td>
                    <td><strong>{aluno.nome_completo}</strong></td>
                    <td>
                      {aluno.data_nascimento
                        ? aluno.data_nascimento.split('-').reverse().join('/')
                        : '-'}
                    </td>
                    <td>{aluno.responsavel_nome || '-'}</td>
                    <td>{aluno.responsavel_telefone || '-'}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          (aluno.situacao || 'Ativo') === 'Ativo'
                            ? 'status-ativo'
                            : 'status-bloqueado'
                        }`}
                      >
                        {aluno.situacao || 'Ativo'}
                      </span>
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