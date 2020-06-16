# mininote
mininote 는 가볍고 빠른 일정관리 툴입니다
에버노트는 무겁고 무료버젼에는 기능상 제약이 많습니다. mininote 는 가장 단순하고 핵심적인 몇가지 기능들만을 제공하되 쉽고 빠르고 어느 기기에서나 사용이 가능합니다

### 서비스 이용방법
* 접근주소: https://mininote-a7060.firebaseapp.com
* 구글계정만 사용 가능


### 개발환경
* Back-end : [firebase](https://firebase.google.com)
* Front-end : es6, requirejs, babel, vuejs

### firebase 설치
```
curl -sL https://firebase.tools | bash
```

### firebase 로그인
```
firebase login
```

### firebase 프로젝트 목록
```
firebase projects:list
```

### firebase 초기화
```
firebase init
```

### 로컬 개발환경 시작

현재 localhost 도메인만 구글로그인 가능

```
firebase serve --only hosting --host 0.0.0.0
```

### 배포
```
firebase deploy
```

### 기능설명
* 단축키
  * Alt(or meta) + W : 글쓰기
  * Alt(or meta) + L : 목록보기
  * Alt(or meta) + Enter : 저장/조회
  * Alt + T : 체크박스 추가
  * Alt + U : 순서없는 목록
* 예약어 autoReplace
  * !! + "띄어쓰기" : 체크박스 추가
  * @@ + "띄어쓰기" : 순서없는 목록
  * )) + "띄어쓰기" : 들여쓰기
  * (( + "띄어쓰기" : 내어쓰기
  * (( + "띄어쓰기" : 내어쓰기
  * dd + "띄어쓰기" : 한줄삭제


### 이후 추가될 기능
* 검색기능
* 내용 저장시 애니메이션 효과


### 스크린샷
* 글목록  
![list](https://raw.githubusercontent.com/min9nim/mininote/master/image/list.png)
* 글쓰기  
![write](https://raw.githubusercontent.com/min9nim/mininote/master/image/write.png)



### 라이선스
MIT License


### Ref.
https://firebase.google.com/docs/cli?hl=ko#install-cli-mac-linux
