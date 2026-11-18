import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function MuralAvisos({ perfil }) {
  const [avisos, setAvisos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const [exibirForm, setExibirForm] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [categoria, setCategoria] = useState('Geral')
  const [destinatario, setDestinatario] = useState('Todos')
  const [fixado, setFixado] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState('')

  const ehAdmin =
    perfil?.cargo?.toLowerCase().includes('administrador') ||
    perfil?.cargo?.toLowerCase().includes('admin') ||
    perfil?.cargo?.toLowerCase().includes('diretor') ||
    perfil?.cargo?.toLowerCase().includes('secretári')

  useEffect(() => {
    carregarAvisos()
  }, [])

  async function carregarAvisos() {
    setCarregando(true)
    const { data, error } = await supabase
      .from('avisos_mural')
      .select('*')
      .order('fixado', { ascending: false })
      .order('data_publicacao', { ascending: false })

    if (!error) {
      setAvisos(data || [])
    }
    setCarregando(false)
  }

  function obterEstiloCategoria(cat) {
    switch (cat) {
      case 'Urgente':
        return {
          accent: '#e11d48',
          cardBg: '#fffbfb',
          badgeBg: '#ffe4e6',
          badgeColor: '#be123c',
        }
      case 'Pedagógico':
        return {
          accent: '#2563eb',
          cardBg: '#fafcff',
          badgeBg: '#dbeafe',
          badgeColor: '#1d4ed8',
        }
      case 'Secretaria':
        return {
          accent: '#d97706',
          cardBg: '#fffdf7',
          badgeBg: '#fef3c7',
          badgeColor: '#b45309',
        }
      case 'Eventos':
        return {
          accent: '#16a34a',
          cardBg: '#f9fefb',
          badgeBg: '#dcfce7',
          badgeColor: '#15803d',
        }
      default:
        return {
          accent: '#0284c7',
          cardBg: '#ffffff',
          badgeBg: '#e0f2fe',
          badgeColor: '#0369a1',
        }
    }
  }

  async function handlePublicarAviso(e) {
    e.preventDefault()
    if (!titulo.trim() || !mensagem.trim()) return

    setSalvando(true)
    const { error } = await supabase.from('avisos_mural').insert([
      {
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        categoria,
        destinatario,
        fixado,
        autor_nome: perfil?.nome_completo || 'Equipe Gestora',
        data_publicacao: new Date().toISOString().split('T')[0],
      },
    ])

    if (error) {
      alert('Erro ao publicar aviso: ' + error.message)
    } else {
      setTitulo('')
      setMensagem('')
      setCategoria('Geral')
      setDestinatario('Todos')
      setFixado(false)
      setExibirForm(false)
      setFeedback('Comunicado publicado com sucesso!')
      setTimeout(() => setFeedback(''), 4000)
      carregarAvisos()
    }
    setSalvando(false)
  }

  async function handleAlternarFixar(id, statusAtual) {
    const { error } = await supabase
      .from('avisos_mural')
      .update({ fixado: !statusAtual })
      .eq('id', id)

    if (error) {
      alert('Erro ao fixar/desfixar aviso: ' + error.message)
    } else {
      carregarAvisos()
    }
  }

  async function handleExcluirAviso(id) {
    if (!window.confirm('Deseja realmente excluir este comunicado do mural?')) return

    const { error } = await supabase.from('avisos_mural').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir aviso: ' + error.message)
    } else {
      setFeedback('Comunicado removido.')
      setTimeout(() => setFeedback(''), 3500)
      carregarAvisos()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card" style={{ borderTop: '4px solid var(--primary)' }}>
        <div className="panel-header">
          <div>
            <h3>Mural de Avisos e Comunicados</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Comunicados oficiais, prazos e orientações da Escola Municipal Pedro Furtado.
            </p>
          </div>

          {ehAdmin && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: 0, width: 'auto', padding: '10px 18px' }}
              onClick={() => setExibirForm(!exibirForm)}
            >
              {exibirForm ? 'Fechar Formulário' : '+ Novo Comunicado'}
            </button>
          )}
        </div>

        {feedback && <div className="alert alert-success" style={{ marginBottom: 16 }}>{feedback}</div>}

        {/* FORMULÁRIO DE NOVO AVISO */}
        {exibirForm && ehAdmin && (
          <form
            onSubmit={handlePublicarAviso}
            style={{
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '20px',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <h4 style={{ fontSize: '0.98rem', color: 'var(--primary-dark)', marginBottom: 2 }}>
              Novo Comunicado Oficial
            </h4>

            <div className="form-grid">
              <div className="form-group col-6">
                <label>Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reunião Pedagógica..."
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="form-group col-3">
                <label>Categoria</label>
                <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                  <option value="Geral">Geral</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Pedagógico">Pedagógico</option>
                  <option value="Secretaria">Secretaria</option>
                  <option value="Eventos">Eventos</option>
                </select>
              </div>

              <div className="form-group col-3">
                <label>Público-alvo</label>
                <select value={destinatario} onChange={(e) => setDestinatario(e.target.value)}>
                  <option value="Todos">Todos</option>
                  <option value="Professores">Professores</option>
                  <option value="Pais e Alunos">Pais e Alunos</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Conteúdo do Comunicado</label>
              <textarea
                required
                rows="3"
                placeholder="Digite a mensagem completa..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </div>

            <label className="checkbox-group" style={{ marginTop: 0 }}>
              <input
                type="checkbox"
                checked={fixado}
                onChange={(e) => setFixado(e.target.checked)}
              />
              <span>Fixar no topo do mural</span>
            </label>

            <div>
              <button
                type="submit"
                className="btn-primary"
                disabled={salvando}
                style={{ marginTop: 0, width: 'auto', padding: '10px 22px' }}
              >
                {salvando ? 'Publicando...' : 'Publicar no Mural'}
              </button>
            </div>
          </form>
        )}

        {/* LISTA DE COMUNICADOS */}
        {carregando ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
            Carregando comunicados...
          </p>
        ) : avisos.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '24px 0' }}>
            Nenhum comunicado publicado no momento.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {avisos.map((aviso) => {
              const estilo = obterEstiloCategoria(aviso.categoria)

              return (
                <article
                  key={aviso.id}
                  style={{
                    background: estilo.cardBg,
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${estilo.accent}`,
                    borderRadius: 12,
                    padding: '18px 22px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.03)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {/* CABEÇALHO DO CARD */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 12,
                      marginBottom: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {aviso.fixado && (
                        <span
                          title="Fixado no topo"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: '#f1f5f9',
                            color: estilo.accent,
                            border: '1px solid #cbd5e1',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 3H8v2h1v6l-2 2v2h4v6l1 1 1-1v-6h4v-2l-2-2V5h1V3z" />
                          </svg>
                          Fixado
                        </span>
                      )}

                      <h4 style={{ fontSize: '1.04rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {aviso.titulo}
                      </h4>
                    </div>

                    {/* BADGES E CONTROLES */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          background: estilo.badgeBg,
                          color: estilo.badgeColor,
                          fontSize: '0.74rem',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontWeight: 700,
                        }}
                      >
                        {aviso.categoria}
                      </span>

                      <span
                        style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.74rem',
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontWeight: 600,
                        }}
                      >
                        {aviso.destinatario || 'Todos'}
                      </span>

                      {ehAdmin && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                          <button
                            type="button"
                            onClick={() => handleAlternarFixar(aviso.id, aviso.fixado)}
                            title={aviso.fixado ? 'Desfixar comunicado' : 'Fixar no topo'}
                            style={{
                              background: aviso.fixado ? '#e0f2fe' : '#f8fafc',
                              color: aviso.fixado ? '#0284c7' : '#64748b',
                              border: '1px solid #cbd5e1',
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="17" x2="12" y2="22" />
                              <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExcluirAviso(aviso.id)}
                            title="Excluir comunicado"
                            style={{
                              background: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                              width: 28,
                              height: 28,
                              borderRadius: 7,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* TEXTO */}
                  <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, margin: '0 0 14px 0' }}>
                    {aviso.mensagem}
                  </p>

                  {/* RODAPÉ */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.78rem',
                      color: '#64748b',
                      borderTop: '1px solid #f1f5f9',
                      paddingTop: 10,
                    }}
                  >
                    <span>
                      Publicado por <strong style={{ color: '#334155' }}>{aviso.autor_nome || 'Secretaria Escolar'}</strong>
                    </span>
                    <span>
                      {aviso.data_publicacao
                        ? new Date(aviso.data_publicacao + 'T00:00:00').toLocaleDateString('pt-BR')
                        : 'Recente'}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}