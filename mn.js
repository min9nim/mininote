
function showNoteList(uid) {
  $(".state").text("");
  $("#list").text("");

  noteRef.limitToLast(visibleRowCnt).once("value").then(function(snapshot){
    var noteObj = snapshot.val();
    for(key in noteObj){
      addItem(key, noteObj[key]);
    }
    $(".header .title").html(userInfo.data.nickname + "'s "+noteList.length+" notes");
    NProgress.done();
  });
}

function initNoteList(uid) {
  //var noteRef = firebase.database().ref('notes/' + uid).limitToLast(100);
  noteRef = firebase.database().ref('notes/' + uid);
  noteRef.on('child_added', onChildAdded);
  noteRef.on('child_changed', onChildChanged);
  noteRef.on('child_removed', onChildRemoved);
  showNoteList(uid);
}

function onChildAdded(data) {
  //console.log("## onChildAdded called");
  noteList.push(data);
  var curDate = new Date().getTime();
  var createDate = data.val().createDate;
  var diff = curDate - createDate;
  //console.log(diff);
  if(diff < 1000){// 방금 새로 등록한 글인 경우만
    addItem(data.key, data.val());
    if($(".state").html() == ""){
      $(".header .title").html(userInfo.data.nickname + "'s "+noteList.length+" notes");
    }else{
      $(".header .title").html(noteList.length+" notes");
    }

  }
}

function addItem(key, noteData, how){
  var html = getNoteHtml(key, noteData);

  if(how == "append"){
    $("#list").append(html.li);
  }else{
    $("#list").prepend(html.li);
  }

  // 오른쪽 끝 컨텍스트버튼 이벤트 처리
  setContextBtnEvent($("#"+key+" .btnContext"));
  setTouchSlider($("#"+key));
}


function getNoteHtml(key, noteData){
    var idx = noteData.txt.indexOf("<div>");
    var title = noteData.txt.substr(0,idx);
    var content = noteData.txt.substr(idx);
    content = content.replace(/<\/div><div>/gi, " "); // html새줄문자를 공백문자로 변경
    content = content.replace(/<([^>]+)>/gi, "");   // 태그제거
    content = content.substr(0,100); // 100자까지만 보여주기
    var createDate = (new Date(noteData.createDate)).toString().substr(4, 17);

    var removeBtn = "";
    var editBtn = "";
    if(typeof userInfo != null){// 내가 작성한 글인 경우만 수정/삭제버튼이 표시
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
    $("#"+key).html(html.liChild);
    $("#"+key).animate({left: "0px"}, 300);

    // 오른쪽 끝 컨텍스트버튼 이벤트 처리
    setContextBtnEvent($("#"+key+" .btnContext"));
    window.scrollTo("", document.getElementById(key).offsetTop + document.getElementById("list").offsetTop);
}

function onChildRemoved(data) {
//  console.log("## onChildRemoved called..");
  var key = data.key;
  $('#' + key).remove();
  noteList.splice(noteList.indexOf(data),1);  // noteList에서 삭제된 요소 제거
  $(".header .title").html(userInfo.data.nickname + "'s "+noteList.length+" notes");
}

function saveNote() {
    var key = $("#noteContent").attr("key");
    //var title = $("#noteTitle").val();
    var txt = $("#noteContent").html().replace(/(<div><br><\/div>)+$/ig, ""); // 끝에 공백제거

    var idx = txt.indexOf("<div>");
    var title = txt.substr(0,idx);
    var content = txt.substr(idx);
    txt = "<div class='title'>" + title + "</div>" + content;

/*
    if (title === '') {
        alert("제목을 입력해 주세요");
        return;
    }
    */
    if(txt.length > 30000){
      alert("30000자 이내로 입력 가능");
      return;
    }
    if (txt === '') {
        alert("내용을 입력해 주세요");
        return;
    }

    $(".dialog").css("display", "none");
    $("#addBtn").html("쓰기");
    $("body").css("overflow", "visible");
    $("#topNavi").html("arrow_upward");


    if(key == ""){// 저장
      firebase.database().ref('notes/' + userInfo.uid).push({
          //title: title,
          txt: txt,
          createDate: new Date().getTime()
      });

    }else{// 수정
      firebase.database().ref('notes/' + userInfo.uid + "/" + key).update({
          //title: title,
          txt: txt,
          createDate: new Date().getTime()
      });
    }
}


function removeNote(key) {
  if (userInfo != null && userInfo.isConnected) {
    if (confirm("삭제하시겠습니까?")) {
        firebase.database().ref('notes/' + userInfo.uid + '/' + key).remove();
        //$('#' + key).remove();
    }
  }else{
    alert("로그인이 필요합니다");
  }
}

function editNote(key) {
  if (userInfo != null && userInfo.isConnected) {
    var noteRef = firebase.database().ref('notes/' + userInfo.uid + '/' + key).once('value').then(function(snapshot){
      $(".dialog").css("display", "block");
      $("#noteContent").attr("key", key);

      var txt = snapshot.val().txt;
      $("#noteContent").html(txt);
      /*
      var idx = txt.indexOf("<div>");
      var title = txt.substr(0,idx);
      var content = txt.substr(idx);
      $("#noteContent").html("<div class='title'>" + title + "</div>" + content);
*/

      $("#noteContent").focus();
      $("#addBtn").html("저장");
      $("#topNavi").removeClass("navi");
      $("#topNavi").addClass("list");
      $("#topNavi").html("목록");
      $("body").css("overflow", "hidden");
    });
  }else{
    alert("로그인이 필요합니다");
  }
}


function viewNote(key) {
    var noteRef = firebase.database().ref('notes/' + userInfo.uid + '/' + key).once('value').then(function(snapshot){
      $(".dialog").css("display", "block");
      $("#noteContent").attr("key", key);
      var txt = snapshot.val().txt;
      var idx = txt.indexOf("<div>");
      var title = txt.substr(0,idx);
      var content = txt.substr(idx);
      $("#noteContent").html("<div class='title'>" + title + "</div>" + content);
      $("#addBtn").html("저장");
      $("#topNavi").removeClass("navi");
      $("#topNavi").addClass("list");
      $("#topNavi").html("목록");
      $("body").css("overflow", "hidden");
      $(window).scrollTop(0);
    });
}


function writeNote() {
    if (userInfo != null && userInfo.isConnected) {
      if($("#addBtn").html() == "쓰기"){
        $(".dialog").css("display", "block");
        $("#noteContent").html("");
        $("#noteContent").focus();
        //document.execCommand("bold");
        $("#noteContent").attr("key", "");
        $("#addBtn").html("저장");
        $("#topNavi").removeClass("navi");
        $("#topNavi").addClass("list");
        $("#topNavi").html("목록");
        $("body").css("overflow", "hidden");
      }else{
        saveNote();
      }

    } else {
      if(confirm("로그인이 필요합니다"))
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


function searchNote(){
  var txt = $("#input2").val().trim();

  if(txt.length > 100){
    alert("100자 이내로 입력 가능");
    return;
  }
  if (txt === '') {
      alert("내용을 입력해 주세요");
      return;
  }

  $(".search").css("display", "none");

  noteRef.once("value").then(function(snapshot){
    $("#list").html("");
    var noteObj = snapshot.val();
    for(key in noteObj){
      if(noteObj[key].txt.indexOf(txt) >= 0){
        addItem(key, noteObj[key]);
      }
    }
    $(".header .title").html(noteList.length+" notes");
    $(".header .state").html(`> <span style="font-style:italic;">${txt}</span> 's ${$("#list li").length} results`);

    // 매칭단어 하이라이트닝
    var reg = new RegExp(txt, "g");
    $(".txt").each(function(i){
      this.innerHTML = this.innerHTML.replace(reg, `<span style="background-color:yellow;">${txt}</span>`); // html태그 내용까지 매치되면 치환하는 문제가 있음
    });

  });
}


function cancelWrite() {
    $(".dialog").css("display", "none");
}

function cancelSearch() {
    $(".search").css("display", "none");
}


function keyupCheck(event){
  var keycode = (event.which) ? event.which : event.keyCode;

  if(keycode == 13){
      if($("#noteContent").html().match(/<\/div><div/i) == null){
          // 첫번째 줄 입력했을 때 제목효과
          var range = document.createRange();
          var root_node = document.getElementById("noteContent");
          range.setStart(root_node,0);
          range.setEnd(root_node,1);
          var newNode = document.createElement("div");
          newNode.setAttribute("class", "title");
          range.surroundContents(newNode);
      }
  }


  if((event.metaKey || event.altKey) && keycode == 13) {
    if($(".dialog").css("display") == "block"){
      saveNote();
    }else {
      searchNote();
    }
    event.preventDefault();
    return false;
  }
}


function setHeader(){
  if(userInfo != null){
    $("#nickname").val(userInfo.data.nickname);
    $("#fontSize").val(userInfo.data.fontSize.replace("px",""));
    $("#iconColor").val(userInfo.data.iconColor);
  }else{
    $(".header .title").html("mininote");
  }
}


function setContextBtnEvent(contextBtn){
  contextBtn.bind("click", function(){
    if(contextBtn.text() == "<<"){
      contextBtn.parent().animate({left: "-100px"}, 300, function(){contextBtn.text(">>");});
    }else{
      contextBtn.parent().animate({left: "0px"}, 300, function(){contextBtn.text("<<");});
    }
  });
}

function setTouchSlider(row){
      var start_x, diff_x;
      var start_y, diff_y;
      var dom_start_x;

      function touchstart(e){
        start_x = e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX;
        start_y = e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY;
        dom_start_x = $(this).position().left;  // 터치시작할 때 최초 dom요소의 x위치를 기억하고 있어야 함
      }

      function touchmove(e){
        diff_x = (e.originalEvent.touches ? e.originalEvent.touches[0].pageX : e.pageX) - start_x;
        diff_y = (e.originalEvent.touches ? e.originalEvent.touches[0].pageY : e.pageY) - start_y;
        if(Math.abs(diff_x) > Math.abs(diff_y*4)){
          $(this).css("left", dom_start_x + diff_x);
        }
      }

      function touchend(){
        if(diff_x < -50){
          $(this).animate({left: "-100px"}, 300);
      }else if(diff_x > 150){
          viewNote($(this).attr("id"));
          $(this).animate({left: "0px"}, 300);
      }else{
          $(this).animate({left: "0px"}, 300);
        }
      }

      row.bind("touchstart", touchstart);
      row.bind("touchmove", touchmove);
      row.bind("touchend", touchend);
}


function menuClick(){
  if($(".menu").css("left") == "0px"){
    $(".menu").animate({left:"-220px"},300);
  }else{
    $(".menu").animate({left:"0px"},300);
  }
}


function signout(){
  firebase.auth().signOut().then(function() {
    //userInfo = null;
    //$("#list").html("");
    //$("#writeBtn").hide();
    //alert('Signed Out');
    // index.html 의 로그아웃 공통처리 로직이 수행됨
  }, function(error) {
    console.error('Sign Out Error', error);
  });
}


function searchFirstTxt(){
  var firstTxt = event.target.innerText;
  var noteRef = firebase.database().ref('notes/' + userInfo.uid);
  noteRef.once("value").then(function(snapshot){
    $("#list").html("");
    var reg = new RegExp(firstTxt, "i");
    var noteObj = snapshot.val();
    for(key in noteObj){
      var res = reg.exec(noteObj[key].txt);
      if(res !== null && res.index == 0){
        addItem(key, noteObj[key]);
      }
    }
    $(".header .title").html(noteList.length+" notes");
    $(".header .state").html(`> <span style="font-style:italic;">${firstTxt}</span> 's ${$("#list li").length} results`);
    // 매칭단어 하이라이트닝
    $(".txt").each(function(i){
      this.innerHTML = this.innerHTML.replace(firstTxt, `<span style="background-color:yellow;">${firstTxt}</span>`); // html태그 내용까지 매치되면 치환하는 문제가 있음
    });
  });
}

function setNickname(nickname){
  userInfo.data.nickname = nickname;
  firebase.database().ref('users/' + userInfo.uid).update(userInfo.data);
  $(".header .title").html(userInfo.data.nickname + "'s "+noteList.length+" notes");
}


function setFontSize(size){
  userInfo.data.fontSize = size+"px";
  firebase.database().ref('users/' + userInfo.uid).update(userInfo.data);
  $(".txt").css("font-size", userInfo.data.fontSize);
}

function setIconColor(color){
  userInfo.data.iconColor = color;
  firebase.database().ref('users/' + userInfo.uid).update(userInfo.data);
  $("#list i.circle").each(function(i){
    var bgcolor = randomColor({hue: color, luminosity: 'dark'});
    $(this).css("background-color", bgcolor);
  });
}


function listClick(){
  $(".menu").animate({left:"-220px"},300);
}

function bodyScroll(){
  if($(".state").html() != ""){// 검색결과 화면일 때
    return;
  }
  if(window.scrollY == 0){// 처음 글쓰기 시작할때(스크롤이 아예 없을 때)
    return;
  }


  if(window.scrollY == $(document).height() - $(window).height()){
    NProgress.start();
    $("#nprogress .spinner").css("top", "95%");
    var end = noteList.length - $("#list li").length;
    var start = end-visibleRowCnt < 0 ? 0 : end-visibleRowCnt;
    var nextList = noteList.slice(start, end).reverse();
    nextList.forEach(function(x,i){
      addItem(x.key, x.val(), "append");
    });
    NProgress.done();
  }
}

function topNavi(){
    if($("#topNavi").html() == "목록"){
        $(".dialog").css("display", "none");
        $("#addBtn").html("쓰기");
        $("body").css("overflow", "visible");
        $("#topNavi").html("arrow_upward");
        $("#topNavi").removeClass("list");
        $("#topNavi").addClass("navi");
    }else{
        $(window).scrollTop(0);
    }
}

function titleClick(){
  if(userInfo){
    showNoteList(userInfo.uid);
  }else{
    firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
  }
}
