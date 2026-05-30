// ===============================
// FIREBASE
// ===============================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  set,
  get,
  update,
  onValue,
  push,
  remove
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyC9Lcx3mYGYXavUi_b9c_tRbS3Otm9JQNk",
  authDomain: "sexta-feira-studies.firebaseapp.com",
  databaseURL: "https://sexta-feira-studies-default-rtdb.firebaseio.com",
  projectId: "sexta-feira-studies",
  storageBucket: "sexta-feira-studies.firebasestorage.app",
  messagingSenderId: "673251857052",
  appId: "1:673251857052:web:0ef6929ea93123f7a91359",
  measurementId: "G-0ZG2PM61XT"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

window.auth = auth;
window.db = db;
window.storage = storage;

// ===============================
// VARIÁVEIS
// ===============================

let usuarioAtual = null;

// ===============================
// TOAST
// ===============================

window.toast = function(msg,tipo="ok"){

  const el = document.getElementById("toast");

  el.innerText = msg;

  el.className = "toast show " + tipo;

  setTimeout(()=>{
    el.className = "toast";
  },3000);

}

// ===============================
// MODAIS
// ===============================

window.abrirModal = function(id){

 document.getElementById(id).style.display="flex";

}

window.fecharModal = function(id){

 document.getElementById(id).style.display="none";

}

// ===============================
// OLHO SENHA
// ===============================

window.toggleEye = function(id,btn){

 const input = document.getElementById(id);

 if(input.type==="password"){
   input.type="text";
   btn.innerHTML =
   `<span class="material-icons-round">visibility_off</span>`;
 }else{
   input.type="password";
   btn.innerHTML =
   `<span class="material-icons-round">visibility</span>`;
 }

}

// ===============================
// ABAS LOGIN
// ===============================

window.switchAuthTab = function(tipo){

 document.getElementById("panel-entrar").style.display =
 tipo==="entrar" ? "block":"none";

 document.getElementById("panel-cadastro").style.display =
 tipo==="cadastro" ? "block":"none";

 document.getElementById("tab-entrar-btn")
 .classList.toggle("active",tipo==="entrar");

 document.getElementById("tab-cadastro-btn")
 .classList.toggle("active",tipo==="cadastro");

}

// ===============================
// LOGIN GOOGLE
// ===============================

const provider = new GoogleAuthProvider();

async function loginGoogle(){

 try{

   const result =
   await signInWithPopup(auth,provider);

   const user = result.user;

   const refUser =
   ref(db,"usuarios/"+user.uid);

   const snap =
   await get(refUser);

   if(!snap.exists()){

     await set(refUser,{
       uid:user.uid,
       nome:user.displayName || "Aluno",
       email:user.email,
       avatar:user.photoURL || "",
       bio:"",
       xp:0,
       nivel:1,
       streak:0,
       criadoEm:Date.now()
     });

   }

   toast("Login realizado");

 }catch(err){

   console.error(err);

   toast("Erro ao entrar","err");

 }

}

document
.getElementById("btn-google-login")
?.addEventListener("click",loginGoogle);

document
.getElementById("btn-google-reg")
?.addEventListener("click",loginGoogle);

// ===============================
// LOGIN EMAIL
// ===============================

window.loginEmail = async function(){

 const email =
 document.getElementById("login-email").value;

 const senha =
 document.getElementById("login-senha").value;

 try{

   await signInWithEmailAndPassword(
     auth,
     email,
     senha
   );

   toast("Bem-vindo");

 }catch(err){

   console.error(err);

   toast("Email ou senha inválidos","err");

 }

}

// ===============================
// CADASTRO
// ===============================

window.registrarEmail = async function(){

 const nome =
 document.getElementById("reg-nome").value.trim();

 const email =
 document.getElementById("reg-email").value.trim();

 const senha =
 document.getElementById("reg-senha").value;

 const confirma =
 document.getElementById("reg-confirma").value;

 if(!nome){
   return toast("Digite seu nome","err");
 }

 if(senha !== confirma){
   return toast("As senhas não coincidem","err");
 }

 try{

   const cred =
   await createUserWithEmailAndPassword(
     auth,
     email,
     senha
   );

   await updateProfile(
     cred.user,
     {displayName:nome}
   );

   await set(
     ref(db,"usuarios/"+cred.user.uid),
     {
       uid:cred.user.uid,
       nome,
       email,
       avatar:"",
       bio:"",
       xp:0,
       nivel:1,
       streak:0,
       criadoEm:Date.now()
     }
   );

   toast("Conta criada");

 }catch(err){

   console.error(err);

   toast("Erro ao criar conta","err");

 }

}

// ===============================
// LOGOUT
// ===============================

window.fazerLogout = async function(){

 await signOut(auth);

}

// ===============================
// NAVEGAÇÃO
// ===============================

window.goTab = function(nome,btn){

 document
 .querySelectorAll(".tab")
 .forEach(t=>t.classList.remove("active"));

 document
 .getElementById("tab-"+nome)
 ?.classList.add("active");

 document
 .querySelectorAll(".nav-btn")
 .forEach(b=>b.classList.remove("active"));

 if(btn){
   btn.classList.add("active");
 }

}

// ===============================
// AUTH STATE
// ===============================

onAuthStateChanged(auth,async(user)=>{

 if(!user){

   document
   .getElementById("screen-login")
   .classList.add("active");

   document
   .getElementById("screen-app")
   .classList.remove("active");

   return;

 }

 usuarioAtual = user;

 document
 .getElementById("screen-login")
 .classList.remove("active");

 document
 .getElementById("screen-app")
 .classList.add("active");

 carregarPerfil();

});

// ===============================
// CARREGAR PERFIL
// ===============================

async function carregarPerfil(){

 if(!usuarioAtual) return;

 const snap =
 await get(
   ref(
     db,
     "usuarios/"+usuarioAtual.uid
   )
 );

 if(!snap.exists()) return;

 const dados = snap.val();

 document.getElementById("greeting-name").innerText =
 dados.nome || "Aluno";

 document.getElementById("pf-name").innerText =
 dados.nome || "Aluno";

 document.getElementById("pf-bio").innerText =
 dados.bio || "Sem bio";

 document.getElementById("pf-xp").innerText =
 dados.xp || 0;

 document.getElementById("pf-nivel").innerText =
 dados.nivel || 1;

 document.getElementById("pf-streak").innerText =
 dados.streak || 0;

 document.getElementById("hdr-xp").innerText =
 `${dados.xp || 0} XP`;

 document.getElementById("hdr-streak").innerText =
 dados.streak || 0;

 const avatar =
 dados.avatar ||
 "https://ui-avatars.com/api/?background=00C9B1&color=fff&name="+
 encodeURIComponent(dados.nome);

 const avatares = [

   "hdr-avatar-img",
   "pf-avatar",
   "bar-avatar",
   "post-av",
   "comment-av"

 ];

 avatares.forEach(id=>{

   const el = document.getElementById(id);

   if(el){
     el.src = avatar;
   }

 });

 atualizarNivel(dados.xp || 0);

 carregarAvisoGlobal();

 carregarRanking();

 carregarPosts();

 carregarModulos();

}

// ===============================
// EDITAR PERFIL
// ===============================

window.salvarPerfil = async function(){

 const nome =
 document.getElementById("edit-nome").value;

 const bio =
 document.getElementById("edit-bio").value;

 try{

   await update(
     ref(
       db,
       "usuarios/"+usuarioAtual.uid
     ),
     {
       nome,
       bio
     }
   );

   fecharModal("modal-edit-pf");

   toast("Perfil atualizado");

   carregarPerfil();

 }catch(err){

   console.error(err);

   toast("Erro ao salvar","err");

 }

}

// ===============================
// ABRIR MODAL PERFIL
// ===============================

document
.getElementById("modal-edit-pf")
?.addEventListener("click",(e)=>{

 if(e.target.id==="modal-edit-pf"){

   fecharModal("modal-edit-pf");

 }

});

window.abrirEditarPerfil = async function(){

 const snap =
 await get(
   ref(
     db,
     "usuarios/"+usuarioAtual.uid
   )
 );

 if(!snap.exists()) return;

 const d = snap.val();

 document.getElementById("edit-nome").value =
 d.nome || "";

 document.getElementById("edit-bio").value =
 d.bio || "";

 abrirModal("modal-edit-pf");

}

// ===============================
// UPLOAD AVATAR
// ===============================

document
.getElementById("pf-file")
?.addEventListener(
 "change",
 async(e)=>{

 const file = e.target.files[0];

 if(!file) return;

 try{

   const caminho =
   storageRef(
     storage,
     "avatars/" +
     usuarioAtual.uid
   );

   await uploadBytes(
     caminho,
     file
   );

   const url =
   await getDownloadURL(
     caminho
   );

   await update(
     ref(
       db,
       "usuarios/"+usuarioAtual.uid
     ),
     {
       avatar:url
     }
   );

   toast("Avatar atualizado");

   carregarPerfil();

 }catch(err){

   console.error(err);

   toast("Erro ao enviar foto","err");

 }

});

// ===============================
// XP E NÍVEL
// ===============================

function atualizarNivel(xp){

 const nivel =
 Math.floor(xp / 100) + 1;

 const xpAtual =
 xp % 100;

 document.getElementById("nivel-txt").innerText =
 "Nível " + nivel;

 document.getElementById("xp-bar-lbl").innerText =
 `${xpAtual}/100 XP`;

 document.getElementById("xp-bar-fill").style.width =
 xpAtual + "%";

}

// ===============================
// ADICIONAR XP
// ===============================

window.adicionarXP = async function(valor){

 if(!usuarioAtual) return;

 const snap =
 await get(
   ref(
     db,
     "usuarios/"+usuarioAtual.uid
   )
 );

 if(!snap.exists()) return;

 const dados = snap.val();

 const novoXP =
 (dados.xp || 0) + valor;

 const novoNivel =
 Math.floor(novoXP / 100) + 1;

 await update(
   ref(
     db,
     "usuarios/"+usuarioAtual.uid
   ),
   {
     xp:novoXP,
     nivel:novoNivel
   }
 );

 carregarPerfil();

}

// ===============================
// STREAK
// ===============================

window.atualizarStreak = async function(){

 const hoje =
 new Date().toDateString();

 const snap =
 await get(
   ref(
     db,
     "usuarios/"+usuarioAtual.uid
   )
 );

 if(!snap.exists()) return;

 const dados = snap.val();

 if(dados.ultimoLogin===hoje){
   return;
 }

 const streak =
 (dados.streak || 0) + 1;

 await update(
   ref(
     db,
     "usuarios/"+usuarioAtual.uid
   ),
   {
     streak,
     ultimoLogin:hoje
   }
 );

 carregarPerfil();

}

// ===============================
// RING HOME
// ===============================

function atualizarRing(valor){

 const circle =
 document.getElementById("ring-fg");

 const label =
 document.getElementById("ring-lbl");

 const total = 150.8;

 const offset =
 total - (valor/100)*total;

 circle.style.strokeDashoffset =
 offset;

 label.innerText =
 valor + "%";

}

  // ===============================
// VARIÁVEIS POSTS
// ===============================

let imagemPostSelecionada = null;
let postAtualAberto = null;

// ===============================
// IMAGEM POST
// ===============================

document
.getElementById("post-file")
?.addEventListener("change",e=>{

 const file = e.target.files[0];

 if(!file) return;

 imagemPostSelecionada = file;

 const reader = new FileReader();

 reader.onload = function(ev){

   document.getElementById(
     "post-img-prev"
   ).style.display = "block";

   document.getElementById(
     "post-prev-img"
   ).src = ev.target.result;

 };

 reader.readAsDataURL(file);

});

window.limparImgPost = function(){

 imagemPostSelecionada = null;

 document.getElementById(
   "post-img-prev"
 ).style.display = "none";

}

// ===============================
// PUBLICAR POST
// ===============================

window.publicarPost = async function(){

 if(!usuarioAtual) return;

 const texto =
 document.getElementById("post-texto")
 .value.trim();

 if(!texto && !imagemPostSelecionada){

   toast(
     "Escreva algo",
     "err"
   );

   return;

 }

 try{

   document.getElementById(
     "btn-publicar"
   ).disabled = true;

   let imagemURL = "";

   if(imagemPostSelecionada){

     const caminho =
     storageRef(
       storage,
       "posts/" +
       Date.now() +
       "_" +
       imagemPostSelecionada.name
     );

     await uploadBytes(
       caminho,
       imagemPostSelecionada
     );

     imagemURL =
     await getDownloadURL(
       caminho
     );

   }

   const postRef =
   push(
     ref(db,"posts")
   );

   const perfil =
   await get(
     ref(
       db,
       "usuarios/"+usuarioAtual.uid
     )
   );

   const dados =
   perfil.val();

   await set(
     postRef,
     {
       id:postRef.key,
       uid:usuarioAtual.uid,
       autor:dados.nome,
       avatar:dados.avatar || "",
       texto,
       imagem:imagemURL,
       likes:0,
       criadoEm:Date.now()
     }
   );

   document.getElementById(
     "post-texto"
   ).value = "";

   limparImgPost();

   fecharModal("modal-post");

   toast("Publicado");

   adicionarXP(5);

 }catch(err){

   console.error(err);

   toast(
     "Erro ao publicar",
     "err"
   );

 }

 document.getElementById(
   "btn-publicar"
 ).disabled = false;

}

// ===============================
// FEED
// ===============================

window.carregarPosts = function(){

 onValue(
   ref(db,"posts"),
   snap=>{

     const lista =
     document.getElementById(
       "feed-list"
     );

     lista.innerHTML = "";

     if(!snap.exists()){

       lista.innerHTML =
       `
       <div class="empty-box">
       <span class="material-icons-round">
       forum
       </span>
       <p>Nenhuma publicação.</p>
       </div>
       `;

       return;

     }

     const posts =
     Object.values(
       snap.val()
     );

     posts.sort(
       (a,b)=>
       b.criadoEm-a.criadoEm
     );

     posts.forEach(post=>{

       lista.innerHTML +=
       `
       <div class="post-card">

         <div class="pc-top">

           <img src="${
             post.avatar ||
             'https://ui-avatars.com/api/?name='+
             encodeURIComponent(post.autor)
           }">

           <div class="pc-author">

             <strong>
             ${post.autor}
             </strong>

             <small>
             ${new Date(
               post.criadoEm
             ).toLocaleString()}
             </small>

           </div>

         </div>

         <div class="pc-body">

           ${post.texto}

           ${
             post.imagem
             ?
             `<img src="${post.imagem}">`
             :
             ''
           }

         </div>

         <div class="pc-footer">

           <button
           class="btn-like"
           onclick="curtirPost('${post.id}')">

           ❤️

           </button>

           <button
           class="btn-comment"
           onclick="abrirPost('${post.id}')">

           💬 Comentários

           </button>

         </div>

       </div>
       `;

     });

   }
 );

}

// ===============================
// CURTIR
// ===============================

window.curtirPost =
async function(id){

 const snap =
 await get(
   ref(
     db,
     "posts/"+id
   )
 );

 if(!snap.exists()) return;

 const post =
 snap.val();

 await update(
   ref(
     db,
     "posts/"+id
   ),
   {
     likes:
     (post.likes || 0)+1
   }
 );

}

// ===============================
// ABRIR POST
// ===============================

window.abrirPost =
async function(id){

 postAtualAberto = id;

 abrirModal(
   "modal-ver-post"
 );

 const snap =
 await get(
   ref(
     db,
     "posts/"+id
   )
 );

 if(!snap.exists()) return;

 const post =
 snap.val();

 document.getElementById(
   "post-detalhe"
 ).innerHTML =
 `
 <div class="pc-top">

 <img src="${
 post.avatar ||
 ''
 }">

 <div>

 <strong>
 ${post.autor}
 </strong>

 </div>

 </div>

 <div class="pc-body">

 ${post.texto}

 ${
 post.imagem
 ?
 `<img src="${post.imagem}">`
 :
 ''
 }

 </div>
 `;

 carregarComentarios();

}

// ===============================
// COMENTÁRIOS
// ===============================

window.carregarComentarios =
function(){

 onValue(
 ref(
 db,
 "comentarios/"+postAtualAberto
 ),
 snap=>{

 const lista =
 document.getElementById(
 "lista-comentarios"
 );

 lista.innerHTML = "";

 if(!snap.exists()) return;

 const comentarios =
 Object.values(
 snap.val()
 );

 comentarios.forEach(c=>{

 lista.innerHTML +=
 `
 <div class="comment-item">

 <img src="${
 c.avatar || ''
 }">

 <div class="comment-bubble">

 <strong>
 ${c.nome}
 </strong>

 <span>
 ${c.texto}
 </span>

 </div>

 </div>
 `;

 });

 });
}

// ===============================
// ENVIAR COMENTÁRIO
// ===============================

window.enviarComentario =
async function(){

 const texto =
 document.getElementById(
 "comentario-txt"
 ).value.trim();

 if(!texto) return;

 const perfil =
 await get(
 ref(
 db,
 "usuarios/"+usuarioAtual.uid
 )
 );

 const dados =
 perfil.val();

 const novo =
 push(
 ref(
 db,
 "comentarios/"+postAtualAberto
 )
 );

 await set(
 novo,
 {
 nome:dados.nome,
 avatar:dados.avatar || "",
 texto,
 criadoEm:Date.now()
 }
 );

 document.getElementById(
 "comentario-txt"
 ).value = "";

 adicionarXP(1);

}

// ===============================
// BOTÃO CRIAR POST
// ===============================

document
.getElementById(
 "btn-open-post"
 )
?.addEventListener(
 "click",
 ()=>{
 abrirModal(
 "modal-post"
 );
 }
);

// ===============================
// AVISO GLOBAL
// ===============================

window.carregarAvisoGlobal = function(){

 onValue(
  ref(db,"avisoGlobal"),
  snap=>{

   if(!snap.exists()) return;

   const aviso = snap.val();

   const box =
   document.getElementById(
   "aviso-global-box"
   );

   const content =
   document.getElementById(
   "aviso-global-content"
   );

   box.style.display = "block";

   content.innerHTML = `
   <strong>
   ${aviso.titulo || "Aviso"}
   </strong>
   <p>
   ${aviso.mensagem || ""}
   </p>
   `;

  }
 );

}

// ===============================
// RANKING
// ===============================

window.carregarRanking =
function(){

 onValue(
 ref(db,"usuarios"),
 snap=>{

 if(!snap.exists()) return;

 const usuarios =
 Object.values(
 snap.val()
 );

 usuarios.sort(
 (a,b)=>
 (b.xp||0)-
 (a.xp||0)
 );

 const podium =
 document.getElementById(
 "podium"
 );

 const rankList =
 document.getElementById(
 "rank-list"
 );

 podium.innerHTML = "";
 rankList.innerHTML = "";

 const top3 =
 usuarios.slice(0,3);

 top3.forEach((u,index)=>{

 podium.innerHTML += `
 <div class="podium-item p${index+1}">
 <img
 class="podium-av"
 src="${
 u.avatar ||
 'https://ui-avatars.com/api/?name='+
 encodeURIComponent(u.nome)
 }">
 <div class="podium-blk">
 #${index+1}
 </div>
 <div class="podium-nome">
 ${u.nome}
 </div>
 <div class="podium-xp">
 ${u.xp || 0} XP
 </div>
 </div>
 `;

 });

 usuarios.forEach((u,index)=>{

 rankList.innerHTML += `
 <div class="rank-item">

 <div class="rank-pos">
 ${index+1}
 </div>

 <img src="${
 u.avatar ||
 'https://ui-avatars.com/api/?name='+
 encodeURIComponent(u.nome)
 }">

 <div class="rank-info">
 <strong>
 ${u.nome}
 </strong>

 <small>
 Nível ${u.nivel || 1}
 </small>
 </div>

 <div class="rank-xp">
 ${u.xp || 0}
 </div>

 </div>
 `;

 });

 });

}

// ===============================
// MÓDULOS
// ===============================

window.carregarModulos =
function(){

 onValue(
 ref(db,"modulos"),
 snap=>{

 const grid =
 document.getElementById(
 "mods-grid"
 );

 const meus =
 document.getElementById(
 "meus-mods"
 );

 if(grid) grid.innerHTML = "";
 if(meus) meus.innerHTML = "";

 if(!snap.exists()){

 if(grid){
 grid.innerHTML = `
 <div class="empty-box">
 Nenhum módulo.
 </div>
 `;
 }

 return;

 }

 const modulos =
 Object.values(
 snap.val()
 );

 modulos.forEach(mod=>{

 const card = `
 <div
 class="mod-card"
 onclick="abrirModulo('${mod.id}')">

 <div class="mod-cover">

 ${
 mod.capa
 ?
 `<img src="${mod.capa}">`
 :
 '📚'
 }

 </div>

 <div class="mod-body">

 <div class="mod-materia">
 ${mod.materia}
 </div>

 <div class="mod-titulo">
 ${mod.titulo}
 </div>

 <div class="mod-autor">
 ${mod.autor}
 </div>

 </div>

 </div>
 `;

 if(grid){
 grid.innerHTML += card;
 }

 if(
 meus &&
 mod.uid === usuarioAtual.uid
 ){
 meus.innerHTML += card;
 }

 });

 });

}

// ===============================
// CAPA MÓDULO
// ===============================

let capaModulo = null;

document
.getElementById("m-capa-file")
?.addEventListener(
"change",
e=>{

 const file =
 e.target.files[0];

 if(!file) return;

 capaModulo = file;

 const reader =
 new FileReader();

 reader.onload =
 function(ev){

 const img =
 document.getElementById(
 "capa-prev"
 );

 img.src =
 ev.target.result;

 img.style.display =
 "block";

 }

 reader.readAsDataURL(
 file
 );

});

// ===============================
// SALVAR MÓDULO
// ===============================

window.salvarModulo =
async function(){

 const titulo =
 document.getElementById(
 "m-titulo"
 ).value;

 const descricao =
 document.getElementById(
 "m-desc"
 ).value;

 const materia =
 document.getElementById(
 "m-materia"
 ).value;

 const intro =
 document.getElementById(
 "m-intro"
 ).value;

 if(!titulo){

 toast(
 "Digite um título",
 "err"
 );

 return;

 }

 let capaURL = "";

 try{

 if(capaModulo){

 const caminho =
 storageRef(
 storage,
 "modulos/" +
 Date.now()
 );

 await uploadBytes(
 caminho,
 capaModulo
 );

 capaURL =
 await getDownloadURL(
 caminho
 );

 }

 const perfil =
 await get(
 ref(
 db,
 "usuarios/"+usuarioAtual.uid
 )
 );

 const dados =
 perfil.val();

 const novo =
 push(
 ref(db,"modulos")
 );

 await set(
 novo,
 {
 id:novo.key,
 uid:usuarioAtual.uid,
 titulo,
 descricao,
 materia,
 intro,
 capa:capaURL,
 autor:dados.nome,
 criadoEm:Date.now()
 }
 );

 fecharModal(
 "modal-modulo"
 );

 toast(
 "Módulo criado"
 );

 adicionarXP(10);

 }catch(err){

 console.error(err);

 toast(
 "Erro ao salvar",
 "err"
 );

 }

}

// ===============================
// ABRIR MÓDULO
// ===============================

window.abrirModulo =
async function(id){

 const snap =
 await get(
 ref(
 db,
 "modulos/"+id
 )
 );

 if(!snap.exists())
 return;

 const mod =
 snap.val();

 document.getElementById(
 "mod-conteudo"
 ).innerHTML = `

 <div class="mod-view-cover">

 ${
 mod.capa
 ?
 `<img src="${mod.capa}">`
 :
 '📚'
 }

 </div>

 <div class="mod-view-meta">

 <div class="mod-view-materia">
 ${mod.materia}
 </div>

 <div class="mod-view-titulo">
 ${mod.titulo}
 </div>

 <div class="mod-view-autor">
 ${mod.autor}
 </div>

 <div class="mod-view-desc">
 ${mod.descricao}
 </div>

 </div>

 <div class="mod-sec">

 <h3>
 Conteúdo
 </h3>

 <div class="mod-content-txt">
 ${mod.intro || ""}
 </div>

 </div>

 `;

 abrirModal(
 "modal-ver-mod"
 );

 adicionarXP(2);

}

// ===============================
// QUIZ BUILDER
// ===============================

let questoesModulo = [];

window.addQuestao = function(){

 const id = Date.now();

 const wrap =
 document.getElementById(
 "quiz-wrap"
 );

 const html = `
 <div class="q-block" id="q-${id}">

 <div class="q-block-top">

 <input
 class="q-txt-input pergunta"
 placeholder="Pergunta">

 </div>

 <div class="opt-row">
 <input type="radio" name="c-${id}" value="0">
 <input class="opt-input opcao" placeholder="Opção 1">
 </div>

 <div class="opt-row">
 <input type="radio" name="c-${id}" value="1">
 <input class="opt-input opcao" placeholder="Opção 2">
 </div>

 <div class="opt-row">
 <input type="radio" name="c-${id}" value="2">
 <input class="opt-input opcao" placeholder="Opção 3">
 </div>

 <div class="opt-row">
 <input type="radio" name="c-${id}" value="3">
 <input class="opt-input opcao" placeholder="Opção 4">
 </div>

 </div>
 `;

 wrap.insertAdjacentHTML(
 "beforeend",
 html
 );

}

// ===============================
// GERAR QUIZ
// ===============================

function coletarQuiz(){

 const blocos =
 document.querySelectorAll(
 ".q-block"
 );

 const quiz = [];

 blocos.forEach(bloco=>{

 const pergunta =
 bloco.querySelector(
 ".pergunta"
 )?.value;

 const opcoes =
 [...bloco.querySelectorAll(
 ".opcao"
 )]
 .map(el=>el.value);

 const correta =
 bloco.querySelector(
 "input[type=radio]:checked"
 );

 if(
 pergunta &&
 correta
 ){

 quiz.push({

 pergunta,

 opcoes,

 correta:
 Number(
 correta.value
 )

 });

 }

 });

 return quiz;

}

// ===============================
// FASES
// ===============================

const fasesPadrao = [

 {
  id:1,
  titulo:"Primeiros Passos",
  emoji:"📘",
  xp:10
 },

 {
  id:2,
  titulo:"Explorador",
  emoji:"🧭",
  xp:20
 },

 {
  id:3,
  titulo:"Estudioso",
  emoji:"🎓",
  xp:30
 },

 {
  id:4,
  titulo:"Especialista",
  emoji:"🏆",
  xp:40
 },

 {
  id:5,
  titulo:"Lenda",
  emoji:"👑",
  xp:50
 }

];

// ===============================
// CARREGAR FASES
// ===============================

window.carregarFases =
async function(){

 const wrap =
 document.getElementById(
 "trilha-wrap"
 );

 if(!wrap) return;

 wrap.innerHTML = "";

 const snap =
 await get(
 ref(
 db,
 "progresso/"+usuarioAtual.uid
 )
 );

 let concluidas = [];

 if(
 snap.exists()
 ){

 concluidas =
 snap.val().fases || [];

 }

 fasesPadrao.forEach(
 (fase,index)=>{

 const feita =
 concluidas.includes(
 fase.id
 );

 const liberada =
 index===0 ||
 concluidas.includes(
 fase.id-1
 );

 wrap.innerHTML += `

 <div class="fase-row">

 <div class="fase-node">

 <button

 class="
 fase-btn
 ${
 feita
 ? "done"
 : liberada
 ? "available"
 : "locked"
 }
 "

 ${
 !liberada
 ? "disabled"
 : ""
 }

 onclick="
 abrirFase(
 ${fase.id}
 )
 "

 >

 ${fase.emoji}

 </button>

 <div class="fase-lbl">
 ${fase.titulo}
 </div>

 </div>

 </div>

 `;

 });

}

// ===============================
// ABRIR FASE
// ===============================

window.abrirFase =
function(id){

 const fase =
 fasesPadrao.find(
 f=>f.id===id
 );

 if(!fase) return;

 document.getElementById(
 "fase-detalhe-body"
 ).innerHTML = `

 <div class="fase-dh">

 <span
 class="fase-dh-emoji">

 ${fase.emoji}

 </span>

 <h2
 class="fase-dh-titulo">

 ${fase.titulo}

 </h2>

 <div
 class="fase-dh-xp">

 ${fase.xp} XP

 </div>

 </div>

 `;

 document.getElementById(
 "fase-detalhe-footer"
 ).innerHTML = `

 <button
 class="btn-primary"
 onclick="concluirFase(${id})">

 Concluir Fase

 </button>

 `;

 abrirModal(
 "modal-fase"
 );

}

// ===============================
// CONCLUIR FASE
// ===============================

window.concluirFase =
async function(id){

 const refProg =
 ref(
 db,
 "progresso/"+usuarioAtual.uid
 );

 const snap =
 await get(refProg);

 let fases = [];

 if(
 snap.exists()
 ){

 fases =
 snap.val().fases || [];

 }

 if(
 fases.includes(id)
 ){

 toast(
 "Já concluída",
 "err"
 );

 return;

 }

 fases.push(id);

 await set(
 refProg,
 {
  fases
 }
 );

 const fase =
 fasesPadrao.find(
 f=>f.id===id
 );

 if(fase){

 await adicionarXP(
 fase.xp
 );

 }

 fecharModal(
 "modal-fase"
 );

 carregarFases();

 toast(
 "Fase concluída!"
 );

}

// ===============================
// PROGRESSO HOME
// ===============================

window.atualizarProgresso =
async function(){

 const snap =
 await get(
 ref(
 db,
 "progresso/"+usuarioAtual.uid
 )
 );

 let feitas = 0;

 if(
 snap.exists()
 ){

 feitas =
 (
 snap.val().fases || []
 ).length;

 }

 const total =
 fasesPadrao.length;

 const porcentagem =
 Math.round(
 (feitas/total)*100
 );

 atualizarRing(
 porcentagem
 );

}

// ===============================
// INICIAR SISTEMA
// ===============================

setTimeout(()=>{

 if(usuarioAtual){

 carregarFases();

 atualizarProgresso();

 }

},3000);
