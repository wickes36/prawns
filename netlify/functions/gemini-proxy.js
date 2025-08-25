// /netlify/functions/gemini-proxy.js

// Using 'node-fetch' for making HTTP requests in a Node.js environment.
// You'll need to add "node-fetch" to your project's dependencies (`npm install node-fetch`).
import fetch from 'node-fetch';

// Use 'export const' to define the handler for ES Module compatibility.
export const handler = async (event) => {
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
            // Avoid throwing an error that exposes stack traces; return a clean error instead.
            return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error.' }) };
        }
        console.log("Successfully loaded API key from environment variables.");

        // NOTE: You are using a preview model. Ensure it's the right one for your use case.
        // It might be better to use 'gemini-1.5-flash-latest'.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }]
        };

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
        // Simplified and safer check for the generated text in the response.
        if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
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