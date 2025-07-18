// /lib/supabase-client.js - Supabase Integration
class SupabaseClient {
    constructor() {
        this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        this.supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        this.headers = {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${this.supabaseKey}`,
            'Content-Type': 'application/json'
        };
    }

    async query(table, options = {}) {
        let url = `${this.supabaseUrl}/rest/v1/${table}`;
        
        // Add query parameters
        const params = new URLSearchParams();
        if (options.select) params.append('select', options.select);
        if (options.eq) {
            Object.entries(options.eq).forEach(([key, value]) => {
                params.append(key, `eq.${value}`);
            });
        }
        
        if (params.toString()) url += `?${params.toString()}`;

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: this.headers
            });
            return await response.json();
        } catch (error) {
            console.error('Supabase query error:', error);
            return null;
        }
    }

    async insert(table, data) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}`, {
                method: 'POST',
                headers: {
                    ...this.headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Supabase insert error:', error);
            return null;
        }
    }

    async update(table, id, data) {
        try {
            const response = await fetch(`${this.supabaseUrl}/rest/v1/${table}?id=eq.${id}`, {
                method: 'PATCH',
                headers: {
                    ...this.headers,
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error('Supabase update error:', error);
            return null;
        }
    }
}

// /lib/hybrid-data-manager.js - Combined KV + Supabase Manager
class HybridDataManager extends DataManager {
    constructor() {
        super();
        this.supabase = new SupabaseClient();
    }

    async setWithSync(key, data, syncToSupabase = true) {
        // Set in Vercel KV first (fast cache)
        const kvSuccess = await this.secureSet(key, data);
        
        if (syncToSupabase && kvSuccess) {
            // Sync to Supabase for persistence
            await this.supabase.insert('data_cache', {
                key: key,
                value: data,
                updated_at: new Date().toISOString()
            });
        }
        
        return kvSuccess;
    }

    async getWithHybridFallback(key) {
        // Try KV first (fastest)
        let data = await this.secureGet(key);
        
        if (!data) {
            // Try Supabase
            const supabaseData = await this.supabase.query('data_cache', {
                select: 'value',
                eq: { key: key }
            });
            
            if (supabaseData && supabaseData.length > 0) {
                data = supabaseData[0].value;
                // Cache back to KV for next time
                await this.secureSet(key, data);
            } else {
                // Finally try seed data
                data = this.getSeedData(key);
            }
        }
        
        return data;
    }
}
