# 오늘도 우쭈쭈

현장별 공수 기록 + 자동 계산 달력 앱.

---

## 🚀 실행 방법 (3단계)

### 1단계: Node.js 설치 확인

명령 프롬프트(cmd)에서:

```
node --version
```

버전이 안 뜨면 → https://nodejs.org 에서 **LTS 버전** 설치 후 PC 재시작.

---

### 2단계: 압축 풀고 폴더 열기

이 `uzzuzzu` 폴더를 원하는 위치에 두고, 그 폴더에서 **cmd 열기**.

> 💡 탐색기에서 폴더 열고 주소창에 `cmd` 치고 엔터 → 그 폴더에서 바로 cmd 열림

---

### 3단계: 두 명령만 실행

**처음 한 번만:**
```
npm install
```
(2~3분 걸림. 의존성 설치)

**그 다음부터 실행할 때:**
```
npm run dev
```

→ 브라우저에서 **http://localhost:5173** 열기. 끝!

---

## 📱 핸드폰에서도 같이 보기

`npm run dev` 실행하면 터미널에 이런 주소가 뜹니다:

```
Local:   http://localhost:5173/
Network: http://192.168.0.xx:5173/
```

**같은 Wi-Fi에 연결된 폰**에서 `Network` 주소로 접속하면 폰에서도 동일하게 쓸 수 있어요. PC cmd 창 켜둔 동안만 작동.

---

## 💾 데이터 저장 위치

브라우저의 `localStorage`에 저장됩니다.
- **같은 브라우저·같은 PC**에서는 그대로 유지
- 브라우저 데이터 삭제 시 같이 사라짐
- 다른 기기 간 동기화는 안 됨 (추후 기능)

---

## 🛑 서버 종료

cmd 창에서 `Ctrl + C` → `Y` 엔터

---

## 🌐 온라인 배포 (나중에)

```
npm run build
```

하면 `dist` 폴더가 생성됩니다. 이 폴더를 Vercel/Netlify에 올리면 끝. 지금은 여기까지 안 해도 OK.

---

## 📦 폴더 구조

```
uzzuzzu/
├── src/
│   ├── App.jsx       ← 메인 컴포넌트 (여기서 기능 수정)
│   ├── main.jsx
│   └── index.css
├── public/
│   └── favicon.svg
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

수정하고 저장하면 브라우저에 자동 반영됩니다 (HMR).
