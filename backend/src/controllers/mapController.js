const prisma = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Get all map properties
 * @route   GET /api/map/properties
 * @access  Private
 */
const getMapProperties = async (req, res, next) => {
    try {
        const { inventoryItemId } = req.query;

        const where = {};
        if (inventoryItemId) where.inventoryItemId = inventoryItemId;

        const properties = await prisma.mapProperty.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                inventoryItem: {
                    select: {
                        id: true,
                        plotNumber: true,
                        size: true,
                        totalPrice: true,
                        status: true,
                        ownerName: true,
                        propertyType: true,
                        transactionType: true,
                        project: {
                            select: { name: true, location: true }
                        }
                    }
                }
            }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: properties
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single map property by ID
 * @route   GET /api/map/properties/:id
 * @access  Private
 */
const getMapPropertyById = async (req, res, next) => {
    try {
        const { id } = req.params;

        const property = await prisma.mapProperty.findUnique({
            where: { id },
            include: {
                inventoryItem: {
                    select: {
                        id: true,
                        plotNumber: true,
                        size: true,
                        totalPrice: true,
                        status: true,
                        ownerName: true,
                        propertyType: true,
                        transactionType: true,
                        ratePerSqYard: true,
                        facing: true,
                        block: true,
                        project: {
                            select: { name: true, location: true }
                        }
                    }
                }
            }
        });

        if (!property) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'Map property not found'
            });
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: property
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get map property by inventory item ID
 * @route   GET /api/map/properties/by-inventory/:inventoryItemId
 * @access  Private
 */
const getMapPropertyByInventoryId = async (req, res, next) => {
    try {
        const { inventoryItemId } = req.params;

        const property = await prisma.mapProperty.findUnique({
            where: { inventoryItemId },
            include: {
                inventoryItem: {
                    select: {
                        id: true,
                        plotNumber: true,
                        size: true,
                        totalPrice: true,
                        status: true,
                        ownerName: true,
                        propertyType: true,
                        transactionType: true,
                        project: {
                            select: { name: true, location: true }
                        }
                    }
                }
            }
        });

        if (!property) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                success: false,
                message: 'No map property linked to this inventory item'
            });
        }

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: property
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new map property
 * @route   POST /api/map/properties
 * @access  Private (Admin/Manager)
 */
const createMapProperty = async (req, res, next) => {
    try {
        const { name, description, coordinates, center, color, inventoryItemId } = req.body;

        if (!name || !coordinates || !Array.isArray(coordinates) || coordinates.length < 3) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Name and at least 3 coordinate points are required to define a property boundary'
            });
        }

        // If linking to inventory, check it's not already linked
        if (inventoryItemId) {
            const existingLink = await prisma.mapProperty.findUnique({
                where: { inventoryItemId }
            });
            if (existingLink) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'This inventory item is already linked to a map property'
                });
            }
        }

        // Calculate center if not provided
        let computedCenter = center;
        if (!computedCenter && coordinates.length > 0) {
            const lngs = coordinates.map(c => c[0]);
            const lats = coordinates.map(c => c[1]);
            computedCenter = [
                lngs.reduce((a, b) => a + b, 0) / lngs.length,
                lats.reduce((a, b) => a + b, 0) / lats.length
            ];
        }

        const property = await prisma.mapProperty.create({
            data: {
                name,
                description: description || null,
                coordinates,
                center: computedCenter,
                color: color || '#009688',
                inventoryItemId: inventoryItemId || null,
                createdById: req.user.id
            },
            include: {
                inventoryItem: {
                    select: {
                        id: true,
                        plotNumber: true,
                        size: true,
                        totalPrice: true,
                        status: true,
                        project: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        res.status(HTTP_STATUS.CREATED).json({
            success: true,
            data: property,
            message: 'Map property created successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a map property
 * @route   PUT /api/map/properties/:id
 * @access  Private (Admin/Manager)
 */
const updateMapProperty = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, coordinates, center, color, inventoryItemId } = req.body;

        // If changing inventory link, check the new one isn't already linked
        if (inventoryItemId) {
            const existingLink = await prisma.mapProperty.findFirst({
                where: {
                    inventoryItemId,
                    NOT: { id }
                }
            });
            if (existingLink) {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    message: 'This inventory item is already linked to another map property'
                });
            }
        }

        // Calculate center if coordinates changed but center not provided
        let computedCenter = center;
        if (!computedCenter && coordinates && coordinates.length > 0) {
            const lngs = coordinates.map(c => c[0]);
            const lats = coordinates.map(c => c[1]);
            computedCenter = [
                lngs.reduce((a, b) => a + b, 0) / lngs.length,
                lats.reduce((a, b) => a + b, 0) / lats.length
            ];
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (coordinates !== undefined) updateData.coordinates = coordinates;
        if (computedCenter !== undefined) updateData.center = computedCenter;
        if (color !== undefined) updateData.color = color;
        if (inventoryItemId !== undefined) updateData.inventoryItemId = inventoryItemId || null;

        const property = await prisma.mapProperty.update({
            where: { id },
            data: updateData,
            include: {
                inventoryItem: {
                    select: {
                        id: true,
                        plotNumber: true,
                        size: true,
                        totalPrice: true,
                        status: true,
                        project: {
                            select: { name: true }
                        }
                    }
                }
            }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            data: property,
            message: 'Map property updated successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a map property
 * @route   DELETE /api/map/properties/:id
 * @access  Private (Admin Only)
 */
const deleteMapProperty = async (req, res, next) => {
    try {
        const { id } = req.params;

        await prisma.mapProperty.delete({
            where: { id }
        });

        res.status(HTTP_STATUS.OK).json({
            success: true,
            message: 'Map property deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getMapProperties,
    getMapPropertyById,
    getMapPropertyByInventoryId,
    createMapProperty,
    updateMapProperty,
    deleteMapProperty
};
