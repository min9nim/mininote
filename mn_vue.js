define(["jquery"
    , "nprogress"
    , "randomColor"
    , "isMobile"
    , "util"
    , "shortcut"
    , "autolink"
    //, "materialize"       // 이거 없어도 렌더링에 문제가 없네?
], function ($
    , $nprogress
    , $randomcolor
    , $ismobile
    , $m
    , $shortcut
    , $autolink       // undefined
) {
    // export
    var mn = {};

    // local variable
    var visibleRowCnt = 30
        , userInfo
        , md
        , notes = new HashTable();
    ;

    mn.notes = notes;


    var newManageDiff = function () {
        var that = {},
            timer,
            color = 255,
            hasDiff = false;

        function pushDiffColor () {
            color = color > 10 ? color - 1 : 12;
            var hex = (color).toString(16);
            $m("#noteContent").css("backgroundColor", "#" + hex + hex + hex);
        }

        function flushDiffColor() {
            color = 255;
            var hex = (color).toString(16);
            $m("#noteContent").css("backgroundColor", "#" + hex + hex + hex);
        }


        that.checkDiff = function () {

            that.noteKey = $m("#noteContent").attr("key");
            if (!that.noteKey) {
                // 신규인 경우
                hasDiff = true;
            } else {
                hasDiff = notes.getItem(that.noteKey).txt !== $m("#noteContent").html();
            }

            //console.log(hasDiff);

            // 변경사항 있을 경우 변경사항 표시..
            if (hasDiff) {
                that.pushDiff();
            }

            if (timer) {
                that.end();   // 수정 중인 상황에는 타이머 초기화
            }

            timer = setTimeout(function () {
                if(app.editMode){
                    that.save();
                    that.end();
                }
            }, 1000);


        };

        that.save = function () {

            if (hasDiff) {
                if ($m("#noteContent div:first-child").html() === "제목") {
                    // 제목을 수정하지 않을 경우 저장하지 않는다
                } else {
                    saveNote();
                }
            }
            that.flushDiff();
        };

        that.end = function () {
            timer = clearTimeout(timer);
        };

        that.pushDiff = function(){
            var s = $m(".diff").html();
            $m(".diff").html(s + ".");
        };

        that.flushDiff = function () {
            $m(".diff").html("");
            hasDiff = false;
        };


        return that;
    };


    var login = function () {
        firebase.auth().onAuthStateChanged(function (user) {
            if (user) {// 인증완료
                var userRef = firebase.database().ref("users/" + user.uid);
                userInfo = user;
                //$m("#writeBtn").show();
                userRef.once("value").then(function (snapshot) {
                    var userData;
                    if (snapshot.val() !== null) {
                        userInfo.data = snapshot.val();
                        setHeader();
                        initNoteList(userInfo.uid);
                    } else {// 신규 로그인 경우
                        userData = {
                            fontSize: "18px",
                            iconColor: "green",
                            email: userInfo.email,
                            nickname: userInfo.email.split("@")[0]
                        };

                        userRef.set(userData, function () {
                            userInfo.data = userData;
                            setHeader();
                            initNoteList(userInfo.uid);
                        });
                    }
                });
            } else {
                userInfo = null;
                setHeader();
                $nprogress.done();
                if (confirm("로그인이 필요합니다")) {
                    firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
                }
            }
        });
    };

    var setShortcut = function () {
        if ($ismobile.any) {
            return;//  PC환경에서만 단축키 설정
        }

        $shortcut.add("Alt+W", function () {
            //if ($m(".dialog").css("display") === "none") {
            if (app.topNavi === "arrow_upward") {
                mn.writeNote();
            }
        });

        $shortcut.add("Alt+S", function () {
            mn.searchClick();
        });

        $shortcut.add("meta+S", function () {
            // 브라우져의 페이지 저장 기능 비활성화 처리
            return;
        });


        $shortcut.add("Alt+U", function () {
            document.execCommand("insertunorderedlist");
        }, {"target": "noteContent"});

        $shortcut.add("Alt+T", function () {
            insertChkbox();
        }, {"target": "noteContent"});

        $shortcut.add("tab", function () {
            document.execCommand("indent");
        }, {"target": "noteContent"});

        $shortcut.add("Shift+tab", function () {
            document.execCommand("outdent");
        }, {"target": "noteContent"});



        $shortcut.add("meta+L", function () {
            //md.save();          // noteContent 가 사라지기 전에 저장을 해야하므로 여기서 저장해야 함
            mn.hideNote();
        });

        $shortcut.add("Alt+L", function () {
            //md.save();           // noteContent 가 사라지기 전에 저장을 해야하므로 여기서 저장해야 함
            mn.hideNote();
        });

        $shortcut.add("meta+enter", function () {
            mn.searchNote();
        }, {"target": "input2"});



    };

    var conOn = function () {
        if (userInfo !== null) {
            userInfo.isConnected = true;
        }

        if (app.topNavi === "arrow_upward") {
            //$m("#writeBtn").show();
            //$m("#addBtn").html("새글");
            app.addBtn = "새글";
        }

        $m("#list li").each(function (val) {
            val.style.backgroundColor = "#ffffff";
        });

        $m("#noteContent").css("backgroundColor", "#ffffff");
    };

    var conOff = function () {
        if (userInfo) {
            userInfo.isConnected = false;
        }

        //$m("#writeBtn").hide();

        setTimeout(function () {
            if (userInfo.isConnected === false) {
                // 20초간 상태 지켜보기
            }
        }, 20000);
    };


    var chkClick = function (e) {
        // http://localhost:4000/toubleshooting/2018/03/21/eventBinding.html
        if (e.target.checked) {
            e.target.setAttribute("checked", "");
        } else {
            e.target.removeAttribute("checked");
        }
        md.checkDiff();
    };

    mn.chkClick = chkClick;


    var deleteMapKey = function (s, e) {
        // 현재 커서로 부터 앞에 s ~ e 글자 지우고
        var sel = window.getSelection();
        var range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset - s);
        range.setEnd(sel.anchorNode, sel.anchorOffset - e);
        range.deleteContents();
    };

    var autoReplace = function (keycode) {
        if (keycode !== 32) {
            return;
        }

        var sel = window.getSelection();
        var str = sel.anchorNode.textContent;
        var keymap = str.substr(sel.anchorOffset - 3, 2);

        if (keymap === "!!") {
            deleteMapKey(3, 0);
            insertChkbox();
        } else if (keymap === "@@") {
            deleteMapKey(3, 1);
            document.execCommand("insertunorderedlist");
        } else if (keymap === "))") {
            deleteMapKey(3, 0);
            document.execCommand("indent");
        } else if (keymap === "((") {
            deleteMapKey(3, 0);
            document.execCommand("outdent");
        } else if (keymap === "dd") {
            deleteMapKey(sel.anchorOffset, sel.anchorNode.textContent.length - sel.anchorOffset);
        } else if (["mo", "tu", "we", "th", "fr", "sa", "su"].indexOf(keymap) >= 0) {
            deleteMapKey(3, 0);
            sel.getRangeAt(0).insertNode(document.createTextNode(keymap.toUpperCase() + " Todolist"));
            sel.modify("move", "forward", "word");  // 모바일에서는 이게 안 먹히네..
        }
    };


    var initNoteList = function (uid) {
        //var mn.noteRef = firebase.database().ref("notes/" + uid).limitToLast(100);
        // 이벤트 등록용..
        mn.noteRef = firebase.database().ref("notes/" + uid);
        mn.noteRef.on("child_added", onChildAdded);
        mn.noteRef.on("child_changed", onChildChanged);
        mn.noteRef.on("child_removed", onChildRemoved);
        mn.showNoteList(uid);
    };

    var onChildAdded = function (data) {
        notes.setItem(data.key, data.val());
        var curDate = Date.now();
        var createDate = data.val().createDate;
        var diff = curDate - createDate;

        if (diff < 1000) {// 방금 새로 등록한 글인 경우만
            addItem(data.key, data.val());
            if ($m(".state").html() === "") {
                //$m(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
                app.title = userInfo.data.nickname + "'s " + notes.length + " notes";
            } else {
                //$m(".header .title").html(notes.length + " notes");
                app.title = notes.length + " notes";
            }
        }
    };


    function getTitle(txt){
        var title, content;
        var idx = txt.indexOf("<div>");

        if (idx > 0) {
            title = txt.substr(0, idx);
            content = txt.substr(idx);
        } else {
            title = txt;
            content = "";
        }

        content = content.replace(/<\/div><div>/gi, " "); // html새줄문자를 공백문자로 변경
        content = content.replace(/<([^>]+)>/gi, "");   // 태그제거
        content = content.substr(0, 100); // 100자까지만 보여주기

        return {title: title, content: content};
    }

    var addItem = function (key, noteData, how) {
        var tmp = getTitle(noteData.txt);

        var todo = {
            key : key,
            createDate : (new Date(noteData.createDate)).toString().substr(4, 17),
            title : tmp.title,
            content : tmp.content
        };

        if (how === "append") {
            app.todos.push(todo);
        } else {
            app.todos.splice(0,0,todo);
        }
    };

    var onChildChanged = function (data) {
        var key = data.key;
        var noteData = data.val();
        var tmp = getTitle(noteData.txt);

        var index = app.todos.findIndex(function(el){return el.key === key;});
        app.todos[index].title = tmp.title;
        app.todos[index].content = tmp.content;

        $("#" + key).animate({left: "0px"}, 300);

        // 오른쪽 끝 컨텍스트버튼 이벤트 처리
        //setContextBtnEvent($("#" + key + " .btnContext"));

        // notes 갱신
        notes.setItem(key, noteData);
        //console.log(noteData);

        //if ($m(".dialog").css("display") !== "none"
        if (app.topNavi === "목록"
            && noteData.userAgent !== navigator.userAgent
            //&& $m("#noteContent").attr("key") === key) {
            && $m("#noteContent").attr("key") === key) {
            // 글보기상태이고 외부에서 변경이 발생한 경우 글내용 갱신
            console.log("외부 장비에서 변경사항 발생 ");
            mn.showNote(key);
        }

        // 수정한 글목록으로 스크롤 이동
        //window.scrollTo("", document.getElementById(key).offsetTop + document.getElementById("list").offsetTop);
    };

    var onChildRemoved = function (data) {
        var key = data.key;
        var idx = app.todos.findIndex(function(el){return el.key === key;});
        app.todos.splice(idx,1);
        notes.removeItem(key);

        $m("#list li").each(function(dom){
            if($m(dom).css("left") === "-100px"){
                $(dom).animate({left: "0px"}, 300, function () {
                    var btnContext = $m(dom).dom.childNodes[1];
                    $m(btnContext).text("<<");
                });
            }
        });

        //$m(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
        app.title = userInfo.data.nickname + "'s " + notes.length + " notes";
    };

    var saveNote = function () {

        if(userInfo.isConnected === false ) {
            alert("로그인이 필요합니다");
            return;
        }

        var key = $m("#noteContent").attr("key");
        //var key = app.note.key;

        $m("#noteContent div[placeholder]").removeAttr("placeholder");      // 불필요태그 제거
        //var txt = $m("#noteContent").html().replace(/(<div><br><\/div>)+$/ig, ""); // 끝에 공백제거



        /*여기서 app.note.txt 를 갱신하면 포커스가 위로 옮겨지는 문제발생, noteContent가 app.note.txt를 바라보고 있기 때문에*/
        //app.note.txt = $m("#noteContent").html();
        //var txt = app.note.txt.replace(/(<div><br><\/div>)+$/ig, ""); // 끝에 공백제거

        var tmp = $m("#noteContent").html();
        var txt = tmp.replace(/(<div><br><\/div>)+$/ig, ""); // 끝에 공백제거

        /*
        txt = txt.replace(/<span style="background-color:yellow;">|<\/span>/gi, "");    // 하이라이트 스타일 제거
        이렇게 하면 checkbox에 span으로 감싼 로직이랑 충돌 발생
        */
        txt = txt.autoLink({target: "_blank"}); // 링크 설정

        if (txt.length > 30000) {
            alert("30000자 이내로 입력 가능");
            return;
        }
        if (txt === "") {
            alert("내용을 입력해 주세요");
            return;
        }

//console.log("###" + txt);
        if (key === "") {// 저장
            var res = firebase.database().ref("notes/" + userInfo.uid).push({
                txt: txt,
                createDate: Date.now(),
                updateDate: Date.now(),
                userAgent: navigator.userAgent
            });
            $m("#noteContent").attr("key", res.key);
        } else {// 수정
            firebase.database().ref("notes/" + userInfo.uid + "/" + key).update({
                txt: txt,
                updateDate: Date.now(),
                userAgent: navigator.userAgent
            });

        }
    };


    var setHeader = function () {
        if (userInfo !== null) {
            $m("#nickname").val(userInfo.data.nickname);
            $m("#fontSize").val(userInfo.data.fontSize.replace("px", ""));
            $m("#iconColor").val(userInfo.data.iconColor);
        } else {
            //$m(".header .title").html("mininote");
            app.title = "mininote";
        }
    };

    var insertChkbox = function () {
        var chk = document.createElement("input");
        chk.setAttribute("type", "checkbox");
        chk.setAttribute("class", "chk");
        chk.onclick = chkClick;

        var sel = window.getSelection();
        var range = sel.getRangeAt(0);

        // range범위를 수정해 가면서 처리하는게 맞을 것 같은데.. 삽입하는 순서를 바로 잡으려면...
        //range.setStart(sel.anchorNode, sel.anchorOffset+1);
        range.insertNode(document.createTextNode(" ")); // chkbox 뒤에 공백문자 하나 넣어야 하는데 안된다;

        // 아래 문제 때문에 checkbox를 span으로 감쌈
        // http://localhost:4000/toubleshooting/2018/03/17/checkbox.html
        var spanNode = document.createElement("span");
        spanNode.setAttribute("contenteditable", "false");
        spanNode.appendChild(chk);
        range.insertNode(spanNode);

        //range.insertNode(document.createTextNode("x")); // chkbox 뒤에 공백문자 하나 넣어야 하는데 안된다;
        sel.modify("move", "forward", "character");
    };


    mn.init = function () {
        $nprogress.start();  // https://github.com/rstacruz/nprogress
        md = newManageDiff();
        setShortcut();
        login();

        firebase.database().ref(".info/connected").on("value", function (snap) {
            if (snap.val() === true) {
                conOn();
            } else {
                conOff();
            }
        });
    };

    mn.showNoteList = function (uid) {
        //console.log("showNoteList called..");
        //mn.hideNote();  // 이게 왜 필요한지 모르겠음

        $m(".state").html("");
        //$m("#list").html("");
        app.todos = [];
        //$m(".state span").html(""); // 검색어초기화

        mn.noteRef.limitToLast(visibleRowCnt).once("value").then(function (snapshot) {
            var noteObj = snapshot.val();
            mn.data = noteObj;

            for (var key in noteObj) {
                addItem(key, noteObj[key]);
            }
            // 오른쪽 끝 컨텍스트버튼 이벤트 처리
            //$m(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
            app.title = userInfo.data.nickname + "'s " + notes.length + " notes";
            $nprogress.done();
        });
    };


    mn.removeNote = function (key) {
        if (userInfo !== null && userInfo.isConnected) {
            if (confirm("삭제하시겠습니까?")) {
                firebase.database().ref("notes/" + userInfo.uid + "/" + key).remove();
            }
        } else {
            alert("로그인이 필요합니다");
        }
    };



    function highlight(txt, word){
        var res = txt;
        var start = txt.indexOf(word);
        while(start >= 0){
            var closeTag = txt.indexOf(">", start + word.length);
            var openTag = txt.indexOf("<", start + word.length);
            if(closeTag == -1 || (openTag >= 0 && openTag < closeTag ) ){
                // 이때 하이라이트 표시
                res = txt.substring(0,start) +
                    "<span style='color:#bfc902'>" + txt.substr(start, word.length) + "</span>" +
                    txt.substring(start+word.length, txt.length);
                txt = res;
                start = txt.indexOf(word, start + 27 + word.length + 7);
            }else{
                start = txt.indexOf(word, start + word.length);
            }
        }
        return res;
    }

    mn.highlight = highlight;


    function link_chk(){
        // 링크 처리
        $m("#noteContent a").each(function (a) {
            a.onmouseleave = function (e) {
                e.target.setAttribute("contenteditable", "true");
            };
            a.onmouseenter = function (e) {
                e.target.setAttribute("contenteditable", "false");
            };
        });

        // checkbox 처리
        $m("#noteContent input.chk").each(function (chk) {
            chk.onclick = chkClick;
        });
    }


    mn.writeNote = function () {
        if (userInfo !== null && userInfo.isConnected) {
            if (app.addBtn === "새글") {
                if ($ismobile.any) {
                    $m(".dialog").css("position", "absolute");
                    $m(".dialog").css("top", (window.scrollY + 10 ) + "px");
                }

                mn.showNote();

                $m("#noteContent")
                  .attr("key", "")
                  .html("<div class='title' placeholder='제목'>제목</div><div><br/></div><div placeholder='내용'><br/></div>");


                //$m("#noteContent .title").focus();   // 파폭에서 해당 지점으로 포커스 들어가지 않음

                // 저장버튼 처리
                //$m("#addBtn").html("저장");
                //$m("#writeBtn").addClass("disable");

                $m("#topNavi").removeClass("navi").addClass("list");
                $m("#topBtn a").css("opacity", "");

                // 포커스 처리
                setTimeout(function(){
                    var title = $m("#noteContent .title").dom;
                    var s = window.getSelection();
                    s.removeAllRanges();
                    var range = document.createRange();
                    range.selectNode(title.firstChild); // firstChild 로 세팅하지 않으면 파폭에서는 div 태그까지 통째로 선택영역으로 잡힌다
                    s.addRange(range);
                },500);

            } else if (app.addBtn === "로긴") {
                alert("로그인이 필요합니다");
            } else {
                console.log("기타 경우..");
            }

        } else {
            if (confirm("로그인이 필요합니다")) {
                firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
            }
        }
    };


    mn.searchClick = function () {
        if (userInfo !== null && userInfo.isConnected) {
            $m(".search").css("display", "block");
            $m("#input2").val("").focus();
        } else {
            alert("로그인이 필요합니다");
            //firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        }
    };


    mn.searchNote = function () {
        var txt = $m("#input2").val().trim();

        if (txt.length > 100) {
            alert("100자 이내로 입력 가능");
            return;
        }
        if (txt === "") {
            alert("내용을 입력해 주세요");
            return;
        }

        $m(".search").css("display", "none");
        $m("#list").html("");

        notes.each(function (key, val) {
            var noTagTxt = val.txt.replace(/<([^>]+)>/gi, "")   // 태그제거
                .replace(/&nbsp;/gi, " ");  // &nbsp; 제거
            if ((new RegExp(txt, "gi")).test(noTagTxt)) {
                addItem(key, val);
            }
        });


        $m(".header .title").html(notes.length + " notes");
        $m(".header .state").html(`> <span style="font-style:italic;">${txt}</span> 's ${$m("#list li").length} results`);

        mn.hideNote();

        $m("#input2").val(""); // 검색어 초기화

    };


    mn.keyupCheck = function (event) {
        var keycode = event.which || event.keyCode;

        // 내용 변경여부 체크
        md.checkDiff();

        // 자동고침 옵션
        autoReplace(keycode);

        //console.log(keycode);

        if (keycode === 13) {
            /*
            if ($("#noteContent div:first-child").hasClass("title") === false) {
                $("#noteContent div:first-child").addClass("title")
            }*/
            /*     if($("#noteContent").html().match(/<\/div><div/i) === null){
                     // 첫번째 줄 입력했을 때 제목효과
                     var range = document.createRange();
                     var root_node = document.getElementById("noteContent");
                     range.setStart(root_node,0);
                     range.setEnd(root_node,1);
                     var newNode = document.createElement("div");
                     newNode.setAttribute("class", "title");
                     range.surroundContents(newNode);
                 }*/
        }
    };


    mn.menuClick = function () {
        if ($m(".menu").css("left") === "0px") {
            $(".menu").animate({left: "-220px"}, 300);
        } else {
            $(".menu").animate({left: "0px"}, 300);
        }
    };


    mn.signout = function () {
        firebase.auth().signOut().then(function () {
            // 로그아웃 처리
        }, function (error) {
            console.error("Sign Out Error", error);
        });
    };


    mn.setNickname = function (nickname) {
        userInfo.data.nickname = nickname;
        firebase.database().ref("users/" + userInfo.uid).update(userInfo.data);
        $m(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
    };


    mn.setFontSize = function (size) {
        userInfo.data.fontSize = size + "px";
        firebase.database().ref("users/" + userInfo.uid).update(userInfo.data);
        $m(".txt").css("font-size", userInfo.data.fontSize);
    };

    mn.setIconColor = function (color) {
        userInfo.data.iconColor = color;
        firebase.database().ref("users/" + userInfo.uid).update(userInfo.data);
        $m("#list i.circle").each(function (val, key, arr) {
            var bgcolor = $randomcolor({hue: color, luminosity: "dark"});
            $m(val).css("background-color", bgcolor);
        });
    };

    mn.listClick = function () {
        $(".menu").animate({left: "-220px"}, 300);
    };

    mn.bodyScroll = function () {

        if ($m(".state").html() !== "") {// 검색결과 화면일 때
            return;
        }
        if (window.scrollY === 0) {// 처음 글쓰기 시작할때(스크롤이 아예 없을 때)
            return;
        }

        if (window.scrollY === $(document).height() - $(window).height()) {
            $nprogress.start();
            $m("#nprogress .spinner").css("top", "95%");
            var end = notes.length - $m("#list li").length;
            var start = (end - visibleRowCnt) < 0 ? 0 : (end - visibleRowCnt);
            var nextList = notes.getArray().slice(start, end).reverse();

            nextList.forEach(function (x) {
                addItem(x.key, x.val, "append");
            });
            $nprogress.done();
        }
    };

    mn.topNavi = function () {
        //if ($m("#topNavi").html() === "목록") {
        if (app.editMode) {
            mn.hideNote();
        } else {
            // top 버튼 누른경우
            $(window).scrollTop(0);
        }
    };

    mn.hideNote = function () {
      md.save();
      $m("#noteContent").attr("key", "");
      $m("#noteDiv").hide();
      app.topNavi = "arrow_upward";
      app.addBtn = "새글";
      $m("#topNavi").removeClass("list").addClass("navi");
      $m("#topBtn a").css("opacity", "0.3");
      $m("#list li").removeClass("selected");
      $m("body").removeClass("noscroll");
      //$(document).scrollTop(app.top);
      document.documentElement.scrollTop = app.top;
    };


    mn.showNote = function (key) {
        // 모바일 fixed div 에서 커서가 이상하게 동작되는 문제 회피
        if ($ismobile.any) {
            $m(".dialog").css("position", "absolute");
            $m(".dialog").css("top", (window.scrollY + 10 ) + "px");
        }

        app.topNavi = "목록";
        app.addBtn = "저장";

        $m("#topNavi").removeClass("navi").addClass("list");
        $m("#topBtn a").css("opacity", "");
        $m("#list li.selected").removeClass("selected");
        $m("#noteDiv").show();
        if(key){
          $m("#noteContent").attr("key", key);
          $m("#noteContent").html(notes.getItem(key).txt);
          $m("#" + key).addClass("selected");
          link_chk();
        }

        return;// 검색 기능 추후 개발 예정

        var searchWord = $m(".state span").html();
        //var txt = highlight(originTxt, searchWord);
        if(searchWord !== undefined){
            // 보기/편집 모드에 따른 검색어 하이라이트 표시 처리
            $m("#noteContent").dom.onfocus = function(){
                if($m("#input2").val() !== "") {
                    // 편집모드로 들어갈 땐 하이라이트 표시 제거
                    $m("#noteContent").html(originTxt);
                    link_chk();
                }
            };
            $m("#noteContent").dom.onblur = function(){
                // onblur 처리는 생략하겠음.. 데이터 꼬이는 현상이 발생할 수 있음...
                //$m("#noteContent").html(txt);
                //link_chk();
                //console.log("onblur");
            };
        }
    };



    mn.titleClick = function () {
        if (userInfo) {
            //mn.showNoteList(userInfo.uid);
            mn.hideNote();
        } else {
            firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        }
    };

    mn.rowClick = function (key) {
        md.save();
        mn.showNote(key)
    };

    mn.cancelSearch = function () {
        $m(".search").css("display", "none");
    };

    return mn;
});
