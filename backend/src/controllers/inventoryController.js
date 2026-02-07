const prisma = require('../config/database');
const { HTTP_STATUS } = require('../config/constants');

/**
 * @desc    Get all projects (Property Areas)
 * @route   GET /api/inventory/projects
 * @access  Private
 */
const getProjects = async (req, res, next) => {
  try {
    const { cityId } = req.query;
    const where = {};
    if (cityId && cityId !== 'ALL') where.cityId = cityId;

    const projects = await prisma.project.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        city: { select: { name: true } },
        _count: {
          select: { inventory: true }
        }
      }
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: projects
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new project
 * @route   POST /api/inventory/projects
 * @access  Private (Admin/Manager)
 */
const createProject = async (req, res, next) => {
  try {
    const { name, location, description, cityId } = req.body;

    if (!name) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Project name is required'
      });
    }

    const project = await prisma.project.create({
      data: {
        name,
        location,
        description,
        cityId: cityId || null
      }
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Project with this name already exists'
      });
    }
    next(error);
  }
};

/**
 * @desc    Update a project
 * @route   PUT /api/inventory/projects/:id
 * @access  Private (Admin/Manager)
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, description, cityId } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: { name, location, description, cityId: cityId || undefined }
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a project
 * @route   DELETE /api/inventory/projects/:id
 * @access  Private (Admin Only)
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if project has inventory items
    const inventoryCount = await prisma.inventoryItem.count({
      where: { projectId: id }
    });

    if (inventoryCount > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Cannot delete project with existing inventory items. Delete or move items first.'
      });
    }

    await prisma.project.delete({
      where: { id }
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get inventory items (filterable by project)
 * @route   GET /api/inventory/items
 * @access  Private
 */
const getInventoryItems = async (req, res, next) => {
  try {
    const {
      projectId,
      cityId,
      status,
      search,
      sortBy = 'plotNumber',
      sortOrder = 'asc',
      page = 1,
      limit = 10
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};

    if (projectId && projectId !== 'ALL') where.projectId = projectId;
    if (cityId && cityId !== 'ALL') {
      where.project = {
        cityId: cityId
      };
    }
    if (status && status !== 'ALL') where.status = status;

    if (search) {
      where.OR = [
        { plotNumber: { contains: search, mode: 'insensitive' } },
        { ownerName: { contains: search, mode: 'insensitive' } },
        { block: { contains: search, mode: 'insensitive' } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
        { project: { city: { name: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    const [total, items] = await prisma.$transaction([
      prisma.inventoryItem.count({ where }),
      prisma.inventoryItem.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take,
        include: {
          project: {
            select: { name: true }
          },
          createdBy: {
            select: { name: true }
          },
          _count: {
            select: { leads: true }
          }
        }
      })
    ]);

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: items,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new inventory item
 * @route   POST /api/inventory/items
 * @access  Private (Admin/Manager)
 */
const createInventoryItem = async (req, res, next) => {
  try {
    const data = req.body;

    // Basic validation
    if (!data.projectId || !data.plotNumber) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Project ID and Plot Number are required'
      });
    }

    const newItem = await prisma.inventoryItem.create({
      data: {
        ...data,
        // Ensure numeric fields are actually floats if passed as strings
        ratePerSqYard: data.ratePerSqYard ? parseFloat(data.ratePerSqYard) : null,
        totalPrice: data.totalPrice ? parseFloat(data.totalPrice) : null,
        circleRate: data.circleRate ? parseFloat(data.circleRate) : null,
        askingPrice: data.askingPrice ? parseFloat(data.askingPrice) : null,
        maintenanceCharges: data.maintenanceCharges ? parseFloat(data.maintenanceCharges) : null,
        clubCharges: data.clubCharges ? parseFloat(data.clubCharges) : null,
        cannesCharges: data.cannesCharges ? parseFloat(data.cannesCharges) : null,

        // Ensure status enum is valid, default handled by schema if missing
        status: data.status || undefined,
        transactionType: data.transactionType || undefined,
        propertyType: data.propertyType || undefined,
        openSides: data.openSides ? parseInt(data.openSides) : undefined,
        construction: data.construction !== undefined ? data.construction : undefined,
        boundaryWalls: data.boundaryWalls !== undefined ? data.boundaryWalls : undefined,
        gatedColony: data.gatedColony !== undefined ? data.gatedColony : undefined,
        corner: data.corner !== undefined ? data.corner : undefined,
        condition: data.condition || undefined,
        images: data.images || [],
        createdById: req.user.id
      }
    });

    res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: newItem,
      message: 'Inventory item added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inventory item
 * @route   PUT /api/inventory/items/:id
 * @access  Private (Admin/Manager)
 */
const updateInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = req.body;

    // Handle sold logic if status changing to SOLD
    if (data.status === 'SOLD' && !data.soldDate) {
      data.soldDate = new Date();
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...data,
        ratePerSqYard: data.ratePerSqYard ? parseFloat(data.ratePerSqYard) : undefined,
        totalPrice: data.totalPrice ? parseFloat(data.totalPrice) : undefined,
        circleRate: data.circleRate ? parseFloat(data.circleRate) : undefined,
        askingPrice: data.askingPrice ? parseFloat(data.askingPrice) : undefined,
        maintenanceCharges: data.maintenanceCharges ? parseFloat(data.maintenanceCharges) : undefined,
        clubCharges: data.clubCharges ? parseFloat(data.clubCharges) : undefined,
        cannesCharges: data.cannesCharges ? parseFloat(data.cannesCharges) : undefined,
        openSides: data.openSides ? parseInt(data.openSides) : undefined,
        construction: data.construction !== undefined ? data.construction : undefined,
        boundaryWalls: data.boundaryWalls !== undefined ? data.boundaryWalls : undefined,
        gatedColony: data.gatedColony !== undefined ? data.gatedColony : undefined,
        corner: data.corner !== undefined ? data.corner : undefined,
        images: data.images !== undefined ? data.images : undefined,
      }
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: updatedItem,
      message: 'Inventory updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete inventory item
 * @route   DELETE /api/inventory/items/:id
 * @access  Private (AdminOnly)
 */
const deleteInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.inventoryItem.delete({
      where: { id }
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: 'Item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single inventory item by ID
 * @route   GET /api/inventory/items/:id
 * @access  Private
 */
const getInventoryItemById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        project: {
          select: { name: true, location: true }
        },
        createdBy: {
          select: { name: true }
        },
        leads: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            budgetFrom: true,
            budgetTo: true,
            status: true,
            assignedTo: { select: { name: true } }
          }
        },
        _count: {
          select: { leads: true }
        }
      }
    });

    if (!item) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message: 'Inventory item not found'
      });
    }

    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: item
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  createProject,
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  updateProject,
  deleteProject,
  getInventoryItemById
};
