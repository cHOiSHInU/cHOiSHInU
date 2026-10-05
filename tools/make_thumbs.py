"""WORK 페이지 썸네일 변환 도구.

원본 사진(수 MB)을 가로 800px WebP(수십 KB)로 줄여서 thumbs/ 폴더에 저장한다.
썸네일은 화면에 250px로 보이므로 800px이면 레티나에서도 충분하다.
(큰 원본을 그대로 쓰면 로딩이 느리고 호버가 버벅인다.)

사용법 (프로젝트 폴더에서):
    python tools/make_thumbs.py 사진1.jpg 사진2.JPEG ...

결과: thumbs/사진1.webp ... -> script.js 의 workProjects 에서 image: "thumbs/사진1.webp" 로 연결
필요: pip install pillow
"""
import os
import sys
from PIL import Image, ImageOps

WIDTH = 800
QUALITY = 80
OUT_DIR = "thumbs"


def main(paths):
    if not paths:
        sys.exit(__doc__)
    os.makedirs(OUT_DIR, exist_ok=True)
    Image.MAX_IMAGE_PIXELS = None  # 초대형 원본도 허용
    for p in paths:
        img = ImageOps.exif_transpose(Image.open(p))  # 폰 사진의 회전 정보(EXIF) 반영
        if img.width > WIDTH:
            img = img.resize((WIDTH, round(img.height * WIDTH / img.width)), Image.LANCZOS)
        out = os.path.join(OUT_DIR, os.path.splitext(os.path.basename(p))[0] + ".webp")
        img.convert("RGB").save(out, "WEBP", quality=QUALITY, method=6)
        print(f"{p} ({os.path.getsize(p) // 1024}KB) -> {out} ({os.path.getsize(out) // 1024}KB, {img.width}x{img.height})")


if __name__ == "__main__":
    main(sys.argv[1:])
