// 대문자 원본 확장자 고정
const imageList = [
    "IMG_0971.JPEG", "IMG_1508.JPEG", "IMG_1228.JPEG", "IMG_1787.JPEG", "IMG_0549.JPEG",
    // 홈 사진은 전부 긴 변 1600px로 통일 (화면에 70vh로 보이므로 레티나에서도 충분)
    "paris-graffiti.jpg", "paris-sacre-coeur.jpg", "paris-fondation-lv.jpg", "paris-arc-de-triomphe.jpg",
    "paris-villa-savoye.jpg", "paris-ima.jpg", "paris-pompidou.jpg",
];
let isFirstLoad = true;

// =========================================================
// 📑 [WORK 목록 데이터] 프로젝트를 추가/수정하려면 이 배열만 고치면 됨
//   title / year : 목록에 보이는 텍스트
//   image        : 호버 시 커서를 따라다니는 썸네일. 원본 대신 `python tools/make_thumbs.py 사진.jpg` 로 만든
//                  thumbs/사진.webp (가로 500px, 수십 KB)를 쓸 것 → 로딩이 빨라 호버가 끊기지 않음
//   full         : (선택) 클릭 시 씬2에 크게 뜨는 이미지 (긴 변 2048px로 줄여 둘 것: 수천만 화소 원본은 클릭 순간 화면이 멈춤). 생략하면 image(썸네일)로 대체
//   color        : (선택) 호버 시 바뀌는 배경색. 생략하면 image에서 자동 추출
//   href         : (선택) 클릭 시 이동할 주소(새 탭). 생략하면 클릭 시 씬2(원본 이미지)로 전환
//   noClick      : (선택) true면 호버(썸네일/배경색)만 되고 클릭해도 아무 데도 안 감
// =========================================================
const workProjects = [
    { title: "Monolith Daechi", year: "2026", image: "thumbs/monolith-daechi.webp", noClick: true },
    { title: "Shaping Shade: A Community Center in Rural Casamance", year: "2026", image: "thumbs/last.webp", full: "last.jpg" },
    { title: "Bloom from the Abyss", year: "2025", image: "thumbs/test.webp", full: "test.jpg" },
    { title: "Folded Green", year: "2022", image: "thumbs/folded-green.webp", noClick: true },
    { title: "Sum of Views", year: "2022", image: "thumbs/sum-of-views.webp", noClick: true },
    { title: "A Study on Soil Liquefaction Induced by Earthquakes", year: "2019", image: "thumbs/liquefaction.webp" },
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
// WORK 썸네일이 커서를 따라다니게 하는 mousemove 리스너들. 사라지는 중인 썸네일도 끝까지 따라오므로 여러 개일 수 있음
const workMoveHandlers = new Set();

function clearPageEffects() {
    workMoveHandlers.forEach(h => document.removeEventListener('mousemove', h));
    workMoveHandlers.clear();
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true }); // Lenis가 기억하는 스크롤 위치도 맨 위로 (ABOUT에서 내려간 채 이동해도 다음 페이지는 맨 위)
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
        const size = 32;
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, size, size);
        const px = ctx.getImageData(0, 0, size, size).data;

        // 색상환을 10°씩 36칸으로 나눠 "어느 색이 제일 많은지" 투표시킨다.
        // (예전처럼 RGB를 평균내면 파랑+빨강 같은 반대색이 서로 상쇄돼 회색이 나와버린다)
        const BUCKETS = 36;
        const votes = new Array(BUCKETS).fill(0);
        for (let i = 0; i < px.length; i += 4) {
            const r = px[i], g = px[i + 1], b = px[i + 2];
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            if (max < 30 || min > 235) continue;        // 거의 검정/흰색은 색을 못 정하므로 제외
            const sat = (max - min) / max;
            if (sat < 0.18) continue;                    // 무채색에 가까운 픽셀도 제외
            votes[Math.floor(rgbToHue(r, g, b) / (360 / BUCKETS)) % BUCKETS] += sat * sat;
        }

        // 이웃 칸까지 합산해서 뽑는다 → 경계에 걸쳐 흩어진 같은 색이 쪼개지지 않음
        let best = -1, bestScore = 0;
        for (let i = 0; i < BUCKETS; i++) {
            const score = votes[(i + BUCKETS - 1) % BUCKETS] + votes[i] + votes[(i + 1) % BUCKETS];
            if (score > bestScore) { bestScore = score; best = i; }
        }
        if (best < 0) return '#e8e8e8';                  // 색이라 할 만한 픽셀이 없는 흑백 이미지

        return `hsl(${Math.round((best + 0.5) * (360 / BUCKETS))}, 55%, 80%)`;
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

// 한 번 만든 썸네일은 캐시해서 WORK를 다시 열어도 재다운로드/재디코딩하지 않음.
// WORK 목록은 화면에 하나뿐이라 복사하지 않고 이 캔버스를 새 목록으로 옮겨 붙임 → 방문할 때마다 캔버스가 쌓이지 않음
const thumbCache = new Map();
function getThumb(src) {
    if (!thumbCache.has(src)) thumbCache.set(src, loadThumb(src));
    return thumbCache.get(src);
}

// WORK 메뉴에 마우스를 올리는 순간 썸네일을 미리 받아둠 → 홈에서는 홈 사진만 받음.
// (썸네일은 500px·수십 KB라 메뉴 호버~클릭 사이, 늦어도 WORK 진입 연출 동안 다 받아짐)
document.querySelector('.menu a[href="#work"]')
    ?.addEventListener('pointerenter', () => workProjects.forEach(p => getThumb(p.image)), { once: true });

// =========================================================
// 📑 [WORK 페이지] 텍스트 목록 + 호버 시 이미지/배경색 전환 (스크롤 없는 플랫 페이지)
// =========================================================

const THUMB_MS = 200; // 썸네일 등장/퇴장 시간 (GSAP power1.inOut)

// openIndex: 주소가 #work/3 처럼 프로젝트를 가리키면(새로고침·앞으로 가기) 목록을 거치지 않고 바로 연다
function renderWorkList(contentArea, openIndex = null) {
    contentArea.innerHTML = `
        <section id="work-section">
            <ul id="work-list">
                ${workProjects.map((p, i) => `
                <li class="work-item" style="--delay: ${i * 0.1}s">
                    <a class="work-link"${p.href ? ` href="${p.href}" target="_blank" rel="noopener noreferrer"` : ''}${p.noClick ? ' style="cursor: default"' : ''}>
                        <h2 class="work-title">${p.title}<span class="work-year">${p.year}</span></h2>
                    </a>
                    <div class="work-thumb"><div class="work-thumb-inner"></div></div>
                </li>`).join('')}
            </ul>
        </section>
    `;

    const section = document.getElementById('work-section');
    const items = [...section.querySelectorAll('.work-item')];
    const colors = workProjects.map(p => p.color || null);
    const hideThumbs = []; // 항목별 썸네일 숨기기 (씬2로 넘어갈 때 한꺼번에 호출)

    // 배경색 전환(1초) + 채도 90%→100% 펄스. 펄스는 WAAPI로 따로 돌려서 배경 전환과 서로 안 끊김
    const setBg = (color, pulse = true) => {
        if (!color) return;
        section.style.setProperty('--work-bg', color); // 색은 아래 그라데이션 막(::after)에만 칠해짐
        if (pulse) {
            section.animate(
                [{ filter: 'saturate(90%)' }, { filter: 'saturate(100%)' }],
                { duration: 1000, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' } // 배경색과 같은 quad.out
            );
        }
    };

    // 씬1 → 씬2: 목록과 배경색이 한 화면으로 같이 사라지고, 원본 이미지가 홈 사진과 같은 자리에 나타남
    const isOut = () => section.classList.contains('is-out');
    const openProject = (i, push = true) => {
        if (isOut()) return;
        if (push) history.pushState(null, '', `#work/${i}`); // 뒤로 가기 하면 목록으로 돌아오도록 기록
        hideThumbs.forEach(hide => hide());
        items.forEach(li => {
            li.style.setProperty('--delay', '0s'); // 진입 때의 순차 딜레이 없이 한 번에 사라지게
        });
        // 색 전환·채도 펄스가 진행 중이면 그 순간 상태로 멈춘 채 페이드아웃 (끝 색으로 점프하지 않게)
        section.style.setProperty('--work-bg', getComputedStyle(section, '::after').backgroundColor);
        section.getAnimations().forEach(a => a.pause());
        section.classList.add('is-out'); // 화면 전체(목록+배경색)가 같이 페이드아웃

        const p = workProjects[i];
        const img = new Image();
        img.id = 'work-full';
        img.alt = p.title;
        img.src = p.full || p.image;
        contentArea.appendChild(img);

        // 목록이 다 사라지고(0.9초) 이미지 디코딩까지 끝난 뒤에 페이드인 → 반쯤 그려진 이미지가 보이지 않음
        const listGone = new Promise(resolve => setTimeout(resolve, 900));
        Promise.all([img.decode().catch(() => {}), listGone]).then(() => img.classList.add('is-in'));
    };

    items.forEach((li, i) => {
        const link = li.querySelector('.work-link');
        const thumb = li.querySelector('.work-thumb');
        const inner = thumb.querySelector('.work-thumb-inner');
        const p = workProjects[i];
        let preloaded = false;

        // 썸네일을 줄여서 붙이고, 색 지정이 없으면 그 줄인 이미지에서 색을 자동 추출 (진입 시 배경은 하양 그대로)
        getThumb(workProjects[i].image).then(el => {
            if (!el) return;
            inner.appendChild(el);
            if (!colors[i]) colors[i] = extractPastelColor(el);
        });

        const move = (e) => {
            thumb.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
        };
        const follow = () => {
            if (workMoveHandlers.has(move)) return;
            workMoveHandlers.add(move);
            document.addEventListener('mousemove', move);
        };
        const unfollow = () => {
            workMoveHandlers.delete(move);
            document.removeEventListener('mousemove', move);
        };

        // yooniverse와 같은 방식: GSAP 트윈 하나를 정방향 재생/역재생.
        // 다 뜨기 전에 마우스를 빼면 지나온 길을 그대로 되감고, 사라지는 동안에도 커서를 따라오다 끝나면 멈춤.
        // (브라우저 기본 애니메이션의 역재생은 Chrome이 한 프레임에 끝내버려서 GSAP으로 매 프레임 직접 그림, 2026-10-31)
        const tween = gsap.fromTo(inner,
            { opacity: 0, scale: 0.4 },
            { opacity: 1, scale: 1, duration: THUMB_MS / 1000, ease: 'power1.inOut', paused: true, onReverseComplete: unfollow });
        const show = () => tween.play();
        const hide = () => {
            if (tween.progress() > 0) tween.reverse();
            else unfollow();
        };
        hideThumbs.push(hide);

        // 호버·클릭 영역 = 글자(링크)만. li에 걸면 가장 긴 제목 폭만큼 줄 전체가 영역이 되어 빈 곳에서도 썸네일이 뜸
        link.addEventListener('mouseenter', (e) => {
            if (isOut()) return;
            // 호버하는 순간 원본을 미리 받아둠 → 클릭했을 때 대부분 이미 준비된 상태
            if (!preloaded && p.full) { new Image().src = p.full; preloaded = true; }
            move(e);
            follow();
            show();
            setBg(colors[i]);
        });
        link.addEventListener('mouseleave', () => {
            if (isOut()) return; // 클릭 후 목록이 클릭을 안 받게 되면서 생기는 mouseleave. 숨기기는 openProject가 이미 함
            hide();
            setBg('#fff', false); // 호버를 치우면 하양으로. 옆 줄로 옮기면 곧바로 그 줄 색으로 이어서 바뀜
        });
        link.addEventListener('touchstart', () => setBg(colors[i]), { passive: true }); // 모바일: 썸네일 없이 배경색만
        if (!p.href && !p.noClick) link.addEventListener('click', () => openProject(i));
    });

    const p = workProjects[openIndex];
    if (p && !p.href && !p.noClick) { openProject(openIndex, false); return; }

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
function loadPage(pageName, openIndex = null) {
    clearPageEffects();
    const contentArea = document.getElementById("content-area");

    if (pageName === 'WORK') {
        renderWorkList(contentArea, openIndex);

    } else if (pageName === 'ABOUT') {
        contentArea.innerHTML = `
            <!-- 📐 화면 정중앙 좌표에 꽂히는 베이스캠프 (위치는 예전과 동일) -->
            <div class="about-center-wrapper">
                <!-- ⬛ 3:4 슬롯을 그대로 채우는 검정 테두리 사각형 (path) -->
                <svg id="about-img" viewBox="0 0 3 4" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M0 0H3V4H0Z" />
                </svg>
            </div>

            <!-- ✍️ 사진 아래 좌우 두 단. 사진과 20px 간격, 스크롤로 읽음 -->
            <div class="about-columns">
                <div class="about-col">
                    CHOI SHINU<br>
                    SEOUL, KOREA<br>
                    sinw123@gmail.com<br>
                    <div class="tab-row"><span class="tab-label">2021 - Present</span><span>Hanyang University School of Architecture</span></div>
                    <div class="tab-row"><span class="tab-label">2023 - 2024</span><span>Republic of Korea Air Force, Mandatory Military Service</span></div>
                    <div class="tab-row"><span class="tab-label">2018 - 2020</span><span>Gyeongnam Science High School</span></div>
                </div>
                <div class="about-col">
                    SKILLS<br>
                    Rhino<br>
                    D5 Render<br>
                    Illustrator<br>
                    AutoCAD<br>
                    <br>
                    HONORS &amp; AWARDS<br>
                    <div class="tab-row"><span class="tab-label">Finalist</span><span>2025 Fondation Jacques Rougerie - Académie des beaux-arts</span></div>
                    <div class="tab-row"><span class="tab-label">Bronze</span><span>17th Korea Science &amp; Engineering Fair (KSEF)</span></div>
                    <div class="tab-row"><span class="tab-label">Excellence</span><span>65th National Science Fair</span></div>
                    <br>
                    Website inspired by <a href="https://www.yooniverse.design" target="_blank" rel="noopener noreferrer">YOONIVERSE</a>
                </div>
            </div>
        `;
    }
}

// =========================================================
// 🧭 [뒤로 가기 지원] 페이지마다 주소를 남김: (없음)=홈, #work=목록, #work/3=프로젝트, #about
//   메뉴 클릭 → go()가 주소를 기록하고 그리기. 뒤로/앞으로 가기 → popstate가 주소대로 다시 그리기
// =========================================================
function route() {
    const hash = location.hash;
    const project = hash.match(/^#work\/(\d+)$/);
    if (project) loadPage('WORK', Number(project[1]));
    else if (hash === '#work') loadPage('WORK');
    else if (hash === '#about') loadPage('ABOUT');
    else loadHome();
}

function go(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash || location.pathname + location.search);
    route();
    return false; // <a href="#..."> 기본 이동은 막음 (기록은 위에서 직접 함)
}

window.addEventListener('popstate', route);

// 🚀 최초 실행 (주소에 #work 등이 있으면 그 페이지로 바로 시작)
route();