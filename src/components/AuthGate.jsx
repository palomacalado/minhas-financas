import { useEffect, useState } from "react";
import { neonClient, neonConfigured } from "../lib/neonClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!neonConfigured) {
      setLoading(false);
      return;
    }

    neonClient.auth.getSession()
      .then(({ data }) => {
        if (data?.session && data?.user) {
          setSession(data.session);
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!neonConfigured) {
      setError("Neon não está configurado neste ambiente.");
      return;
    }

    if (form.password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const result = isSignUp
        ? await neonClient.auth.signUp.email({
            name: form.name.trim() || form.email.split("@")[0] || "Usuário",
            email: form.email.trim(),
            password: form.password,
          })
        : await neonClient.auth.signIn.email({
            email: form.email.trim(),
            password: form.password,
          });

      if (result.error) {
        setError(result.error.message || "Não foi possível entrar.");
        return;
      }

      const current = await neonClient.auth.getSession();
      if (current.data?.session && current.data?.user) {
        setSession(current.data.session);
        setUser(current.data.user);
      } else {
        setError("Conta criada, mas a sessão não foi iniciada. Tente entrar.");
      }
    } catch (err) {
      setError(err?.message || "Erro de autenticação.");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    await neonClient.auth.signOut();
    setSession(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", display:"grid", placeItems:"center", background:"#0f0f14", color:"#f1f5f9", fontFamily:"Arial,sans-serif" }}>
        Carregando suas finanças...
      </div>
    );
  }

  if (!session || !user) {
    return (
      <div style={{ minHeight:"100vh", background:"#0f0f14", color:"#f1f5f9", display:"grid", placeItems:"center", padding:20, fontFamily:"Arial,sans-serif" }}>
        <form onSubmit={submit} style={{ width:"100%", maxWidth:380, background:"#1a1a24", padding:24, borderRadius:20 }}>
          <div style={{ marginBottom:22 }}>
            <p style={{ color:"#818cf8", fontWeight:700, fontSize:13, marginBottom:6 }}>MINHAS FINANÇAS</p>
            <h1 style={{ fontSize:27, margin:0 }}>{isSignUp ? "Criar sua conta" : "Bem-vinda de volta"}</h1>
            <p style={{ color:"#8b8b9d", fontSize:13, lineHeight:1.5, marginTop:8 }}>
              Seus dados ficam vinculados à sua conta e protegidos no banco por usuário.
            </p>
          </div>

          {isSignUp && (
            <input
              value={form.name}
              onChange={(e)=>setForm(f=>({...f,name:e.target.value}))}
              placeholder="Seu nome"
              autoComplete="name"
              style={inputStyle}
            />
          )}
          <input
            type="email"
            required
            value={form.email}
            onChange={(e)=>setForm(f=>({...f,email:e.target.value}))}
            placeholder="E-mail"
            autoComplete="email"
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e)=>setForm(f=>({...f,password:e.target.value}))}
            placeholder="Senha"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            style={inputStyle}
          />

          {error && <p style={{ color:"#f87171", fontSize:12, lineHeight:1.5, margin:"2px 0 12px" }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{ width:"100%", border:0, borderRadius:12, padding:13, background:"#6366f1", color:"#fff", fontWeight:700, cursor:"pointer", opacity:submitting?.7:1 }}
          >
            {submitting ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
          </button>

          <button
            type="button"
            onClick={()=>{setIsSignUp(v=>!v);setError("");}}
            style={{ width:"100%", border:0, background:"transparent", color:"#a5b4fc", padding:13, marginTop:6, cursor:"pointer" }}
          >
            {isSignUp ? "Já tenho conta" : "Quero criar uma conta"}
          </button>
        </form>
      </div>
    );
  }

  return children({ user, signOut });
}

const inputStyle = {
  width:"100%",
  boxSizing:"border-box",
  marginBottom:10,
  border:"1px solid #2a2a38",
  borderRadius:10,
  background:"#111118",
  color:"#f1f5f9",
  padding:"12px 13px",
  fontSize:14,
  outline:"none",
};
