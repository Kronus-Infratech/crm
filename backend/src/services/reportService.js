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
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    const vectors = {
        orgStats: vectorList.includes('orgStats'),
        rankings: vectorList.includes('rankings'),
        agentMetrics: vectorList.includes('agentMetrics'),
        feedback: vectorList.includes('feedback')
    };

    // --- Pre-fetch Logo (fetch once, use everywhere) ---
    let logoBase64 = null;
    try {
        const axios = require('axios');
        const response = await axios.get(`${process.env.FRONTEND_URL}/logo.png`, { responseType: 'arraybuffer' });
        logoBase64 = Buffer.from(response.data, 'binary').toString('base64');
    } catch (err) {
        // Silent fail for logo
    }

    // --- Helper Functions ---
    const drawCard = (x, y, w, h, label, value, color = [0, 150, 136]) => {
        doc.setFillColor(248, 250, 252); // Light gray bg
        doc.roundedRect(x, y, w, h, 3, 3, 'F');
        doc.setDrawColor(226, 232, 240); // Border color
        doc.roundedRect(x, y, w, h, 3, 3, 'D');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Gray text
        doc.text(label.toUpperCase(), x + 5, y + 10);

        doc.setFontSize(16);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(value, x + 5, y + 25);
    };

    const addHeader = (title) => {
        if (logoBase64) {
            doc.addImage(logoBase64, 'PNG', margin, 10, 60, 18);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(0, 150, 136); // Teal
        doc.text(title, pageWidth - margin, 20, { align: "right" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(data.filterInfo, pageWidth - margin, 27, { align: "right" });
        doc.text(`Generated: ${data.generatedAt}`, pageWidth - margin, 33, { align: "right" });

        doc.setDrawColor(0, 150, 136);
        doc.setLineWidth(1.5);
        doc.line(margin, 40, pageWidth - margin, 40);
    };

    // --- Page 1: Organization Overview ---
    if (vectors.orgStats || vectors.rankings) {
        addHeader("Organization Report");

        let currentY = 55;

        if (vectors.orgStats) {
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text("Collective Performance", margin, currentY);
            currentY += 10;

            const cardW = (pageWidth - (margin * 2) - 10) / 2;
            const cardH = 35;

            drawCard(margin, currentY, cardW, cardH, "Total Leads", data.orgStats.total.toString());
            drawCard(margin + cardW + 10, currentY, cardW, cardH, "Pipeline Potential", `INR ${data.orgStats.pipelineValue.toLocaleString()}`, [141, 198, 63]);
            currentY += cardH + 10;

            drawCard(margin, currentY, cardW, cardH, "Conversion Rate", `${data.orgStats.closeRate}%`);
            drawCard(margin + cardW + 10, currentY, cardW, cardH, "Avg. Feedback", `${data.orgStats.avgRating} / 5.0`, [251, 176, 59]);
            currentY += cardH + 10;

            drawCard(margin, currentY, cardW, cardH, "Follow-ups in Period", data.orgStats.periodFollowUps.toString());
            drawCard(margin + cardW + 10, currentY, cardW, cardH, "Future Growth Pipeline", data.orgStats.futureFollowUps.toString(), [141, 198, 63]);
            currentY += cardH + 15;
        }

        if (vectors.rankings) {
            // if (currentY > 200) { doc.addPage(); currentY = 20; }
            doc.setFontSize(14);
            doc.setTextColor(30, 41, 59);
            doc.text("Salesman Rankings", margin, currentY);
            currentY += 8;

            autoTable(doc, {
                startY: currentY,
                head: [['Rank', 'Name', 'Leads', 'Wins', 'Rate', 'F/U']],
                body: data.salesmanStats.map((s, i) => [`#${i + 1}`, s.name, s.total, s.won, `${s.closeRate}%`, s.periodFollowUps]),
                theme: 'striped',
                headStyles: { fillColor: [0, 150, 136], fontStyle: 'bold' },
                styles: { fontSize: 9 },
                margin: { left: margin, right: margin }
            });
            currentY = doc.lastAutoTable.finalY + 20;
        }
    }

    // --- Agent Detail Pages ---
    if (vectors.agentMetrics) {
        for (const s of data.salesmanStats) {
            doc.addPage();
            addHeader("Agent Performance");

            doc.setFontSize(18);
            doc.setTextColor(30, 41, 59);
            doc.text(s.name, margin, 55);
            doc.setFontSize(10);
            doc.setTextColor(141, 198, 63);
            doc.text(s.email, margin, 61);

            let agentY = 70;
            const cardW = (pageWidth - (margin * 2) - 10) / 2;
            const cardH = 30;

            drawCard(margin, agentY, cardW, cardH, "Assigned Leads", s.total.toString());
            drawCard(margin + cardW + 10, agentY, cardW, cardH, "Leads Won", s.won.toString(), [141, 198, 63]);
            agentY += cardH + 10;

            drawCard(margin, agentY, cardW, cardH, "Conversion Rate", `${s.closeRate}%`);
            drawCard(margin + cardW + 10, agentY, cardW, cardH, "Pipeline Value", `INR ${s.pipelineValue.toLocaleString()}`, [141, 198, 63]);
            agentY += cardH + 10;

            drawCard(margin, agentY, cardW, cardH, "Follow-ups in Period", s.periodFollowUps.toString());
            drawCard(margin + cardW + 10, agentY, cardW, cardH, "Future Growth Pipeline", s.futureFollowUps.toString(), [141, 198, 63]);
            agentY += cardH + 10;

            drawCard(margin, agentY, cardW, cardH, "Customer Rating", `${s.avgRating} *`, [251, 176, 59]);
            drawCard(margin + cardW + 10, agentY, cardW, cardH, "Leads Lost", s.lost.toString(), [220, 38, 38]);
        }
    }

    // --- Page: Thank You ---
    doc.addPage();
    doc.setFillColor(0, 150, 136);
    doc.rect(0, 0, pageWidth, 60, 'F');

    const midX = pageWidth / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(255, 255, 255);
    doc.text("Thank You", midX, 40, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    const msg = [
        "This report represents the collective hard work of our team.",
        "We are building the future of Real Estate at Kronus Infratech.",
        "Accuracy and integrity are at the heart of our operations."
    ];
    doc.text(msg.join("\n"), midX, 100, { align: "center", lineHeightFactor: 1.5 });

    if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', midX - 40, 150, 80, 24);
    }

    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`© ${new Date().getFullYear()} Kronus Infratech & Consultants`, midX, pageHeight - 20, { align: "center" });

    // --- Pagination ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    return Buffer.from(doc.output("arraybuffer"));
};

module.exports = {
    getReportingData,
    generateReportPDF
};
