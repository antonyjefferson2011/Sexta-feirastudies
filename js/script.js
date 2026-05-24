// ============================================================
//  SEXTA FEIRA STUDIES — script.js
//  Firebase Modular + ImgBB + Feed + Módulos + Quiz + Ranking
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, push, set, get, update, onValue, serverTimestamp, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---- CONFIG FIREBASE ----
const firebaseConfig = {
  apiKey: "AIzaSyBAs3irtV6MuTPHmsxYwYSFMTkX6_6ntz8",
  authDomain: "sexta-feira-fb01a.firebaseapp.com",
  databaseURL: "https://sexta-feira-fb01a-default-rtdb.firebaseio.com",
  projectId: "sexta-feira-fb01a",
  storageBucket: "sexta-feira-fb01a.firebasestorage.app",
  messagingSenderId: "82809140147",
  appId: "1:82809140147:web:2a3f3ece3e81c33b0b91c6",
  measurementId: "G-DEZ5ZESQH7"
};

const app   = initializeApp(firebaseConfig);
const auth  = getAuth(app);
const db    = getDatabase(app);
const provider = new GoogleAuthProvider();

// ---- IMGBB CONFIG ----
const IMGBB_KEY = "86427cccd2a94fb42a0754ffd7f19e79";

// ---- STATE ----
let currentUser  = null;
let currentUserData = null;
let currentPostId = null;
let postImageBase64 = null;
let currentModuleFilter = "Todos";
let quizCount = 1;
let feedListener = null;

// ============================================================
// UTILITÁRIOS
// ============================================================

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("screen-" + id).classList.add("active");
}

function showTab(tab) {
  document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
}

function switchTab(tab, btn) {
  showTab(tab);
  document.querySelectorAll(".nav-item[data-tab]").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  if (tab === "ranking") loadRanking();
  if (tab === "perfil") loadMyModulos();
}

window.switchTab = switchTab;

function openModal(id) {
  const m = document.getElementById(id);
  m.classList.add("open");
  m.style.display = "flex";
  if (id === "modal-create-post") {
    document.getElementById("post-author-avatar").src = currentUserData?.photoURL || "";
    document.getElementById("post-author-name").textContent = currentUserData?.name || "Você";
  }
  if (id === "modal-edit-profile") {
    document.getElementById("edit-name").value = currentUserData?.name || "";
    document.getElementById("edit-bio").value  = currentUserData?.bio || "";
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  m.classList.remove("open");
  setTimeout(() => { m.style.display = "none"; }, 300);
}

window.openModal  = openModal;
window.closeModal = closeModal;

function showToast(msg, type = "") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (type ? " " + type : "");
  setTimeout(() => { t.className = "toast"; }, 3000);
}

function formatTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60)  return "agora";
  if (diff < 3600) return Math.floor(diff/60) + "min";
  if (diff < 86400) return Math.floor(diff/3600) + "h";
  return Math.floor(diff/86400) + "d";
}

function extractYoutubeId(url) {
  const r = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const m = url.match(r);
  return m ? m[1] : null;
}

async function uploadToImgBB(base64) {
  const form = new FormData();
  form.append("image", base64.split(",")[1]);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: form });
  const json = await res.json();
  if (json.success) return json.data.url;
  throw new Error("ImgBB upload falhou");
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function levelFromXP(xp) {
  return Math.floor(xp / 100) + 1;
}

function progressPct(xp) {
  return ((xp % 100) / 100) * 100;
}

// ============================================================
// AUTH — Google + Email/Senha + Criar Conta
// ============================================================

// Traduz erros do Firebase para português
function traduzErroFirebase(code) {
  const map = {
    "auth/user-not-found":       "E-mail não encontrado. Crie uma conta primeiro.",
    "auth/wrong-password":       "Senha incorreta. Tente novamente.",
    "auth/invalid-credential":   "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado. Faça login.",
    "auth/weak-password":        "Senha muito fraca. Use pelo menos 6 caracteres.",
    "auth/invalid-email":        "E-mail inválido.",
    "auth/too-many-requests":    "Muitas tentativas. Aguarde um momento.",
    "auth/popup-closed-by-user": "Login cancelado.",
    "auth/network-request-failed": "Sem conexão. Verifique sua internet.",
  };
  return map[code] || "Erro: " + code;
}

function showAuthError(panelId, msg) {
  const el = document.getElementById(panelId + "-error");
  if (!el) return;
  el.textContent = "⚠️ " + msg;
  el.style.display = "flex";
}
function clearAuthError(panelId) {
  const el = document.getElementById(panelId + "-error");
  if (el) el.style.display = "none";
}

// Alternar tabs login / cadastro
window.switchAuthTab = function(tab) {
  document.getElementById("auth-panel-login").style.display    = tab === "login"    ? "block" : "none";
  document.getElementById("auth-panel-register").style.display = tab === "register" ? "block" : "none";
  document.getElementById("tab-login-btn").classList.toggle("active",    tab === "login");
  document.getElementById("tab-register-btn").classList.toggle("active", tab === "register");
  clearAuthError("login");
  clearAuthError("register");
};

// Mostrar/ocultar senha
window.togglePass = function(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector(".material-icons-round");
  if (input.type === "password") {
    input.type = "text";
    icon.textContent = "visibility_off";
  } else {
    input.type = "password";
    icon.textContent = "visibility";
  }
};

// Login com Google
async function loginComGoogle() {
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged cuida do resto
  } catch (e) {
    showToast(traduzErroFirebase(e.code), "error");
  }
}
document.getElementById("btn-google-login").addEventListener("click", loginComGoogle);
document.getElementById("btn-google-register").addEventListener("click", loginComGoogle);

// Login com e-mail
window.loginEmail = async function() {
  clearAuthError("login");
  const email = document.getElementById("login-email").value.trim();
  const senha  = document.getElementById("login-senha").value;
  if (!email || !senha) { showAuthError("login", "Preencha e-mail e senha."); return; }

  const btn = document.getElementById("btn-email-login");
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Entrando...';

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    // onAuthStateChanged cuida do resto
  } catch(e) {
    showAuthError("login", traduzErroFirebase(e.code));
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">login</span> Entrar';
  }
};

// Criar conta com e-mail
window.registerEmail = async function() {
  clearAuthError("register");
  const nome     = document.getElementById("reg-nome").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const senha    = document.getElementById("reg-senha").value;
  const confirma = document.getElementById("reg-confirma").value;

  if (!nome)              { showAuthError("register", "Informe seu nome."); return; }
  if (!email)             { showAuthError("register", "Informe seu e-mail."); return; }
  if (senha.length < 6)   { showAuthError("register", "Senha precisa ter pelo menos 6 caracteres."); return; }
  if (senha !== confirma) { showAuthError("register", "As senhas não coincidem."); return; }

  const btn = document.getElementById("btn-email-register");
  btn.disabled = true;
  btn.innerHTML = '<span class="material-icons-round">hourglass_empty</span> Criando conta...';

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, senha);
    // Atualiza o displayName no Firebase Auth
    await updateProfile(cred.user, { displayName: nome });
    // onAuthStateChanged cuida do resto (já vai chamar ensureUserProfile com displayName correto)
  } catch(e) {
    showAuthError("register", traduzErroFirebase(e.code));
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">person_add</span> Criar minha conta';
  }
};

// Observador de autenticação
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    await ensureUserProfile(user);
    await loadUserData();
    // Garante que currentUserData está carregado antes de qualquer UI update
    if (!currentUserData) {
      showToast("Erro ao carregar dados do usuário.", "error");
      return;
    }
    initApp();
    showScreen("app");
  } else {
    currentUser     = null;
    currentUserData = null;
    if (feedListener) { feedListener(); feedListener = null; }
    // Resetar botões de login caso estivessem travados
    const bl = document.getElementById("btn-email-login");
    const br = document.getElementById("btn-email-register");
    if (bl) { bl.disabled = false; bl.innerHTML = '<span class="material-icons-round">login</span> Entrar'; }
    if (br) { br.disabled = false; br.innerHTML = '<span class="material-icons-round">person_add</span> Criar minha conta'; }
    showScreen("login");
  }
});

async function ensureUserProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);
  const snap    = await get(userRef);
  if (!snap.exists()) {
    await set(userRef, {
      name:      user.displayName || "Estudante",
      email:     user.email       || "",
      photoURL:  user.photoURL    || "",
      bio:       "Olá! Estou estudando no Sexta Feira Studies.",
      xp:        0,
      streak:    0,
      lastStudy: null,
      createdAt: serverTimestamp()
    });
  }
}

async function loadUserData() {
  const snap = await get(ref(db, `users/${currentUser.uid}`));
  if (!snap.exists()) return;
  currentUserData     = snap.val();
  currentUserData.uid = currentUser.uid;
}

async function handleLogout() {
  await signOut(auth);
}
window.handleLogout = handleLogout;

// ============================================================
// INIT APP
// ============================================================

function initApp() {
  updateHeaderUI();
  updateProfileUI();
  loadFeed();
  loadModulos();
  checkStreak();
}

function updateHeaderUI() {
  const d = currentUserData;
  if (!d) return;

  const elXP      = document.getElementById("xp-count");
  const elStreak  = document.getElementById("streak-count");
  const elGreet   = document.getElementById("greeting-name");
  const elRing    = document.getElementById("ring-fill");
  const elLabel   = document.getElementById("ring-label");
  const elAvatar  = document.getElementById("header-avatar-img");

  const ph = d.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name||"S")}&background=00C9B1&color=fff`;

  if (elXP)     elXP.textContent     = (d.xp || 0) + " XP";
  if (elStreak) elStreak.textContent = d.streak || 0;
  if (elGreet)  elGreet.textContent  = (d.name || "Estudante").split(" ")[0];
  if (elAvatar) elAvatar.src = ph;

  // Progress ring
  const pct  = progressPct(d.xp || 0);
  const circ = 150.8;
  if (elRing)  elRing.style.strokeDashoffset = circ - (circ * pct / 100);
  if (elLabel) elLabel.textContent = Math.round(pct) + "%";

  // Avatares do feed
  const cpA = document.getElementById("create-post-avatar");
  const coA = document.getElementById("comment-avatar");
  const paA = document.getElementById("post-author-avatar");
  if (cpA) cpA.src = ph;
  if (coA) coA.src = ph;
  if (paA) paA.src = ph;
}

function updateProfileUI() {
  const d = currentUserData;
  if (!d) return;
  const ph = d.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name||"S")}&background=00C9B1&color=fff`;
  const elImg   = document.getElementById("profile-avatar-img");
  const elName  = document.getElementById("profile-name");
  const elBio   = document.getElementById("profile-bio-text");
  const elXP    = document.getElementById("stat-xp");
  const elNivel = document.getElementById("stat-nivel");
  const elStr   = document.getElementById("stat-streak");
  if (elImg)   elImg.src             = ph;
  if (elName)  elName.textContent    = d.name || "Estudante";
  if (elBio)   elBio.textContent     = d.bio  || "Sem bio ainda.";
  if (elXP)    elXP.textContent      = d.xp   || 0;
  if (elNivel) elNivel.textContent   = levelFromXP(d.xp || 0);
  if (elStr)   elStr.textContent     = d.streak || 0;
}

function checkStreak() {
  const d = currentUserData;
  const banner = document.getElementById("streak-banner");
  document.getElementById("streak-banner-val").textContent = d?.streak || 0;
  if (!d?.streak || d.streak === 0) banner.style.display = "none";
  else banner.style.display = "flex";
}

// ============================================================
// FEED
// ============================================================

function loadFeed() {
  const feedRef = query(ref(db, "posts"), orderByChild("createdAt"), limitToLast(30));
  if (feedListener) feedListener();
  feedListener = onValue(feedRef, snap => {
    const posts = [];
    snap.forEach(child => posts.unshift({ id: child.key, ...child.val() }));
    renderFeed(posts);
  });
}

function renderFeed(posts) {
  const list = document.getElementById("feed-list");
  if (posts.length === 0) {
    list.innerHTML = `<div class="empty-state"><span class="material-icons-round">sentiment_very_dissatisfied</span><p>Nenhuma publicação ainda.<br>Seja o primeiro a compartilhar!</p></div>`;
    return;
  }
  list.innerHTML = posts.map(p => postCardHTML(p)).join("");
}

function postCardHTML(p) {
  const ph = p.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorName||"?")}&background=00C9B1&color=fff`;
  const liked = currentUser && p.likes && p.likes[currentUser.uid];
  const likeCount = p.likes ? Object.keys(p.likes).length : 0;
  const commentCount = p.comments ? Object.keys(p.comments).length : 0;
  return `
    <div class="post-card" data-id="${p.id}">
      <div class="post-card-header">
        <img src="${ph}" alt="" />
        <div class="post-author-info">
          <strong>${escHtml(p.authorName || "Anônimo")}</strong>
          <small>${formatTime(p.createdAt)}</small>
        </div>
      </div>
      <div class="post-card-body">
        ${p.text ? `<p>${escHtml(p.text)}</p>` : ""}
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="" loading="lazy" />` : ""}
      </div>
      <div class="post-card-footer">
        <button class="btn-like ${liked ? "liked" : ""}" onclick="toggleLike('${p.id}')">
          <span class="material-icons-round">${liked ? "favorite" : "favorite_border"}</span>
          ${likeCount}
        </button>
        <button class="btn-comment" onclick="openPostDetail('${p.id}')">
          <span class="material-icons-round">chat_bubble_outline</span>
          ${commentCount}
        </button>
      </div>
    </div>`;
}

window.toggleLike = async function(postId) {
  if (!currentUser) return;
  const likeRef = ref(db, `posts/${postId}/likes/${currentUser.uid}`);
  const snap = await get(likeRef);
  if (snap.exists()) {
    await set(likeRef, null);
  } else {
    await set(likeRef, true);
    await addXP(5);
  }
};

async function openPostDetail(postId) {
  currentPostId = postId;
  const snap = await get(ref(db, `posts/${postId}`));
  const p = { id: postId, ...snap.val() };
  const ph = p.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.authorName||"?")}&background=00C9B1&color=fff`;
  const liked = currentUser && p.likes && p.likes[currentUser.uid];
  const likeCount = p.likes ? Object.keys(p.likes).length : 0;

  document.getElementById("post-detail-content").innerHTML = `
    <div class="post-card-header" style="padding:0 0 .75rem">
      <img src="${ph}" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />
      <div class="post-author-info">
        <strong>${escHtml(p.authorName || "Anônimo")}</strong>
        <small>${formatTime(p.createdAt)}</small>
      </div>
    </div>
    ${p.text ? `<p style="margin-bottom:.75rem;line-height:1.6;color:var(--texto-suave)">${escHtml(p.text)}</p>` : ""}
    ${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;border-radius:12px;margin-bottom:.75rem;max-height:280px;object-fit:cover" />` : ""}
    <button class="btn-like ${liked ? "liked" : ""}" onclick="toggleLike('${postId}')">
      <span class="material-icons-round">${liked ? "favorite" : "favorite_border"}</span> ${likeCount} curtidas
    </button>`;

  // Load comments
  const cSnap = await get(ref(db, `posts/${postId}/comments`));
  const comments = [];
  if (cSnap.exists()) cSnap.forEach(c => comments.push({ id: c.key, ...c.val() }));
  renderComments(comments);

  openModal("modal-view-post");
}

window.openPostDetail = openPostDetail;

function renderComments(comments) {
  const list = document.getElementById("comments-list");
  if (!comments.length) {
    list.innerHTML = `<p style="color:var(--cinza-texto);font-size:.85rem;margin-bottom:.75rem">Seja o primeiro a comentar!</p>`;
    return;
  }
  list.innerHTML = comments.map(c => {
    const ph = c.authorPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.authorName||"?")}&background=00C9B1&color=fff`;
    return `<div class="comment-item">
      <img src="${ph}" alt="" />
      <div class="comment-bubble">
        <strong>${escHtml(c.authorName || "Anônimo")}</strong>
        <span>${escHtml(c.text)}</span>
      </div>
    </div>`;
  }).join("");
}

window.submitComment = async function() {
  const input = document.getElementById("comment-input");
  const text = input.value.trim();
  if (!text || !currentPostId) return;
  input.value = "";
  await push(ref(db, `posts/${currentPostId}/comments`), {
    authorName: currentUserData.name,
    authorPhoto: currentUserData.photoURL || "",
    text,
    createdAt: Date.now()
  });
  await addXP(3);
  openPostDetail(currentPostId);
  showToast("Comentário publicado!", "success");
};

// ============================================================
// PUBLISH POST
// ============================================================

document.getElementById("post-img-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  postImageBase64 = await fileToBase64(file);
  document.getElementById("post-preview-img").src = postImageBase64;
  document.getElementById("post-image-preview").style.display = "block";
});

window.removePostImage = function() {
  postImageBase64 = null;
  document.getElementById("post-preview-img").src = "";
  document.getElementById("post-image-preview").style.display = "none";
  document.getElementById("post-img-input").value = "";
};

window.publishPost = async function() {
  const text = document.getElementById("post-text").value.trim();
  if (!text && !postImageBase64) { showToast("Escreva algo ou adicione uma imagem.", "error"); return; }

  const btn = document.getElementById("btn-publish-post");
  btn.disabled = true;
  btn.textContent = "Publicando...";

  try {
    let imageUrl = null;
    if (postImageBase64) {
      showToast("Enviando imagem...");
      imageUrl = await uploadToImgBB(postImageBase64);
    }
    await push(ref(db, "posts"), {
      text,
      imageUrl,
      authorId: currentUser.uid,
      authorName: currentUserData.name,
      authorPhoto: currentUserData.photoURL || "",
      createdAt: Date.now()
    });
    await addXP(10);
    showToast("Publicado com sucesso! +10 XP 🎉", "success");
    document.getElementById("post-text").value = "";
    postImageBase64 = null;
    document.getElementById("post-image-preview").style.display = "none";
    document.getElementById("post-img-input").value = "";
    closeModal("modal-create-post");
  } catch (e) {
    showToast("Erro ao publicar: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">send</span> Publicar';
  }
};

// ============================================================
// MÓDULOS
// ============================================================

function loadModulos(filter = "Todos") {
  currentModuleFilter = filter;
  const modRef = query(ref(db, "modulos"), orderByChild("createdAt"), limitToLast(50));
  get(modRef).then(snap => {
    const mods = [];
    snap.forEach(c => mods.unshift({ id: c.key, ...c.val() }));
    const filtered = filter === "Todos" ? mods : mods.filter(m => m.materia === filter);
    renderModulos(filtered, "modulos-list");
  });
}

function renderModulos(mods, containerId) {
  const el = document.getElementById(containerId);
  if (!mods.length) {
    el.innerHTML = `<div class="empty-state"><span class="material-icons-round">layers_clear</span><p>Nenhum módulo encontrado.</p></div>`;
    return;
  }
  el.innerHTML = mods.map(m => moduleCardHTML(m)).join("");
}

function moduleCardHTML(m) {
  const emoji = materiaEmoji(m.materia);
  return `
    <div class="module-card" onclick="openModule('${m.id}')">
      <div class="module-card-cover">
        ${m.coverUrl ? `<img src="${m.coverUrl}" alt="" />` : `<div class="module-card-cover-placeholder">${emoji}</div>`}
      </div>
      <div class="module-card-body">
        <span class="module-card-materia">${m.materia || "Geral"}</span>
        <div class="module-card-title">${escHtml(m.titulo)}</div>
        <div class="module-card-author">por ${escHtml(m.authorName || "Anônimo")}</div>
      </div>
    </div>`;
}

function materiaEmoji(m) {
  const map = {
    "Matemática":"📐","Português":"📚","História":"🏛️","Geografia":"🌍",
    "Ciências":"🔬","Biologia":"🧬","Física":"⚛️","Química":"🧪",
    "Inglês":"🇬🇧","Filosofia":"🤔","Sociologia":"🧑‍🤝‍🧑","Programação":"💻"
  };
  return map[m] || "📖";
}

// Chips de matéria
document.getElementById("materia-chips").addEventListener("click", e => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
  chip.classList.add("active");
  loadModulos(chip.dataset.materia);
});

// ============================================================
// CRIAR MÓDULO
// ============================================================

document.getElementById("mod-capa-input").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const b64 = await fileToBase64(file);
  const prev = document.getElementById("capa-preview");
  prev.src = b64;
  prev.style.display = "block";
  document.querySelector("#capa-upload-area span:first-of-type").style.display = "none";
  document.querySelector("#capa-upload-area span:last-of-type").style.display = "none";
  document.getElementById("capa-upload-area")._capaB64 = b64;
});

window.addVideoInput = function() {
  const wrap = document.createElement("div");
  wrap.className = "video-input-row";
  wrap.innerHTML = `
    <input type="text" class="video-url-input" placeholder="Cole a URL do YouTube aqui..." />
    <button class="btn-icon-sm" onclick="this.closest('.video-input-row').remove()">
      <span class="material-icons-round">remove</span>
    </button>`;
  document.getElementById("videos-list").appendChild(wrap);
};

window.addQuestion = function() {
  const idx = quizCount++;
  const block = document.createElement("div");
  block.className = "quiz-question-block";
  block.dataset.q = idx;
  block.innerHTML = `
    <div class="quiz-q-header">
      <input type="text" class="quiz-q-text" placeholder="Pergunta ${idx+1}..." />
      <button class="btn-icon-sm" onclick="removeQuestion(this)"><span class="material-icons-round">delete</span></button>
    </div>
    <div class="quiz-options">
      ${[0,1,2,3].map((i,_,a) => `
        <div class="quiz-opt-row">
          <input type="radio" name="correct-${idx}" value="${i}" ${i===0?"checked":""} />
          <input type="text" class="quiz-opt-input" placeholder="Alternativa ${"ABCD"[i]}${i===0?" (correta)":""}" />
        </div>`).join("")}
    </div>`;
  document.getElementById("quiz-builder").appendChild(block);
};

window.removeQuestion = function(btn) {
  btn.closest(".quiz-question-block").remove();
};

window.saveModule = async function() {
  const titulo   = document.getElementById("mod-titulo").value.trim();
  const desc     = document.getElementById("mod-desc").value.trim();
  const materia  = document.getElementById("mod-materia").value;
  const intro    = document.getElementById("mod-intro").value.trim();

  if (!titulo || !materia) { showToast("Preencha título e matéria.", "error"); return; }

  const btn = document.getElementById("btn-save-module");
  btn.disabled = true;
  btn.textContent = "Salvando...";

  try {
    // Capa
    let coverUrl = null;
    const capaArea = document.getElementById("capa-upload-area");
    if (capaArea._capaB64) {
      showToast("Enviando capa...");
      coverUrl = await uploadToImgBB(capaArea._capaB64);
    }

    // Vídeos
    const videoUrls = [...document.querySelectorAll(".video-url-input")]
      .map(i => i.value.trim()).filter(Boolean);

    // Quiz
    const quizData = [];
    document.querySelectorAll(".quiz-question-block").forEach(block => {
      const qText = block.querySelector(".quiz-q-text").value.trim();
      if (!qText) return;
      const opts = [...block.querySelectorAll(".quiz-opt-input")].map(i => i.value.trim());
      const correctRadio = block.querySelector("input[type=radio]:checked");
      const correct = correctRadio ? parseInt(correctRadio.value) : 0;
      quizData.push({ question: qText, options: opts, correct });
    });

    const modRef = push(ref(db, "modulos"));
    await set(modRef, {
      titulo, desc, materia, intro, coverUrl, videoUrls, quiz: quizData,
      authorId: currentUser.uid, authorName: currentUserData.name,
      createdAt: Date.now()
    });

    // Contador de módulos do usuário
    const modCount = (currentUserData.modulosCount || 0) + 1;
    await update(ref(db, `users/${currentUser.uid}`), { modulosCount: modCount });
    currentUserData.modulosCount = modCount;
    document.getElementById("stat-modulos").textContent = modCount;

    await addXP(30);
    showToast("Módulo criado! +30 XP 🎉", "success");
    closeModal("modal-create-module");
    loadModulos(currentModuleFilter);

    // Reset form
    ["mod-titulo","mod-desc","mod-intro"].forEach(id => document.getElementById(id).value = "");
    document.getElementById("mod-materia").value = "";
    document.getElementById("capa-preview").style.display = "none";
    capaArea._capaB64 = null;
    document.getElementById("videos-list").innerHTML = `
      <div class="video-input-row">
        <input type="text" class="video-url-input" placeholder="Cole a URL do YouTube aqui..." />
        <button class="btn-icon-sm" onclick="addVideoInput()"><span class="material-icons-round">add</span></button>
      </div>`;
    document.getElementById("quiz-builder").innerHTML = buildInitialQuestion();
    quizCount = 1;

  } catch(e) {
    showToast("Erro: " + e.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="material-icons-round">save</span> Salvar módulo';
  }
};

function buildInitialQuestion() {
  return `<div class="quiz-question-block" data-q="0">
    <div class="quiz-q-header">
      <input type="text" class="quiz-q-text" placeholder="Pergunta 1..." />
      <button class="btn-icon-sm" onclick="removeQuestion(this)"><span class="material-icons-round">delete</span></button>
    </div>
    <div class="quiz-options">
      ${[0,1,2,3].map(i => `<div class="quiz-opt-row">
        <input type="radio" name="correct-0" value="${i}" ${i===0?"checked":""}/>
        <input type="text" class="quiz-opt-input" placeholder="Alternativa ${"ABCD"[i]}${i===0?" (correta)":""}"/>
      </div>`).join("")}
    </div>
  </div>`;
}

// ============================================================
// ABRIR MÓDULO
// ============================================================

window.openModule = async function(modId) {
  const snap = await get(ref(db, `modulos/${modId}`));
  const m = { id: modId, ...snap.val() };
  renderModuleView(m);
  openModal("modal-view-module");
  await addXP(5);
};

function renderModuleView(m) {
  const emoji = materiaEmoji(m.materia);
  let html = `
    <div class="module-view-header">
      <div class="module-view-cover">
        ${m.coverUrl ? `<img src="${m.coverUrl}" alt="" />` : emoji}
      </div>
      <div class="module-view-meta">
        <span class="module-view-materia">${m.materia || "Geral"}</span>
        <div class="module-view-title">${escHtml(m.titulo)}</div>
        <div class="module-view-author">por ${escHtml(m.authorName || "Anônimo")}</div>
        <div class="module-view-desc">${escHtml(m.desc || "")}</div>
      </div>
    </div>`;

  // Intro / Conteúdo
  if (m.intro) {
    html += `<div class="module-section">
      <h3><span class="material-icons-round">article</span> Conteúdo</h3>
      <p class="module-content-text">${escHtml(m.intro)}</p>
    </div>`;
  }

  // Vídeos
  const vids = m.videoUrls ? Object.values(m.videoUrls).filter(Boolean) : [];
  if (vids.length) {
    html += `<div class="module-section">
      <h3><span class="material-icons-round">play_circle</span> Vídeos</h3>
      ${vids.map(url => {
        const vid = extractYoutubeId(url);
        if (!vid) return `<p style="color:var(--cinza-texto);font-size:.85rem">URL inválida: ${escHtml(url)}</p>`;
        return `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen loading="lazy"></iframe></div>`;
      }).join("")}
    </div>`;
  }

  // Quiz
  const quiz = m.quiz ? Object.values(m.quiz) : [];
  if (quiz.length) {
    html += `<div class="module-section">
      <h3><span class="material-icons-round">quiz</span> Quiz</h3>
      <div class="quiz-container" id="quiz-container-${m.id}">
        ${quiz.map((q, qi) => `
          <div class="quiz-item" id="quiz-item-${m.id}-${qi}">
            <p class="quiz-question-text">${qi+1}. ${escHtml(q.question)}</p>
            <div class="quiz-options">
              ${(q.options||[]).map((opt, oi) => `
                <button class="quiz-option" onclick="answerQuiz('${m.id}',${qi},${oi},${q.correct})" id="qopt-${m.id}-${qi}-${oi}">
                  ${"ABCD"[oi]}) ${escHtml(opt)}
                </button>`).join("")}
            </div>
            <div id="quiz-fb-${m.id}-${qi}"></div>
          </div>`).join("")}
      </div>
    </div>`;
  }

  document.getElementById("module-view-content").innerHTML = html;
}

window.answerQuiz = async function(modId, qi, selected, correct) {
  // Disable all options for this question
  const opts = document.querySelectorAll(`[id^="qopt-${modId}-${qi}-"]`);
  opts.forEach(b => b.disabled = true);

  const selBtn  = document.getElementById(`qopt-${modId}-${qi}-${selected}`);
  const corrBtn = document.getElementById(`qopt-${modId}-${qi}-${correct}`);
  const fb      = document.getElementById(`quiz-fb-${modId}-${qi}`);

  if (selected === correct) {
    selBtn.classList.add("correct");
    fb.innerHTML = `<span class="quiz-feedback ok">✅ Correto! +10 XP</span>`;
    await addXP(10);
    showToast("+10 XP 🎉");
  } else {
    selBtn.classList.add("wrong");
    corrBtn.classList.add("correct");
    fb.innerHTML = `<span class="quiz-feedback fail">❌ Errou. A resposta era: ${"ABCD"[correct]}</span>`;
  }
};

// ============================================================
// RANKING
// ============================================================

async function loadRanking() {
  const rankRef = query(ref(db, "users"), orderByChild("xp"), limitToLast(20));
  const snap = await get(rankRef);
  const users = [];
  snap.forEach(c => users.unshift({ uid: c.key, ...c.val() }));
  renderRanking(users);
}

function renderRanking(users) {
  const podium = document.getElementById("ranking-podium");
  const list   = document.getElementById("ranking-list");

  const top3 = users.slice(0, 3);
  const rest  = users.slice(3);

  // Podium (1st goes center, 2nd left, 3rd right)
  const order = [top3[1], top3[0], top3[2]].filter(Boolean);
  const pClass = ["p2", "p1", "p3"];
  const pCrown = ["🥈", "👑", "🥉"];
  podium.innerHTML = order.map((u, i) => {
    if (!u) return "";
    const ph = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||"?")}&background=00C9B1&color=fff`;
    const pos = pClass[i] === "p1" ? 1 : pClass[i] === "p2" ? 2 : 3;
    return `<div class="podium-item ${pClass[i]}">
      <span class="podium-crown">${pCrown[i]}</span>
      <img class="podium-avatar" src="${ph}" alt="" />
      <span class="podium-name">${escHtml((u.name||"?").split(" ")[0])}</span>
      <span class="podium-xp">${u.xp||0} XP</span>
      <div class="podium-block">${pos}º</div>
    </div>`;
  }).join("");

  list.innerHTML = rest.map((u, i) => {
    const ph = u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name||"?")}&background=00C9B1&color=fff`;
    const pos = i + 4;
    const mine = u.uid === currentUser?.uid ? "mine" : "";
    return `<div class="ranking-item ${mine}">
      <span class="ranking-pos">${pos}º</span>
      <img src="${ph}" alt="" />
      <div class="ranking-item-info">
        <strong>${escHtml(u.name||"Anônimo")}</strong>
        <small>Nível ${levelFromXP(u.xp||0)}</small>
      </div>
      <span class="ranking-item-xp">${u.xp||0} XP</span>
    </div>`;
  }).join("");

  if (!users.length) {
    podium.innerHTML = "";
    list.innerHTML = `<div class="empty-state"><span class="material-icons-round">emoji_events</span><p>Nenhum dado de ranking ainda.</p></div>`;
  }
}

// ============================================================
// PERFIL
// ============================================================

window.saveProfile = async function() {
  const name = document.getElementById("edit-name").value.trim();
  const bio  = document.getElementById("edit-bio").value.trim();
  if (!name) { showToast("O nome não pode ser vazio.", "error"); return; }
  await update(ref(db, `users/${currentUser.uid}`), { name, bio });
  currentUserData.name = name;
  currentUserData.bio  = bio;
  updateHeaderUI();
  updateProfileUI();
  closeModal("modal-edit-profile");
  showToast("Perfil atualizado!", "success");
};

// Avatar upload (profile)
document.getElementById("input-avatar-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  showToast("Enviando foto...");
  try {
    const b64 = await fileToBase64(file);
    const url = await uploadToImgBB(b64);
    await update(ref(db, `users/${currentUser.uid}`), { photoURL: url });
    currentUserData.photoURL = url;
    updateHeaderUI();
    updateProfileUI();
    showToast("Foto atualizada! 🎉", "success");
  } catch(e) {
    showToast("Erro ao enviar foto: " + e.message, "error");
  }
});

async function loadMyModulos() {
  const snap = await get(query(ref(db, "modulos"), orderByChild("createdAt"), limitToLast(50)));
  const mods = [];
  snap.forEach(c => {
    const m = { id: c.key, ...c.val() };
    if (m.authorId === currentUser.uid) mods.unshift(m);
  });
  const el = document.getElementById("my-modulos-list");
  if (!mods.length) {
    el.innerHTML = `<div class="empty-state"><span class="material-icons-round">layers_clear</span><p>Você ainda não criou módulos.</p></div>`;
    return;
  }
  el.innerHTML = mods.map(m => moduleCardHTML(m)).join("");
  document.getElementById("stat-modulos").textContent = mods.length;
}

// ============================================================
// XP SYSTEM
// ============================================================

async function addXP(amount) {
  if (!currentUser) return;
  const newXP = (currentUserData.xp || 0) + amount;
  await update(ref(db, `users/${currentUser.uid}`), { xp: newXP });
  currentUserData.xp = newXP;
  updateHeaderUI();
}

// ============================================================
// MODAL: click outside to close
// ============================================================

document.querySelectorAll(".modal-overlay").forEach(m => {
  m.addEventListener("click", e => {
    if (e.target === m) {
      m.classList.remove("open");
      setTimeout(() => { m.style.display = "none"; }, 300);
    }
  });
});

// ============================================================
// ESCAPE HTML
// ============================================================

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");
}
