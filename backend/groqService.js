const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function gerarCadastro(promptUsuario) {
  const response = await groq.chat.completions.create({
    model: "llama3-70b-8192",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
Você é um sistema que gera apenas JSON válido.
Nunca responda com markdown.
Nunca explique nada.
Retorne apenas JSON puro.
`
      },
      {
        role: "user",
        content: promptUsuario
      }
    ]
  });

  return response.choices[0].message.content;
}

module.exports = { gerarCadastro };