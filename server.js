const app = require('./app');

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(🚀 NEXORA backend running on port ${PORT});
});
