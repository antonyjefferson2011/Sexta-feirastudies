// =========================
// FIREBASE
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
getAuth,
GoogleAuthProvider,
signInWithPopup,
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
updateProfile,
signOut,
onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
getDatabase,
ref,
set,
get,
push,
onValue
}
from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

// =========================
// CONFIG
// =========================

const firebaseConfig = {

apiKey: "AIzaSyC9Lcx3mYGYXavUi_b9c_tRbS3Otm9JQNk",

authDomain: "sexta-feira-studies.firebaseapp.com",

databaseURL:
"https://sexta-feira-studies-default-rtdb.firebaseio.com",

projectId: "sexta-feira-studies",

storageBucket:
"sexta-feira-studies.firebasestorage.app",

messagingSenderId: "673251857052",

appId:
"1:673251857052:web:0ef6929ea93123f7a91359",

measurementId:
"G-0ZG2PM61XT"

};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getDatabase(app);

const provider = new GoogleAuthProvider();

// =========================
// TROCAR TELA
// =========================

window.mostrarLogin = () => {

document.getElementById("loginForm").style.display = "block";

document.getElementById("cadastroForm").style.display = "none";

document
.getElementById("btnTabEntrar")
.classList.add("active");

document
.getElementById("btnTabCadastro")
.classList.remove("active");

};

window.mostrarCadastro = () => {

document.getElementById("loginForm").style.display = "none";

document.getElementById("cadastroForm").style.display = "block";

document
.getElementById("btnTabCadastro")
.classList.add("active");

document
.getElementById("btnTabEntrar")
.classList.remove("active");

};

// =========================
// GOOGLE
// =========================

window.loginGoogle = async () => {

try {

const result =
await signInWithPopup(auth, provider);

const user = result.user;

await salvarUsuario(user);

alert("Login realizado!");

} catch (erro) {

console.error(erro);

alert("Erro ao entrar.");

}

};

// =========================
// CADASTRO
// =========================

window.criarConta = async () => {

const nome =
document.getElementById("cadNome").value;

const email =
document.getElementById("cadEmail").value;

const senha =
document.getElementById("cadSenha").value;

if(!nome || !email || !senha){

alert("Preencha tudo.");

return;

}

try{

const credencial =
await createUserWithEmailAndPassword(
auth,
email,
senha
);

await updateProfile(
credencial.user,
{
displayName:nome
}
);

await salvarUsuario(
credencial.user
);

alert("Conta criada!");

}
catch(erro){

console.error(erro);

alert("Erro ao criar conta.");

}

};

// =========================
// LOGIN EMAIL
// =========================

window.loginEmail = async () => {

const email =
document.getElementById("loginEmail").value;

const senha =
document.getElementById("loginSenha").value;

try{

await signInWithEmailAndPassword(
auth,
email,
senha
);

alert("Bem-vindo!");

}
catch(erro){

console.error(erro);

alert("Email ou senha incorretos.");

}

};

// =========================
// LOGOUT
// =========================

window.logout = async () => {

await signOut(auth);

location.reload();

};

// =========================
// SALVAR USUARIO
// =========================

async function salvarUsuario(user){

await set(
ref(db,"usuarios/"+user.uid),
{

uid:user.uid,

nome:user.displayName || "Aluno",

email:user.email,

foto:
user.photoURL ||
"https://i.imgur.com/6VBx3io.png",

xp:0,

nivel:1,

streak:0

}
);

}

// =========================
// AUTENTICACAO
// =========================

onAuthStateChanged(
auth,
(user)=>{

if(user){

document.getElementById(
"login-screen"
).style.display = "none";

document.getElementById(
"app-screen"
).style.display = "block";

carregarUsuario(user);

}
else{

document.getElementById(
"login-screen"
).style.display = "flex";

document.getElementById(
"app-screen"
).style.display = "none";

}

}
);

// =========================
// CARREGAR USUARIO
// =========================

async function carregarUsuario(user){

const snapshot =
await get(
ref(db,"usuarios/"+user.uid)
);

if(!snapshot.exists()) return;

const dados =
snapshot.val();

document.getElementById(
"nomeUsuario"
).innerText = dados.nome;

document.getElementById(
"perfilNome"
).innerText = dados.nome;

document.getElementById(
"xpUsuario"
).innerText = dados.xp;

document.getElementById(
"perfilXP"
).innerText = dados.xp;

document.getElementById(
"perfilNivel"
).innerText = dados.nivel;

document.getElementById(
"streakUsuario"
).innerText = dados.streak;

document.getElementById(
"fotoPerfilTopo"
).src = dados.foto;

document.getElementById(
"perfilFoto"
).src = dados.foto;

}

// =========================
// NAVEGAÇÃO
// =========================

window.abrirTab = (id, btn) => {

document
.querySelectorAll(".tabPage")
.forEach(tab=>{
tab.classList.remove("active");
});

document
.getElementById(id)
.classList.add("active");

document
.querySelectorAll(".nav-btn")
.forEach(b=>{
b.classList.remove("active");
});

if(btn){
btn.classList.add("active");
}

};

// =========================
// POSTS
// =========================

window.abrirCriarPost = () => {

const texto = prompt(
"O que você aprendeu hoje?"
);

if(!texto) return;

criarPost(texto);

};

// =========================
// CRIAR POST
// =========================

async function criarPost(texto){

const user = auth.currentUser;

if(!user) return;

const post = {

uid:user.uid,

autor:user.displayName,

foto:
user.photoURL ||
"https://i.imgur.com/6VBx3io.png",

texto:texto,

data:Date.now(),

likes:0

};

await push(
ref(db,"posts"),
post
);

alert("Post publicado!");

}

// =========================
// CARREGAR FEED
// =========================

function carregarFeed(){

const feed =
document.getElementById("feed");

onValue(
ref(db,"posts"),
(snapshot)=>{

feed.innerHTML="";

if(!snapshot.exists()){

feed.innerHTML=`
<div class="card">
Nenhuma publicação ainda.
</div>
`;

return;

}

const posts=[];

snapshot.forEach(item=>{

posts.push({
id:item.key,
...item.val()
});

});

posts.reverse();

posts.forEach(post=>{

feed.innerHTML += `

<div class="post">

<h3>${post.autor}</h3>

<p>
${post.texto}
</p>

<br>

<small>
❤️ ${post.likes || 0}
</small>

</div>

`;

});

});

}

// =========================
// AVISO GLOBAL
// =========================

function carregarAvisoGlobal(){

const aviso =
document.getElementById(
"avisoGlobal"
);

onValue(
ref(db,"avisoGlobal"),
(snapshot)=>{

if(!snapshot.exists()){

aviso.style.display="none";

return;

}

const dados =
snapshot.val();

aviso.style.display="block";

aviso.innerHTML=`

<h3>
📢 ${dados.titulo}
</h3>

<br>

<p>
${dados.mensagem}
</p>

`;

});

}

// =========================
// PAINEL ADMIN
// =========================

window.publicarAvisoGlobal =
async ()=>{

const titulo =
document.getElementById(
"tituloAviso"
).value;

const mensagem =
document.getElementById(
"mensagemAviso"
).value;

if(!titulo || !mensagem){

alert("Preencha tudo.");

return;

}

await set(
ref(db,"avisoGlobal"),
{

titulo,
mensagem

}
);

alert("Aviso publicado!");

};

// =========================
// MODULOS
// =========================

window.abrirCriarModulo = ()=>{

const modal =
document.getElementById(
"modalModulo"
);

if(modal){

modal.style.display="flex";

}

};

window.fecharModulo = ()=>{

const modal =
document.getElementById(
"modalModulo"
);

if(modal){

modal.style.display="none";

}

};

// =========================
// SALVAR MODULO
// =========================

window.salvarModuloAdmin =
async ()=>{

const titulo =
document.getElementById(
"modTitulo"
).value;

const materia =
document.getElementById(
"modMateria"
).value;

const descricao =
document.getElementById(
"modDescricao"
).value;

const conteudo =
document.getElementById(
"modConteudo"
).value;

if(!titulo){

alert("Informe um título.");

return;

}

await push(
ref(db,"modulos"),
{

titulo,
materia,
descricao,
conteudo,

criadoEm:
Date.now()

}
);

alert("Módulo criado!");

fecharModulo();

};

// =========================
// LISTAR MODULOS
// =========================

function carregarModulos(){

const lista =
document.getElementById(
"listaModulos"
);

if(!lista) return;

onValue(
ref(db,"modulos"),
(snapshot)=>{

lista.innerHTML="";

if(!snapshot.exists()){

lista.innerHTML=`
<div class="card">
Nenhum módulo ainda.
</div>
`;

return;

}

snapshot.forEach(item=>{

const mod =
item.val();

lista.innerHTML += `

<div class="card">

<h3>
${mod.titulo}
</h3>

<p>
${mod.materia}
</p>

<br>

<p>
${mod.descricao}
</p>

</div>

`;

});

});

}

// =========================
// INICIAR
// =========================

window.addEventListener(
"load",
()=>{

setTimeout(()=>{

const loading =
document.getElementById(
"loading-screen"
);

if(loading){

loading.style.display="none";

}

},1500);

carregarFeed();

carregarAvisoGlobal();

carregarModulos();

}
);

// ===============================
// PERFIL
// ===============================

async function carregarPerfil() {
  if (!usuarioAtual) return;

  try {
    const snap = await get(ref(db, "usuarios/" + usuarioAtual.uid));

    if (!snap.exists()) return;

    const user = snap.val();

    const pfName = document.getElementById("pf-name");
    const pfBio = document.getElementById("pf-bio");

    if (pfName) pfName.textContent = user.nome || "Usuário";
    if (pfBio) pfBio.textContent = user.bio || "Sem bio";

  } catch (err) {
    console.error(err);
  }
}

window.salvarPerfil = async function () {

  if (!usuarioAtual) return;

  const nome =
    document.getElementById("edit-nome")?.value || "";

  const bio =
    document.getElementById("edit-bio")?.value || "";

  try {

    await update(
      ref(db, "usuarios/" + usuarioAtual.uid),
      {
        nome,
        bio
      }
    );

    toast("Perfil atualizado");

    fecharModal("modal-edit-pf");

    carregarPerfil();

  } catch (err) {
    toast("Erro ao salvar");
  }
};

// ===============================
// AVISO GLOBAL
// ===============================

async function carregarAvisoGlobal() {

  const avisoBox =
    document.getElementById("aviso-global-box");

  const avisoContent =
    document.getElementById("aviso-global-content");

  if (!avisoBox || !avisoContent) return;

  try {

    const snap = await get(
      ref(db, "configuracoes/avisoGlobal")
    );

    if (!snap.exists()) {
      avisoBox.style.display = "none";
      return;
    }

    const aviso = snap.val();

    if (!aviso.ativo) {
      avisoBox.style.display = "none";
      return;
    }

    avisoContent.innerHTML = `
      <strong>${aviso.titulo || "Aviso"}</strong>
      <p>${aviso.mensagem || ""}</p>
    `;

    avisoBox.style.display = "block";

  } catch (err) {
    console.error(err);
  }
}

// ===============================
// XP E NÍVEL
// ===============================

function calcularNivel(xp) {

  return Math.floor(xp / 100) + 1;

}

function atualizarXP(user) {

  const xp = user.xp || 0;

  const nivel = calcularNivel(xp);

  const atual = xp % 100;

  const porcentagem = atual;

  const xpBar =
    document.getElementById("xp-bar-fill");

  if (xpBar) {
    xpBar.style.width = porcentagem + "%";
  }

  const xpLbl =
    document.getElementById("xp-bar-lbl");

  if (xpLbl) {
    xpLbl.textContent = atual + "/100 XP";
  }

  const nivelTxt =
    document.getElementById("nivel-txt");

  if (nivelTxt) {
    nivelTxt.textContent =
      "Nível " + nivel;
  }

  const hdrXp =
    document.getElementById("hdr-xp");

  if (hdrXp) {
    hdrXp.textContent =
      xp + " XP";
  }
}

// ===============================
// TOAST
// ===============================

window.toast = function (
  texto,
  tipo = "ok"
) {

  const toastEl =
    document.getElementById("toast");

  if (!toastEl) return;

  toastEl.textContent = texto;

  toastEl.className =
    "toast show " + tipo;

  setTimeout(() => {
    toastEl.classList.remove("show");
  }, 3000);
};

// ===============================
// LOGOUT
// ===============================

window.fazerLogout = async function () {

  await signOut(auth);

};

// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) {

      document
        .getElementById("screen-login")
        ?.classList.add("active");

      document
        .getElementById("screen-app")
        ?.classList.remove("active");

      return;
    }

    usuarioAtual = user;

    document
      .getElementById("screen-login")
      ?.classList.remove("active");

    document
      .getElementById("screen-app")
      ?.classList.add("active");

    await carregarPerfil();

    carregarFeed();

    carregarModulos();

    carregarRanking();

    carregarAvisoGlobal();

  }
);

// ===============================
// INICIALIZAÇÃO
// ===============================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    console.log(
      "Sexta Feira Studies carregado!"
    );

  }
);
