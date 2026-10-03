# 每日學堂｜GitHub Pages + Supabase 正式版

這一版不再使用 Flask/Jinja 作為學生網站前端。GitHub Pages 負責公開的 HTML/CSS/JavaScript；Supabase Edge Function 負責登入、PIN 驗證、題目、作答、結算與排行榜；PostgreSQL 負責保存資料。

## 你會得到

學生網址：
`https://你的GitHub帳號.github.io/你的Repository名稱/`

管理員網址：
`https://你的GitHub帳號.github.io/你的Repository名稱/admin/`

學生只需要選姓名，再輸入老師給的四位 PIN。學生不需要輸入 username，也不需要註冊。

## 功能規則

- 每天最多一題，題目只有「一」與「二」。
- 一次提交後不能修改。
- 開題前不顯示題目。
- 結算前不顯示正確答案。
- 每日結算後學生才看得到自己的對錯與正確答案。
- 管理員可查看每日每位學生的作答結果。
- 週榜只取「已完成結算」的週期。
- PIN 以 PBKDF2 雜湊保存，前端不保存明文 PIN。
- 登入錯誤 15 分鐘內達 5 次會暫時鎖定。

## 第一次設定順序

### 1. 建立 Supabase project

到 Supabase 建立一個新 Project。

建立完成後，記住 Project URL，例如：
`https://abcxyz.supabase.co`

Project Ref 就是網址中的 `abcxyz`。

### 2. 建立資料庫

在 Supabase Dashboard → SQL Editor 中執行：
`supabase/migrations/20261003000000_initial.sql`

執行後會建立：

- settings
- students
- questions
- submissions
- student_login_attempts
- sessions

資料表全部開啟 RLS，前端不能直接讀資料，管理權限只在 Edge Function。

### 3. 建立 Edge Function

Supabase Dashboard 支援直接建立 Edge Function；也可以使用 Supabase CLI。

函式名稱必須：
`api`

函式程式碼：
`supabase/functions/api/index.ts`

Function config：
`supabase/config.toml`

其中 `verify_jwt = false` 是因為本專案使用自己的短期 session token，不把學生 PIN 暴露給 Supabase Auth。

### 4. 設定 Edge Function secrets

在 Supabase Dashboard → Edge Functions → Secrets 設定：

`ADMIN_USERNAME`
`ADMIN_PASSWORD`

不要把 ADMIN_PASSWORD 放進 GitHub。

Supabase Hosted Edge Functions 會提供 `SUPABASE_URL` 及後端可用的 service role key。這些秘密只在 Edge Function 端使用。

### 5. 部署 Edge Function

使用 Supabase CLI：

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy api --project-ref YOUR_PROJECT_REF
```

部署後 API 網址：

`https://YOUR_PROJECT_REF.supabase.co/functions/v1/api`

### 6. 設定 GitHub Pages 前端

打開根目錄的 `config.js`：

```js
window.APP_CONFIG = {
  API_BASE: "https://YOUR_PROJECT_REF.supabase.co/functions/v1/api",
  SITE_NAME: "每日學堂"
};
```

只改 `API_BASE`，不要放任何 secret/service role key。

### 7. 開啟 GitHub Pages

Repository → Settings → Pages。

Build and deployment → Source 選：
`GitHub Actions`

本專案已經包含：
`.github/workflows/pages.yml`

之後每次推送到 `main`，GitHub Actions 都會重新發佈網站。

## GitHub Pages 私有 Repository 注意事項

GitHub 官方目前說明：GitHub Free 可讓公開 Repository 使用 GitHub Pages；Private Repository 的 Pages 需要相應的付費方案，例如 Pro/Team/Enterprise。若你的 Repository 是 Private + GitHub Free，Pages 可能不能啟用。

如果你不希望程式碼公開，請保留 Private 並使用支援 Private Pages 的 GitHub 方案；如果只是一般小型班級網站，公開的是「程式碼」，學生名單、PIN、題目資料仍存放在 Supabase，不會放進 GitHub Repository。

## 管理員首次使用

1. 打開 `/admin/`
2. 輸入 Supabase secret 中的 `ADMIN_USERNAME` / `ADMIN_PASSWORD`
3. 在「學生」建立學生姓名及四位 PIN
4. 在「時間設定」設定時區、開題時間、結算時間
5. 在「每日題目」建立當天或未來題目
6. 學生用網站首頁登入

## 發題與結算邏輯

網站不需要另外建立每日 cron 才能判斷「可否作答」。每次學生開啟題目或提交答案時，Edge Function 都會依管理員設定的時區、開題時間、結算時間，判斷現在屬於：

- 尚未開題
- 作答中
- 已結算

所以一天一題的切換是由伺服器時間規則決定，而不是依靠學生手機的時間。

## 重要安全事項

- `config.js` 只放 API URL。
- 絕對不要把 `SUPABASE_SERVICE_ROLE_KEY`、Supabase secret key 或 `ADMIN_PASSWORD` 放到 GitHub 前端檔案。
- 這個網站設計給小型班級使用；四位 PIN 先天只能提供有限的猜測空間，因此系統加入錯誤次數限制。正式使用時，建議學生名冊不要公開放在任何其他文件。

## 本機檔案說明

`index.html` 學生登入與每日題目
`student-history.html` 學生歷史作答
`leaderboard.html` 已結算週榜
`admin/index.html` 管理員後台
`assets/` 前端樣式與 JavaScript
`supabase/functions/api/index.ts` 後端 API
`supabase/migrations/` 資料庫結構
`.github/workflows/pages.yml` GitHub Pages 自動部署
