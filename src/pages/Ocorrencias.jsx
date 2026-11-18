import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function verificarGestaoCompleta(cargo = '') {
  const c = cargo.toLowerCase()
  return (
    c.includes('administrador') ||
    c.includes('diretor') ||
    c.includes('vice') ||
    c.includes('secretári') ||
    c.includes('secretari') ||
    c.includes('supervisor')
  )
}

export default function Ocorrencias({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [turmaId, setTurmaId] = useState('')
  const [alunos, setAlunos] = useState([])
  const [alunoId, setAlunoId] = useState('')
  const [dataOcorrencia, setDataOcorrencia] = useState(() => new Date().toISOString().split('T')[0])
  const [tipoOcorrencia, setTipoOcorrencia] = useState('Comportamental / Disciplinar')
  const [gravidade, setGravidade] = useState('Leve')
  const [descricao, setDescricao] = useState('')
  const [providencias, setProvidencias] = useState('')

  const [ocorrencias, setOcorrencias] = useState([])
  const [filtroTurmaHist, setFiltroTurmaHist] = useState('todas')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const ehGestao = verificarGestaoCompleta(perfil?.cargo)

  useEffect(() => {
    carregarTurmas()
    carregarOcorrencias()
  }, [perfil])

  useEffect(() => {
    if (turmaId) {
      carregarAlunosDaTurma(turmaId)
    }
  }, [turmaId])

  async function carregarTurmas() {
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
    if (listaFinal.length > 0) {
      setTurmaId(listaFinal[0].id)
    }
  }

  async function carregarAlunosDaTurma(tId) {
    const { data } = await supabase
      .from('alunos')
      .select('id, nome_completo')
      .eq('turma_id', tId)
      .order('nome_completo')

    const lista = data || []
    setAlunos(lista)
    setAlunoId(lista.length > 0 ? lista[0].id : '')
  }

  async function carregarOcorrencias() {
    let query = supabase
      .from('ocorrencias')
      .select('*, alunos(nome_completo), turmas(nome, turno)')
      .order('data_ocorrencia', { ascending: false })
      .order('criado_em', { ascending: false })

    // Professores enxergam apenas as ocorrências registradas por eles próprios
    if (!ehGestao) {
      query = query.eq('registrado_por', perfil.id)
    }

    const { data } = await query
    setOcorrencias(data || [])
  }

  async function handleRegistrarOcorrencia(e) {
    e.preventDefault()
    if (!turmaId || !alunoId || !descricao.trim()) return

    setSalvando(true)
    setMensagem('')

    const { error } = await supabase.from('ocorrencias').insert([
      {
        turma_id: turmaId,
        aluno_id: alunoId,
        data_ocorrencia: dataOcorrencia,
        tipo_ocorrencia: tipoOcorrencia,
        gravidade,
        descricao: descricao.trim(),
        providencias: providencias.trim() || null,
        registrado_por: perfil.id,
        autor_nome: perfil.nome_completo,
        autor_cargo: perfil.cargo,
        status_acompanhamento: 'Registrada',
      },
    ])

    setSalvando(false)

    if (error) {
      alert('Erro ao registrar ocorrência: ' + error.message)
    } else {
      setDescricao('')
      setProvidencias('')
      setMensagem('Ocorrência registrada com sucesso!')
      carregarOcorrencias()
      setTimeout(() => setMensagem(''), 4000)
    }
  }

  async function handleAtualizarStatus(id, novoStatus) {
    if (!ehGestao) return
    const { error } = await supabase
      .from('ocorrencias')
      .update({ status_acompanhamento: novoStatus })
      .eq('id', id)

    if (!error) carregarOcorrencias()
  }

  const ocorrenciasFiltradas = ocorrencias.filter((oc) => {
    const bateTurma = filtroTurmaHist === 'todas' ? true : oc.turma_id === filtroTurmaHist
    const texto = buscaTexto.toLowerCase()
    const bateTexto =
      !texto ||
      (oc.alunos?.nome_completo || '').toLowerCase().includes(texto) ||
      (oc.descricao || '').toLowerCase().includes(texto) ||
      (oc.autor_nome || '').toLowerCase().includes(texto)
    return bateTurma && bateTexto
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* FORMULÁRIO DE REGISTRO */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Registrar Ocorrência Escolar</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Todo registro fica vinculado automaticamente ao servidor que o efetuou.
            </p>
          </div>
        </div>

        <div
          style={{
            marginBottom: 18,
            padding: '10px 14px',
            background: '#f0f7fa',
            borderLeft: '4px solid var(--primary)',
            borderRadius: 6,
            fontSize: '0.88rem',
            color: '#0f172a',
          }}
        >
          <strong>Responsável pelo registro:</strong> {perfil.nome_completo} •{' '}
          <span>{perfil.cargo}</span>
        </div>

        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        <form onSubmit={handleRegistrarOcorrencia}>
          <div className="form-grid">
            <div className="form-group col-4">
              <label>Turma</label>
              <select value={turmaId} onChange={(e) => setTurmaId(e.target.value)} required>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} • {t.turno}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group col-5">
              <label>Aluno</label>
              <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} required>
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome_completo}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group col-3">
              <label>Data</label>
              <input
                type="date"
                required
                value={dataOcorrencia}
                onChange={(e) => setDataOcorrencia(e.target.value)}
              />
            </div>

            <div className="form-group col-6">
              <label>Classificação</label>
              <select value={tipoOcorrencia} onChange={(e) => setTipoOcorrencia(e.target.value)}>
                <option value="Comportamental / Disciplinar">Comportamental / Disciplinar</option>
                <option value="Pedagógica / Rendimento">Pedagógica / Rendimento</option>
                <option value="Saúde / Atendimento">Saúde / Atendimento</option>
                <option value="Atraso / Saída Antecipada">Atraso / Saída Antecipada</option>
                <option value="Convocação de Responsáveis">Convocação de Responsáveis</option>
              </select>
            </div>

            <div className="form-group col-6">
              <label>Gravidade</label>
              <select value={gravidade} onChange={(e) => setGravidade(e.target.value)}>
                <option value="Leve">Leve • Orientação em Sala</option>
                <option value="Moderada">Moderada • Encaminhamento à Direção</option>
                <option value="Grave">Grave • Comunicação aos Responsáveis</option>
              </select>
            </div>

            <div className="form-group col-12">
              <label>Relato Detalhado do Ocorrido</label>
              <textarea
                rows={3}
                required
                placeholder="Descreva objetivamente o ocorrido..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>

            <div className="form-group col-12">
              <label>Providências Tomadas / Encaminhamentos (Opcional)</label>
              <input
                type="text"
                placeholder="Ex: Conversa com o aluno, bilhete na agenda, contato telefônico com responsável..."
                value={providencias}
                onChange={(e) => setProvidencias(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={salvando}
            style={{ width: 'auto', padding: '11px 24px' }}
          >
            {salvando ? 'Registrando...' : 'Salvar Ocorrência'}
          </button>
        </form>
      </section>

      {/* HISTÓRICO DE OCORRÊNCIAS (INDIVIDUAL PARA PROFESSOR / COMPLETO PARA DIREÇÃO E ADMIN) */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>
              {ehGestao
                ? `Histórico Geral de Ocorrências da Escola • ${ocorrenciasFiltradas.length}`
                : `Minhas Ocorrências Registradas • ${ocorrenciasFiltradas.length}`}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              {ehGestao
                ? 'Visualização completa de todos os registros efetuados por professores e equipe.'
                : 'Histórico individual das ocorrências registradas por você.'}
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ marginBottom: 18 }}>
          <div className="form-group col-6">
            <label>Buscar por Aluno, Relato ou Servidor</label>
            <input
              type="text"
              placeholder="Digite para filtrar..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
            />
          </div>

          <div className="form-group col-6">
            <label>Filtrar por Turma</label>
            <select value={filtroTurmaHist} onChange={(e) => setFiltroTurmaHist(e.target.value)}>
              <option value="todas">Todas as Turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} • {t.turno}
                </option>
              ))}
            </select>
          </div>
        </div>

        {ocorrenciasFiltradas.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma ocorrência encontrada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ocorrenciasFiltradas.map((oc) => (
              <div key={oc.id} className="aviso-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <span
                      className={`status-pill ${
                        oc.gravidade === 'Grave'
                          ? 'status-bloqueado'
                          : oc.gravidade === 'Moderada'
                          ? 'status-pendente'
                          : 'status-ativo'
                      }`}
                      style={{ marginRight: 8 }}
                    >
                      {oc.gravidade || 'Leve'}
                    </span>
                    <strong style={{ color: 'var(--primary)', fontSize: '0.98rem' }}>
                      {oc.alunos?.nome_completo}
                    </strong>
                    <span style={{ fontSize: '0.84rem', color: '#64748b', marginLeft: 8 }}>
                      • {oc.turmas?.nome} ({oc.turmas?.turno}) • {oc.data_ocorrencia?.split('-').reverse().join('/')}
                    </span>

                    <div style={{ fontSize: '0.8rem', color: '#334155', marginTop: 5 }}>
                      <strong>Registrado por:</strong> {oc.autor_nome || 'Não informado'}{' '}
                      {oc.autor_cargo ? `(${oc.autor_cargo})` : ''} • <strong>Tipo:</strong> {oc.tipo_ocorrencia}
                    </div>
                  </div>

                  {ehGestao ? (
                    <select
                      value={oc.status_acompanhamento || 'Registrada'}
                      onChange={(e) => handleAtualizarStatus(oc.id, e.target.value)}
                      style={{
                        padding: '5px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                      }}
                    >
                      <option value="Registrada">Registrada</option>
                      <option value="Em Acompanhamento">Em Acompanhamento</option>
                      <option value="Responsável Notificado">Responsável Notificado</option>
                      <option value="Concluída">Concluída</option>
                    </select>
                  ) : (
                    <span className="status-pill status-ativo">
                      {oc.status_acompanhamento || 'Registrada'}
                    </span>
                  )}
                </div>

                <p style={{ marginTop: 10, fontSize: '0.92rem', color: '#1e293b', lineHeight: 1.55 }}>
                  {oc.descricao}
                </p>

                {oc.providencias && (
                  <div style={{ marginTop: 8, fontSize: '0.84rem', color: '#475569' }}>
                    <strong>Providências:</strong> {oc.providencias}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}