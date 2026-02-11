const prisma = require('../config/database');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { ROLES } = require('../config/constants');
const { formatDate } = require('../utils/dateUtils');

/**
 * Aggregates reporting data based on filters
 */
const getReportingData = async (filters = {}) => {
    const { startDate, endDate, salesmanId } = filters;

    // Normalize dates to full days
    let rangeStart = startDate ? new Date(startDate) : null;
    let rangeEnd = endDate ? new Date(endDate) : null;
    if (rangeStart) rangeStart.setHours(0, 0, 0, 0);
    if (rangeEnd) rangeEnd.setHours(23, 59, 59, 999);

    const now = new Date();

    // Build highly inclusive filter to get all relevant leads in one pass
    const leadWhere = {
        OR: []
    };

    if (rangeStart && rangeEnd) {
        leadWhere.OR.push({ createdAt: { gte: rangeStart, lte: rangeEnd } });
        leadWhere.OR.push({ followUpDate: { gte: rangeStart, lte: rangeEnd } });
    }

    // Always include leads with future follow-ups for pipeline health metrics
    leadWhere.OR.push({ followUpDate: { gt: now } });

    // If no range, just get everything
    if (leadWhere.OR.length === 0) delete leadWhere.OR;

    if (salesmanId && salesmanId !== 'all') {
        leadWhere.assignedToId = salesmanId;
    }

    // Fetch all relevant leads
    const allLeads = await prisma.lead.findMany({
        where: leadWhere,
        select: {
            status: true,
            budgetTo: true,
            feedbackRating: true,
            assignedToId: true,
            createdAt: true,
            followUpDate: true
        }
    });

    const userWhere = {
        roles: { hasSome: [ROLES.SALESMAN] },
        isActive: true
    };
    if (salesmanId && salesmanId !== 'all') {
        userWhere.id = salesmanId;
    }

    // Fetch involved salesmen
    const salesmen = await prisma.user.findMany({
        where: userWhere,
        select: {
            id: true,
            name: true,
            email: true
        }
    });

    const processLeads = (leads) => {
        // 1. Growth Metrics: Based on leads CREATED in the period
        const growthLeads = rangeStart && rangeEnd
            ? leads.filter(l => l.createdAt >= rangeStart && l.createdAt <= rangeEnd)
            : leads;

        const total = growthLeads.length;
        const won = growthLeads.filter(l => l.status === 'CONVERTED').length;
        const lost = growthLeads.filter(l => l.status === 'NOT_CONVERTED').length;
        const pipelineValue = growthLeads
            .filter(l => !['CONVERTED', 'NOT_CONVERTED'].includes(l.status))
            .reduce((sum, l) => sum + (l.budgetTo || 0), 0);

        // Feedback calculation
        const ratedLeads = growthLeads.filter(l => l.feedbackRating !== null);
        const avgRatingValue = ratedLeads.length > 0
            ? (ratedLeads.reduce((sum, l) => sum + l.feedbackRating, 0) / ratedLeads.length).toFixed(1)
            : "N/A";

        // 2. Activity Metrics: Based on ANY lead with a follow-up scheduled IN the period
        const periodFollowUps = rangeStart && rangeEnd
            ? leads.filter(l => l.followUpDate && new Date(l.followUpDate) >= rangeStart && new Date(l.followUpDate) <= rangeEnd).length
            : leads.filter(l => l.followUpDate).length;

        // 3. Pipeline Metrics: Based on ANY lead with a follow-up scheduled in the FUTURE (from now)
        const futureFollowUps = leads.filter(l => l.followUpDate && new Date(l.followUpDate) > now).length;

        return {
            total,
            won,
            lost,
            pipelineValue,
            closeRate: total > 0 ? ((won / total) * 100).toFixed(1) : "0.0",
            loseRate: total > 0 ? ((lost / total) * 100).toFixed(1) : "0.0",
            avgRating: avgRatingValue,
            futureFollowUps,
            periodFollowUps
        };
    };

    const orgStats = processLeads(allLeads);
    const salesmanStats = salesmen.map(s => {
        const userLeads = allLeads.filter(l => l.assignedToId === s.id);
        return {
            name: s.name,
            email: s.email,
            ...processLeads(userLeads)
        };
    }).sort((a, b) => b.total - a.total);

    return {
        orgStats,
        salesmanStats,
        generatedAt: now.toLocaleString(),
        filterInfo: rangeStart && rangeEnd ? `${formatDate(rangeStart)} to ${formatDate(rangeEnd)}` : "Lifetime"
    };
};

/**
 * Generates PDF buffer using Puppeteer
 */
const generateReportPDF = async (data, vectorList = []) => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    const vectors = {
        orgStats: vectorList.includes('orgStats'),
        rankings: vectorList.includes('rankings'),
        agentMetrics: vectorList.includes('agentMetrics'),
        feedback: vectorList.includes('feedback')
    };

    // Fetch logo from frontend URL for maximum compatibility
    let logoBase64 = '';
    const logoUrl = `${process.env.FRONTEND_URL}/logo.png`;

    try {
        const axios = require('axios');
        const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
        logoBase64 = `data:image/png;base64,${Buffer.from(response.data, 'binary').toString('base64')}`;
    } catch (err) {
        console.error('Failed to fetch logo for PDF via HTTP:', err.message);
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            body { 
                font-family: 'Inter', sans-serif; 
                margin: 0; 
                padding: 0; 
                color: #1e293b;
                line-height: 1.5;
            }
            .page {
                padding: 60px;
                page-break-after: always;
                position: relative;
                width: 100%;
            }
            .page:last-child {
                page-break-after: auto !important;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 40px;
                border-bottom: 4px solid #009688;
                padding-bottom: 20px;
            }
            .logo-img { height: 50px; }
            .report-title {
                text-align: right;
            }
            .report-title h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 900;
                text-transform: uppercase;
                letter-spacing: 2px;
                color: #009688;
            }
            .report-title p {
                margin: 5px 0 0;
                font-size: 12px;
                font-weight: 700;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .section-title {
                font-size: 18px;
                font-weight: 900;
                text-transform: uppercase;
                margin-bottom: 30px;
                color: #1e293b;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .section-title::before {
                content: "";
                width: 4px;
                height: 24px;
                background: #009688;
                display: inline-block;
                border-radius: 2px;
            }
            .grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 40px;
            }
            .metric-card {
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
            }
            .metric-label {
                font-size: 10px;
                font-weight: 900;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 10px;
            }
            .metric-value {
                font-size: 28px;
                font-weight: 900;
                color: #1e293b;
            }
            .metric-value.highlight { color: #009688; }
            .metric-value.secondary { color: #8dc63f; }
            .metric-value.warning { color: #fbb03b; }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
            th {
                background: #f1f5f9;
                text-align: left;
                padding: 12px;
                font-size: 10px;
                font-weight: 900;
                text-transform: uppercase;
                color: #64748b;
                border-bottom: 2px solid #e2e8f0;
            }
            td {
                padding: 12px;
                font-size: 13px;
                border-bottom: 1px solid #f1f5f9;
            }
            .salesman-page-header {
                background: #4a4a4a;
                color: white;
                padding: 40px;
                border-radius: 20px;
                margin-bottom: 40px;
            }
            .salesman-name {
                font-size: 32px;
                font-weight: 900;
                margin: 0;
                letter-spacing: -1px;
            }
            .salesman-email {
                font-size: 14px;
                font-weight: 700;
                color: #8dc63f;
                margin-top: 5px;
            }
            .thank-you {
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
            }
            .thank-you h1 {
                font-size: 48px;
                font-weight: 900;
                color: #009688;
                margin-bottom: 20px;
            }
            .footer-info {
                position: absolute;
                bottom: 40px;
                left: 60px;
                right: 60px;
                text-align: center;
                font-size: 10px;
                font-weight: 700;
                color: #94a3b8;
                border-top: 1px solid #f1f5f9;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <!-- Page 1: Org Wide -->
        ${vectors.orgStats || vectors.rankings ? `
        <div class="page">
            <div class="header">
                <img src="${logoBase64}" class="logo-img" />
                <div class="report-title">
                    <h1>Organization Report</h1>
                    <p>${data.filterInfo}</p>
                </div>
            </div>

            ${vectors.orgStats ? `
            <div class="section-title">Collective Performance</div>
            <div class="grid">
                <div class="metric-card">
                    <div class="metric-label">Total Leads</div>
                    <div class="metric-value highlight">${data.orgStats.total}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Pipeline Value</div>
                    <div class="metric-value secondary">₹${data.orgStats.pipelineValue.toLocaleString()}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg. Close Rate</div>
                    <div class="metric-value highlight">${data.orgStats.closeRate}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Follow-ups in Period</div>
                    <div class="metric-value highlight">${data.orgStats.periodFollowUps}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Future Follow-ups</div>
                    <div class="metric-value secondary">${data.orgStats.futureFollowUps}</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Avg. Customer Rating</div>
                    <div class="metric-value warning">${data.orgStats.avgRating} ★</div>
                </div>
            </div>
            ` : ''}

            ${vectors.rankings ? `
            <div class="section-title">Salesman Rankings</div>
            <table>
                <thead>
                    <tr>
                        <th>Agent Name</th>
                        <th>Leads</th>
                        <th>Wins</th>
                        <th>Period F/U</th>
                        <th>Total F/U</th>
                        <th>Win Rate</th>
                        <th>Rating</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.salesmanStats.map(s => `
                        <tr>
                            <td style="font-weight: 700;">${s.name}</td>
                            <td>${s.total}</td>
                            <td style="color: #16a34a; font-weight: 700;">${s.won}</td>
                            <td style="color: #009688;">${s.periodFollowUps}</td>
                            <td style="color: #8dc63f;">${s.futureFollowUps}</td>
                            <td style="font-weight: 700;">${s.closeRate}%</td>
                            <td style="color: #fbb03b;">${s.avgRating} ★</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ` : ''}
        </div>
        ` : ''}

        <!-- Page 2 to N+1: Salesmen -->
        ${vectors.agentMetrics ? data.salesmanStats.map(s => `
            <div class="page">
                <div class="header">
                    <img src="${logoBase64}" class="logo-img" />
                    <div class="report-title">
                        <h1>Agent Report</h1>
                        <p>${data.filterInfo}</p>
                    </div>
                </div>

                <div class="salesman-page-header">
                    <h2 class="salesman-name">${s.name}</h2>
                    <p class="salesman-email">${s.email}</p>
                </div>

                <div class="section-title">Individual Metrics</div>
                <div class="grid">
                    <div class="metric-card">
                        <div class="metric-label">Assigned Leads</div>
                        <div class="metric-value">${s.total}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Conversion Rate</div>
                        <div class="metric-value highlight">${s.closeRate}%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Leads Won</div>
                        <div class="metric-value secondary">${s.won}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Leads Lost</div>
                        <div class="metric-value" style="color: #dc2626;">${s.lost}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Pipeline Value</div>
                        <div class="metric-value secondary">₹${s.pipelineValue.toLocaleString()}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Follow-ups in Period</div>
                        <div class="metric-value highlight">${s.periodFollowUps}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Future Follow-ups</div>
                        <div class="metric-value highlight">${s.futureFollowUps}</div>
                    </div>
                    ${vectors.feedback ? `
                    <div class="metric-card">
                        <div class="metric-label">Customer Feedback</div>
                        <div class="metric-value warning">${s.avgRating} ★</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `).join('') : ''}

        <!-- Final Page: Thank You -->
        <div class="page">
            <div class="thank-you">
                <img src="${logoBase64}" style="height: 100px; margin-bottom: 40px;" />
                <h1>Thank You</h1>
                <p style="font-size: 18px; color: #64748b; font-weight: 700; max-width: 400px; margin: 0 auto;">
                    We are building the future of Real Estate at Kronus Infratech. 
                    This report represents the collective hard work of our entire team.
                </p>
                <div style="margin-top: 60px; width: 60px; height: 4px; background: #8dc63f; border-radius: 2px;"></div>
            </div>
            <div class="footer-info">
                © ${new Date().getFullYear()} Kronus Infratech & Consultants
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
    });

    await browser.close();
    return pdfBuffer;
};

module.exports = {
    getReportingData,
    generateReportPDF
};
