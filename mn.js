function showNoteList(uid) {
    //console.log("showNoteList called..");
    viewList();

    $(".state").text("");
    $("#list").text("");

    noteRef.limitToLast(visibleRowCnt).once("value").then(function (snapshot) {
        var noteObj = snapshot.val();
        for (key in noteObj) {
            addItem(key, noteObj[key]);
        }

        $(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
        NProgress.done();
    });
}

function initNoteList(uid) {
    //var noteRef = firebase.database().ref('notes/' + uid).limitToLast(100);
    // 이벤트 등록용..
    noteRef = firebase.database().ref('notes/' + uid);
    noteRef.on('child_added', onChildAdded);
    noteRef.on('child_changed', onChildChanged);
    noteRef.on('child_removed', onChildRemoved);
    showNoteList(uid);
}

function onChildAdded(data) {
    //console.log("## onChildAdded called " + data.key);
    //noteList.push(data);
    notes.setItem(data.key, data.val());
    var curDate = new Date().getTime();
    var createDate = data.val().createDate;
    var diff = curDate - createDate;
    //console.log(diff);
    if (diff < 1000) {// 방금 새로 등록한 글인 경우만
        addItem(data.key, data.val());
        if ($(".state").html() == "") {
            $(".header .title").html(userInfo.data.nickname + "'s " +  notes.length + " notes");
        } else {
            $(".header .title").html(notes.length + " notes");
        }
    }
}

function addItem(key, noteData, how) {
    var html = getNoteHtml(key, noteData);

    if (how == "append") {
        $("#list").append(html.li);
    } else {
        $("#list").prepend(html.li);
    }

    // 오른쪽 끝 컨텍스트버튼 이벤트 처리
    setContextBtnEvent($("#" + key + " .btnContext"));
    setTouchSlider($("#" + key));
}


function getNoteHtml(key, noteData) {
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
    if (typeof userInfo != null) {// 내가 작성한 글인 경우만 수정/삭제버튼이 표시
        removeBtn = `<i id='btn_delete' onclick='removeNote("${key}")' class='material-icons'>delete</i>`;
        editBtn = `<i id='btn_edit' onclick='editNote("${key}")' class='material-icons'>edit</i>`;
    }

    var color = randomColor({hue: userInfo.data.iconColor, luminosity: 'dark'});  // https://randomcolor.llllll.li/

    var liChild = `<i class='createDate'>${createDate}</i><i class='btnContext'><<</i>
                <div class='title' onclick="viewNote('${key}')">${title}</div>
                <div class='content' onclick="viewNote('${key}')">${content}</div></p>${removeBtn}${editBtn}`;

    var li = `<li id="${key}" class="collection-item avatar">${liChild}</li>`;
    var html = {};
    html.li = li;
    html.liChild = liChild;
    return html;
}


function onChildChanged(data) {
    //console.log("## onChildChanged called..");
    var key = data.key;
    var noteData = data.val();
    var html = getNoteHtml(key, noteData);
    $("#" + key).html(html.liChild);
    $("#" + key).animate({left: "0px"}, 300);

    // 오른쪽 끝 컨텍스트버튼 이벤트 처리
    setContextBtnEvent($("#" + key + " .btnContext"));

    // noteList 갱신
    /*
    for(var i=0; i<noteList.length; i++){
        if(noteList[i].key == key){
            noteList[i] = data;
            break;
        }
    }
*/
    // notes 갱신
    notes.setItem(key, noteData);

    // 수정한 글목록으로 스크롤 이동
    //window.scrollTo("", document.getElementById(key).offsetTop + document.getElementById("list").offsetTop);
}

function onChildRemoved(data) {
//  console.log("## onChildRemoved called..");
    var key = data.key;
    $('#' + key).remove();
    //noteList.splice(noteList.indexOf(data), 1);  // noteList에서 삭제된 요소 제거
    notes.removeItem(key);
    $(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
}

function saveNote() {
    console.log("saveNote called..");
    var key = $("#noteContent").attr("key");
    //var title = $("#noteTitle").val();
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
        var res = firebase.database().ref('notes/' + userInfo.uid).push({
            txt: txt,
            createDate: new Date().getTime(),
            updateDate: new Date().getTime()
        });
        $("#noteContent").attr("key", res.key);
    } else {// 수정
        firebase.database().ref('notes/' + userInfo.uid + "/" + key).update({
            txt: txt,
            updateDate: new Date().getTime()
        });
    }
}


function removeNote(key) {
    if (userInfo != null && userInfo.isConnected) {
        if (confirm("삭제하시겠습니까?")) {
            firebase.database().ref('notes/' + userInfo.uid + '/' + key).remove();
            //$('#' + key).remove();
        }
    } else {
        alert("로그인이 필요합니다");
    }
}


function viewNote(key) {
   md.save();

    // 모바일 fixed div 에서 커서가 이상하게 동작되는 문제 회피
   if(isMobile.any){
       $m.qs(".dialog").style.position = "absolute";
       $m.qs(".dialog").style.top = (window.scrollY + 10 ) + "px";
   }


    var noteRef = firebase.database().ref('notes/' + userInfo.uid + '/' + key).once('value').then(function (snapshot) {
        $(".dialog").css("display", "block");
        $("#noteContent").attr("key", key);
        var txt = snapshot.val().txt;

        $("#list li.selected").removeClass("selected");
        $("#"+key).addClass("selected");

        var searchWord = $(".state span").html();
        if(searchWord){
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

        var anchors = $m.qsa("#noteContent a");
        anchors.forEach(function (a) {
            a.onmouseleave = function (e) {
                e.target.setAttribute("contenteditable", "true");
            };
            a.onmouseenter = function (e) {
                e.target.setAttribute("contenteditable", "false");
            };
        });
    });
}


function writeNote() {
    if (userInfo != null && userInfo.isConnected) {
        if ($("#addBtn").html() == "새글") {
            // 쓰기버튼 일때
            $m.qs(".dialog").style.display = "block";
            $("#noteContent").attr("key",  "");
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

            document.body.style.overflow =  "hidden";

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
        }else{
            console.log("기타 경우..");
        }

    } else {
        if (confirm("로그인이 필요합니다"))
            firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
}


function searchClick() {
    if (userInfo != null && userInfo.isConnected) {
        $(".search").css("display", "block");
        $("#input2").val("");
        $("#input2").focus();
    } else {
        alert("로그인이 필요합니다");
        //firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
}


function searchNote() {
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

    notes.each(function(key, val){
        noTagTxt = val.txt.replace(/<([^>]+)>/gi, "");   // 태그제거
        if((new RegExp(txt, "gi")).test(noTagTxt)){
            addItem(key, val);
        }
    });


    $(".header .title").html(notes.length + " notes");
    $(".header .state").html(`> <span style="font-style:italic;">${txt}</span> 's ${$("#list li").length} results`);

    viewList();
}


function cancelWrite() {
    $(".dialog").css("display", "none");
}

function cancelSearch() {
    $(".search").css("display", "none");
}


function keyupCheck(event) {
    var keycode = (event.which) ? event.which : event.keyCode;

    // 내용 변경여부 체크
    md.checkDiff();

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


function ManageDiff(){
    this.hasDiff = false;

    this.checkDiff = function(){
        console.log("checkDiff called..");
        this.noteKey = $("#noteContent").attr("key");
        if(!this.noteKey){
            // 신규인 경우
            this.hasDiff = true;
        }else{
            // 아래 루프를 없애도록 해야해...
            this.hasDiff = notes.getItem(this.noteKey).txt != $("#noteContent").html();
            /*
            for (var i = 0; i < noteList.length; i++) {
                if (noteList[i].key == this.noteKey) {
                    this.hasDiff = noteList[i].val().txt != $("#noteContent").html();
                    break;
                }
            }
            */
        }

        // 변경사항 있을 경우 변경사항 표시..
        if(this.hasDiff){
            var mark = $m.qs("#diffMark").innerHTML;
            $m.qs("#diffMark").innerHTML = mark + "*";
        }

        if(this.timer){
            md.end();   // 수정 중인 상황에는 타이머 초기화
        }

        this.timer = setTimeout(function(){
            md.save();
            md.end();
        }, 1000);
    }
    this.save = function(){
        if(this.hasDiff) {
            if($("#noteContent div:first-child").html() == "제목"){
                // 제목을 수정하지 않을 경우 저장하지 않는다
            }else{
                saveNote();
            }
        }
        $m.qs("#diffMark").innerHTML = "";
    }
    this.end = function(){
        this.timer = clearTimeout(this.timer);
    }
}

function setHeader() {
    if (userInfo != null) {
        $("#nickname").val(userInfo.data.nickname);
        $("#fontSize").val(userInfo.data.fontSize.replace("px", ""));
        $("#iconColor").val(userInfo.data.iconColor);
    } else {
        $(".header .title").html("mininote");
    }
}


function setContextBtnEvent(contextBtn) {
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

function setTouchSlider(row) {
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
            viewNote($(this).attr("id"));
            $(this).animate({left: "0px"}, 300);
        } else {
            $(this).animate({left: "0px"}, 300);
        }
    }

    row.bind("touchstart", touchstart);
    row.bind("touchmove", touchmove);
    row.bind("touchend", touchend);
}


function menuClick() {
    if ($(".menu").css("left") == "0px") {
        $(".menu").animate({left: "-220px"}, 300);
    } else {
        $(".menu").animate({left: "0px"}, 300);
    }
}


function signout() {
    firebase.auth().signOut().then(function () {
        //userInfo = null;
        //$("#list").html("");
        //$("#writeBtn").hide();
        //alert('Signed Out');
        // index.html 의 로그아웃 공통처리 로직이 수행됨
    }, function (error) {
        console.error('Sign Out Error', error);
    });
}



function setNickname(nickname) {
    userInfo.data.nickname = nickname;
    firebase.database().ref('users/' + userInfo.uid).update(userInfo.data);
    $(".header .title").html(userInfo.data.nickname + "'s " + notes.length + " notes");
}


function setFontSize(size) {
    userInfo.data.fontSize = size + "px";
    firebase.database().ref('users/' + userInfo.uid).update(userInfo.data);
    $(".txt").css("font-size", userInfo.data.fontSize);
}

function setIconColor(color) {
    userInfo.data.iconColor = color;
    firebase.database().ref('users/' + userInfo.uid).update(userInfo.data);
    $("#list i.circle").each(function (i) {
        var bgcolor = randomColor({hue: color, luminosity: 'dark'});
        $(this).css("background-color", bgcolor);
    });
}

function listClick() {
    $(".menu").animate({left: "-220px"}, 300);
}

function bodyScroll() {
    if ($(".state").html() != "") {// 검색결과 화면일 때
        return;
    }
    if (window.scrollY == 0) {// 처음 글쓰기 시작할때(스크롤이 아예 없을 때)
        return;
    }


    if (window.scrollY == $(document).height() - $(window).height()) {
        NProgress.start();
        $("#nprogress .spinner").css("top", "95%");
        var end = notes.length - $("#list li").length;
        var start = end - visibleRowCnt < 0 ? 0 : end - visibleRowCnt;
        var nextList = notes.getArray().slice(start, end).reverse();

        nextList.forEach(function (x) {
            addItem(x.key, x.val, "append");
        });
        NProgress.done();
    }
}

function topNavi() {
    if ($("#topNavi").html() == "목록") {
        // 목록버튼 누른 경우
        viewList();
    } else {
        // top 버튼 누른경우
        $(window).scrollTop(0);
    }
}

function viewList(){
    document.body.style.overflow = "visible";
    $(".dialog").css("display", "none");
    //$("body").css("overflow", "visible");
    $m.qs("body").style.overflow = "visible";
    $("#topNavi").html("arrow_upward");
    $("#topNavi").removeClass("list");
    $("#topNavi").addClass("navi");
    $("#topBtn a").css("opacity", "0.3");
    $("#addBtn").html("새글");
    $("#writeBtn").removeClass("disable");
    $("#writeBtn").show();
    $("#list li").removeClass("selected");
}


function titleClick() {
    if (userInfo) {
        showNoteList(userInfo.uid);
    } else {
        firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
    }
}

