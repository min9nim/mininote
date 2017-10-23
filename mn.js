var mn = {};

mn.init = function () {
    NProgress.start();  // https://github.com/rstacruz/nprogress
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {// 인증완료
            mn.userInfo = user;
            $("#writeBtn").show();
            var userRef = firebase.database().ref("users/" + mn.userInfo.uid);
            userRef.once('value').then(function (snapshot) {
                if (snapshot.val() != null) {
                    mn.userInfo.data = snapshot.val();
                    mn.setHeader();
                    mn.initNoteList(mn.userInfo.uid);
                } else {// 신규 로그인 경우
                    var userData = {
                        fontSize: "18px",
                        iconColor: "green",
                        email: mn.userInfo.email,
                        nickname: mn.userInfo.email.split("@")[0]
                    };
                    userRef.set(userData, function () {
                        mn.userInfo.data = userData;
                        mn.setHeader();
                        mn.initNoteList(mn.userInfo.uid);
                    });
                }
            });
        } else {
            mn.userInfo = null;
            mn.setHeader();
            NProgress.done();
            if (confirm("로그인이 필요합니다")) {
                firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
            }
        }
    });

    firebase.database().ref(".info/connected").on("value", function (snap) {
        if (snap.val() === true) {
            if (mn.userInfo != null)
                mn.userInfo.isConnected = true;
            //$(".state").html("online");

            if ($(".dialog").css("display") == "none") {
                $("#writeBtn").show();
                $("#addBtn").html("새글");
            } else {
                //$("#addBtn").html("저장");
            }
        } else {
            if (mn.userInfo != null)
                mn.userInfo.isConnected = false;
            //userInfo = null;  // 로그인이 유지된 상태에서도 디비연결이 잠깐 끊어질 수는 있다
            //$(".state").html("offline");
            //$("#list").html("");
            $("#writeBtn").hide();
            setTimeout(function () {
                if (mn.userInfo.isConnected == false) {
                    $("#writeBtn").show();
                    $("#addBtn").html("로긴");
                }
            }, 20000);
            //alert("연결상태가 끊어졌습니다.");
        }
    });


    mn.chkClick = function () {
        if (event.target.checked) {
            event.target.setAttribute("checked", "");
        } else {
            event.target.removeAttribute("checked");
        }
        mn.md.checkDiff();
    };


    (function () {
        var prekey;
        mn.autoChkbox = function (keycode) {
            if (keycode == 32) {
                if(prekey == 65) {
                    // 앞에 두글자 지우고
                    var selection = window.getSelection();
                    var range = document.createRange();
                    range.setEnd(selection.anchorNode, selection.anchorOffset);
                    range.setStart(selection.anchorNode, range.endOffset - 2);
                    range.deleteContents();

                    // chkbox 삽입
                    mn.insertChkbox();
                }
            }
            prekey = keycode;
        }
    })();


    if (!isMobile.any) {
        //  PC환경에서만 단축키 설정
        shortcut.add("Alt+W", function () {
            mn.writeNote();
        });

        shortcut.add("Alt+S", function () {
            mn.searchClick();
        });

        shortcut.add("Ctrl+U", function () {
            document.execCommand('insertunorderedlist');
        }, {"target": "noteContent"});


        shortcut.add("Ctrl+T", function () {
            mn.insertChkbox();
        }, {"target": "noteContent"});


        shortcut.add("tab", function () {
            document.execCommand('indent');
        }, {"target": "noteContent"});

        shortcut.add("Shift+tab", function () {
            document.execCommand('outdent');
        }, {"target": "noteContent"});

        shortcut.add("meta+S", function () {
            document.querySelector("#diffMark").innerHTML = "";
            mn.saveNote();
        }, {"target": "noteContent"});
        shortcut.add("meta+L", function () {
            document.querySelector("#diffMark").innerHTML = "";
            mn.saveNote();
            mn.viewList();
        });

        shortcut.add("Ctrl+S", function () {
            mn.saveNote();
        }, {"target": "noteContent"});
        shortcut.add("meta+enter", function () {
            mn.searchNote();
        }, {"target": "input2"});


        (function(){
            // 글편집 상태일 때 body 스크롤 금지
            // 윈도우에서 스크롤 깜빡임 문제 처리
            var top;
            $m.qs("#noteContent").onmouseenter = function (e) {
                top = document.documentElement.scrollTop;
                $('body').css('top', -(top) + 'px').addClass('noscroll');

            };
            $m.qs("#noteContent").onmouseleave = function (e) {
                $('body').removeClass('noscroll');
                $(document).scrollTop(top)
            };
        })();

    }
}

mn.showNoteList = function (uid) {
    //console.log("showNoteList called..");
    mn.viewList();

    $(".state").text("");
    $("#list").text("");

    mn.noteRef.limitToLast(mn.visibleRowCnt).once("value").then(function (snapshot) {
        var noteObj = snapshot.val();
        for (key in noteObj) {
            mn.addItem(key, noteObj[key]);
        }

        $(".header .title").html(mn.userInfo.data.nickname + "'s " + mn.notes.length + " notes");
        NProgress.done();
    });
}

mn.initNoteList = function (uid) {
    //var mn.noteRef = firebase.database().ref('notes/' + uid).limitToLast(100);
    // 이벤트 등록용..
    mn.noteRef = firebase.database().ref('notes/' + uid);
    mn.noteRef.on('child_added', mn.onChildAdded);
    mn.noteRef.on('child_changed', mn.onChildChanged);
    mn.noteRef.on('child_removed', mn.onChildRemoved);
    mn.showNoteList(uid);
}

mn.onChildAdded = function (data) {
    //console.log("## onChildAdded called " + data.key);
    //noteList.push(data);
    mn.notes.setItem(data.key, data.val());
    var curDate = new Date().getTime();
    var createDate = data.val().createDate;
    var diff = curDate - createDate;
    //console.log(diff);
    if (diff < 1000) {// 방금 새로 등록한 글인 경우만
        mn.addItem(data.key, data.val());
        if ($(".state").html() == "") {
            $(".header .title").html(mn.userInfo.data.nickname + "'s " + mn.notes.length + " notes");
        } else {
            $(".header .title").html(mn.notes.length + " notes");
        }
    }
}

mn.addItem = function (key, noteData, how) {
    var html = mn.getNoteHtml(key, noteData);

    if (how == "append") {
        $("#list").append(html.li);
    } else {
        $("#list").prepend(html.li);
    }

    // 오른쪽 끝 컨텍스트버튼 이벤트 처리
    mn.setContextBtnEvent($("#" + key + " .btnContext"));
    mn.setTouchSlider($("#" + key));
}


mn.getNoteHtml = function (key, noteData) {
    var idx = noteData.txt.indexOf("<div>");
    if (idx > 0) {
        var title = noteData.txt.substr(0, idx);
        var content = noteData.txt.substr(idx);
    } else {
        var title = noteData.txt;
        var content = "";
    }


    content = content.replace(/<\/div><div>/gi, " "); // html새줄문자를 공백문자로 변경
    content = content.replace(/<([^>]+)>/gi, "");   // 태그제거
    content = content.substr(0, 100); // 100자까지만 보여주기
    var createDate = (new Date(noteData.createDate)).toString().substr(4, 17);

    var removeBtn = "";
    var editBtn = "";
    if (typeof mn.userInfo != null) {// 내가 작성한 글인 경우만 수정/삭제버튼이 표시
        removeBtn = `<i id='btn_delete' onclick='mn.removeNote("${key}")' class='material-icons'>delete</i>`;
        editBtn = `<i id='btn_edit' onclick='editNote("${key}")' class='material-icons'>edit</i>`;
    }

    var color = randomColor({hue: mn.userInfo.data.iconColor, luminosity: 'dark'});  // https://randomcolor.llllll.li/

    var liChild = `<i class='createDate'>${createDate}</i><i class='btnContext'><<</i>
                <div class='title' onclick="mn.viewNote('${key}')">${title}</div>
                <div class='content' onclick="mn.viewNote('${key}')">${content}</div></p>${removeBtn}${editBtn}`;

    var li = `<li id="${key}" class="collection-item avatar">${liChild}</li>`;
    var html = {};
    html.li = li;
    html.liChild = liChild;
    return html;
}


mn.onChildChanged = function (data) {
    //console.log("## onChildChanged called..");
    var key = data.key;
    var noteData = data.val();
    var html = mn.getNoteHtml(key, noteData);
    $m.qs("#" + key).innerHTML = html.liChild;
    $("#" + key).animate({left: "0px"}, 300);

    // 오른쪽 끝 컨텍스트버튼 이벤트 처리
    mn.setContextBtnEvent($("#" + key + " .btnContext"));

    // notes 갱신
    mn.notes.setItem(key, noteData);

    // 수정한 글목록으로 스크롤 이동
    //window.scrollTo("", document.getElementById(key).offsetTop + document.getElementById("list").offsetTop);
}

mn.onChildRemoved = function (data) {
//  console.log("## onChildRemoved called..");
    var key = data.key;
    $('#' + key).remove();
    //noteList.splice(noteList.indexOf(data), 1);  // noteList에서 삭제된 요소 제거
    mn.notes.removeItem(key);
    $(".header .title").html(mn.userInfo.data.nickname + "'s " + mn.notes.length + " notes");
}

mn.saveNote = function () {
    var key = $("#noteContent").attr("key");
    $("#noteContent div[placeholder]").removeAttr("placeholder");      // 불필요태그 제거
    var txt = $("#noteContent").html().replace(/(<div><br><\/div>)+$/ig, ""); // 끝에 공백제거
    txt = txt.replace(/<span style="background-color:yellow;">|<\/span>/gi, "");    // 하이라이트 스타일 제거
    txt = txt.autoLink({target: "_blank"}); // 링크 설정

    if (txt.length > 30000) {
        alert("30000자 이내로 입력 가능");
        return;
    }
    if (txt === '') {
        alert("내용을 입력해 주세요");
        return;
    }


    if (key == "") {// 저장
        var res = firebase.database().ref('notes/' + mn.userInfo.uid).push({
            txt: txt,
            createDate: new Date().getTime(),
            updateDate: new Date().getTime()
        });
        $("#noteContent").attr("key", res.key);
    } else {// 수정
        firebase.database().ref('notes/' + mn.userInfo.uid + "/" + key).update({
            txt: txt,
            updateDate: new Date().getTime()
        });
    }
}


mn.removeNote = function (key) {
    if (mn.userInfo != null && mn.userInfo.isConnected) {
        if (confirm("삭제하시겠습니까?")) {
            firebase.database().ref('notes/' + mn.userInfo.uid + '/' + key).remove();
            //$('#' + key).remove();
        }
    } else {
        alert("로그인이 필요합니다");
    }
}


mn.viewNote = function (key) {
    mn.md.save();

    // 모바일 fixed div 에서 커서가 이상하게 동작되는 문제 회피
    if (isMobile.any) {
        $m.qs(".dialog").style.position = "absolute";
        $m.qs(".dialog").style.top = (window.scrollY + 10 ) + "px";
    }


    firebase.database().ref('notes/' + mn.userInfo.uid + '/' + key).once('value').then(function (snapshot) {
        $(".dialog").css("display", "block");
        $("#noteContent").attr("key", key);
        var txt = snapshot.val().txt;

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
            chk.onclick = mn.chkClick;
        });
    });
}


mn.writeNote = function () {
    if (mn.userInfo != null && mn.userInfo.isConnected) {
        if ($("#addBtn").html() == "새글") {
            // 쓰기버튼 일때
            $m.qs(".dialog").style.display = "block";
            $("#noteContent").attr("key", "");
            $m.qs("#noteContent").innerHTML = "<div class='title' placeholder='제목'>제목</div><div><br/></div><div placeholder='내용'></div>";
            $("#noteContent .title").focus();   // 파폭에서 해당 지점으로 포커스 들어가지 않음

            // 저장버튼 처리
            $("#addBtn").html("저장");
            $("#writeBtn").addClass("disable");
            $("#writeBtn").hide();

            $("#topNavi").removeClass("navi");
            $("#topNavi").addClass("list");
            $("#topNavi").html("목록");
            $("#topBtn a").css("opacity", "");

            document.body.style.overflow = "hidden";

            $("#writeBtn").addClass("disable");

            // 스크롤처리
            $(window).scrollTop(0);

            // 포커스 처리
            var title = $m.qs("#noteContent .title")
            var s = window.getSelection();
            s.removeAllRanges();
            var range = document.createRange();
            range.selectNode(title.firstChild); // firstChild 로 세팅하지 않으면 파폭에서는 div 태그까지 통째로 선택영역으로 잡힌다
            s.addRange(range);


        } else if ($("#addBtn").html() == "로긴") {
            alert("로그인이 필요합니다");
        } else {
            console.log("기타 경우..");
        }

    } else {
        if (confirm("로그인이 필요합니다"))
            firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
}


mn.searchClick = function () {
    if (mn.userInfo != null && mn.userInfo.isConnected) {
        $(".search").css("display", "block");
        $("#input2").val("");
        $("#input2").focus();
    } else {
        alert("로그인이 필요합니다");
        //firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
}


mn.searchNote = function () {
    var txt = $("#input2").val().trim();

    if (txt.length > 100) {
        alert("100자 이내로 입력 가능");
        return;
    }
    if (txt === '') {
        alert("내용을 입력해 주세요");
        return;
    }

    $(".search").css("display", "none");
    $("#list").html("");

    mn.notes.each(function (key, val) {
        noTagTxt = val.txt.replace(/<([^>]+)>/gi, "");   // 태그제거
        if ((new RegExp(txt, "gi")).test(noTagTxt)) {
            mn.addItem(key, val);
        }
    });


    $(".header .title").html(mn.notes.length + " notes");
    $(".header .state").html(`> <span style="font-style:italic;">${txt}</span> 's ${$("#list li").length} results`);

    mn.viewList();
}




mn.keyupCheck = function (event) {
    var keycode = (event.which) ? event.which : event.keyCode;

    // 내용 변경여부 체크
    mn.md.checkDiff();

    //  chkbox 자동고침
    mn.autoChkbox(keycode);

    if (keycode == 13) {
        /*
        if ($("#noteContent div:first-child").hasClass("title") == false) {
            $("#noteContent div:first-child").addClass("title")
        }*/
        /*     if($("#noteContent").html().match(/<\/div><div/i) == null){
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
}


mn.ManageDiff = function () {
    this.hasDiff = false;

    this.checkDiff = function () {
        //console.log("checkDiff called..");
        this.noteKey = $("#noteContent").attr("key");
        if (!this.noteKey) {
            // 신규인 경우
            this.hasDiff = true;
        } else {
            this.hasDiff = mn.notes.getItem(this.noteKey).txt != $("#noteContent").html();
        }

        // 변경사항 있을 경우 변경사항 표시..
        if (this.hasDiff) {
            var mark = $m.qs("#diffMark").innerHTML;
            $m.qs("#diffMark").innerHTML = mark + "*";
        }

        if (this.timer) {
            mn.md.end();   // 수정 중인 상황에는 타이머 초기화
        }

        this.timer = setTimeout(function () {
            mn.md.save();
            mn.md.end();
        }, 1000);
    }
    this.save = function () {
        if (this.hasDiff) {
            if ($("#noteContent div:first-child").html() == "제목") {
                // 제목을 수정하지 않을 경우 저장하지 않는다
            } else {
                mn.saveNote();
            }
        }
        $m.qs("#diffMark").innerHTML = "";
    }
    this.end = function () {
        this.timer = clearTimeout(this.timer);
    }
}

mn.setHeader = function () {
    if (mn.userInfo != null) {
        $("#nickname").val(mn.userInfo.data.nickname);
        $("#fontSize").val(mn.userInfo.data.fontSize.replace("px", ""));
        $("#iconColor").val(mn.userInfo.data.iconColor);
    } else {
        $(".header .title").html("mininote");
    }
}


mn.setContextBtnEvent = function (contextBtn) {
    contextBtn.bind("click", function () {
        if (contextBtn.text() == "<<") {
            contextBtn.parent().animate({left: "-100px"}, 300, function () {
                contextBtn.text(">>");
            });
        } else {
            contextBtn.parent().animate({left: "0px"}, 300, function () {
                contextBtn.text("<<");
            });
        }
    });
}

mn.setTouchSlider = function (row) {
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
            mn.viewNote($(this).attr("id"));
            $(this).animate({left: "0px"}, 300);
        } else {
            $(this).animate({left: "0px"}, 300);
        }
    }

    row.bind("touchstart", touchstart);
    row.bind("touchmove", touchmove);
    row.bind("touchend", touchend);
}


mn.menuClick = function () {
    if ($m.qs(".menu").style.left == "0px") {
        $(".menu").animate({left: "-220px"}, 300);
    } else {
        $(".menu").animate({left: "0px"}, 300);
    }
}


mn.signout = function () {
    firebase.auth().signOut().then(function () {
        // 로그아웃 처리
    }, function (error) {
        console.error('Sign Out Error', error);
    });
}


mn.setNickname = function (nickname) {
    mn.userInfo.data.nickname = nickname;
    firebase.database().ref('users/' + mn.userInfo.uid).update(mn.userInfo.data);
    $(".header .title").html(mn.userInfo.data.nickname + "'s " + mn.notes.length + " notes");
}


mn.setFontSize = function (size) {
    mn.userInfo.data.fontSize = size + "px";
    firebase.database().ref('users/' + mn.userInfo.uid).update(mn.userInfo.data);
    $(".txt").css("font-size", mn.userInfo.data.fontSize);
}

mn.setIconColor = function (color) {
    mn.userInfo.data.iconColor = color;
    firebase.database().ref('users/' + mn.userInfo.uid).update(mn.userInfo.data);
    $("#list i.circle").each(function (i) {
        var bgcolor = randomColor({hue: color, luminosity: 'dark'});
        $(this).css("background-color", bgcolor);
    });
}

mn.listClick = function () {
    $(".menu").animate({left: "-220px"}, 300);
}

mn.bodyScroll = function () {
    if ($(".state").html() != "") {// 검색결과 화면일 때
        return;
    }
    if (window.scrollY == 0) {// 처음 글쓰기 시작할때(스크롤이 아예 없을 때)
        return;
    }


    if (window.scrollY == $(document).height() - $(window).height()) {
        NProgress.start();
        $m.qs("#nprogress .spinner").style.top = "95%";
        var end = mn.notes.length - $m.qsa("#list li").length;
        var start = end - mn.visibleRowCnt < 0 ? 0 : end - mn.visibleRowCnt;
        var nextList = mn.notes.getArray().slice(start, end).reverse();

        nextList.forEach(function (x) {
            mn.addItem(x.key, x.val, "append");
        });
        NProgress.done();
    }
}

mn.topNavi = function () {
    if ($m.qs("#topNavi").innerHTML == "목록") {
        // 목록버튼 누른 경우
        mn.viewList();
    } else {
        // top 버튼 누른경우
        $(window).scrollTop(0);
    }
}

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
}


mn.titleClick = function () {
    if (mn.userInfo) {
        mn.showNoteList(mn.userInfo.uid);
    } else {
        firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
}

mn.insertChkbox = function () {
    var chk = document.createElement("input");
    chk.setAttribute("type", "checkbox");
    chk.setAttribute("class", "chk");
    chk.onclick = mn.chkClick;

    var sel = window.getSelection();
    var range = sel.getRangeAt(0);

    // range범위를 수정해 가면서 처리하는게 맞을 것 같은데.. 삽입하는 순서를 바로 잡으려면...
    range.insertNode(document.createTextNode(" "));
    range.insertNode(chk);

    sel.modify("move", "forward", "character");
    sel.modify("move", "forward", "character");
}

