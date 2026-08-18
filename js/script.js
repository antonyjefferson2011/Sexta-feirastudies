import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider,
  signOut, updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, push, update, remove,
  onValue, off, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const FB_CONFIG = {
  apiKey: "AIzaSyDGYiJorNt7x80mP6DxPrFj97Qmm1YFgMI",
  authDomain: "sf-studios-a58b1.firebaseapp.com",
  databaseURL: "https://sf-studios-a58b1-default-rtdb.firebaseio.com",
  projectId: "sf-studios-a58b1",
  storageBucket: "sf-studios-a58b1.firebasestorage.app",
  messagingSenderId: "876592442561",
  appId: "1:876592442561:web:87b6150b97d8b0a92ef840"
};
const IMGBB_KEY = "86427cccd2a94fb42a0754ffd7f19e79";

const fbApp = initializeApp(FB_CONFIG);
const auth = getAuth(fbApp);
const db = getDatabase(fbApp);
const gAuth = new GoogleAuthProvider();

let EU = null;
let PERFIL = null;
let feedUnSub = null;
let postImg64 = null;
let capaImg64 = null;
let postAberto = null;
let filtroMat = "";
let todosModulos = [];
let qIdx = 0;
let abaAtual = "home";
let notifUnSub = null;
let respostasQuiz = {};
let interessesUsuario = [];
let postsCarregados = [];
let paginaAtual = 0;
const POSTS_POR_PAGINA = 10;
let carregandoMais = false;

const FASES = [
  {id:"f01",em:"🌱",tit:"Início da Jornada",mat:"Geral",xpReq:0,xpP:30,dif:1},
  {id:"f02",em:"📐",tit:"Números e Operações",mat:"Matemática",xpReq:30,xpP:35,dif:1},
  {id:"f03",em:"📚",tit:"Leitura e Escrita",mat:"Português",xpReq:65,xpP:35,dif:1},
  {id:"f04",em:"🌍",tit:"Explorando o Mundo",mat:"Geografia",xpReq:100,xpP:40,dif:2},
  {id:"f05",em:"🏛️",tit:"Raízes Históricas",mat:"História",xpReq:140,xpP:40,dif:2},
  {id:"f06",em:"🔬",tit:"Ciências da Vida",mat:"Ciências",xpReq:180,xpP:45,dif:2},
  {id:"f07",em:"🧬",tit:"DNA e Evolução",mat:"Biologia",xpReq:225,xpP:50,dif:3},
  {id:"f08",em:"⚛️",tit:"Leis da Física",mat:"Física",xpReq:275,xpP:50,dif:3},
  {id:"f09",em:"🧪",tit:"Reações Químicas",mat:"Química",xpReq:325,xpP:55,dif:3},
  {id:"f10",em:"🇬🇧",tit:"English Journey",mat:"Inglês",xpReq:380,xpP:55,dif:3},
  {id:"f11",em:"🤔",tit:"Pensamento Crítico",mat:"Filosofia",xpReq:435,xpP:60,dif:4},
  {id:"f12",em:"💻",tit:"Código e Algoritmos",mat:"Programação",xpReq:495,xpP:65,dif:4},
  {id:"f13",em:"💼",tit:"Mundo dos Negócios",mat:"Empreend.",xpReq:560,xpP:70,dif:4},
  {id:"f14",em:"🏆",tit:"Mestre do Saber",mat:"Geral",xpReq:640,xpP:120,dif:5},
];
const POSICOES = ["cen","esq","cen","dir","cen","esq","cen","dir","cen","esq","cen","dir","cen","cen"];

function esc(s) {
  if (!s) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function ago(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now() - ts) / 1000);
  if (d < 60) return "agora";
  if (d < 3600) return Math.floor(d/60)+"min";
  if (d < 86400) return Math.floor(d/3600)+"h";
  return Math.floor(d/86400)+"d";
}
function ytId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
function nivel(xp) { return Math.floor((xp||0)/100)+1; }
function progXP(xp) { return (xp||0)%100; }
function avDefault(nome) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome||"U")}&background=00A896&color=fff&size=128`;
}
function matEmoji(m) {
  const mp = {"Matemática":"📐","Português":"📚","Literatura":"📖","Redação":"✍️","História":"🏛️",
    "Geografia":"🌍","Ciências":"🔬","Biologia":"🧬","Física":"⚛️","Química":"🧪","Inglês":"🇬🇧",
    "Espanhol":"🇪🇸","Filosofia":"🤔","Sociologia":"🧑‍🤝‍🧑","Artes":"🎨","Ed. Física":"🏃",
    "Programação":"💻","Robótica":"🤖","Empreend.":"💼"};
  return mp[m] || "📕";
}
function errFirebase(code) {
  const m = {
    "auth/user-not-found": "E-mail não cadastrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/email-already-in-use": "E-mail já está em uso.",
    "auth/weak-password": "Senha muito fraca (mín. 6 caracteres).",
    "auth/invalid-email": "E-mail inválido.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde.",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/network-request-failed": "Sem conexão com a internet.",
    "PERMISSION_DENIED": "Permissão negada. Configure as regras do Firebase.",
  };
  return m[code] || "Erro (" + code + ")";
}

function toast(msg, tipo="") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast show" + (tipo ? " " + tipo : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = "toast"; }, 3200);
}

function showXP(n) {
  const el = document.getElementById("xp-pop");
  const tx = document.getElementById("xp-pop-txt");
  if (!el || !tx) return;
  tx.textContent = "+" + n + " XP";
  el.style.display = "flex";
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => { el.style.display = "none"; }, 300);
  }, 1800);
}

async function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function uploadImgBB(base64) {
  const form = new FormData();
  form.append("image", base64.split(",")[1]);
  const resp = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
    method: "POST", body: form
  });
  const json = await resp.json();
  if (!json.success) throw new Error("ImgBB: falha no upload - " + (json.error?.message||""));
  return json.data.url;
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = "flex";
  if (id === "m-post" && PERFIL) {
    const ai = document.getElementById("post-av-img");
    const an = document.getElementById("post-av-nome");
    if (ai) ai.src = PERFIL.foto || avDefault(PERFIL.nome);
    if (an) an.textContent = PERFIL.nome || "Você";
  }
  if (id === "m-edit-pf" && PERFIL) {
    const en = document.getElementById("edit-nome");
    const eb = document.getElementById("edit-bio");
    if (en) en.value = PERFIL.nome || "";
    if (eb) eb.value = PERFIL.bio || "";
  }
}
window.openModal = openModal;

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = "none";
}
window.closeModal = closeModal;

document.querySelectorAll(".modal-ov").forEach(m => {
  m.addEventListener("click", e => { if (e.target === m) m.style.display = "none"; });
});

window.trocarAba = function(aba) {
  document.querySelectorAll(".auth-aba").forEach(b => {
    b.classList.toggle("ativa", b.getAttribute("onclick") && b.getAttribute("onclick").includes(`'${aba}'`));
  });
  document.getElementById("painel-entrar").style.display = aba === "entrar" ? "flex" : "none";
  document.getElementById("painel-cadastro").style.display = aba === "cadastro" ? "flex" : "none";
  ["err-entrar","err-cadastro"].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.display = "none";
  });
};

window.toggleOlho = function(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  const ic = btn.querySelector(".material-icons-round");
  inp.type = inp.type === "password" ? "text" : "password";
  if (ic) ic.textContent = inp.type === "password" ? "visibility" : "visibility_off";
};

function mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.display = "block";
}

function setBtnEstado(id, carregando, htmlNormal) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = carregando;
  btn.innerHTML = carregando
    ? '<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span> Aguarde...'
    : htmlNormal;
}

window.fazerLogin = async function() {
  const email = document.getElementById("e-email")?.value.trim();
  const senha = document.getElementById("e-senha")?.value;
  document.getElementById("err-entrar").style.display = "none";
  if (!email || !senha) { mostrarErro("err-entrar","Preencha e-mail e senha."); return; }
  setBtnEstado("btn-entrar", true, '<span class="material-icons-round">login</span> Entrar');
  try {
    await signInWithEmailAndPassword(auth, email, senha);
  } catch(e) {
    mostrarErro("err-entrar", errFirebase(e.code));
    setBtnEstado("btn-entrar", false, '<span class="material-icons-round">login</span> Entrar');
  }
};

window.fazerCadastro = async function() {
  const nome = document.getElementById("c-nome")?.value.trim();
  const email = document.getElementById("c-email")?.value.trim();
  const senha = document.getElementById("c-senha")?.value;
  const conf = document.getElementById("c-confirma")?.value;
  document.getElementById("err-cadastro").style.display = "none";
  if (!nome) { mostrarErro("err-cadastro","Digite seu nome."); return; }
  if (!email) { mostrarErro("err-cadastro","Digite seu e-mail."); return; }
  if (senha.length < 6) { mostrarErro("err-cadastro","Senha mínima: 6 caracteres."); return; }
  if (senha !== conf) { mostrarErro("err-cadastro","As senhas não coincidem."); return; }
  setBtnEstado("btn-cadastro", true, '<span class="material-icons-round">person_add</span> Criar conta');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(cred.user, { displayName: nome });
  } catch(e) {
    mostrarErro("err-cadastro", errFirebase(e.code));
    setBtnEstado("btn-cadastro", false, '<span class="material-icons-round">person_add</span> Criar conta');
  }
};

window.loginGoogle = async function() {
  try {
    await signInWithPopup(auth, gAuth);
  } catch(e) {
    toast(errFirebase(e.code), "err");
  }
};

window.recuperarSenha = async function() {
  const email = document.getElementById("e-email")?.value.trim();
  if (!email) { mostrarErro("err-entrar","Digite seu e-mail primeiro."); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    toast("E-mail de recuperação enviado!", "ok");
  } catch(e) {
    mostrarErro("err-entrar", errFirebase(e.code));
  }
};

window.fazerLogout = async function() {
  if (feedUnSub) { feedUnSub(); feedUnSub = null; }
  if (notifUnSub) { notifUnSub(); notifUnSub = null; }
  await signOut(auth);
};

onAuthStateChanged(auth, async user => {
  if (user) {
    EU = user;
    try {
      await garantirPerfil(user);
      await carregarPerfil();
    } catch(e) {
      console.error("Erro ao carregar perfil:", e.message);
      PERFIL = {
        uid: user.uid, nome: user.displayName || "Estudante", email: user.email || "",
        foto: user.photoURL || "", bio: "", xp: 0, streak: 0
      };
    }
    iniciarApp();
    ocultarOverlay();
    mostrarTela("tela-app");
  } else {
    EU = null; PERFIL = null;
    if (feedUnSub) { feedUnSub(); feedUnSub = null; }
    if (notifUnSub) { notifUnSub(); notifUnSub = null; }
    ocultarOverlay();
    mostrarTela("tela-auth");
    setBtnEstado("btn-entrar", false, '<span class="material-icons-round">login</span> Entrar');
    setBtnEstado("btn-cadastro", false, '<span class="material-icons-round">person_add</span> Criar conta');
  }
});

async function garantirPerfil(user) {
  const r = ref(db, `usuarios/${user.uid}`);
  const snap = await get(r);
  const hoje = new Date().toDateString();
  if (!snap.exists()) {
    await set(r, {
      nome: user.displayName || "Estudante", email: user.email || "", foto: user.photoURL || "",
      bio: "", xp: 0, streak: 1, ultimaData: hoje, criadoEm: Date.now(), isAdmin: false, banido: false
    });
  } else {
    const d = snap.val();
    if (d.banido) { await signOut(auth); throw new Error("Conta banida."); }
    if (d.ultimaData !== hoje) {
      const ontem = new Date(Date.now() - 86400000).toDateString();
      const novoStreak = d.ultimaData === ontem ? (d.streak || 0) + 1 : 1;
      await update(r, { ultimaData: hoje, streak: novoStreak });
    }
  }
}

async function carregarPerfil() {
  const snap = await get(ref(db, `usuarios/${EU.uid}`));
  if (!snap.exists()) return;
  PERFIL = { ...snap.val(), uid: EU.uid };
}

function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
  const el = document.getElementById(id);
  if (el) el.classList.add("ativa");
}

function ocultarOverlay() {
  const ol = document.getElementById("overlay");
  if (!ol) return;
  ol.classList.add("sumindo");
  setTimeout(() => { ol.style.display = "none"; }, 350);
}

function iniciarApp() {
  atualizarHeader();
  atualizarPerfilUI();
  carregarInteresses();
  carregarFeed();
  carregarModulos();
  carregarMissoes();
  carregarAviso();
  carregarNotificacoes();
}

function atualizarHeader() {
  if (!PERFIL) return;
  const foto = PERFIL.foto || avDefault(PERFIL.nome);
  const setEl = (id, val, attr = "text") => {
    const el = document.getElementById(id);
    if (!el) return;
    if (attr === "src") el.src = val;
    else el.textContent = val;
  };
  setEl("hdr-xp", (PERFIL.xp || 0) + " XP");
  setEl("hdr-streak", PERFIL.streak || 0);
  setEl("hdr-av-img", foto, "src");
  setEl("bar-av", foto, "src");
  setEl("post-av-img", foto, "src");
  setEl("coment-av", foto, "src");
}

function atualizarPerfilUI() {
  if (!PERFIL) return;
  const xp = PERFIL.xp || 0;
  const nv = nivel(xp);
  const pg = progXP(xp);
  const foto = PERFIL.foto || avDefault(PERFIL.nome);
  const setEl = (id, val, attr = "text") => {
    const el = document.getElementById(id);
    if (!el) return;
    if (attr === "src") el.src = val;
    else el.textContent = val;
  };
  setEl("pf-av", foto, "src");
  setEl("pf-nome", PERFIL.nome || "Estudante");
  setEl("pf-bio", PERFIL.bio || "Sem bio.");
  setEl("pf-xp", xp);
  setEl("pf-nivel", nv);
  setEl("pf-streak", PERFIL.streak || 0);
  setEl("nivel-txt", "Nível " + nv);
  setEl("nivel-xp-info", pg + "/100 XP");
  const barra = document.getElementById("xp-barra");
  if (barra) barra.style.width = pg + "%";
  const mw = document.getElementById("pf-medalhas");
  if (mw && PERFIL.medalhas) {
    mw.innerHTML = Object.values(PERFIL.medalhas)
      .map(m => `<div class="medalha"><span class="material-icons-round">emoji_events</span>${esc(m.nome)}</div>`)
      .join("");
  }
  contarConteudo();
}

async function contarConteudo() {
  if (!EU) return;
  try {
    const [sm, sp] = await Promise.all([get(ref(db, "modulos")), get(ref(db, "posts"))]);
    let cMods = 0, cPosts = 0;
    sm.forEach(c => { if (c.val().autorId === EU.uid) cMods++; });
    sp.forEach(c => { if (c.val().autorId === EU.uid) cPosts++; });
    const em = document.getElementById("pf-mods"); if (em) em.textContent = cMods;
    const ep = document.getElementById("pf-posts"); if (ep) ep.textContent = cPosts;
    renderMeusModulos(sm);
  } catch(e) { console.error(e); }
}

window.irAba = function(aba, btn) {
  abaAtual = aba;
  const urlMap = {
    home: "/home", modulos: "/modulos", trilha: "/trilha", missoes: "/missoes",
    ranking: "/ranking", notificacoes: "/notificacoes", pesquisa: "/pesquisa",
    perfil: "/perfil/" + (EU?.uid || "")
  };
  const novaUrl = urlMap[aba] || "/" + aba;
  history.pushState({}, "", novaUrl);
  
  document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
  document.querySelectorAll(".nav-btn[data-tab]").forEach(b => b.classList.remove("ativo"));
  const sec = document.getElementById("aba-" + aba);
  if (sec) sec.classList.add("ativa");
  if (btn) btn.classList.add("ativo");
  else {
    const nb = document.querySelector(`.nav-btn[data-tab="${aba}"]`);
    if (nb) nb.classList.add("ativo");
  }
  const m = document.getElementById("app-main");
  if (m) m.scrollTop = 0;
  if (aba === "ranking") carregarRanking();
  if (aba === "trilha") carregarTrilha();
  if (aba === "perfil") { atualizarPerfilUI(); carregarInteresses(); }
  if (aba === "missoes") carregarMissoes();
  if (aba === "notificacoes") carregarNotificacoes();
};

window.addEventListener("popstate", () => {
  const path = window.location.pathname;
  let aba = "home";
  if (path.includes("/modulos")) aba = "modulos";
  else if (path.includes("/trilha")) aba = "trilha";
  else if (path.includes("/missoes")) aba = "missoes";
  else if (path.includes("/ranking")) aba = "ranking";
  else if (path.includes("/notificacoes")) aba = "notificacoes";
  else if (path.includes("/pesquisa")) aba = "pesquisa";
  else if (path.includes("/perfil")) aba = "perfil";
  irAba(aba);
});

async function addXP(quantidade, acao) {
  if (!EU || !PERFIL) return;
  const novoXP = (PERFIL.xp || 0) + quantidade;
  try { await update(ref(db, `usuarios/${EU.uid}`), { xp: novoXP }); } catch(e) {}
  PERFIL.xp = novoXP;
  showXP(quantidade);
  atualizarHeader();
  atualizarPerfilUI();
  if (acao) verificarMissoes(acao);
}

// ============ SISTEMA DE INTERESSES ============

async function carregarInteresses() {
  if (!EU) return;
  try {
    const snap = await get(ref(db, `usuarios/${EU.uid}/interesses`));
    if (snap.exists()) {
      interessesUsuario = snap.val() || [];
      document.querySelectorAll("#interesses-wrap .chip").forEach(chip => {
        if (interessesUsuario.includes(chip.dataset.int)) {
          chip.classList.add("ativo");
        } else {
          chip.classList.remove("ativo");
        }
      });
    }
  } catch(e) {}
}

window.toggleInteresse = function(interesse, btn) {
  btn.classList.toggle("ativo");
  const interesses = [];
  document.querySelectorAll("#interesses-wrap .chip.ativo").forEach(c => {
    interesses.push(c.dataset.int);
  });
  definirInteresses(interesses);
};

window.definirInteresses = async function(interesses) {
  if (!EU) return;
  try {
    await set(ref(db, `usuarios/${EU.uid}/interesses`), interesses);
    interessesUsuario = interesses;
    toast("Interesses atualizados!", "ok");
    carregarFeed();
  } catch(e) { toast("Erro: " + e.message, "err"); }
};

// ============ FEED PERSONALIZADO COM SCROLL INFINITO ============

function carregarFeed() {
  const fd = document.getElementById("feed");
  if (!fd) return;
  fd.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando feed...</p></div>';
  if (feedUnSub) feedUnSub();
  
  paginaAtual = 0;
  postsCarregados = [];
  carregandoMais = false;
  
  const postsRef = ref(db, "posts");
  feedUnSub = onValue(postsRef, snap => {
    const todosPosts = [];
    snap.forEach(c => {
      const post = c.val();
      post.id = c.key;
      todosPosts.push(post);
    });
    todosPosts.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    
    let postsFiltrados = todosPosts;
    if (interessesUsuario.length > 0) {
      const postsInteresse = todosPosts.filter(p => 
        interessesUsuario.some(int => 
          (p.materia || "").includes(int) || 
          (p.texto || "").toLowerCase().includes(int.toLowerCase())
        )
      );
      const postsOutros = todosPosts.filter(p => 
        !interessesUsuario.some(int => 
          (p.materia || "").includes(int) || 
          (p.texto || "").toLowerCase().includes(int.toLowerCase())
        )
      );
      postsFiltrados = [...postsInteresse, ...postsOutros];
    }
    
    postsCarregados = postsFiltrados.slice(0, POSTS_POR_PAGINA);
    paginaAtual = 1;
    
    if (!postsCarregados.length) {
      fd.innerHTML = '<div class="vazio"><span class="material-icons-round">feed</span><p>Nenhuma publicação ainda.<br>Seja o primeiro!</p></div>';
      return;
    }
    
    fd.innerHTML = postsCarregados.map(htmlPost).join("");
    fd.innerHTML += '<div id="sentinela" style="height:20px"></div>';
    setupScrollInfinito();
  }, err => {
    fd.innerHTML = `<div class="vazio"><span class="material-icons-round">error</span><p>Erro ao carregar feed.<br><small>${esc(err.message)}</small></p></div>`;
  });
}

function setupScrollInfinito() {
  const sentinela = document.getElementById("sentinela");
  if (!sentinela) return;
  
  const observer = new IntersectionObserver(async (entries) => {
    if (entries[0].isIntersecting && !carregandoMais) {
      carregandoMais = true;
      await carregarMaisPosts();
      carregandoMais = false;
    }
  }, { root: document.querySelector(".app-main"), threshold: 0.1 });
  
  observer.observe(sentinela);
}

async function carregarMaisPosts() {
  if (!EU) return;
  const fd = document.getElementById("feed");
  if (!fd) return;
  
  const sentinela = document.getElementById("sentinela");
  if (sentinela) sentinela.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando mais...</p></div>';
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const snap = await get(ref(db, "posts"));
  const todosPosts = [];
  snap.forEach(c => {
    const post = c.val();
    post.id = c.key;
    todosPosts.push(post);
  });
  todosPosts.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  
  let postsFiltrados = todosPosts;
  if (interessesUsuario.length > 0) {
    const postsInteresse = todosPosts.filter(p => 
      interessesUsuario.some(int => 
        (p.materia || "").includes(int) || 
        (p.texto || "").toLowerCase().includes(int.toLowerCase())
      )
    );
    const postsOutros = todosPosts.filter(p => 
      !interessesUsuario.some(int => 
        (p.materia || "").includes(int) || 
        (p.texto || "").toLowerCase().includes(int.toLowerCase())
      )
    );
    postsFiltrados = [...postsInteresse, ...postsOutros];
  }
  
  const inicio = paginaAtual * POSTS_POR_PAGINA;
  const fim = inicio + POSTS_POR_PAGINA;
  const novosPosts = postsFiltrados.slice(inicio, fim);
  
  if (novosPosts.length) {
    if (sentinela) sentinela.remove();
    fd.insertAdjacentHTML("beforeend", novosPosts.map(htmlPost).join(""));
    fd.insertAdjacentHTML("beforeend", '<div id="sentinela" style="height:20px"></div>');
    paginaAtual++;
    setupScrollInfinito();
  } else {
    if (sentinela) sentinela.innerHTML = '<p style="text-align:center;color:var(--mt);font-size:.8rem;padding:1rem">Você chegou ao fim!</p>';
  }
}

// ============ POSTS ============

function htmlPost(p) {
  const foto = p.autorFoto || avDefault(p.autorNome);
  const curtidas = p.curtidas || {};
  const curtido = EU && curtidas[EU.uid];
  const nCurt = Object.keys(curtidas).length;
  const nComt = p.comentarios ? Object.keys(p.comentarios).length : 0;
  const ehMeu = EU && p.autorId === EU.uid;
  return `<div class="post-card" id="pc-${esc(p.id)}">
    <div class="post-topo">
      <img src="${esc(foto)}" alt="" />
      <div class="post-autor">
        <strong>${esc(p.autorNome || "Anônimo")}</strong>
        <small>${ago(p.criadoEm)}</small>
      </div>
      ${ehMeu ? `<button class="post-del-btn" onclick="delPost('${esc(p.id)}')" title="Excluir post"><span class="material-icons-round">delete</span></button>` : ""}
    </div>
    <div class="post-body">
      ${p.texto ? `<p>${esc(p.texto).replace(/\n/g, "<br>")}</p>` : ""}
      ${p.imgURL ? `<img src="${esc(p.imgURL)}" alt="Imagem" loading="lazy" />` : ""}
    </div>
    <div class="post-footer">
      <button class="btn-curtir ${curtido ? "curtido" : ""}" onclick="curtirPost('${esc(p.id)}')">
        <span class="material-icons-round">${curtido ? "favorite" : "favorite_border"}</span>${nCurt}
      </button>
      <button class="btn-coment" onclick="abrirComents('${esc(p.id)}')">
        <span class="material-icons-round">chat_bubble_outline</span>${nComt}
      </button>
    </div>
  </div>`;
}

window.curtirPost = async function(pid) {
  if (!EU) return;
  const cr = ref(db, `posts/${pid}/curtidas/${EU.uid}`);
  const snap = await get(cr);
  if (snap.exists()) await remove(cr);
  else { await set(cr, true); await addXP(1, null); }
};

window.delPost = async function(pid) {
  if (!confirm("Excluir este post?")) return;
  try { await remove(ref(db, `posts/${pid}`)); toast("Post excluído.", "ok"); }
  catch(e) { toast("Erro: " + e.message, "err"); }
};

window.abrirComents = async function(pid) {
  postAberto = pid;
  try {
    const snap = await get(ref(db, `posts/${pid}`));
    if (!snap.exists()) return;
    const p = { id: pid, ...snap.val() };
    const foto = p.autorFoto || avDefault(p.autorNome);
    document.getElementById("ver-post-corpo").innerHTML = `
      <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.65rem">
        <img src="${esc(foto)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover"/>
        <div><strong style="font-size:.85rem">${esc(p.autorNome || "Anônimo")}</strong><br>
        <small style="font-size:.7rem;color:var(--mt)">${ago(p.criadoEm)}</small></div>
      </div>
      ${p.texto ? `<p style="font-size:.88rem;line-height:1.55;color:var(--sub);margin-bottom:.5rem">${esc(p.texto).replace(/\n/g,"<br>")}</p>` : ""}
      ${p.imgURL ? `<img src="${esc(p.imgURL)}" style="width:100%;border-radius:4px;max-height:220px;object-fit:cover"/>` : ""}`;
    const sc = await get(ref(db, `posts/${pid}/comentarios`));
    renderComents(sc);
    openModal("m-ver-post");
  } catch(e) { toast("Erro: " + e.message, "err"); }
};

function renderComents(snap) {
  const l = document.getElementById("lista-coments");
  if (!l) return;
  if (!snap || !snap.exists()) {
    l.innerHTML = '<p style="color:var(--mt);font-size:.8rem;margin-bottom:.5rem">Nenhum comentário ainda.</p>';
    return;
  }
  const cs = [];
  snap.forEach(c => cs.push({ id: c.key, ...c.val() }));
  l.innerHTML = cs.map(c => `
    <div class="coment-item">
      <img src="${esc(c.autorFoto || avDefault(c.autorNome))}" alt=""/>
      <div class="coment-bolha"><strong>${esc(c.autorNome || "Anônimo")}</strong><span>${esc(c.texto)}</span></div>
    </div>`).join("");
}

window.enviarComentario = async function() {
  const inp = document.getElementById("coment-txt");
  const txt = inp?.value.trim();
  if (!txt || !postAberto || !EU || !PERFIL) return;
  inp.value = "";
  try {
    await push(ref(db, `posts/${postAberto}/comentarios`), {
      autorId: EU.uid, autorNome: PERFIL.nome || "Estudante", autorFoto: PERFIL.foto || "",
      texto: txt, criadoEm: Date.now()
    });
    await addXP(2, "comentar");
    const snap = await get(ref(db, `posts/${postAberto}/comentarios`));
    renderComents(snap);
    toast("Comentário enviado!", "ok");
  } catch(e) { toast("Erro: " + e.message, "err"); }
};

window.selecionarFotoPost = async function(inp) {
  if (!inp.files[0]) return;
  postImg64 = await toBase64(inp.files[0]);
  const pi = document.getElementById("post-prev");
  if (pi) pi.src = postImg64;
  const pv = document.getElementById("post-img-prev");
  if (pv) pv.style.display = "block";
};

window.removerImgPost = function() {
  postImg64 = null;
  const pv = document.getElementById("post-img-prev");
  if (pv) pv.style.display = "none";
  const pf = document.getElementById("post-file");
  if (pf) pf.value = "";
};

window.publicarPost = async function() {
  const txt = document.getElementById("post-txt")?.value.trim();
  if (!txt && !postImg64) { toast("Escreva algo ou adicione uma imagem.", "err"); return; }
  if (!EU || !PERFIL) return;
  const btn = document.getElementById("btn-pub");
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span> Publicando...';
  try {
    let imgURL = null;
    if (postImg64) { toast("Enviando imagem..."); imgURL = await uploadImgBB(postImg64); }
    await push(ref(db, "posts"), {
      autorId: EU.uid, autorNome: PERFIL.nome || "Estudante", autorFoto: PERFIL.foto || "",
      texto: txt, imgURL: imgURL, criadoEm: Date.now(), curtidas: {}, comentarios: {}
    });
    await addXP(5, "postar");
    toast("Publicado! +5 XP", "ok");
    document.getElementById("post-txt").value = "";
    postImg64 = null;
    const pv = document.getElementById("post-img-prev");
    if (pv) pv.style.display = "none";
    closeModal("m-post");
  } catch(e) {
    toast("Erro ao publicar: " + e.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">send</span> Publicar';
  }
};

// ============ MÓDULOS ============

function carregarModulos() {
  const g = document.getElementById("grade-mods");
  if (!g) return;
  g.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando módulos...</p></div>';
  const modsRef = ref(db, "modulos");
  onValue(modsRef, snap => {
    todosModulos = [];
    snap.forEach(c => {
      const mod = c.val();
      mod.id = c.key;
      todosModulos.push(mod);
    });
    renderMods(todosModulos, "grade-mods");
  }, err => {
    g.innerHTML = `<div class="vazio"><span class="material-icons-round">error</span><p>Erro ao carregar módulos.<br><small>${esc(err.message)}</small></p></div>`;
  });
}

function renderMods(lista, cid) {
  const g = document.getElementById(cid);
  if (!g) return;
  const busca = (document.getElementById("busca-mod")?.value || "").toLowerCase();
  const fil = lista.filter(m => {
    const bOk = !busca || (m.titulo||"").toLowerCase().includes(busca) || (m.descricao||"").toLowerCase().includes(busca);
    const mOk = !filtroMat || m.materia === filtroMat;
    return bOk && mOk;
  });
  if (!fil.length) {
    g.innerHTML = '<div class="vazio"><span class="material-icons-round">layers_clear</span><p>Nenhum módulo encontrado.</p></div>';
    return;
  }
  g.innerHTML = fil.map(m => {
    const nc = m.curtidas ? Object.keys(m.curtidas).length : 0;
    return `<div class="mod-card" onclick="verMod('${esc(m.id)}')">
      ${m.oficial ? '<div class="mod-oficial"><span class="material-icons-round">verified</span> Oficial</div>' : ""}
      <div class="mod-capa">${m.capaURL ? `<img src="${esc(m.capaURL)}" alt="" loading="lazy"/>` : matEmoji(m.materia)}</div>
      <div class="mod-corpo">
        <span class="mod-mat-tag">${esc(m.materia || "Geral")}</span>
        <div class="mod-tit">${esc(m.titulo)}</div>
        <div class="mod-autor">por ${esc(m.autorNome || "Anônimo")}</div>
        <div class="mod-stats">
          <span><span class="material-icons-round">favorite</span>${nc}</span>
          <span><span class="material-icons-round">visibility</span>${m.acessos || 0}</span>
        </div>
      </div>
    </div>`;
  }).join("");
}

window.filtrarMods = function() { renderMods(todosModulos, "grade-mods"); };

document.getElementById("chips-mat")?.addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#chips-mat .chip").forEach(c => c.classList.remove("ativo"));
  chip.classList.add("ativo");
  filtroMat = chip.dataset.m || "";
  renderMods(todosModulos, "grade-mods");
});

window.verMod = async function(mid) {
  try {
    const snap = await get(ref(db, `modulos/${mid}`));
    if (!snap.exists()) { toast("Módulo não encontrado.", "err"); return; }
    const m = { id: mid, ...snap.val() };
    update(ref(db, `modulos/${mid}`), { acessos: (m.acessos || 0) + 1 }).catch(() => {});
    const capaH = m.capaURL ? `<div class="mod-view-capa"><img src="${esc(m.capaURL)}" alt="Capa"/></div>` : `<div class="mod-view-capa">${matEmoji(m.materia)}</div>`;
    const vids = m.videos ? Object.values(m.videos).filter(Boolean).map(url => {
      const vid = ytId(url);
      return vid ? `<div class="vid-embed"><iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen loading="lazy"></iframe></div>` : "";
    }).join("") : "";
    const qs = m.quiz ? Object.values(m.quiz) : [];
    const quizH = qs.length ? renderQuizMod(qs, mid) : "";
    const view = document.getElementById("mod-view");
    if (!view) return;
    view.innerHTML = `
      ${capaH}
      <div class="mod-view-meta">
        ${m.oficial ? '<div class="mod-oficial" style="display:inline-flex;margin-bottom:.5rem"><span class="material-icons-round">verified</span> Oficial</div>' : ""}
        <div class="mod-mat-tag">${esc(m.materia || "Geral")}</div>
        <div class="mod-view-tit">${esc(m.titulo)}</div>
        <div class="mod-view-autor"><img src="${esc(m.autorFoto || avDefault(m.autorNome))}" alt=""/><span>por ${esc(m.autorNome || "Anônimo")}</span></div>
        ${m.descricao ? `<div class="mod-view-desc">${esc(m.descricao)}</div>` : ""}
      </div>
      ${m.conteudo ? `<div class="mod-sec"><h3><span class="material-icons-round">article</span> Conteúdo</h3><div class="mod-txt">${esc(m.conteudo)}</div></div>` : ""}
      ${vids ? `<div class="mod-sec"><h3><span class="material-icons-round">play_circle</span> Vídeos</h3>${vids}</div>` : ""}
      ${quizH ? `<div class="mod-sec"><h3><span class="material-icons-round">quiz</span> Quiz</h3>${quizH}</div>` : ""}`;
    respostasQuiz = {};
    openModal("m-ver-mod");
  } catch(e) { toast("Erro ao abrir módulo: " + e.message, "err"); }
};

function renderQuizMod(qs, mid) {
  return `<div id="qmod-${esc(mid)}">
    ${qs.map((q, qi) => `
      <div class="quiz-q" id="qm-${esc(mid)}-${qi}">
        <div class="quiz-q-txt">${qi+1}. ${esc(q.enunciado)}</div>
        <div class="quiz-opts">
          ${(q.opcoes||[]).map((op, oi) => `
            <button class="quiz-opt-btn" id="qmb-${esc(mid)}-${qi}-${oi}" onclick="respMod('${esc(mid)}',${qi},${oi},${q.correta})">
              ${"ABCD"[oi]}) ${esc(op)}
            </button>`).join("")}
        </div>
        <div id="qmf-${esc(mid)}-${qi}"></div>
      </div>`).join("")}
    <div id="qmr-${esc(mid)}" style="display:none"></div>
  </div>`;
}

window.respMod = async function(mid, qi, sel, correta) {
  const prefix = `qmb-${mid}-${qi}-`;
  document.querySelectorAll(`[id^="${prefix}"]`).forEach(b => { b.disabled = true; });
  const bs = document.getElementById(`${prefix}${sel}`);
  const bc = document.getElementById(`${prefix}${correta}`);
  const fb = document.getElementById(`qmf-${mid}-${qi}`);
  const ok = sel === correta;
  if (bs) bs.classList.add(ok ? "certa" : "errada");
  if (bc && !ok) bc.classList.add("certa");
  if (fb) fb.innerHTML = `<span class="quiz-fb ${ok?"ok":"fail"}">${ok?"Correto!":"Errado"}</span>`;
  respostasQuiz[qi] = ok;
  if (ok) await addXP(10, "acertar_questao");
  const totalQt = document.querySelectorAll(`#qmod-${mid} .quiz-q`).length;
  const respondidas = Object.keys(respostasQuiz).length;
  if (respondidas >= totalQt) {
    const acertos = Object.values(respostasQuiz).filter(v => v).length;
    const res = document.getElementById(`qmr-${mid}`);
    if (res) {
      res.style.display = "block";
      res.innerHTML = `<div class="quiz-res"><h3>${acertos}/${totalQt} corretas</h3><p>${acertos === totalQt ? "Módulo concluído!" : "Tente novamente."}</p><span class="xp-tag">${acertos === totalQt ? "+50 XP de bônus" : "Sem bônus"}</span></div>`;
    }
    if (acertos === totalQt) {
      await addXP(50, "completar_modulo");
      try { await set(ref(db, `progresso/${EU?.uid}/modulos/${mid}`), { concluidoEm: Date.now(), acertos, total: totalQt }); } catch(e) {}
    }
  }
};

function renderMeusModulos(snapMods) {
  const g = document.getElementById("meus-mods");
  if (!g || !EU) return;
  const meus = [];
  snapMods.forEach(c => { if (c.val().autorId === EU.uid) meus.push({ id: c.key, ...c.val() }); });
  if (!meus.length) {
    g.innerHTML = '<div class="vazio"><span class="material-icons-round">layers</span><p>Você ainda não criou módulos.</p></div>';
    return;
  }
  g.innerHTML = meus.map(m => `
    <div class="mod-card" onclick="verMod('${esc(m.id)}')">
      <div class="mod-capa">${m.capaURL ? `<img src="${esc(m.capaURL)}" alt="" loading="lazy"/>` : matEmoji(m.materia)}</div>
      <div class="mod-corpo">
        <span class="mod-mat-tag">${esc(m.materia || "Geral")}</span>
        <div class="mod-tit">${esc(m.titulo)}</div>
      </div>
    </div>`).join("");
}

window.prevCapa = async function(inp) {
  if (!inp.files[0]) return;
  capaImg64 = await toBase64(inp.files[0]);
  const p = document.getElementById("capa-prev");
  const s = document.getElementById("capa-span");
  if (p) { p.src = capaImg64; p.style.display = "block"; }
  if (s) s.style.display = "none";
};

window.addVideo = function() {
  const w = document.createElement("div");
  w.className = "video-row";
  w.innerHTML = `<input type="text" class="video-in" placeholder="Cole a URL do YouTube..."/>
    <button class="btn-icon-sm" onclick="this.closest('.video-row').remove()"><span class="material-icons-round">remove</span></button>`;
  document.getElementById("videos-wrap")?.appendChild(w);
};

window.addQuestao = function() {
  const idx = Date.now() + Math.floor(Math.random() * 1000);
  const b = document.createElement("div");
  b.className = "q-bloco";
  b.dataset.q = idx;
  b.innerHTML = `
    <div class="q-topo">
      <input type="text" class="q-in" placeholder="Enunciado da pergunta..."/>
      <button class="btn-icon-sm" onclick="this.closest('.q-bloco').remove()"><span class="material-icons-round">delete</span></button>
    </div>
    <div class="opts-wrap">
      ${[0,1,2,3].map(i => `
        <div class="opt-row">
          <input type="radio" name="qc-${idx}" value="${i}" ${i===0?"checked":""}/>
          <input type="text" class="opt-in" placeholder="Alternativa ${"ABCD"[i]}${i===0?" (correta)":""}"/>
        </div>`).join("")}
    </div>`;
  document.getElementById("quiz-wrap")?.appendChild(b);
};

window.salvarModulo = async function() {
  const tit = document.getElementById("mod-tit")?.value.trim();
  const mat = document.getElementById("mod-mat")?.value;
  if (!tit) { toast("Informe o título do módulo.", "err"); return; }
  if (!mat) { toast("Selecione a matéria.", "err"); return; }
  if (!EU || !PERFIL) return;
  const btn = document.getElementById("btn-salvar-mod");
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span> Salvando...';
  try {
    let capaURL = null;
    if (capaImg64) { toast("Enviando capa..."); capaURL = await uploadImgBB(capaImg64); }
    const videos = {};
    document.querySelectorAll(".video-in").forEach((inp, i) => { if (inp.value.trim()) videos[i] = inp.value.trim(); });
    const quiz = {};
    let qi = 0;
    document.querySelectorAll("#quiz-wrap .q-bloco").forEach(bloco => {
      const en = bloco.querySelector(".q-in")?.value.trim();
      if (!en) return;
      const opts = [];
      bloco.querySelectorAll(".opt-in").forEach(i => opts.push(i.value.trim()));
      const rSel = bloco.querySelector("input[type=radio]:checked");
      const corr = rSel ? parseInt(rSel.value) : 0;
      quiz[qi++] = { enunciado: en, opcoes: opts, correta: corr };
    });
    await push(ref(db, "modulos"), {
      titulo: tit, descricao: document.getElementById("mod-desc")?.value.trim() || "",
      materia: mat, conteudo: document.getElementById("mod-cont")?.value.trim() || "",
      capaURL, videos, quiz, autorId: EU.uid, autorNome: PERFIL.nome || "Estudante",
      autorFoto: PERFIL.foto || "", oficial: false, acessos: 0, criadoEm: Date.now()
    });
    await addXP(20, "criar_modulo");
    toast("Módulo criado! +20 XP", "ok");
    closeModal("m-mod");
    resetFormModulo();
  } catch(e) {
    toast("Erro ao salvar: " + e.message, "err");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">save</span> Salvar módulo';
  }
};

function resetFormModulo() {
  ["mod-tit","mod-desc","mod-cont"].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.value = "";
  });
  const sel = document.getElementById("mod-mat"); if (sel) sel.value = "";
  const cp = document.getElementById("capa-prev"); if (cp) { cp.src = ""; cp.style.display = "none"; }
  const cs = document.getElementById("capa-span"); if (cs) cs.style.display = "";
  const vw = document.getElementById("videos-wrap");
  if (vw) vw.innerHTML = `<div class="video-row"><input type="text" class="video-in" placeholder="Cole a URL do YouTube..."/><button class="btn-icon-sm" onclick="addVideo()"><span class="material-icons-round">add</span></button></div>`;
  const qw = document.getElementById("quiz-wrap"); if (qw) qw.innerHTML = "";
  capaImg64 = null;
}

// ============ TRILHA ============

async function carregarTrilha() {
  const tr = document.getElementById("trilha");
  if (!tr) return;
  tr.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando trilha...</p></div>';
  const xp = PERFIL?.xp || 0;
  let fases = [...FASES];
  try {
    const sa = await get(ref(db, "fases_admin"));
    if (sa.exists()) sa.forEach(c => {
      const f = { id: c.key, ...c.val() };
      if (!fases.find(x => x.id === f.id)) fases.push(f);
    });
  } catch(e) {}
  let conc = {};
  try {
    const sp = await get(ref(db, `progresso/${EU?.uid}/fases`));
    if (sp.exists()) conc = sp.val();
  } catch(e) {}
  const nv = nivel(xp); const pg = progXP(xp);
  const eNT = document.getElementById("nivel-txt"); if (eNT) eNT.textContent = "Nível " + nv;
  const eNX = document.getElementById("nivel-xp-info"); if (eNX) eNX.textContent = pg + "/100 XP";
  const eBa = document.getElementById("xp-barra"); if (eBa) eBa.style.width = pg + "%";
  const grupos = [];
  for (let i = 0; i < fases.length; i += 5) grupos.push(fases.slice(i, i+5));
  tr.innerHTML = grupos.map((grupo, gi) => {
    const nosHTML = grupo.map((f, fi) => {
      const idx = gi * 5 + fi;
      const done = !!conc[f.id];
      const prevDone = idx === 0 || !!conc[fases[idx-1]?.id];
      const disp = !done && xp >= f.xpReq && prevDone;
      const trav = !done && !disp;
      const cls = trav ? "trav" : done ? "conc" : "disp";
      const ests = done ? "Concluída" : disp ? "Disponível" : "Bloqueada";
      const pos = POSICOES[idx % POSICOES.length] || "cen";
      const con = idx > 0 ? `<div class="conector ${conc[fases[idx-1]?.id] ? "feito" : "normal"}"></div>` : "";
      return `${con}<div class="no-wrap ${pos}"><div class="fase-no" onclick="verFase('${f.id}')"><button class="fase-circulo ${cls}" ${trav ? "disabled" : ""} title="${esc(f.tit)}">${f.em}</button><span class="fase-lbl">${esc(f.tit)}</span><span class="fase-ests">${ests}</span></div></div>`;
    }).join("");
    return `<div class="trilha-sec"><div style="text-align:center;margin-bottom:1rem"><span class="trilha-sec-tit">Seção ${gi+1}</span></div><div style="display:flex;justify-content:center"><div class="trilha-nos">${nosHTML}</div></div></div>`;
  }).join("");
}

window.verFase = async function(fid) {
  const f = FASES.find(x => x.id === fid);
  if (!f) return;
  const xp = PERFIL?.xp || 0;
  let done = false, prevDone = true;
  try {
    const sc = await get(ref(db, `progresso/${EU?.uid}/fases/${fid}`));
    done = sc.exists();
    const idx = FASES.indexOf(f);
    if (idx > 0) {
      const sp = await get(ref(db, `progresso/${EU?.uid}/fases/${FASES[idx-1].id}`));
      prevDone = sp.exists();
    }
  } catch(e) {}
  const disp = xp >= f.xpReq && prevDone;
  const trav = !done && !disp;
  const difN = ["","Iniciante","Básico","Intermediário","Avançado","Expert"][f.dif] || "";
  document.getElementById("fase-corpo").innerHTML = `
    <div class="fase-dh">
      <span class="fase-dh-em">${f.em}</span>
      <div class="fase-dh-tit">${esc(f.tit)}</div>
      <div class="fase-dh-sub">${esc(f.mat)} · ${difN}</div>
      <div class="fase-dh-xp"><span class="material-icons-round">bolt</span>+${f.xpP} XP ao concluir</div>
      ${done ? '<div style="margin-top:.5rem;font-size:1.2rem;font-weight:600;color:var(--ok)">Concluída</div>' : ""}
    </div>
    ${trav ? `<div class="fase-trav-info"><span class="material-icons-round">lock</span><p>Você precisa de <strong>${f.xpReq} XP</strong> para desbloquear.<br>Você tem <strong>${xp} XP</strong>.</p></div>` : ""}`;
  const rod = document.getElementById("fase-footer");
  if (trav) {
    rod.innerHTML = `<button class="btn-prim" style="background:var(--borda);color:var(--mt);cursor:not-allowed">Fase bloqueada</button>`;
  } else {
    const lbl = done ? "Refazer fase" : "Iniciar fase";
    rod.innerHTML = `<button class="btn-prim" onclick="closeModal('m-fase');abrirQuizFase('${fid}')"><span class="material-icons-round">${done?"replay":"play_arrow"}</span> ${lbl}</button>`;
  }
  openModal("m-fase");
};

window.abrirQuizFase = async function(fid) {
  const f = FASES.find(x => x.id === fid);
  if (!f) return;
  const titEl = document.getElementById("quiz-fase-tit");
  if (titEl) titEl.textContent = f.em + " " + f.tit;
  const body = document.getElementById("quiz-fase-body");
  body.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando questões...</p></div>';
  openModal("m-quiz-fase");
  let qs = [];
  try {
    const snap = await get(ref(db, `fases_questoes/${fid}`));
    if (snap.exists()) snap.forEach(c => qs.push({ id: c.key, ...c.val() }));
  } catch(e) {}
  if (!qs.length) {
    body.innerHTML = '<div class="vazio"><span class="material-icons-round">quiz</span><p>Esta fase ainda não tem questões.<br>Peça ao admin para adicioná-las.</p></div>';
    return;
  }
  respostasQuiz = {};
  body.innerHTML = `
    <p style="font-size:.8rem;color:var(--mt);margin-bottom:1rem">${qs.length} pergunta${qs.length!==1?"s":""}</p>
    ${qs.map((q, qi) => `
      <div class="quiz-q" id="fq-${qi}">
        <div class="quiz-q-txt">${qi+1}. ${esc(q.enunciado)}</div>
        <div class="quiz-opts" id="fqops-${qi}">
          ${(q.opcoes||[]).map((op, oi) => `
            <button class="quiz-opt-btn" id="fqb-${qi}-${oi}" onclick="respFase(${qi},${oi},${q.correta},'${fid}',${qs.length},${f.xpP})">${"ABCD"[oi]}) ${esc(op)}</button>`).join("")}
        </div>
        <div id="ffb-${qi}"></div>
      </div>`).join("")}
    <div id="fres" style="display:none"></div>`;
};

window.respFase = async function(qi, sel, correta, fid, total, xpP) {
  const opsDiv = document.getElementById(`fqops-${qi}`);
  if (opsDiv) opsDiv.querySelectorAll(".quiz-opt-btn").forEach(b => { b.disabled = true; });
  const bs = document.getElementById(`fqb-${qi}-${sel}`);
  const bc = document.getElementById(`fqb-${qi}-${correta}`);
  const fb = document.getElementById(`ffb-${qi}`);
  const ok = sel === correta;
  if (bs) bs.classList.add(ok ? "certa" : "errada");
  if (bc && !ok) bc.classList.add("certa");
  if (fb) fb.innerHTML = `<span class="quiz-fb ${ok?"ok":"fail"}">${ok?"Correto!":"Errado"}</span>`;
  respostasQuiz[qi] = ok;
  if (ok) await addXP(10, "acertar_questao");
  const respondidas = Object.keys(respostasQuiz).length;
  if (respondidas >= total) {
    const acertos = Object.values(respostasQuiz).filter(v => v).length;
    const res = document.getElementById("fres");
    if (res) {
      res.style.display = "block";
      res.innerHTML = `<div class="quiz-res"><h3>${acertos}/${total} corretas</h3><p>${acertos === total ? "Fase concluída!" : "Tente novamente."}</p><span class="xp-tag">${acertos === total ? "+"+xpP+" XP de bônus" : "Sem bônus"}</span></div>`;
    }
    if (acertos === total) {
      await addXP(xpP, "completar_fase");
      try { await set(ref(db, `progresso/${EU?.uid}/fases/${fid}`), { concluidoEm: Date.now(), acertos, total }); } catch(e) {}
      toast(`Fase concluída! +${xpP} XP`, "ok");
      setTimeout(() => carregarTrilha(), 500);
    }
  }
};

// ============ MISSÕES ============

async function carregarMissoes() {
  const lista = document.getElementById("lista-missoes");
  const strip = document.getElementById("missoes-strip");
  if (!lista) return;
  lista.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando...</p></div>';
  try {
    const [smis, sprog] = await Promise.all([
      get(ref(db, "missoes")),
      get(ref(db, `progresso/${EU?.uid}/missoes`))
    ]);
    if (!smis.exists()) {
      lista.innerHTML = '<div class="vazio"><span class="material-icons-round">emoji_events</span><p>Nenhuma missão disponível ainda.</p></div>';
      if (strip) strip.innerHTML = "";
      return;
    }
    const prog = sprog.exists() ? sprog.val() : {};
    const missoes = [];
    smis.forEach(c => missoes.push({ id: c.key, ...c.val() }));
    let pendentes = 0;
    lista.innerHTML = missoes.map(m => {
      const pr = prog[m.id] || { atual: 0, concluida: false };
      const pct = Math.min(100, Math.round(((pr.atual||0) / m.meta) * 100));
      if (!pr.concluida) pendentes++;
      return `<div class="missao-card">
        <div class="missao-topo">
          <div class="missao-ico" style="background:${m.corFundo||"var(--TL)"}">${m.emoji||"🎯"}</div>
          <div class="missao-info"><h4>${esc(m.titulo)}</h4><p>${esc(m.descricao||"")}</p></div>
          <div class="missao-xp"><span class="material-icons-round">bolt</span>+${m.xpPremio||100} XP</div>
        </div>
        ${pr.concluida ? `<div class="missao-badge"><span class="material-icons-round">check_circle</span> Concluída!</div>` : `<div class="missao-bw"><div class="missao-bf" style="width:${pct}%"></div></div><div class="missao-pct">${pr.atual||0}/${m.meta} · ${pct}%</div>`}
      </div>`;
    }).join("");
    const badge = document.getElementById("nav-badge");
    if (badge) { badge.textContent = pendentes; badge.style.display = pendentes > 0 ? "flex" : "none"; }
    if (strip) {
      const ativas = missoes.filter(m => !(prog[m.id]?.concluida)).slice(0, 4);
      strip.innerHTML = ativas.map(m => {
        const pr = prog[m.id] || { atual: 0 };
        const pct = Math.min(100, Math.round(((pr.atual||0) / m.meta) * 100));
        return `<div class="missao-mini" onclick="irAba('missoes')"><div class="missao-mini-tit">${m.emoji||"🎯"} ${esc(m.titulo)}</div><div class="missao-mini-bw"><div class="missao-mini-bf" style="width:${pct}%"></div></div><div class="missao-mini-txt">${pr.atual||0}/${m.meta}</div></div>`;
      }).join("");
    }
  } catch(e) {
    lista.innerHTML = `<div class="vazio"><span class="material-icons-round">error</span><p>Erro ao carregar missões.</p></div>`;
  }
}

async function verificarMissoes(acao) {
  if (!EU) return;
  try {
    const [smis, sprog] = await Promise.all([
      get(ref(db, "missoes")),
      get(ref(db, `progresso/${EU.uid}/missoes`))
    ]);
    if (!smis.exists()) return;
    const prog = sprog.exists() ? sprog.val() : {};
    const upd = {};
    smis.forEach(c => {
      const m = { id: c.key, ...c.val() };
      const pr = prog[m.id] || { atual: 0, concluida: false };
      if (pr.concluida || m.acao !== acao) return;
      const novoAt = (pr.atual||0) + 1;
      const concl = novoAt >= m.meta;
      upd[m.id] = { atual: novoAt, concluida: concl };
      if (concl) {
        addXP(m.xpPremio || 100, null);
        toast(`Missão: ${m.titulo}! +${m.xpPremio} XP`, "ok");
        push(ref(db, `usuarios/${EU.uid}/notificacoes`), { tipo: "missao", titulo: "Missão concluída!", msg: m.titulo + " - +" + (m.xpPremio||100) + " XP", lida: false, criadoEm: Date.now() }).catch(() => {});
        if (m.medalha) {
          set(ref(db, `usuarios/${EU.uid}/medalhas/${m.id}`), { nome: m.medalha, em: Date.now() }).catch(() => {});
        }
      }
    });
    if (Object.keys(upd).length) await update(ref(db, `progresso/${EU.uid}/missoes`), upd);
  } catch(e) {}
}

// ============ RANKING ============

async function carregarRanking() {
  const podio = document.getElementById("podio");
  const lista = document.getElementById("lista-rank");
  if (!podio || !lista) return;
  lista.innerHTML = '<div class="load-box"><div class="spin"></div><p>Carregando...</p></div>';
  try {
    const snap = await get(ref(db, "usuarios"));
    const us = [];
    snap.forEach(c => { const d = c.val(); if (!d.banido) us.push({ uid: c.key, ...d }); });
    us.sort((a, b) => (b.xp||0) - (a.xp||0));
    const top3 = us.slice(0, 3);
    const resto = us.slice(3, 20);
    const ord = [{ u: top3[1], p: "p2", crown: "2º" }, { u: top3[0], p: "p1", crown: "1º" }, { u: top3[2], p: "p3", crown: "3º" }].filter(x => x.u);
    podio.innerHTML = ord.map(({ u, p, crown }) => `
      <div class="podio-item ${p}">
        <span class="podio-crown">${crown}</span>
        <img class="podio-av" src="${esc(u.foto || avDefault(u.nome))}" alt="${esc(u.nome)}"/>
        <span class="podio-nome">${esc((u.nome||"?").split(" ")[0])}</span>
        <span class="podio-xp">${u.xp||0} XP</span>
        <div class="podio-plat">${p==="p1"?"1º":p==="p2"?"2º":"3º"}</div>
      </div>`).join("");
    if (!resto.length) {
      lista.innerHTML = '<p style="text-align:center;color:var(--mt);padding:1.5rem;font-size:.85rem">Estude mais para aparecer aqui!</p>';
    } else {
      lista.innerHTML = resto.map((u, i) => `
        <div class="rank-item ${u.uid === EU?.uid ? "meu" : ""}">
          <span class="rank-pos">${i+4}º</span>
          <img src="${esc(u.foto || avDefault(u.nome))}" alt=""/>
          <div class="rank-info"><strong>${esc(u.nome || "Anônimo")}</strong><small>Nível ${nivel(u.xp)}</small></div>
          <span class="rank-xp">${u.xp||0} XP</span>
        </div>`).join("");
    }
  } catch(e) {
    lista.innerHTML = `<div class="vazio"><span class="material-icons-round">error</span><p>Erro ao carregar ranking.<br><small>${esc(e.message)}</small></p></div>`;
  }
}

// ============ NOTIFICAÇÕES ============

function carregarNotificacoes() {
  if (!EU) return;
  if (notifUnSub) notifUnSub();
  const notifRef = ref(db, `usuarios/${EU.uid}/notificacoes`);
  notifUnSub = onValue(notifRef, snap => {
    const lista = document.getElementById("lista-notifs");
    const badge = document.getElementById("notif-badge");
    if (!lista) return;
    const notifs = [];
    snap.forEach(c => notifs.push({ id: c.key, ...c.val() }));
    notifs.sort((a, b) => (b.criadoEm || b.ts || 0) - (a.criadoEm || a.ts || 0));
    const naoLidas = notifs.filter(n => !n.lida).length;
    if (badge) { badge.textContent = naoLidas; badge.style.display = naoLidas > 0 ? "flex" : "none"; }
    if (!notifs.length) {
      lista.innerHTML = '<div class="vazio"><span class="material-icons-round">notifications_none</span><p>Nenhuma notificação.</p></div>';
      return;
    }
    lista.innerHTML = notifs.map(n => `
      <div class="notif-item ${!n.lida ? 'nao-lida' : ''}" onclick="marcarNotifLida('${n.id}')">
        <div class="notif-ico">${n.tipo === 'aviso' ? '📢' : n.tipo === 'missao' ? '🎯' : '🔔'}</div>
        <div class="notif-body"><strong>${esc(n.titulo || "Notificação")}</strong><p>${esc(n.msg || n.mensagem || "")}</p><small>${ago(n.criadoEm || n.ts)}</small></div>
      </div>`).join("");
  });
}

window.marcarNotifLida = async function(nid) {
  if (!EU) return;
  try { await update(ref(db, `usuarios/${EU.uid}/notificacoes/${nid}`), { lida: true }); } catch(e) {}
};

// ============ AVISO GLOBAL ============

async function carregarAviso() {
  try {
    const snap = await get(ref(db, "avisos"));
    if (!snap.exists()) return;
    const avisos = [];
    snap.forEach(c => avisos.push({ id: c.key, ...c.val() }));
    avisos.sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    const a = avisos[0];
    if (!a || !a.ativo) return;
    const box = document.getElementById("aviso-box");
    const t = document.getElementById("aviso-titulo");
    const m = document.getElementById("aviso-msg");
    if (box && t && m) {
      t.textContent = a.titulo || "Aviso";
      m.textContent = a.mensagem || "";
      box.style.display = "flex";
    }
  } catch(e) {}
}

// ============ PERFIL ============

window.salvarPerfil = async function() {
  const nome = document.getElementById("edit-nome")?.value.trim();
  const bio = document.getElementById("edit-bio")?.value.trim();
  if (!nome) { toast("Nome não pode ser vazio.", "err"); return; }
  if (!EU) return;
  try {
    await update(ref(db, `usuarios/${EU.uid}`), { nome, bio });
    PERFIL.nome = nome; PERFIL.bio = bio;
    atualizarHeader(); atualizarPerfilUI();
    closeModal("m-edit-pf");
    toast("Perfil atualizado!", "ok");
  } catch(e) { toast("Erro: " + e.message, "err"); }
};

window.trocarFoto = async function(inp) {
  if (!inp.files[0] || !EU) return;
  const btn = document.querySelector(".pf-av-edit");
  if (btn) btn.innerHTML = '<span class="material-icons-round" style="animation:girar .7s linear infinite;font-size:12px">refresh</span>';
  try {
    const b64 = await toBase64(inp.files[0]);
    toast("Enviando foto...");
    const url = await uploadImgBB(b64);
    await update(ref(db, `usuarios/${EU.uid}`), { foto: url });
    PERFIL.foto = url;
    atualizarHeader(); atualizarPerfilUI();
    toast("Foto atualizada!", "ok");
  } catch(e) { toast("Erro ao enviar foto: " + e.message, "err"); }
  finally { if (btn) btn.innerHTML = '<span class="material-icons-round">photo_camera</span>'; }
};
