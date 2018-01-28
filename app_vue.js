
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
                //
            },
            touchstart : function(e) {
                var dom = e.target;
                //dom.start_x = e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX;
                dom.start_x = e.pageX;  // 모바일사파리에서 e.originalEvent 가 undefined 임
                //dom.start_y = e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY;
                dom.start_y = e.pageY;
                dom.dom_start_x = $m(dom).position().left;  // 터치시작할 때 최초 dom요소의 x위치를 기억하고 있어야 함
            },
            touchmove : function(e) {
                var dom = e.target;
                //dom.diff_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX) - dom.start_x;
                dom.diff_x = e.pageX - dom.start_x;
                //dom.diff_y = (e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY) - dom.start_y;
                dom.diff_y = e.pageY - dom.start_y;
                if (Math.abs(dom.diff_x) > Math.abs(dom.diff_y * 4)) {
                    $m(dom).css("left", dom.dom_start_x + dom.diff_x);
                }
            },
            touchend : function(e) {
                var dom = e.target;
                if (dom.diff_x < -50) {
                    $(dom).animate({left: "-100px"}, 300);
                } else if (dom.diff_x > 150) {
                    //mn.viewNote($(this).attr("id"));
                    $(dom).animate({left: "0px"}, 300);
                } else {
                    $(dom).animate({left: "0px"}, 300);
                }
            },
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
