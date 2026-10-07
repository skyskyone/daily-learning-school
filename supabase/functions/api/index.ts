import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const ADMIN_USERNAME = Deno.env.get("ADMIN_USERNAME") || "admin";
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "";
const SESSION_HOURS = 24;
const ADMIN_SESSION_HOURS = 8;
const PBKDF2_ITERATIONS = 120_000;

if (!SERVICE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff"
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" }
  });
}

function text(v: unknown, max = 2000) {
  return String(v ?? "").trim().slice(0, max);
}

function bad(message: string, status = 400) { return json({ error: message }, status); }

function constantEqual(a: string, b: string) {
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function base64Url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64Url(value: string) {
  const s = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const raw = atob(s);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", data)));
}

async function hashPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  return `pbkdf2$${PBKDF2_ITERATIONS}$${base64Url(salt)}$${base64Url(new Uint8Array(bits))}`;
}

async function verifyPin(pin: string, encoded: string) {
  const [kind, iterText, saltText, hashText] = encoded.split("$");
  if (kind !== "pbkdf2") return false;
  const iterations = Number(iterText);
  if (!Number.isInteger(iterations) || iterations < 50_000) return false;
  const salt = fromBase64Url(saltText);
  const expected = fromBase64Url(hashText);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    expected.length * 8
  ));
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

function tokenFromRequest(req: Request) {
  const header = req.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function createSession(role: "student" | "admin", studentId?: string) {
  await db.from("sessions").delete().lt("expires_at", new Date().toISOString());
  const token = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const token_hash = await sha256(token);
  const hours = role === "admin" ? ADMIN_SESSION_HOURS : SESSION_HOURS;
  const expires = new Date(Date.now() + hours * 3600_000).toISOString();
  const { error } = await db.from("sessions").insert({ token_hash, role, student_id: studentId || null, expires_at: expires });
  if (error) throw error;
  return token;
}

async function session(req: Request, expected: "student" | "admin") {
  const token = tokenFromRequest(req);
  if (!token) throw new Error("UNAUTHORIZED");
  const token_hash = await sha256(token);
  const { data, error } = await db.from("sessions").select("id, role, student_id, expires_at").eq("token_hash", token_hash).maybeSingle();
  if (error || !data || data.role !== expected || new Date(data.expires_at).getTime() <= Date.now()) throw new Error("UNAUTHORIZED");
  return data as { id: string; role: string; student_id: string | null; expires_at: string };
}

async function settings() {
  const { data, error } = await db.from("settings").select("key,value");
  if (error) throw error;
  const out: Record<string,string> = {};
  for (const row of data || []) out[row.key] = row.value;
  return { timezone: out.timezone || "Asia/Taipei", publish_time: out.publish_time || "08:00", close_time: out.close_time || "20:00" };
}

function localNow(timezone: string) {
  const dt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  });
  const parts = Object.fromEntries(dt.formatToParts(new Date()).filter(x => x.type !== "literal").map(x => [x.type, x.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

function minutesOf(hhmm: string) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
}

function validTimezone(tz: string) {
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(); return true; } catch { return false; }
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0,10);
}

function mondayOf(date: string) {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0,10);
}

function currentWeek(date: string) {
  const start = mondayOf(date); return { start, end: addDays(start, 6) };
}

function isClosedToday(local: {date:string;minutes:number}, closeMinutes: number) { return local.minutes >= closeMinutes; }
function isOpenToday(local: {date:string;minutes:number}, openMinutes: number, closeMinutes: number) { return local.minutes >= openMinutes && local.minutes < closeMinutes; }

async function completedWeek(timezone: string, closeMinutes: number) {
  const now = localNow(timezone);
  const week = currentWeek(now.date);
  const sunday = week.end;
  const currentDone = now.date > sunday || (now.date === sunday && now.minutes >= closeMinutes);
  if (currentDone) return week;
  const prevStart = addDays(week.start, -7);
  return { start: prevStart, end: addDays(prevStart, 6) };
}

async function leaderboardForWeek(start: string, end: string) {
  const { data: questions, error: qe } = await db.from("questions").select("id,question_date,correct_option").gte("question_date",start).lte("question_date",end);
  if (qe) throw qe;
  const ids = (questions || []).map(q => q.id);
  const { data: students, error: se } = await db.from("students").select("id,display_name").eq("active",true).order("display_name");
  if (se) throw se;
  const { data: subs, error: ae } = ids.length ? await db.from("submissions").select("student_id,question_id,choice").in("question_id",ids) : {data:[],error:null};
  if (ae) throw ae;
  const qMap = new Map((questions || []).map(q => [q.id, q.correct_option]));
  return (students || []).map((s:any) => {
    const mine = (subs || []).filter((x:any)=>x.student_id===s.id);
    const correct = mine.reduce((n:number,x:any)=>n+(qMap.get(x.question_id)===x.choice?1:0),0);
    return { display_name:s.display_name, correct_count:correct, answered_count:mine.length, total_questions:(questions||[]).length, accuracy: mine.length ? Number((correct/mine.length*100).toFixed(1)) : 0 };
  }).sort((a:any,b:any)=>b.correct_count-a.correct_count || b.answered_count-a.answered_count || a.display_name.localeCompare(b.display_name));
}

function rankRows(rows:any[]) { let last:any = null, rank = 0; return rows.map((r,i)=>{if(r.correct_count!==last){rank=i+1;last=r.correct_count;}return {...r,rank};}); }

async function route(req: Request) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const url = new URL(req.url);
  // Supabase Dashboard/edge gateway can expose the function pathname in
  // slightly different forms. Normalize all expected variants to /<route>.
  let path = url.pathname;
  path = path
    .replace(/^\/functions\/v1\/api/, "")
    .replace(/^\/api/, "");
  if (!path) path = "/";
  const body = ["POST","PUT"].includes(req.method) ? await req.json().catch(()=>({})) : {};

  if (path === "/public/students" && req.method === "GET") {
    const { data, error } = await db.from("students").select("display_name").eq("active",true).order("display_name");
    if (error) throw error;
    return json({ students: data || [] });
  }

  if (path === "/student/login" && req.method === "POST") {
    const name = text(body.display_name,120), pin = text(body.pin,4);
    if (!name || !/^\d{4}$/.test(pin)) return bad("請選擇姓名並輸入四位 PIN。",422);
    const { data: student, error } = await db.from("students").select("id,display_name,pin_hash,active").eq("display_name",name).maybeSingle();
    if (error) throw error;
    if (!student || !student.active) return bad("無法登入，請確認姓名。",401);
    const windowStart = new Date(Date.now()-15*60_000).toISOString();
    const { count } = await db.from("student_login_attempts").select("id",{count:"exact",head:true}).eq("student_id",student.id).gte("attempted_at",windowStart);
    if ((count || 0) >= 5) return bad("PIN 錯誤次數過多，請 15 分鐘後再試。",429);
    const ok = await verifyPin(pin,student.pin_hash);
    if (!ok) { await db.from("student_login_attempts").insert({student_id:student.id}); return bad("PIN 不正確。",401); }
    await db.from("student_login_attempts").delete().eq("student_id",student.id);
    return json({token:await createSession("student",student.id),display_name:student.display_name});
  }

  if (path === "/student/me" && req.method === "GET") {
    const s = await session(req,"student");
    const { data, error } = await db.from("students").select("display_name,active").eq("id",s.student_id).single();
    if(error || !data?.active) throw new Error("UNAUTHORIZED");
    return json({display_name:data.display_name});
  }

  if (path === "/student/today" && req.method === "GET") {
    const s = await session(req,"student");
    const cfg = await settings(); const local = localNow(cfg.timezone); const open=minutesOf(cfg.publish_time), close=minutesOf(cfg.close_time);
    const { data:q, error:qe } = await db.from("questions").select("id,question_date,question_text,option1,option2,correct_option").eq("question_date",local.date).maybeSingle();
    if(qe)throw qe;
    if(!q) return json({state:"no_question", publish_time:cfg.publish_time, close_time:cfg.close_time});
    const { data:sub, error:se } = await db.from("submissions").select("choice,submitted_at").eq("student_id",s.student_id).eq("question_id",q.id).maybeSingle();
    if(se)throw se;
    if(local.minutes < open) return json({state:"not_open",publish_time:cfg.publish_time,close_time:cfg.close_time});
    const payload:any={state:local.minutes>=close?"settled":"open",question_date:q.question_date,question_text:q.question_text,option1:q.option1,option2:q.option2,answered:!!sub,choice:sub?.choice||null,publish_time:cfg.publish_time,close_time:cfg.close_time};
    if(local.minutes>=close){payload.correct_option=q.correct_option;payload.is_correct=!!sub && sub.choice===q.correct_option;}
    return json(payload);
  }

  if (path === "/student/submit" && req.method === "POST") {
    const s = await session(req,"student"); const choice=Number(body.choice);
    if(![1,2].includes(choice)) return bad("答案只能選一或二。",422);
    const cfg=await settings(); const local=localNow(cfg.timezone); const open=minutesOf(cfg.publish_time), close=minutesOf(cfg.close_time);
    if(!isOpenToday(local,open,close)) return bad("現在不是作答時間。",403);
    const {data:q,error:qe}=await db.from("questions").select("id").eq("question_date",local.date).maybeSingle(); if(qe)throw qe; if(!q)return bad("今日尚未安排題目。",404);
    const {data:existing}=await db.from("submissions").select("id").eq("student_id",s.student_id).eq("question_id",q.id).maybeSingle(); if(existing)return bad("今天已經作答，不能修改。",409);
    const {error}=await db.from("submissions").insert({student_id:s.student_id,question_id:q.id,choice}); if(error){if(error.code==='23505')return bad("今天已經作答，不能修改。",409);throw error;}
    return json({ok:true});
  }

  if (path === "/student/history" && req.method === "GET") {
    const s=await session(req,"student"); const cfg=await settings(); const local=localNow(cfg.timezone), close=minutesOf(cfg.close_time);
    const {data:qs,error:qe}=await db.from("questions").select("id,question_date,question_text,correct_option").order("question_date",{ascending:false}).limit(180); if(qe)throw qe;
    const settledIds=(qs||[]).filter((q:any)=>q.question_date<local.date || (q.question_date===local.date && local.minutes>=close)).map((q:any)=>q.id);
    if(!settledIds.length)return json({items:[]});
    const {data:subs,error:se}=await db.from("submissions").select("question_id,choice,submitted_at").eq("student_id",s.student_id).in("question_id",settledIds); if(se)throw se;
    const subMap=new Map((subs||[]).map((x:any)=>[x.question_id,x]));
    return json({items:(qs||[]).filter((q:any)=>settledIds.includes(q.id)).map((q:any)=>{const x=subMap.get(q.id);return {question_date:q.question_date,question_text:q.question_text,choice:x?.choice||null,correct_option:q.correct_option,is_correct:!!x&&x.choice===q.correct_option};})});
  }

  if (path === "/student/leaderboard" && req.method === "GET") {
    const cfg=await settings(); const close=minutesOf(cfg.close_time); const local=localNow(cfg.timezone); const week=currentWeek(local.date); const currentDone=local.date>week.end||(local.date===week.end&&local.minutes>=close); const target=currentDone?week:{start:addDays(week.start,-7),end:addDays(week.end,-7)};
    const {data:checkQs,error:qe}=await db.from("questions").select("id,question_date").gte("question_date",target.start).lte("question_date",target.end); if(qe)throw qe;
    return json({settled:true,week_start:target.start,week_end:target.end,rows:rankRows(await leaderboardForWeek(target.start,target.end)),has_questions:(checkQs||[]).length>0});
  }

  if (path === "/admin/login" && req.method === "POST") {
    const username=text(body.username,100), password=String(body.password||"");
    if(!constantEqual(username,ADMIN_USERNAME)||!constantEqual(password,ADMIN_PASSWORD))return bad("管理員帳號或密碼不正確。",401);
    return json({token:await createSession("admin"),role:"admin"});
  }

  if (path === "/admin/me" && req.method === "GET") { await session(req,"admin"); return json({ok:true}); }

  if (path === "/admin/settings" && req.method === "GET") { await session(req,"admin"); return json(await settings()); }

  if (path === "/admin/settings" && req.method === "PUT") {
    await session(req,"admin"); const timezone=text(body.timezone,100), publish=text(body.publish_time,5), close=text(body.close_time,5);
    if(!validTimezone(timezone)||Number.isNaN(minutesOf(publish))||Number.isNaN(minutesOf(close))||minutesOf(publish)>=minutesOf(close))return bad("時間或時區格式不正確；結算時間必須晚於開題時間。",422);
    for(const [key,value] of [["timezone",timezone],["publish_time",publish],["close_time",close]]){const {error}=await db.from("settings").upsert({key,value},{onConflict:"key"});if(error)throw error;}
    return json(await settings());
  }

  if (path === "/admin/students" && req.method === "GET") {
    await session(req,"admin"); const {data,error}=await db.from("students").select("id,display_name,active,created_at").order("display_name"); if(error)throw error;
    return json({students:(data||[]).map((s:any)=>({...s,created_at_display:new Date(s.created_at).toLocaleString('zh-Hant')}))});
  }

  if (path === "/admin/students" && req.method === "POST") {
    await session(req,"admin"); const name=text(body.display_name,120), pin=text(body.pin,4); if(!name||!/^\d{4}$/.test(pin))return bad("學生姓名及四位 PIN 不完整。",422);
    const {error}=await db.from("students").insert({display_name:name,pin_hash:await hashPin(pin),active:true}); if(error){if(error.code==='23505')return bad("這個學生姓名已存在。",409);throw error;} return json({ok:true});
  }

  const studentMatch=path.match(/^\/admin\/students\/([0-9a-f-]+)$/i);
  if(studentMatch && req.method==='PUT'){
    await session(req,"admin"); const id=studentMatch[1]; const patch:any={};
    if(typeof body.active==='boolean')patch.active=body.active;
    if(body.pin!==undefined){const pin=text(body.pin,4);if(!/^\d{4}$/.test(pin))return bad("PIN 必須是 4 位數字。",422);patch.pin_hash=await hashPin(pin);}
    if(!Object.keys(patch).length)return bad("沒有可更新內容。",422);
    const {error}=await db.from("students").update(patch).eq("id",id);if(error)throw error; return json({ok:true});
  }

  if (path === "/admin/questions" && req.method === "GET") {
    await session(req,"admin"); const {data,error}=await db.from("questions").select("id,question_date,question_text,option1,option2,correct_option,updated_at").order("question_date",{ascending:false}).limit(120); if(error)throw error; return json({questions:data||[]});
  }

  if (path === "/admin/questions" && req.method === "POST") {
    await session(req,"admin"); const date=text(body.question_date,10), q=text(body.question_text,2000), o1=text(body.option1,1000), o2=text(body.option2,1000), correct=Number(body.correct_option);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!q||!o1||!o2||![1,2].includes(correct))return bad("題目資料不完整。",422);
    const {error}=await db.from("questions").upsert({question_date:date,question_text:q,option1:o1,option2:o2,correct_option:correct},{onConflict:"question_date"}); if(error)throw error; return json({ok:true});
  }

  if (path === "/admin/results" && req.method === "GET") {
    await session(req,"admin"); const date=text(url.searchParams.get("date"),10); if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return bad("日期格式不正確。",422);
    const cfg=await settings(), local=localNow(cfg.timezone), close=minutesOf(cfg.close_time);
    const {data:q,error:qe}=await db.from("questions").select("id,question_date,correct_option").eq("question_date",date).maybeSingle(); if(qe)throw qe; if(!q)return bad("這一天沒有題目。",404);
    const isSettled=date<local.date||(date===local.date&&local.minutes>=close);
    const {data:students,error:se}=await db.from("students").select("id,display_name,active").order("display_name"); if(se)throw se;
    const {data:subs,error:ae}=await db.from("submissions").select("student_id,choice").eq("question_id",q.id);if(ae)throw ae; const sm=new Map((subs||[]).map((x:any)=>[x.student_id,x.choice]));
    return json({question_date:date,correct_option:q.correct_option,status_label:isSettled?'已結算':(date===local.date&&local.minutes<minutesOf(cfg.publish_time)?'尚未開題':'作答中'),rows:(students||[]).map((s:any)=>{const choice=sm.get(s.id)||null;return {display_name:s.display_name,active:s.active,choice,is_correct:choice===q.correct_option};})});
  }

  if (path === "/admin/leaderboard" && req.method === "GET") {
    await session(req,"admin"); const cfg=await settings(), target=await completedWeek(cfg.timezone,minutesOf(cfg.close_time)); return json({week_start:target.start,week_end:target.end,rows:rankRows(await leaderboardForWeek(target.start,target.end))});
  }

  if (path === "/logout" && req.method === "POST") {
    const token=tokenFromRequest(req); if(token){await db.from("sessions").delete().eq("token_hash",await sha256(token));} return json({ok:true});
  }

  return bad("找不到 API 路徑。",404);
}

Deno.serve(async (req) => {
  try { return await route(req); }
  catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return json({error:"登入已失效，請重新登入。"},401);
    console.error(err);
    return json({error:"伺服器暫時無法處理要求。"},500);
  }
});
