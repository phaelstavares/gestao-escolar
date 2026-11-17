import { useState } from 'react'
import { supabase } from '../lib/supabase'

const maskPhone = (v) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')

const maskCEP = (v) =>
  v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')

export default function MeuPerfil({ perfil, onPerfilAtualizado }) {
  const [form, setForm] = useState({
    telefone: perfil.telefone || '',
    turno: perfil.turno || 'Manhã',
    matricula: perfil.matricula || '',
    cep: perfil.cep || '',
    logradouro: perfil.logradouro || '',
    numero: perfil.numero || '',
    complemento: perfil.complemento || '',
    bairro: perfil.bairro || '',
    cidade: perfil.cidade || '',
    uf: perfil.uf || '',
  })

  const [salvandoDados, setSalvandoDados] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [msgDados, setMsgDados] = useState('')

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [msgSenha, setMsgSenha] = useState({ tipo: '', texto: '' })

  async function handleCepChange(valor) {
    const cepFormatado = maskCEP(valor)
    setForm((prev) => ({ ...prev, cep: cepFormatado }))

    const cepLimpo = cepFormatado.replace(/\D/g, '')
    if (cepLimpo.length === 8) {
      setBuscandoCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            logradouro: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            uf: data.uf || '',
          }))
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err)
      } finally {
        setBuscandoCep(false)
      }
    }
  }

  async function handleSalvarDados(e) {
    e.preventDefault()
    setSalvandoDados(true)
    setMsgDados('')

    const { error } = await supabase
      .from('perfis')
      .update({
        telefone: form.telefone,
        turno: form.turno,
        matricula: form.matricula,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        complemento: form.complemento,
        bairro: form.bairro,
        cidade: form.cidade,
        uf: form.uf,
      })
      .eq('id', perfil.id)

    setSalvandoDados(false)

    if (error) {
      alert('Erro ao atualizar dados: ' + error.message)
    } else {
      setMsgDados('Dados cadastrais atualizados com sucesso!')
      if (onPerfilAtualizado) onPerfilAtualizado()
      setTimeout(() => setMsgDados(''), 4000)
    }
  }

  async function handleAlterarSenha(e) {
    e.preventDefault()
    setMsgSenha({ tipo: '', texto: '' })

    if (novaSenha.length < 6) {
      return setMsgSenha({ tipo: 'erro', texto: 'A nova senha deve ter no mínimo 6 caracteres.' })
    }
    if (novaSenha !== confirmarSenha) {
      return setMsgSenha({ tipo: 'erro', texto: 'As senhas não coincidem.' })
    }

    setSalvandoSenha(true)
    const { error } = await supabase.auth.updateUser({ password: novaSenha })
    setSalvandoSenha(false)

    if (error) {
      setMsgSenha({ tipo: 'erro', texto: 'Erro ao alterar senha: ' + error.message })
    } else {
      setNovaSenha('')
      setConfirmarSenha('')
      setMsgSenha({ tipo: 'sucesso', texto: 'Senha alterada com sucesso!' })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* BLOCO 1: DADOS CADASTRAIS E ENDEREÇO */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <h3>Meu Perfil Funcional</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              Mantenha seu telefone, turno e endereço atualizados na secretaria.
            </p>
          </div>
          <span className="status-pill status-ativo">{perfil.cargo}</span>
        </div>

        {msgDados && <div className="alert alert-success">{msgDados}</div>}

        <form onSubmit={handleSalvarDados}>
          <div className="form-grid">
            <div className="form-group col-6">
              <label>Nome Completo (bloqueado)</label>
              <input type="text" value={perfil.nome_completo} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
            </div>
            <div className="form-group col-3">
              <label>CPF (bloqueado)</label>
              <input type="text" value={perfil.cpf} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
            </div>
            <div className="form-group col-3">
              <label>E-mail (bloqueado)</label>
              <input type="text" value={perfil.email} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
            </div>

            <div className="form-group col-4">
              <label>Telefone / WhatsApp *</label>
              <input
                type="text"
                required
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })}
              />
            </div>
            <div className="form-group col-4">
              <label>Turno Principal *</label>
              <select value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value })}>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Integral">Integral</option>
                <option value="Noite">Noite</option>
              </select>
            </div>
            <div className="form-group col-4">
              <label>Matrícula / MASP</label>
              <input
                type="text"
                value={form.matricula}
                onChange={(e) => setForm({ ...form, matricula: e.target.value })}
              />
            </div>

            <div className="form-group col-4">
              <label>CEP * {buscandoCep && '(Buscando...)'}</label>
              <input
                type="text"
                required
                value={form.cep}
                onChange={(e) => handleCepChange(e.target.value)}
              />
            </div>
            <div className="form-group col-8">
              <label>Logradouro *</label>
              <input
                type="text"
                required
                value={form.logradouro}
                onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
              />
            </div>
            <div className="form-group col-3">
              <label>Número *</label>
              <input
                type="text"
                required
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
              />
            </div>
            <div className="form-group col-4">
              <label>Complemento</label>
              <input
                type="text"
                value={form.complemento}
                onChange={(e) => setForm({ ...form, complemento: e.target.value })}
              />
            </div>
            <div className="form-group col-5">
              <label>Bairro *</label>
              <input
                type="text"
                required
                value={form.bairro}
                onChange={(e) => setForm({ ...form, bairro: e.target.value })}
              />
            </div>
            <div className="form-group col-9">
              <label>Cidade *</label>
              <input
                type="text"
                required
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </div>
            <div className="form-group col-3">
              <label>UF *</label>
              <input
                type="text"
                required
                maxLength={2}
                value={form.uf}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={salvandoDados} style={{ width: 'auto', padding: '10px 22px' }}>
            {salvandoDados ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </section>

      {/* BLOCO 2: ALTERAR SENHA */}
      <section className="panel-card">
        <div className="panel-header" style={{ marginBottom: 14 }}>
          <h3>Alterar Senha de Acesso</h3>
        </div>

        {msgSenha.texto && (
          <div className={`alert ${msgSenha.tipo === 'erro' ? 'alert-error' : 'alert-success'}`}>
            {msgSenha.texto}
          </div>
        )}

        <form onSubmit={handleAlterarSenha} className="form-grid">
          <div className="form-group col-6">
            <label>Nova Senha (mín. 6 caracteres)</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
          </div>
          <div className="form-group col-6">
            <label>Confirmar Nova Senha</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </div>
          <div className="col-12">
            <button type="submit" className="btn-primary" disabled={salvandoSenha} style={{ marginTop: 6, width: 'auto', padding: '10px 22px' }}>
              {salvandoSenha ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}