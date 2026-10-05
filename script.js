// 대문자 원본 확장자 고정
const imageList = ["IMG_0971.JPEG", "IMG_1508.JPEG", "IMG_1228.JPEG", "IMG_1787.JPEG"];
let isFirstLoad = true;

// =========================================================
// 📑 [WORK 목록 데이터] 프로젝트를 추가/수정하려면 이 배열만 고치면 됨
//   title / year : 목록에 보이는 텍스트
//   image        : 호버 시 커서를 따라다니는 썸네일. 원본 대신 `python tools/make_thumbs.py 사진.jpg` 로 만든
//                  thumbs/사진.webp (가로 800px, 수십 KB)를 쓸 것 → 로딩이 빨라 호버가 끊기지 않음
//   color        : (선택) 호버 시 바뀌는 배경색. 생략하면 image에서 자동 추출
//   href         : (선택) 클릭 시 이동할 주소(새 탭). 생략하면 클릭해도 아무 일도 안 일어남
// =========================================================
const workProjects = [
    { title: "apple", year: "apple", image: "thumbs/IMG_1508.webp" },
    { title: "apple", year: "apple", image: "thumbs/IMG_1787.webp" },
    { title: "apple", year: "apple", image: "thumbs/IMG_0971.webp" },
    { title: "apple", year: "apple", image: "thumbs/IMG_1228.webp" },
    { title: "apple", year: "apple", image: "thumbs/test.webp" },
    { title: "apple", year: "apple", image: "thumbs/last.webp" },
];

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
// 🧹 [페이지 이동 시 청소 함수]
// =========================================================
let workMoveHandler = null; // WORK 호버 중 썸네일이 커서를 따라다니게 하는 mousemove 리스너

function clearPageEffects() {
    if (workMoveHandler) {
        document.removeEventListener('mousemove', workMoveHandler);
        workMoveHandler = null;
    }
    window.scrollTo(0, 0);
}

// =========================================================
// 🎨 [이미지 → 파스텔 배경색] 이미지 평균색의 "색상(hue)"만 쓰고 채도/명도는 파스텔로 고정
// =========================================================
function rgbToHue(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return 0;
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    return h < 0 ? h + 360 : h;
}

function extractPastelColor(img) {
    try {
        const size = 16;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const px = ctx.getImageData(0, 0, size, size).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < px.length; i += 4) {
            const spread = Math.max(px[i], px[i + 1], px[i + 2]) - Math.min(px[i], px[i + 1], px[i + 2]);
            const weight = spread / 255 + 0.05; // 채도 높은 픽셀일수록 색상에 크게 반영
            r += px[i] * weight; g += px[i + 1] * weight; b += px[i + 2] * weight; w += weight;
        }
        return `hsl(${Math.round(rgbToHue(r / w, g / w, b / w))}, 55%, 80%)`;
    } catch (e) {
        return '#e8e8e8'; // 캔버스를 읽을 수 없는 환경(file:// 등)이면 무채색으로 대체
    }
}

// =========================================================
// 🖼️ [썸네일 로더] 원본이 아무리 커도 작은 캔버스로 한 번 줄여서 사용
//   250px로 보여주는데 원본(수십 MP)을 그대로 쓰면 첫 호버 때 디코딩이 메인스레드를 수 초 막아 버벅임.
//   createImageBitmap(resize)는 디코딩을 메인스레드 밖에서 하고, 호버 때는 이미 작은 캔버스뿐이라 가벼움.
// =========================================================
const THUMB_PX = 500; // 표시 폭(250px)의 2배 = 레티나 대응

async function loadThumb(src) {
    try {
        const blob = await (await fetch(src)).blob();
        const bmp = await createImageBitmap(blob, { resizeWidth: THUMB_PX, resizeQuality: 'medium' });
        const canvas = document.createElement('canvas');
        canvas.width = bmp.width;
        canvas.height = bmp.height;
        canvas.getContext('2d').drawImage(bmp, 0, 0);
        bmp.close();
        return canvas;
    } catch (e) {
        // createImageBitmap 리사이즈를 못 쓰는 브라우저면 원본 <img>로 대체 (동작은 하되 큰 파일은 버벅일 수 있음)
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }
}

// 한 번 만든 썸네일은 캐시해서 WORK를 다시 열어도 재다운로드/재디코딩하지 않음
const thumbCache = new Map();
function getThumb(src) {
    if (!thumbCache.has(src)) thumbCache.set(src, loadThumb(src));
    return thumbCache.get(src);
}

// 캐시된 썸네일을 DOM에 넣을 복사본으로 만듦 (같은 노드를 여러 곳에 붙일 수 없어서)
function cloneThumb(el) {
    if (el.tagName !== 'CANVAS') return el.cloneNode();
    const copy = document.createElement('canvas');
    copy.width = el.width;
    copy.height = el.height;
    copy.getContext('2d').drawImage(el, 0, 0);
    return copy;
}

// 사이트가 다 뜬 뒤 한가할 때 WORK 썸네일을 미리 받아둠 → WORK를 열 때는 이미 준비된 상태
window.addEventListener('load', () => {
    const prefetch = () => workProjects.forEach(p => getThumb(p.image));
    if ('requestIdleCallback' in window) requestIdleCallback(prefetch, { timeout: 3000 });
    else setTimeout(prefetch, 1500);
});

// =========================================================
// 📑 [WORK 페이지] 텍스트 목록 + 호버 시 이미지/배경색 전환 (스크롤 없는 플랫 페이지)
// =========================================================
function renderWorkList(contentArea) {
    contentArea.innerHTML = `
        <section id="work-section">
            <ul id="work-list">
                ${workProjects.map((p, i) => `
                <li class="work-item" style="transition-delay: ${i * 0.1}s">
                    <a class="work-link"${p.href ? ` href="${p.href}" target="_blank" rel="noopener noreferrer"` : ''}>
                        <h2 class="work-title">${p.title}<span class="work-year">${p.year}</span></h2>
                    </a>
                    <div class="work-thumb"></div>
                </li>`).join('')}
            </ul>
        </section>
    `;

    const section = document.getElementById('work-section');
    const items = [...section.querySelectorAll('.work-item')];
    const colors = workProjects.map(p => p.color || null);

    // 배경색 전환(1초) + 채도 90%→100% 펄스. 펄스는 WAAPI로 따로 돌려서 배경 전환과 서로 안 끊김
    const setBg = (color, pulse = true) => {
        if (!color) return;
        section.style.backgroundColor = color;
        if (pulse) {
            section.animate(
                [{ filter: 'saturate(90%)' }, { filter: 'saturate(100%)' }],
                { duration: 1000, easing: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)' }
            );
        }
    };

    items.forEach((li, i) => {
        const thumb = li.querySelector('.work-thumb');

        // 첫 항목 색은 진입 시 배경에 바로 적용
        if (colors[i] && i === 0) setBg(colors[0], false);

        // 썸네일을 줄여서 붙이고, 색 지정이 없으면 그 줄인 이미지에서 색을 자동 추출
        getThumb(workProjects[i].image).then(el => {
            if (!el) return;
            thumb.appendChild(cloneThumb(el));
            if (!colors[i]) {
                colors[i] = extractPastelColor(el);
                if (i === 0) setBg(colors[0], false);
            }
        });

        const move = (e) => {
            thumb.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        };

        li.addEventListener('mouseenter', (e) => {
            li.classList.add('is-hover');
            move(e);
            workMoveHandler = move;
            document.addEventListener('mousemove', move);
            setBg(colors[i]);
        });
        li.addEventListener('mouseleave', () => {
            li.classList.remove('is-hover');
            document.removeEventListener('mousemove', move);
            if (workMoveHandler === move) workMoveHandler = null;
        });
        li.addEventListener('touchstart', () => setBg(colors[i]), { passive: true }); // 모바일: 썸네일 없이 배경색만
    });

    // 진입 연출: 다음 프레임에 클래스를 붙여서 항목들이 0.1초 간격으로 차례로 페이드인
    requestAnimationFrame(() => requestAnimationFrame(() => section.classList.add('is-in')));
}

// 1. 🏠 홈 화면
function loadHome() {
    clearPageEffects(); 
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
    clearPageEffects(); 
    const contentArea = document.getElementById("content-area");
    
    if (pageName === 'WORK') {
        renderWorkList(contentArea);

    } else if (pageName === 'ABOUT') {
        contentArea.innerHTML = `
            <!-- 📐 화면 정중앙 좌표에 꽂히는 베이스캠프 -->
            <div class="about-center-wrapper">
                
                <!-- 📸 래퍼 안을 꽉 채우는 사진 -->
                <img id="about-img" src="IMG_0549.JPEG" alt="About Profile">
                
                <!-- ✍️ 사진의 오른쪽 끝선에 자동으로 달라붙는 텍스트 박스 -->
                <div class="about-text-container">
                    <div class="about-box">
                        CHOI SHINU<br>
                        SEOUL, KOREA<br>
                        sinw123@gmail.com<br>
                        <div class="tab-row">
                            <span class="tab-label">2021 - Present</span>
                            <span>Hanyang University School of Architecture</span>
                        </div>
                        <div class="tab-row">
                            <span class="tab-label">2018 - 2020</span>
                            <span>Gyeongnam Science High School</span>
                        </div>
                    </div>
                    <div class="about-box">SKILLS<br>
                    Rhino<br>
                    Illustrator<br>
                    AutoCAD
                    </div>
                    <div class="about-box">HONORS & AWARDS<br>
                        <div class="tab-row">
                            <span class="tab-label">Finalist</span>
                            <span>2025 Fondation Jacques Rougerie - Académie des beaux-arts</span>
                        </div>
                        <div class="tab-row">
                            <span class="tab-label">Excellence</span>
                            <span>65th National Science Fair</span>
                        </div>
                    </div>
                    <div class="about-box">PROJECT<br>
                        <div class="tab-row">
                            <span class="tab-label">2019</span>
                            <span>A Study on Soil Liquefaction Induced by Earthquakes</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 레이아웃 고정은 CSS의 #about-img { aspect-ratio } 가 담당함.
        // (예전 페이드인 코드는 opacity 초기값 0이 어디에도 없어서 동작하지 않았고, 불필요해서 제거)
    }
}

// 🚀 최초 실행
loadHome();