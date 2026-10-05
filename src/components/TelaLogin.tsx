import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';

type Modo = 'entrar' | 'criar';

export function TelaLogin() {
  const entrar = useAuthStore((s) => s.entrar);
  const criarConta = useAuthStore((s) => s.criarConta);
  const recuperarSenha = useAuthStore((s) => s.recuperarSenha);
  const erro = useAuthStore((s) => s.erro);
  const limparErro = useAuthStore((s) => s.limparErro);

  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [avisoRecuperacao, setAvisoRecuperacao] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setAvisoRecuperacao(null);
    try {
      if (modo === 'entrar') {
        await entrar(email, senha);
      } else {
        await criarConta(email, senha);
      }
    } catch {
      // erro já fica guardado na store (useAuthStore.erro) e é mostrado abaixo
    } finally {
      setEnviando(false);
    }
  }

  async function esqueciSenha() {
    if (!email) {
      setAvisoRecuperacao('Digite seu e-mail acima primeiro.');
      return;
    }
    limparErro();
    setEnviando(true);
    try {
      await recuperarSenha(email);
      setAvisoRecuperacao('Enviamos um link de redefinição pro seu e-mail.');
    } catch {
      // erro já fica guardado na store
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela-login">
      <div className="tela-login-cabecalho">
        <span className="app-nome">Vizion5</span>
        <p className="tela-inicio-legenda">
          Entre pra acessar suas obras — os dados sincronizam entre seus aparelhos.
        </p>
      </div>

      <form className="form-login" onSubmit={enviar}>
        <input
          type="email"
          placeholder="E-mail"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha (mínimo 6 caracteres)"
          autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={6}
          required
        />

        {erro && <p className="login-erro">{erro}</p>}
        {avisoRecuperacao && <p className="login-aviso">{avisoRecuperacao}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>

        {modo === 'entrar' && (
          <button type="button" className="link-botao" onClick={esqueciSenha} disabled={enviando}>
            Esqueci minha senha
          </button>
        )}
      </form>

      <p className="login-alternar">
        {modo === 'entrar' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
        <button
          type="button"
          className="link-botao"
          onClick={() => {
            limparErro();
            setAvisoRecuperacao(null);
            setModo(modo === 'entrar' ? 'criar' : 'entrar');
          }}
        >
          {modo === 'entrar' ? 'Criar conta' : 'Entrar'}
        </button>
      </p>
    </div>
  );
}
