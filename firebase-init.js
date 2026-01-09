// firebase-init.js (TEMİZ VERSİYON)
// Firebase yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyA39oVvHxrOl_lq60_PPT_fbwqbMuZ0JDU",
    authDomain: "neydi-ki-b3946.firebaseapp.com",
    projectId: "neydi-ki-b3946",
    storageBucket: "neydi-ki-b3946.firebasestorage.app",
    messagingSenderId: "760030824890",
    appId: "1:760030824890:web:1bef2f4070fc1dc9beb583"
};

// Firebase'i başlat
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase başlatıldı.");
} catch (error) {
    if (!/already exists/.test(error.message)) {
        console.error('Firebase başlatma hatası:', error);
    }
}

// Global değişkenleri tanımla (En önemli kısım)
window.auth = firebase.auth();
window.db = firebase.firestore();

console.log("Bağlantı hazır: window.db ve window.auth kullanılabilir.");
