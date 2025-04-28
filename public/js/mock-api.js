// js/mock-api.js
// Mock API for videos (for development/testing without a backend)

/**
 * This file provides a mock API for the video interface
 * It simulates API responses for development and testing
 */

const MOCK_VIDEOS = [
    {
        id: "v001",
        title: "DIY Solar Panel Installation Guide",
        description: "Complete walkthrough for installing a small-scale solar panel system for your home or community. Learn how to calculate energy needs, select appropriate components, and safely install your system.",
        tags: ["solar", "renewable energy", "DIY", "installation"],
        youtubeId: "jSa1tvrrYZk",
        category: "Energy",
        subcategory: "DIY Solar Energy",
        panels: [
            { title: "Intro", content: "Introduction to solar energy basics" },
            { title: "Components", content: "Solar panel components overview" },
            { title: "Installation", content: "Step-by-step installation process" },
            { title: "Testing", content: "How to test your system" }
        ]
    },
    {
        id: "v002",
        title: "Low-Cost Water Filtration System",
        description: "Learn how to build a multi-stage water filtration system using locally available materials. This design removes particulates, many pathogens, and some chemical contaminants.",
        tags: ["water", "filtration", "purification", "health"],
        youtubeId: "l4vPMc-IKnw",
        category: "Water",
        subcategory: "Purification"
    },
    {
        id: "v003",
        title: "Building with Earth Bags",
        description: "Comprehensive guide to constructing durable structures using earth bag techniques. This method creates strong, insulated buildings with minimal materials cost.",
        tags: ["construction", "earthbag", "sustainable", "building"],
        youtubeId: "D14_9UJaDyA",
        category: "Shelter",
        subcategory: "Low-cost, Durable Construction Methods"
    },
    {
        id: "v004",
        title: "Community Composting Systems",
        description: "How to set up and manage a neighborhood-scale composting system. Includes guidance on collection, management, and distribution of finished compost.",
        tags: ["compost", "waste", "community", "soil"],
        youtubeId: "1WrQn-QSvw8",
        category: "Waste Management",
        subcategory: "Composting"
    },
    {
        id: "v005",
        title: "Emergency Medical Skills: Wound Care",
        description: "Essential techniques for cleaning, treating, and dressing wounds when professional medical care is unavailable or delayed.",
        tags: ["medical", "emergency", "wounds", "first aid"],
        youtubeId: "ya6G8bsYvQg",
        category: "Health",
        subcategory: "EMT Skills"
    },
    {
        id: "v006",
        title: "Urban Balcony Garden System",
        description: "Maximize food production in small spaces with this vertical gardening system designed for balconies and small patios.",
        tags: ["garden", "urban", "food", "vegetables"],
        youtubeId: "KjIdrG8DhAU",
        category: "Sustainable Food",
        subcategory: "Urban Gardening"
    },
    {
        id: "v007",
        title: "Simple Biogas Digester Construction",
        description: "Build a small-scale biogas digester that converts organic waste into cooking fuel. Includes complete materials list and step-by-step assembly.",
        tags: ["biogas", "energy", "cooking", "methane"],
        youtubeId: "3TDPOXdVAd0",
        category: "Energy",
        subcategory: "Biogas Generation"
    },
    {
        id: "v008",
        title: "Bamboo Construction Techniques",
        description: "Learn how to properly harvest, treat, and use bamboo for durable construction projects. Includes joinery methods and preservation techniques.",
        tags: ["bamboo", "building", "natural", "construction"],
        youtubeId: "X1DddgGVyQQ",
        category: "Shelter",
        subcategory: "Locally Available Materials"
    },
    {
        id: "v009",
        title: "DIY Rain Catchment System",
        description: "Build an efficient rain harvesting system for your home or community garden. Learn about filtration, storage, and distribution.",
        tags: ["water", "rain", "conservation", "DIY"],
        youtubeId: "S5BkGLmAHNM",
        category: "Water",
        subcategory: "Efficient Distribution"
    },
    {
        id: "v010",
        title: "Basic Wound Suturing Techniques",
        description: "Learn proper suturing techniques for basic wound closure when professional medical care is not available.",
        tags: ["medical", "emergency", "wounds", "suturing"],
        youtubeId: "E8iaqOfj2rQ",
        category: "Health",
        subcategory: "EMT Skills"
    },
    {
        id: "v011",
        title: "Small-Scale Aquaponics System",
        description: "Build a compact aquaponics system that combines fish farming with hydroponic plant growing for maximum food production in small spaces.",
        tags: ["aquaponics", "fish", "vegetables", "sustainable"],
        youtubeId: "4jKoDh3fJLU",
        category: "Sustainable Food",
        subcategory: "Hydro/Aero/Fish -ponics"
    },
    {
        id: "v012",
        title: "DIY Plastic Recycling Machine",
        description: "Build a small-scale plastic recycling machine to convert plastic waste into useful products for your community.",
        tags: ["recycling", "plastic", "waste", "machine"],
        youtubeId: "VFIPXgrk7u0",
        category: "Waste Management",
        subcategory: "Recycling Systems"
    }
];

/**
 * Mocks an API response with filtered videos
 * @param {Object} params - Query parameters 
 * @returns {Promise} - Simulated API response
 */
function mockFetchVideos(params = {}) {
    console.log('Mock API: Fetching with params:', params);
    
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            // Start with all videos
            let filteredVideos = [...MOCK_VIDEOS];
            
            // Apply category filter if specified
            if (params.category) {
                filteredVideos = filteredVideos.filter(video => 
                    video.category && video.category.toLowerCase() === params.category.toLowerCase()
                );
            }
            
            // Apply subcategory filter if specified
            if (params.subcategory) {
                filteredVideos = filteredVideos.filter(video => 
                    video.subcategory && video.subcategory.toLowerCase() === params.subcategory.toLowerCase()
                );
            }
            
            // Apply search filter if specified
            if (params.search && params.search.trim() !== '') {
                const searchTerm = params.search.toLowerCase();
                filteredVideos = filteredVideos.filter(video => 
                    (video.title && video.title.toLowerCase().includes(searchTerm)) ||
                    (video.description && video.description.toLowerCase().includes(searchTerm)) ||
                    (video.tags && video.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
                );
            }
            
            // Apply pagination
            const offset = parseInt(params.offset) || 0;
            const limit = parseInt(params.limit) || 10;
            const paginatedVideos = filteredVideos.slice(offset, offset + limit);
            
            // Return mock response
            resolve({
                success: true,
                items: paginatedVideos,
                total: filteredVideos.length,
                hasMore: offset + limit < filteredVideos.length
            });
        }, 500); // Simulate 500ms network delay
    });
}

// Export the mock API function
export { mockFetchVideos, MOCK_VIDEOS };