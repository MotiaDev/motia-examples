const { MongoClient } = require('mongodb');

class MongoStorage {
    constructor() {
        this.client = null;
        this.db = null;
        this.connected = false;
    }

    async connect() {
        if (this.connected) return;
        
        try {
            // Use MongoDB Atlas or local MongoDB
            const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
            this.client = new MongoClient(uri);
            await this.client.connect();
            
            // Test the connection
            await this.client.db().admin().ping();
            
            this.db = this.client.db('uptime_monitor');
            this.connected = true;
            console.log('Connected to MongoDB');
        } catch (error) {
            console.error('MongoDB connection failed:', error.message);
            // Fallback to in-memory storage
            this.fallbackStorage = new Map();
        }
    }

    async updateStatus(website, status) {
        console.log("updateStatus called with:", website, status);
        await this.connect();
        
        if (!this.connected) {
            // Fallback to in-memory
            this.fallbackStorage.set(website, status);
            return;
        }

        try {
            // Update current status
            await this.db.collection('website_status').replaceOne(
                { website },
                {
                    website,
                    ...status,
                    lastUpdated: new Date()
                },
                { upsert: true }
            );
            console.log(`MongoDB: saved status for ${website}`);

            // Store in history
            await this.db.collection('check_history').insertOne({
                website,
                ...status,
                createdAt: new Date()
            });

            // Keep only last 1000 records per website
            const count = await this.db.collection('check_history').countDocuments({ website });
            if (count > 1000) {
                const oldRecords = await this.db.collection('check_history')
                    .find({ website })
                    .sort({ createdAt: 1 })
                    .limit(count - 1000)
                    .toArray();
                    
                if (oldRecords.length > 0) {
                    const oldIds = oldRecords.map(r => r._id);
                    await this.db.collection('check_history').deleteMany({
                        _id: { $in: oldIds }
                    });
                }
            }
        } catch (error) {
            console.error("Database update failed:", error.message);
            throw error; // Re-throw to see the actual error
        }
    }

    async getStatus(website = null) {
        await this.connect();
        
        if (!this.connected) {
            // Fallback to in-memory
            if (website) {
                return this.fallbackStorage.get(website);
            }
            return Array.from(this.fallbackStorage.entries());
        }

        try {
            if (website) {
                return await this.db.collection('website_status').findOne({ website });
            }
            const statuses = await this.db.collection('website_status').find({}).toArray();
            return statuses.map(status => [status.website, status]);
        } catch (error) {
            console.error('Database read failed:', error.message);
            return website ? null : [];
        }
    }

    async calculateUptime(website) {
        await this.connect();
        
        if (!this.connected) {
            return 95; // Default fallback
        }

        try {
            // Get last 20 checks
            const recentChecks = await this.db.collection('check_history')
                .find({ website })
                .sort({ createdAt: -1 })
                .limit(20)
                .toArray();

            if (recentChecks.length === 0) return 0;

            const upChecks = recentChecks.filter(check => check.status === "up").length;
            return Math.round((upChecks / recentChecks.length) * 100);
        } catch (error) {
            console.error('Uptime calculation failed:', error.message);
            return 95;
        }
    }

    async close() {
        if (this.client) {
            await this.client.close();
            this.connected = false;
        }
    }
}

module.exports = new MongoStorage();