const axios = require('axios');
const prisma = require('../config/database');
const { ROLES } = require('../config/constants');

/**
 * Service to sync leads from MagicBricks via polling
 */
class MagicBricksService {
  constructor() {
    this.apiUrl = process.env.MAGICBRICKS_URL;
    this.apiKey = process.env.MAGICBRICKS_API_KEY;
  }

  /**
   * Fetch leads from MagicBricks for a specific date range
   * @param {Date} fromDate 
   * @param {Date} toDate 
   * @param {number} page 
   */
  async fetchLeads(fromDate, toDate, page = 1) {
    if (!this.apiUrl || !this.apiKey) {
      console.warn('[MagicBricks] Missing configuration. Skipping sync.');
      return null;
    }

    // Format dates as required (assuming YYYY-MM-DD or standard ISO, based on typical APIs, 
    // but the spec didn't specify format. Using YYYYMMDD is common for these providers, 
    // but let's stick to standard YYYY-MM-DD for now or just pass ISO string.
    // Spec says params: { from_date, to_date ... }
    // Let's assume YYYY-MM-DD based on "lead_date" typically being a date.
    
    // Actually, let's use a safe format like YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          from_date: formatDate(fromDate),
          to_date: formatDate(toDate),
          page_no: page
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000 // 10s timeout
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[MagicBricks] API Error:', error.message);
      if (error.response) {
        console.error('[MagicBricks] Response:', error.response.data);
      }
      return null;
    }
  }

  /**
   * Main sync function called by cron
   */
  async syncLeads() {
    console.log('[MagicBricks] Starting lead sync...');
    
    // 1. Determine time range (last 2 hours to be safe)
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setHours(fromDate.getHours() - 2);

    // 2. Find system user for creation
    const systemUser = await prisma.user.findFirst({
      where: { roles: { has: ROLES.ADMIN } },
    });

    if (!systemUser) {
      console.error('[MagicBricks] No admin user found to attribute leads to.');
      return;
    }

    let currentPage = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      const data = await this.fetchLeads(fromDate, toDate, currentPage);
      
      if (!data || !data.data || !Array.isArray(data.data)) {
        console.log('[MagicBricks] No data received or invalid format.');
        break;
      }

      const leads = data.data;
      console.log(`[MagicBricks] Processing page ${currentPage}, found ${leads.length} leads.`);

      for (const mbLead of leads) {
        await this.processLead(mbLead, systemUser.id);
      }

      totalSynced += leads.length;

      // Check pagination
      if (currentPage < data.total_pages) {
        currentPage++;
      } else {
        hasMore = false;
      }

      // Safety break
      if (currentPage > 20) break; 
    }

    console.log(`[MagicBricks] Sync complete. Processed ${totalSynced} leads.`);
  }

  /**
   * Process a single lead
   */
  async processLead(mbLead, creatorId) {
    try {
      // 1. Basic validation
      if (!mbLead.phone || !mbLead.name) {
        return;
      }

      // 2. Check for duplicate (Phone + Source)
      // Check if lead already exists with this phone number
      const existingLead = await prisma.lead.findFirst({
        where: {
          phone: mbLead.phone,
          source: 'MAGICBRICKS' // Strict check on source
        }
      });

      if (existingLead) {
        // Skip duplicate
        return;
      }

      // 3. Map Data
      // MagicBricks fields: locality, budget, society, name, phone, email, lead_date, bhk
      let propertyName = mbLead.society || mbLead.locality || 'Unknown Property';
      if (mbLead.bhk) propertyName += ` (${mbLead.bhk})`;

      await prisma.lead.create({
        data: {
          name: mbLead.name,
          phone: mbLead.phone,
          email: mbLead.email || null, // Might be null
          source: 'MAGICBRICKS',
          status: 'NEW',
          priority: 'MEDIUM', // Default
          property: propertyName,
          value: mbLead.budget ? parseFloat(mbLead.budget) : null,
          createdById: creatorId,
          // We can try to use lead_date if available, else now()
          createdAt: mbLead.lead_date ? new Date(mbLead.lead_date) : new Date(),
        }
      });

    } catch (error) {
       console.error(`[MagicBricks] Failed to process lead ${mbLead.phone}:`, error.message);
    }
  }
}

module.exports = new MagicBricksService();
