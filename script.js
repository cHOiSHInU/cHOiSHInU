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
        contentArea.innerHTML = `
            <!-- 📐 화면 정중앙 좌표에 꽂히는 베이스캠프 (이 상자의 크기는 사진 크기와 100% 동일해집니다) -->
            <div class="about-center-wrapper">
                
                <!-- 📸 래퍼 안을 꽉 채우는 사진 -->
                <img id="about-img" src="IMG_0549.JPEG" alt="About Profile">
                
                <!-- ✍️ 사진의 오른쪽 끝선(100%)에 자동으로 달라붙는 텍스트 박스 -->
                <div class="about-text-container">
                    <div class="about-box">
                        CHOI SHINU<br>
                        SEOUL, KOREA<br>
                        sinw123@gmail.com<br>
                        <!-- 💥 대학교 (Flex로 표처럼 분리) -->
                        <div style="display: flex;">
                            <!-- 왼쪽 연도 칸: '2021-Present'가 들어갈 만큼 넉넉하게 100px 고정 -->
                            <span style="width: 150px; flex-shrink: 0;">2021 - Present</span>
                            <!-- 오른쪽 학교 칸 -->
                            <span>Hanyang University School of Architecture</span>
                        </div>
                        
                        <!-- 💥 고등학교 (졸업 연도 2021 기입) -->
                        <div style="display: flex;">
                            <!-- 위쪽 연도 칸과 똑같이 100px 고정 -> 우측 텍스트 세로선 완벽 일치! -->
                            <span style="width: 150px; flex-shrink: 0;">2018 - 2020</span>
                            <span>Gyeongnam Science High School</span>
                        </div>
                    </div>
                    <div class="about-box">SKILLS<br>
                    Rhino<br>
                    Illustrator<br>
                    AutoCAD
                    </div>
                    <div class="about-box">HONORS & AWARDS<br>
                        <div style="display: flex;">
                            <span style="width: 150px; flex-shrink: 0;">Finalist</span>
                            <span>2025 Fondation Jacques Rougerie - Académie des beaux-arts</span>
                        </div>
                        <div style="display: flex;">
                            <span style="width: 150px; flex-shrink: 0;">Excellence Award</span>
                            <span>65th National Science Fair</span>
                        </div>                   

                    </div>
                    <div class="about-box">PROJECT<br>
                        <div style="display: flex;">
                            <span style="width: 150px; flex-shrink: 0;">2019</span>
                            <span>A Study on Soil Liquefaction Induced by Earthquakes</span>
                        </div>
                    </div>
                </div>
                
            </div>
        `;
    }
}

// 🚀 [최초 실행] 사이트 켜지자마자 홈 화면(랜덤 사진) 로드
loadHome();