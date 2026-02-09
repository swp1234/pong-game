# Pong - Classic Arcade Game

클래식 아케이드 게임 **Pong**입니다. 1P vs AI 모드와 2P 로컬 멀티플레이어를 지원하는 네온 레트로 스타일의 현대 웹 게임입니다.

## 주요 기능

### 게임 모드
- **1P vs AI**: 난이도 3단계 (쉬움/보통/어려움) AI와 대전
- **2P 로컬**: 같은 화면에서 두 명이 터치/마우스로 플레이

### 기술 스택
- **프론트엔드**: HTML5 Canvas, Vanilla JavaScript
- **PWA**: Service Worker 오프라인 지원
- **다국어**: 12개 언어 지원 (한국어, 영어, 일본어, 중국어, 스페인어, 포르투갈어, 인도네시아어, 터키어, 독일어, 프랑스어, 힌디어, 러시아어)
- **분석**: Google Analytics 4 (GA4)
- **광고**: AdSense 배너 및 전면 광고

### 게임 기능
- 패들 물리 엔진 (공 각도, 속도 증가)
- 파티클 이펙트 (충돌 시)
- Web Audio API 사운드 효과
- 진동 피드백 (지원 기기)
- 터치 + 마우스 + 키보드 입력
- 최고 연승 기록 (localStorage)
- 게임 통계 추적

### UI/UX
- 다크 모드 기본 + 라이트 모드 지원
- 네온 오렌지 테마 (#e67e22)
- 반응형 디자인 (모바일 우선)
- 글라스모피즘 효과
- 미니 인터랙션 (호버, 탭)
- 접근성 준수 (44px 터치 타겟, 색상 대비)

## 파일 구조

```
pong-game/
├── index.html              # 메인 HTML 마크업
├── manifest.json          # PWA 설정
├── sw.js                  # Service Worker (오프라인 캐싱)
├── icon-192.svg           # 192px 아이콘
├── icon-512.svg           # 512px 아이콘
├── css/
│   └── style.css          # 전체 스타일 (1600+ 줄)
├── js/
│   ├── app.js             # 메인 게임 로직 (844 줄)
│   ├── i18n.js            # 다국어 로더
│   └── locales/
│       ├── ko.json        # 한국어
│       ├── en.json        # English
│       ├── ja.json        # 日本語
│       ├── zh.json        # 中文
│       ├── es.json        # Español
│       ├── pt.json        # Português
│       ├── id.json        # Bahasa Indonesia
│       ├── tr.json        # Türkçe
│       ├── de.json        # Deutsch
│       ├── fr.json        # Français
│       ├── hi.json        # हिन्दी
│       └── ru.json        # Русский
└── README.md
```

## 설치 & 실행

### 로컬 서버 실행
```bash
# Python 3
python -m http.server 8000

# Node.js
npx http-server

# 브라우저에서 열기
http://localhost:8000/pong-game/
```

### 직접 열기
```bash
# Windows
start index.html

# macOS
open index.html

# Linux
xdg-open index.html
```

## 게임 플레이

### 1P vs AI (기본)
- **마우스**: 마우스 Y 위치로 패들 컨트롤
- **터치**: 화면을 드래그해서 패들 움직임
- **키보드**:
  - `↑` 또는 `W`: 패들 위로
  - `↓` 또는 `S`: 패들 아래로

### 2P 로컬
- **터치**: 화면 왼쪽/오른쪽을 드래그
- **마우스**: 마우스 Y 위치로 양쪽 패들 컨트롤

### 목표
- 11점 선승으로 게임 승리
- 공이 상대방 쪽으로 넘어가면 1점 획득

## 설정

### 난이도
- **쉬움**: AI 반응 느림, 실수 자주 함
- **보통**: 균형잡힌 AI
- **어려움**: AI 반응 빠름, 거의 실수 없음

### 커스터마이징
- 음성 효과 켜기/끄기
- 진동 피드백 (지원 기기)
- 패들 크기 조절 (60~120px)

### 다국어
우측 상단 🌐 버튼에서 언어 선택. 선택한 언어는 localStorage에 저장됨.

## 통계

게임 기록 자동 저장:
- 최고 연승 횟수
- 총 게임 수
- 총 승리 수
- 승률 (%)

## 기술 상세

### Canvas 렌더링
- 60 FPS 게임 루프
- 네온 글로우 이펙트 (shadowBlur)
- 입자 시스템 (CSS 애니메이션)

### 물리 엔진
- 공 속도 점진적 증가 (1.02배 마다)
- 패들 충돌 시 공 각도 변경
- 최대 속도 제한

### 오디오 (Web Audio API)
- 패들 히트: 800Hz, 0.1초
- 벽 바운스: 600Hz, 0.05초
- 점수: 1000Hz, 0.2초
- 게임 오버: 400Hz, 0.3초

### 스토리지
```javascript
// localStorage 항목
pongStats              // 게임 통계
pongDifficulty        // 난이도 설정
pongSound             // 음성 효과 켜기/끄기
pongVibration         // 진동 피드백
pongPaddleSize        // 패들 크기
selectedLanguage      // 선택한 언어
```

## PWA 기능

### 설치 가능
- "홈 화면에 추가" (모바일)
- "앱 설치" (데스크톱)

### 오프라인 지원
- Service Worker 캐싱
- 리소스 100% 로컬 캐시

### 스크린샷
PWA 앱 선택기에 표시됨

## 광고 배치

1. **메인 메뉴**: 상단 + 하단 배너
2. **게임 중**: 하단 배너
3. **게임 오버**: 전면 광고 (인터스티셜)

AdSense 배너 ID: `ca-pub-3600813755953882`

## Google Analytics 4

추적 ID: `G-J8GSWM40TV`

추적 이벤트:
- `page_view`: 페이지 로드
- `game_start`: 게임 시작 (mode 포함)
- `game_end`: 게임 종료 (점수, 난이도, 시간 포함)

## 스키마 마크업

- VideoGame schema.org
- Open Graph 메타태그
- Twitter Card 지원

## 브라우저 지원

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Android Chrome 90+

## 성능

- 초기 로드: < 1초 (캐시됨)
- 프레임율: 60 FPS
- 메모리: ~ 50MB (로드 후)
- 번들 크기: ~ 35KB (압축됨)

## 라이선스

MIT License

## 기여 & 피드백

버그 또는 제안사항은 이슈를 통해 보고해주세요.

---

**Made with** ❤️ **for DopaBrain Games**
