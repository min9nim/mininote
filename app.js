requirejs.config({
    baseUrl: 'ext',
    paths: {
        mn: "../mn",
        util: "../util",
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
            mn : mn,
            top : "",       // noteContent 의 스크롤 위치
        },
        methods: {
            mouseenter : function(){
                return; // mac 에서 항상 스크롤 보이기 설정을 해두니 문제가 별로 안되는 것 같아서 일단 막아둠..18/04/16

                // noteContent 영역 안에서는 뒤에 목록 스크롤이 발생하지 않도록 처리
                this.top = document.documentElement.scrollTop;
                $m("body").css("top", -(this.top) + "px").addClass("noscroll");
            },
            mouseleave : function(){
                return; // mac 에서 항상 스크롤 보이기 설정을 해두니 문제가 별로 안되는 것 같아서 일단 막아둠.. 18/04/16

                // noteContent 영역 밖에서는 목록 스크롤이 가능하도록 처리
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
