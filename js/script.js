/**
 * SEXTA FEIRA STUDIES — script.js
 * Firebase Modular | Realtime Database | ImgBB
 * REGRAS FIREBASE NECESSÁRIAS (Realtime Database → Regras):
 * { "rules": { ".read": "auth != null", ".write": "auth != null" } }
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider,
  signOut, updateProfile, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getDatabase, ref, set, get, push, update, remove,
  onValue, off, query, orderByChild, limitToLast
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

/* ─── CONFIG ─── */
const FB = {
  apiKey: "AIzaSyDGYiJorNt7x80mP6DxPrFj97Qmm1YFgMI",
  authDomain: "sf-studios-a58b1.firebaseapp.com",
  databaseURL: "https://sf-studios-a58b1-default-rtdb.firebaseio.com",
  projectId: "sf-studios-a58b1",
  storageBucket: "sf-studios-a58b1.firebasestorage.app",
  messagingSenderId: "876592442561",
  appId: "1:876592442561:web:87b6150b97d8b0a92ef840",
};
const IMGBB = "86427cccd2a94fb42a0754ffd7f19e79";

const fbApp = initializeApp(FB);
const auth  = getAuth(fbApp);
const db    = getDatabase(fbApp);
const gp    = new GoogleAuthProvider();

/* ─── ESTADO GLOBAL ─── */
let EU = null;       // usuário Firebase Auth
let PERFIL = null;   // dados do banco
let feedOff = null;  // unsubscribe do feed
let postImg64 = null;
let capaImg64 = null;
let postIdAberto = null;
let filtroMat = "";
let todosModulos = [];
let qCount = 0;
let abaAtual = "home";

/* ─── FASES BASE ─── */
const FASES = [
  {id:"f01",em:"🌱",tit:"Início da Jornada",    mat:"Geral",       xpReq:0,   xpP:30, dif:1},
  {id:"f02",em:"📐",tit:"Números e Operações",  mat:"Matemática",  xpReq:30,  xpP:35, dif:1},
  {id:"f03",em:"📚",tit:"Leitura e Escrita",    mat:"Português",   xpReq:65,  xpP:35, dif:1},
  {id:"f04",em:"🌍",tit:"Explorando o Mundo",   mat:"Geografia",   xpReq:100, xpP:40, dif:2},
  {id:"f05",em:"🏛️",tit:"Raízes Históricas",    mat:"História",    xpReq:140, xpP:40, dif:2},
  {id:"f06",em:"🔬",tit:"Ciências da Vida",     mat:"Ciências",    xpReq:180, xpP:45, dif:2},
  {id:"f07",em:"🧬",tit:"DNA e Evolução",       mat:"Biologia",    xpReq:225, xpP:50, dif:3},
  {id:"f08",em:"⚛️",tit:"Leis da Física",       mat:"Física",      xpReq:275, xpP:50, dif:3},
  {id:"f09",em:"🧪",tit:"Reações Químicas",     mat:"Química",     xpReq:325, xpP:55, dif:3},
  {id:"f10",em:"🇬🇧",tit:"English Journey",      mat:"Inglês",      xpReq:380, xpP:55, dif:3},
  {id:"f11",em:"🤔",tit:"Pensamento Crítico",   mat:"Filosofia",   xpReq:435, xpP:60, dif:4},
  {id:"f12",em:"💻",tit:"Código e Algoritmos",  mat:"Programação", xpReq:495, xpP:65, dif:4},
  {id:"f13",em:"💼",tit:"Mundo dos Negócios",   mat:"Empreend.",   xpReq:560, xpP:70, dif:4},
  {id:"f14",em:"🏆",tit:"Mestre do Saber",      mat:"Geral",       xpReq:640, xpP:120,dif:5},
];
const POSICOES = ["cen","esq","cen","dir","cen","esq","cen","dir","cen","esq","cen","dir","cen","cen"];

/* ─── UTILS ─── */
function esc(s){ if(!s)return""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function ago(ts){ if(!ts)return""; const d=Math.floor((Date.now()-ts)/1000); if(d<60)return"agora"; if(d<3600)return Math.floor(d/60)+"min"; if(d<86400)return Math.floor(d/3600)+"h"; return Math.floor(d/86400)+"d"; }
function ytId(url){ const m=url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m?m[1]:null; }
function nivel(xp){ return Math.floor((xp||0)/100)+1; }
function progXP(xp){ return (xp||0)%100; }
function av(nome){ return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome||"U")}&background=00C9B1&color=fff&size=128`; }
function matEmoji(m){ const map={"Matemática":"📐","Português":"📚","Literatura":"📖","Redação":"✍️","História":"🏛️","Geografia":"🌍","Ciências":"🔬","Biologia":"🧬","Física":"⚛️","Química":"🧪","Inglês":"🇬🇧","Espanhol":"🇪🇸","Filosofia":"🤔","Sociologia":"🧑‍🤝‍🧑","Artes":"🎨","Ed. Física":"🏃","Programação":"💻","Robótica":"🤖","Empreend.":"💼"}; return map[m]||"📕"; }
function errFb(c){ const m={"auth/user-not-found":"E-mail não cadastrado.","auth/wrong-password":"Senha incorreta.","auth/invalid-credential":"E-mail ou senha inválidos.","auth/email-already-in-use":"E-mail já em uso.","auth/weak-password":"Senha muito fraca (mín. 6 chars).","auth/invalid-email":"E-mail inválido.","auth/too-many-requests":"Muitas tentativas.","auth/popup-closed-by-user":"Login cancelado.","auth/network-request-failed":"Sem conexão."}; return m[c]||"Erro: "+c; }

function toast(msg, tipo=""){
  const el=document.getElementById("toast");
  if(!el)return;
  el.textContent=msg; el.className="toast show"+(tipo?" "+tipo:"");
  clearTimeout(el._t); el._t=setTimeout(()=>{el.className="toast"},3200);
}
function showXP(n){
  const el=document.getElementById("xp-pop"),t=document.getElementById("xp-pop-txt");
  if(!el||!t)return;
  t.textContent="+"+n+" XP"; el.style.display="flex";
  setTimeout(()=>el.classList.add("show"),10);
  setTimeout(()=>{el.classList.remove("show");setTimeout(()=>{el.style.display="none"},350)},2000);
}
async function toB64(file){ return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);}); }
async function imgbb(b64){
  const f=new FormData(); f.append("image",b64.split(",")[1]);
  const r=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB}`,{method:"POST",body:f});
  const j=await r.json(); if(!j.success)throw new Error("ImgBB falhou"); return j.data.url;
}

/* ─── MODAIS ─── */
function openModal(id){
  const el=document.getElementById(id); if(!el)return;
  el.style.display="flex";
  if(id==="m-post"&&PERFIL){
    const a=document.getElementById("post-av-img"); if(a)a.src=PERFIL.foto||av(PERFIL.nome);
    const n=document.getElementById("post-av-nome"); if(n)n.textContent=PERFIL.nome||"Você";
    const ca=document.getElementById("bar-av"); if(ca)ca.src=PERFIL.foto||av(PERFIL.nome);
  }
  if(id==="m-edit-pf"&&PERFIL){
    const n=document.getElementById("edit-nome"); if(n)n.value=PERFIL.nome||"";
    const b=document.getElementById("edit-bio");  if(b)b.value=PERFIL.bio||"";
  }
}
window.openModal=openModal;
function closeModal(id){ const el=document.getElementById(id); if(el)el.style.display="none"; }
window.closeModal=closeModal;
document.querySelectorAll(".modal-ov").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.style.display="none";}));

/* ─── AUTH ─── */
window.trocarAba=function(aba){
  document.querySelectorAll(".auth-aba").forEach((b,i)=>b.classList.toggle("ativa",["entrar","cadastro"][i]===aba));
  document.querySelectorAll(".auth-painel").forEach(p=>p.classList.toggle("ativo",p.id==="painel-"+aba));
  ["err-entrar","err-cadastro"].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display="none";});
};
window.toggleOlho=function(id,btn){
  const i=document.getElementById(id); if(!i)return;
  const ic=btn.querySelector(".material-icons-round");
  i.type=i.type==="password"?"text":"password";
  ic.textContent=i.type==="password"?"visibility":"visibility_off";
};
function mostrarErroAuth(id,msg){ const e=document.getElementById(id); if(!e)return; e.textContent=msg; e.style.display="block"; }
function setBtnLoad(id,load,label){
  const b=document.getElementById(id); if(!b)return;
  b.disabled=load;
  b.innerHTML=load?'<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span> Aguarde...':label;
}

window.fazerLogin=async function(){
  const email=document.getElementById("e-email")?.value.trim();
  const senha=document.getElementById("e-senha")?.value;
  document.getElementById("err-entrar").style.display="none";
  if(!email||!senha){mostrarErroAuth("err-entrar","Preencha e-mail e senha.");return;}
  setBtnLoad("btn-entrar",true,'<span class="material-icons-round">login</span> Entrar');
  try{ await signInWithEmailAndPassword(auth,email,senha); }
  catch(e){ mostrarErroAuth("err-entrar",errFb(e.code)); setBtnLoad("btn-entrar",false,'<span class="material-icons-round">login</span> Entrar'); }
};

window.fazerCadastro=async function(){
  const nome=document.getElementById("c-nome")?.value.trim();
  const email=document.getElementById("c-email")?.value.trim();
  const senha=document.getElementById("c-senha")?.value;
  const conf=document.getElementById("c-confirma")?.value;
  document.getElementById("err-cadastro").style.display="none";
  if(!nome){mostrarErroAuth("err-cadastro","Digite seu nome.");return;}
  if(!email){mostrarErroAuth("err-cadastro","Digite seu e-mail.");return;}
  if(senha.length<6){mostrarErroAuth("err-cadastro","Senha mínima: 6 caracteres.");return;}
  if(senha!==conf){mostrarErroAuth("err-cadastro","As senhas não coincidem.");return;}
  setBtnLoad("btn-cadastro",true,'<span class="material-icons-round">person_add</span> Criando...');
  try{
    const c=await createUserWithEmailAndPassword(auth,email,senha);
    await updateProfile(c.user,{displayName:nome});
  }catch(e){ mostrarErroAuth("err-cadastro",errFb(e.code)); setBtnLoad("btn-cadastro",false,'<span class="material-icons-round">person_add</span> Criar conta'); }
};

window.loginGoogle=async function(){
  try{ await signInWithPopup(auth,gp); }
  catch(e){ toast(errFb(e.code),"err"); }
};

window.recuperarSenha=async function(){
  const email=document.getElementById("e-email")?.value.trim();
  if(!email){mostrarErroAuth("err-entrar","Digite seu e-mail primeiro.");return;}
  try{ await sendPasswordResetEmail(auth,email); toast("E-mail de recuperação enviado!","ok"); }
  catch(e){ mostrarErroAuth("err-entrar",errFb(e.code)); }
};

window.fazerLogout=async function(){
  if(feedOff){off(ref(db,"posts"));feedOff=null;}
  await signOut(auth);
};

/* ─── AUTH STATE OBSERVER ─── */
onAuthStateChanged(auth,async user=>{
  if(user){
    EU=user;
    try{
      await garantirPerfil(user);
      await carregarPerfil();
    }catch(e){
      // Se der permission denied, as regras do Firebase precisam ser configuradas
      console.warn("Aviso Firebase:",e.message);
      // Criar perfil local temporário
      PERFIL={uid:user.uid,nome:user.displayName||"Estudante",email:user.email||"",foto:user.photoURL||"",bio:"",xp:0,streak:0};
    }
    iniciarApp();
    ocultarOverlay();
    mostrarTela("tela-app");
  }else{
    EU=null; PERFIL=null;
    if(feedOff){off(ref(db,"posts"));feedOff=null;}
    ocultarOverlay();
    mostrarTela("tela-auth");
    setBtnLoad("btn-entrar",false,'<span class="material-icons-round">login</span> Entrar');
    setBtnLoad("btn-cadastro",false,'<span class="material-icons-round">person_add</span> Criar conta');
  }
});

async function garantirPerfil(user){
  const r=ref(db,`usuarios/${user.uid}`);
  const snap=await get(r);
  if(!snap.exists()){
    const hoje=new Date().toDateString();
    await set(r,{
      nome:user.displayName||"Estudante",
      email:user.email||"",
      foto:user.photoURL||"",
      bio:"",xp:0,streak:1,ultimaData:hoje,
      criadoEm:Date.now(),isAdmin:false,banido:false
    });
  }else{
    // Atualizar streak
    const d=snap.val(); const hoje=new Date().toDateString();
    if(d.ultimaData!==hoje){
      const ontem=new Date(Date.now()-86400000).toDateString();
      const novoStreak=d.ultimaData===ontem?(d.streak||0)+1:1;
      await update(r,{ultimaData:hoje,streak:novoStreak});
    }
  }
}

async function carregarPerfil(){
  const snap=await get(ref(db,`usuarios/${EU.uid}`));
  if(!snap.exists())return;
  PERFIL={...snap.val(),uid:EU.uid};
}

function mostrarTela(id){
  document.querySelectorAll(".tela").forEach(t=>t.classList.remove("ativa"));
  const el=document.getElementById(id); if(el)el.classList.add("ativa");
}
function ocultarOverlay(){
  const ol=document.getElementById("overlay"); if(!ol)return;
  ol.classList.add("sumindo");
  setTimeout(()=>{ ol.style.display="none"; },450);
}

/* ─── INIT ─── */
function iniciarApp(){
  atualizarHdr();
  atualizarPerfil();
  carregarFeed();
  carregarModulos();
  carregarMissoes();
  carregarAviso();
}

function atualizarHdr(){
  if(!PERFIL)return;
  const foto=PERFIL.foto||av(PERFIL.nome);
  const xp=PERFIL.xp||0;
  const hxp=document.getElementById("hdr-xp"); if(hxp)hxp.textContent=xp+" XP";
  const hs=document.getElementById("hdr-streak"); if(hs)hs.textContent=PERFIL.streak||0;
  const hai=document.getElementById("hdr-av-img"); if(hai)hai.src=foto;
  const bav=document.getElementById("bar-av"); if(bav)bav.src=foto;
  const pav=document.getElementById("post-av-img"); if(pav)pav.src=foto;
  const cav=document.getElementById("coment-av"); if(cav)cav.src=foto;
}

function atualizarPerfil(){
  if(!PERFIL)return;
  const xp=PERFIL.xp||0; const nv=nivel(xp); const pg=progXP(xp);
  const foto=PERFIL.foto||av(PERFIL.nome);
  const set=(id,v,attr="text")=>{ const e=document.getElementById(id); if(!e)return; if(attr==="src")e.src=v; else e.textContent=v; };
  set("pf-av","src"); document.getElementById("pf-av")&&(document.getElementById("pf-av").src=foto);
  set("pf-nome",PERFIL.nome||"Estudante");
  set("pf-bio",PERFIL.bio||"Sem bio.");
  set("pf-xp",xp); set("pf-nivel",nv); set("pf-streak",PERFIL.streak||0);
  set("nivel-txt","Nível "+nv); set("nivel-xp-info",pg+"/100 XP");
  const b=document.getElementById("xp-barra"); if(b)b.style.width=pg+"%";
  // medalhas
  const mw=document.getElementById("pf-medalhas");
  if(mw&&PERFIL.medalhas){
    mw.innerHTML=Object.values(PERFIL.medalhas).map(m=>`<div class="medalha"><span class="material-icons-round">emoji_events</span>${esc(m.nome)}</div>`).join("");
  }
  contarPerfil();
}

async function contarPerfil(){
  if(!EU)return;
  try{
    const [sm,sp]=await Promise.all([get(ref(db,"modulos")),get(ref(db,"posts"))]);
    let cm=0,cp=0;
    sm.forEach(c=>{if(c.val().autorId===EU.uid)cm++;});
    sp.forEach(c=>{if(c.val().autorId===EU.uid)cp++;});
    const em=document.getElementById("pf-mods"); if(em)em.textContent=cm;
    const ep=document.getElementById("pf-posts"); if(ep)ep.textContent=cp;
    renderMeusModulos(sm);
  }catch(e){}
}

/* ─── NAVEGAÇÃO ─── */
window.irAba=function(aba,btn){
  abaAtual=aba;
  document.querySelectorAll(".aba").forEach(a=>a.classList.remove("ativa"));
  document.querySelectorAll(".nav-btn[data-tab]").forEach(b=>b.classList.remove("ativo"));
  const sec=document.getElementById("aba-"+aba); if(sec)sec.classList.add("ativa");
  if(btn)btn.classList.add("ativo");
  else{ const nb=document.querySelector(`.nav-btn[data-tab="${aba}"]`); if(nb)nb.classList.add("ativo"); }
  const m=document.getElementById("app-main"); if(m)m.scrollTop=0;
  if(aba==="ranking")carregarRanking();
  if(aba==="trilha")carregarTrilha();
  if(aba==="perfil"){atualizarPerfil();}
  if(aba==="missoes")carregarMissoes();
};

/* ─── XP ─── */
async function addXP(n,acao){
  if(!EU||!PERFIL)return;
  const novo=(PERFIL.xp||0)+n;
  try{ await update(ref(db,`usuarios/${EU.uid}`),{xp:novo}); }catch(e){}
  PERFIL.xp=novo; showXP(n); atualizarHdr(); atualizarPerfil();
  if(acao)verificarMissoes(acao);
}

/* ─── AVISO ─── */
async function carregarAviso(){
  try{
    const snap=await get(query(ref(db,"avisos"),orderByChild("criadoEm"),limitToLast(1)));
    if(!snap.exists())return;
    snap.forEach(c=>{
      const a=c.val(); if(!a.ativo)return;
      const box=document.getElementById("aviso-box");
      const t=document.getElementById("aviso-titulo");
      const m=document.getElementById("aviso-msg");
      if(box&&t&&m){ t.textContent=a.titulo||"Aviso"; m.textContent=a.mensagem||""; box.style.display="flex"; }
    });
  }catch(e){}
}

/* ─── FEED ─── */
function carregarFeed(){
  const fd=document.getElementById("feed"); if(!fd)return;
  fd.innerHTML='<div class="load-box"><div class="spin"></div><p>Carregando...</p></div>';
  const q=query(ref(db,"posts"),orderByChild("criadoEm"),limitToLast(30));
  if(feedOff)off(ref(db,"posts"));
  feedOff=onValue(q,snap=>{
    const posts=[]; snap.forEach(c=>posts.unshift({id:c.key,...c.val()}));
    if(!posts.length){ fd.innerHTML='<div class="vazio"><span class="material-icons-round">feed</span><p>Nenhuma publicação ainda.</p></div>'; return; }
    fd.innerHTML=posts.map(htmlPost).join("");
  });
}

function htmlPost(p){
  const foto=p.autorFoto||av(p.autorNome);
  const curs=p.curtidas||{};
  const curtido=EU&&curs[EU.uid];
  const nc=Object.keys(curs).length;
  const nco=p.comentarios?Object.keys(p.comentarios).length:0;
  const ehMeu=EU&&p.autorId===EU.uid;
  return `<div class="post-card" id="pc-${esc(p.id)}">
    <div class="post-topo">
      <img src="${esc(foto)}" alt="" onclick="verPerfPub('${esc(p.autorId)}')"/>
      <div class="post-autor" onclick="verPerfPub('${esc(p.autorId)}')">
        <strong>${esc(p.autorNome||"Anônimo")}</strong>
        <small>${ago(p.criadoEm)}</small>
      </div>
      ${ehMeu?`<button class="post-del-btn" onclick="delPost('${esc(p.id)}')"><span class="material-icons-round">delete</span></button>`:""}
    </div>
    <div class="post-body">
      ${p.texto?`<p>${esc(p.texto).replace(/\n/g,"<br>")}</p>`:""}
      ${p.imgURL?`<img src="${esc(p.imgURL)}" alt="" loading="lazy"/>`:""}
    </div>
    <div class="post-footer">
      <button class="btn-curtir ${curtido?"curtido":""}" onclick="curtir('${esc(p.id)}')">
        <span class="material-icons-round">${curtido?"favorite":"favorite_border"}</span>${nc}
      </button>
      <button class="btn-coment" onclick="abrirComent('${esc(p.id)}')">
        <span class="material-icons-round">chat_bubble_outline</span>${nco}
      </button>
    </div>
  </div>`;
}

window.curtir=async function(pid){
  if(!EU)return;
  const cr=ref(db,`posts/${pid}/curtidas/${EU.uid}`);
  const snap=await get(cr);
  if(snap.exists())await remove(cr); else{ await set(cr,true); await addXP(1,null); }
};

window.delPost=async function(pid){
  if(!confirm("Excluir este post?"))return;
  try{ await remove(ref(db,`posts/${pid}`)); toast("Post excluído.","ok"); }catch(e){ toast("Erro: "+e.message,"err"); }
};

window.abrirComent=async function(pid){
  postIdAberto=pid;
  try{
    const snap=await get(ref(db,`posts/${pid}`));
    if(!snap.exists())return;
    const p={id:pid,...snap.val()};
    const foto=p.autorFoto||av(p.autorNome);
    document.getElementById("ver-post-corpo").innerHTML=`
      <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.65rem">
        <img src="${esc(foto)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover"/>
        <div><strong style="font-size:.87rem">${esc(p.autorNome||"Anônimo")}</strong><br><small style="font-size:.72rem;color:var(--mt)">${ago(p.criadoEm)}</small></div>
      </div>
      ${p.texto?`<p style="font-size:.9rem;line-height:1.58;color:var(--sub);margin-bottom:.5rem">${esc(p.texto).replace(/\n/g,"<br>")}</p>`:""}
      ${p.imgURL?`<img src="${esc(p.imgURL)}" style="width:100%;border-radius:12px;max-height:240px;object-fit:cover"/>`:""}`;
    const sc=await get(ref(db,`posts/${pid}/comentarios`));
    renderComents(sc);
    openModal("m-ver-post");
  }catch(e){ toast("Erro: "+e.message,"err"); }
};

function renderComents(snap){
  const l=document.getElementById("lista-coments"); if(!l)return;
  if(!snap||!snap.exists()){ l.innerHTML='<p style="color:var(--mt);font-size:.83rem;margin-bottom:.5rem">Nenhum comentário ainda.</p>'; return; }
  const cs=[]; snap.forEach(c=>cs.push({id:c.key,...c.val()}));
  l.innerHTML=cs.map(c=>`<div class="coment-item"><img src="${esc(c.autorFoto||av(c.autorNome))}" alt=""/><div class="coment-bolha"><strong>${esc(c.autorNome||"Anônimo")}</strong><span>${esc(c.texto)}</span></div></div>`).join("");
}

window.enviarComentario=async function(){
  const inp=document.getElementById("coment-txt");
  const txt=inp?.value.trim();
  if(!txt||!postIdAberto||!EU||!PERFIL)return;
  inp.value="";
  try{
    await push(ref(db,`posts/${postIdAberto}/comentarios`),{autorId:EU.uid,autorNome:PERFIL.nome||"Estudante",autorFoto:PERFIL.foto||"",texto:txt,criadoEm:Date.now()});
    await addXP(2,"comentar");
    const snap=await get(ref(db,`posts/${postIdAberto}/comentarios`));
    renderComents(snap);
    toast("Comentário enviado!","ok");
  }catch(e){ toast("Erro: "+e.message,"err"); }
};

/* ─── CRIAR POST ─── */
window.selecionarFotoPost=async function(inp){
  if(!inp.files[0])return;
  postImg64=await toB64(inp.files[0]);
  const pi=document.getElementById("post-prev"); if(pi)pi.src=postImg64;
  const pv=document.getElementById("post-img-prev"); if(pv)pv.style.display="block";
};
window.removerImgPost=function(){
  postImg64=null;
  const pv=document.getElementById("post-img-prev"); if(pv)pv.style.display="none";
  const pf=document.getElementById("post-file"); if(pf)pf.value="";
};
window.publicarPost=async function(){
  const txt=document.getElementById("post-txt")?.value.trim();
  if(!txt&&!postImg64){ toast("Escreva algo ou adicione uma imagem.","err"); return; }
  if(!EU||!PERFIL)return;
  const btn=document.getElementById("btn-pub");
  btn.disabled=true; btn.innerHTML='<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span> Publicando...';
  try{
    let imgURL=null;
    if(postImg64){ toast("Enviando imagem..."); imgURL=await imgbb(postImg64); }
    await push(ref(db,"posts"),{autorId:EU.uid,autorNome:PERFIL.nome||"Estudante",autorFoto:PERFIL.foto||"",texto:txt,imgURL,criadoEm:Date.now()});
    await addXP(5,"postar");
    toast("Publicado! +5 XP 🎉","ok");
    document.getElementById("post-txt").value="";
    postImg64=null;
    const pv=document.getElementById("post-img-prev"); if(pv)pv.style.display="none";
    const pf=document.getElementById("post-file"); if(pf)pf.value="";
    closeModal("m-post");
  }catch(e){ toast("Erro: "+e.message,"err"); }
  finally{ btn.disabled=false; btn.innerHTML='<span class="material-icons-round">send</span> Publicar'; }
};

/* ─── MÓDULOS ─── */
function carregarModulos(){
  const g=document.getElementById("grade-mods"); if(!g)return;
  g.innerHTML='<div class="load-box"><div class="spin"></div><p>Carregando...</p></div>';
  get(query(ref(db,"modulos"),orderByChild("criadoEm"),limitToLast(60))).then(snap=>{
    todosModulos=[]; snap.forEach(c=>todosModulos.unshift({id:c.key,...c.val()}));
    renderMods(todosModulos,"grade-mods");
  }).catch(e=>{ g.innerHTML=`<div class="vazio"><span class="material-icons-round">error</span><p>${esc(e.message)}</p></div>`; });
}

function renderMods(lista,containerId){
  const g=document.getElementById(containerId); if(!g)return;
  const busca=(document.getElementById("busca-mod")?.value||"").toLowerCase();
  const fil=lista.filter(m=>(!busca||(m.titulo||"").toLowerCase().includes(busca)||(m.descricao||"").toLowerCase().includes(busca))&&(!filtroMat||m.materia===filtroMat));
  if(!fil.length){ g.innerHTML='<div class="vazio"><span class="material-icons-round">layers_clear</span><p>Nenhum módulo encontrado.</p></div>'; return; }
  g.innerHTML=fil.map(m=>{
    const cs=m.curtidas?Object.keys(m.curtidas).length:0;
    return `<div class="mod-card" onclick="verMod('${esc(m.id)}')">
      ${m.oficial?'<div class="mod-oficial"><span class="material-icons-round">verified</span> Oficial</div>':""}
      <div class="mod-capa">${m.capaURL?`<img src="${esc(m.capaURL)}" alt="" loading="lazy"/>`:matEmoji(m.materia)}</div>
      <div class="mod-corpo">
        <span class="mod-mat-tag">${esc(m.materia||"Geral")}</span>
        <div class="mod-tit">${esc(m.titulo)}</div>
        <div class="mod-autor">por ${esc(m.autorNome||"Anônimo")}</div>
        <div class="mod-stats"><span><span class="material-icons-round">favorite</span>${cs}</span><span><span class="material-icons-round">visibility</span>${m.acessos||0}</span></div>
      </div>
    </div>`;
  }).join("");
}

window.filtrarMods=function(){ renderMods(todosModulos,"grade-mods"); };

document.getElementById("chips-mat")?.addEventListener("click",e=>{
  const chip=e.target.closest(".chip"); if(!chip)return;
  document.querySelectorAll("#chips-mat .chip").forEach(c=>c.classList.remove("ativo"));
  chip.classList.add("ativo"); filtroMat=chip.dataset.m||""; renderMods(todosModulos,"grade-mods");
});

window.verMod=async function(mid){
  try{
    const snap=await get(ref(db,`modulos/${mid}`));
    if(!snap.exists()){ toast("Módulo não encontrado.","err"); return; }
    const m={id:mid,...snap.val()};
    update(ref(db,`modulos/${mid}`),{acessos:(m.acessos||0)+1}).catch(()=>{});
    const capaH=m.capaURL?`<div class="mod-view-capa"><img src="${esc(m.capaURL)}" alt=""/></div>`:`<div class="mod-view-capa">${matEmoji(m.materia)}</div>`;
    const vids=m.videos?Object.values(m.videos).filter(Boolean).map(url=>{const vid=ytId(url);return vid?`<div class="vid-embed"><iframe src="https://www.youtube.com/embed/${vid}" allowfullscreen loading="lazy"></iframe></div>`:""}).join(""):"";
    const qqs=m.quiz?Object.values(m.quiz):[]; const quizH=qqs.length?renderQuizMod(qqs,mid):"";
    document.getElementById("mod-view").innerHTML=`
      ${capaH}
      <div class="mod-view-meta">
        ${m.oficial?'<div class="mod-oficial" style="display:inline-flex;margin-bottom:.5rem"><span class="material-icons-round">verified</span> Oficial</div>':""}
        <div class="mod-mat-tag">${esc(m.materia||"Geral")}</div>
        <div class="mod-view-tit">${esc(m.titulo)}</div>
        <div class="mod-view-autor"><img src="${esc(m.autorFoto||av(m.autorNome))}" alt=""/><span>por ${esc(m.autorNome||"Anônimo")}</span></div>
        ${m.descricao?`<div class="mod-view-desc">${esc(m.descricao)}</div>`:""}
      </div>
      ${m.conteudo?`<div class="mod-sec"><h3><span class="material-icons-round">article</span> Conteúdo</h3><div class="mod-txt">${esc(m.conteudo)}</div></div>`:""}
      ${vids?`<div class="mod-sec"><h3><span class="material-icons-round">play_circle</span> Vídeos</h3>${vids}</div>`:""}
      ${quizH?`<div class="mod-sec"><h3><span class="material-icons-round">quiz</span> Quiz</h3>${quizH}</div>`:""}`;
    openModal("m-ver-mod");
  }catch(e){ toast("Erro: "+e.message,"err"); }
};

function renderQuizMod(qs,mid){
  return `<div id="qmod-${esc(mid)}">${qs.map((q,qi)=>`
    <div class="quiz-q" id="qm-${esc(mid)}-${qi}">
      <div class="quiz-q-txt">${qi+1}. ${esc(q.enunciado)}</div>
      <div class="quiz-opts">${(q.opcoes||[]).map((op,oi)=>`<button class="quiz-opt-btn" id="qmb-${esc(mid)}-${qi}-${oi}" onclick="respMod('${esc(mid)}',${qi},${oi},${q.correta})">${"ABCD"[oi]}) ${esc(op)}</button>`).join("")}</div>
      <div id="qmf-${esc(mid)}-${qi}"></div>
    </div>`).join("")}
    <div id="qmr-${esc(mid)}" style="display:none"></div>
  </div>`;
}

window.respMod=async function(mid,qi,sel,correta){
  document.querySelectorAll(`[id^="qmb-${mid}-${qi}-"]`).forEach(b=>b.disabled=true);
  const bs=document.getElementById(`qmb-${mid}-${qi}-${sel}`);
  const bc=document.getElementById(`qmb-${mid}-${qi}-${correta}`);
  const fb=document.getElementById(`qmf-${mid}-${qi}`);
  const ok=sel===correta;
  if(bs)bs.classList.add(ok?"certa":"errada");
  if(bc&&!ok)bc.classList.add("certa");
  if(fb)fb.innerHTML=`<span class="quiz-fb ${ok?"ok":"fail"}">${ok?"✅ Correto! +10 XP":"❌ Errado"}</span>`;
  if(ok)await addXP(10,"acertar_questao");
  const todas=document.querySelectorAll(`#qmod-${mid} .quiz-opt-btn:not([disabled])`).length===0;
  if(todas){
    const acertos=document.querySelectorAll(`#qmod-${mid} .quiz-opt-btn.certa`).length;
    const total=document.querySelectorAll(`#qmod-${mid} .quiz-q`).length;
    const res=document.getElementById(`qmr-${mid}`); if(res){ res.style.display="block"; res.innerHTML=`<div class="quiz-res"><h3>${acertos}/${total} corretas 🎉</h3><p>Módulo concluído!</p><span class="xp-tag">+50 XP</span></div>`; }
    await addXP(50,"completar_modulo");
    try{ await set(ref(db,`progresso/${EU?.uid}/modulos/${mid}`),{concluidoEm:Date.now(),acertos,total}); }catch(e){}
  }
};

function renderMeusModulos(snapMods){
  const g=document.getElementById("meus-mods"); if(!g||!EU)return;
  const meus=[]; snapMods.forEach(c=>{if(c.val().autorId===EU.uid)meus.unshift({id:c.key,...c.val()});});
  if(!meus.length){ g.innerHTML='<div class="vazio"><span class="material-icons-round">layers</span><p>Você ainda não criou módulos.</p></div>'; return; }
  g.innerHTML=meus.map(m=>`<div class="mod-card" onclick="verMod('${esc(m.id)}')">
    <div class="mod-capa">${m.capaURL?`<img src="${esc(m.capaURL)}" alt="" loading="lazy"/>`:matEmoji(m.materia)}</div>
    <div class="mod-corpo"><span class="mod-mat-tag">${esc(m.materia||"Geral")}</span><div class="mod-tit">${esc(m.titulo)}</div></div>
  </div>`).join("");
}

/* ─── CRIAR MÓDULO ─── */
window.prevCapa=async function(inp){
  if(!inp.files[0])return;
  capaImg64=await toB64(inp.files[0]);
  const p=document.getElementById("capa-prev"); if(p){ p.src=capaImg64; p.style.display="block"; }
  const s=document.getElementById("capa-span"); if(s)s.style.display="none";
};
window.addVideo=function(){
  const w=document.createElement("div"); w.className="video-row";
  w.innerHTML=`<input type="text" class="video-in" placeholder="Cole a URL do YouTube..."/><button class="btn-icon-sm" onclick="this.closest('.video-row').remove()"><span class="material-icons-round">remove</span></button>`;
  document.getElementById("videos-wrap")?.appendChild(w);
};
window.addQuestao=function(){
  const idx=qCount++;
  const b=document.createElement("div"); b.className="q-bloco"; b.dataset.q=idx;
  b.innerHTML=`<div class="q-topo"><input type="text" class="q-in" placeholder="Enunciado da pergunta..."/><button class="btn-icon-sm" onclick="this.closest('.q-bloco').remove()"><span class="material-icons-round">delete</span></button></div>
  <div class="opts-wrap">${[0,1,2,3].map(i=>`<div class="opt-row"><input type="radio" name="c-${idx}" value="${i}" ${i===0?"checked":""}/><input type="text" class="opt-in" placeholder="Alternativa ${"ABCD"[i]}${i===0?" (correta)":""}"/></div>`).join("")}</div>`;
  document.getElementById("quiz-wrap")?.appendChild(b);
};
window.salvarModulo=async function(){
  const tit=document.getElementById("mod-tit")?.value.trim();
  const mat=document.getElementById("mod-mat")?.value;
  if(!tit){ toast("Informe o título.","err"); return; }
  if(!mat){ toast("Selecione a matéria.","err"); return; }
  if(!EU||!PERFIL)return;
  const btn=document.getElementById("btn-salvar-mod");
  btn.disabled=true; btn.innerHTML='<span class="material-icons-round" style="animation:girar .7s linear infinite">refresh</span> Salvando...';
  try{
    let capaURL=null;
    if(capaImg64){ toast("Enviando capa..."); capaURL=await imgbb(capaImg64); }
    const videos={}; document.querySelectorAll(".video-in").forEach((i,idx)=>{ if(i.value.trim())videos[idx]=i.value.trim(); });
    const quiz={}; let qi=0;
    document.querySelectorAll(".q-bloco").forEach(bl=>{
      const en=bl.querySelector(".q-in")?.value.trim(); if(!en)return;
      const opts=[...bl.querySelectorAll(".opt-in")].map(i=>i.value.trim());
      const r=bl.querySelector("input[type=radio]:checked"); const corr=r?parseInt(r.value):0;
      quiz[qi++]={enunciado:en,opcoes:opts,correta:corr};
    });
    await push(ref(db,"modulos"),{
      titulo:tit, descricao:document.getElementById("mod-desc")?.value.trim()||"",
      materia:mat, conteudo:document.getElementById("mod-cont")?.value.trim()||"",
      capaURL,videos,quiz,
      autorId:EU.uid,autorNome:PERFIL.nome||"Estudante",autorFoto:PERFIL.foto||"",
      oficial:false,acessos:0,criadoEm:Date.now()
    });
    await addXP(20,"criar_modulo");
    toast("Módulo criado! +20 XP 🎉","ok");
    closeModal("m-mod"); resetModForm(); carregarModulos();
  }catch(e){ toast("Erro: "+e.message,"err"); }
  finally{ btn.disabled=false; btn.innerHTML='<span class="material-icons-round">save</span> Salvar módulo'; }
};
function resetModForm(){
  ["mod-tit","mod-desc","mod-cont"].forEach(id=>{ const e=document.getElementById(id); if(e)e.value=""; });
  const sm=document.getElementById("mod-mat"); if(sm)sm.value="";
  const cp=document.getElementById("capa-prev"); if(cp){cp.src="";cp.style.display="none";}
  const cs=document.getElementById("capa-span"); if(cs)cs.style.display="";
  const vw=document.getElementById("videos-wrap"); if(vw)vw.innerHTML='<div class="video-row"><input type="text" class="video-in" placeholder="Cole a URL do YouTube..."/><button class="btn-icon-sm" onclick="addVideo()"><span class="material-icons-round">add</span></button></div>';
  const qw=document.getElementById("quiz-wrap"); if(qw)qw.innerHTML="";
  capaImg64=null; qCount=0;
}

/* ─── TRILHA ─── */
async function carregarTrilha(){
  const tr=document.getElementById("trilha"); if(!tr)return;
  tr.innerHTML='<div class="load-box"><div class="spin"></div><p>Carregando trilha...</p></div>';
  const xp=PERFIL?.xp||0;
  let fases=[...FASES];
  try{
    const sa=await get(ref(db,"fases_admin"));
    if(sa.exists())sa.forEach(c=>{ const f={id:c.key,...c.val()}; if(!fases.find(x=>x.id===f.id))fases.push(f); });
  }catch(e){}
  let conc={};
  try{
    const sp=await get(ref(db,`progresso/${EU?.uid}/fases`));
    if(sp.exists())conc=sp.val();
  }catch(e){}
  // Nível bar
  const nv=nivel(xp); const pg=progXP(xp);
  const el1=document.getElementById("nivel-txt"); if(el1)el1.textContent="Nível "+nv;
  const el2=document.getElementById("nivel-xp-info"); if(el2)el2.textContent=pg+"/100 XP";
  const el3=document.getElementById("xp-barra"); if(el3)el3.style.width=pg+"%";
  // Grupos de 5
  const grupos=[]; for(let i=0;i<fases.length;i+=5)grupos.push(fases.slice(i,i+5));
  tr.innerHTML=grupos.map((g,gi)=>`
    <div class="trilha-sec">
      <div style="text-align:center;margin-bottom:1rem"><span class="trilha-sec-tit">Seção ${gi+1}</span></div>
      <div style="display:flex;justify-content:center"><div class="trilha-nos">
        ${g.map((f,fi)=>{
          const idx=gi*5+fi;
          const done=!!conc[f.id];
          const prevDone=idx===0||(conc[fases[idx-1]?.id]);
          const disp=!done&&xp>=f.xpReq&&prevDone;
          const trav=!done&&!disp;
          const cls=trav?"trav":done?"conc":"disp";
          const ests=done?"⭐⭐⭐":disp?"⭐☆☆":"☆☆☆";
          const pos=POSICOES[idx%POSICOES.length]||"cen";
          const con=idx>0?`<div class="conector ${conc[fases[idx-1]?.id]?"feito":"normal"}"></div>`:"";
          return `${con}<div class="no-wrap ${pos}"><div class="fase-no" onclick="verFase('${f.id}')">
            <button class="fase-circulo ${cls}" ${trav?"disabled":""} title="${esc(f.tit)}">${f.em}</button>
            <span class="fase-lbl">${esc(f.tit)}</span>
            <span class="fase-ests">${ests}</span>
          </div></div>`;
        }).join("")}
      </div></div>
    </div>`).join("");
}

window.verFase=async function(fid){
  const f=FASES.find(x=>x.id===fid); if(!f)return;
  const xp=PERFIL?.xp||0;
  let conc=false, prevConc=true;
  try{
    const sc=await get(ref(db,`progresso/${EU?.uid}/fases/${fid}`)); conc=sc.exists();
    const idx=FASES.indexOf(f);
    if(idx>0){ const sp=await get(ref(db,`progresso/${EU?.uid}/fases/${FASES[idx-1].id}`)); prevConc=sp.exists(); }
  }catch(e){}
  const disp=xp>=f.xpReq&&prevConc;
  const trav=!conc&&!disp;
  const difN=["","🟢 Iniciante","🟡 Básico","🟠 Intermediário","🔴 Avançado","💀 Expert"][f.dif]||"";
  document.getElementById("fase-corpo").innerHTML=`
    <div class="fase-dh">
      <span class="fase-dh-em">${f.em}</span>
      <div class="fase-dh-tit">${esc(f.tit)}</div>
      <div class="fase-dh-sub">${esc(f.mat)} · ${difN}</div>
      <div class="fase-dh-xp"><span class="material-icons-round">bolt</span>+${f.xpP} XP ao concluir</div>
      ${conc?'<div style="margin-top:.5rem;font-size:1.5rem">⭐⭐⭐</div>':""}
    </div>
    ${trav?`<div class="fase-trav-info"><span class="material-icons-round">lock</span><p>Você precisa de <strong>${f.xpReq} XP</strong> para desbloquear.<br>Você tem <strong>${xp} XP</strong>.</p></div>`:""}`;
  const rod=document.getElementById("fase-footer");
  if(trav){ rod.innerHTML=`<button class="btn-prim" style="background:var(--borda);color:var(--mt);box-shadow:none;cursor:not-allowed">🔒 Fase bloqueada</button>`; }
  else if(conc){ rod.innerHTML=`<button class="btn-prim" onclick="closeModal('m-fase');abrirQuizFase('${fid}')"><span class="material-icons-round">replay</span> Refazer fase</button>`; }
  else{ rod.innerHTML=`<button class="btn-prim" onclick="closeModal('m-fase');abrirQuizFase('${fid}')"><span class="material-icons-round">play_arrow</span> Iniciar fase</button>`; }
  openModal("m-fase");
};

window.abrirQuizFase=async function(fid){
  const f=FASES.find(x=>x.id===fid); if(!f)return;
  const el=document.getElementById("quiz-fase-tit"); if(el)el.textContent=f.em+" "+f.tit;
  const body=document.getElementById("quiz-fase-body");
  body.innerHTML='<div class="load-box"><div class="spin"></div><p>Carregando questões...</p></div>';
  openModal("m-quiz-fase");
  let qs=[];
  try{
    const snap=await get(ref(db,`fases_questoes/${fid}`));
    if(snap.exists())snap.forEach(c=>qs.push({id:c.key,...c.val()}));
  }catch(e){}
  if(!qs.length){
    body.innerHTML='<div class="vazio"><span class="material-icons-round">quiz</span><p>Esta fase ainda não tem questões.<br>O administrador precisa adicioná-las no painel.</p></div>';
    return;
  }
  body.innerHTML=`<p style="font-size:.82rem;color:var(--mt);margin-bottom:1rem">📝 ${qs.length} pergunta${qs.length!==1?"s":""}</p>
    ${qs.map((q,qi)=>`<div class="quiz-q" id="fq-${qi}">
      <div class="quiz-q-txt">${qi+1}. ${esc(q.enunciado)}</div>
      <div class="quiz-opts" id="fqops-${qi}">${(q.opcoes||[]).map((op,oi)=>`<button class="quiz-opt-btn" id="fqb-${qi}-${oi}" onclick="respFase(${qi},${oi},${q.correta},'${fid}',${qs.length},${f.xpP})">${"ABCD"[oi]}) ${esc(op)}</button>`).join("")}</div>
      <div id="ffb-${qi}"></div>
    </div>`).join("")}
    <div id="fres" style="display:none"></div>`;
};

window.respFase=async function(qi,sel,correta,fid,total,xpP){
  document.querySelectorAll(`#fqops-${qi} .quiz-opt-btn`).forEach(b=>b.disabled=true);
  const bs=document.getElementById(`fqb-${qi}-${sel}`);
  const bc=document.getElementById(`fqb-${qi}-${correta}`);
  const fb=document.getElementById(`ffb-${qi}`);
  const ok=sel===correta;
  if(bs)bs.classList.add(ok?"certa":"errada");
  if(bc&&!ok)bc.classList.add("certa");
  if(fb)fb.innerHTML=`<span class="quiz-fb ${ok?"ok":"fail"}">${ok?"✅ Correto! +10 XP":"❌ Errado"}</span>`;
  if(ok)await addXP(10,"acertar_questao");
  const tot=document.querySelectorAll("#quiz-fase-body .quiz-opt-btn").length;
  const dis=document.querySelectorAll("#quiz-fase-body .quiz-opt-btn[disabled]").length;
  if(dis>=tot){
    const ac=document.querySelectorAll("#quiz-fase-body .quiz-opt-btn.certa").length;
    const res=document.getElementById("fres"); if(res){ res.style.display="block"; res.innerHTML=`<div class="quiz-res"><h3>${ac}/${total} corretas 🎉</h3><p>Fase concluída!</p><span class="xp-tag">+${xpP} XP</span></div>`; }
    await addXP(xpP,"completar_fase");
    try{ await set(ref(db,`progresso/${EU?.uid}/fases/${fid}`),{concluidoEm:Date.now(),acertos:ac,total}); }catch(e){}
    toast(`Fase concluída! +${xpP} XP 🎉`,"ok"); carregarTrilha();
  }
};

/* ─── MISSÕES ─── */
async function carregarMissoes(){
  const l=document.getElementById("lista-missoes"); if(!l)return;
  l.innerHTML='<div class="load-box"><div class="spin"></div><p>Carregando...</p></div>';
  const strip=document.getElementById("missoes-strip");
  try{
    const [sm,sp]=await Promise.all([get(ref(db,"missoes")),get(ref(db,`progresso/${EU?.uid}/missoes`))]);
    if(!sm.exists()){ l.innerHTML='<div class="vazio"><span class="material-icons-round">emoji_events</span><p>Nenhuma missão ainda.</p></div>'; if(strip)strip.innerHTML=""; return; }
    const prog=sp.exists()?sp.val():{};
    const missoes=[]; sm.forEach(c=>missoes.push({id:c.key,...c.val()}));
    let pend=0;
    l.innerHTML=missoes.map(m=>{
      const pr=prog[m.id]||{atual:0,concluida:false};
      const pct=Math.min(100,Math.round(((pr.atual||0)/m.meta)*100));
      if(!pr.concluida)pend++;
      return `<div class="missao-card">
        <div class="missao-topo">
          <div class="missao-ico" style="background:${m.corFundo||"var(--TL)"}">${m.emoji||"🎯"}</div>
          <div class="missao-info"><h4>${esc(m.titulo)}</h4><p>${esc(m.descricao)}</p></div>
          <div class="missao-xp"><span class="material-icons-round">bolt</span>+${m.xpPremio||100} XP</div>
        </div>
        ${pr.concluida?`<div class="missao-badge"><span class="material-icons-round">check_circle</span> Concluída!</div>`:`<div class="missao-bw"><div class="missao-bf" style="width:${pct}%"></div></div><div class="missao-pct">${pr.atual||0}/${m.meta} • ${pct}%</div>`}
      </div>`;
    }).join("");
    const badge=document.getElementById("nav-badge"); if(badge){ badge.textContent=pend; badge.style.display=pend>0?"flex":"none"; }
    if(strip){ const at=missoes.filter(m=>!(prog[m.id]?.concluida)).slice(0,4); strip.innerHTML=at.map(m=>{ const pr=prog[m.id]||{atual:0}; const pct=Math.min(100,Math.round(((pr.atual||0)/m.meta)*100)); return `<div class="missao-mini" onclick="irAba('missoes')"><div class="missao-mini-tit">${m.emoji||"🎯"} ${esc(m.titulo)}</div><div class="missao-mini-bw"><div class="missao-mini-bf" style="width:${pct}%"></div></div><div class="missao-mini-txt">${pr.atual||0}/${m.meta}</div></div>`; }).join(""); }
  }catch(e){ l.innerHTML=`<div class="vazio"><span class="material-icons-round">error</span><p>Erro ao carregar missões.</p></div>`; }
}

async function verificarMissoes(acao){
  if(!EU)return;
  try{
    const [sm,sp]=await Promise.all([get(ref(db,"missoes")),get(ref(db,`progresso/${EU.uid}/missoes`))]);
    if(!sm.exists())return;
    const prog=sp.exists()?sp.val():{};
    const upd={};
    sm.forEach(c=>{
      const m={id:c.key,...c.val()}; const pr=prog[m.id]||{atual:0,concluida:false};
      if(pr.concluida||m.acao!==acao)return;
      const novo=(pr.atual||0)+1; const conc=novo>=m.meta;
      upd[m.id]={atual:novo,concluida:conc};
      if(conc){ addXP(m.xpPremio||100,null); toast(`Missão: ${m.titulo}! +${m.xpPremio} XP 🎉`,"ok"); }
    });
    if(Object.keys(upd).length)await update(ref(db,`progresso/${EU.uid}/missoes`),upd);
  }catch(e){}
}

/* ─── RANKING ─── */
async function carregarRanking(){
  const pod=document.getElementById("podio"); const lr=document.getElementById("lista-rank"); if(!pod||!lr)return;
  lr.innerHTML='<div class="load-box"><div class="spin"></div><p>Carregando...</p></div>';
  try{
    const snap=await get(query(ref(db,"usuarios"),orderByChild("xp"),limitToLast(20)));
    const us=[]; snap.forEach(c=>us.unshift({uid:c.key,...c.val()}));
    us.sort((a,b)=>(b.xp||0)-(a.xp||0));
    const t3=us.slice(0,3); const resto=us.slice(3);
    const ord=[{u:t3[1],p:"p2",c:"🥈"},{u:t3[0],p:"p1",c:"👑"},{u:t3[2],p:"p3",c:"🥉"}].filter(x=>x.u);
    pod.innerHTML=ord.map(({u,p,c})=>`<div class="podio-item ${p}"><span class="podio-crown">${c}</span><img class="podio-av" src="${esc(u.foto||av(u.nome))}" alt=""/><span class="podio-nome">${esc((u.nome||"?").split(" ")[0])}</span><span class="podio-xp">${u.xp||0} XP</span><div class="podio-plat">${p==="p1"?"1º":p==="p2"?"2º":"3º"}</div></div>`).join("");
    lr.innerHTML=resto.length?resto.map((u,i)=>`<div class="rank-item ${u.uid===EU?.uid?"meu":""}"><span class="rank-pos">${i+4}º</span><img src="${esc(u.foto||av(u.nome))}" alt=""/><div class="rank-info"><strong>${esc(u.nome||"Anônimo")}</strong><small>Nível ${nivel(u.xp)}</small></div><span class="rank-xp">${u.xp||0} XP</span></div>`).join(""):'<p style="text-align:center;color:var(--mt);padding:1.5rem;font-size:.85rem">Continue estudando para aparecer aqui!</p>';
  }catch(e){ lr.innerHTML=`<div class="vazio"><span class="material-icons-round">error</span><p>Erro ao carregar ranking.</p></div>`; }
}

/* ─── PERFIL ─── */
window.salvarPerfil=async function(){
  const nome=document.getElementById("edit-nome")?.value.trim();
  const bio=document.getElementById("edit-bio")?.value.trim();
  if(!nome){ toast("Nome não pode ser vazio.","err"); return; }
  if(!EU)return;
  try{
    await update(ref(db,`usuarios/${EU.uid}`),{nome,bio});
    PERFIL.nome=nome; PERFIL.bio=bio;
    atualizarHdr(); atualizarPerfil();
    closeModal("m-edit-pf"); toast("Perfil atualizado!","ok");
  }catch(e){ toast("Erro: "+e.message,"err"); }
};

window.trocarFoto=async function(inp){
  if(!inp.files[0]||!EU)return;
  const btn=document.querySelector(".pf-av-edit");
  if(btn)btn.innerHTML='<span class="material-icons-round" style="animation:girar .7s linear infinite;font-size:13px">refresh</span>';
  try{
    const b64=await toB64(inp.files[0]); toast("Enviando foto...");
    const url=await imgbb(b64);
    await update(ref(db,`usuarios/${EU.uid}`),{foto:url});
    PERFIL.foto=url; atualizarHdr(); atualizarPerfil();
    toast("Foto atualizada! 🎉","ok");
  }catch(e){ toast("Erro: "+e.message,"err"); }
  finally{ if(btn)btn.innerHTML='<span class="material-icons-round">photo_camera</span>'; }
};

window.verPerfPub=function(uid){ if(!uid||uid===EU?.uid){ irAba("perfil"); } else { toast("Veja o ranking para mais detalhes."); } };
