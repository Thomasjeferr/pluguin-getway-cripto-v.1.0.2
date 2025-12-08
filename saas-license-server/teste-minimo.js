const express = require('express');
const app = express();

app.get('/teste', (req, res) => {
    res.send('<h1>FUNCIONOU! O servidor está ok.</h1>');
});

app.get('/login', (req, res) => {
    res.send('<h1>Página de Login de Teste</h1>');
});

app.listen(3000, () => {
    console.log('SERVIDOR DE TESTE RODANDO!');
    console.log('Acesse: http://localhost:3000/teste');
});

