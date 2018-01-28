
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
        mn: "../mn_vue",
        util: "../util"
    },
    shim: {
        "shortcut": {
            exports: "shortcut"
        }
        //, "materialize" : ["jquery"]
    }
});

require(["vue", "mn", "util"], function(Vue, mn, $m) {
    window.mn = mn;
    window.Vue = Vue;
    window.$m = $m;

    window.app = new Vue({
        el: '#app',
        data: {
            title : "mininote is loading..",
            todos : [],
            topNavi : "arrow_upward",
            addBtn : "새글",
            note : {
                key : "",
                txt : "",
            },
            mn : mn,
            top : "",       // noteContent 의 스크롤 위치
        },
        methods: {
            me : function(){
                this.top = document.documentElement.scrollTop;
                $m("body").css("top", -(this.top) + "px").addClass("noscroll");
            },
            ml : function(){
                $m("body").removeClass("noscroll");
                $(document).scrollTop(this.top);
            },
            contextClick : function(event){
                var contextBtn = $(event.target);
                if (contextBtn.text() === "<<") {
                    contextBtn.parent().animate({left: "-100px"}, 300, function () {
                        contextBtn.text(">>");
                    });
                } else {
                    contextBtn.parent().animate({left: "0px"}, 300, function () {
                        contextBtn.text("<<");
                    });
                }
            },
            removeNote : function(){
                alert(1);
            }
        },
        computed : {
            editMode : function(){
                return this.topNavi === '목록';
            }
        },
        watch: {

        }
    });

    //window.onload = mn.init;      // 모바일 사파리에서 실행시점이 안 맞을 때가 있는 거 같음..
    mn.init();
});


//
