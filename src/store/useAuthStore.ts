import { create } from 'zustand';
import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthState {
  usuario: User | null;
  carregando: boolean;
  erro: string | null;

  entrar: (email: string, senha: string) => Promise<void>;
  criarConta: (email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
  limparErro: () => void;
}

function traduzirErro(codigo: string): string {
  switch (codigo) {
    case 'auth/invalid-email':
      return 'E-mail inválido.';
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos.';
    case 'auth/email-already-in-use':
      return 'Já existe uma conta com esse e-mail. Tente entrar.';
    case 'auth/weak-password':
      return 'Senha muito curta (mínimo 6 caracteres).';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    default:
      return 'Não foi possível completar. Verifique a conexão e tente de novo.';
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  onAuthStateChanged(auth, (usuario) => set({ usuario, carregando: false }));

  return {
    usuario: null,
    carregando: true,
    erro: null,

    entrar: async (email, senha) => {
      set({ erro: null });
      try {
        await signInWithEmailAndPassword(auth, email, senha);
      } catch (e) {
        set({ erro: traduzirErro((e as { code?: string }).code ?? '') });
        throw e;
      }
    },

    criarConta: async (email, senha) => {
      set({ erro: null });
      try {
        await createUserWithEmailAndPassword(auth, email, senha);
      } catch (e) {
        set({ erro: traduzirErro((e as { code?: string }).code ?? '') });
        throw e;
      }
    },

    sair: async () => {
      await signOut(auth);
    },

    recuperarSenha: async (email) => {
      set({ erro: null });
      try {
        await sendPasswordResetEmail(auth, email);
      } catch (e) {
        set({ erro: traduzirErro((e as { code?: string }).code ?? '') });
        throw e;
      }
    },

    limparErro: () => set({ erro: null }),
  };
});
