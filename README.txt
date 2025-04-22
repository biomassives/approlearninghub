APPROVIDEO API
==============
 
This API provides authentication and dashboard functionality

🔒 ApproVideo Hub: Securing the Digital Commons with Lattice Security
Building a safer web, powered by open source and protected under GPL v3.

The lattice pattern provides a lightweight form of multi-factor 
authentication for each session, where the "second factor" is the 
device/browser context itself, without requiring additional user 
input beyond the initial login.

Lattice creates an unbreakable binding between client sessions and 
server validation that cannot be transported or spoofed, even if 
authentication tokens are compromised.

Here's how this additional layer of security beyond standard token-based authentication works:

Core Concept
The lattice pattern creates a secure binding between the client session and server-side session that can't be easily spoofed or transported to another device/browser, even if an attacker somehow obtains the authentication token.
Implementation Details


Advantages Over Standard Authentication

Protection Against Token Theft: If an attacker somehow steals the authentication token (via XSS, etc.), they still can't hijack the session without the lattice ID
CSRF Defense: Cross-site request forgery attacks are mitigated since the attacker's site can't access the lattice ID from your domain
Device-Specific Sessions: Each device/browser gets its own unique lattice ID, making session transfers impossible
User Verification: Users can manually verify their session security with the "Verify" button in the dashboard, providing peace of mind

Dual-Storage Verification:

When a user logs in successfully, the system generates a cryptographically secure random string (the "lattice ID")
This ID is stored in both the client's local storage AND on the server (tied to the user's ID)
The authentication token alone is not sufficient for maintaining a valid session


Token Binding:

The system creates a hash that combines part of the auth token with the lattice ID
This hash is stored client-side, creating a binding between the token and the lattice
Even if an attacker steals the token, they would still need the correct lattice ID to generate a valid hash


Verification Process:

During sensitive operations and periodically during the session, the client sends its lattice ID to the server
The server compares this to the stored lattice ID for that user
If they don't match, the session is invalidated and the user is forced to re-authenticate
This detects session hijacking attempts


Enhanced Security:

The lattice ID functions as a second "factor" or secret
It's device/browser specific and not transportable
It creates a form of cryptographic binding between client and server


Lattice Security Pattern Defense Against Session Hijacking

In today's threat landscape, traditional token-based authentication isn't enough. The Lattice Security Pattern adds a powerful layer of protection against sophisticated session attacks with elegant simplicity.
Core Concept
Lattice creates an unbreakable binding between client sessions and server validation that cannot be transported or spoofed, even if authentication tokens are compromised.


Implementation Details

Dual-Storage Verification:

When a user logs in successfully, the system generates a cryptographically secure random string (the "lattice ID")
This ID is stored in both the client's local storage AND on the server (tied to the user's ID)
The authentication token alone is not sufficient for maintaining a valid session


Token Binding:

The system creates a hash that combines part of the auth token with the lattice ID
This hash is stored client-side, creating a binding between the token and the lattice
Even if an attacker steals the token, they would still need the correct lattice ID to generate a valid hash


Verification Process:

During sensitive operations and periodically during the session, the client sends its lattice ID to the server
The server compares this to the stored lattice ID for that user
If they don't match, the session is invalidated and the user is forced to re-authenticate
This detects session hijacking attempts


Enhanced Security:

The lattice ID functions as a second "factor" or secret
It's device/browser specific and not transportable
It creates a form of cryptographic binding between client



graph TD
    A[User Login] --> B[Generate Lattice ID]
    B --> C[Store Client-Side]
    B --> D[Store Server-Side]
    C --> E[Create Token+Lattice Hash]
    E --> F[Secure Session Storage]
    G[Session Activity] --> H[Periodic Verification]
    H --> I{ID Match?}
    I -->|Yes| J[Continue Session]
    I -->|No| K[Force Logout]






sequenceDiagram
    participant User
    participant Browser
    participant Server
    participant Database
    
    User->>Browser: Enter credentials
    Browser->>Server: POST /api/auth/login
    Server->>Database: Verify credentials
    Database-->>Server: Valid user
    Server-->>Browser: Return tokens
    Browser->>Browser: Generate lattice ID
    Browser->>Server: POST /api/auth/update-lattice
    Server->>Database: Store lattice ID
    
    Note over Browser,Server: Secure session established
    
    Browser->>Browser: Periodically verify session
    Browser->>Server: POST /api/auth/verify
    Server->>Database: Compare lattice IDs
    Database-->>Server: Match status
    Server-->>Browser: Verification result
    
    alt Verification failed
        Browser->>Browser: Force logout
        Browser->>User: Show security warning
    end

