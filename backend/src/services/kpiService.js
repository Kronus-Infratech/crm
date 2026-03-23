const prisma = require('../config/database');
const { ROLES } = require('../config/constants');

const QUARTER_MONTHS = [0, 3, 6, 9];
const KPI_TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 330;

const getDatePartsInTimezone = (date, timeZone = KPI_TIMEZONE) => {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(date);

    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);

    return { year, month, day };
};

const istToUtcDate = (year, monthIndex, day, hour = 0, minute = 0, second = 0, ms = 0) => {
    const utcMs = Date.UTC(year, monthIndex, day, hour, minute, second, ms) - (IST_OFFSET_MINUTES * 60 * 1000);
    return new Date(utcMs);
};

const getQuarterBoundariesForKey = (year, quarterNumber) => {
    const startMonth = (quarterNumber - 1) * 3;
    const quarterStart = istToUtcDate(year, startMonth, 1, 0, 0, 0, 0);
    // Day 0 of next quarter gives last day of current quarter in JS date arithmetic
    const quarterEnd = istToUtcDate(year, startMonth + 3, 0, 23, 59, 59, 999);

    return {
        quarterStart,
        quarterEnd,
        quarterKey: `${year}-Q${quarterNumber}`,
        quarterNumber,
        year
    };
};

const getQuarterRange = (date = new Date()) => {
    const { year, month } = getDatePartsInTimezone(date, KPI_TIMEZONE);
    const quarterNumber = Math.floor((month - 1) / 3) + 1;
    return getQuarterBoundariesForKey(year, quarterNumber);
};

const getQuarterRangeFromKey = (quarterKey) => {
    const match = String(quarterKey || '').match(/^(\d{4})-Q([1-4])$/);
    if (!match) {
        return getQuarterRange(new Date());
    }

    const year = Number(match[1]);
    const q = Number(match[2]);
    return getQuarterBoundariesForKey(year, q);
};

const toDateKey = (d) => {
    const { year, month, day } = getDatePartsInTimezone(new Date(d), KPI_TIMEZONE);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const mapSiteVisitScore = (ratePercent) => {
    if (ratePercent > 25) return 25;
    if (ratePercent >= 18) return 20;
    if (ratePercent >= 10) return 12;
    return 6;
};

const mapLeadResponseScore = (ratePercent) => {
    if (ratePercent > 95) return 10;
    if (ratePercent >= 85) return 8;
    if (ratePercent >= 70) return 5;
    return 2;
};

const mapFollowUpScore = (ratePercent) => {
    if (ratePercent > 90) return 10;
    if (ratePercent >= 75) return 7;
    if (ratePercent >= 60) return 4;
    return 2;
};

const mapMissedFollowUpPenalty = (missedCount) => {
    if (missedCount > 5) return 10;
    if (missedCount >= 3) return 5;
    if (missedCount >= 1) return 2;
    return 0;
};

const clampScore = (value) => {
    if (value < 0) return 0;
    if (value > 100) return 100;
    return value;
};

const getSalesUsers = async () => prisma.user.findMany({
    where: {
        isActive: true,
        roles: { has: ROLES.SALESMAN }
    },
    select: { id: true, name: true, email: true }
});

const getQuarterTarget = async (userId, quarterKey, quarterStart, quarterEnd) => {
    const target = await prisma.quarterlySalesTarget.findUnique({
        where: { userId_quarterKey: { userId, quarterKey } },
        select: { targetRevenue: true }
    });

    if (target) return target.targetRevenue || 0;

    await prisma.quarterlySalesTarget.create({
        data: {
            userId,
            quarterKey,
            quarterStart,
            quarterEnd,
            targetRevenue: 0
        }
    });

    return 0;
};

const calculateKPIForUser = async ({ userId, quarterStart, quarterEnd, quarterKey }) => {
    const targetRevenue = await getQuarterTarget(userId, quarterKey, quarterStart, quarterEnd);

    const leads = await prisma.lead.findMany({
        where: {
            assignedToId: userId,
            createdAt: { gte: quarterStart, lte: quarterEnd }
        },
        select: {
            id: true,
            createdAt: true,
            followUpDate: true,
            status: true,
            updatedAt: true,
            budgetTo: true
        }
    });

    const leadIds = leads.map((l) => l.id);

    const activities = leadIds.length > 0
        ? await prisma.activity.findMany({
            where: {
                leadId: { in: leadIds },
                userId,
                type: { in: ['CALL', 'MEETING', 'EMAIL', 'FOLLOW_UP'] },
                date: { lte: quarterEnd }
            },
            select: { leadId: true, type: true, date: true }
        })
        : [];

    const siteVisits = await prisma.event.count({
        where: {
            userId,
            type: 'SITE_VISIT',
            start: { gte: quarterStart, lte: quarterEnd }
        }
    });

    const byLead = new Map();
    for (const a of activities) {
        if (!byLead.has(a.leadId)) byLead.set(a.leadId, []);
        byLead.get(a.leadId).push(a);
    }

    let leadsContacted24h = 0;
    let leadsAged48h = 0;

    for (const lead of leads) {
        const list = byLead.get(lead.id) || [];
        const contactActs = list
            .filter((a) => ['CALL', 'MEETING', 'EMAIL', 'FOLLOW_UP'].includes(a.type))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        if (contactActs.length === 0) {
            leadsAged48h += 1;
            continue;
        }

        const firstContact = new Date(contactActs[0].date).getTime();
        const createdAt = new Date(lead.createdAt).getTime();
        const within24h = firstContact <= createdAt + (24 * 60 * 60 * 1000);
        const within48h = firstContact <= createdAt + (48 * 60 * 60 * 1000);

        if (within24h) leadsContacted24h += 1;
        if (!within48h) leadsAged48h += 1;
    }

    const scheduledLeads = leads.filter((l) => l.followUpDate && new Date(l.followUpDate) >= quarterStart && new Date(l.followUpDate) <= quarterEnd);
    const scheduledFollowUps = scheduledLeads.length;

    let completedFollowUps = 0;
    for (const lead of scheduledLeads) {
        const dueKey = toDateKey(lead.followUpDate);
        const list = (byLead.get(lead.id) || []).filter((a) => a.type === 'FOLLOW_UP');
        const done = list.some((a) => toDateKey(a.date) === dueKey);
        if (done) completedFollowUps += 1;
    }

    const missedFollowUps = Math.max(0, scheduledFollowUps - completedFollowUps);

    const dealsClosedLeads = leads.filter((l) => l.status === 'CONVERTED' && new Date(l.updatedAt) >= quarterStart && new Date(l.updatedAt) <= quarterEnd);
    const dealsClosed = dealsClosedLeads.length;
    const revenueClosed = dealsClosedLeads.reduce((sum, l) => sum + (l.budgetTo || 0), 0);

    const closureScore = targetRevenue > 0 ? Math.min(55, (revenueClosed / targetRevenue) * 55) : 0;
    const closureBonus = targetRevenue > 0 && revenueClosed > (targetRevenue * 1.2) ? 10 : 0;

    const conversionRatePercent = siteVisits > 0 ? (dealsClosed / siteVisits) * 100 : 0;
    const siteVisitScore = siteVisits > 0 ? mapSiteVisitScore(conversionRatePercent) : 0;

    const responseRatePercent = leads.length > 0 ? (leadsContacted24h / leads.length) * 100 : 0;
    const leadResponseScore = leads.length > 0 ? mapLeadResponseScore(responseRatePercent) : 0;

    const followUpCompliancePercent = scheduledFollowUps > 0 ? (completedFollowUps / scheduledFollowUps) * 100 : 0;
    const followUpComplianceScore = scheduledFollowUps > 0 ? mapFollowUpScore(followUpCompliancePercent) : 0;

    const missedFollowUpPenalty = mapMissedFollowUpPenalty(missedFollowUps);
    const leadAgingPenalty = leadsAged48h;
    const totalPenalties = missedFollowUpPenalty + leadAgingPenalty;

    const rawFinal = closureScore + closureBonus + siteVisitScore + leadResponseScore + followUpComplianceScore - totalPenalties;
    const finalScore = clampScore(rawFinal);

    const payload = {
        userId,
        quarterKey,
        quarterStart,
        quarterEnd,
        calculatedAt: new Date(),
        targetRevenue,
        revenueClosed,
        dealsClosed,
        siteVisits,
        leadsAssigned: leads.length,
        leadsContacted24h,
        leadsAged48h,
        scheduledFollowUps,
        completedFollowUps,
        missedFollowUps,
        closureScore,
        closureBonus,
        siteVisitScore,
        leadResponseScore,
        followUpComplianceScore,
        totalPenalties,
        finalScore
    };

    await prisma.salesKPIQuarterly.upsert({
        where: {
            userId_quarterKey: {
                userId,
                quarterKey
            }
        },
        create: payload,
        update: payload
    });

    return payload;
};

const recalculateQuarterKPIs = async ({ quarterKey, userIds } = {}) => {
    const q = quarterKey ? getQuarterRangeFromKey(quarterKey) : getQuarterRange(new Date());
    const salesUsers = await getSalesUsers();
    const targetUsers = userIds && userIds.length > 0
        ? salesUsers.filter((u) => userIds.includes(u.id))
        : salesUsers;

    const results = [];
    for (const user of targetUsers) {
        const r = await calculateKPIForUser({
            userId: user.id,
            quarterStart: q.quarterStart,
            quarterEnd: q.quarterEnd,
            quarterKey: q.quarterKey
        });
        results.push({ ...r, user });
    }

    return {
        quarter: q,
        count: results.length,
        results
    };
};

const getQuarterlyKPIForUser = async ({ userId, quarterKey }) => {
    const q = quarterKey ? getQuarterRangeFromKey(quarterKey) : getQuarterRange(new Date());

    await calculateKPIForUser({
        userId,
        quarterStart: q.quarterStart,
        quarterEnd: q.quarterEnd,
        quarterKey: q.quarterKey
    });

    return prisma.salesKPIQuarterly.findUnique({
        where: { userId_quarterKey: { userId, quarterKey: q.quarterKey } },
        include: {
            user: {
                select: { id: true, name: true, email: true }
            }
        }
    });
};

const getLeaderboard = async ({ quarterKey, limit = 100 } = {}) => {
    const q = quarterKey ? getQuarterRangeFromKey(quarterKey) : getQuarterRange(new Date());
    await recalculateQuarterKPIs({ quarterKey: q.quarterKey });

    const rows = await prisma.salesKPIQuarterly.findMany({
        where: { quarterKey: q.quarterKey },
        orderBy: [{ finalScore: 'desc' }, { revenueClosed: 'desc' }, { updatedAt: 'asc' }],
        take: Number(limit),
        include: {
            user: { select: { id: true, name: true, email: true } }
        }
    });

    return rows.map((r, idx) => ({
        rank: idx + 1,
        ...r
    }));
};

const getAdminSummary = async ({ quarterKey } = {}) => {
    const leaderboard = await getLeaderboard({ quarterKey, limit: 1000 });
    const avg = leaderboard.length > 0
        ? leaderboard.reduce((sum, row) => sum + (row.finalScore || 0), 0) / leaderboard.length
        : 0;

    return {
        averageSalesKPIScore: Number(avg.toFixed(2)),
        top3: leaderboard.slice(0, 3),
        bottom3: leaderboard.slice(-3).reverse()
    };
};

const upsertTargets = async ({ quarterKey, createdById, targets = [] }) => {
    const q = quarterKey ? getQuarterRangeFromKey(quarterKey) : getQuarterRange(new Date());

    const ops = targets
        .filter((t) => t.userId && Number.isFinite(Number(t.targetRevenue)))
        .map((t) => prisma.quarterlySalesTarget.upsert({
            where: { userId_quarterKey: { userId: t.userId, quarterKey: q.quarterKey } },
            create: {
                userId: t.userId,
                quarterKey: q.quarterKey,
                quarterStart: q.quarterStart,
                quarterEnd: q.quarterEnd,
                targetRevenue: Number(t.targetRevenue),
                createdById
            },
            update: {
                targetRevenue: Number(t.targetRevenue),
                createdById
            }
        }));

    await prisma.$transaction(ops);
    await recalculateQuarterKPIs({ quarterKey: q.quarterKey, userIds: targets.map((t) => t.userId) });

    return prisma.quarterlySalesTarget.findMany({
        where: { quarterKey: q.quarterKey },
        include: {
            user: { select: { id: true, name: true, email: true } }
        },
        orderBy: { updatedAt: 'desc' }
    });
};

const getTargets = async ({ quarterKey } = {}) => {
    const q = quarterKey ? getQuarterRangeFromKey(quarterKey) : getQuarterRange(new Date());

    const salesUsers = await getSalesUsers();
    const targets = await prisma.quarterlySalesTarget.findMany({
        where: { quarterKey: q.quarterKey },
        select: { userId: true, targetRevenue: true }
    });

    const targetMap = new Map(targets.map((t) => [t.userId, t.targetRevenue]));

    return salesUsers.map((u) => ({
        userId: u.id,
        name: u.name,
        email: u.email,
        targetRevenue: targetMap.get(u.id) || 0,
        quarterKey: q.quarterKey
    }));
};

module.exports = {
    getQuarterRange,
    getQuarterRangeFromKey,
    recalculateQuarterKPIs,
    getQuarterlyKPIForUser,
    getLeaderboard,
    getAdminSummary,
    upsertTargets,
    getTargets
};
