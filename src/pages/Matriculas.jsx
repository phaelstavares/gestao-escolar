import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import logoEscola from '../assets/empf-logo.jpg'

export default function Matriculas({ perfil }) {
  const [subAba, setSubAba] = useState('nova') // 'nova' | 'transferencia' | 'declaracao' | 'historico'
  const [turmas, setTurmas] = useState([])
  const [alunos, setAlunos] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [filtroSituacao, setFiltroSituacao] = useState('todos')
  const [filtroTurma, setFiltroTurma] = useState('todas')
  const [buscaAluno, setBuscaAluno] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  // Ficha cadastral completa aberta para visualização/edição
  const [alunoFicha, setAlunoFicha] = useState(null)
  const [salvandoFicha, setSalvandoFicha] = useState(false)

  // Formulário de Nova Matrícula
  const [formMatricula, setFormMatricula] = useState({
    numero_matricula: `2026${Math.floor(10000 + Math.random() * 90000)}`,
    nome_completo: '',
    data_nascimento: '',
    cpf_aluno: '',
    nis: '',
    turma_id: '',
    tipo_ingresso: 'Matrícula Inicial',
    escola_origem: '',
    responsavel_nome: '',
    responsavel_telefone: '',
    endereco: '',
    alergias_saude: '',
    necessidades_especiais: '',
    data_matricula: new Date().toISOString().split('T')[0],
  })

  // Formulário de Transferência / Movimentação
  const [formMov, setFormMov] = useState({
    aluno_id: '',
    tipo_movimentacao: 'Transferência Interna',
    nova_turma_id: '',
    escola_relacionada: '',
    motivo: '',
    data_movimentacao: new Date().toISOString().split('T')[0],
  })

  // Documento Oficial (Declaração)
  const [docAlunoId, setDocAlunoId] = useState('')
  const [tipoDeclaracao, setTipoDeclaracao] = useState('matricula')

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    const [{ data: listaTurmas }, { data: listaAlunos }, { data: listaMovs }] = await Promise.all([
      supabase.from('turmas').select('*').order('nome'),
      supabase.from('alunos').select('*, turmas(id, nome, turno)').order('nome_completo'),
      supabase.from('movimentacoes_matricula').select('*').order('criado_em', { ascending: false }),
    ])

    const turmasDisp = listaTurmas || []
    const alunosDisp = listaAlunos || []

    setTurmas(turmasDisp)
    setAlunos(alunosDisp)
    setMovimentacoes(listaMovs || [])

    if (turmasDisp.length > 0) {
      setFormMatricula((prev) => ({ ...prev, turma_id: prev.turma_id || turmasDisp[0].id }))
      setFormMov((prev) => ({ ...prev, nova_turma_id: prev.nova_turma_id || turmasDisp[0].id }))
    }

    if (alunosDisp.length > 0) {
      setFormMov((prev) => ({ ...prev, aluno_id: prev.aluno_id || alunosDisp[0].id }))
      setDocAlunoId((prev) => prev || alunosDisp[0].id)
    }
  }

  function exibirAviso(texto) {
    setMensagem(texto)
    setTimeout(() => setMensagem(''), 4500)
  }

  async function handleNovaMatricula(e) {
    e.preventDefault()
    if (!formMatricula.nome_completo.trim() || !formMatricula.turma_id) return

    setSalvando(true)
    const turmaEscolhida = turmas.find((t) => t.id === formMatricula.turma_id)

    const { data: novoAluno, error } = await supabase
      .from('alunos')
      .insert([
        {
          numero_matricula: formMatricula.numero_matricula,
          nome_completo: formMatricula.nome_completo.trim(),
          data_nascimento: formMatricula.data_nascimento || null,
          cpf_aluno: formMatricula.cpf_aluno || null,
          nis: formMatricula.nis || null,
          turma_id: formMatricula.turma_id,
          tipo_ingresso: formMatricula.tipo_ingresso,
          escola_origem: formMatricula.escola_origem || null,
          responsavel_nome: formMatricula.responsavel_nome,
          responsavel_telefone: formMatricula.responsavel_telefone,
          endereco: formMatricula.endereco || null,
          alergias_saude: formMatricula.alergias_saude || null,
          necessidades_especiais: formMatricula.necessidades_especiais || null,
          situacao: 'Ativo',
          data_matricula: formMatricula.data_matricula,
        },
      ])
      .select()
      .single()

    if (error) {
      alert('Erro ao realizar matrícula: ' + error.message)
      setSalvando(false)
      return
    }

    await supabase.from('movimentacoes_matricula').insert([
      {
        aluno_id: novoAluno.id,
        aluno_nome: novoAluno.nome_completo,
        tipo_movimentacao: formMatricula.tipo_ingresso,
        turma_destino: turmaEscolhida ? `${turmaEscolhida.nome} • ${turmaEscolhida.turno}` : null,
        escola_relacionada: formMatricula.escola_origem || null,
        motivo: 'Efetivação de matrícula na secretaria',
        data_movimentacao: formMatricula.data_matricula,
        registrado_por: perfil.nome_completo,
      },
    ])

    setSalvando(false)
    setFormMatricula({
      numero_matricula: `2026${Math.floor(10000 + Math.random() * 90000)}`,
      nome_completo: '',
      data_nascimento: '',
      cpf_aluno: '',
      nis: '',
      turma_id: formMatricula.turma_id,
      tipo_ingresso: 'Matrícula Inicial',
      escola_origem: '',
      responsavel_nome: '',
      responsavel_telefone: '',
      endereco: '',
      alergias_saude: '',
      necessidades_especiais: '',
      data_matricula: new Date().toISOString().split('T')[0],
    })
    carregarDados()
    exibirAviso('Matrícula efetivada e registrada no histórico!')
  }

  async function handleSalvarFichaCompleta(e) {
    e.preventDefault()
    if (!alunoFicha) return

    setSalvandoFicha(true)
    const { error } = await supabase
      .from('alunos')
      .update({
        numero_matricula: alunoFicha.numero_matricula || null,
        nome_completo: alunoFicha.nome_completo.trim(),
        data_nascimento: alunoFicha.data_nascimento || null,
        cpf_aluno: alunoFicha.cpf_aluno || null,
        nis: alunoFicha.nis || null,
        tipo_ingresso: alunoFicha.tipo_ingresso || 'Matrícula Inicial',
        escola_origem: alunoFicha.escola_origem || null,
        escola_destino: alunoFicha.escola_destino || null,
        responsavel_nome: alunoFicha.responsavel_nome || null,
        responsavel_telefone: alunoFicha.responsavel_telefone || null,
        endereco: alunoFicha.endereco || null,
        alergias_saude: alunoFicha.alergias_saude || null,
        necessidades_especiais: alunoFicha.necessidades_especiais || null,
        data_matricula: alunoFicha.data_matricula || null,
      })
      .eq('id', alunoFicha.id)

    setSalvandoFicha(false)

    if (error) {
      alert('Erro ao atualizar ficha do aluno: ' + error.message)
    } else {
      setAlunoFicha(null)
      carregarDados()
      exibirAviso('Ficha cadastral do aluno atualizada com sucesso!')
    }
  }

  async function handleExecutarMovimentacao(e) {
    e.preventDefault()
    const alunoSelecionado = alunos.find((a) => a.id === formMov.aluno_id)
    if (!alunoSelecionado) return

    setSalvando(true)
    const turmaAtualTexto = alunoSelecionado.turmas
      ? `${alunoSelecionado.turmas.nome} • ${alunoSelecionado.turmas.turno}`
      : 'Sem turma'

    let updatePayload = {}
    let turmaDestinoTexto = null

    if (formMov.tipo_movimentacao === 'Transferência Interna' || formMov.tipo_movimentacao === 'Rematrícula') {
      const novaTurma = turmas.find((t) => t.id === formMov.nova_turma_id)
      turmaDestinoTexto = novaTurma ? `${novaTurma.nome} • ${novaTurma.turno}` : null

      updatePayload = {
        turma_id: formMov.nova_turma_id,
        situacao: 'Ativo',
        data_saida: null,
      }

      await Promise.all([
        supabase.from('notas').update({ turma_id: formMov.nova_turma_id }).eq('aluno_id', alunoSelecionado.id),
        supabase.from('frequencias').update({ turma_id: formMov.nova_turma_id }).eq('aluno_id', alunoSelecionado.id),
      ])
    } else if (formMov.tipo_movimentacao === 'Transferência Externa') {
      updatePayload = {
        situacao: 'Transferido',
        escola_destino: formMov.escola_relacionada || 'Não informada',
        data_saida: formMov.data_movimentacao,
      }
    } else if (formMov.tipo_movimentacao === 'Cancelamento / Desistência') {
      updatePayload = {
        situacao: 'Cancelado',
        data_saida: formMov.data_movimentacao,
      }
    }

    const { error } = await supabase
      .from('alunos')
      .update(updatePayload)
      .eq('id', alunoSelecionado.id)

    if (error) {
      alert('Erro ao registrar movimentação: ' + error.message)
      setSalvando(false)
      return
    }

    await supabase.from('movimentacoes_matricula').insert([
      {
        aluno_id: alunoSelecionado.id,
        aluno_nome: alunoSelecionado.nome_completo,
        tipo_movimentacao: formMov.tipo_movimentacao,
        turma_origem: turmaAtualTexto,
        turma_destino: turmaDestinoTexto,
        escola_relacionada: formMov.escola_relacionada || null,
        motivo: formMov.motivo || null,
        data_movimentacao: formMov.data_movimentacao,
        registrado_por: perfil.nome_completo,
      },
    ])

    setSalvando(false)
    setFormMov((prev) => ({ ...prev, escola_relacionada: '', motivo: '' }))
    carregarDados()
    exibirAviso(`${formMov.tipo_movimentacao} concluída com sucesso!`)
  }

  const alunosFiltrados = alunos.filter((a) => {
    const bateSituacao = filtroSituacao === 'todos' ? true : (a.situacao || 'Ativo') === filtroSituacao
    const bateTurma = filtroTurma === 'todas' ? true : a.turma_id === filtroTurma
    const bateBusca =
      a.nome_completo.toLowerCase().includes(buscaAluno.toLowerCase()) ||
      (a.numero_matricula || '').includes(buscaAluno) ||
      (a.cpf_aluno || '').includes(buscaAluno)
    return bateSituacao && bateTurma && bateBusca
  })

  const alunoDoc = alunos.find((a) => a.id === docAlunoId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <section className="panel-card printable-area">
        <div className="panel-header">
          <div>
            <h3>Secretaria • Matrículas e Transferências</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Gestão de matrículas, rematrículas, transferências e declarações oficiais.
            </p>
          </div>
          {subAba === 'declaracao' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary no-print"
              style={{ marginTop: 0, width: 'auto', padding: '10px 18px' }}
            >
              Imprimir Declaração
            </button>
          )}
        </div>

        <div className="filter-tabs no-print" style={{ marginBottom: 20 }}>
          <button
            type="button"
            className={`tab-btn ${subAba === 'nova' ? 'active' : ''}`}
            onClick={() => setSubAba('nova')}
          >
            1. Nova Matrícula
          </button>
          <button
            type="button"
            className={`tab-btn ${subAba === 'transferencia' ? 'active' : ''}`}
            onClick={() => setSubAba('transferencia')}
          >
            2. Transferências e Situação
          </button>
          <button
            type="button"
            className={`tab-btn ${subAba === 'declaracao' ? 'active' : ''}`}
            onClick={() => setSubAba('declaracao')}
          >
            3. Declaração Oficial
          </button>
          <button
            type="button"
            className={`tab-btn ${subAba === 'historico' ? 'active' : ''}`}
            onClick={() => setSubAba('historico')}
          >
            4. Histórico de Movimentações
          </button>
        </div>

        {mensagem && <div className="alert alert-success no-print">{mensagem}</div>}

        {/* SUB-ABA 1: NOVA MATRÍCULA */}
        {subAba === 'nova' && (
          <form onSubmit={handleNovaMatricula}>
            <div className="form-grid">
              <div className="form-group col-3">
                <label>Nº Matrícula</label>
                <input
                  type="text"
                  required
                  value={formMatricula.numero_matricula}
                  onChange={(e) => setFormMatricula({ ...formMatricula, numero_matricula: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Nome Completo do Aluno</label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo..."
                  value={formMatricula.nome_completo}
                  onChange={(e) => setFormMatricula({ ...formMatricula, nome_completo: e.target.value })}
                />
              </div>

              <div className="form-group col-3">
                <label>Data de Nascimento</label>
                <input
                  type="date"
                  required
                  value={formMatricula.data_nascimento}
                  onChange={(e) => setFormMatricula({ ...formMatricula, data_nascimento: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>Turma de Destino</label>
                <select
                  required
                  value={formMatricula.turma_id}
                  onChange={(e) => setFormMatricula({ ...formMatricula, turma_id: e.target.value })}
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} • {t.turno}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group col-4">
                <label>Tipo de Ingresso</label>
                <select
                  value={formMatricula.tipo_ingresso}
                  onChange={(e) => setFormMatricula({ ...formMatricula, tipo_ingresso: e.target.value })}
                >
                  <option value="Matrícula Inicial">Matrícula Inicial</option>
                  <option value="Transferência Recebida">Transferência Recebida</option>
                  <option value="Rematrícula">Rematrícula</option>
                </select>
              </div>

              <div className="form-group col-4">
                <label>Data da Matrícula</label>
                <input
                  type="date"
                  required
                  value={formMatricula.data_matricula}
                  onChange={(e) => setFormMatricula({ ...formMatricula, data_matricula: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>CPF do Aluno</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={formMatricula.cpf_aluno}
                  onChange={(e) => setFormMatricula({ ...formMatricula, cpf_aluno: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>NIS / Bolsa Família</label>
                <input
                  type="text"
                  placeholder="Número do NIS"
                  value={formMatricula.nis}
                  onChange={(e) => setFormMatricula({ ...formMatricula, nis: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>Escola de Origem</label>
                <input
                  type="text"
                  placeholder="Se veio transferido..."
                  value={formMatricula.escola_origem}
                  onChange={(e) => setFormMatricula({ ...formMatricula, escola_origem: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Responsável Legal</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do pai, mãe ou responsável"
                  value={formMatricula.responsavel_nome}
                  onChange={(e) => setFormMatricula({ ...formMatricula, responsavel_nome: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Telefone / WhatsApp</label>
                <input
                  type="text"
                  required
                  placeholder="(32) 99999-0000"
                  value={formMatricula.responsavel_telefone}
                  onChange={(e) => setFormMatricula({ ...formMatricula, responsavel_telefone: e.target.value })}
                />
              </div>

              <div className="form-group col-12">
                <label>Endereço Residencial</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro, cidade..."
                  value={formMatricula.endereco}
                  onChange={(e) => setFormMatricula({ ...formMatricula, endereco: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Alergias / Observações de Saúde</label>
                <input
                  type="text"
                  placeholder="Ex: Intolerância à lactose, asma..."
                  value={formMatricula.alergias_saude}
                  onChange={(e) => setFormMatricula({ ...formMatricula, alergias_saude: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Atendimento Educacional Especializado</label>
                <input
                  type="text"
                  placeholder="Laudo, acompanhamento ou necessidade..."
                  value={formMatricula.necessidades_especiais}
                  onChange={(e) => setFormMatricula({ ...formMatricula, necessidades_especiais: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={salvando} style={{ width: 'auto', padding: '11px 24px' }}>
              {salvando ? 'Efetivando...' : 'Efetivar Matrícula'}
            </button>
          </form>
        )}

        {/* SUB-ABA 2: TRANSFERÊNCIAS E MOVIMENTAÇÕES */}
        {subAba === 'transferencia' && (
          <form onSubmit={handleExecutarMovimentacao}>
            <div className="form-grid">
              <div className="form-group col-6">
                <label>Aluno</label>
                <select
                  required
                  value={formMov.aluno_id}
                  onChange={(e) => setFormMov({ ...formMov, aluno_id: e.target.value })}
                >
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.numero_matricula ? `[${a.numero_matricula}] ` : ''}
                      {a.nome_completo} • {a.turmas?.nome || 'Sem turma'} ({a.situacao || 'Ativo'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group col-6">
                <label>Tipo de Movimentação</label>
                <select
                  value={formMov.tipo_movimentacao}
                  onChange={(e) => setFormMov({ ...formMov, tipo_movimentacao: e.target.value })}
                >
                  <option value="Transferência Interna">Transferência Interna • Troca de Turma/Turno</option>
                  <option value="Transferência Externa">Transferência Externa • Saída para Outra Escola</option>
                  <option value="Rematrícula">Rematrícula / Reativação</option>
                  <option value="Cancelamento / Desistência">Cancelamento / Desistência</option>
                </select>
              </div>

              {(formMov.tipo_movimentacao === 'Transferência Interna' || formMov.tipo_movimentacao === 'Rematrícula') && (
                <div className="form-group col-6">
                  <label>Nova Turma de Destino</label>
                  <select
                    required
                    value={formMov.nova_turma_id}
                    onChange={(e) => setFormMov({ ...formMov, nova_turma_id: e.target.value })}
                  >
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} • {t.turno}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formMov.tipo_movimentacao === 'Transferência Externa' && (
                <div className="form-group col-6">
                  <label>Escola de Destino</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome da escola para onde o aluno vai..."
                    value={formMov.escola_relacionada}
                    onChange={(e) => setFormMov({ ...formMov, escola_relacionada: e.target.value })}
                  />
                </div>
              )}

              <div className="form-group col-6">
                <label>Data da Movimentação</label>
                <input
                  type="date"
                  required
                  value={formMov.data_movimentacao}
                  onChange={(e) => setFormMov({ ...formMov, data_movimentacao: e.target.value })}
                />
              </div>

              <div className="form-group col-12">
                <label>Motivo / Observação da Secretaria</label>
                <input
                  type="text"
                  placeholder="Ex: Solicitação do responsável, mudança de endereço..."
                  value={formMov.motivo}
                  onChange={(e) => setFormMov({ ...formMov, motivo: e.target.value })}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={salvando} style={{ width: 'auto', padding: '11px 24px' }}>
              {salvando ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </form>
        )}

        {/* SUB-ABA 3: DECLARAÇÃO OFICIAL */}
        {subAba === 'declaracao' && (
          <div>
            <div className="form-grid no-print" style={{ marginBottom: 24 }}>
              <div className="form-group col-6">
                <label>Aluno</label>
                <select value={docAlunoId} onChange={(e) => setDocAlunoId(e.target.value)}>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome_completo} • {a.turmas?.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group col-6">
                <label>Modelo de Documento</label>
                <select value={tipoDeclaracao} onChange={(e) => setTipoDeclaracao(e.target.value)}>
                  <option value="matricula">Declaração de Matrícula e Frequência</option>
                  <option value="transferencia">Declaração de Transferência</option>
                </select>
              </div>
            </div>

            {alunoDoc && (
              <div
                style={{
                  padding: '32px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  background: '#fff',
                  lineHeight: 1.8,
                }}
              >
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <img
                    src={logoEscola}
                    alt="Logo E.M. Pedro Furtado"
                    style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 8 }}
                  />
                  <h3 style={{ color: 'var(--primary)', margin: 0 }}>
                    ESCOLA MUNICIPAL PEDRO FURTADO
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Secretaria Municipal de Educação • Itamarati de Minas - MG
                  </div>
                </div>

                <h2 style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: 28, textTransform: 'uppercase' }}>
                  {tipoDeclaracao === 'matricula'
                    ? 'Declaração de Matrícula'
                    : 'Declaração de Transferência'}
                </h2>

                {tipoDeclaracao === 'matricula' ? (
                  <p style={{ textAlign: 'justify', fontSize: '1rem', color: '#1e293b' }}>
                    Declaramos para os devidos fins que o(a) aluno(a){' '}
                    <strong>{alunoDoc.nome_completo}</strong>, registrado(a) sob a matrícula nº{' '}
                    <strong>{alunoDoc.numero_matricula || '20260000'}</strong>, nascido(a) em{' '}
                    <strong>
                      {alunoDoc.data_nascimento
                        ? alunoDoc.data_nascimento.split('-').reverse().join('/')
                        : '__/__/____'}
                    </strong>
                    , filho(a) / sob responsabilidade de{' '}
                    <strong>{alunoDoc.responsavel_nome}</strong>, encontra-se regularmente
                    matriculado(a) e frequente nesta unidade escolar no ano letivo de{' '}
                    <strong>2026</strong>, cursando o{' '}
                    <strong>{alunoDoc.turmas?.nome}</strong> no turno{' '}
                    <strong>{alunoDoc.turmas?.turno}</strong> do Ensino Fundamental I.
                  </p>
                ) : (
                  <p style={{ textAlign: 'justify', fontSize: '1rem', color: '#1e293b' }}>
                    Declaramos para os devidos fins que o(a) aluno(a){' '}
                    <strong>{alunoDoc.nome_completo}</strong>, matrícula nº{' '}
                    <strong>{alunoDoc.numero_matricula || '20260000'}</strong>, sob responsabilidade de{' '}
                    <strong>{alunoDoc.responsavel_nome}</strong>, cursou nesta instituição de ensino o{' '}
                    <strong>{alunoDoc.turmas?.nome}</strong> no ano letivo de <strong>2026</strong>,
                    tendo sido deferido o seu pedido de <strong>Transferência</strong> nesta data
                    {alunoDoc.escola_destino ? ` para a instituição ${alunoDoc.escola_destino}` : ''},
                    estando apto(a) a prosseguir seus estudos. O Histórico Escolar oficial será
                    expedido no prazo regulamentar.
                  </p>
                )}

                <p style={{ textAlign: 'right', marginTop: 36, fontSize: '0.95rem' }}>
                  Itamarati de Minas - MG, {new Date().toLocaleDateString('pt-BR')}.
                </p>

                <div style={{ marginTop: 60, textAlign: 'center', fontSize: '0.9rem' }}>
                  <div>__________________________________________________________</div>
                  <strong>Secretaria Escolar / Direção</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>E.M. Pedro Furtado</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SUB-ABA 4: HISTÓRICO DE MOVIMENTAÇÕES */}
        {subAba === 'historico' && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Aluno</th>
                  <th>Movimentação</th>
                  <th>Origem / Destino</th>
                  <th>Motivo</th>
                  <th>Responsável</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: '#64748b' }}>
                      Nenhuma movimentação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  movimentacoes.map((m) => (
                    <tr key={m.id}>
                      <td><strong>{m.data_movimentacao?.split('-').reverse().join('/')}</strong></td>
                      <td><strong>{m.aluno_nome}</strong></td>
                      <td>
                        <span className="status-pill status-pendente">{m.tipo_movimentacao}</span>
                      </td>
                      <td style={{ fontSize: '0.84rem' }}>
                        {m.turma_origem && <div>De: {m.turma_origem}</div>}
                        {m.turma_destino && <div>Para: {m.turma_destino}</div>}
                        {m.escola_relacionada && <div>Escola: {m.escola_relacionada}</div>}
                      </td>
                      <td>{m.motivo || '-'}</td>
                      <td style={{ fontSize: '0.82rem', color: '#64748b' }}>{m.registrado_por}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* PAINEL DE VISUALIZAÇÃO E EDIÇÃO COMPLETA DA FICHA DE MATRÍCULA DO ALUNO */}
      {alunoFicha && (
        <section className="panel-card no-print" style={{ border: '2px solid var(--primary)' }}>
          <div className="panel-header">
            <div>
              <h3>Ficha Cadastral de Matrícula • {alunoFicha.nome_completo}</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                Visualize ou edite todos os dados pessoais, de saúde e matrícula do aluno.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAlunoFicha(null)}
              className="btn-sm btn-pending"
            >
              Fechar Ficha
            </button>
          </div>

          <form onSubmit={handleSalvarFichaCompleta}>
            <div className="form-grid">
              <div className="form-group col-3">
                <label>Nº Matrícula</label>
                <input
                  type="text"
                  value={alunoFicha.numero_matricula || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, numero_matricula: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Nome Completo do Aluno</label>
                <input
                  type="text"
                  required
                  value={alunoFicha.nome_completo || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, nome_completo: e.target.value })}
                />
              </div>

              <div className="form-group col-3">
                <label>Data de Nascimento</label>
                <input
                  type="date"
                  value={alunoFicha.data_nascimento || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, data_nascimento: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>Turma Atual</label>
                <input
                  type="text"
                  disabled
                  value={alunoFicha.turmas ? `${alunoFicha.turmas.nome} • ${alunoFicha.turmas.turno}` : 'Sem turma'}
                  style={{ background: '#f1f5f9', color: '#475569' }}
                />
              </div>

              <div className="form-group col-4">
                <label>Tipo de Ingresso</label>
                <select
                  value={alunoFicha.tipo_ingresso || 'Matrícula Inicial'}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, tipo_ingresso: e.target.value })}
                >
                  <option value="Matrícula Inicial">Matrícula Inicial</option>
                  <option value="Transferência Recebida">Transferência Recebida</option>
                  <option value="Rematrícula">Rematrícula</option>
                </select>
              </div>

              <div className="form-group col-4">
                <label>Data da Matrícula</label>
                <input
                  type="date"
                  value={alunoFicha.data_matricula || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, data_matricula: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>CPF do Aluno</label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={alunoFicha.cpf_aluno || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, cpf_aluno: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>NIS / Bolsa Família</label>
                <input
                  type="text"
                  placeholder="Número do NIS"
                  value={alunoFicha.nis || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, nis: e.target.value })}
                />
              </div>

              <div className="form-group col-4">
                <label>Situação Cadastral</label>
                <input
                  type="text"
                  disabled
                  value={alunoFicha.situacao || 'Ativo'}
                  style={{ background: '#f1f5f9', color: '#475569' }}
                />
              </div>

              <div className="form-group col-6">
                <label>Escola de Origem</label>
                <input
                  type="text"
                  placeholder="Não informada"
                  value={alunoFicha.escola_origem || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, escola_origem: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Escola de Destino (se transferido)</label>
                <input
                  type="text"
                  placeholder="Não informada"
                  value={alunoFicha.escola_destino || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, escola_destino: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Responsável Legal</label>
                <input
                  type="text"
                  value={alunoFicha.responsavel_nome || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, responsavel_nome: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={alunoFicha.responsavel_telefone || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, responsavel_telefone: e.target.value })}
                />
              </div>

              <div className="form-group col-12">
                <label>Endereço Residencial</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro, cidade..."
                  value={alunoFicha.endereco || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, endereco: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Alergias / Observações de Saúde</label>
                <input
                  type="text"
                  placeholder="Nenhuma registrada"
                  value={alunoFicha.alergias_saude || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, alergias_saude: e.target.value })}
                />
              </div>

              <div className="form-group col-6">
                <label>Atendimento Educacional Especializado</label>
                <input
                  type="text"
                  placeholder="Nenhum registrado"
                  value={alunoFicha.necessidades_especiais || ''}
                  onChange={(e) => setAlunoFicha({ ...alunoFicha, necessidades_especiais: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={salvandoFicha}
                style={{ width: 'auto', padding: '10px 22px' }}
              >
                {salvandoFicha ? 'Salvando...' : 'Salvar Alterações da Ficha'}
              </button>
              <button
                type="button"
                onClick={() => setAlunoFicha(null)}
                className="btn-outline"
                style={{ width: 'auto', padding: '10px 18px' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </section>
      )}

      {/* QUADRO GERAL DE MATRÍCULAS */}
      <section className="panel-card no-print">
        <div className="panel-header">
          <div>
            <h3>Quadro Geral de Matrículas • {alunosFiltrados.length}</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Clique em "Ver / Editar Ficha" para consultar todos os dados cadastrais do aluno.
            </p>
          </div>
        </div>

        <div className="form-grid" style={{ marginBottom: 16 }}>
          <div className="form-group col-4">
            <label>Buscar por Nome, Matrícula ou CPF</label>
            <input
              type="text"
              placeholder="Digite para filtrar..."
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
            />
          </div>

          <div className="form-group col-4">
            <label>Turma</label>
            <select value={filtroTurma} onChange={(e) => setFiltroTurma(e.target.value)}>
              <option value="todas">Todas as Turmas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} • {t.turno}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group col-4">
            <label>Situação</label>
            <select value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}>
              <option value="todos">Todas as Situações</option>
              <option value="Ativo">Ativo</option>
              <option value="Transferido">Transferido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Aluno</th>
                <th>Turma</th>
                <th>Responsável</th>
                <th>Situação</th>
                <th>Ficha Completa</th>
              </tr>
            </thead>
            <tbody>
              {alunosFiltrados.map((a) => (
                <tr key={a.id}>
                  <td><strong>{a.numero_matricula || '-'}</strong></td>
                  <td>{a.nome_completo}</td>
                  <td>{a.turmas?.nome} • {a.turmas?.turno}</td>
                  <td>{a.responsavel_nome}</td>
                  <td>
                    <span
                      className={`status-pill ${
                        (a.situacao || 'Ativo') === 'Ativo'
                          ? 'status-ativo'
                          : 'status-bloqueado'
                      }`}
                    >
                      {a.situacao || 'Ativo'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => {
                        setAlunoFicha(a)
                        window.scrollTo({ top: 380, behavior: 'smooth' })
                      }}
                      className="btn-sm btn-pending"
                    >
                      Ver / Editar Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}