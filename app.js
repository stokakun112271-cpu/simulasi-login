import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, GithubAuthProvider,
         signInWithPopup, signInAnonymously,
         createUserWithEmailAndPassword, signInWithEmailAndPassword,
         signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ============================================================
// GANTI DENGAN firebaseConfig DARI FIREBASE CONSOLE LO
// ============================================================
const firebaseConfig = {
  apiKey: "GANTI_API_KEY",
  authDomain: "GANTI.firebaseapp.com",
  projectId: "GANTI_PROJECT_ID",
  storageBucket: "GANTI.appspot.com",
  messagingSenderId: "GANTI_SENDER_ID",
  appId: "GANTI_APP_ID"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let authUser = null;
let tempPin  = '';

window.showScreen = function(id) {
  ['screenLogin','screenLoginEmail','screenRegister','screenUsername','screenPin','screenPinConfirm','screenDashboard']
    .forEach(s => {
      const el = document.getElementById(s);
      if(el) el.classList.add('hidden');
    });
  document.getElementById(id).classList.remove('hidden');
};

window.loginGoogle = async function() {
  try {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    const u = result.user;
    authUser = { name:u.displayName||'', email:u.email||'', avatar:u.photoURL||'', provider:'google', providerId:u.uid };
    await afterAuth();
  } catch(e) { alert('Login Google gagal: ' + e.message); }
};

window.loginFacebook = async function() {
  try {
    const provider = new FacebookAuthProvider();
    provider.addScope('email');
    const result = await signInWithPopup(auth, provider);
    const u = result.user;
    authUser = { name:u.displayName||'', email:u.email||'', avatar:u.photoURL||'', provider:'facebook', providerId:u.uid };
    await afterAuth();
  } catch(e) { alert('Login Facebook gagal: ' + e.message); }
};

window.loginGithub = async function() {
  try {
    const provider = new GithubAuthProvider();
    provider.addScope('user:email');
    const result = await signInWithPopup(auth, provider);
    const u = result.user;
    authUser = { name:u.displayName||'', email:u.email||'', avatar:u.photoURL||'', provider:'github', providerId:u.uid };
    await afterAuth();
  } catch(e) { alert('Login GitHub gagal: ' + e.message); }
};

window.loginGuest = async function() {
  try {
    const result = await signInAnonymously(auth);
    const u = result.user;
    authUser = { name:'Guest', email:'', avatar:'', provider:'guest', providerId:u.uid, isGuest:true };
    await afterAuth();
  } catch(e) { alert('Login guest gagal: ' + e.message); }
};

window.loginX = function() {
  window.location.href = 'https://x.com/i/flow/login';
};

window.loginLine = function() {
  window.location.href = 'https://access.line.me/oauth2/v2.1/login';
};

window.doEmailLogin = async function() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  if(!email || !pass){ alert('Isi email dan password.'); return; }
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    const u = result.user;
    authUser = { name:u.displayName||'', email:u.email||'', avatar:u.photoURL||'', provider:'email', providerId:u.uid };
    await afterAuth();
  } catch(e) { alert('Login gagal: ' + e.message); }
};

window.doRegister = async function() {
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  if(!email || !pass){ alert('Isi email dan password.'); return; }
  if(pass.length < 6){ alert('Password minimal 6 karakter.'); return; }
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const u = result.user;
    authUser = { name:'', email:u.email||'', avatar:'', provider:'email', providerId:u.uid };
    await afterAuth();
  } catch(e) { alert('Daftar gagal: ' + e.message); }
};

async function afterAuth() {
  try {
    const userDoc = await getDoc(doc(db,'users',authUser.providerId));
    if(userDoc.exists() && userDoc.data().username) {
      showDashboard(userDoc.data());
    } else {
      goUsernameStep();
    }
  } catch (e) {
    alert("Gagal ambil data dari database: " + e.message);
  }
}

function goUsernameStep() {
  document.getElementById('setupUsername').value = authUser.name || '';
  document.getElementById('usernameError').textContent = '';
  window.showScreen('screenUsername');
  setTimeout(() => document.getElementById('setupUsername').focus(), 100);
}

window.submitUsername = function() {
  const username = document.getElementById('setupUsername').value.trim();
  const errEl = document.getElementById('usernameError');
  if(!username){ errEl.textContent = 'Username wajib diisi.'; return; }
  if(username.length < 3){ errEl.textContent = 'Username minimal 3 karakter.'; return; }
  if(!/^[a-zA-Z0-9_.]+$/.test(username)){ errEl.textContent = 'Cuma huruf, angka, underscore, titik.'; return; }
  authUser.username = username;
  errEl.textContent = '';
  goPinStep();
};

function goPinStep() {
  clearPinBoxes('pinRow1');
  document.getElementById('pin1Error').textContent = '';
  window.showScreen('screenPin');
  setupPinBoxes('pinRow1');
  setTimeout(() => document.querySelector('#pinRow1 .pin-box').focus(), 100);
}

function setupPinBoxes(rowId) {
  const boxes = document.querySelectorAll('#' + rowId + ' .pin-box');
  boxes.forEach((box, i) => {
    box.oninput = (e) => {
      e.target.value = e.target.value.replace(/\D/g,'').slice(0,1);
      e.target.classList.toggle('filled', !!e.target.value);
      if(e.target.value && i < boxes.length - 1) boxes[i+1].focus();
      if([...boxes].every(b => b.value) && rowId === 'pinRow2') setTimeout(() => window.submitPin2(), 200);
    };
    box.onkeydown = (e) => {
      if(e.key === 'Backspace' && !e.target.value && i > 0){
        boxes[i-1].focus(); boxes[i-1].value=''; boxes[i-1].classList.remove('filled');
      }
    };
    box.onpaste = (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData||window.clipboardData).getData('text').replace(/\D/g,'').slice(0,6);
      [...pasted].forEach((d,j) => { if(boxes[j]){ boxes[j].value=d; boxes[j].classList.add('filled'); } });
      const next = Math.min(pasted.length, boxes.length-1);
      boxes[next].focus();
    };
  });
}

function clearPinBoxes(rowId) {
  document.querySelectorAll('#'+rowId+' .pin-box').forEach(b => { b.value=''; b.classList.remove('filled'); });
}

function readPin(rowId) {
  return [...document.querySelectorAll('#'+rowId+' .pin-box')].map(b => b.value).join('');
}

window.submitPin1 = function() {
  const pin = readPin('pinRow1');
  const errEl = document.getElementById('pin1Error');
  if(pin.length !== 6){ errEl.textContent = 'PIN harus 6 digit.'; return; }
  if(/^(\d)\1{5}$/.test(pin)){ errEl.textContent = 'PIN terlalu lemah.'; return; }
  if(['123456','654321','000000','111111'].includes(pin)){ errEl.textContent = 'PIN terlalu umum.'; return; }
  tempPin = pin;
  errEl.textContent = '';
  clearPinBoxes('pinRow2');
  document.getElementById('pin2Error').textContent = '';
  window.showScreen('screenPinConfirm');
  setupPinBoxes('pinRow2');
  setTimeout(() => document.querySelector('#pinRow2 .pin-box').focus(), 100);
};

window.submitPin2 = async function() {
  const pin = readPin('pinRow2');
  const errEl = document.getElementById('pin2Error');
  if(pin.length !== 6){ errEl.textContent = 'PIN harus 6 digit.'; return; }
  if(pin !== tempPin){
    errEl.textContent = 'PIN ga sama. Coba lagi.';
    clearPinBoxes('pinRow2');
    document.querySelector('#pinRow2 .pin-box').focus();
    return;
  }
  const pinHash = await hashPin(pin);
  const data = {
    provider: authUser.provider, 
    providerId: authUser.providerId,
    email: authUser.email, 
    name: authUser.name, 
    avatar: authUser.avatar,
    username: authUser.username, 
    pinHash, 
    createdAt: serverTimestamp(),
  };
  try {
    await setDoc(doc(db,'users',authUser.providerId), data, { merge:true });
    tempPin = '';
    errEl.textContent = '';
    showWelcomeAndRedirect(authUser.username);
  } catch(e) { errEl.textContent = 'Gagal simpan: ' + e.message; }
};

async function hashPin(pin) {
  const buf = new TextEncoder().encode(pin);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function showWelcomeAndRedirect(username) {
  document.getElementById('welcomeUsername').textContent = username;
  document.getElementById('welcomeOverlay').classList.add('active');
  try {
    const ac = new (window.AudioContext||window.webkitAudioContext)();
    [523.25,659.25,783.99,1046.50].forEach((freq,i) => {
      const o = ac.createOscillator(); const g = ac.createGain();
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0, ac.currentTime + i*0.12);
      g.gain.linearRampToValueAtTime(0.25, ac.currentTime + i*0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i*0.12 + 0.3);
      o.connect(g); g.connect(ac.destination);
      o.start(ac.currentTime + i*0.12); o.stop(ac.currentTime + i*0.12 + 0.35);
    });
  } catch {}
  setTimeout(() => {
    window.location.href = 'https://www.kiosgamer.id';
  }, 2000);
}

function showDashboard(data) {
  document.getElementById('dashAvatar').src = data.avatar ||
    'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%237fd4ff%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2265%22 font-size=%2245%22 text-anchor=%22middle%22 fill=%22%230a0a12%22>' + (data.username||'?')[0].toUpperCase() + '</text></svg>';
  document.getElementById('dashName').textContent = data.username;
  document.getElementById('dashEmail').textContent = data.email || '(no email)';
  document.getElementById('dashProvider').textContent = data.provider;
  document.getElementById('dashPin').textContent = '●●●●●●';
  window.showScreen('screenDashboard');
}

window.logout = async function() {
  if(!confirm('Logout?')) return;
  await signOut(auth);
  authUser = null; tempPin = '';
  window.showScreen('screenLogin');
};

onAuthStateChanged(auth, async (u) => {
  if(u) {
    try {
      const userDoc = await getDoc(doc(db,'users',u.uid));
      if(userDoc.exists() && userDoc.data().username) { 
        showDashboard(userDoc.data()); 
        return; 
      }
    } catch (e) {
      console.log("Error cek sesi:", e);
    }
  }
  window.showScreen('screenLogin');
});