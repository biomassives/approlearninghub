/**
 * @fileoverview Provides a secureFetch function that wraps the standard fetch API
 * to include a lattice hash from the secure session for potential
 * server-side validation or session integrity checks.
 */

// Adjust the path './session-crypto.js' if lattice-method.js is not in the same /public/js/ directory
import { loadSecureSession, isCryptoBypassed } from './session-crypto.js';

/**
 * Performs a fetch request, automatically adding the 'X-Lattice-Hash' header
 * from the secure session if a session exists and crypto is not bypassed.
 * Handles basic request/response logic, assuming JSON communication primarily.
 *
 * @param {string|URL} url - The URL or Request object to fetch.
 * @param {object} [options={}] - Optional fetch options (method, body, custom headers, etc.).
 * @returns {Promise<any>} - A promise resolving to the parsed JSON response body,
 * or the raw Response object if the content type is not JSON.
 * @throws {Error} - Throws an error if the fetch fails (network error),
 * session loading fails unexpectedly, or the server returns
 * a non-ok status (e.g., 4xx, 5xx).
 */
export async function secureDataFetch(url, options = {}) {
    console.debug(`[secureDataFetch] Initiating request for: ${url}`);

    try {
        // 1. Load session data without auto-generating or using fallback if none exists
        const session = await loadSecureSession(false, null);
        const cryptoBypassed = isCryptoBypassed();
        let latticeHash = null;

        if (session && !cryptoBypassed) {
            // Session exists and crypto is active, get the hash
            latticeHash = session.latticeHash;
            if (latticeHash) {
                console.debug("[secureDataFetch] Session loaded. Lattice hash found:", latticeHash);
            } else {
                console.warn("[secureDataFetch] Session loaded, but latticeHash is missing within the session data.");
            }
        } else if (session && cryptoBypassed) {
            console.debug("[secureDataFetch] Session loaded, but crypto is bypassed. No lattice hash will be sent.");
        } else {
            console.warn(`[secureDataFetch] No session found or loaded for request to ${url}. Proceeding without lattice hash.`);
            // Depending on API requirements, requests without a session might fail server-side
        }

        // 2. Prepare fetch options, merging custom options and adding lattice header
        const fetchOptions = { ...options }; // Shallow copy initial options
        fetchOptions.headers = new Headers(options.headers); // Work with Headers object

        // Add the lattice hash header ONLY if we have one and crypto isn't bypassed
        if (latticeHash) {
            fetchOptions.headers.set('X-Lattice-Hash', latticeHash);
            console.debug("[secureDataFetch] Added 'X-Lattice-Hash' header.");
        }

        // Set default Accept header if not provided
        if (!fetchOptions.headers.has('Accept')) {
            fetchOptions.headers.set('Accept', 'application/json');
        }

        // Set default Content-Type for relevant methods if not provided and body exists
        if (fetchOptions.body && !fetchOptions.headers.has('Content-Type')) {
            const method = fetchOptions.method ? fetchOptions.method.toUpperCase() : 'GET';
            // Avoid setting Content-Type for FormData or GET/HEAD requests
            if (method !== 'GET' && method !== 'HEAD' && !(fetchOptions.body instanceof FormData)) {
                fetchOptions.headers.set('Content-Type', 'application/json');
            }
        }

        // Add credentials option if needed for cookies (check if your auth uses cookies)
        // fetchOptions.credentials = 'include'; // Or 'same-origin'

        // 3. Execute the actual fetch call
        console.debug("[secureDataFetch] Executing fetch with options:", fetchOptions);
        const response = await fetch(url, fetchOptions);
        console.debug(`[secureDataFetch] Received response status ${response.status} for ${url}`);

        // 4. Handle the response
        if (!response.ok) {
            // Server returned an error status (4xx or 5xx)
            let errorBody = null;
            try {
                // Attempt to read error details from the response body
                errorBody = await response.text();
                console.error(`[secureDataFetch] Server error response body for ${url}:`, errorBody);
            } catch (e) {
                console.warn(`[secureDataFetch] Could not read server error response body for ${url}.`);
            }
            // Throw an error that includes the status and potentially the body
            throw new Error(`HTTP error ${response.status} for ${url}. Body: ${errorBody || 'Not available'}`);
        }

        // 5. Process successful response body based on Content-Type
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            // It's JSON, parse and return it
            const data = await response.json();
            console.debug(`[secureDataFetch] Parsed JSON response for ${url}:`, data);
            return data;
        } else if (response.status === 204 || response.headers.get('content-length') === '0') {
             // Handle No Content responses
             console.debug(`[secureDataFetch] Received No Content (204) response for ${url}. Returning null.`);
             return null;
        }
         else {
            // It's not JSON, return the raw Response object or handle as text
            console.debug(`[secureDataFetch] Response for ${url} is not JSON (${contentType || 'N/A'}). Returning raw response object.`);
            // return response; // Option 1: Return raw response
            return await response.text(); // Option 2: Return as text
        }

    } catch (error) {
        // Catch errors from session loading, fetch network issues, or response handling
        console.error(`[secureDataFetch] Failed for URL: ${url}. Error:`, error);
        // Re-throw the error so the calling code (e.g., loadCategories) can handle it
        throw error;
    }
}