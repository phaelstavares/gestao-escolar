import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Ocorrencias({ perfil }) {
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [ocorrencias, setOcorrencias] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [arquivo, setArquivo] = useState(null)

  const [form, setForm] = useState({
    turma_id: '',
    aluno_id: '',
    tipo: 'Pedagógica',
    data_ocorrencia: new Date().toISOString().split('T')[0],
    descricao: '',
    providencia: '',
  })

  useEffect(() => {
    carregarTurmas()
    carregarOcorrencias()
  }, [])

  useEffect(() => {
    if (form.turma_id) carregarAlunosDaTurma(form.turma_id)
  }, [form.turma_id])

  async function carregarTurmas() {
    const { data } = await supabase.from('turmas').select('*').order('nome')
    if (data && data.length > 0) {
      setTurmas(data)
      setForm((prev) => ({ ...prev, turma_id: data[0].id }))
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
    setForm((prev) => ({ ...prev, aluno_id: lista.length > 0 ? lista[0].id : '' }))
  }

  async function carregarOcorrencias() {
    const { data } = await supabase
      .from('ocorrencias')
      .select('*, alunos(nome_completo), turmas(nome)')
      .order('data_ocorrencia', { ascending: false })

    if (data) setOcorrencias(data)
  }

  async function handleRegistrar(e) {
    e.preventDefault()
    if (!form.aluno_id || !form.descricao.trim()) return

    setSalvando(true)
    let anexoUrl = null
    let anexoNome = null

    if (arquivo) {
      const ext = arquivo.name.split('.').pop()
      const caminho = `ocorrencias/${form.aluno_id}_${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('atestados')
        .upload(caminho, arquivo, { upsert: true })

      if (upErr) {
        alert('Erro ao anexar arquivo: ' + upErr.message)
        setSalvando(false)
        return
      }

      const { data: pubData } = supabase.storage.from('atestados').getPublicUrl(caminho)
      anexoUrl = pubData?.publicUrl || null
      anexoNome = arquivo.name
    }

    const { error } = await supabase.from('ocorrencias').insert([
      {
        turma_id: form.turma_id,
        aluno_id: form.aluno_id,
        tipo: form.tipo,
        data_ocorrencia: form.data_ocorrencia,
        descricao: form.descricao,
        providencia: form.providencia || null,
        anexo_url: anexoUrl,
        anexo_nome: anexoNome,
        registrado_por_nome: perfil.nome_completo,
      },
    ])

    setSalvando(false)

    if (error) {
      alert('Erro ao registrar ocorrência: ' + error.message)
    } else {
      setForm((prev) => ({ ...prev, descricao: '', providencia: '' }))
      setArquivo(null)
      carregarOcorrencias()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Registrar Ocorrência</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Acompanhamento individual do aluno e anexo de documentos.
            </p>
          </div>
        </div>

        <form onSubmit={handleRegistrar}>
          <div className="form-grid">
            <div className="form-group col-4">
              <label>Turma</label>
              <select
                value={form.turma_id}
                onChange={(e) => setForm({ ...form, turma_id: e.target.value })}
              >
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>{t.nome}</option>
                ))}
              </select>
            </div>

            <div className="form-group col-4">
              <label>Aluno</label>
              <select
                required
                value={form.aluno_id}
                onChange={(e) => setForm({ ...form, aluno_id: e.target.value })}
              >
                {alunos.map((a) => (
                  <option key={a.id} value={a.id}>{a.nome_completo}</option>
                ))}
              </select>
            </div>

            <div className="form-group col-4">
              <label>Categoria</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              >
                <option value="Pedagógica">Pedagógica</option>
                <option value="Saúde / Atestado">Saúde / Atestado</option>
                <option value="Disciplinar">Disciplinar</option>
                <option value="Atendimento aos Pais">Atendimento aos Pais</option>
                <option value="Elogio / Destaque">Elogio / Destaque</option>
              </select>
            </div>

            <div className="form-group col-4">
              <label>Data</label>
              <input
                type="date"
                required
                value={form.data_ocorrencia}
                onChange={(e) => setForm({ ...form, data_ocorrencia: e.target.value })}
              />
            </div>

            <div className="form-group col-8">
              <label>Providência</label>
              <input
                type="text"
                placeholder="Encaminhamento realizado..."
                value={form.providencia}
                onChange={(e) => setForm({ ...form, providencia: e.target.value })}
              />
            </div>

            <div className="form-group col-12">
              <label>Descrição</label>
              <textarea
                rows={2}
                required
                placeholder="Descreva o registro..."
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
              />
            </div>

            <div className="form-group col-12">
              <label>Documento Anexo</label>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={salvando} style={{ width: 'auto', padding: '10px 22px' }}>
            {salvando ? 'Salvando...' : 'Salvar Ocorrência'}
          </button>
        </form>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h3>Histórico de Ocorrências • {ocorrencias.length}</h3>
        </div>

        {ocorrencias.length === 0 ? (
          <p style={{ color: '#64748b' }}>Nenhuma ocorrência registrada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {ocorrencias.map((oc) => (
              <div
                key={oc.id}
                style={{
                  padding: '14px 16px',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  background: '#fafcff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <div>
                    <strong style={{ color: 'var(--primary)' }}>{oc.alunos?.nome_completo}</strong>{' '}
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>• {oc.turmas?.nome}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="status-pill status-pendente">{oc.tipo}</span>
                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                      {oc.data_ocorrencia.split('-').reverse().join('/')}
                    </span>
                  </div>
                </div>
                <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5 }}>{oc.descricao}</p>
                {oc.providencia && (
                  <p style={{ fontSize: '0.84rem', color: '#475569', marginTop: 6 }}>
                    <strong>Providência:</strong> {oc.providencia}
                  </p>
                )}
                {oc.anexo_url && (
                  <div style={{ marginTop: 10 }}>
                    <a
                      href={oc.anexo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-sm btn-approve"
                      style={{ textDecoration: 'none', display: 'inline-block' }}
                    >
                      Ver Arquivo
                    </a>
                  </div>
                )}
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 8 }}>
                  Registrado por {oc.registrado_por_nome}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}