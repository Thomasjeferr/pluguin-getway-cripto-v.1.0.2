/**
 * Rotas Admin para gerenciamento de produtos
 * 
 * Estas rotas serão integradas ao server.js
 * Por enquanto, mantemos comentado para referência futura
 */

/*
// Listar produtos
app.get('/admin/products', requireAdmin, async (req, res) => {
    const products = await Product.find().sort({ order: 1, name: 1 });
    res.render('admin-products', { products });
});

// Criar produto
app.post('/admin/products', requireAdmin, async (req, res) => {
    const product = await Product.create(req.body);
    res.redirect('/admin/products?success=Produto criado');
});

// Atualizar produto
app.post('/admin/products/:id', requireAdmin, async (req, res) => {
    await Product.findByIdAndUpdate(req.params.id, req.body);
    res.redirect('/admin/products?success=Produto atualizado');
});

// Deletar produto
app.post('/admin/products/:id/delete', requireAdmin, async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.redirect('/admin/products?success=Produto removido');
});
*/

module.exports = {};
