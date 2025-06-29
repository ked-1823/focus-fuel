// Your public Firebase config
const firebaseConfig = {
  
apiKey: "AIzaSyDoWm21fIjIMM7jSI9ijA2YjvBNKsZacl8",  authDomain: "focusfuel-c4eec.firebaseapp.com",
projectId: "focusfuel-c4eec",
storageBucket: "focusfuel-c4eec.appspot.com",
messagingSenderId: "325140276155",
appId: "1:325140276155:web:9f542aece9ac6e41685a9e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Make Firebase Auth globally accessible
const auth = firebase.auth();
console.log("Firebase initialized:", firebase.apps.length > 0);

