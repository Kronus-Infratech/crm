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

        const filename = `Kronus_Report_${new Date().toISOString().split('T')[0]}.pdf`;

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
