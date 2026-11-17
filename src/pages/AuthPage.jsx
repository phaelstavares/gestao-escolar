import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoEscola from '../assets/empf-logo.jpg'

const maskCPF = (v) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')

const maskPhone = (v) =>
  v.replace(/\D/g, '').slice(0, 11)
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d)(\d{4})$/, '$1-$2')

const maskCEP = (v) =>
  v.replace(/\D/g, '').slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2')

export default function AuthPage() {
  const [modo, setModo] = useState('login')
  const [loading, setLoading] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginSenha, setLoginSenha] = useState('')

  const [form, setForm] = useState({
    nome_completo: '',
    cpf: '',
    data_nascimento: '',
    telefone: '',
    email: '',
    cargo: 'Professor(a)',
    matricula: '',
    turno: 'Manhã',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    senha: '',
    confirmarSenha: '',
    aceiteLgpd: false,
  })

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

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginSenha,
    })

    if (error) setErro('E-mail ou senha inválidos. Verifique seus dados.')
    setLoading(false)
  }

  async function handleCadastro(e) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (form.cpf.replace(/\D/g, '').length !== 11) {
      return setErro('Por favor, informe um CPF válido com 11 dígitos.')
    }
    if (form.senha.length < 6) {
      return setErro('A senha deve ter pelo menos 6 caracteres.')
    }
    if (form.senha !== form.confirmarSenha) {
      return setErro('As senhas não coincidem.')
    }
    if (!form.aceiteLgpd) {
      return setErro('Você precisa aceitar o termo de sigilo e conformidade LGPD.')
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        data: {
          nome_completo: form.nome_completo,
          cpf: form.cpf,
          data_nascimento: form.data_nascimento,
          telefone: form.telefone,
          cargo: form.cargo,
          matricula: form.matricula,
          turno: form.turno,
          cep: form.cep,
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          uf: form.uf,
        },
      },
    })

    setLoading(false)

    if (error) {
      setErro(`Erro ao cadastrar: ${error.message}`)
    } else {
      setSucesso('Cadastro enviado! Aguarde a aprovação da Secretaria/Direção.')
      setModo('login')
    }
  }

  if (modo === 'login') {
    return (
      <div className="auth-container login-box">
        <div className="auth-header">
          <img src={logoEscola} alt="Logo E.M. Pedro Furtado" className="auth-logo" />
          <h1>Portal Escolar</h1>
          <p>E.M. Pedro Furtado • Acesso da Equipe</p>
        </div>

        {erro && <div className="alert alert-error">{erro}</div>}
        {sucesso && <div className="alert alert-success">{sucesso}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-grid">
            <div className="form-group col-12">
              <label>E-mail</label>
              <input
                type="email"
                required
                placeholder="seu.nome@escola.mg.gov.br"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
            </div>
            <div className="form-group col-12">
              <label>Senha</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginSenha}
                onChange={(e) => setLoginSenha(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="switch-mode">
          Primeiro acesso?
          <button type="button" onClick={() => { setErro(''); setSucesso(''); setModo('cadastro') }}>
            Criar cadastro de servidor
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <img src={logoEscola} alt="Logo E.M. Pedro Furtado" className="auth-logo" />
        <h1>Cadastro de Equipe Escolar</h1>
        <p>Preencha seus dados pessoais, endereço e vínculo institucional</p>
      </div>

      {erro && <div className="alert alert-error">{erro}</div>}

      <form onSubmit={handleCadastro}>
        <div className="section-title">1. Dados Pessoais</div>
        <div className="form-grid">
          <div className="form-group col-12">
            <label>Nome Completo *</label>
            <input type="text" required value={form.nome_completo}
              onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} />
          </div>
          <div className="form-group col-4">
            <label>CPF *</label>
            <input type="text" required placeholder="000.000.000-00" value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} />
          </div>
          <div className="form-group col-4">
            <label>Data de Nascimento *</label>
            <input type="date" required value={form.data_nascimento}
              onChange={(e) => setForm({ ...form, data_nascimento: e.target.value })} />
          </div>
          <div className="form-group col-4">
            <label>Telefone / WhatsApp *</label>
            <input type="text" required placeholder="(32) 99999-9999" value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} />
          </div>
        </div>

        <div className="section-title">2. Vínculo Escolar</div>
        <div className="form-grid">
          <div className="form-group col-6">
            <label>Cargo / Função *</label>
            <select value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })}>
              <option value="Professor(a)">Professor(a)</option>
              <option value="Assessor(a) Educacional">Assessor(a) Educacional</option>
              <option value="Coordenador(a) Pedagógico(a)">Coordenador(a) Pedagógico(a)</option>
              <option value="Secretário(a) Escolar">Secretário(a) Escolar</option>
              <option value="Diretor(a) / Vice-Diretor(a)">Diretor(a) / Vice-Diretor(a)</option>
              <option value="Apoio Administrativo">Apoio Administrativo</option>
            </select>
          </div>
          <div className="form-group col-3">
            <label>Turno Principal *</label>
            <select value={form.turno} onChange={(e) => setForm({ ...form, turno: e.target.value })}>
              <option value="Manhã">Manhã</option>
              <option value="Tarde">Tarde</option>
              <option value="Integral">Integral</option>
              <option value="Noite">Noite</option>
            </select>
          </div>
          <div className="form-group col-3">
            <label>Matrícula / MASP</label>
            <input type="text" placeholder="Opcional" value={form.matricula}
              onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
          </div>
        </div>

        <div className="section-title">3. Endereço Residencial</div>
        <div className="form-grid">
          <div className="form-group col-4">
            <label>CEP * {buscandoCep && '(Buscando...)'}</label>
            <input type="text" required placeholder="00000-000" value={form.cep}
              onChange={(e) => handleCepChange(e.target.value)} />
          </div>
          <div className="form-group col-8">
            <label>Logradouro (Rua / Av.) *</label>
            <input type="text" required value={form.logradouro}
              onChange={(e) => setForm({ ...form, logradouro: e.target.value })} />
          </div>
          <div className="form-group col-3">
            <label>Número *</label>
            <input type="text" required value={form.numero}
              onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          </div>
          <div className="form-group col-4">
            <label>Complemento</label>
            <input type="text" value={form.complemento}
              onChange={(e) => setForm({ ...form, complemento: e.target.value })} />
          </div>
          <div className="form-group col-5">
            <label>Bairro *</label>
            <input type="text" required value={form.bairro}
              onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
          </div>
          <div className="form-group col-9">
            <label>Cidade *</label>
            <input type="text" required value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
          </div>
          <div className="form-group col-3">
            <label>UF *</label>
            <input type="text" required maxLength={2} value={form.uf}
              onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} />
          </div>
        </div>

        <div className="section-title">4. Credenciais de Acesso</div>
        <div className="form-grid">
          <div className="form-group col-12">
            <label>E-mail para Login *</label>
            <input type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="form-group col-6">
            <label>Senha (mín. 6 caracteres) *</label>
            <input type="password" required value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          </div>
          <div className="form-group col-6">
            <label>Confirmar Senha *</label>
            <input type="password" required value={form.confirmarSenha}
              onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })} />
          </div>
        </div>

        <label className="checkbox-group">
          <input type="checkbox" checked={form.aceiteLgpd}
            onChange={(e) => setForm({ ...form, aceiteLgpd: e.target.checked })} />
          <span>
            Declaro que as informações são verdadeiras e comprometo-me a manter o sigilo dos dados pessoais de alunos e servidores conforme a LGPD.
          </span>
        </label>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Salvando cadastro...' : 'Concluir Cadastro'}
        </button>
      </form>

      <div className="switch-mode">
        Já possui cadastro?
        <button type="button" onClick={() => { setErro(''); setModo('login') }}>
          Fazer login
        </button>
      </div>
    </div>
  )
}