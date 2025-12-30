const DEEPSEEK_API_KEY = 'sk-92787f26a97142979d094d5a13d57221';
const API_URL = 'https://api.deepseek.com/chat/completions';

exports.chatWithAI = async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'Invalid messages format' });
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: "你是“情绪搭子”，一个温暖、富有同理心的倾听者。你的目标是为用户提供情感支持、安慰和正能量。请保持回复简洁（100字以内）、友好且从容。不要像机器人一样回答，要像一个知心朋友。"
                    },
                    ...messages
                ],
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DeepSeek API Error:', response.status, errorText);
            return res.status(response.status).json({ message: 'AI Service currently unavailable' });
        }

        const data = await response.json();
        const aiMessage = data.choices[0].message;

        res.json(aiMessage);
    } catch (error) {
        console.error('AI Chat Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
