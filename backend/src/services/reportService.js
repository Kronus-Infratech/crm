const prisma = require('../config/database');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const path = require('path');
const fs = require('fs');
const { ROLES } = require('../config/constants');
const { formatDate } = require('../utils/dateUtils');

/**
 * Aggregates reporting data based on filters
 */
const getReportingData = async (filters = {}) => {
    try {
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

        if (salesmanId && salesmanId !== 'all' && salesmanId) {
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
        if (salesmanId && salesmanId !== 'all' && salesmanId) {
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
    } catch (error) {
        console.error('Error in getReportingData:', error);
        throw error;
    }
};

/**
 * Generates PDF buffer using jsPDF
 */
const generateReportPDF = async (data, vectorList = []) => {
    console.log(`[ReportGenerator] Generating PDF using jsPDF...`);

    const doc = new jsPDF();
    const vectors = {
        orgStats: vectorList.includes('orgStats'),
        rankings: vectorList.includes('rankings'),
        agentMetrics: vectorList.includes('agentMetrics'),
        feedback: vectorList.includes('feedback')
    };

    // Helper for center-aligned text
    const centerText = (text, y, fontSize = 12, color = [30, 41, 59]) => {
        doc.setFontSize(fontSize);
        doc.setTextColor(color[0], color[1], color[2]);
        const textWidth = doc.getTextWidth(text);
        const x = (doc.internal.pageSize.getWidth() - textWidth) / 2;
        doc.text(text, x, y);
    };

    const pageWidth = doc.internal.pageSize.getWidth();

    // Add Logo (LEFT aligned)
    const logoUrl = `${process.env.FRONTEND_URL}/logo.png`;
    try {
        const axios = require('axios');
        const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
        const logoBase64 = Buffer.from(response.data, 'binary').toString('base64');
        doc.addImage(logoBase64, 'PNG', 15, 10, 70, 20); // x, y, width, height
    } catch (err) {
        console.warn('Failed to fetch logo for PDF:', err.message);
    }

    // RIGHT ALIGNED TEXT
    const rightMargin = 15;
    const rightX = pageWidth - rightMargin;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(0, 150, 136);

    doc.text("Organization Report", rightX, 20, { align: "right" });

    // Subtext
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);

    doc.text(data.filterInfo, rightX, 26, { align: "right" });
    doc.text(`Generated on: ${data.generatedAt}`, rightX, 31, { align: "right" });


    // // Add Logo if available
    // const logoUrl = `${process.env.FRONTEND_URL}/logo.png`;
    // try {
    //     const axios = require('axios');
    //     const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
    //     const logoBase64 = Buffer.from(response.data, 'binary').toString('base64');
    //     doc.addImage(logoBase64, 'PNG', 15, 10, 70, 20); // x, y, width, height
    // } catch (err) {
    //     console.warn('Failed to fetch logo for PDF:', err.message);
    // }

    // // Title Section
    // doc.setFont("helvetica", "bold");
    // doc.setFontSize(24);
    // doc.setTextColor(0, 150, 136); // Teal color matching CSS
    // doc.text("Organization Report", 50, 20);

    // doc.setFontSize(10);
    // doc.setTextColor(100, 116, 139);
    // doc.text(data.filterInfo, 50, 26);
    // doc.text(`Generated on: ${data.generatedAt}`, 50, 31);

    doc.setDrawColor(0, 150, 136);
    doc.setLineWidth(1);
    doc.line(15, 40, 195, 40);

    let currentY = 55;

    // 1. Organization Stats
    if (vectors.orgStats) {
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("Collective Performance", 15, currentY);
        currentY += 10;

        const stats = [
            ["Total Leads", data.orgStats.total.toString()],
            ["Pipeline Value", `INR ${data.orgStats.pipelineValue.toLocaleString()}`],
            ["Avg. Close Rate", `${data.orgStats.closeRate}%`],
            ["Period Follow-ups", data.orgStats.periodFollowUps.toString()],
            ["Future Follow-ups", data.orgStats.futureFollowUps.toString()],
            ["Avg. Customer Rating", `${data.orgStats.avgRating} / 5.0`]
        ];

        autoTable(doc, {
            startY: currentY,
            head: [['Metric', 'Value']],
            body: stats,
            theme: 'striped',
            headStyles: { fillStyle: [0, 150, 136] },
            margin: { left: 15, right: 15 }
        });
        currentY = doc.lastAutoTable.finalY + 20;
    }

    // 2. Salesman Rankings
    if (vectors.rankings) {
        if (currentY > 200) { doc.addPage(); currentY = 20; }

        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("Salesman Rankings", 15, currentY);
        currentY += 10;

        const tableBody = data.salesmanStats.map((s, index) => [
            `#${index + 1}`,
            s.name,
            s.total.toString(),
            s.won.toString(),
            `${s.closeRate}%`,
            s.periodFollowUps.toString(),
            `${s.avgRating} *`
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Rank', 'Name', 'Leads', 'Wins', 'Rate', 'F/U', 'Rating']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [0, 150, 136] },
            margin: { left: 15, right: 15 }
        });
        currentY = doc.lastAutoTable.finalY + 20;
    }

    // 3. Agent Detailed Metrics
    if (vectors.agentMetrics) {
        for (const s of data.salesmanStats) {
            doc.addPage();

            // Header for agent page
            doc.setFontSize(22);
            doc.setTextColor(0, 150, 136);
            doc.text(`Agent Performance: ${s.name}`, 15, 25);

            doc.setFontSize(11);
            doc.setTextColor(100, 116, 139);
            doc.text(s.email, 15, 32);

            doc.line(15, 40, 195, 40);

            const agentStats = [
                ["Metric", "Value"],
                ["Total Assigned Leads", s.total.toString()],
                ["Leads Won (Converted)", s.won.toString()],
                ["Leads Lost", s.lost.toString()],
                ["Win Rate", `${s.closeRate}%`],
                ["Pipeline Potential", `INR ${s.pipelineValue.toLocaleString()}`],
                ["Follow-ups in Period", s.periodFollowUps.toString()],
                ["Future Scheduled Follow-ups", s.futureFollowUps.toString()],
                ["Avg. Customer Rating", `${s.avgRating} / 5.0`]
            ];

            autoTable(doc, {
                startY: 50,
                body: agentStats,
                theme: 'plain',
                styles: { fontSize: 12, cellPadding: 5 },
                columnStyles: { 0: { fontStyle: 'bold', width: 80 } },
                margin: { left: 15 }
            });
        }
    }

    // Footer on all pages (simplified)
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Kronus CRM Performance Report | Page ${i} of ${pageCount}`, 15, 285);
    }

    const pdfArrayBuffer = doc.output("arraybuffer");
    return Buffer.from(pdfArrayBuffer);
};

module.exports = {
    getReportingData,
    generateReportPDF
};
