// This file should be saved as: /netlify/functions/gemini-proxy.js

// Using 'node-fetch' for making HTTP requests in a Node.js environment.
// You'll need to add "node-fetch" to your project's dependencies.
// Run `npm install node-fetch` in your project's root directory.
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    // This function only accepts POST requests.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // --- DETAILED LOGGING START ---
    console.log("Function triggered. Processing request...");

    try {
        // Get the prompt sent from the client-side game.
        const { prompt } = JSON.parse(event.body);
        
        if (!prompt) {
            console.error("Error: No prompt found in the request body.");
            return { statusCode: 400, body: JSON.stringify({ error: 'Bad Request: No prompt provided.' }) };
        }
        console.log(`Received prompt: "${prompt}"`);

        // Securely access the API key from Netlify's environment variables.
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("CRITICAL ERROR: GEMINI_API_KEY environment variable not set or not found.");
            throw new Error("GEMINI_API_KEY environment variable not set.");
        }
        console.log("Successfully loaded API key from environment variables.");


        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

        let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
        const payload = { contents: chatHistory };

        console.log("Sending request to Gemini API...");
        // Call the actual Gemini API from the server-side function.
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        console.log(`Received response from Gemini API with status: ${response.status}`);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Error:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Failed to fetch from Gemini API' })
            };
        }

        const result = await response.json();
        
        let generatedText = 'Could not generate text.';
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            generatedText = result.candidates[0].content.parts[0].text;
            console.log("Successfully extracted text from Gemini response.");
        } else {
            console.warn("Warning: Gemini response was successful but contained no text. Full response:", JSON.stringify(result));
        }

        // Send the generated text back to the client-side game.
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
