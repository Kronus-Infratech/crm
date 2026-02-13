const { getReportingData, generateReportPDF } = require('../services/reportService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Download Organization Report PDF
 * @route   GET /api/reports/download
 * @access  Private (Admin/Executive/Director)
 */
const downloadReport = async (req, res, next) => {
    try {
        const { startDate, endDate, salesmanId, vectors } = req.query;

        const data = await getReportingData({ startDate, endDate, salesmanId });
        const vectorList = vectors ? vectors.split(',') : ['orgStats', 'rankings', 'agentMetrics', 'feedback'];
        const pdfBuffer = await generateReportPDF(data, vectorList);

        // Naming scheme: [Date]_[Time]_[Timeline].pdf
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        const timelineStr = data.filterInfo.replace(/\s+/g, '_').replace(/[\/\\]/g, '-');
        
        const filename = `Kronus_Report_${dateStr}_${timeStr}_${timelineStr}.pdf`;

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': pdfBuffer.length
        });

        res.status(HTTP_STATUS.OK).send(pdfBuffer);
    } catch (error) {
        console.error('Report download failed:', error);
        next(error);
    }
};

module.exports = {
    downloadReport
};
