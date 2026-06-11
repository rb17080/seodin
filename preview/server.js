const http=require("http"),fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,".."),PORT=Number(process.argv[2]||5187);
const T={".html":"text/html",".css":"text/css",".js":"text/javascript"};
http.createServer((q,s)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p==="/")p="/preview/panel.html";const f=path.join(ROOT,p);if(!f.startsWith(ROOT)){s.writeHead(403);return s.end();}fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end();}s.writeHead(200,{"Content-Type":T[path.extname(f)]||"application/octet-stream","Cache-Control":"no-store"});s.end(d);});}).listen(PORT,()=>console.log("up "+PORT));
