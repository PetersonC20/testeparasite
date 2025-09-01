const PORT = process.env.PORT || 8080;

server.listen(PORT, () => {
  console.log("WS relay escutando na porta " + PORT);
});
