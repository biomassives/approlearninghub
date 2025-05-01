// /api/clinics_public.js (Example)

const express = require('express');
const router = express.Router();
const supabase = require('../lib/supabaseClient'); // Adjust path if needed
// const { authenticate } = require('./middleware/auth'); // Decide if Browse needs auth



/**
 * GET /clinics
 * Fetches a list of public clinics/learning modules for Browse.
 * Supports optional query parameters like category, search (implement later).
 */
router.get('/', async (req, res) => {
    // Optional: Add query param handling later
    // const { category, search, limit = 20, offset = 0 } = req.query;

    try {
        console.log("Backend received request for GET /api/clinics");

        // Example Query: Select public modules, ordered by creation/update date
        // Adjust table name ('learning_modules') and columns as needed
        const { data: clinics, error } = await supabase
            .from('learning_modules') // Or your actual table name
            .select('id, title, summary, status, category_id, subcategory_id, last_updated') // Select needed fields
            .eq('status', 'published') // Example: Only show published ones
            // Add more filters based on query params later (e.g., .eq('category_id', category))
            .order('last_updated', { ascending: false })
            // Add pagination later (e.g., .range(offset, offset + limit - 1))
            .limit(50); // Add a reasonable default limit

        if (error) {
            console.error("Supabase error fetching clinics:", error);
            throw new Error(error.message || 'Database query failed');
        }

        console.log(`Successfully fetched ${clinics?.length || 0} clinics from backend.`);
        res.json({ success: true, clinics: clinics || [] });

    } catch (err) {
        console.error("Error in GET /api/clinics handler:", err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch clinics.',
            message: err.message // Provide message for debugging
        });
    }
});

// Add other clinic routes here (e.g., GET /clinics/:id, POST /clinics, etc.) later

module.exports = router;