// ─── FIREBASE CONFIG ────────────────────────────────────
const firebaseConfig = {
    apiKey: "AIzaSyCEZO2Haz9W2OFmecNJG2wk6nicjpQvTTI",
    authDomain: "s123o-f3e37.firebaseapp.com",
    databaseURL: "https://s123o-f3e37-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "s123o-f3e37",
    storageBucket: "s123o-f3e37.firebasestorage.app",
    messagingSenderId: "714841609825",
    appId: "1:714841609825:web:9a229c4679b11fdf1cbc20"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// ─── AUTH HELPERS ───────────────────────────────────────
function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    return auth.signInWithPopup(provider);
}

function loginWithEmail(email, password) {
    return auth.signInWithEmailAndPassword(email, password);
}

function registerWithEmail(email, password, nome, role, turma, ano, idade) {
    return auth.createUserWithEmailAndPassword(email, password).then(cred => {
        return db.ref('users/' + cred.user.uid).set({
            nome, email, role: role || 'aluno', turma: turma || '',
            ano: ano || '', idade: idade || '',
            createdAt: Date.now(), photoURL: cred.user.photoURL || ''
        });
    });
}

function guestLogin() {
    return auth.signInAnonymously();
}

function logout() {
    return auth.signOut();
}

// ─── DATABASE HELPERS ──────────────────────────────────
function dbSet(path, data) { return db.ref(path).set(data); }
function dbPush(path, data) { return db.ref(path).push(data); }
function dbUpdate(path, data) { return db.ref(path).update(data); }
function dbRemove(path) { return db.ref(path).remove(); }
function dbGet(path) { return db.ref(path).once('value').then(s => s.val()); }
function dbListen(path, cb) { db.ref(path).on('value', s => cb(s.val())); }
function dbListenChild(path, event, cb) { db.ref(path).on(event, s => cb(s)); }
function dbStopListen(path) { db.ref(path).off(); }

// ─── USER PROFILE ──────────────────────────────────────
async function getUserProfile(uid) {
    let profile = await dbGet('users/' + uid);
    return profile || null;
}

async function updateUserProfile(uid, data) {
    return db.ref('users/' + uid).update(data);
}

// ─── STORAGE ───────────────────────────────────────────
async function uploadFile(file, path) {
    const ref = storage.ref(path);
    await ref.put(file);
    return ref.getDownloadURL();
}
