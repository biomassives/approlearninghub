// api/public/timeline-data.js
// This endpoint provides public timeline data without authentication

module.exports = async (req, res) => {
  try {
    const { viewMode = 'month', category = 'all' } = req.query;
    
    // Set CORS headers for public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed. Use GET.' });
    }

    // Calculate date ranges based on viewMode
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    let startDate, endDate;
    
    switch (viewMode) {
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay()); // Start of current week
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 28); // 4 weeks view
        break;
      
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 6);
        endDate.setDate(0); // Last day of the month
        break;
      
      case 'month':
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        endDate = new Date(startDate);
        endDate.setMonth(startDate.getMonth() + 3);
        endDate.setDate(0); // Last day of the month
        break;
    }

    // Public timeline data specifically for science-technology workshops,
    // library development, and learning module development milestones
    const publicEvents = [
      // Science-Technology Workshop Clinics
      {
        id: 1,
        name: "AI for Research Workshop",
        type: "workshop",
        startDate: new Date(thisYear, thisMonth, 10),
        endDate: new Date(thisYear, thisMonth, 10),
        group: "Science-Tech Workshops",
        description: "Introductory workshop on using AI tools for scientific research and data analysis.",
        priority: "high",
        public: true
      },
      {
        id: 2,
        name: "Python for Data Science Bootcamp",
        type: "workshop",
        startDate: new Date(thisYear, thisMonth + 1, 5),
        endDate: new Date(thisYear, thisMonth + 1, 7),
        group: "Science-Tech Workshops",
        description: "Three-day intensive bootcamp covering Python fundamentals for scientific computing and data analysis.",
        priority: "high",
        public: true
      },
      {
        id: 3,
        name: "Robotics Laboratory Open Day",
        type: "workshop",
        startDate: new Date(thisYear, thisMonth + 2, 15),
        endDate: new Date(thisYear, thisMonth + 2, 15),
        group: "Science-Tech Workshops",
        description: "Public demonstration of robotics projects with hands-on exercises for participants.",
        priority: "medium",
        public: true
      },
      
      // Library Development
      {
        id: 4,
        name: "Digital Collection Alpha Release",
        type: "milestone",
        startDate: new Date(thisYear, thisMonth, 20),
        endDate: new Date(thisYear, thisMonth, 20),
        group: "Library Development",
        description: "First release of the digital research collection with cataloging system.",
        priority: "high",
        public: true
      },
      {
        id: 5,
        name: "Library API Development",
        type: "development",
        startDate: new Date(thisYear, thisMonth, 15),
        endDate: new Date(thisYear, thisMonth + 1, 10),
        group: "Library Development",
        description: "Development of RESTful API for accessing library resources programmatically.",
        priority: "medium",
        public: true
      },
      {
        id: 6,
        name: "Public Beta Launch",
        type: "milestone",
        startDate: new Date(thisYear, thisMonth + 2, 25),
        endDate: new Date(thisYear, thisMonth + 2, 25),
        group: "Library Development",
        description: "Launch of the public beta for the new digital library system.",
        priority: "high",
        public: true
      },
      
      // Learning Module Development
      {
        id: 7,
        name: "ML Fundamentals Module Creation",
        type: "development",
        startDate: new Date(thisYear, thisMonth, 5),
        endDate: new Date(thisYear, thisMonth + 1, 15),
        group: "Learning Modules",
        description: "Development of machine learning fundamentals learning module with interactive exercises.",
        priority: "high",
        public: true
      },
      {
        id: 8,
        name: "Scientific Research Methods Module",
        type: "development",
        startDate: new Date(thisYear, thisMonth + 1, 1),
        endDate: new Date(thisYear, thisMonth + 2, 1),
        group: "Learning Modules",
        description: "Creation of comprehensive research methods module for science and technology students.",
        priority: "medium",
        public: true
      },
      {
        id: 9,
        name: "Module Platform Integration",
        type: "milestone",
        startDate: new Date(thisYear, thisMonth + 2, 10),
        endDate: new Date(thisYear, thisMonth + 2, 10),
        group: "Learning Modules",
        description: "Integration of all learning modules with the main learning management system.",
        priority: "high",
        public: true
      }
    ];
    
    // Apply category filtering if requested
    let filteredEvents = publicEvents;
    if (category !== 'all') {
      if (category === 'workshops') {
        filteredEvents = publicEvents.filter(event => event.group === 'Science-Tech Workshops');
      } else if (category === 'library') {
        filteredEvents = publicEvents.filter(event => event.group === 'Library Development');
      } else if (category === 'modules') {
        filteredEvents = publicEvents.filter(event => event.group === 'Learning Modules');
      } else if (category === 'milestones') {
        filteredEvents = publicEvents.filter(event => event.type === 'milestone');
      }
    }

    // Format dates for client consumption
    const formatDate = (date) => {
      return date.toISOString();
    };

    const formattedEvents = filteredEvents.map(event => ({
      ...event,
      startDate: formatDate(event.startDate),
      endDate: formatDate(event.endDate)
    }));

    return res.status(200).json({
      success: true,
      data: {
        events: formattedEvents,
        dateRange: {
          startDate: formatDate(startDate),
          endDate: formatDate(endDate)
        },
        viewMode
      }
    });

  } catch (error) {
    console.error('Error accessing public timeline data:', error);
    return res.status(500).json({ error: 'Server error during data retrieval' });
  }
};
