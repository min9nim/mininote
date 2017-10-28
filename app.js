// Initialize Firebase
var config = {
    apiKey: "AIzaSyCA7fmVSWpyP0MPpw1QRU6h9OZ7hrr6sGA",
    authDomain: "mininote-a7060.firebaseapp.com",
    databaseURL: "https://mininote-a7060.firebaseio.com",
    projectId: "mininote-a7060",
    storageBucket: "mininote-a7060.appspot.com",
    messagingSenderId: "26778481220"
};
firebase.initializeApp(config);


requirejs.config({
    baseUrl: 'ext',
    paths: {
        mn : "../mn"
    }
});

require(["mn"], function(mn){
    window.mn = mn;
    window.onload = mn.init;
});


//