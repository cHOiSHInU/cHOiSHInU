// 대문자 원본 확장자 고정
const imageList = ["IMG_0971.JPEG", "IMG_1508.JPEG", "IMG_1228.JPEG", "IMG_1787.JPEG"];
let isFirstLoad = true;

// 📌 [메뉴바 고정]
const topBar = document.querySelector('.top-bar');
if (topBar) {
    topBar.style.position = 'sticky';
    topBar.style.top = '0';
    topBar.style.zIndex = '9999';
}

// =========================================================
// 🚀 [Lenis 라이브러리 장착]
// =========================================================
const lenis = new Lenis({
    duration: 1.2, 
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    smoothWheel: true,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// =========================================================
// 🍏 [iOS 물리 엔진 전역 변수]
// =========================================================
let isWorkPage = false;
let overscrollY = 0; // 탄성으로 늘어나는 수치
let isWheeling = false; 
let wheelTimeout = null;
let maxScroll = 0;
let currentLenisY = 0;
let overscrollRafId = null;

// 🧹 페이지 이동 시 청소 함수
function clearWorkPageEffects() {
    isWorkPage = false;
    document.body.style.overscrollBehavior = ''; // 네이티브 탄성 복구
    
    if (overscrollRafId) {
        cancelAnimationFrame(overscrollRafId);
        overscrollRafId = null;
    }
    
    const oldDummy = document.getElementById('dummy-scroll-container');
    if (oldDummy) oldDummy.remove();
    
    document.body.style.height = ''; 
    window.scrollTo(0, 0); 
}

// 1. 🏠 홈 화면
function loadHome() {
    clearWorkPageEffects(); 
    const contentArea = document.getElementById("content-area");
    contentArea.innerHTML = `<img id="random-img" src="" alt="Main Image" style="opacity: 0;" onclick="changeImageSmoothly()">`;
    isFirstLoad = true;
    changeImageSmoothly();
}

function changeImageSmoothly() {
    const imgElement = document.getElementById("random-img");
    if (!imgElement) return;
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

// 3. 📑 메뉴 클릭 로직
function loadPage(pageName) {
    clearWorkPageEffects(); 
    const contentArea = document.getElementById("content-area");
    
    if (pageName === 'WORK') {
        isWorkPage = true;
        overscrollY = 0; // 진입 시 탄성 수치 완벽 초기화

        // 브라우저의 기본 고무줄 효과를 꺼서 우리가 만든 3D 고무줄과 충돌하지 않게 함
        document.body.style.overscrollBehavior = 'none';

        const dummyScroll = document.createElement('div');
        dummyScroll.id = 'dummy-scroll-container';
        document.body.appendChild(dummyScroll);

        // 📏 [완벽한 원점 세팅] 꼼수(150px 여백) 제거. 메인/어바웃과 1픽셀도 안 틀리고 정확히 맞춤
        const topOffset = topBar ? topBar.offsetHeight : 0; 
        const paddingTopValue = topOffset + 40; 
        
        const baseContentHTML = `
            <div class="scroll-content-inner" style="padding-top: ${paddingTopValue}px; padding-bottom: 100vh;">
                <img class="work-img-last" src="" alt="Work 1" style="display: block; margin: 0 auto 30vh auto; height: 70vh; width: auto; max-width: 90%; object-fit: contain;">
                <img class="work-img-test" src="" alt="Work 2" style="display: block; margin: 0 auto; height: 70vh; width: auto; max-width: 90%; object-fit: contain;">
            </div>
        `;

        contentArea.innerHTML = `
            <div id="native-scroll-content" style="opacity: 0; pointer-events: none;">
                ${baseContentHTML}
            </div>

            <div id="work-3d-viewport" style="position: fixed; top: 0; left: 0; width: 100%; height: 100vh; z-index: -1; background: #fff; opacity: 0; transition: opacity 0.5s ease;">
                <div style="perspective: 800px; height: 100vh; display: flex; flex-direction: column;">
                    <div class="fold" style="height: 10vh; transform-origin: bottom center; transform: rotateX(-45deg); overflow: hidden; position: relative; transform-style: preserve-3d;">
                        <div class="scroll-content-clone" style="position: absolute; top: 0; left: 0; width: 100%;">
                            ${baseContentHTML}
                        </div>
                    </div>
                    <div class="fold" style="height: 80vh; overflow: hidden; position: relative; z-index: 2; transform-style: preserve-3d;">
                        <div class="scroll-content-clone" style="position: absolute; top: -10vh; left: 0; width: 100%;">
                            ${baseContentHTML}
                        </div>
                    </div>
                    <div class="fold" style="height: 10vh; transform-origin: top center; transform: rotateX(45deg); overflow: hidden; position: relative; transform-style: preserve-3d;">
                        <div class="scroll-content-clone" style="position: absolute; top: -90vh; left: 0; width: 100%;">
                            ${baseContentHTML}
                        </div>
                    </div>
                </div>
            </div>
        `;

        let loadedCount = 0;
        const initWorkScroll = () => {
            loadedCount++;
            if (loadedCount === 4) { 
                const innerContent = document.querySelector('.scroll-content-inner');
                dummyScroll.style.height = innerContent.getBoundingClientRect().height + 'px';
                maxScroll = dummyScroll.scrollHeight - window.innerHeight;

                // 사진 로딩 완료 즉시 화면 켜기 (0지점에서 평온하게 시작)
                document.getElementById("work-3d-viewport").style.opacity = 1;
                
                // 엔진 가동!
                runiOSPhysicsEngine();
            }
        };

        const imgsLast = document.querySelectorAll('.work-img-last');
        const imgsTest = document.querySelectorAll('.work-img-test');
        imgsLast.forEach(img => { img.src = "last.jpg"; img.onload = initWorkScroll; });
        imgsTest.forEach(img => { img.src = "test.jpg"; img.onload = initWorkScroll; });

        // =========================================================
        // 🛹 [스크롤 동기화] Lenis의 순수 좌표값만 가져옵니다.
        // =========================================================
        lenis.on('scroll', (e) => {
            currentLenisY = e.animatedScroll;
        });

    } else if (pageName === 'ABOUT') {
        contentArea.innerHTML = `
            <div class="about-center-wrapper">
                <img id="about-img" src="" alt="About Profile" style="opacity: 0;">
                <div class="about-text-container" id="about-text" style="opacity: 0;">
                    <div class="about-box">CHOI SHINU<br>SEOUL, KOREA<br>sinw123@gmail.com</div>
                    <div class="about-box">SKILLS<br>Rhino<br>Illustrator<br>AutoCAD</div>
                    <div class="about-box">HONORS & AWARDS<br>...</div>
                    <div class="about-box">PROJECT<br>...</div>
                </div>
            </div>
        `;
        const aboutImg = document.getElementById("about-img");
        const aboutText = document.getElementById("about-text");
        const tempImg = new Image();
        tempImg.src = "IMG_0549.JPEG";
        tempImg.onload = function() {
            aboutImg.src = "IMG_0549.JPEG";
            aboutImg.style.opacity = 1;
            aboutText.style.opacity = 1;
        };
    }
}

// =========================================================
// 🍏 [iOS 감성 고무줄 물리 엔진] 마우스 휠 & 터치 감지
// =========================================================
window.addEventListener('wheel', (e) => {
    if (!isWorkPage) return;
    
    isWheeling = true;
    clearTimeout(wheelTimeout);
    
    // 휠 굴림이 멈췄다고 판단하는 시간 (0.05초). 멈추자마자 바로 튕겨나감!
    wheelTimeout = setTimeout(() => { isWheeling = false; }, 50);

    // 맨 위에서 위로 뚫으려 할 때 (Friction: 0.4로 뻑뻑하게 늘어남)
    if (window.scrollY <= 0 && e.deltaY < 0) {
        overscrollY += e.deltaY * 0.4; 
    } 
    // 맨 아래에서 아래로 뚫으려 할 때
    else if (window.scrollY >= maxScroll && e.deltaY > 0) {
        overscrollY += e.deltaY * 0.4;
    }
}, { passive: false });

// 모바일 터치(스와이프) 감지 로직
let lastTouchY = 0;
window.addEventListener('touchstart', (e) => {
    if (!isWorkPage) return;
    isWheeling = true;
    lastTouchY = e.touches[0].clientY;
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!isWorkPage) return;
    const currentY = e.touches[0].clientY;
    const deltaY = lastTouchY - currentY; // 손가락 올리면 양수(스크롤 내림)
    lastTouchY = currentY;

    if (window.scrollY <= 0 && deltaY < 0) {
        overscrollY += deltaY * 0.4;
    } else if (window.scrollY >= maxScroll && deltaY > 0) {
        overscrollY += deltaY * 0.4;
    }
}, { passive: false });

window.addEventListener('touchend', () => {
    if (!isWorkPage) return;
    // 손가락 떼는 즉시 딜레이 없이 튕겨냄!
    isWheeling = false; 
});

// =========================================================
// 🍏 [물리 엔진 루프] 초당 60프레임으로 끊임없이 계산
// =========================================================
function runiOSPhysicsEngine() {
    if (!isWorkPage) return;

    // 손을 떼거나 휠을 멈췄는데 고무줄이 늘어나 있다면? 
    if (!isWheeling && Math.abs(overscrollY) > 0.5) {
        // 즉각적이고 강렬한 탄성으로 원점(0) 복귀 (숫자가 클수록 팍! 튕김)
        overscrollY += (0 - overscrollY) * 0.15; 
    } else if (!isWheeling && Math.abs(overscrollY) <= 0.5) {
        // 거의 다 돌아오면 깔끔하게 0으로 리셋
        overscrollY = 0;
    }

    // Lenis의 부드러운 스크롤 값 + iOS 고무줄 텐션 값의 완벽한 융합
    const finalY = currentLenisY + overscrollY;

    const scrollClones = document.querySelectorAll('.scroll-content-clone');
    scrollClones.forEach(content => {
        content.style.transform = `translate3d(0, -${finalY}px, 0)`;
    });

    overscrollRafId = requestAnimationFrame(runiOSPhysicsEngine);
}

// 🚀 최초 실행
loadHome();