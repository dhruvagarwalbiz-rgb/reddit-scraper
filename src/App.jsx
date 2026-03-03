// import { useState, useEffect, useRef, useCallback } from "react";

// const SORT_STANDARD = ["hot", "new", "top_year", "top_all", "controversial"];
// const SORT_SEARCH = ["relevance", "new", "top", "comments"];
// const TIME_FILTERS = [
//   { value: "hour", label: "Past Hour" },
//   { value: "day", label: "Past 24 Hours" },
//   { value: "week", label: "Past Week" },
//   { value: "month", label: "Past Month" },
//   { value: "year", label: "Past Year" },
//   { value: "all", label: "All Time" },
// ];

// const SORT_LABELS = {
//   hot: "Hot",
//   new: "New",
//   top_year: "Top (Year)",
//   top_all: "Top (All Time)",
//   controversial: "Controversial",
//   relevance: "Relevance",
//   top: "Top",
//   comments: "Most Comments",
// };

// // ── Utility helpers ──────────────────────────────────────────────
// function cleanText(text) {
//   if (!text) return "";
//   let t = text;
//   t = t.replace(/https?:\/\/[^\s)]+/g, "");
//   t = t.replace(/\[deleted\]/gi, "").replace(/\[removed\]/gi, "");
//   t = t.replace(/[*_`~^#>|]/g, "");
//   t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#x200B;/g, "");
//   t = t.replace(/\n{3,}/g, "\n\n");
//   t = t.replace(/[ \t]+/g, " ");
//   return t.trim();
// }

// function formatDate(utc) {
//   const d = new Date(utc * 1000);
//   return d.toISOString().split("T")[0];
// }

// function flattenComments(comments, depth = 0) {
//   const result = [];
//   if (!comments) return result;
//   for (const c of comments) {
//     if (!c?.data?.body) continue;
//     const body = cleanText(c.data.body);
//     if (!body || body === "[deleted]" || body === "[removed]") continue;
//     const isBotLike = /^(auto)?moderator|bot$/i.test(c.data.author || "");
//     if (isBotLike) continue;
//     result.push({ body, depth });
//     if (c.data.replies?.data?.children) {
//       result.push(...flattenComments(c.data.replies.data.children, depth + 1));
//     }
//   }
//   return result;
// }

// function buildOutputText(posts, subreddit, mode, searchQuery, sorting) {
//   const header = [
//     `REDDIT TEXT EXTRACTION`,
//     `Generated: ${new Date().toISOString().split("T")[0]}`,
//     `Subreddit: r/${subreddit}`,
//     `Mode: ${mode === "standard" ? "STANDARD" : "SEARCH"}`,
//     mode === "search" ? `Search Query: ${searchQuery}` : null,
//     `Sorting: ${sorting}`,
//     `Total Posts: ${posts.length}`,
//     `${"=".repeat(40)}`,
//     "",
//   ].filter(Boolean).join("\n");

//   const body = posts.map((p, i) => {
//     const comments = (p.comments || []).map((c) => `${"  ".repeat(c.depth)}- ${c.body}`).join("\n");
//     return [
//       "=".repeat(40),
//       `SUBREDDIT: ${subreddit}`,
//       `MODE: ${mode === "standard" ? "STANDARD" : "SEARCH"}`,
//       mode === "search" ? `SEARCH QUERY: ${searchQuery}` : null,
//       `POST #: ${i + 1}`,
//       `POST ID: ${p.id}`,
//       `DATE: ${p.date}`,
//       `SCORE: ${p.score}`,
//       "",
//       "TITLE:",
//       p.title,
//       "",
//       "BODY:",
//       p.body || "(no body text)",
//       "",
//       "COMMENTS:",
//       comments || "(no comments)",
//       "=".repeat(40),
//       "",
//     ].filter((l) => l !== null).join("\n");
//   }).join("\n");

//   return header + "\n" + body;
// }

// function fileName(subreddit, mode, sorting, searchQuery) {
//   const date = new Date().toISOString().split("T")[0];
//   if (mode === "search") {
//     const kw = (searchQuery || "query").replace(/\s+/g, "_").toLowerCase().slice(0, 40);
//     return `${subreddit}_search_${kw}_${date}.txt`;
//   }
//   return `${subreddit}_${sorting}_${date}.txt`;
// }

// // ── Reddit API helpers (uses public JSON endpoints) ──────────────
// async function fetchReddit(url, signal) {
//   const res = await fetch("/api/reddit?url=" + encodeURIComponent(url), { signal });
//   if (res.status === 429) throw new Error("Rate limited by Reddit. Please wait and try again.");
//   if (!res.ok) throw new Error(`Reddit returned ${res.status}`);
//   return res.json();
// }

// async function fetchPostComments(subreddit, postId, signal) {
//   try {
//     const data = await fetchReddit(`https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=200&depth=10&raw_json=1&include_over_18=on`, signal);
//     if (data && data[1]?.data?.children) {
//       return flattenComments(data[1].data.children);
//     }
//   } catch {
//     /* swallow per-post failures */
//   }
//   return [];
// }

// async function scrapeStandard({ subreddit, sorting, limit, onProgress, signal }) {
//   const posts = [];
//   let after = null;
//   const unlimited = limit === 0;
//   const sortMap = { hot: "hot", new: "new", top_year: "top", top_all: "top", controversial: "controversial" };
//   const sortPath = sortMap[sorting] || "hot";
//   const tParam = sorting === "top_year" ? "&t=year" : sorting === "top_all" ? "&t=all" : sorting === "controversial" ? "&t=all" : "";

//   while (unlimited || posts.length < limit) {
//     const batch = unlimited ? 100 : Math.min(100, limit - posts.length);
//     const url = `https://www.reddit.com/r/${subreddit}/${sortPath}.json?limit=${batch}&raw_json=1&include_over_18=on${tParam}${after ? `&after=${after}` : ""}`;
//     const data = await fetchReddit(url, signal);
//     const children = data?.data?.children || [];
//     if (children.length === 0) break;

//     for (const child of children) {
//       if (!unlimited && posts.length >= limit) break;
//       const d = child.data;
//       if (!d || d.is_video || d.is_gallery) continue;
//       const comments = await fetchPostComments(subreddit, d.id, signal);
//       posts.push({
//         id: d.id,
//         title: cleanText(d.title),
//         body: cleanText(d.selftext),
//         score: d.score,
//         date: formatDate(d.created_utc),
//         comments,
//       });
//       onProgress(posts.length);
//       // Small delay to be polite to Reddit
//       await new Promise((r) => setTimeout(r, 350));
//     }
//     after = data?.data?.after;
//     if (!after) break;
//   }
//   return posts;
// }

// async function scrapeSearch({ subreddit, query, sorting, timeFilter, limit, onProgress, signal }) {
//   const posts = [];
//   let after = null;
//   const unlimited = limit === 0;

//   while (unlimited || posts.length < limit) {
//     const batch = unlimited ? 100 : Math.min(100, limit - posts.length);
//     const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=${sorting}&t=${timeFilter}&limit=${batch}&raw_json=1&include_over_18=on${after ? `&after=${after}` : ""}`;
//     const data = await fetchReddit(url, signal);
//     const children = data?.data?.children || [];
//     if (children.length === 0) break;

//     for (const child of children) {
//       if (!unlimited && posts.length >= limit) break;
//       const d = child.data;
//       if (!d) continue;
//       const comments = await fetchPostComments(subreddit, d.id, signal);
//       posts.push({
//         id: d.id,
//         title: cleanText(d.title),
//         body: cleanText(d.selftext),
//         score: d.score,
//         date: formatDate(d.created_utc),
//         comments,
//       });
//       onProgress(posts.length);
//       await new Promise((r) => setTimeout(r, 350));
//     }
//     after = data?.data?.after;
//     if (!after) break;
//   }
//   return posts;
// }

// // ── Components ───────────────────────────────────────────────────
// function Pill({ active, children, onClick }) {
//   return (
//     <button
//       onClick={onClick}
//       style={{
//         padding: "6px 16px",
//         borderRadius: 6,
//         border: "1px solid",
//         borderColor: active ? "#FF4500" : "#3a3a3a",
//         background: active ? "#FF4500" : "transparent",
//         color: active ? "#fff" : "#aaa",
//         fontFamily: "'JetBrains Mono', monospace",
//         fontSize: 12,
//         cursor: "pointer",
//         transition: "all .2s",
//       }}
//     >
//       {children}
//     </button>
//   );
// }

// function Field({ label, children }) {
//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
//       <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
//       {children}
//     </div>
//   );
// }

// function Input(props) {
//   return (
//     <input
//       {...props}
//       style={{
//         background: "#1a1a1a",
//         border: "1px solid #2a2a2a",
//         borderRadius: 6,
//         padding: "10px 14px",
//         color: "#e0e0e0",
//         fontFamily: "'JetBrains Mono', monospace",
//         fontSize: 14,
//         outline: "none",
//         transition: "border-color .2s",
//         width: "100%",
//         boxSizing: "border-box",
//         ...props.style,
//       }}
//       onFocus={(e) => (e.target.style.borderColor = "#FF4500")}
//       onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
//     />
//   );
// }

// function Select({ value, onChange, options }) {
//   return (
//     <select
//       value={value}
//       onChange={(e) => onChange(e.target.value)}
//       style={{
//         background: "#1a1a1a",
//         border: "1px solid #2a2a2a",
//         borderRadius: 6,
//         padding: "10px 14px",
//         color: "#e0e0e0",
//         fontFamily: "'JetBrains Mono', monospace",
//         fontSize: 14,
//         outline: "none",
//         cursor: "pointer",
//         width: "100%",
//         boxSizing: "border-box",
//       }}
//     >
//       {options.map((o) => (
//         <option key={o.value} value={o.value}>{o.label}</option>
//       ))}
//     </select>
//   );
// }

// function LogLine({ text, type }) {
//   const color = type === "error" ? "#ff4444" : type === "success" ? "#44ff88" : type === "info" ? "#FF4500" : "#666";
//   return (
//     <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color, lineHeight: 1.7 }}>
//       <span style={{ color: "#444", marginRight: 8 }}>{new Date().toLocaleTimeString()}</span>
//       {text}
//     </div>
//   );
// }

// // ── Main App ─────────────────────────────────────────────────────
// export default function RedditScraper() {
//   const [mode, setMode] = useState("standard");
//   const [subreddit, setSubreddit] = useState("");
//   const [searchQuery, setSearchQuery] = useState("");
//   const [sorting, setSorting] = useState("hot");
//   const [timeFilter, setTimeFilter] = useState("all");
//   const [postLimit, setPostLimit] = useState(0);
//   const [isUnlimited, setIsUnlimited] = useState(true);
//   const [running, setRunning] = useState(false);
//   const [progress, setProgress] = useState(0);
//   const [logs, setLogs] = useState([]);
//   const [result, setResult] = useState(null);
//   const abortRef = useRef(null);
//   const logEndRef = useRef(null);

//   useEffect(() => {
//     if (mode === "standard") setSorting("hot");
//     else setSorting("relevance");
//   }, [mode]);

//   useEffect(() => {
//     logEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [logs]);

//   const addLog = useCallback((text, type = "log") => {
//     setLogs((prev) => [...prev, { text, type, id: Date.now() + Math.random() }]);
//   }, []);

//   async function handleRun() {
//     if (!subreddit.trim()) return;
//     setRunning(true);
//     setProgress(0);
//     setLogs([]);
//     setResult(null);
//     abortRef.current = new AbortController();

//     addLog(`Starting ${mode} extraction for r/${subreddit}`, "info");
//     if (mode === "search") addLog(`Search query: "${searchQuery}"`, "info");
//     addLog(`Sorting: ${SORT_LABELS[sorting]} | Limit: ${isUnlimited ? "Unlimited (all posts)" : postLimit}`, "info");

//     try {
//       let posts;
//       const onProgress = (n) => {
//         setProgress(n);
//         if (isUnlimited) { addLog(`Extracted post ${n}`); } else { addLog(`Extracted post ${n}/${postLimit}`); }
//       };

//       if (mode === "standard") {
//         posts = await scrapeStandard({ subreddit: subreddit.trim(), sorting, limit: postLimit, onProgress, signal: abortRef.current.signal });
//       } else {
//         posts = await scrapeSearch({ subreddit: subreddit.trim(), query: searchQuery, sorting, timeFilter, limit: postLimit, onProgress, signal: abortRef.current.signal });
//       }

//       const totalComments = posts.reduce((s, p) => s + p.comments.length, 0);
//       addLog(`Extraction complete — ${posts.length} posts, ${totalComments} comments`, "success");

//       const txt = buildOutputText(posts, subreddit.trim(), mode, searchQuery, sorting);
//       const name = fileName(subreddit.trim(), mode, sorting, searchQuery);
//       setResult({ txt, name, postCount: posts.length, commentCount: totalComments });
//     } catch (err) {
//       if (err.name !== "AbortError") {
//         addLog(`Error: ${err.message}`, "error");
//       }
//     }
//     setRunning(false);
//   }

//   function handleStop() {
//     abortRef.current?.abort();
//     addLog("Stopped by user", "error");
//     setRunning(false);
//   }

//   function handleDownload() {
//     if (!result) return;
//     const blob = new Blob([result.txt], { type: "text/plain" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = result.name;
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   const sortOptions = mode === "standard" ? SORT_STANDARD : SORT_SEARCH;

//   return (
//     <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace" }}>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@700&display=swap');
//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         ::-webkit-scrollbar { width: 6px; }
//         ::-webkit-scrollbar-track { background: #111; }
//         ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
//         ::selection { background: #FF450040; }
//         select option { background: #1a1a1a; color: #e0e0e0; }
//       `}</style>

//       {/* Header */}
//       <div style={{ borderBottom: "1px solid #1a1a1a", padding: "20px 32px", display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
//         <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
//           <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #FF4500, #FF6B35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>R</div>
//           <div>
//             <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.5 }}>Reddit Text Scraper</div>
//             <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>LLM-Optimized Extraction</div>
//           </div>
//         </div>
//         <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
//           <div style={{ width: 6, height: 6, borderRadius: "50%", background: running ? "#FF4500" : "#333", boxShadow: running ? "0 0 8px #FF4500" : "none", transition: "all .3s" }} />
//           <span style={{ fontSize: 11, color: running ? "#FF4500" : "#555" }}>{running ? "EXTRACTING" : "READY"}</span>
//         </div>
//       </div>

//       <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "calc(100vh - 77px)" }}>
//         {/* Sidebar */}
//         <div style={{ borderRight: "1px solid #1a1a1a", padding: 28, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
//           {/* Mode Toggle */}
//           <Field label="Extraction Mode">
//             <div style={{ display: "flex", gap: 8 }}>
//               <Pill active={mode === "standard"} onClick={() => setMode("standard")}>Standard</Pill>
//               <Pill active={mode === "search"} onClick={() => setMode("search")}>Search</Pill>
//             </div>
//           </Field>

//           {/* Subreddit */}
//           <Field label="Subreddit">
//             <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
//               <span style={{ color: "#FF4500", fontSize: 14, fontWeight: 600, marginRight: 4 }}>r/</span>
//               <Input placeholder="fitness" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} style={{ flex: 1 }} />
//             </div>
//           </Field>

//           {/* Search Query (conditional) */}
//           {mode === "search" && (
//             <Field label="Search Query">
//               <Input placeholder="protein intake" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
//             </Field>
//           )}

//           {/* Sorting */}
//           <Field label="Sort By">
//             <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
//               {sortOptions.map((s) => (
//                 <Pill key={s} active={sorting === s} onClick={() => setSorting(s)}>{SORT_LABELS[s]}</Pill>
//               ))}
//             </div>
//           </Field>

//           {/* Time Filter (search mode) */}
//           {mode === "search" && (
//             <Field label="Time Filter">
//               <Select value={timeFilter} onChange={setTimeFilter} options={TIME_FILTERS} />
//             </Field>
//           )}

//           {/* Post Limit */}
//           <Field label="Post Limit">
//             <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
//               <Pill active={isUnlimited} onClick={() => { setIsUnlimited(true); setPostLimit(0); }}>Unlimited</Pill>
//               <Pill active={!isUnlimited} onClick={() => { setIsUnlimited(false); setPostLimit(25); }}>Custom</Pill>
//             </div>
//             {!isUnlimited && (
//               <Input
//                 type="number"
//                 min={1}
//                 placeholder="Enter post limit..."
//                 value={postLimit}
//                 onChange={(e) => setPostLimit(Math.max(1, Number(e.target.value) || 1))}
//               />
//             )}
//             <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
//               {isUnlimited ? "Will extract ALL available posts until Reddit runs out" : `Will extract up to ${postLimit} posts`}
//             </div>
//           </Field>

//           {/* Actions */}
//           <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
//             {!running ? (
//               <button
//                 onClick={handleRun}
//                 disabled={!subreddit.trim() || (mode === "search" && !searchQuery.trim())}
//                 style={{
//                   padding: "14px 0",
//                   borderRadius: 8,
//                   border: "none",
//                   background: subreddit.trim() && (mode !== "search" || searchQuery.trim()) ? "linear-gradient(135deg, #FF4500, #FF6B35)" : "#222",
//                   color: subreddit.trim() && (mode !== "search" || searchQuery.trim()) ? "#fff" : "#555",
//                   fontFamily: "'JetBrains Mono', monospace",
//                   fontSize: 13,
//                   fontWeight: 600,
//                   cursor: subreddit.trim() && (mode !== "search" || searchQuery.trim()) ? "pointer" : "not-allowed",
//                   letterSpacing: 1,
//                   textTransform: "uppercase",
//                   transition: "all .2s",
//                 }}
//               >
//                 ▶ Start Extraction
//               </button>
//             ) : (
//               <button
//                 onClick={handleStop}
//                 style={{
//                   padding: "14px 0",
//                   borderRadius: 8,
//                   border: "1px solid #ff4444",
//                   background: "transparent",
//                   color: "#ff4444",
//                   fontFamily: "'JetBrains Mono', monospace",
//                   fontSize: 13,
//                   fontWeight: 600,
//                   cursor: "pointer",
//                   letterSpacing: 1,
//                   textTransform: "uppercase",
//                 }}
//               >
//                 ■ Stop
//               </button>
//             )}

//             {result && (
//               <button
//                 onClick={handleDownload}
//                 style={{
//                   padding: "14px 0",
//                   borderRadius: 8,
//                   border: "1px solid #44ff88",
//                   background: "transparent",
//                   color: "#44ff88",
//                   fontFamily: "'JetBrains Mono', monospace",
//                   fontSize: 13,
//                   fontWeight: 600,
//                   cursor: "pointer",
//                   letterSpacing: 1,
//                   textTransform: "uppercase",
//                 }}
//               >
//                 ↓ Download .txt
//               </button>
//             )}
//           </div>
//         </div>

//         {/* Main panel */}
//         <div style={{ display: "flex", flexDirection: "column" }}>
//           {/* Stats bar */}
//           {(running || result) && (
//             <div style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 28px", display: "flex", gap: 32, alignItems: "center" }}>
//               <div>
//                 <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Posts</div>
//                 <div style={{ fontSize: 22, fontWeight: 700, color: "#FF4500" }}>{result ? result.postCount : progress}</div>
//               </div>
//               {result && (
//                 <>
//                   <div>
//                     <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Comments</div>
//                     <div style={{ fontSize: 22, fontWeight: 700, color: "#44ff88" }}>{result.commentCount}</div>
//                   </div>
//                   <div>
//                     <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>File Size</div>
//                     <div style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0" }}>{(new Blob([result.txt]).size / 1024).toFixed(1)} KB</div>
//                   </div>
//                   <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>{result.name}</div>
//                 </>
//               )}
//               {running && !result && (
//                 <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
//                   {isUnlimited ? (
//                     <div style={{ fontSize: 12, color: "#FF4500" }}>
//                       Extracting all posts...
//                     </div>
//                   ) : (
//                     <div style={{ flex: 1 }}>
//                       <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
//                         <div style={{ height: "100%", width: `${(progress / postLimit) * 100}%`, background: "linear-gradient(90deg, #FF4500, #FF6B35)", borderRadius: 2, transition: "width .3s" }} />
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Log area */}
//           <div style={{ flex: 1, padding: 28, overflowY: "auto", background: "#0a0a0a" }}>
//             {logs.length === 0 && !result && (
//               <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "#333" }}>
//                 <div style={{ fontSize: 48, opacity: 0.3 }}>⌘</div>
//                 <div style={{ fontSize: 13, letterSpacing: 1 }}>Configure extraction and press Start</div>
//                 <div style={{ fontSize: 11, color: "#2a2a2a", maxWidth: 360, textAlign: "center", lineHeight: 1.7 }}>
//                   Posts and comment threads will be extracted, cleaned, and formatted into an LLM-ready .txt file.
//                 </div>
//               </div>
//             )}

//             {logs.map((l) => (
//               <LogLine key={l.id} text={l.text} type={l.type} />
//             ))}
//             <div ref={logEndRef} />

//             {/* Preview */}
//             {result && (
//               <div style={{ marginTop: 20, borderTop: "1px solid #1a1a1a", paddingTop: 20 }}>
//                 <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Output Preview</div>
//                 <pre style={{
//                   background: "#111",
//                   border: "1px solid #1a1a1a",
//                   borderRadius: 8,
//                   padding: 20,
//                   fontSize: 11,
//                   lineHeight: 1.6,
//                   color: "#888",
//                   maxHeight: 400,
//                   overflow: "auto",
//                   whiteSpace: "pre-wrap",
//                   wordBreak: "break-word",
//                 }}>
//                   {result.txt.slice(0, 3000)}{result.txt.length > 3000 ? "\n\n... (truncated preview)" : ""}
//                 </pre>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useState, useEffect, useRef, useCallback } from "react";

const SORT_STANDARD = ["hot", "new", "top_year", "top_all", "controversial"];
const SORT_SEARCH = ["relevance", "new", "top", "comments"];
const TIME_FILTERS = [
  { value: "hour", label: "Past Hour" },
  { value: "day", label: "Past 24 Hours" },
  { value: "week", label: "Past Week" },
  { value: "month", label: "Past Month" },
  { value: "year", label: "Past Year" },
  { value: "all", label: "All Time" },
];

const SORT_LABELS = {
  hot: "Hot",
  new: "New",
  top_year: "Top (Year)",
  top_all: "Top (All Time)",
  controversial: "Controversial",
  relevance: "Relevance",
  top: "Top",
  comments: "Most Comments",
};

// ── Utility helpers ──────────────────────────────────────────────
function cleanText(text) {
  if (!text) return "";
  let t = text;
  t = t.replace(/https?:\/\/[^\s)]+/g, "");
  t = t.replace(/\[deleted\]/gi, "").replace(/\[removed\]/gi, "");
  t = t.replace(/[*_`~^#>|]/g, "");
  t = t.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&#x200B;/g, "");
  t = t.replace(/\n{3,}/g, "\n\n");
  t = t.replace(/[ \t]+/g, " ");
  return t.trim();
}

function formatDate(utc) {
  const d = new Date(utc * 1000);
  return d.toISOString().split("T")[0];
}

function flattenComments(comments, depth = 0) {
  const result = [];
  if (!comments) return result;
  for (const c of comments) {
    if (!c?.data?.body) continue;
    const body = cleanText(c.data.body);
    if (!body || body === "[deleted]" || body === "[removed]") continue;
    const isBotLike = /^(auto)?moderator|bot$/i.test(c.data.author || "");
    if (isBotLike) continue;
    result.push({ body, depth });
    if (c.data.replies?.data?.children) {
      result.push(...flattenComments(c.data.replies.data.children, depth + 1));
    }
  }
  return result;
}

function buildOutputText(posts, subreddit, mode, searchQuery, sorting) {
  const header = [
    `REDDIT TEXT EXTRACTION`,
    `Generated: ${new Date().toISOString().split("T")[0]}`,
    `Subreddit: r/${subreddit}`,
    `Mode: ${mode === "standard" ? "STANDARD" : mode === "max" ? "MAX EXTRACT" : "SEARCH"}`,
    mode === "search" ? `Search Query: ${searchQuery}` : null,
    `Sorting: ${sorting}`,
    `Total Posts: ${posts.length}`,
    `${"=".repeat(40)}`,
    "",
  ].filter(Boolean).join("\n");

  const body = posts.map((p, i) => {
    const comments = (p.comments || []).map((c) => `${"  ".repeat(c.depth)}- ${c.body}`).join("\n");
    return [
      "=".repeat(40),
      `SUBREDDIT: ${subreddit}`,
      `MODE: ${mode === "standard" ? "STANDARD" : mode === "max" ? "MAX EXTRACT" : "SEARCH"}`,
      mode === "search" ? `SEARCH QUERY: ${searchQuery}` : null,
      `POST #: ${i + 1}`,
      `POST ID: ${p.id}`,
      `DATE: ${p.date}`,
      `SCORE: ${p.score}`,
      "",
      "TITLE:",
      p.title,
      "",
      "BODY:",
      p.body || "(no body text)",
      "",
      "COMMENTS:",
      comments || "(no comments)",
      "=".repeat(40),
      "",
    ].filter((l) => l !== null).join("\n");
  }).join("\n");

  return header + "\n" + body;
}

function fileName(subreddit, mode, sorting, searchQuery) {
  const date = new Date().toISOString().split("T")[0];
  if (mode === "max") {
    return subreddit + "_max_extract_" + date + ".txt";
  }
  if (mode === "search") {
    const kw = (searchQuery || "query").replace(/\s+/g, "_").toLowerCase().slice(0, 40);
    return `${subreddit}_search_${kw}_${date}.txt`;
  }
  return `${subreddit}_${sorting}_${date}.txt`;
}

// ── Reddit API helpers (uses public JSON endpoints) ──────────────
async function fetchReddit(url, signal) {
  const res = await fetch("/api/reddit?url=" + encodeURIComponent(url), { signal });
  if (res.status === 429) throw new Error("Rate limited by Reddit. Please wait and try again.");
  if (!res.ok) throw new Error(`Reddit returned ${res.status}`);
  return res.json();
}

async function fetchPostComments(subreddit, postId, signal) {
  try {
    const data = await fetchReddit(`https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=200&depth=10&raw_json=1&include_over_18=on`, signal);
    if (data && data[1]?.data?.children) {
      return flattenComments(data[1].data.children);
    }
  } catch {
    /* swallow per-post failures */
  }
  return [];
}

async function scrapeStandard({ subreddit, sorting, limit, onProgress, signal }) {
  const posts = [];
  let after = null;
  const unlimited = limit === 0;
  const sortMap = { hot: "hot", new: "new", top_year: "top", top_all: "top", controversial: "controversial" };
  const sortPath = sortMap[sorting] || "hot";
  const tParam = sorting === "top_year" ? "&t=year" : sorting === "top_all" ? "&t=all" : sorting === "controversial" ? "&t=all" : "";

  while (unlimited || posts.length < limit) {
    const batch = unlimited ? 100 : Math.min(100, limit - posts.length);
    const url = `https://www.reddit.com/r/${subreddit}/${sortPath}.json?limit=${batch}&raw_json=1&include_over_18=on${tParam}${after ? `&after=${after}` : ""}`;
    const data = await fetchReddit(url, signal);
    const children = data?.data?.children || [];
    if (children.length === 0) break;

    for (const child of children) {
      if (!unlimited && posts.length >= limit) break;
      const d = child.data;
      if (!d || d.is_video || d.is_gallery) continue;
      const comments = await fetchPostComments(subreddit, d.id, signal);
      posts.push({
        id: d.id,
        title: cleanText(d.title),
        body: cleanText(d.selftext),
        score: d.score,
        date: formatDate(d.created_utc),
        comments,
      });
      onProgress(posts.length);
      // Small delay to be polite to Reddit
      await new Promise((r) => setTimeout(r, 350));
    }
    after = data?.data?.after;
    if (!after) break;
  }
  return posts;
}

async function scrapeSearch({ subreddit, query, sorting, timeFilter, limit, onProgress, signal }) {
  const posts = [];
  let after = null;
  const unlimited = limit === 0;

  while (unlimited || posts.length < limit) {
    const batch = unlimited ? 100 : Math.min(100, limit - posts.length);
    const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=${sorting}&t=${timeFilter}&limit=${batch}&raw_json=1&include_over_18=on${after ? `&after=${after}` : ""}`;
    const data = await fetchReddit(url, signal);
    const children = data?.data?.children || [];
    if (children.length === 0) break;

    for (const child of children) {
      if (!unlimited && posts.length >= limit) break;
      const d = child.data;
      if (!d) continue;
      const comments = await fetchPostComments(subreddit, d.id, signal);
      posts.push({
        id: d.id,
        title: cleanText(d.title),
        body: cleanText(d.selftext),
        score: d.score,
        date: formatDate(d.created_utc),
        comments,
      });
      onProgress(posts.length);
      await new Promise((r) => setTimeout(r, 350));
    }
    after = data?.data?.after;
    if (!after) break;
  }
  return posts;
}

// ── Components ───────────────────────────────────────────────────

async function scrapeMaxExtract({ subreddit, onProgress, onLog, signal }) {
  const allPosts = new Map();
  const sortConfigs = [
    { sorting: "hot", sortPath: "hot", tParam: "", label: "Hot" },
    { sorting: "new", sortPath: "new", tParam: "", label: "New" },
    { sorting: "top_year", sortPath: "top", tParam: "&t=year", label: "Top (Year)" },
    { sorting: "top_all", sortPath: "top", tParam: "&t=all", label: "Top (All Time)" },
    { sorting: "controversial", sortPath: "controversial", tParam: "&t=all", label: "Controversial" },
  ];

  for (let si = 0; si < sortConfigs.length; si++) {
    const cfg = sortConfigs[si];
    onLog("Pass " + (si + 1) + "/5: Fetching " + cfg.label + " posts", "info");
    let after = null;
    let passCount = 0;

    while (true) {
      const url = "https://www.reddit.com/r/" + subreddit + "/" + cfg.sortPath + ".json?limit=100&raw_json=1&include_over_18=on" + cfg.tParam + (after ? "&after=" + after : "");
      let data;
      try {
        data = await fetchReddit(url, signal);
      } catch (e) {
        if (e.name === "AbortError") throw e;
        onLog("Warning: " + e.message + " - moving to next sort", "error");
        break;
      }
      const children = (data && data.data && data.data.children) ? data.data.children : [];
      if (children.length === 0) break;

      for (let ci = 0; ci < children.length; ci++) {
        const d = children[ci].data;
        if (!d || d.is_video || d.is_gallery) continue;
        if (allPosts.has(d.id)) continue;
        const comments = await fetchPostComments(subreddit, d.id, signal);
        allPosts.set(d.id, {
          id: d.id,
          title: cleanText(d.title),
          body: cleanText(d.selftext),
          score: d.score,
          date: formatDate(d.created_utc),
          comments: comments,
        });
        passCount++;
        onProgress(allPosts.size);
        await new Promise(function(r) { setTimeout(r, 350); });
      }
      after = (data && data.data) ? data.data.after : null;
      if (!after) break;
    }
    onLog(cfg.label + " done: " + passCount + " new posts (Total unique: " + allPosts.size + ")", "success");
  }
  return Array.from(allPosts.values());
}

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 16px",
        borderRadius: 6,
        border: "1px solid",
        borderColor: active ? "#FF4500" : "#3a3a3a",
        background: active ? "#FF4500" : "transparent",
        color: active ? "#fff" : "#aaa",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        cursor: "pointer",
        transition: "all .2s",
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#777", textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 6,
        padding: "10px 14px",
        color: "#e0e0e0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        outline: "none",
        transition: "border-color .2s",
        width: "100%",
        boxSizing: "border-box",
        ...props.style,
      }}
      onFocus={(e) => (e.target.style.borderColor = "#FF4500")}
      onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: 6,
        padding: "10px 14px",
        color: "#e0e0e0",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 14,
        outline: "none",
        cursor: "pointer",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function LogLine({ text, type }) {
  const color = type === "error" ? "#ff4444" : type === "success" ? "#44ff88" : type === "info" ? "#FF4500" : "#666";
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color, lineHeight: 1.7 }}>
      <span style={{ color: "#444", marginRight: 8 }}>{new Date().toLocaleTimeString()}</span>
      {text}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────
export default function RedditScraper() {
  const [mode, setMode] = useState("standard");
  const [subreddit, setSubreddit] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState("hot");
  const [timeFilter, setTimeFilter] = useState("all");
  const [postLimit, setPostLimit] = useState(0);
  const [isUnlimited, setIsUnlimited] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    if (mode === "standard") setSorting("hot");
    else if (mode === "search") setSorting("relevance");
  }, [mode]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = useCallback((text, type = "log") => {
    setLogs((prev) => [...prev, { text, type, id: Date.now() + Math.random() }]);
  }, []);

  async function handleRun() {
    if (!subreddit.trim()) return;
    setRunning(true);
    setProgress(0);
    setLogs([]);
    setResult(null);
    abortRef.current = new AbortController();

    addLog(`Starting ${mode} extraction for r/${subreddit}`, "info");
    if (mode === "search") addLog(`Search query: "${searchQuery}"`, "info");
    addLog(`Sorting: ${SORT_LABELS[sorting]} | Limit: ${isUnlimited ? "Unlimited (all posts)" : postLimit}`, "info");

    try {
      let posts;
      const onProgress = (n) => {
        setProgress(n);
        if (mode === "max") { addLog("Unique posts: " + n); } else if (isUnlimited) { addLog("Extracted post " + n); } else { addLog("Extracted post " + n + "/" + postLimit); }
      };

      if (mode === "max") {
        posts = await scrapeMaxExtract({ subreddit: subreddit.trim(), onProgress: onProgress, onLog: addLog, signal: abortRef.current.signal });
      } else if (mode === "standard") {
        posts = await scrapeStandard({ subreddit: subreddit.trim(), sorting, limit: postLimit, onProgress, signal: abortRef.current.signal });
      } else {
        posts = await scrapeSearch({ subreddit: subreddit.trim(), query: searchQuery, sorting, timeFilter, limit: postLimit, onProgress, signal: abortRef.current.signal });
      }

      const totalComments = posts.reduce((s, p) => s + p.comments.length, 0);
      addLog(`Extraction complete — ${posts.length} posts, ${totalComments} comments`, "success");

      const txt = buildOutputText(posts, subreddit.trim(), mode, searchQuery, sorting);
      const name = fileName(subreddit.trim(), mode, sorting, searchQuery);
      setResult({ txt, name, postCount: posts.length, commentCount: totalComments });
    } catch (err) {
      if (err.name !== "AbortError") {
        addLog(`Error: ${err.message}`, "error");
      }
    }
    setRunning(false);
  }

  function handleStop() {
    abortRef.current?.abort();
    addLog("Stopped by user", "error");
    setRunning(false);
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result.txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const sortOptions = mode === "standard" ? SORT_STANDARD : SORT_SEARCH;

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", color: "#e0e0e0", fontFamily: "'JetBrains Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Space+Grotesk:wght@700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #111; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        ::selection { background: #FF450040; }
        select option { background: #1a1a1a; color: #e0e0e0; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "20px 32px", display: "flex", alignItems: "center", gap: 16, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "linear-gradient(135deg, #FF4500, #FF6B35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff" }}>R</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: -0.5 }}>Reddit Text Scraper</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, textTransform: "uppercase" }}>LLM-Optimized Extraction</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: running ? "#FF4500" : "#333", boxShadow: running ? "0 0 8px #FF4500" : "none", transition: "all .3s" }} />
          <span style={{ fontSize: 11, color: running ? "#FF4500" : "#555" }}>{running ? "EXTRACTING" : "READY"}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", minHeight: "calc(100vh - 77px)" }}>
        {/* Sidebar */}
        <div style={{ borderRight: "1px solid #1a1a1a", padding: 28, display: "flex", flexDirection: "column", gap: 24, overflowY: "auto" }}>
          {/* Mode Toggle */}
          <Field label="Extraction Mode">
            <div style={{ display: "flex", gap: 8 }}>
              <Pill active={mode === "standard"} onClick={() => setMode("standard")}>Standard</Pill>
              <Pill active={mode === "search"} onClick={() => setMode("search")}>Search</Pill>
              <Pill active={mode === "max"} onClick={() => setMode("max")}>Max Extract</Pill>
            </div>
          </Field>

          {/* Subreddit */}
          <Field label="Subreddit">
            <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
              <span style={{ color: "#FF4500", fontSize: 14, fontWeight: 600, marginRight: 4 }}>r/</span>
              <Input placeholder="fitness" value={subreddit} onChange={(e) => setSubreddit(e.target.value)} style={{ flex: 1 }} />
            </div>
          </Field>

          {/* Search Query (conditional) */}
          {mode === "search" && (
            <Field label="Search Query">
              <Input placeholder="protein intake" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </Field>
          )}

          {/* Sorting */}
          {mode !== "max" && <Field label="Sort By">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {sortOptions.map((s) => (
                <Pill key={s} active={sorting === s} onClick={() => setSorting(s)}>{SORT_LABELS[s]}</Pill>
              ))}
            </div>
          </Field>}

          {/* Time Filter (search mode) */}
          {mode === "search" && (
            <Field label="Time Filter">
              <Select value={timeFilter} onChange={setTimeFilter} options={TIME_FILTERS} />
            </Field>
          )}

          {/* Post Limit */}
          <Field label="Post Limit">
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <Pill active={isUnlimited} onClick={() => { setIsUnlimited(true); setPostLimit(0); }}>Unlimited</Pill>
              <Pill active={!isUnlimited} onClick={() => { setIsUnlimited(false); setPostLimit(25); }}>Custom</Pill>
            </div>
            {!isUnlimited && (
              <Input
                type="number"
                min={1}
                placeholder="Enter post limit..."
                value={postLimit}
                onChange={(e) => setPostLimit(Math.max(1, Number(e.target.value) || 1))}
              />
            )}
            <div style={{ fontSize: 10, color: "#555", marginTop: 4 }}>
              {isUnlimited ? "Will extract ALL available posts until Reddit runs out" : `Will extract up to ${postLimit} posts`}
            </div>
          </Field>}

          {mode === "max" && (
            <div style={{ background: "#1a1a0a", border: "1px solid #3a3a00", borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 600, marginBottom: 6 }}>MAX EXTRACT MODE</div>
              <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6 }}>
                Runs all 5 sort types (Hot, New, Top Year, Top All, Controversial) and merges results. Duplicates removed automatically. Gets 1500-2000+ unique posts.
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {!running ? (
              <button
                onClick={handleRun}
                disabled={!subreddit.trim() || (mode === "search" && !searchQuery.trim())}
                style={{
                  padding: "14px 0",
                  borderRadius: 8,
                  border: "none",
                  background: subreddit.trim() && (mode !== "search" || searchQuery.trim()) ? "linear-gradient(135deg, #FF4500, #FF6B35)" : "#222",
                  color: subreddit.trim() && (mode !== "search" || searchQuery.trim()) ? "#fff" : "#555",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: subreddit.trim() && (mode !== "search" || searchQuery.trim()) ? "pointer" : "not-allowed",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  transition: "all .2s",
                }}
              >
                ▶ Start Extraction
              </button>
            ) : (
              <button
                onClick={handleStop}
                style={{
                  padding: "14px 0",
                  borderRadius: 8,
                  border: "1px solid #ff4444",
                  background: "transparent",
                  color: "#ff4444",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                ■ Stop
              </button>
            )}

            {result && (
              <button
                onClick={handleDownload}
                style={{
                  padding: "14px 0",
                  borderRadius: 8,
                  border: "1px solid #44ff88",
                  background: "transparent",
                  color: "#44ff88",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                ↓ Download .txt
              </button>
            )}
          </div>
        </div>

        {/* Main panel */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Stats bar */}
          {(running || result) && (
            <div style={{ borderBottom: "1px solid #1a1a1a", padding: "14px 28px", display: "flex", gap: 32, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Posts</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#FF4500" }}>{result ? result.postCount : progress}</div>
              </div>
              {result && (
                <>
                  <div>
                    <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Comments</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#44ff88" }}>{result.commentCount}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>File Size</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#e0e0e0" }}>{(new Blob([result.txt]).size / 1024).toFixed(1)} KB</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>{result.name}</div>
                </>
              )}
              {running && !result && (
                <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12 }}>
                  {(isUnlimited || mode === "max") ? (
                    <div style={{ fontSize: 12, color: mode === "max" ? "#FFD700" : "#FF4500" }}>
                      {mode === "max" ? "Max extracting across all sorts..." : "Extracting all posts..."
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(progress / postLimit) * 100}%`, background: "linear-gradient(90deg, #FF4500, #FF6B35)", borderRadius: 2, transition: "width .3s" }} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Log area */}
          <div style={{ flex: 1, padding: 28, overflowY: "auto", background: "#0a0a0a" }}>
            {logs.length === 0 && !result && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, color: "#333" }}>
                <div style={{ fontSize: 48, opacity: 0.3 }}>⌘</div>
                <div style={{ fontSize: 13, letterSpacing: 1 }}>Configure extraction and press Start</div>
                <div style={{ fontSize: 11, color: "#2a2a2a", maxWidth: 360, textAlign: "center", lineHeight: 1.7 }}>
                  Posts and comment threads will be extracted, cleaned, and formatted into an LLM-ready .txt file.
                </div>
              </div>
            )}

            {logs.map((l) => (
              <LogLine key={l.id} text={l.text} type={l.type} />
            ))}
            <div ref={logEndRef} />

            {/* Preview */}
            {result && (
              <div style={{ marginTop: 20, borderTop: "1px solid #1a1a1a", paddingTop: 20 }}>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Output Preview</div>
                <pre style={{
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  borderRadius: 8,
                  padding: 20,
                  fontSize: 11,
                  lineHeight: 1.6,
                  color: "#888",
                  maxHeight: 400,
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {result.txt.slice(0, 3000)}{result.txt.length > 3000 ? "\n\n... (truncated preview)" : ""}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
