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
    // local variable
    var mn = {}
        , visibleRowCnt = 30
        , md
        , notes = new HashTable();
    ;

    // local function
    var addItem
        , autoReplace
        , bodyScrollWithNoteContent
        , chkClick
        , conOn
        , conOff
        , deleteMapKey
        , getNoteHtml
        , initNoteList
        , insertChkbox
        , login
        , onChildAdded
        , onChildChanged
        , onChildRemoved
        , saveNote
        , newManageDiff
        , setContextBtnEvent
        , setHeader
        , setTouchSlider
        , setShortcut
    ;


    newManageDiff = function () {
        var that = {},
            timer,
            color = 255,
            hasDiff = false;

        that.checkDiff = function () {
            that.noteKey = $("#noteContent").attr("key");
            if (!that.noteKey) {
                // 신규인 경우
                hasDiff = true;
            } else {
                hasDiff = notes.getItem(that.noteKey).txt !== $("#noteContent").html();
            }

            // 변경사항 있을 경우 변경사항 표시..
            if (hasDiff) {
                that.pushDiff();
            }

            if (timer) {
                that.end();   // 수정 중인 상황에는 타이머 초기화
            }

            timer = setTimeout(function () {
                that.save();
                that.end();
            }, 1000);
        };

        that.save = function () {
            if (hasDiff) {
                if ($("#noteContent div:first-child").html() === "제목") {
                    // 제목을 수정하지 않을 경우 저장하지 않는다
                } else {
                    saveNote();
                }
            }
            //$m.qs("#diffMark").innerHTML = "";
            that.flushDiff();
        };

        that.end = function () {
            timer = clearTimeout(timer);
        };

        that.pushDiff = function () {
            color = color > 10 ? color - 2 : 10;
            var hex = (color).toString(16);
            $m.qs("#noteContent").style.backgroundColor = "#" + hex + hex + hex;
        };

        that.flushDiff = function () {
            color = 255;
            var hex = (color).toString(16);
            $m.qs("#noteContent").style.backgroundColor = "#" + hex + hex + hex;
        };

        return that;
    };


    // util.js의 HashTable 은 어떻게 받아오지?;

    mn.init = function () {
        $nprogress.start();  // https://github.com/rstacruz/nprogress
        md = newManageDiff();
        setShortcut();
        login();
        bodyScrollWithNoteContent();

        firebase.database().ref(".info/connected").on("value", function (snap) {
            if (snap.val() === true) {
                conOn();
            } else {
                conOff();
            }
        });
    };

    login = function(){
        firebase.auth().onAuthStateChanged(function (user) {
            var userRef = firebase.database().ref("users/" + user.uid);
            if (user) {// 인증완료
                mn.userInfo = user;
                $("#writeBtn").show();
                userRef.once("value").then(function (snapshot) {
                    var userData;
                    if (snapshot.val() !== null) {
                        mn.userInfo.data = snapshot.val();
                        setHeader();
                        initNoteList(mn.userInfo.uid);
                    } else {// 신규 로그인 경우
                        userData = {
                            fontSize: "18px",
                            iconColor: "green",
                            email: mn.userInfo.email,
                            nickname: mn.userInfo.email.split("@")[0]
                        };

                        userRef.set(userData, function () {
                            mn.userInfo.data = userData;
                            setHeader();
                            initNoteList(mn.userInfo.uid);
                        });
                    }
                });
            } else {
                mn.userInfo = null;
                setHeader();
                $nprogress.done();
                if (confirm("로그인이 필요합니다")) {
                    firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
                }
            }
        });
    };

    bodyScrollWithNoteContent = function () {
        // 글편집 상태일 때 body 스크롤 금지
        // 윈도우에서 스크롤 깜빡임 문제 처리
        var top;
        $m.qs("#noteContent").onmouseenter = function (e) {
            top = document.documentElement.scrollTop;
            $("body").css("top", -(top) + "px").addClass("noscroll");

        };
        $m.qs("#noteContent").onmouseleave = function (e) {
            $("body").removeClass("noscroll");
            $(document).scrollTop(top);
        };
    };


    setShortcut = function () {
        if ($ismobile.any) {
            return;//  PC환경에서만 단축키 설정
        }

        $shortcut.add("Alt+W", function () {
            if ($m.qs(".dialog").style.display === "none") {
                mn.writeNote();
            }
        });

        $shortcut.add("Alt+S", function () {
            mn.searchClick();
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
            md.save();
            mn.viewList();
        });

        $shortcut.add("Alt+L", function () {
            md.save();
            mn.viewList();
        });

        $shortcut.add("meta+enter", function () {
            mn.searchNote();
        }, {"target": "input2"});


    };

    conOn = function () {
        if (mn.userInfo !== null) {
            mn.userInfo.isConnected = true;
        }

        if ($(".dialog").css("display") === "none") {
            $("#writeBtn").show();
            $("#addBtn").html("새글");
        }

        $m.qsa("#list li").forEach(function (o) {
            o.style.backgroundColor = "#ffffff";
        });
        $m.qs("#noteContent").style.backgroundColor = "#ffffff";
    };

    conOff = function () {
        if (mn.userInfo) {
            mn.userInfo.isConnected = false;
        }

        $m.qsa("#list li").forEach(function (o) {
            o.style.backgroundColor = "#dddddd";
        });
        $m.qs("#noteContent").style.backgroundColor = "#dddddd";

        $("#writeBtn").hide();

        setTimeout(function () {
            if (mn.userInfo.isConnected === false) {
                // 20초간 상태 지켜보기
            }
        }, 20000);
    };


    chkClick = function () {
        if (event.target.checked) {
            event.target.setAttribute("checked", "");
        } else {
            event.target.removeAttribute("checked");
        }
        md.checkDiff();
    };

    deleteMapKey = function (s, e) {
        // 현재 커서로 부터 앞에 s ~ e 글자 지우고
        var sel = window.getSelection();
        var range = document.createRange();
        range.setStart(sel.anchorNode, sel.anchorOffset - s);
        range.setEnd(sel.anchorNode, sel.anchorOffset - e);
        range.deleteContents();
    };

    autoReplace = function (keycode) {
        if (keycode !== 32) {
            return;
        }

        var sel = window.getSelection();
        var str = sel.anchorNode.textContent;
        //console.log(str);
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


    mn.showNoteList = function (uid) {
        //console.log("showNoteList called..");
        mn.viewList();

        $(".state").text("");
        $("#list").text("");

        mn.noteRef.limitToLast(visibleRowCnt).once("value").then(function (snapshot) {
            var noteObj = snapshot.val();
            for (var key in noteObj) {
                addItem(key, noteObj[key]);
            }

            $(".header .title").html(mn.userInfo.data.nickname + "'s " + notes.length + " notes");
            $nprogress.done();
        });
    };

    initNoteList = function (uid) {
        //var mn.noteRef = firebase.database().ref("notes/" + uid).limitToLast(100);
        // 이벤트 등록용..
        mn.noteRef = firebase.database().ref("notes/" + uid);
        mn.noteRef.on("child_added", onChildAdded);
        mn.noteRef.on("child_changed", onChildChanged);
        mn.noteRef.on("child_removed", onChildRemoved);
        mn.showNoteList(uid);
    };

    onChildAdded = function (data) {
        //console.log("## onChildAdded called " + data.key);
        //noteList.push(data);
        notes.setItem(data.key, data.val());
        var curDate = Date.now();
        var createDate = data.val().createDate;
        var diff = curDate - createDate;
        //console.log(diff);
        if (diff < 1000) {// 방금 새로 등록한 글인 경우만
            addItem(data.key, data.val());
            if ($(".state").html() === "") {
                $(".header .title").html(mn.userInfo.data.nickname + "'s " + notes.length + " notes");
            } else {
                $(".header .title").html(notes.length + " notes");
            }
        }
    };

    addItem = function (key, noteData, how) {
        var html = getNoteHtml(key, noteData);

        if (how === "append") {
            $("#list").append(html.li);
        } else {
            $("#list").prepend(html.li);
        }

        // 오른쪽 끝 컨텍스트버튼 이벤트 처리
        setContextBtnEvent($("#" + key + " .btnContext"));
        setTouchSlider($("#" + key));
    };


    getNoteHtml = function (key, noteData) {
        var idx = noteData.txt.indexOf("<div>");
        var title, content, createDate, removeBtn = "", editBtn = "", liChild, li, html;
        var color = $randomcolor({hue: mn.userInfo.data.iconColor, luminosity: "dark"});  // https://randomcolor.llllll.li/


        if (idx > 0) {
            title = noteData.txt.substr(0, idx);
            content = noteData.txt.substr(idx);
        } else {
            title = noteData.txt;
            content = "";
        }

        content = content.replace(/<\/div><div>/gi, " "); // html새줄문자를 공백문자로 변경
        content = content.replace(/<([^>]+)>/gi, "");   // 태그제거
        content = content.substr(0, 100); // 100자까지만 보여주기
        createDate = (new Date(noteData.createDate)).toString().substr(4, 17);

        if (typeof mn.userInfo !== null) {// 내가 작성한 글인 경우만 수정/삭제버튼이 표시
            removeBtn = `<i id="btn_delete" onclick='mn.removeNote("${key}")' class="material-icons">delete</i>`;
            editBtn = `<i id="btn_edit" onclick='editNote("${key}")' class="material-icons">edit</i>`;
        }

        liChild = `<i class="createDate">${createDate}</i><i class="btnContext"><<</i>
                <div class="title" >${title}</div>
                <div class="content" >${content}</div></p>${removeBtn}${editBtn}`;

        li = `<li id="${key}" class="collection-item avatar" onclick="mn.rowClick('${key}')">${liChild}</li>`;
        html = {};
        html.li = li;
        html.liChild = liChild;
        return html;
    };


    onChildChanged = function (data) {
        //console.log("## onChildChanged called..");
        var key = data.key;
        var noteData = data.val();
        var html = getNoteHtml(key, noteData);
        $m.qs("#" + key).innerHTML = html.liChild;
        $("#" + key).animate({left: "0px"}, 300);

        // 오른쪽 끝 컨텍스트버튼 이벤트 처리
        setContextBtnEvent($("#" + key + " .btnContext"));

        // notes 갱신
        notes.setItem(key, noteData);
        //console.log(noteData);

        if ($m.qs(".dialog").style.display !== "none"
            && noteData.userAgent !== navigator.userAgent
            && $m.qs("#noteContent").getAttribute("key") === key) {
            // 글보기상태이고 외부에서 변경이 발생한 경우 글내용 갱신
            console.log("외부 장비에서 변경사항 발생 ");
            viewNote(key);
        }

        // 수정한 글목록으로 스크롤 이동
        //window.scrollTo("", document.getElementById(key).offsetTop + document.getElementById("list").offsetTop);
    };

    onChildRemoved = function (data) {
//  console.log("## onChildRemoved called..");
        var key = data.key;
        $("#" + key).remove();
        //noteList.splice(noteList.indexOf(data), 1);  // noteList에서 삭제된 요소 제거
        notes.removeItem(key);
        $(".header .title").html(mn.userInfo.data.nickname + "'s " + notes.length + " notes");
    };

    saveNote = function () {
        var key = $("#noteContent").attr("key");
        $("#noteContent div[placeholder]").removeAttr("placeholder");      // 불필요태그 제거
        var txt = $("#noteContent").html().replace(/(<div><br><\/div>)+$/ig, ""); // 끝에 공백제거
        txt = txt.replace(/<span style="background-color:yellow;">|<\/span>/gi, "");    // 하이라이트 스타일 제거
        txt = txt.autoLink({target: "_blank"}); // 링크 설정

        if (txt.length > 30000) {
            alert("30000자 이내로 입력 가능");
            return;
        }
        if (txt === "") {
            alert("내용을 입력해 주세요");
            return;
        }


        if (key === "") {// 저장
            var res = firebase.database().ref("notes/" + mn.userInfo.uid).push({
                txt: txt,
                createDate: Date.now(),
                updateDate: Date.now(),
                userAgent: navigator.userAgent
            });
            $("#noteContent").attr("key", res.key);
        } else {// 수정
            firebase.database().ref("notes/" + mn.userInfo.uid + "/" + key).update({
                txt: txt,
                updateDate: Date.now(),
                userAgent: navigator.userAgent
            });
        }
    };


    mn.removeNote = function (key) {
        if (mn.userInfo !== null && mn.userInfo.isConnected) {
            if (confirm("삭제하시겠습니까?")) {
                firebase.database().ref("notes/" + mn.userInfo.uid + "/" + key).remove();
            }
        } else {
            alert("로그인이 필요합니다");
        }

        event.preventDefault();
        event.stopPropagation();
    };


    mn.viewNote = function (key) {
        // 모바일 fixed div 에서 커서가 이상하게 동작되는 문제 회피
        if ($ismobile.any) {
            $m.qs(".dialog").style.position = "absolute";
            $m.qs(".dialog").style.top = (window.scrollY + 10 ) + "px";
        }
        var txt = notes.getItem(key).txt;

        $(".dialog").css("display", "block");
        $("#noteContent").attr("key", key);
        $("#list li.selected").removeClass("selected");
        $("#" + key).addClass("selected");

        var searchWord = $(".state span").html();
        if (searchWord) {
            // 검색결과일 경우라면 매칭단어 하이라이트닝
            var reg = new RegExp(searchWord, "gi");
            txt = txt.replace(reg, `<span style="background-color:yellow;">${searchWord}</span>`); // html태그 내용까지 매치되면 치환하는 문제가 있음
        }

        $("#noteContent").html(txt);
        $("#addBtn").html("저장");
        $("#writeBtn").hide();
        $("#topNavi").removeClass("navi");
        $("#topNavi").addClass("list");
        $m.qs("#topNavi").innerHTML = "목록";
        $m.qs("#topBtn a").style.opacity = "";

        // 링크 처리
        $m.qsa("#noteContent a").forEach(function (a) {
            a.onmouseleave = function (e) {
                e.target.setAttribute("contenteditable", "true");
            };
            a.onmouseenter = function (e) {
                e.target.setAttribute("contenteditable", "false");
            };
        });

        // checkbox 처리
        $m.qsa("#noteContent input.chk").forEach(function (chk) {
            chk.onclick = chkClick;
        });
    };


    mn.writeNote = function () {
        if (mn.userInfo !== null && mn.userInfo.isConnected) {
            if ($("#addBtn").html() === "새글") {

                if ($ismobile.any) {
                    $m.qs(".dialog").style.position = "absolute";
                    $m.qs(".dialog").style.top = (window.scrollY + 10 ) + "px";
                }

                // 쓰기버튼 일때
                $m.qs(".dialog").style.display = "block";
                $("#noteContent").attr("key", "");
                $m.qs("#noteContent").innerHTML = "<div class='title' placeholder='제목'>제목</div><div><br/></div><div placeholder='내용'><br/></div>";
                $("#noteContent .title").focus();   // 파폭에서 해당 지점으로 포커스 들어가지 않음

                // 저장버튼 처리
                $("#addBtn").html("저장");
                $("#writeBtn").addClass("disable");
                $("#writeBtn").hide();

                $("#topNavi").removeClass("navi");
                $("#topNavi").addClass("list");
                $("#topNavi").html("목록");
                $("#topBtn a").css("opacity", "");

                $("#writeBtn").addClass("disable");

                // 포커스 처리
                var title = $m.qs("#noteContent .title");
                var s = window.getSelection();
                s.removeAllRanges();
                var range = document.createRange();
                range.selectNode(title.firstChild); // firstChild 로 세팅하지 않으면 파폭에서는 div 태그까지 통째로 선택영역으로 잡힌다
                s.addRange(range);

            } else if ($("#addBtn").html() === "로긴") {
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
        if (mn.userInfo !== null && mn.userInfo.isConnected) {
            $(".search").css("display", "block");
            $("#input2").val("");
            $("#input2").focus();
        } else {
            alert("로그인이 필요합니다");
            //firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        }
    };


    mn.searchNote = function () {
        var txt = $("#input2").val().trim();

        if (txt.length > 100) {
            alert("100자 이내로 입력 가능");
            return;
        }
        if (txt === "") {
            alert("내용을 입력해 주세요");
            return;
        }

        $(".search").css("display", "none");
        $("#list").html("");

        notes.each(function (key, val) {
            var noTagTxt = val.txt.replace(/<([^>]+)>/gi, "");   // 태그제거
            if ((new RegExp(txt, "gi")).test(noTagTxt)) {
                addItem(key, val);
            }
        });


        $(".header .title").html(notes.length + " notes");
        $(".header .state").html(`> <span style="font-style:italic;">${txt}</span> 's ${$("#list li").length} results`);

        mn.viewList();
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


    setHeader = function () {
        if (mn.userInfo !== null) {
            $("#nickname").val(mn.userInfo.data.nickname);
            $("#fontSize").val(mn.userInfo.data.fontSize.replace("px", ""));
            $("#iconColor").val(mn.userInfo.data.iconColor);
        } else {
            $(".header .title").html("mininote");
        }
    };


    setContextBtnEvent = function (contextBtn) {
        contextBtn.bind("click", function () {
            if (contextBtn.text() === "<<") {
                contextBtn.parent().animate({left: "-100px"}, 300, function () {
                    contextBtn.text(">>");
                });
            } else {
                contextBtn.parent().animate({left: "0px"}, 300, function () {
                    contextBtn.text("<<");
                });
            }

            event.stopPropagation();
            event.preventDefault();

        });
    };

    setTouchSlider = function (row) {
        var start_x, diff_x;
        var start_y, diff_y;
        var dom_start_x;

        function touchstart(e) {
            start_x = e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX;
            start_y = e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY;
            dom_start_x = $(this).position().left;  // 터치시작할 때 최초 dom요소의 x위치를 기억하고 있어야 함
        }

        function touchmove(e) {
            diff_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX) - start_x;
            diff_y = (e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY) - start_y;
            if (Math.abs(diff_x) > Math.abs(diff_y * 4)) {
                $(this).css("left", dom_start_x + diff_x);
            }
        }

        function touchend() {
            if (diff_x < -50) {
                $(this).animate({left: "-100px"}, 300);
            } else if (diff_x > 150) {
                //mn.viewNote($(this).attr("id"));
                $(this).animate({left: "0px"}, 300);
            } else {
                $(this).animate({left: "0px"}, 300);
            }
        }

        row.bind("touchstart", touchstart);
        row.bind("touchmove", touchmove);
        row.bind("touchend", touchend);
    };


    mn.menuClick = function () {
        if ($m.qs(".menu").style.left === "0px") {
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
        mn.userInfo.data.nickname = nickname;
        firebase.database().ref("users/" + mn.userInfo.uid).update(mn.userInfo.data);
        $(".header .title").html(mn.userInfo.data.nickname + "'s " + notes.length + " notes");
    };


    mn.setFontSize = function (size) {
        mn.userInfo.data.fontSize = size + "px";
        firebase.database().ref("users/" + mn.userInfo.uid).update(mn.userInfo.data);
        $(".txt").css("font-size", mn.userInfo.data.fontSize);
    };

    mn.setIconColor = function (color) {
        mn.userInfo.data.iconColor = color;
        firebase.database().ref("users/" + mn.userInfo.uid).update(mn.userInfo.data);
        $("#list i.circle").each(function (i) {
            var bgcolor = $randomcolor({hue: color, luminosity: "dark"});
            $(this).css("background-color", bgcolor);
        });
    };

    mn.listClick = function () {
        $(".menu").animate({left: "-220px"}, 300);
    };

    mn.bodyScroll = function () {
        if ($(".state").html() !== "") {// 검색결과 화면일 때
            return;
        }
        if (window.scrollY === 0) {// 처음 글쓰기 시작할때(스크롤이 아예 없을 때)
            return;
        }


        if (window.scrollY === $(document).height() - $(window).height()) {
            $nprogress.start();
            $m.qs("#nprogress .spinner").style.top = "95%";
            var end = notes.length - $m.qsa("#list li").length;
            var start = end - mn.visibleRowCnt < 0 ? 0 : end - visibleRowCnt;
            var nextList = notes.getArray().slice(start, end).reverse();

            nextList.forEach(function (x) {
                mn.addItem(x.key, x.val, "append");
            });
            $nprogress.done();
        }
    };

    mn.topNavi = function () {
        if ($m.qs("#topNavi").innerHTML === "목록") {
            // 목록버튼 누른 경우
            mn.viewList();
        } else {
            // top 버튼 누른경우
            $(window).scrollTop(0);
        }
    };

    mn.viewList = function () {
        $m.qs(".dialog").style.display = "none";
        $m.qs("#topNavi").innerHTML = "arrow_upward";
        $("#topNavi").removeClass("list");
        $("#topNavi").addClass("navi");
        $m.qs("#topBtn a").style.opacity = "0.3";
        $("#addBtn").html("새글");
        $("#writeBtn").removeClass("disable");
        $("#writeBtn").show();
        $("#list li").removeClass("selected");
    };


    mn.titleClick = function () {
        if (mn.userInfo) {
            mn.showNoteList(mn.userInfo.uid);
        } else {
            firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
        }
    };

    insertChkbox = function () {
        var chk = document.createElement("input");
        chk.setAttribute("type", "checkbox");
        chk.setAttribute("class", "chk");
        chk.onclick = chkClick;

        var sel = window.getSelection();
        var range = sel.getRangeAt(0);

        // range범위를 수정해 가면서 처리하는게 맞을 것 같은데.. 삽입하는 순서를 바로 잡으려면...
        //range.setStart(sel.anchorNode, sel.anchorOffset+1);

        range.insertNode(document.createTextNode(" ")); // chkbox 뒤에 공백문자 하나 넣어야 하는데 안된다;
        range.insertNode(chk);

        sel.modify("move", "forward", "character");
        //sel.modify("move", "forward", "character");
    };

    mn.rowClick = function (key) {
        md.save();
        mn.viewNote(key)
    };


    mn.cancelSearch = function () {
        $m.qs(".search").style.display = "none";
    };

    return mn;
});

