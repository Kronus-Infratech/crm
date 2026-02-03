const prisma = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Get all cities
 * @route   GET /api/inventory/cities
 * @access  Private
 */
const getCities = async (req, res, next) => {
    try {
        const cities = await prisma.city.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { projects: true }
                }
            }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: cities
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new city
 * @route   POST /api/inventory/cities
 * @access  Private (Admin/Manager)
 */
const createCity = async (req, res, next) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'City name is required'
            });
        }

        const city = await prisma.city.create({
            data: { name }
        });

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: city,
            message: 'City created successfully'
        });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'City with this name already exists'
            });
        }
        next(error);
    }
};

/**
 * @desc    Update a city
 * @route   PUT /api/inventory/cities/:id
 * @access  Private (Admin/Manager)
 */
const updateCity = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const city = await prisma.city.update({
            where: { id },
            data: { name }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: city,
            message: 'City updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a city
 * @route   DELETE /api/inventory/cities/:id
 * @access  Private (Admin Only)
 */
const deleteCity = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Check if city has projects (areas)
        const projectCount = await prisma.project.count({
            where: { cityId: id }
        });

        if (projectCount > 0) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Cannot delete city with existing areas. Delete or move areas first.'
            });
        }

        await prisma.city.delete({
            where: { id }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'City deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCities,
    createCity,
    updateCity,
    deleteCity
};
