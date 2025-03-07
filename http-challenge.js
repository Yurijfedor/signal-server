const http = require("http");

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/.well-known/acme-challenge/")) {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Challenge response goes here"); // Certify сам додасть правильний вміст
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(80, "0.0.0.0", () => {
  console.log("HTTP сервер запущено на порту 80");
});
