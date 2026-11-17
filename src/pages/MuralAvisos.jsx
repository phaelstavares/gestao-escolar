import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function MuralAvisos({ perfil }) {
  const [avisos, setAvisos] = useState([])
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [categoria, setCategoria] = useState('Geral')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    carregarAvisos()
  }, [])

  async function carregarAvisos() {
    const { data } = await supabase
      .from('avisos')
      .select('*')
      .order('criado_em', { ascending: false })
    if (data) setAvisos(data)
  }

  async function handlePublicar(e) {
    e.preventDefault()
    setEnviando(true)
    const { error } = await supabase.from('avisos').insert([
      {
        titulo,
        mensagem,
        categoria,
        autor_id: perfil.id,
        autor_nome: `${perfil.nome_completo} (${perfil.cargo})`,
      },
    ])
    setEnviando(false)

    if (!error) {
      setTitulo('')
      setMensagem('')
      carregarAvisos()
    } else {
      alert('Erro ao publicar aviso: ' + error.message)
    }
  }

  async function handleExcluir(id) {
    await supabase.from('avisos').delete().eq('id', id)
    carregarAvisos()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card">
        <div className="panel-header" style={{ marginBottom: 14 }}>
          <h3>Publicar Novo Aviso</h3>
        </div>
        <form onSubmit={handlePublicar} className="form-grid">
          <div className="form-group col-8">
            <label>Título do Comunicado *</label>
            <input
              type="text"
              required
              placeholder="Ex: Reunião Pedagógica na sexta-feira"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="form-group col-4">
            <label>Categoria</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              <option value="Geral">Geral</option>
              <option value="Pedagógico">Pedagógico</option>
              <option value="Evento">Evento</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>
          <div className="form-group col-12">
            <label>Mensagem *</label>
            <textarea
              required
              rows="3"
              placeholder="Escreva os detalhes do comunicado para a equipe..."
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                fontFamily: 'inherit',
                fontSize: '0.95rem',
              }}
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn-primary" disabled={enviando} style={{ marginTop: 6, width: 'auto', padding: '10px 20px' }}>
              {enviando ? 'Publicando...' : 'Publicar no Mural'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h3>Comunicados Publicados ({avisos.length})</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {avisos.length === 0 ? (
            <p style={{ color: '#64748b' }}>Nenhum comunicado no mural ainda.</p>
          ) : (
            avisos.map((aviso) => (
              <div key={aviso.id} className="aviso-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontSize: '1rem' }}>{aviso.titulo}</strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`status-pill ${aviso.categoria === 'Urgente' ? 'status-bloqueado' : 'status-ativo'}`}>
                      {aviso.categoria}
                    </span>
                    {aviso.autor_id === perfil.id && (
                      <button onClick={() => handleExcluir(aviso.id)} className="btn-sm btn-pending">
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>{aviso.mensagem}</p>
                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8, display: 'block' }}>
                  Por {aviso.autor_nome} • {new Date(aviso.criado_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}