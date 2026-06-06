/**
 * SEXTA FEIRA STUDIES — js/script.js
 * Firebase Modular | Realtime Database | ImgBB
 */

// ─────────────────────────────────────────────
// IMPORTS FIREBASE
// ─────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  update,
  remove,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ─────────────────────────────────────────────
// CONFIGURAÇÃO
// ─────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC9Lcx3mYGYXavUi_b9c_tRbS3Otm9JQNk",
  authDomain: "sexta-feira-studies.firebaseapp.com",
  databaseURL: "https://sexta-feira-studies-default-rtdb.firebaseio.com",
  projectId: "sexta-feira-studies",
  storageBucket: "sexta-feira-studies.firebasestorage.app",
  messagingSenderId: "673251857052",
  appId: "1:673251857052:web:0ef6929ea93123f7a91359",
  measurementId: "G-0ZG2PM61XT"
};

const IMGBB_API_KEY = "86427cccd2a94fb42a0754ffd7f19e79";

// ─────────────────────────────────────────────
// INIT FIREBASE
// ─────────────────────────────────────────────
const app      = initializeApp(FIREBASE_CONFIG);
const auth     = getAuth(app);
const db       = getDatabase(app);
const provider = new GoogleAuthProvider();

// ─────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────
let usuarioAtual     = null;  // dados Firebase Auth
let perfilAtual      = null;  // dados do banco
let postImagemBase64 = null;
let capaModuloBase64 = null;
let postIdAtual      = null;  // post aberto no modal comentários
let materiaFiltro    = "";
let feedListener     = null;
let questaoCount     = 0;
let abaCurrent       = "home";

// Fases estáticas da trilha (admin pode adicionar mais via banco)
const FASES_BASE = [
  { id:"f01", emoji:"🌱", titulo:"Início da Jornada",     materia:"Geral",         xpReq:0,   xpPremio:30,  dif:1 },
  { id:"f02", emoji:"📐", titulo:"Números e Operações",   materia:"Matemática",    xpReq:30,  xpPremio:35,  dif:1 },
  { id:"f03", emoji:"📚", titulo:"Leitura e Escrita",     materia:"Português",     xpReq:65,  xpPremio:35,  dif:1 },
  { id:"f04", emoji:"🌍", titulo:"Explorando o Mundo",    materia:"Geografia",     xpReq:100, xpPremio:40,  dif:2 },
  { id:"f05", emoji:"🏛️", titulo:"Raízes da Civilização", materia:"História",      xpReq:140, xpPremio:40,  dif:2 },
  { id:"f06", emoji:"🔬", titulo:"Ciências da Vida",      materia:"Ciências",      xpReq:180, xpPremio:45,  dif:2 },
  { id:"f07", emoji:"🧬", titulo:"DNA e Evolução",        materia:"Biologia",      xpReq:225, xpPremio:50,  dif:3 },
  { id:"f08", emoji:"⚛️", titulo:"Leis da Física",        materia:"Física",        xpReq:275, xpPremio:50,  dif:3 },
  { id:"f09", emoji:"🧪", titulo:"Reações Químicas",      materia:"Química",       xpReq:325, xpPremio:55,  dif:3 },
  { id:"f10", emoji:"🇬🇧", titulo:"English Journey",       materia:"Inglês",        xpReq:380, xpPremio:55,  dif:3 },
  { id:"f11", emoji:"🤔", titulo:"Pensamento Crítico",    materia:"Filosofia",     xpReq:435, xpPremio:60,  dif:4 },
  { id:"f12", emoji:"💻", titulo:"Código e Algoritmos",   materia:"Programação",   xpReq:495, xpPremio:65,  dif:4 },
  { id:"f13", emoji:"💼", titulo:"Mundo dos Negócios",    materia:"Empreend.",     xpReq:560, xpPremio:70,  dif:4 },
  { id:"f14", emoji:"🏆", titulo:"Mestre do Saber",       materia:"Geral",         xpReq:640, xpPremio:120, dif:5 },
];

// Posições na trilha (zigue-zague)
const POSICOES = ["centro","esquerda","centro","direita","centro","esquerda","centro","direita","centro","esquerda","centro","direita","centro","centro"];

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

/** Escapa HTML para evitar XSS */
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Formata timestamp para exibição relativa */
function formatarTempo(ts) {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)   return "agora";
  if (diff < 3600) return Math.floor(diff / 60) + "min";
  if (diff < 86400)return Math.floor(diff / 3600) + "h";
  return Math.floor(diff / 86400) + "d";
}

/** Converte URL do YouTube para ID do vídeo */
function extrairYoutubeId(url) {
  const r = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const m = url.match(r);
  return m ? m[1] : null;
}

/** Calcula nível a partir do XP */
function calcularNivel(xp) {
  return Math.floor((xp || 0) / 100) + 1;
}

/** Calcula progresso dentro do nível atual (0-100) */
function calcularProgresso(xp) {
  return (xp || 0) % 100;
}

/** Mostra toast de notificação */
function toast(msg, tipo = "") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast visivel" + (tipo ? " " + tipo : "");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = "toast"; }, 3200);
}

/** Mostra popup de XP ganho */
function mostrarXP(quantidade) {
  const el = document.getElementById("xp-popup");
  const txt = document.getElementById("xp-popup-txt");
  if (!el || !txt) return;
  txt.textContent = "+" + quantidade + " XP";
  el.style.display = "flex";
  setTimeout(() => el.classList.add("visivel"), 10);
  setTimeout(() => {
    el.classList.remove("visivel");
    setTimeout(() => { el.style.display = "none"; }, 350);
  }, 2000);
}

/** Converte File para base64 */
function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Faz upload de imagem no ImgBB e retorna URL */
async function uploadImgBB(base64) {
  const form = new FormData();
  form.append("image", base64.split(",")[1]);
  const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: "POST", body: form
  });
  const json = await resp.json();
  if (!json.success) throw new Error("ImgBB: falha no upload");
  return json.data.url;
}

/** Avatar padrão via UI Avatars */
function avatarPadrao(nome) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome || "U")}&background=00C9B1&color=fff&size=128`;
}

/** Traduz erros do Firebase para PT-BR */
function traduzirErrFirebase(code) {
  const map = {
    "auth/user-not-found":        "E-mail não cadastrado.",
    "auth/wrong-password":        "Senha incorreta.",
    "auth/invalid-credential":    "E-mail ou senha inválidos.",
    "auth/email-already-in-use":  "Este e-mail já está em uso.",
    "auth/weak-password":         "Senha muito fraca (mín. 6 caracteres).",
    "auth/invalid-email":         "E-mail inválido.",
    "auth/too-many-requests":     "Muitas tentativas. Aguarde.",
    "auth/popup-closed-by-user":  "Login cancelado.",
    "auth/network-request-failed":"Sem conexão. Verifique a internet.",
  };
  return map[code] || "Erro: " + code;
}

// ─────────────────────────────────────────────
// MODAIS
// ─────────────────────────────────────────────
function abrirModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "flex";
  el.classList.add("ativo");
  // Preparar dados do modal criar post
  if (id === "modal-criar-post" && perfilAtual) {
    document.getElementById("post-criar-avatar").src  = perfilAtual.fotoURL || avatarPadrao(perfilAtual.nome);
    document.getElementById("post-criar-nome").textContent = perfilAtual.nome || "Você";
  }
  // Preparar modal editar perfil
  if (id === "modal-editar-perfil" && perfilAtual) {
    document.getElementById("editar-nome").value = perfilAtual.nome || "";
    document.getElementById("editar-bio").value  = perfilAtual.bio  || "";
  }
}
window.abrirModal = abrirModal;

function fecharModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("ativo");
  el.style.display = "none";
}
window.fecharModal = fecharModal;

// Fechar modal ao clicar no overlay
document.querySelectorAll(".modal-overlay").forEach(mo => {
  mo.addEventListener("click", e => {
    if (e.target === mo) {
      mo.style.display = "none";
      mo.classList.remove("ativo");
    }
  });
});

// ─────────────────────────────────────────────
// AUTH: LOGIN / CADASTRO
// ─────────────────────────────────────────────

/** Alterna entre abas de auth */
window.trocarAbaAuth = function(aba) {
  document.querySelectorAll(".auth-aba").forEach(b => b.classList.toggle("ativa", b.dataset.aba === aba));
  document.querySelectorAll(".auth-painel").forEach(p => p.classList.toggle("ativo", p.id === "painel-" + aba));
  document.getElementById("erro-entrar").style.display    = "none";
  document.getElementById("erro-cadastro").style.display  = "none";
};

/** Mostra/oculta senha */
window.alternarSenha = function(inputId, btn) {
  const inp  = document.getElementById(inputId);
  const icon = btn.querySelector(".material-icons-round");
  if (!inp) return;
  if (inp.type === "password") {
    inp.type = "text";
    icon.textContent = "visibility_off";
  } else {
    inp.type = "password";
    icon.textContent = "visibility";
  }
};

/** Mostrar erro de auth */
function mostrarErroAuth(painelId, msg) {
  const el = document.getElementById(painelId);
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

/** Login com e-mail/senha */
window.fazerLogin = async function() {
  const email = document.getElementById("entrar-email").value.trim();
  const senha  = document.getElementById("entrar-senha").value;
  document.getElementById("erro-entrar").style.display = "none";
  if (!email || !senha) { mostrarErroAuth("erro-entrar", "Preencha e-mail e senha."); return; }
  const btn = document.getElementById("btn-entrar");
  btn.disabled = true; btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Entrando...';
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch (e) {
    mostrarErroAuth("erro-entrar", traduzirErrFirebase(e.code));
    btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">login</span> Entrar';
  }
};

/** Cadastro com e-mail/senha */
window.fazerCadastro = async function() {
  const nome     = document.getElementById("cad-nome").value.trim();
  const email    = document.getElementById("cad-email").value.trim();
  const senha    = document.getElementById("cad-senha").value;
  const confirma = document.getElementById("cad-confirmar").value;
  document.getElementById("erro-cadastro").style.display = "none";
  if (!nome)               { mostrarErroAuth("erro-cadastro","Digite seu nome."); return; }
  if (!email)              { mostrarErroAuth("erro-cadastro","Digite seu e-mail."); return; }
  if (senha.length < 6)    { mostrarErroAuth("erro-cadastro","Senha mínima: 6 caracteres."); return; }
  if (senha !== confirma)  { mostrarErroAuth("erro-cadastro","As senhas não coincidem."); return; }
  const btn = document.getElementById("btn-cadastrar");
  btn.disabled = true; btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Criando...';
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
    // onAuthStateChanged cuidará do restante
  } catch (e) {
    mostrarErroAuth("erro-cadastro", traduzirErrFirebase(e.code));
    btn.disabled = false; btn.innerHTML = '<span class="material-icons-round">person_add</span> Criar conta';
  }
};

/** Login com Google */
window.loginGoogle = async function() {
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    toast(traduzirErrFirebase(e.code), "err");
  }
};

/** Recuperar senha */
window.recuperarSenha = async function() {
  const email = document.getElementById("entrar-email").value.trim();
  if (!email) { mostrarErroAuth("erro-entrar","Digite seu e-mail primeiro."); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    toast("E-mail de recuperação enviado!", "ok");
  } catch (e) {
    mostrarErroAuth("erro-entrar", traduzirErrFirebase(e.code));
  }
};

/** Logout */
window.fazerLogout = async function() {
  if (feedListener) { off(ref(db, "posts")); feedListener = null; }
  await signOut(auth);
};

// ─────────────────────────────────────────────
// AUTH STATE: observer principal
// ─────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    usuarioAtual = user;
    await garantirPerfil(user);
    await carregarPerfil();
    iniciarApp();
    esconderOverlay();
    mostrarTela("tela-app");
  } else {
    usuarioAtual = null;
    perfilAtual  = null;
    if (feedListener) { off(ref(db, "posts")); feedListener = null; }
    esconderOverlay();
    mostrarTela("tela-auth");
    // Reset botões
    const be = document.getElementById("btn-entrar");
    const bc = document.getElementById("btn-cadastrar");
    if (be) { be.disabled = false; be.innerHTML = '<span class="material-icons-round">login</span> Entrar'; }
    if (bc) { bc.disabled = false; bc.innerHTML = '<span class="material-icons-round">person_add</span> Criar conta'; }
  }
});

/** Garante que o perfil do usuário existe no banco */
async function garantirPerfil(user) {
  const userRef = ref(db, `usuarios/${user.uid}`);
  const snap    = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      nome:       user.displayName || "Estudante",
      email:      user.email || "",
      fotoURL:    user.photoURL || "",
      bio:        "",
      xp:         0,
      streak:     0,
      ultimoLogin: Date.now(),
      criadoEm:   Date.now(),
      isAdmin:    false,
      banido:     false
    });
  } else {
    // Atualiza último login e checa streak
    const dados = snap.val();
    const hoje  = new Date().toDateString();
    const ult   = dados.ultimoLoginData;
    let streak  = dados.streak || 0;
    if (ult !== hoje) {
      const ontem = new Date(Date.now() - 86400000).toDateString();
      streak = ult === ontem ? streak + 1 : 1;
      await update(userRef, { ultimoLogin: Date.now(), ultimoLoginData: hoje, streak });
    }
  }
}

/** Carrega dados do perfil atual */
async function carregarPerfil() {
  const snap = await get(ref(db, `usuarios/${usuarioAtual.uid}`));
  if (!snap.exists()) return;
  perfilAtual     = snap.val();
  perfilAtual.uid = usuarioAtual.uid;
}

/** Mostra/esconde telas */
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  const el = document.getElementById(id);
  if (el) el.classList.add("ativa");
}

function esconderOverlay() {
  const ol = document.getElementById("overlay-carregando");
  if (!ol) return;
  ol.classList.add("saindo");
  setTimeout(() => { ol.style.display = "none"; }, 450);
}

// ─────────────────────────────────────────────
// INIT APP
// ─────────────────────────────────────────────
function iniciarApp() {
  atualizarHeaderUI();
  atualizarPerfilUI();
  carregarFeed();
  carregarModulos();
  carregarMissoes();
  carregarAvisoGlobal();
  verificarMissoesPendentes();
}

/** Atualiza header com dados do usuário */
function atualizarHeaderUI() {
  if (!perfilAtual) return;
  const xp     = perfilAtual.xp || 0;
  const streak = perfilAtual.streak || 0;
  const foto   = perfilAtual.fotoURL || avatarPadrao(perfilAtual.nome);

  const hdrXP     = document.getElementById("hdr-xp-val");
  const hdrStreak = document.getElementById("hdr-streak-val");
  const hdrAvatar = document.getElementById("hdr-avatar-img");
  const criarAv   = document.getElementById("criar-post-avatar");
  const postAv    = document.getElementById("post-criar-avatar");
  const comAv     = document.getElementById("comentario-avatar");

  if (hdrXP)     hdrXP.textContent     = xp + " XP";
  if (hdrStreak) hdrStreak.textContent  = streak;
  if (hdrAvatar) hdrAvatar.src          = foto;
  if (criarAv)   criarAv.src            = foto;
  if (postAv)    postAv.src             = foto;
  if (comAv)     comAv.src              = foto;
}

/** Atualiza seção de perfil */
function atualizarPerfilUI() {
  if (!perfilAtual) return;
  const xp    = perfilAtual.xp || 0;
  const nivel = calcularNivel(xp);
  const prog  = calcularProgresso(xp);
  const foto  = perfilAtual.fotoURL || avatarPadrao(perfilAtual.nome);

  const els = {
    "perfil-avatar":        { attr: "src",        val: foto },
    "perfil-nome":          { attr: "text",        val: perfilAtual.nome || "Estudante" },
    "perfil-bio":           { attr: "text",        val: perfilAtual.bio || "Sem bio." },
    "perfil-xp":            { attr: "text",        val: xp },
    "perfil-nivel":         { attr: "text",        val: nivel },
    "perfil-streak":        { attr: "text",        val: perfilAtual.streak || 0 },
    "nivel-label":          { attr: "text",        val: "Nível " + nivel },
    "nivel-xp-txt":         { attr: "text",        val: (prog) + " / 100 XP" },
  };

  for (const [id, info] of Object.entries(els)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (info.attr === "src")  el.src         = info.val;
    if (info.attr === "text") el.textContent  = info.val;
  }

  // Barra de progresso nível
  const barra = document.getElementById("nivel-progresso");
  if (barra) barra.style.width = prog + "%";

  // Contagem de módulos e posts do usuário
  contarConteudoUsuario();

  // Medalhas
  renderizarMedalhas();

  // Trilha (atualiza se estiver na aba)
  if (abaCurrent === "trilha") carregarTrilha();
}

/** Conta módulos e posts do usuário */
async function contarConteudoUsuario() {
  if (!usuarioAtual) return;
  const [snapMods, snapPosts] = await Promise.all([
    get(ref(db, "modulos")),
    get(ref(db, "posts"))
  ]);

  let cMods = 0, cPosts = 0;
  snapMods.forEach(c => { if (c.val().autorId === usuarioAtual.uid) cMods++; });
  snapPosts.forEach(c => { if (c.val().autorId === usuarioAtual.uid) cPosts++; });

  const elMods  = document.getElementById("perfil-modulos-count");
  const elPosts = document.getElementById("perfil-posts-count");
  if (elMods)  elMods.textContent  = cMods;
  if (elPosts) elPosts.textContent = cPosts;

  // Carregar meus módulos
  carregarMeusModulos(snapMods);
}

/** Renderiza medalhas no perfil */
function renderizarMedalhas() {
  if (!perfilAtual) return;
  const medalhas = perfilAtual.medalhas || {};
  const wrap = document.getElementById("perfil-medalhas");
  if (!wrap) return;
  const lista = Object.values(medalhas);
  if (!lista.length) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = lista.map(m => `
    <div class="medalha">
      <span class="material-icons-round">emoji_events</span>
      ${esc(m.nome)}
    </div>`).join("");
}

// ─────────────────────────────────────────────
// NAVEGAÇÃO ENTRE ABAS
// ─────────────────────────────────────────────
window.irParaAba = function(aba, btn) {
  abaCurrent = aba;
  document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
  document.querySelectorAll(".nav-btn[data-aba]").forEach(b => b.classList.remove("ativo"));
  const secao = document.getElementById("aba-" + aba);
  if (secao) secao.classList.add("ativa");
  if (btn) btn.classList.add("ativo");
  else {
    const navBtn = document.querySelector(`.nav-btn[data-aba="${aba}"]`);
    if (navBtn) navBtn.classList.add("ativo");
  }
  // Carregar sob demanda
  if (aba === "ranking")  carregarRanking();
  if (aba === "trilha")   carregarTrilha();
  if (aba === "perfil")   { atualizarPerfilUI(); contarConteudoUsuario(); }
  if (aba === "missoes")  carregarMissoes();
  // Scroll para o topo
  const main = document.getElementById("app-main");
  if (main) main.scrollTop = 0;
};

// ─────────────────────────────────────────────
// XP SYSTEM
// ─────────────────────────────────────────────
async function adicionarXP(quantidade, motivo) {
  if (!usuarioAtual || !perfilAtual) return;
  const novoXP = (perfilAtual.xp || 0) + quantidade;
  await update(ref(db, `usuarios/${usuarioAtual.uid}`), { xp: novoXP });
  perfilAtual.xp = novoXP;
  mostrarXP(quantidade);
  atualizarHeaderUI();
  atualizarPerfilUI();
  if (motivo) await verificarMissoesPorAcao(motivo);
}

// ─────────────────────────────────────────────
// AVISO GLOBAL
// ─────────────────────────────────────────────
async function carregarAvisoGlobal() {
  const snap = await get(query(ref(db, "avisos"), orderByChild("criadoEm"), limitToLast(1)));
  if (!snap.exists()) return;
  snap.forEach(c => {
    const a = c.val();
    if (!a.ativo) return;
    const box = document.getElementById("aviso-global");
    const tit = document.getElementById("aviso-global-titulo");
    const msg = document.getElementById("aviso-global-msg");
    if (box && tit && msg) {
      tit.textContent = a.titulo || "Aviso";
      msg.textContent = a.mensagem || "";
      box.style.display = "flex";
    }
  });
}

window.fecharAvisoGlobal = function() {
  const box = document.getElementById("aviso-global");
  if (box) box.style.display = "none";
};

// ─────────────────────────────────────────────
// FEED / POSTS
// ─────────────────────────────────────────────
function carregarFeed() {
  const lista = document.getElementById("feed-lista");
  if (!lista) return;
  lista.innerHTML = '<div class="carregando-box"><div class="spinner"></div><p>Carregando feed...</p></div>';

  const q = query(ref(db, "posts"), orderByChild("criadoEm"), limitToLast(30));
  if (feedListener) off(ref(db, "posts"));
  feedListener = onValue(q, snap => {
    const posts = [];
    snap.forEach(c => posts.unshift({ id: c.key, ...c.val() }));
    if (!posts.length) {
      lista.innerHTML = '<div class="estado-vazio"><span class="material-icons-round">feed</span><p>Nenhuma publicação ainda.<br>Seja o primeiro!</p></div>';
      return;
    }
    lista.innerHTML = posts.map(p => htmlPostCard(p)).join("");
  });
}

/** Gera HTML de um card de post */
function htmlPostCard(p) {
  const foto     = p.autorFoto || avatarPadrao(p.autorNome);
  const curtidoPor = p.curtidas || {};
  const curtido  = usuarioAtual && curtidoPor[usuarioAtual.uid];
  const numCurtidas  = Object.keys(curtidoPor).length;
  const numComentarios = p.comentarios ? Object.keys(p.comentarios).length : 0;
  const ehMeu    = usuarioAtual && p.autorId === usuarioAtual.uid;

  return `
    <div class="post-card" id="post-card-${esc(p.id)}">
      <div class="post-topo">
        <img src="${esc(foto)}" alt="" onclick="verPerfilPublico('${esc(p.autorId)}')" />
        <div class="post-autor-info" onclick="verPerfilPublico('${esc(p.autorId)}')">
          <strong>${esc(p.autorNome || "Anônimo")}</strong>
          <small>${formatarTempo(p.criadoEm)}</small>
        </div>
        ${ehMeu ? `<button class="btn-excluir-post" onclick="excluirPost('${esc(p.id)}')" title="Excluir"><span class="material-icons-round">delete</span></button>` : ""}
      </div>
      <div class="post-body">
        ${p.texto ? `<p>${esc(p.texto).replace(/\n/g,"<br>")}</p>` : ""}
        ${p.imagemURL ? `<img src="${esc(p.imagemURL)}" alt="Imagem do post" loading="lazy" />` : ""}
      </div>
      <div class="post-rodape">
        <button class="btn-curtir ${curtido ? "curtido" : ""}" onclick="curtirPost('${esc(p.id)}')">
          <span class="material-icons-round">${curtido ? "favorite" : "favorite_border"}</span>
          ${numCurtidas}
        </button>
        <button class="btn-comentar" onclick="abrirComentarios('${esc(p.id)}')">
          <span class="material-icons-round">chat_bubble_outline</span>
          ${numComentarios}
        </button>
      </div>
    </div>`;
}

/** Curtir/descurtir post */
window.curtirPost = async function(postId) {
  if (!usuarioAtual) return;
  const curtidaRef = ref(db, `posts/${postId}/curtidas/${usuarioAtual.uid}`);
  const snap = await get(curtidaRef);
  if (snap.exists()) {
    await remove(curtidaRef);
  } else {
    await set(curtidaRef, true);
    await adicionarXP(1, null);
  }
};

/** Excluir post */
window.excluirPost = async function(postId) {
  if (!confirm("Excluir este post?")) return;
  await remove(ref(db, `posts/${postId}`));
  toast("Post excluído.", "ok");
};

/** Abrir modal de comentários */
window.abrirComentarios = async function(postId) {
  postIdAtual = postId;
  const snap  = await get(ref(db, `posts/${postId}`));
  if (!snap.exists()) return;
  const p     = { id: postId, ...snap.val() };
  const foto  = p.autorFoto || avatarPadrao(p.autorNome);

  document.getElementById("ver-post-conteudo").innerHTML = `
    <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.65rem">
      <img src="${esc(foto)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />
      <div>
        <strong style="font-size:.88rem">${esc(p.autorNome || "Anônimo")}</strong><br>
        <small style="font-size:.72rem;color:var(--texto-mut)">${formatarTempo(p.criadoEm)}</small>
      </div>
    </div>
    ${p.texto ? `<p style="font-size:.9rem;line-height:1.58;color:var(--texto-sub);margin-bottom:.5rem">${esc(p.texto).replace(/\n/g,"<br>")}</p>` : ""}
    ${p.imagemURL ? `<img src="${esc(p.imagemURL)}" style="width:100%;border-radius:12px;max-height:240px;object-fit:cover" />` : ""}`;

  // Carregar comentários
  const snapC = await get(ref(db, `posts/${postId}/comentarios`));
  renderizarComentarios(snapC);
  abrirModal("modal-ver-post");
};

function renderizarComentarios(snap) {
  const lista = document.getElementById("comentarios-lista");
  if (!lista) return;
  if (!snap || !snap.exists()) {
    lista.innerHTML = '<p style="color:var(--texto-mut);font-size:.83rem;margin-bottom:.5rem">Nenhum comentário ainda. Seja o primeiro!</p>';
    return;
  }
  const comentarios = [];
  snap.forEach(c => comentarios.push({ id: c.key, ...c.val() }));
  lista.innerHTML = comentarios.map(c => {
    const foto = c.autorFoto || avatarPadrao(c.autorNome);
    return `
      <div class="comentario-item">
        <img src="${esc(foto)}" alt="" />
        <div class="comentario-bolha">
          <strong>${esc(c.autorNome || "Anônimo")}</strong>
          <span>${esc(c.texto)}</span>
        </div>
      </div>`;
  }).join("");
}

/** Enviar comentário */
window.enviarComentario = async function() {
  const input = document.getElementById("comentario-texto");
  const texto = input.value.trim();
  if (!texto || !postIdAtual || !usuarioAtual || !perfilAtual) return;
  input.value = "";
  await push(ref(db, `posts/${postIdAtual}/comentarios`), {
    autorId:   usuarioAtual.uid,
    autorNome: perfilAtual.nome || "Estudante",
    autorFoto: perfilAtual.fotoURL || "",
    texto,
    criadoEm:  Date.now()
  });
  await adicionarXP(2, "comentar");
  // Recarregar comentários
  const snap = await get(ref(db, `posts/${postIdAtual}/comentarios`));
  renderizarComentarios(snap);
  toast("Comentário enviado!", "ok");
};

// ─────────────────────────────────────────────
// CRIAR POST
// ─────────────────────────────────────────────

/** Selecionar imagem para post */
window.selecionarImagemPost = async function(input) {
  if (!input.files[0]) return;
  postImagemBase64 = await arquivoParaBase64(input.files[0]);
  document.getElementById("post-preview-img").src = postImagemBase64;
  document.getElementById("post-img-preview").style.display = "block";
};

window.removerImagemPost = function() {
  postImagemBase64 = null;
  document.getElementById("post-img-preview").style.display = "none";
  document.getElementById("post-img-input").value = "";
};

/** Publicar post */
window.publicarPost = async function() {
  const texto = document.getElementById("post-texto").value.trim();
  if (!texto && !postImagemBase64) { toast("Escreva algo ou adicione uma imagem.", "err"); return; }
  if (!usuarioAtual || !perfilAtual) return;

  const btn = document.getElementById("btn-publicar");
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Publicando...';

  try {
    let imagemURL = null;
    if (postImagemBase64) {
      toast("Enviando imagem...");
      imagemURL = await uploadImgBB(postImagemBase64);
    }
    await push(ref(db, "posts"), {
      autorId:   usuarioAtual.uid,
      autorNome: perfilAtual.nome || "Estudante",
      autorFoto: perfilAtual.fotoURL || "",
      texto,
      imagemURL,
      criadoEm:  Date.now()
    });
    await adicionarXP(5, "postar");
    toast("Publicado! +5 XP 🎉", "ok");
    document.getElementById("post-texto").value = "";
    postImagemBase64 = null;
    document.getElementById("post-img-preview").style.display = "none";
    document.getElementById("post-img-input").value = "";
    fecharModal("modal-criar-post");
  } catch (e) {
    toast("Erro ao publicar: " + e.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">send</span> Publicar';
  }
};

// ─────────────────────────────────────────────
// MÓDULOS
// ─────────────────────────────────────────────
let todosModulos = [];

function carregarModulos() {
  const grade = document.getElementById("modulos-grade");
  if (!grade) return;
  grade.innerHTML = '<div class="carregando-box"><div class="spinner"></div><p>Carregando...</p></div>';
  get(query(ref(db, "modulos"), orderByChild("criadoEm"), limitToLast(50))).then(snap => {
    todosModulos = [];
    snap.forEach(c => todosModulos.unshift({ id: c.key, ...c.val() }));
    renderizarModulos(todosModulos, "modulos-grade");
  });
}

function renderizarModulos(lista, containerId) {
  const grade = document.getElementById(containerId);
  if (!grade) return;
  const filtrados = lista.filter(m => {
    const busca = (document.getElementById("busca-modulo")?.value || "").toLowerCase();
    const textoOk = !busca || (m.titulo || "").toLowerCase().includes(busca) || (m.descricao || "").toLowerCase().includes(busca);
    const materiaOk = !materiaFiltro || m.materia === materiaFiltro;
    return textoOk && materiaOk;
  });
  if (!filtrados.length) {
    grade.innerHTML = '<div class="estado-vazio"><span class="material-icons-round">layers_clear</span><p>Nenhum módulo encontrado.</p></div>';
    return;
  }
  grade.innerHTML = filtrados.map(m => htmlModuloCard(m)).join("");
}

function htmlModuloCard(m) {
  const curtidas = m.curtidas ? Object.keys(m.curtidas).length : 0;
  const acessos  = m.acessos || 0;
  const capaHtml = m.capaURL
    ? `<div class="modulo-capa"><img src="${esc(m.capaURL)}" alt="Capa" loading="lazy" /></div>`
    : `<div class="modulo-capa">${materiaEmoji(m.materia)}</div>`;

  return `
    <div class="modulo-card" onclick="verModulo('${esc(m.id)}')">
      ${m.oficial ? '<div class="modulo-oficial-selo"><span class="material-icons-round">verified</span> Oficial</div>' : ""}
      ${capaHtml}
      <div class="modulo-corpo">
        <span class="modulo-materia-tag">${esc(m.materia || "Geral")}</span>
        <div class="modulo-titulo">${esc(m.titulo)}</div>
        <div class="modulo-autor">por ${esc(m.autorNome || "Anônimo")}</div>
        <div class="modulo-stats">
          <span><span class="material-icons-round">favorite</span>${curtidas}</span>
          <span><span class="material-icons-round">visibility</span>${acessos}</span>
        </div>
      </div>
    </div>`;
}

function materiaEmoji(materia) {
  const map = {
    "Matemática":"📐","Português":"📚","Literatura":"📖","Redação":"✍️",
    "História":"🏛️","Geografia":"🌍","Ciências":"🔬","Biologia":"🧬",
    "Física":"⚛️","Química":"🧪","Inglês":"🇬🇧","Espanhol":"🇪🇸",
    "Filosofia":"🤔","Sociologia":"🧑‍🤝‍🧑","Artes":"🎨","Ed. Física":"🏃",
    "Programação":"💻","Robótica":"🤖","Empreend.":"💼"
  };
  return map[materia] || "📕";
}

/** Filtrar módulos */
window.filtrarModulos = function() {
  renderizarModulos(todosModulos, "modulos-grade");
};

// Filtro por matéria (chips)
document.getElementById("chips-materia").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#chips-materia .chip").forEach(c => c.classList.remove("ativo"));
  chip.classList.add("ativo");
  materiaFiltro = chip.dataset.materia || "";
  renderizarModulos(todosModulos, "modulos-grade");
});

/** Ver módulo completo */
window.verModulo = async function(modId) {
  const snap = await get(ref(db, `modulos/${modId}`));
  if (!snap.exists()) { toast("Módulo não encontrado.", "err"); return; }
  const m = { id: modId, ...snap.val() };

  // Incrementar acessos
  update(ref(db, `modulos/${modId}`), { acessos: (m.acessos || 0) + 1 });

  // Render
  const capaHtml = m.capaURL
    ? `<div class="modulo-view-capa"><img src="${esc(m.capaURL)}" alt="Capa" /></div>`
    : `<div class="modulo-view-capa">${materiaEmoji(m.materia)}</div>`;

  const videosHtml = m.videos
    ? Object.values(m.videos).filter(Boolean).map(url => {
        const vid = extrairYoutubeId(url);
        if (!vid) return "";
        return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen loading="lazy"></iframe></div>`;
      }).join("")
    : "";

  const quizHtml = (m.quiz && Object.values(m.quiz).length)
    ? renderizarQuizModulo(Object.values(m.quiz), modId)
    : "";

  document.getElementById("modulo-conteudo-view").innerHTML = `
    ${capaHtml}
    <div class="modulo-view-meta">
      ${m.oficial ? '<div class="modulo-oficial-selo" style="display:inline-flex;margin-bottom:.5rem"><span class="material-icons-round">verified</span> Módulo Oficial</div>' : ""}
      <div class="modulo-materia-tag">${esc(m.materia || "Geral")}</div>
      <div class="modulo-view-titulo">${esc(m.titulo)}</div>
      <div class="modulo-view-autor">
        <img src="${esc(m.autorFoto || avatarPadrao(m.autorNome))}" alt="" />
        <span>por ${esc(m.autorNome || "Anônimo")}</span>
      </div>
      ${m.descricao ? `<div class="modulo-view-desc">${esc(m.descricao)}</div>` : ""}
    </div>
    ${m.conteudo ? `
    <div class="modulo-view-secao">
      <h3><span class="material-icons-round">article</span> Conteúdo</h3>
      <div class="modulo-conteudo-txt">${esc(m.conteudo)}</div>
    </div>` : ""}
    ${videosHtml ? `
    <div class="modulo-view-secao">
      <h3><span class="material-icons-round">play_circle</span> Vídeos</h3>
      ${videosHtml}
    </div>` : ""}
    ${quizHtml ? `
    <div class="modulo-view-secao">
      <h3><span class="material-icons-round">quiz</span> Quiz</h3>
      ${quizHtml}
    </div>` : ""}`;

  abrirModal("modal-ver-modulo");
};

function renderizarQuizModulo(questoes, modId) {
  return `<div class="quiz-lista" id="quiz-mod-${esc(modId)}">
    ${questoes.map((q, qi) => `
      <div class="quiz-questao" id="qq-${esc(modId)}-${qi}">
        <div class="quiz-questao-enunciado">${qi+1}. ${esc(q.enunciado)}</div>
        <div class="quiz-opcoes">
          ${(q.opcoes || []).map((op, oi) => `
            <button class="quiz-opcao-btn" id="qo-${esc(modId)}-${qi}-${oi}"
              onclick="responderQuizMod('${esc(modId)}',${qi},${oi},${q.correta})">
              ${"ABCD"[oi]}) ${esc(op)}
            </button>`).join("")}
        </div>
        <div id="qf-${esc(modId)}-${qi}"></div>
      </div>`).join("")}
    <div id="qr-${esc(modId)}" style="display:none"></div>
  </div>`;
}

window.responderQuizMod = async function(modId, qi, selecionada, correta) {
  // Desabilitar botões desta questão
  const questoesBtns = document.querySelectorAll(`[id^="qo-${modId}-${qi}-"]`);
  questoesBtns.forEach(b => { b.disabled = true; });

  const btnSel   = document.getElementById(`qo-${modId}-${qi}-${selecionada}`);
  const btnCorr  = document.getElementById(`qo-${modId}-${qi}-${correta}`);
  const feedEl   = document.getElementById(`qf-${modId}-${qi}`);
  const acertou  = selecionada === correta;

  if (btnSel)  btnSel.classList.add(acertou ? "correta" : "errada");
  if (btnCorr && !acertou) btnCorr.classList.add("correta");
  if (feedEl)  feedEl.innerHTML = `<span class="quiz-feedback ${acertou ? "ok" : "fail"}">${acertou ? "✅ Correto!" : "❌ Errado"}</span>`;

  if (acertou) await adicionarXP(10, "acertar_questao");

  // Verificar se todas respondidas
  const totalQuestoes = document.querySelectorAll(`[id^="qo-${modId}-"][disabled]`).length;
  // Verificar se este era o último grupo de 4
  // (simplificado: contar grupos únicos respondidos)
  const gruposRespondidos = new Set(
    [...document.querySelectorAll(`[id^="qo-${modId}-"][disabled]`)]
      .map(b => b.id.split("-")[2])
  );
  const totalGrupos = document.querySelectorAll(`[id^="qo-${modId}-0-"]`).length > 0 ? 1 : 0;

  // Verificar se concluiu o módulo (todas questões respondidas)
  const todasRespondidas = document.querySelectorAll(`#quiz-mod-${modId} .quiz-opcao-btn:not([disabled])`).length === 0;
  if (todasRespondidas) {
    const acertos = document.querySelectorAll(`#quiz-mod-${modId} .quiz-opcao-btn.correta`).length;
    const total   = document.querySelectorAll(`#quiz-mod-${modId} .quiz-questao`).length;
    const resEl   = document.getElementById(`qr-${modId}`);
    if (resEl) {
      resEl.style.display = "block";
      resEl.innerHTML = `
        <div class="quiz-resultado">
          <h3>${acertos}/${total} corretas 🎉</h3>
          <p>Parabéns por completar o módulo!</p>
          <span class="xp-ganho">+50 XP pelo módulo</span>
        </div>`;
    }
    await adicionarXP(50, "completar_modulo");
    // Registrar progresso
    await set(ref(db, `progresso/${usuarioAtual.uid}/modulos/${modId}`), {
      concluidoEm: Date.now(), acertos, total
    });
  }
};

/** Carrega meus módulos na aba perfil */
function carregarMeusModulos(snapMods) {
  const grade = document.getElementById("meus-modulos");
  if (!grade) return;
  const meus = [];
  snapMods.forEach(c => { if (c.val().autorId === usuarioAtual?.uid) meus.unshift({ id: c.key, ...c.val() }); });
  if (!meus.length) {
    grade.innerHTML = '<div class="estado-vazio"><span class="material-icons-round">layers</span><p>Você ainda não criou módulos.</p></div>';
    return;
  }
  grade.innerHTML = meus.map(m => htmlModuloCard(m)).join("");
}

// ─────────────────────────────────────────────
// CRIAR MÓDULO
// ─────────────────────────────────────────────
window.previewCapa = async function(input) {
  if (!input.files[0]) return;
  capaModuloBase64 = await arquivoParaBase64(input.files[0]);
  const prev = document.getElementById("capa-preview");
  prev.src = capaModuloBase64;
  prev.style.display = "block";
  const area = document.getElementById("capa-upload-area");
  area.querySelector("span.material-icons-round").style.display = "none";
  area.querySelector("span:not(.material-icons-round)").style.display = "none";
};

window.adicionarVideoInput = function() {
  const wrap = document.createElement("div");
  wrap.className = "video-row";
  wrap.innerHTML = `
    <input type="text" class="video-url-input" placeholder="Cole a URL do YouTube aqui..." />
    <button class="btn-icone-sm" onclick="this.closest('.video-row').remove()">
      <span class="material-icons-round">remove</span>
    </button>`;
  document.getElementById("videos-lista").appendChild(wrap);
};

window.adicionarQuestao = function() {
  const idx = questaoCount++;
  const bloco = document.createElement("div");
  bloco.className = "questao-bloco";
  bloco.dataset.q = idx;
  bloco.innerHTML = `
    <div class="questao-bloco-topo">
      <input type="text" class="questao-texto-input" placeholder="Enunciado da pergunta..." />
      <button class="btn-icone-sm" onclick="this.closest('.questao-bloco').remove()">
        <span class="material-icons-round">delete</span>
      </button>
    </div>
    <div class="opcoes-wrap">
      ${[0,1,2,3].map(i => `
        <div class="opcao-row">
          <input type="radio" name="correta-${idx}" value="${i}" ${i===0?"checked":""} />
          <input type="text" class="opcao-texto" placeholder="Alternativa ${"ABCD"[i]}${i===0?" (correta)":""}" />
        </div>`).join("")}
    </div>`;
  document.getElementById("quiz-construtor").appendChild(bloco);
};

window.salvarModulo = async function() {
  const titulo    = document.getElementById("mod-titulo").value.trim();
  const descricao = document.getElementById("mod-desc").value.trim();
  const materia   = document.getElementById("mod-materia").value;
  const conteudo  = document.getElementById("mod-conteudo").value.trim();

  if (!titulo)   { toast("Informe o título do módulo.", "err"); return; }
  if (!materia)  { toast("Selecione a matéria.", "err"); return; }
  if (!usuarioAtual || !perfilAtual) return;

  const btn = document.getElementById("btn-salvar-modulo");
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Salvando...';

  try {
    // Upload da capa
    let capaURL = null;
    if (capaModuloBase64) {
      toast("Enviando capa...");
      capaURL = await uploadImgBB(capaModuloBase64);
    }

    // Vídeos
    const videos = {};
    document.querySelectorAll(".video-url-input").forEach((inp, i) => {
      if (inp.value.trim()) videos[i] = inp.value.trim();
    });

    // Quiz
    const quiz = {};
    let qIdx = 0;
    document.querySelectorAll(".questao-bloco").forEach(bloco => {
      const enunciado = bloco.querySelector(".questao-texto-input").value.trim();
      if (!enunciado) return;
      const opcoes  = [...bloco.querySelectorAll(".opcao-texto")].map(i => i.value.trim());
      const radioSel = bloco.querySelector("input[type=radio]:checked");
      const correta  = radioSel ? parseInt(radioSel.value) : 0;
      quiz[qIdx++] = { enunciado, opcoes, correta };
    });

    await push(ref(db, "modulos"), {
      titulo, descricao, materia, conteudo, capaURL, videos, quiz,
      autorId:   usuarioAtual.uid,
      autorNome: perfilAtual.nome || "Estudante",
      autorFoto: perfilAtual.fotoURL || "",
      oficial:   false,
      acessos:   0,
      criadoEm:  Date.now()
    });

    await adicionarXP(20, "criar_modulo");
    toast("Módulo criado! +20 XP 🎉", "ok");
    fecharModal("modal-criar-modulo");
    resetarFormModulo();
    carregarModulos();
  } catch (e) {
    toast("Erro ao salvar: " + e.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">save</span> Salvar módulo';
  }
};

function resetarFormModulo() {
  ["mod-titulo","mod-desc","mod-conteudo"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const sel = document.getElementById("mod-materia");
  if (sel) sel.value = "";
  const prev = document.getElementById("capa-preview");
  if (prev) { prev.src = ""; prev.style.display = "none"; }
  const area = document.getElementById("capa-upload-area");
  if (area) {
    area.querySelector("span.material-icons-round").style.display = "";
    area.querySelector("span:not(.material-icons-round)").style.display = "";
  }
  document.getElementById("videos-lista").innerHTML = `
    <div class="video-row">
      <input type="text" class="video-url-input" placeholder="Cole a URL do YouTube aqui..." />
      <button class="btn-icone-sm" onclick="adicionarVideoInput()"><span class="material-icons-round">add</span></button>
    </div>`;
  document.getElementById("quiz-construtor").innerHTML = "";
  capaModuloBase64 = null;
  questaoCount = 0;
}

// ─────────────────────────────────────────────
// TRILHA DE FASES
// ─────────────────────────────────────────────
async function carregarTrilha() {
  const wrap = document.getElementById("trilha-fases");
  if (!wrap) return;
  wrap.innerHTML = '<div class="carregando-box"><div class="spinner"></div><p>Carregando...</p></div>';

  const xp = perfilAtual?.xp || 0;

  // Buscar fases extras adicionadas pelo admin
  const snapAdmin = await get(ref(db, "fases_admin"));
  let fases = [...FASES_BASE];
  if (snapAdmin.exists()) {
    snapAdmin.forEach(c => {
      const f = { id: c.key, ...c.val() };
      if (!fases.find(x => x.id === f.id)) fases.push(f);
    });
  }

  // Buscar progresso do usuário
  const snapProg = await get(ref(db, `progresso/${usuarioAtual?.uid}/fases`));
  const concluidas = snapProg.exists() ? snapProg.val() : {};

  // Atualizar UI da barra de nível
  const nivel = calcularNivel(xp);
  const prog  = calcularProgresso(xp);
  const elLabel = document.getElementById("nivel-label");
  const elXPTxt = document.getElementById("nivel-xp-txt");
  const elBarra = document.getElementById("nivel-progresso");
  if (elLabel) elLabel.textContent = "Nível " + nivel;
  if (elXPTxt) elXPTxt.textContent = prog + " / 100 XP";
  if (elBarra) elBarra.style.width = prog + "%";

  // Renderizar fases em grupos de 5
  const grupoTam = 5;
  const grupos = [];
  for (let i = 0; i < fases.length; i += grupoTam) {
    grupos.push(fases.slice(i, i + grupoTam));
  }

  wrap.innerHTML = grupos.map((grupo, gi) => {
    const html = grupo.map((f, fi) => {
      const idx       = gi * grupoTam + fi;
      const concluida = !!concluidas[f.id];
      const prev      = idx > 0 ? fases[idx - 1] : null;
      const prevConc  = !prev || !!concluidas[prev.id];
      const disponivel = !concluida && xp >= f.xpReq && prevConc;
      const travada    = !concluida && !disponivel;

      let estado = travada ? "travado" : concluida ? "concluida" : "disponivel";
      const estrelas = concluida ? "⭐⭐⭐" : disponivel ? "⭐☆☆" : "☆☆☆";
      const posicao  = POSICOES[idx % POSICOES.length] || "centro";

      const conector = idx > 0
        ? `<div class="trilha-conector ${concluidas[fases[idx-1]?.id] ? "feito" : "normal"}"></div>`
        : "";

      return `
        ${conector}
        <div class="trilha-no-wrap ${posicao}">
          <div class="fase-no" onclick="verFase('${f.id}')">
            <button class="fase-btn-circulo ${estado}" ${travada ? "disabled" : ""} title="${esc(f.titulo)}">
              ${f.emoji}
            </button>
            <span class="fase-rotulo">${esc(f.titulo)}</span>
            <span class="fase-estrelas">${estrelas}</span>
          </div>
        </div>`;
    }).join("");

    return `
      <div class="trilha-secao">
        <div style="text-align:center;margin-bottom:1rem">
          <span class="trilha-secao-titulo">Seção ${gi+1}</span>
        </div>
        <div class="trilha-nos">${html}</div>
      </div>`;
  }).join("");
}

/** Abrir detalhe de uma fase */
window.verFase = async function(faseId) {
  const f = FASES_BASE.find(x => x.id === faseId);
  if (!f) return;

  const xp = perfilAtual?.xp || 0;
  const snapProg = await get(ref(db, `progresso/${usuarioAtual?.uid}/fases/${faseId}`));
  const concluida = snapProg.exists();

  // Verificar se a fase anterior foi concluída
  const idx  = FASES_BASE.indexOf(f);
  const prev = idx > 0 ? FASES_BASE[idx - 1] : null;
  let prevConc = true;
  if (prev) {
    const snapPrev = await get(ref(db, `progresso/${usuarioAtual?.uid}/fases/${prev.id}`));
    prevConc = snapPrev.exists();
  }

  const disponivel = xp >= f.xpReq && prevConc;
  const travada    = !concluida && !disponivel;
  const difNomes   = ["","🟢 Iniciante","🟡 Básico","🟠 Intermediário","🔴 Avançado","💀 Expert"];

  document.getElementById("fase-detalhe-corpo").innerHTML = `
    <div class="fase-detalhe-header">
      <span class="fase-detalhe-emoji">${f.emoji}</span>
      <div class="fase-detalhe-titulo">${esc(f.titulo)}</div>
      <div class="fase-detalhe-sub">${esc(f.materia)} · ${difNomes[f.dif] || ""}</div>
      <div class="fase-detalhe-xp"><span class="material-icons-round">bolt</span>+${f.xpPremio} XP ao concluir</div>
      ${concluida ? '<div style="margin-top:.5rem;font-size:1.5rem">⭐⭐⭐</div>' : ""}
    </div>
    ${travada ? `
    <div class="fase-info-travado">
      <span class="material-icons-round">lock</span>
      <p>Você precisa de <strong>${f.xpReq} XP</strong> para desbloquear.<br>Você tem <strong>${xp} XP</strong> agora.</p>
    </div>` : ""}`;

  const rodape = document.getElementById("fase-detalhe-rodape");
  if (travada) {
    rodape.innerHTML = `<button class="btn-primario" style="background:var(--borda);color:var(--texto-mut);box-shadow:none;cursor:not-allowed">🔒 Fase bloqueada</button>`;
  } else if (concluida) {
    rodape.innerHTML = `
      <button class="btn-primario" onclick="fecharModal('modal-ver-fase');abrirQuizFase('${faseId}')">
        <span class="material-icons-round">replay</span> Refazer fase
      </button>`;
  } else {
    rodape.innerHTML = `
      <button class="btn-primario" onclick="fecharModal('modal-ver-fase');abrirQuizFase('${faseId}')">
        <span class="material-icons-round">play_arrow</span> Iniciar fase
      </button>`;
  }

  abrirModal("modal-ver-fase");
};

/** Abrir quiz de fase — busca questões do banco */
window.abrirQuizFase = async function(faseId) {
  const f = FASES_BASE.find(x => x.id === faseId);
  if (!f) return;

  document.getElementById("quiz-fase-titulo").textContent = f.emoji + " " + f.titulo;

  // Buscar questões da fase no banco (criadas pelo admin)
  const snap = await get(ref(db, `fases_questoes/${faseId}`));
  if (!snap.exists() || !snap.val()) {
    document.getElementById("quiz-fase-corpo").innerHTML = `
      <div class="estado-vazio">
        <span class="material-icons-round">quiz</span>
        <p>Esta fase ainda não tem questões.<br>O administrador precisa adicioná-las.</p>
      </div>`;
    abrirModal("modal-quiz-fase");
    return;
  }

  const questoes = [];
  snap.forEach(c => questoes.push({ id: c.key, ...c.val() }));

  let acertos = 0;
  let totalRespondidas = 0;

  document.getElementById("quiz-fase-corpo").innerHTML = `
    <div id="fase-quiz-wrap">
      <p style="font-size:.82rem;color:var(--texto-mut);margin-bottom:1rem">📝 ${questoes.length} pergunta${questoes.length !== 1 ? "s" : ""}</p>
      ${questoes.map((q, qi) => `
        <div class="quiz-questao" id="fq-${qi}">
          <div class="quiz-questao-enunciado">${qi+1}. ${esc(q.enunciado)}</div>
          <div class="quiz-opcoes" id="fqops-${qi}">
            ${(q.opcoes || []).map((op, oi) => `
              <button class="quiz-opcao-btn" id="fqo-${qi}-${oi}"
                onclick="responderFaseQ(${qi},${oi},${q.correta},'${faseId}',${questoes.length},${f.xpPremio})">
                ${"ABCD"[oi]}) ${esc(op)}
              </button>`).join("")}
          </div>
          <div id="ffb-${qi}"></div>
        </div>`).join("")}
      <div id="fase-resultado" style="display:none"></div>
    </div>`;

  abrirModal("modal-quiz-fase");
};

window.responderFaseQ = async function(qi, sel, correta, faseId, total, xpPremio) {
  // Desabilitar opções desta questão
  document.querySelectorAll(`#fqops-${qi} .quiz-opcao-btn`).forEach(b => { b.disabled = true; });

  const btnSel  = document.getElementById(`fqo-${qi}-${sel}`);
  const btnCorr = document.getElementById(`fqo-${qi}-${correta}`);
  const fbEl    = document.getElementById(`ffb-${qi}`);
  const acertou = sel === correta;

  if (btnSel)  btnSel.classList.add(acertou ? "correta" : "errada");
  if (btnCorr && !acertou) btnCorr.classList.add("correta");
  if (fbEl)    fbEl.innerHTML = `<span class="quiz-feedback ${acertou ? "ok" : "fail"}">${acertou ? "✅ Correto! +10 XP" : "❌ Errado"}</span>`;
  if (acertou) await adicionarXP(10, "acertar_questao");

  // Checar se todas respondidas
  const totalBloqueados = document.querySelectorAll("#fase-quiz-wrap .quiz-opcao-btn[disabled]").length;
  const totalBotoes     = document.querySelectorAll("#fase-quiz-wrap .quiz-opcao-btn").length;
  if (totalBloqueados >= totalBotoes) {
    const acertosFase = document.querySelectorAll("#fase-quiz-wrap .quiz-opcao-btn.correta").length;
    const resEl = document.getElementById("fase-resultado");
    resEl.style.display = "block";
    resEl.innerHTML = `
      <div class="quiz-resultado">
        <h3>${acertosFase}/${total} corretas 🎉</h3>
        <p>Fase concluída!</p>
        <span class="xp-ganho">+${xpPremio} XP de bônus</span>
      </div>`;
    await adicionarXP(xpPremio, "completar_fase");
    await set(ref(db, `progresso/${usuarioAtual?.uid}/fases/${faseId}`), {
      concluidoEm: Date.now(), acertos: acertosFase, total
    });
    toast(`Fase concluída! +${xpPremio} XP 🎉`, "ok");
    carregarTrilha();
  }
};

// ─────────────────────────────────────────────
// MISSÕES
// ─────────────────────────────────────────────
async function carregarMissoes() {
  const lista = document.getElementById("missoes-lista");
  const strip = document.getElementById("missoes-ativas-home");
  if (!lista) return;
  lista.innerHTML = '<div class="carregando-box"><div class="spinner"></div><p>Carregando...</p></div>';

  const [snapMissoes, snapProg] = await Promise.all([
    get(ref(db, "missoes")),
    get(ref(db, `progresso/${usuarioAtual?.uid}/missoes`))
  ]);

  if (!snapMissoes.exists()) {
    lista.innerHTML = '<div class="estado-vazio"><span class="material-icons-round">emoji_events</span><p>Nenhuma missão disponível ainda.</p></div>';
    if (strip) strip.innerHTML = "";
    return;
  }

  const missoes = [];
  const progresso = snapProg.exists() ? snapProg.val() : {};
  snapMissoes.forEach(c => missoes.push({ id: c.key, ...c.val() }));

  let pendentes = 0;
  lista.innerHTML = missoes.map(m => {
    const prog    = progresso[m.id] || { atual: 0, concluida: false };
    const pct     = Math.min(100, Math.round((prog.atual / m.meta) * 100));
    const conc    = prog.concluida;
    if (!conc) pendentes++;

    return `
      <div class="missao-card">
        <div class="missao-topo">
          <div class="missao-icone" style="background:${m.corFundo || "var(--verde-xl)"}">${m.emoji || "🎯"}</div>
          <div class="missao-info">
            <h4>${esc(m.titulo)}</h4>
            <p>${esc(m.descricao)}</p>
          </div>
          <div class="missao-recompensa">
            <span class="material-icons-round">bolt</span>+${m.xpPremio} XP
          </div>
        </div>
        ${conc
          ? `<div class="missao-concluida-badge"><span class="material-icons-round">check_circle</span> Concluída!</div>`
          : `
            <div class="missao-barra-wrap"><div class="missao-barra" style="width:${pct}%"></div></div>
            <div class="missao-progresso-txt">${prog.atual} / ${m.meta} • ${pct}%</div>`}
      </div>`;
  }).join("");

  // Badge de missões no nav
  const badge = document.getElementById("nav-missoes-badge");
  if (badge) {
    badge.textContent  = pendentes;
    badge.style.display = pendentes > 0 ? "flex" : "none";
  }

  // Strip na home (missões incompletas)
  if (strip) {
    const ativas = missoes.filter(m => !(progresso[m.id]?.concluida)).slice(0, 4);
    strip.innerHTML = ativas.map(m => {
      const prog = progresso[m.id] || { atual: 0 };
      const pct  = Math.min(100, Math.round((prog.atual / m.meta) * 100));
      return `
        <div class="missao-mini" onclick="irParaAba('missoes')">
          <div class="missao-mini-titulo">${m.emoji || "🎯"} ${esc(m.titulo)}</div>
          <div class="missao-mini-barra-wrap"><div class="missao-mini-barra" style="width:${pct}%"></div></div>
          <div class="missao-mini-txt">${prog.atual}/${m.meta}</div>
        </div>`;
    }).join("");
  }
}

/** Verifica e atualiza progresso de missões por ação */
async function verificarMissoesPorAcao(acao) {
  if (!usuarioAtual) return;
  const [snapMissoes, snapProg] = await Promise.all([
    get(ref(db, "missoes")),
    get(ref(db, `progresso/${usuarioAtual.uid}/missoes`))
  ]);
  if (!snapMissoes.exists()) return;

  const progresso = snapProg.exists() ? snapProg.val() : {};
  const atualizacoes = {};

  snapMissoes.forEach(c => {
    const m    = { id: c.key, ...c.val() };
    const prog = progresso[m.id] || { atual: 0, concluida: false };
    if (prog.concluida) return;
    if (m.acao !== acao) return;

    const novoAtual = (prog.atual || 0) + 1;
    const concluida = novoAtual >= m.meta;
    atualizacoes[m.id] = { atual: novoAtual, concluida };

    if (concluida) {
      adicionarXP(m.xpPremio || 100, null);
      toast(`Missão concluída: ${m.titulo}! +${m.xpPremio} XP 🎉`, "ok");
      // Dar medalha se a missão tiver
      if (m.medalha && usuarioAtual) {
        set(ref(db, `usuarios/${usuarioAtual.uid}/medalhas/${m.id}`), {
          nome: m.medalha, conquista: m.titulo, em: Date.now()
        });
      }
    }
  });

  if (Object.keys(atualizacoes).length > 0) {
    await update(ref(db, `progresso/${usuarioAtual.uid}/missoes`), atualizacoes);
  }
}

async function verificarMissoesPendentes() {
  await carregarMissoes();
}

// ─────────────────────────────────────────────
// RANKING
// ─────────────────────────────────────────────
async function carregarRanking() {
  const podio = document.getElementById("ranking-podio");
  const lista = document.getElementById("ranking-lista");
  if (!podio || !lista) return;
  lista.innerHTML = '<div class="carregando-box"><div class="spinner"></div><p>Carregando...</p></div>';

  const snap = await get(query(ref(db, "usuarios"), orderByChild("xp"), limitToLast(20)));
  const usuarios = [];
  snap.forEach(c => usuarios.unshift({ uid: c.key, ...c.val() }));
  usuarios.sort((a, b) => (b.xp || 0) - (a.xp || 0));

  const top3 = usuarios.slice(0, 3);
  const resto = usuarios.slice(3);

  // Pódio: centro=1º, esq=2º, dir=3º
  const ordemPodio = [
    { u: top3[1], pos: "p2", crown: "🥈" },
    { u: top3[0], pos: "p1", crown: "👑" },
    { u: top3[2], pos: "p3", crown: "🥉" }
  ].filter(x => x.u);

  podio.innerHTML = ordemPodio.map(({ u, pos, crown }) => {
    const foto = u.fotoURL || avatarPadrao(u.nome);
    const ehEu = u.uid === usuarioAtual?.uid;
    return `
      <div class="podio-item podio-${pos}">
        <span class="podio-coroa">${crown}</span>
        <img class="podio-avatar" src="${esc(foto)}" alt="" ${ehEu ? 'style="border-color:var(--verde)"' : ""} />
        <span class="podio-nome">${esc((u.nome || "?").split(" ")[0])}</span>
        <span class="podio-xp">${u.xp || 0} XP</span>
        <div class="podio-plataforma">${pos === "podio-p1" ? "1º" : pos === "podio-p2" ? "2º" : "3º"}</div>
      </div>`;
  }).join("");

  // Corrigir texto do bloco do pódio
  podio.querySelectorAll(".podio-plataforma").forEach((el, i) => {
    el.textContent = ordemPodio[i].pos === "p1" ? "1º" : ordemPodio[i].pos === "p2" ? "2º" : "3º";
  });

  lista.innerHTML = (resto.length ? resto : []).map((u, i) => {
    const foto = u.fotoURL || avatarPadrao(u.nome);
    const ehEu = u.uid === usuarioAtual?.uid;
    return `
      <div class="ranking-item ${ehEu ? "meu" : ""}">
        <span class="ranking-pos">${i + 4}º</span>
        <img src="${esc(foto)}" alt="" />
        <div class="ranking-item-info">
          <strong>${esc(u.nome || "Anônimo")}</strong>
          <small>Nível ${calcularNivel(u.xp)}</small>
        </div>
        <span class="ranking-xp">${u.xp || 0} XP</span>
      </div>`;
  }).join("") || '<p style="text-align:center;color:var(--texto-mut);padding:1.5rem;font-size:.85rem">Estude mais para aparecer aqui!</p>';
}

// ─────────────────────────────────────────────
// PERFIL
// ─────────────────────────────────────────────

/** Salvar edição do perfil */
window.salvarPerfil = async function() {
  const nome = document.getElementById("editar-nome").value.trim();
  const bio  = document.getElementById("editar-bio").value.trim();
  if (!nome) { toast("Nome não pode ser vazio.", "err"); return; }
  if (!usuarioAtual) return;
  await update(ref(db, `usuarios/${usuarioAtual.uid}`), { nome, bio });
  perfilAtual.nome = nome;
  perfilAtual.bio  = bio;
  atualizarHeaderUI();
  atualizarPerfilUI();
  fecharModal("modal-editar-perfil");
  toast("Perfil atualizado!", "ok");
};

/** Trocar foto de perfil */
window.trocarFotoPerfil = async function(input) {
  if (!input.files[0] || !usuarioAtual) return;
  const btn = document.querySelector(".perfil-editar-foto");
  if (btn) btn.innerHTML = '<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span>';
  try {
    const base64 = await arquivoParaBase64(input.files[0]);
    toast("Enviando foto...");
    const url = await uploadImgBB(base64);
    await update(ref(db, `usuarios/${usuarioAtual.uid}`), { fotoURL: url });
    perfilAtual.fotoURL = url;
    atualizarHeaderUI();
    atualizarPerfilUI();
    toast("Foto atualizada! 🎉", "ok");
  } catch (e) {
    toast("Erro ao enviar foto: " + e.message, "err");
  } finally {
    if (btn) btn.innerHTML = '<span class="material-icons-round">photo_camera</span>';
  }
};

/** Ver perfil público de outro usuário */
window.verPerfilPublico = async function(uid) {
  if (!uid || uid === usuarioAtual?.uid) { irParaAba("perfil"); return; }
  const snap = await get(ref(db, `usuarios/${uid}`));
  if (!snap.exists()) return;
  const u = snap.val();
  toast(`Perfil: ${u.nome || "Anônimo"} — ${u.xp || 0} XP`);
};
