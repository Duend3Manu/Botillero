const commandHandler = require('../src/handlers/command.handler');

const mockClient = {
    sendMessage: async (to, body) => console.log(`[MockClient] Sending to ${to}: ${body}`)
};

const mockMessage = {
    body: '!champion',
    from: '12345@c.us',
    reply: async (msg) => console.log(`[MockMessage] Reply: ${msg}`),
    react: async (r) => console.log(`[MockMessage] React: ${r}`)
};

console.log('--- Testing !champion command ---');
commandHandler(mockClient, mockMessage).catch(err => console.error(err));
