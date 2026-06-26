// 대문자 원본 확장자 고정
const imageList = ["IMG_0971.JPEG", "IMG_1508.JPEG", "IMG_1228.JPEG", "IMG_1787.JPEG"];
let isFirstLoad = true;

// 1. 🏠 홈 화면 (랜덤 사진 클릭 모드) 불러오는 함수
function loadHome() {
    const contentArea = document.getElementById("content-area");
    
    // 도화지 안을 순수 이미지 태그로 갈아 끼웁니다
    contentArea.innerHTML = `<img id="random-img" src="" alt="Main Image" style="opacity: 0;" onclick="changeImageSmoothly()">`;
    
    // 사진을 랜덤하게 즉시 띄웁니다
    isFirstLoad = true;
    changeImageSmoothly();
}

// 2. 👻 유령 액자를 이용한 디지털 사진 교체 함수 (기존 로직 유지)
function changeImageSmoothly() {
    const imgElement = document.getElementById("random-img");
    if (!imgElement) return; // 홈 화면이 아닐 때는 실행 방지
    
    const randomIndex = Math.floor(Math.random() * imageList.length);
    const nextImageUrl = imageList[randomIndex];
    
    const tempImage = new Image();
    tempImage.src = nextImageUrl;
    
    tempImage.onload = function() {
        imgElement.src = nextImageUrl;
        if (isFirstLoad) {
            imgElement.style.opacity = 1;
            isFirstLoad = false;
        }
    };
}

// 3. 📑 [SPA 핵심] 메뉴 클릭 시 상단 바를 냅두고 알맹이 내용만 스위칭하는 함수
function loadPage(pageName) {
    const contentArea = document.getElementById("content-area");
    
    if (pageName === 'WORK') {
        // 💥 WORK를 눌렀을 때 띄울 텍스트와 큰 이미지를 이 자리에 꽂아 넣습니다 (1.html의 내용)
        contentArea.innerHTML = `
            <h2>HTML이란 무엇인가?</h2>
            <p>Hypertext Markup Language (HTML) is the standard Markup language for creating web pages...</p>
        `;
    } else if (pageName === 'ABOUT') {
        // 💥 ABOUT을 눌렀을 때 띄울 텍스트를 이 자리에 꽂아 넣습니다 (2.html의 내용)
        contentArea.innerHTML = `
            <h2>CSS란 무엇인가?</h2>
            <p>CSS (Cascading Style Sheets) is a fundamental language of the open web used to define the presentation...</p>
        `;
    }
}

// 🚀 [최초 실행] 사이트 켜지자마자 홈 화면(랜덤 사진) 로드
loadHome();