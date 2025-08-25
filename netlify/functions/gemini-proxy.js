// /netlify/functions/gemini-proxy.js

const fetch = require('node-fetch');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    console.log("Function triggered. Processing request...");

    try {
        const { prompt } = JSON.parse(event.body);
        
        if (!prompt) {
            console.error("Error: No prompt found in the request body.");
            return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: No prompt provided.' }) };
        }
        console.log(`Received prompt: "${prompt}"`);

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable not set or not found.");
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) };
        }
        console.log("Successfully loaded API key from environment variables.");

        // CHANGE 1: The API key is REMOVED from the URL.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

        console.log("Sending request to Gemini API...");
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // CHANGE 2: The API key is ADDED to the headers.
                'x-goog-api-key': apiKey 
            },
            body: JSON.stringify(payload)
        });

        console.log(`Received response from Gemini API with status: ${response.status}`);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Error Status:', response.status);
            console.error('Gemini API Error Body:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Failed to fetch from Gemini API: ${errorBody}` })
            };
        }

        const result = await response.json();
        
        let generatedText = 'Could not generate text.';
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            generatedText = result.candidates[0].content.parts[0].text;
            console.log("Successfully extracted text from Gemini response.");
        } else {
            console.warn("Warning: Gemini response was successful but contained no text. Full response:", JSON.stringify(result));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ text: generatedText })
        };

    } catch (error) {
        console.error('FATAL Error in Netlify function execution:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};